import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  approveDocumentPatch,
  archiveNarrative,
  backwardAudit,
  createComparison,
  newIntegrationState,
  proposeDocumentPatch,
  reopenNarrative,
  searchArchive,
  validateUrgencyVector,
} from '../lib/documents.mjs';

const fixture = JSON.parse(await readFile(fileURLToPath(new URL('../fixtures/phase-5-loop.json', import.meta.url)), 'utf8'));
const actor = {kind: 'human', id: 'actor:curator'};
const createdAt = '2026-09-02T20:00:00.000Z';
const classifications = {
  'version:narrative:new': 'new',
  'version:narrative:support': 'supporting',
  'version:narrative:contradict': 'contradictory',
  'version:narrative:redundant': 'redundant',
  'version:narrative:update': 'updating',
};

function urgency(overrides = {}) {
  return {
    processVersion: 'process:document-urgency-v1',
    rationale: 'Keep the five dimensions visible; the fixture does not collapse them into one score.',
    evidenceIds: ['version:narrative:new', 'version:narrative:contradict'],
    dimensions: {
      timeSensitivity: {value: 2, rationale: 'Fixture time window is bounded.', evidenceIds: ['version:narrative:update']},
      delayConsequence: {value: 'unknown', rationale: 'The fixture does not establish a consequence.', evidenceIds: []},
      evidenceStrengthIndependence: {value: 3, rationale: 'Four independent fixture clusters contribute.', evidenceIds: ['cluster:one', 'cluster:two', 'cluster:three', 'cluster:four']},
      documentContradiction: {value: 2, rationale: 'One narrative contradicts the baseline.', evidenceIds: ['version:narrative:contradict']},
      documentAge: {value: 1, rationale: 'The fixture baseline is one month old.', evidenceIds: ['version:document:heat:v1']},
      ...overrides,
    },
  };
}

async function existingDocumentComparison(state = newIntegrationState(fixture)) {
  return createComparison(state, {
    topicId: 'topic:community-heat-resilience',
    documentVersionId: 'version:document:heat:v1',
    narrativeVersionIds: Object.keys(classifications),
    classifications,
    urgency: urgency(),
    affectedSections: ['Preparedness', 'Implementation dates'],
    unresolvedDisputes: ['Fixture disagreement about one implementation assumption'],
    missingEvidence: ['No measured outcome fixture'],
    processVersions: ['process:comparison-v1', 'process:document-urgency-v1'],
    candidatePatch: {summary: 'Add the new cooling-centre consideration and retain the dispute.'},
    actor: {kind: 'ai', id: 'model:recorded-fixture'},
    createdAt,
  });
}

test('a topic with no standing document reports the absence and never invents a baseline or patch', async () => {
  const result = await createComparison(newIntegrationState(fixture), {
    topicId: 'topic:cooling-access',
    narrativeVersionIds: ['version:narrative:cooling'],
    classifications: {'version:narrative:cooling': 'new'},
    urgency: urgency({documentContradiction: {value: 'unknown', rationale: 'There is no standing document to contradict.', evidenceIds: []}, documentAge: {value: 'unknown', rationale: 'There is no standing document age.', evidenceIds: []}}),
    processVersions: ['process:comparison-v1'],
    createdAt,
  });
  assert.deepEqual(result.comparison.baseline, {status: 'absent'});
  assert.equal(result.comparison.candidatePatch, null);
  assert.deepEqual(result.comparison.buckets.new, ['version:narrative:cooling']);
});

test('an existing-document comparison keeps all five classes plus raw and independent counts', async () => {
  const {comparison} = await existingDocumentComparison();
  assert.equal(comparison.baseline.versionId, 'version:document:heat:v1');
  assert.deepEqual(Object.fromEntries(Object.entries(comparison.buckets).map(([kind, ids]) => [kind, ids.length])), {new: 1, supporting: 1, contradictory: 1, redundant: 1, updating: 1});
  assert.equal(comparison.rawSourceCount, 5);
  assert.equal(comparison.independentSourceCount, 4);
  assert.deepEqual(comparison.processVersions, ['process:comparison-v1', 'process:document-urgency-v1']);
});

