import {canonicalJson, sha256} from './domain.mjs';

export const ASSESSMENT_DIMENSIONS = ['relevance', 'quality', 'novelty', 'importance', 'urgency'];
export const PROMOTION_DISPOSITIONS = ['promoted', 'deferred', 'rejected', 'needs-review'];

const asText = (value, fallback = '') => String(value ?? fallback).trim().normalize('NFC');
const clone = (value) => structuredClone(value);
const finding = (code, message, operationId = null) => ({code, message, operationId});

function portableSource(source) {
  const content = source.content ?? {};
  return {
    id: asText(source.id),
    versionId: asText(source.versionId ?? source.currentVersionId),
    contentHash: asText(source.contentHash ?? source.content_hash),
    title: asText(source.title ?? content.title),
    url: source.url ?? content.url ?? null,
    body: source.body ?? content.body ?? null,
    bodyState: source.bodyState ?? content.bodyState ?? 'missing',
    rightsState: source.rightsState ?? content.rightsState ?? 'unknown',
    tags: clone(source.tags ?? []),
  };
}

function basePacketContent({collection, actorId, sources, omittedDependencies, createdAt}) {
  return {
    format: 'knowledge-pipeline/v1',
    use: 'llm-work-packet',
    createdAt,
    destination: {
      collectionId: asText(collection.id),
      collectionName: asText(collection.name),
      collectionRevision: Number(collection.revision),
      selectionRevision: Number(collection.selectionRevision),
    },
    requestedBy: {actorId: asText(actorId), kind: 'human'},
    acceptedInputs: sources,
    omittedDependencies: omittedDependencies.map((item) => ({
      id: asText(item.id),
      reason: asText(item.reason, 'outside selected source closure'),
    })),
    allowedProposalTypes: ['tag', 'assessment', 'promotion', 'vocabulary'],
    authority: {mayPropose: true, mayCommit: false, credentials: []},
  };
}

export async function makeWorkPacket({
  collection,
  actorId,
  sources,
  selectedSourceIds,
  omittedDependencies = [],
  createdAt = new Date().toISOString(),
  maxSources = 100,
}) {
  const selection = new Set(selectedSourceIds ?? sources.map(({id}) => id));
  const acceptedInputs = sources.filter(({id}) => selection.has(id)).map(portableSource);
  if (!acceptedInputs.length) throw new TypeError('A work packet needs at least one selected source');
  if (acceptedInputs.length > maxSources) throw new RangeError(`Work packet exceeds the ${maxSources}-source bound`);
  for (const source of acceptedInputs) {
    if (!source.id || !source.versionId || !source.contentHash) throw new TypeError('Each work-packet source needs id, version id, and content hash');
  }
  const logical = basePacketContent({collection, actorId, sources: acceptedInputs, omittedDependencies, createdAt});
  const packageHash = await sha256(canonicalJson(logical));
  return {packageId: `work-packet:${packageHash.slice(7, 39)}`, packageHash, ...logical};
}

function validateAssessment(payload, operationId) {
  const findings = [];
  const keys = Object.keys(payload?.dimensions ?? {});
  for (const dimension of ASSESSMENT_DIMENSIONS) {
    const record = payload?.dimensions?.[dimension];
    if (!record || typeof record !== 'object') {
      findings.push(finding('proposal.assessment.dimension_missing', `Assessment is missing ${dimension}`, operationId));
      continue;
    }
    const unknown = record.unknown === true;
    if (!unknown && (!Number.isInteger(record.value) || record.value < 0 || record.value > 4)) {
      findings.push(finding('proposal.assessment.value_invalid', `${dimension} must be 0-4 or explicit unknown`, operationId));
    }
    if (unknown && record.value !== null) findings.push(finding('proposal.assessment.unknown_value', `${dimension} unknown must carry a null value`, operationId));
    if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) {
      findings.push(finding('proposal.assessment.confidence_invalid', `${dimension} confidence must be 0-1`, operationId));
    }
    if (!asText(record.rationale)) findings.push(finding('proposal.assessment.rationale_missing', `${dimension} needs a rationale`, operationId));
    if (!Array.isArray(record.evidence)) findings.push(finding('proposal.assessment.evidence_invalid', `${dimension} evidence must be an array`, operationId));
  }
  for (const key of keys) if (!ASSESSMENT_DIMENSIONS.includes(key)) findings.push(finding('proposal.assessment.dimension_unknown', `Unknown assessment dimension ${key}`, operationId));
  if ('total' in (payload ?? {}) || 'score' in (payload ?? {})) findings.push(finding('proposal.assessment.canonical_sum_refused', 'Assessment must not contain a canonical total or score', operationId));
  return findings;
}

