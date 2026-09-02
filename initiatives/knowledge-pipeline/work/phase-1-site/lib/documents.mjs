import {canonicalJson, sha256} from './domain.mjs';

const clone = (value) => structuredClone(value);
const text = (value) => String(value ?? '').trim().normalize('NFC');
const URGENCY_DIMENSIONS = Object.freeze([
  'timeSensitivity',
  'delayConsequence',
  'evidenceStrengthIndependence',
  'documentContradiction',
  'documentAge',
]);
const COMPARISON_KINDS = new Set(['new', 'supporting', 'contradictory', 'redundant', 'updating']);
const ARCHIVE_KINDS = new Set(['incorporated', 'rejected', 'deferred', 'superseded']);

export function newIntegrationState(input) {
  return {
    collectionId: text(input.collectionId),
    topics: clone(input.topics ?? []),
    sources: clone(input.sources ?? []),
    narratives: clone(input.narratives ?? []),
    documents: clone(input.documents ?? []),
    comparisons: clone(input.comparisons ?? []),
    proposals: clone(input.proposals ?? []),
    archiveDispositions: clone(input.archiveDispositions ?? []),
    relationships: clone(input.relationships ?? []),
    assessments: clone(input.assessments ?? []),
    tagAssignments: clone(input.tagAssignments ?? []),
    activities: clone(input.activities ?? []),
    receipts: clone(input.receipts ?? []),
  };
}

function findNarrativeVersion(state, versionId) {
  for (const narrative of state.narratives) {
    const version = (narrative.versions ?? []).find((candidate) => candidate.versionId === versionId);
    if (version) return {narrative, version};
  }
  return null;
}

function findDocumentVersion(state, versionId) {
  for (const document of state.documents) {
    const version = (document.versions ?? []).find((candidate) => candidate.versionId === versionId);
    if (version) return {document, version};
  }
  return null;
}

export function validateUrgencyVector(urgency) {
  const findings = [];
  if (!urgency || typeof urgency !== 'object') return ['urgency.vector.required'];
  if (!text(urgency.processVersion)) findings.push('urgency.process.required');
  if (!text(urgency.rationale)) findings.push('urgency.rationale.required');
  if (!Array.isArray(urgency.evidenceIds)) findings.push('urgency.evidence.required');
  for (const dimension of URGENCY_DIMENSIONS) {
    const item = urgency.dimensions?.[dimension];
    if (!item) { findings.push(`urgency.${dimension}.required`); continue; }
    if (!(item.value === 'unknown' || (Number.isInteger(item.value) && item.value >= 0 && item.value <= 4))) findings.push(`urgency.${dimension}.value`);
    if (!text(item.rationale)) findings.push(`urgency.${dimension}.rationale`);
    if (!Array.isArray(item.evidenceIds)) findings.push(`urgency.${dimension}.evidence`);
  }
  return findings;
}