test('urgency exposes every dimension, unknowns, rationale, evidence, and process identity without a canonical total', () => {
  const vector = urgency();
  assert.deepEqual(validateUrgencyVector(vector), []);
  assert.equal('score' in vector, false);
  assert.equal(vector.dimensions.delayConsequence.value, 'unknown');
  const incomplete = urgency();
  delete incomplete.dimensions.documentAge;
  assert.ok(validateUrgencyVector(incomplete).includes('urgency.documentAge.required'));
});

test('an AI patch remains proposed and only explicit human approval creates the current immutable revision', async () => {
  const compared = await existingDocumentComparison();
  const proposed = await proposeDocumentPatch(compared.state, {
    comparisonId: compared.comparison.id,
    proposedText: 'Model-proposed fixture wording.',
    proposedParts: [{id: 'part:new', text: 'Add a cooling-centre consideration.'}],
    actor: {kind: 'ai', id: 'model:recorded-fixture'},
    processVersion: 'process:document-patch-v1',
    createdAt,
  });
  assert.equal(proposed.proposal.state, 'proposed');
  assert.equal(proposed.state.documents[0].currentVersionId, 'version:document:heat:v1');
  await assert.rejects(() => approveDocumentPatch(proposed.state, proposed.proposal.id, {actor: {kind: 'ai', id: 'model:recorded-fixture'}}), /human_required/u);
  const approved = await approveDocumentPatch(proposed.state, proposed.proposal.id, {actor, acceptedText: 'Human-authored accepted fixture wording.', createdAt});
  assert.equal(approved.document.currentVersionId, approved.version.versionId);
  assert.notEqual(approved.version.versionId, 'version:document:heat:v1');
  assert.equal(approved.version.author.kind, 'human');
  assert.equal(approved.state.documents[0].versions[0].text, 'Project-authored fixture standing document.');
});