function validateOperation(operation, packetSources) {
  const id = asText(operation?.id);
  const findings = [];
  if (!id) findings.push(finding('proposal.operation.id_missing', 'Operation id is required'));
  if (!['tag', 'assessment', 'promotion', 'vocabulary'].includes(operation?.type)) {
    findings.push(finding('proposal.operation.type_invalid', `Unsupported operation type ${operation?.type ?? ''}`, id));
    return findings;
  }
  if (operation.type !== 'vocabulary') {
    const source = packetSources.get(operation.sourceId);
    if (!source) findings.push(finding('proposal.operation.source_outside_packet', 'Operation target is outside the work packet', id));
    else if (operation.baseVersionHash !== source.contentHash) findings.push(finding('proposal.operation.base_hash_invalid', 'Operation does not name the packet source hash', id));
  }
  if (operation.type === 'tag' && !asText(operation.payload?.tag)) findings.push(finding('proposal.tag.empty', 'Tag proposal is empty', id));
  if (operation.type === 'assessment') findings.push(...validateAssessment(operation.payload, id));
  if (operation.type === 'promotion' && !PROMOTION_DISPOSITIONS.includes(operation.payload?.disposition)) {
    findings.push(finding('proposal.promotion.disposition_invalid', 'Promotion disposition is invalid', id));
  }
  if (operation.type === 'vocabulary' && !['unknown', 'rename', 'alias', 'deprecate', 'split', 'replace'].includes(operation.payload?.change)) {
    findings.push(finding('proposal.vocabulary.change_invalid', 'Vocabulary change is invalid', id));
  }
  if (!asText(operation.payload?.rationale)) findings.push(finding('proposal.operation.rationale_missing', 'Operation needs a reviewable rationale', id));
  return findings;
}

export function previewProposal(packet, proposal, currentDestination) {
  const findings = [];
  const proposalOperations = Array.isArray(proposal?.operations) ? proposal.operations : [];
  if (proposal?.format !== 'knowledge-pipeline/v1' || proposal?.use !== 'llm-proposal') findings.push(finding('proposal.format.invalid', 'Proposal envelope is not knowledge-pipeline/v1 llm-proposal'));
  if (proposal?.base?.packageId !== packet.packageId || proposal?.base?.packageHash !== packet.packageHash) findings.push(finding('proposal.packet.mismatch', 'Proposal does not name this work packet and hash'));
  if (proposal?.proposer?.kind !== 'llm') findings.push(finding('proposal.actor.invalid', 'The file-loop proposal must identify an LLM proposer'));
  if (proposal?.authority?.credentials?.length || proposal?.authority?.mayCommit === true) findings.push(finding('proposal.authority.invalid', 'Proposal files cannot carry credentials or commit authority'));

  const suppliedDestination = currentDestination ?? packet.destination;
  const current = {
    ...suppliedDestination,
    collectionId: suppliedDestination.collectionId ?? suppliedDestination.id,
    collectionRevision: suppliedDestination.collectionRevision ?? suppliedDestination.revision,
  };
  if (current.collectionId !== packet.destination.collectionId) findings.push(finding('proposal.destination.changed', `Work packet destination ${packet.destination.collectionId}; current destination ${current.collectionId}`));
  if (Number(current.collectionRevision) !== packet.destination.collectionRevision || Number(current.selectionRevision) !== packet.destination.selectionRevision) {
    findings.push(finding('proposal.destination.stale', `Work packet revision ${packet.destination.collectionRevision}/${packet.destination.selectionRevision}; current revision ${current.collectionRevision}/${current.selectionRevision}`));
  }

  const currentSources = new Map((current.sources ?? packet.acceptedInputs).map((source) => [source.id, portableSource(source)]));
  const packetSources = new Map(packet.acceptedInputs.map((source) => [source.id, source]));
  const seen = new Set();
  const operations = proposalOperations.map((operation) => {
    const operationFindings = validateOperation(operation, packetSources);
    if (seen.has(operation.id)) operationFindings.push(finding('proposal.operation.duplicate_id', 'Operation id is duplicated', operation.id));
    seen.add(operation.id);
    const packetSource = packetSources.get(operation.sourceId);
    const currentSource = currentSources.get(operation.sourceId);
    if (packetSource && (!currentSource || currentSource.contentHash !== packetSource.contentHash)) operationFindings.push(finding('proposal.operation.stale_base', `Source ${operation.sourceId} changed after export`, operation.id));
    return {...clone(operation), status: operationFindings.length ? 'refused' : 'ready', findings: operationFindings};
  });
  findings.push(...operations.flatMap(({findings: items}) => items));
  return {
    proposalId: asText(proposal?.proposalId),
    packetId: packet.packageId,
    originalDestination: clone(packet.destination),
    currentDestination: clone(current),
    proposer: clone(proposal?.proposer ?? null),
    operations,
    findings,
    canCommit: findings.every(({code}) => !code.startsWith('proposal.destination.') && !['proposal.format.invalid', 'proposal.packet.mismatch', 'proposal.actor.invalid', 'proposal.authority.invalid'].includes(code)),
  };
}