export async function createComparison(state, input) {
  const next = clone(state);
  const topic = next.topics.find(({id}) => id === input.topicId);
  if (!topic) throw new TypeError('comparison.topic.missing');
  const narrativeVersions = (input.narrativeVersionIds ?? []).map((versionId) => {
    const found = findNarrativeVersion(next, versionId);
    if (!found || found.narrative.topicId !== topic.id || found.version.state !== 'accepted') throw new TypeError('comparison.narrative.version');
    return found;
  });
  if (!narrativeVersions.length) throw new TypeError('comparison.narratives.required');
  const documentVersion = input.documentVersionId ? findDocumentVersion(next, input.documentVersionId) : null;
  if (input.documentVersionId && (!documentVersion || documentVersion.document.topicId !== topic.id)) throw new TypeError('comparison.document.version');
  const urgencyFindings = validateUrgencyVector(input.urgency);
  if (urgencyFindings.length) throw new TypeError(urgencyFindings.join(','));

  const classifications = {};
  const buckets = Object.fromEntries([...COMPARISON_KINDS].map((kind) => [kind, []]));
  for (const {version} of narrativeVersions) {
    const kind = input.classifications?.[version.versionId] ?? 'new';
    if (!COMPARISON_KINDS.has(kind)) throw new TypeError('comparison.classification.invalid');
    classifications[version.versionId] = kind;
    buckets[kind].push(version.versionId);
  }
  const sourceVersionIds = [...new Set(narrativeVersions.flatMap(({version}) => version.sourceVersionIds ?? []))];
  const sourceClusterIds = [...new Set(narrativeVersions.flatMap(({version}) => version.sourceClusterIds ?? version.sourceVersionIds ?? []))];
  const body = {
    topicId: topic.id,
    baseline: documentVersion ? {status: 'present', documentId: documentVersion.document.id, versionId: documentVersion.version.versionId} : {status: 'absent'},
    narrativeVersionIds: narrativeVersions.map(({version}) => version.versionId),
    classifications,
    buckets,
    rawSourceCount: sourceVersionIds.length,
    independentSourceCount: sourceClusterIds.length,
    affectedSections: clone(input.affectedSections ?? []),
    volumeSinceLastComparison: narrativeVersions.length,
    urgency: clone(input.urgency),
    unresolvedDisputes: clone(input.unresolvedDisputes ?? []),
    missingEvidence: clone(input.missingEvidence ?? []),
    processVersions: clone(input.processVersions ?? [input.urgency.processVersion]),
    candidatePatch: documentVersion ? clone(input.candidatePatch ?? null) : null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const contentHash = await sha256(canonicalJson(body));
  const comparison = {id: `comparison:${contentHash.slice(7, 39)}`, type: 'comparison', collectionId: next.collectionId, contentHash, ...body};
  next.comparisons.push(comparison);
  next.activities.push({id: `activity:${comparison.id.slice(11)}`, type: 'comparison-created', comparisonId: comparison.id, topicId: topic.id, actor: clone(input.actor ?? {kind: 'system', id: 'process:comparison-v1'}), createdAt: body.createdAt});
  return {state: next, comparison};
}

export async function proposeDocumentPatch(state, input) {
  const next = clone(state);
  const comparison = next.comparisons.find(({id}) => id === input.comparisonId);
  if (!comparison) throw new TypeError('document.proposal.comparison');
  const actor = clone(input.actor ?? {kind: 'ai', id: 'model:unspecified'});
  const body = {
    comparisonId: comparison.id,
    topicId: comparison.topicId,
    documentId: input.documentId ?? comparison.baseline.documentId ?? `document:${comparison.topicId.slice(6)}`,
    baseDocumentVersionId: comparison.baseline.versionId ?? null,
    proposedText: text(input.proposedText),
    citedNarrativeVersionIds: clone(input.citedNarrativeVersionIds ?? comparison.narrativeVersionIds),
    citedSourceVersionIds: clone(input.citedSourceVersionIds ?? []),
    proposedParts: clone(input.proposedParts ?? []),
    unresolvedDisputes: clone(input.unresolvedDisputes ?? comparison.unresolvedDisputes),
    proposedBy: actor,
    processVersion: text(input.processVersion),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  if (!body.proposedText || !body.processVersion) throw new TypeError('document.proposal.incomplete');
  const proposalHash = await sha256(canonicalJson(body));
  const proposal = {id: `proposal:${proposalHash.slice(7, 39)}`, state: 'proposed', ...body};
  next.proposals.push(proposal);
  return {state: next, proposal};
}

export async function approveDocumentPatch(state, proposalId, input) {
  if (input.actor?.kind !== 'human' || !text(input.actor?.id)) throw new TypeError('document.approval.human_required');
  const next = clone(state);
  const proposal = next.proposals.find(({id, state: status}) => id === proposalId && status === 'proposed');
  if (!proposal) throw new TypeError('document.proposal.missing');
  const comparison = next.comparisons.find(({id}) => id === proposal.comparisonId);
  const acceptedText = text(input.acceptedText ?? proposal.proposedText);
  if (!acceptedText) throw new TypeError('document.text.required');
  const citedNarrativeVersionIds = clone(input.citedNarrativeVersionIds ?? proposal.citedNarrativeVersionIds);
  for (const versionId of citedNarrativeVersionIds) if (!findNarrativeVersion(next, versionId)) throw new TypeError('document.citation.narrative_version');
  const content = {
    text: acceptedText,
    claims: clone(input.claims ?? []),
    citedNarrativeVersionIds,
    citedSourceVersionIds: clone(input.citedSourceVersionIds ?? proposal.citedSourceVersionIds),
    predecessorVersionId: proposal.baseDocumentVersionId,
    comparisonId: proposal.comparisonId,
    status: 'accepted',
    author: {kind: 'human', id: input.actor.id},
    approval: {
      actor: {kind: 'human', id: input.actor.id},
      approvedAt: input.createdAt ?? new Date().toISOString(),
      acceptedTextHash: await sha256(acceptedText),
      rejectedProposalParts: clone(input.rejectedProposalParts ?? []),
      unresolvedDisputes: clone(input.unresolvedDisputes ?? proposal.unresolvedDisputes),
    },
  };
  const contentHash = await sha256(canonicalJson(content));
  const documentActivityId = `activity:document:${contentHash.slice(7, 39)}`;
  const version = {versionId: `version:${contentHash.slice(7, 39)}`, contentHash, activityId: documentActivityId, ...content};
  let document = next.documents.find(({id}) => id === proposal.documentId);
  if (!document) {
    document = {id: proposal.documentId, type: 'standing-document', collectionId: next.collectionId, topicId: proposal.topicId, currentVersionId: null, versions: []};
    next.documents.push(document);
  }
  if (document.topicId !== proposal.topicId || (proposal.baseDocumentVersionId && document.currentVersionId !== proposal.baseDocumentVersionId)) throw new TypeError('document.approval.stale');
  document.versions.push(version);
  document.currentVersionId = version.versionId;
  proposal.state = 'reviewed';
  proposal.review = {outcome: 'accepted', documentVersionId: version.versionId, acceptedTextEdited: acceptedText !== proposal.proposedText};
  const createdAt = content.approval.approvedAt;
  const receiptBody = {use: 'standing-document-approval', proposalId, comparisonId: comparison.id, documentId: document.id, documentVersionId: version.versionId, actor: content.approval.actor, acceptedTextHash: content.approval.acceptedTextHash, citedNarrativeVersionIds, citedSourceVersionIds: content.citedSourceVersionIds, rejectedProposalParts: content.approval.rejectedProposalParts, unresolvedDisputes: content.approval.unresolvedDisputes, createdAt};
  const receiptHash = await sha256(canonicalJson(receiptBody));
  const receipt = {id: `receipt:${receiptHash.slice(7, 39)}`, receiptHash, ...receiptBody};
  next.receipts.push(receipt);
  next.activities.push({id: documentActivityId, type: 'standing-document-approved', actor: content.approval.actor, documentId: document.id, documentVersionId: version.versionId, comparisonId: comparison.id, createdAt});
  return {state: next, document, version, receipt};
}

export async function archiveNarrative(state, input) {
  if (input.actor?.kind !== 'human' || !text(input.actor?.id)) throw new TypeError('archive.human_required');
  if (!ARCHIVE_KINDS.has(input.kind)) throw new TypeError('archive.kind.invalid');
  const next = clone(state);
  const narrative = next.narratives.find(({id}) => id === input.narrativeId);
  if (!narrative || narrative.stage === 'archived') throw new TypeError('archive.narrative.unavailable');
  const narrativeVersionId = input.narrativeVersionId ?? narrative.currentVersionId;
  if (!findNarrativeVersion(next, narrativeVersionId)) throw new TypeError('archive.narrative.version');
  if (input.kind === 'incorporated' && !findDocumentVersion(next, input.standingDocumentVersionId)) throw new TypeError('archive.incorporated.document_version');
  if (input.kind === 'rejected' && !text(input.reason)) throw new TypeError('archive.rejected.reason');
  if (input.kind === 'deferred' && !text(input.revisitCondition)) throw new TypeError('archive.deferred.revisit');
  if (input.kind === 'superseded' && !findNarrativeVersion(next, input.replacingNarrativeVersionId)) throw new TypeError('archive.superseded.replacement_version');
  const body = {
    narrativeId: narrative.id,
    narrativeVersionId,
    kind: input.kind,
    reason: text(input.reason) || null,
    revisitCondition: text(input.revisitCondition) || null,
    standingDocumentVersionId: input.standingDocumentVersionId ?? null,
    replacingNarrativeVersionId: input.replacingNarrativeVersionId ?? null,
    actor: {kind: 'human', id: input.actor.id},
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const hash = await sha256(canonicalJson(body));
  const disposition = {id: `archive:${hash.slice(7, 39)}`, type: 'archive-disposition', collectionId: next.collectionId, contentHash: hash, ...body};
  next.archiveDispositions.push(disposition);
  narrative.stage = 'archived';
  narrative.archiveDispositionIds = [...(narrative.archiveDispositionIds ?? []), disposition.id];
  next.relationships.push({id: `relationship:${disposition.id.slice(8)}:archive`, type: 'archived-as', fromEntityId: narrative.id, fromVersionId: narrativeVersionId, toEntityId: disposition.id, state: 'accepted', activityId: `activity:${disposition.id.slice(8)}`});
  if (input.kind === 'incorporated') {
    const target = findDocumentVersion(next, input.standingDocumentVersionId);
    next.relationships.push({id: `relationship:${disposition.id.slice(8)}:incorporated`, type: 'incorporated-into', fromEntityId: narrative.id, fromVersionId: narrativeVersionId, toEntityId: target.document.id, toVersionId: target.version.versionId, state: 'accepted', activityId: `activity:${disposition.id.slice(8)}`});
  }
  next.activities.push({id: `activity:${disposition.id.slice(8)}`, type: 'narrative-archived', actor: body.actor, narrativeId: narrative.id, narrativeVersionId, dispositionId: disposition.id, createdAt: body.createdAt});
  return {state: next, disposition};
}

export function searchArchive(state, query = '') {
  const needle = text(query).toLocaleLowerCase('en-US');
  return state.narratives.filter(({stage}) => stage === 'archived').flatMap((narrative) => {
    const dispositions = state.archiveDispositions.filter(({narrativeId}) => narrativeId === narrative.id);
    const haystack = [narrative.title, ...(narrative.versions ?? []).map(({text: body}) => body), ...dispositions.flatMap(({kind, reason, revisitCondition}) => [kind, reason, revisitCondition])].join(' ').toLocaleLowerCase('en-US');
    return !needle || haystack.includes(needle) ? [{narrative: clone(narrative), dispositions: clone(dispositions)}] : [];
  });
}

export function reopenNarrative(state, input) {
  if (input.actor?.kind !== 'human' || !text(input.actor?.id)) throw new TypeError('archive.reopen.human_required');
  const next = clone(state);
  const narrative = next.narratives.find(({id}) => id === input.narrativeId);
  if (!narrative || narrative.stage !== 'archived') throw new TypeError('archive.reopen.unavailable');
  narrative.stage = 'integration';
  const activity = {id: `activity:reopen:${next.activities.length + 1}`, type: 'narrative-reopened', actor: {kind: 'human', id: input.actor.id}, narrativeId: narrative.id, preservedDispositionIds: clone(narrative.archiveDispositionIds ?? []), reason: text(input.reason), createdAt: input.createdAt ?? new Date().toISOString()};
  next.activities.push(activity);
  return {state: next, narrative, activity};
}

export function backwardAudit(state, {documentVersionId, claimId}) {
  const found = findDocumentVersion(state, documentVersionId);
  if (!found) return null;
  const claim = found.version.claims.find(({id}) => id === claimId);
  if (!claim) return null;
  const narrativeVersions = (claim.narrativeVersionIds ?? []).map((versionId) => findNarrativeVersion(state, versionId)).filter(Boolean);
  const narrativeIds = new Set(narrativeVersions.map(({narrative}) => narrative.id));
  const sourceVersionIds = new Set(narrativeVersions.flatMap(({version}) => version.sourceVersionIds ?? []));
  const sources = (state.sources ?? []).flatMap((source) => {
    const versions = (source.versions ?? []).filter(({versionId}) => sourceVersionIds.has(versionId));
    return versions.length ? [{id: source.id, versions}] : [];
  });
  const sourceIds = new Set(sources.map(({id}) => id));
  const relevantRelationships = state.relationships.filter(({fromEntityId, toEntityId}) => narrativeIds.has(fromEntityId) || narrativeIds.has(toEntityId) || sourceIds.has(fromEntityId) || sourceIds.has(toEntityId));
  const relevantAssessments = state.assessments.filter(({targetVersionId}) => sourceVersionIds.has(targetVersionId));
  const relevantTags = state.tagAssignments.filter(({entityId}) => sourceIds.has(entityId));
  const activityIds = new Set([found.version.activityId, ...narrativeVersions.map(({version}) => version.activityId), ...sources.flatMap(({versions}) => versions.map(({activityId}) => activityId)), ...relevantRelationships.map(({activityId}) => activityId), ...relevantAssessments.map(({activityId}) => activityId), ...relevantTags.map(({activityId}) => activityId)].filter(Boolean));
  return {
    document: {id: found.document.id, version: clone(found.version), claim: clone(claim)},
    narratives: narrativeVersions.map(({narrative, version}) => ({id: narrative.id, version: clone(version)})),
    sources: clone(sources),
    sourceVersionIds: [...sourceVersionIds],
    relationships: clone(relevantRelationships),
    assessments: clone(relevantAssessments),
    tags: clone(relevantTags),
    activities: clone(state.activities.filter(({id}) => activityIds.has(id))),
  };
}

export {ARCHIVE_KINDS, COMPARISON_KINDS, URGENCY_DIMENSIONS};
