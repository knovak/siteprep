import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {
  ASSESSMENT_DIMENSIONS,
  commitProposalState,
  dependenceAdjustedCounts,
  makeWorkPacket,
  newReviewState,
  orderedAssessmentView,
  previewProposal,
  vocabularyImpact,
} from '../lib/review.mjs';

const createdAt = '2026-09-02T18:00:00.000Z';
const collection = {id: 'collection:heat', name: 'Community heat resilience', revision: 7, selectionRevision: 3};
const sources = [
  {id: 'source:one', currentVersionId: 'version:one', contentHash: 'sha256:one', title: 'Cooling access', body: 'Fixture text', rightsState: 'cleared'},
  {id: 'source:two', currentVersionId: 'version:two', contentHash: 'sha256:two', title: 'Heat plans', body: 'Second fixture', rightsState: 'cleared'},
];
const dimension = (value, evidence = ['source:one']) => ({value, unknown: false, confidence: 0.8, rationale: 'Recorded fixture rationale', evidence});
const assessment = Object.fromEntries(ASSESSMENT_DIMENSIONS.map((key, index) => [key, dimension(index % 5)]));

async function packet() {
  return makeWorkPacket({collection, actorId: 'actor:curator', sources, selectedSourceIds: ['source:one'], omittedDependencies: [{id: 'source:two', reason: 'not selected'}], createdAt});
}

async function proposal(operations) {
  const workPacket = await packet();
  return {workPacket, proposal: {
    format: 'knowledge-pipeline/v1', use: 'llm-proposal', proposalId: 'proposal:fixture',
    base: {packageId: workPacket.packageId, packageHash: workPacket.packageHash},
    proposer: {kind: 'llm', model: 'recorded-fixture', processVersion: 'phase-3-fixture-v1'},
    authority: {mayCommit: false, credentials: []}, operations,
  }};
}

test('bounded packets name destination, hashes, accepted input, omissions, target ids, and zero credentials', async () => {
  const workPacket = await packet();
  assert.equal(workPacket.acceptedInputs.length, 1);
  assert.equal(workPacket.acceptedInputs[0].id, 'source:one');
  assert.equal(workPacket.omittedDependencies[0].id, 'source:two');
  assert.match(workPacket.packageHash, /^sha256:/u);
  assert.deepEqual(workPacket.authority, {mayPropose: true, mayCommit: false, credentials: []});
  await assert.rejects(() => makeWorkPacket({collection, actorId: 'actor:curator', sources, maxSources: 1}), /exceeds/u);
});

test('recorded LLM proposals preview without credential or commit authority', async () => {
  const {workPacket, proposal: fixture} = await proposal([{id: 'op:tag', type: 'tag', sourceId: 'source:one', baseVersionHash: 'sha256:one', payload: {tag: 'cooling', rationale: 'Topical'}}]);
  const preview = previewProposal(workPacket, fixture);
  assert.equal(preview.canCommit, true);
  assert.equal(preview.operations[0].status, 'ready');
  const credentialled = previewProposal(workPacket, {...fixture, authority: {mayCommit: true, credentials: ['secret']}});
  assert.equal(credentialled.canCommit, false);
  assert.ok(credentialled.findings.some(({code}) => code === 'proposal.authority.invalid'));
});

test('the checked-in recorded proposal file stays valid while live review evidence remains honestly pending', async () => {
  const workPacket = await packet();
  const fixture = JSON.parse(await readFile(new URL('./fixtures/phase-3-recorded-proposal.json', import.meta.url), 'utf8'));
  const preview = previewProposal(workPacket, fixture);
  assert.equal(preview.canCommit, true);
  assert.equal(preview.operations.every(({status}) => status === 'ready'), true);
  assert.equal(fixture.reviewEvidence.status, 'awaiting-human-live-evaluation');
  assert.equal(fixture.reviewEvidence.acceptedPercentage, null);
});

test('selective human acceptance keeps rejected operations and rationale edits in the receipt', async () => {
  const {workPacket, proposal: fixture} = await proposal([
    {id: 'op:tag', type: 'tag', sourceId: 'source:one', baseVersionHash: 'sha256:one', payload: {tag: 'cooling', rationale: 'Model rationale'}},
    {id: 'op:assessment', type: 'assessment', sourceId: 'source:one', baseVersionHash: 'sha256:one', payload: {dimensions: assessment, rationale: 'Assessment rationale'}},
  ]);
  const preview = previewProposal(workPacket, fixture);
  await assert.rejects(() => commitProposalState(newReviewState(), preview, {actor: {id: 'model:one', kind: 'llm'}, acceptedOperationIds: ['op:tag']}), /human actor/u);
  const committed = await commitProposalState(newReviewState(), preview, {actor: {id: 'actor:curator', kind: 'human'}, acceptedOperationIds: ['op:tag'], rationaleEdits: {'op:tag': 'Human corrected rationale'}, createdAt});
  assert.equal(committed.state.tags.length, 1);
  assert.equal(committed.state.assessments.length, 0);
  assert.deepEqual(committed.receipt.decisions.map(({outcome}) => outcome), ['accepted', 'rejected']);
  assert.equal(committed.receipt.decisions[0].rationale, 'Human corrected rationale');
});