export function newReviewState() {
  return {tags: [], assessments: [], vocabulary: [], promotions: [], activities: [], receipts: []};
}

export async function commitProposalState(state, preview, {actor, acceptedOperationIds, rationaleEdits = {}, createdAt = new Date().toISOString()}) {
  if (actor?.kind !== 'human' || !asText(actor?.id)) throw new TypeError('Only a human actor can commit reviewed proposal operations');
  if (!preview.canCommit) throw new TypeError('Proposal preview is stale or names another destination');
  const accepted = new Set(acceptedOperationIds ?? []);
  const known = new Set(preview.operations.map(({id}) => id));
  for (const id of accepted) if (!known.has(id)) throw new TypeError(`Accepted operation ${id} is not in the proposal`);
  const next = clone(state);
  const decisions = [];
  for (const operation of preview.operations) {
    const acceptedByHuman = accepted.has(operation.id);
    if (acceptedByHuman && operation.status !== 'ready') throw new TypeError(`Refused operation ${operation.id} cannot be accepted`);
    const rationale = asText(rationaleEdits[operation.id] ?? operation.payload?.rationale);
    decisions.push({operationId: operation.id, outcome: acceptedByHuman ? 'accepted' : 'rejected', rationale});
    if (!acceptedByHuman) continue;
    const record = {
      id: `${operation.type}:${operation.id}`,
      sourceId: operation.sourceId ?? null,
      sourceVersionHash: operation.baseVersionHash ?? null,
      ...clone(operation.payload),
      rationale,
      proposedBy: clone(preview.proposer),
      acceptedBy: {actorId: actor.id, kind: 'human'},
      processVersion: asText(preview.proposer?.processVersion, 'unknown'),
      createdAt,
    };
    if (operation.type === 'tag') next.tags.push(record);
    if (operation.type === 'assessment') next.assessments.push(record);
    if (operation.type === 'vocabulary') next.vocabulary.push({...record, historicalAssignmentsPreserved: true});
    if (operation.type === 'promotion') next.promotions.push(record);
  }
  const activity = {id: `activity:${preview.proposalId}`, type: 'proposal-review', actorId: actor.id, createdAt};
  const receiptBody = {
    format: 'knowledge-pipeline/v1',
    use: 'proposal-review-receipt',
    proposalId: preview.proposalId,
    packetId: preview.packetId,
    originalDestination: preview.originalDestination,
    currentDestination: preview.currentDestination,
    actor: {id: actor.id, kind: 'human'},
    decisions,
    createdAt,
  };
  const receiptHash = await sha256(canonicalJson(receiptBody));
  const receipt = {receiptId: `receipt:${receiptHash.slice(7, 39)}`, receiptHash, ...receiptBody};
  next.activities.push(activity);
  next.receipts.push(receipt);
  return {state: next, receipt};
}

export function vocabularyImpact(state, change) {
  const key = asText(change.key).toLocaleLowerCase('en-US');
  const acceptedAssignments = state.tags.filter(({tag, key: recordKey}) => asText(recordKey ?? tag).toLocaleLowerCase('en-US') === key);
  return {
    key,
    change: change.change,
    affectedAcceptedAssignments: acceptedAssignments.length,
    historicalAssignmentsPreserved: true,
    replacements: clone(change.replacements ?? []),
    aliases: clone(change.aliases ?? []),
  };
}

export function dependenceAdjustedCounts(sources, relationships) {
  const parent = new Map(sources.map(({id}) => [id, id]));
  const find = (id) => {
    let cursor = parent.get(id);
    while (cursor && cursor !== parent.get(cursor)) cursor = parent.get(cursor);
    return cursor ?? id;
  };
  const union = (left, right) => {
    const a = find(left); const b = find(right);
    if (parent.has(a) && parent.has(b) && a !== b) parent.set(b, a);
  };
  for (const relationship of relationships) if (['duplicate-of', 'syndicated-from'].includes(relationship.type) && relationship.state === 'accepted') union(relationship.from, relationship.to);
  const clusters = new Map();
  for (const {id} of sources) {
    const root = find(id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(id);
  }
  return {rawSourceCount: sources.length, independentClusterCount: clusters.size, clusters: [...clusters.values()]};
}

export function orderedAssessmentView(assessments, rule = 'importance-desc-then-relevance-desc') {
  const value = (assessment, dimension) => assessment.dimensions?.[dimension]?.unknown ? -1 : assessment.dimensions?.[dimension]?.value ?? -1;
  const records = [...assessments].sort((a, b) => value(b, 'importance') - value(a, 'importance') || value(b, 'relevance') - value(a, 'relevance'));
  return {rule, dimensionsShown: ASSESSMENT_DIMENSIONS, records};
}