test('partial rejection preserves edits, rejected parts, evidence, disputes, actor, time, and accepted text hash', async () => {
  const compared = await existingDocumentComparison();
  const proposed = await proposeDocumentPatch(compared.state, {comparisonId: compared.comparison.id, proposedText: 'Model wording.', proposedParts: [{id: 'keep'}, {id: 'reject'}], actor: {kind: 'ai', id: 'model:fixture'}, processVersion: 'process:document-patch-v1', createdAt});
  const approved = await approveDocumentPatch(proposed.state, proposed.proposal.id, {
    actor,
    acceptedText: 'Human rewrite.',
    citedNarrativeVersionIds: ['version:narrative:new'],
    citedSourceVersionIds: ['version:source:one'],
    rejectedProposalParts: [{id: 'reject', reason: 'Unsupported by the fixture'}],
    unresolvedDisputes: ['Retain the contradiction for later review'],
    claims: [{id: 'claim:cooling', text: 'Fixture claim', narrativeVersionIds: ['version:narrative:new']}],
    createdAt,
  });
  assert.equal(approved.receipt.actor.id, actor.id);
  assert.equal(approved.receipt.createdAt, createdAt);
  assert.match(approved.receipt.acceptedTextHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(approved.receipt.rejectedProposalParts[0].id, 'reject');
  assert.deepEqual(approved.receipt.unresolvedDisputes, ['Retain the contradiction for later review']);
  assert.deepEqual(approved.receipt.citedNarrativeVersionIds, ['version:narrative:new']);
});

test('archive gates require the right reason or exact replacement and incorporation links', async () => {
  const state = newIntegrationState(fixture);
  await assert.rejects(() => archiveNarrative(state, {narrativeId: 'narrative:new', kind: 'rejected', actor}), /archive.rejected.reason/u);
  await assert.rejects(() => archiveNarrative(state, {narrativeId: 'narrative:new', kind: 'deferred', actor}), /archive.deferred.revisit/u);
  await assert.rejects(() => archiveNarrative(state, {narrativeId: 'narrative:new', kind: 'superseded', replacingNarrativeVersionId: 'version:missing', actor}), /archive.superseded.replacement_version/u);
  await assert.rejects(() => archiveNarrative(state, {narrativeId: 'narrative:new', kind: 'incorporated', standingDocumentVersionId: 'version:missing', actor}), /archive.incorporated.document_version/u);
  const archived = await archiveNarrative(state, {narrativeId: 'narrative:new', kind: 'incorporated', standingDocumentVersionId: 'version:document:heat:v1', actor, createdAt});
  const link = archived.state.relationships.find(({type}) => type === 'incorporated-into');
  assert.equal(link.toVersionId, 'version:document:heat:v1');
  assert.equal(archived.state.narratives.find(({id}) => id === 'narrative:new').stage, 'archived');
});

test('archived narratives stay searchable and reopening preserves the disposition and creates a stage event', async () => {
  const archived = await archiveNarrative(newIntegrationState(fixture), {narrativeId: 'narrative:contradict', kind: 'deferred', revisitCondition: 'Revisit when a measured outcome fixture exists', actor, createdAt});
  assert.equal(searchArchive(archived.state, 'measured outcome').length, 1);
  const reopened = reopenNarrative(archived.state, {narrativeId: 'narrative:contradict', actor, reason: 'New fixture is available', createdAt: '2026-09-03T00:00:00.000Z'});
  assert.equal(reopened.narrative.stage, 'integration');
  assert.deepEqual(reopened.activity.preservedDispositionIds, [archived.disposition.id]);
  assert.equal(reopened.activity.type, 'narrative-reopened');
  assert.equal(reopened.state.archiveDispositions.length, 1);
});

test('a document claim audits backward through exact narrative, assignment, assessment, tag, source, actor, and activity evidence', async () => {
  const compared = await existingDocumentComparison();
  const proposed = await proposeDocumentPatch(compared.state, {comparisonId: compared.comparison.id, proposedText: 'Fixture document update.', actor: {kind: 'ai', id: 'model:fixture'}, processVersion: 'process:document-patch-v1', createdAt});
  const approved = await approveDocumentPatch(proposed.state, proposed.proposal.id, {actor, acceptedText: 'Curated fixture update.', citedNarrativeVersionIds: ['version:narrative:new'], citedSourceVersionIds: ['version:source:one'], claims: [{id: 'claim:one', text: 'A bounded fixture claim.', narrativeVersionIds: ['version:narrative:new']}], createdAt});
  const audit = backwardAudit(approved.state, {documentVersionId: approved.version.versionId, claimId: 'claim:one'});
  assert.deepEqual(audit.sourceVersionIds.sort((left, right) => left.localeCompare(right)), ['version:source:one', 'version:source:two']);
  assert.ok(audit.relationships.some(({type}) => type === 'assigned-to-topic'));
  assert.ok(audit.relationships.some(({type}) => type === 'evidence-for'));
  assert.equal(audit.assessments[0].id, 'assessment:source:one');
  assert.equal(audit.tags[0].tag, 'topic:heat');
  assert.ok(audit.activities.every(({actor: activityActor}) => activityActor?.id));
});

test('the two-topic fixture completes both integration loops without copying or deleting accepted evidence', async () => {
  const original = newIntegrationState(fixture);
  const heat = await existingDocumentComparison(original);
  const cooling = await createComparison(heat.state, {topicId: 'topic:cooling-access', narrativeVersionIds: ['version:narrative:cooling'], classifications: {'version:narrative:cooling': 'new'}, urgency: urgency({documentContradiction: {value: 'unknown', rationale: 'No baseline.', evidenceIds: []}, documentAge: {value: 'unknown', rationale: 'No baseline.', evidenceIds: []}}), processVersions: ['process:comparison-v1'], createdAt});
  assert.equal(cooling.state.comparisons.length, 2);
  assert.equal(cooling.state.narratives.length, original.narratives.length);
  assert.equal(cooling.state.sources.length, original.sources.length);
  assert.deepEqual(cooling.state.comparisons.map(({baseline}) => baseline.status), ['present', 'absent']);
});