test('destination switches and stale source hashes invalidate the review', async () => {
  const {workPacket, proposal: fixture} = await proposal([{id: 'op:tag', type: 'tag', sourceId: 'source:one', baseVersionHash: 'sha256:one', payload: {tag: 'heat', rationale: 'Relevant'}}]);
  const changedDestination = previewProposal(workPacket, fixture, {...collection, id: 'collection:other', sources});
  assert.equal(changedDestination.canCommit, false);
  assert.match(changedDestination.findings.find(({code}) => code === 'proposal.destination.changed').message, /collection:heat.*collection:other/u);
  const stale = previewProposal(workPacket, fixture, {...collection, sources: [{...sources[0], contentHash: 'sha256:changed'}]});
  assert.equal(stale.operations[0].status, 'refused');
  assert.ok(stale.findings.some(({code}) => code === 'proposal.operation.stale_base'));
});

test('assessment dimensions preserve separate values and refuse a canonical sum', async () => {
  const {workPacket, proposal: fixture} = await proposal([{id: 'op:assessment', type: 'assessment', sourceId: 'source:one', baseVersionHash: 'sha256:one', payload: {dimensions: assessment, rationale: 'Separate dimensions'}}]);
  const preview = previewProposal(workPacket, fixture);
  const committed = await commitProposalState(newReviewState(), preview, {actor: {id: 'actor:curator', kind: 'human'}, acceptedOperationIds: ['op:assessment'], createdAt});
  const record = committed.state.assessments[0];
  assert.deepEqual(Object.keys(record.dimensions), ASSESSMENT_DIMENSIONS);
  assert.equal('total' in record, false);
  assert.equal(orderedAssessmentView([record]).rule, 'importance-desc-then-relevance-desc');
  const withTotal = structuredClone(fixture);
  withTotal.operations[0].payload.total = 12;
  assert.equal(previewProposal(workPacket, withTotal).operations[0].status, 'refused');
});

test('vocabulary impact preserves unknown, rename, alias, deprecation, split, and replacement history', () => {
  const state = {tags: [{tag: 'old-term'}, {tag: 'old-term'}]};
  for (const change of ['unknown', 'rename', 'alias', 'deprecate', 'split', 'replace']) {
    const impact = vocabularyImpact(state, {key: 'old-term', change, aliases: ['earlier'], replacements: ['new-term']});
    assert.equal(impact.affectedAcceptedAssignments, 2);
    assert.equal(impact.historicalAssignmentsPreserved, true);
  }
});

test('dependence-adjusted review displays raw sources and independent duplicate/syndication clusters', () => {
  const counts = dependenceAdjustedCounts(
    [{id: 'a'}, {id: 'b'}, {id: 'c'}, {id: 'd'}],
    [{type: 'duplicate-of', from: 'a', to: 'b', state: 'accepted'}, {type: 'syndicated-from', from: 'c', to: 'b', state: 'accepted'}],
  );
  assert.equal(counts.rawSourceCount, 4);
  assert.equal(counts.independentClusterCount, 2);
});

test('2,000 operations validate and preview within five seconds and only selected operations commit', async () => {
  const workPacket = await makeWorkPacket({collection, actorId: 'actor:curator', sources, createdAt});
  const operations = Array.from({length: 2000}, (_, index) => ({id: `op:${index}`, type: 'tag', sourceId: index % 2 ? 'source:one' : 'source:two', baseVersionHash: index % 2 ? 'sha256:one' : 'sha256:two', payload: {tag: `tag-${index}`, rationale: 'Scale fixture'}}));
  const fixture = {format: 'knowledge-pipeline/v1', use: 'llm-proposal', proposalId: 'proposal:scale', base: {packageId: workPacket.packageId, packageHash: workPacket.packageHash}, proposer: {kind: 'llm', model: 'recorded-scale', processVersion: 'scale-v1'}, authority: {mayCommit: false, credentials: []}, operations};
  const started = performance.now();
  const preview = previewProposal(workPacket, fixture);
  const elapsed = performance.now() - started;
  assert.equal(preview.operations.length, 2000);
  assert.ok(elapsed < 5000, `preview took ${elapsed}ms`);
  const acceptedOperationIds = operations.filter((_, index) => index % 20 === 0).map(({id}) => id);
  const committed = await commitProposalState(newReviewState(), preview, {actor: {id: 'actor:curator', kind: 'human'}, acceptedOperationIds, createdAt});
  assert.equal(committed.state.tags.length, 100);
  assert.equal(committed.receipt.decisions.filter(({outcome}) => outcome === 'rejected').length, 1900);
});
