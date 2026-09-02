import {canonicalJson, sha256} from './domain.mjs';

const clone = (value) => structuredClone(value);
const text = (value) => String(value ?? '').trim().normalize('NFC');

const type = (from, to, options = {}) => Object.freeze({
  from: Object.freeze(from),
  to: Object.freeze(to),
  inverse: options.inverse ?? null,
  ...options,
});

export const RELATIONSHIP_REGISTRY = Object.freeze({
  supports: type(['source', 'narrative'], ['narrative', 'comparison', 'standing-document'], {inverse: 'supported by'}),
  contradicts: type(['source', 'narrative'], ['narrative', 'comparison', 'standing-document'], {inverse: 'contradicted by', symmetricDisplay: true}),
  'evidence-for': type(['source', 'narrative'], ['assessment', 'narrative', 'comparison', 'standing-document'], {inverse: 'has evidence'}),
  'derived-from': type(['narrative', 'comparison', 'standing-document', 'archive-disposition'], ['source', 'narrative', 'comparison', 'standing-document'], {inverse: 'used to derive', exactVersions: 'both'}),
  'duplicate-of': type(['source'], ['source'], {inverse: 'duplicate of', symmetric: true, uniquePair: true}),
  'syndicated-from': type(['source'], ['source'], {inverse: 'syndicated as', acyclic: true}),
  updates: type(['source', 'narrative', 'standing-document'], ['source', 'narrative', 'standing-document'], {inverse: 'updated by', sameType: true, acyclic: true}),
  supersedes: type(['source', 'narrative', 'standing-document'], ['source', 'narrative', 'standing-document'], {inverse: 'superseded by', sameType: true, acyclic: true, scopeRequired: true}),
  'latest-update': type(['source', 'narrative', 'standing-document'], ['source', 'narrative', 'standing-document'], {inverse: 'latest update of', sameType: true, derivedOnly: true, oneOutgoingPerScope: true}),
  'assigned-to-topic': type(['source', 'narrative'], ['topic'], {inverse: 'has assigned item', uniquePair: true, fromVersionRequired: true}),
  'part-of': type(['narrative'], ['topic', 'narrative'], {inverse: 'contains', onePrimaryPerFrom: true}),
  'incorporated-into': type(['narrative'], ['standing-document'], {inverse: 'incorporates', toVersionRequired: true}),
  'archived-as': type(['narrative'], ['archive-disposition'], {inverse: 'archives', oneOutgoing: true}),
});

export function newTopicState({collectionId, entities = [], relationships = [], proposals = []}) {
  return {
    collectionId: text(collectionId),
    entities: clone(entities),
    relationships: clone(relationships),
    proposals: clone(proposals),
    narratives: [],
    activities: [],
    receipts: [],
  };
}

function entityMap(state) {
  return new Map(state.entities.map((entity) => [entity.id, entity]));
}

function scopeKey(relationship) {
  return text(relationship.topicScopeId ?? relationship.scope ?? '');
}

function pairKey(relationship, rule) {
  const endpoints = rule.symmetric
    ? [relationship.fromEntityId, relationship.toEntityId].sort((left, right) => left.localeCompare(right))
    : [relationship.fromEntityId, relationship.toEntityId];
  return [relationship.type, ...endpoints, scopeKey(relationship)].join('|');
}

function reaches(relationships, relationship, start, target) {
  const adjacency = new Map();
  for (const item of relationships) {
    if (item.state !== 'accepted' || item.type !== relationship.type || scopeKey(item) !== scopeKey(relationship)) continue;
    if (!adjacency.has(item.fromEntityId)) adjacency.set(item.fromEntityId, []);
    adjacency.get(item.fromEntityId).push(item.toEntityId);
  }
  const pending = [start];
  const seen = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...(adjacency.get(current) ?? []));
  }
  return false;
}

export function validateRelationship(state, candidate, {derived = false} = {}) {
  const rule = RELATIONSHIP_REGISTRY[candidate?.type];
  if (!rule) return {ok: false, code: 'relationship.type.extension', disposition: 'proposed-extension'};
  const entities = entityMap(state);
  const from = entities.get(candidate.fromEntityId);
  const to = entities.get(candidate.toEntityId);
  if (!from || !to) return {ok: false, code: 'relationship.endpoint.missing'};
  if (from.collectionId !== state.collectionId || to.collectionId !== state.collectionId) return {ok: false, code: 'relationship.collection.crossed'};
  if (!rule.from.includes(from.type) || !rule.to.includes(to.type)) return {ok: false, code: 'relationship.endpoint.type'};
  if (rule.sameType && from.type !== to.type) return {ok: false, code: 'relationship.endpoint.type_mismatch'};
  if (rule.derivedOnly && !derived) return {ok: false, code: 'relationship.derived.required'};
  if (rule.scopeRequired && !scopeKey(candidate)) return {ok: false, code: 'relationship.scope.required'};
  if ((rule.exactVersions === 'both' || rule.fromVersionRequired) && !candidate.fromVersionId) return {ok: false, code: 'relationship.version.from_required'};
  if ((rule.exactVersions === 'both' || rule.toVersionRequired) && !candidate.toVersionId) return {ok: false, code: 'relationship.version.to_required'};
  if (candidate.fromVersionId && candidate.fromVersionId !== from.currentVersionId && !(from.versionIds ?? []).includes(candidate.fromVersionId)) return {ok: false, code: 'relationship.version.from_unknown'};
  if (candidate.toVersionId && candidate.toVersionId !== to.currentVersionId && !(to.versionIds ?? []).includes(candidate.toVersionId)) return {ok: false, code: 'relationship.version.to_unknown'};

  const accepted = state.relationships.filter(({state: status}) => status === 'accepted');
  if (rule.uniquePair && accepted.some((item) => pairKey(item, rule) === pairKey(candidate, rule))) return {ok: false, code: 'relationship.duplicate'};
  if (rule.oneOutgoing && accepted.some((item) => item.type === candidate.type && item.fromEntityId === candidate.fromEntityId)) return {ok: false, code: 'relationship.cardinality.outgoing'};
  if (rule.oneOutgoingPerScope && accepted.some((item) => item.type === candidate.type && item.fromEntityId === candidate.fromEntityId && scopeKey(item) === scopeKey(candidate))) return {ok: false, code: 'relationship.cardinality.scope'};
  if (rule.onePrimaryPerFrom && candidate.primary === true && accepted.some((item) => item.type === candidate.type && item.fromEntityId === candidate.fromEntityId && item.primary === true)) return {ok: false, code: 'relationship.cardinality.primary'};
  if (rule.acyclic && (candidate.fromEntityId === candidate.toEntityId || reaches(accepted, candidate, candidate.toEntityId, candidate.fromEntityId))) return {ok: false, code: 'relationship.cycle'};
  return {ok: true, code: null};
}

export async function acceptRelationship(state, candidate, {actor, activityId, createdAt = new Date().toISOString(), derived = false} = {}) {
  const next = clone(state);
  const validation = validateRelationship(next, candidate, {derived});
  if (!validation.ok) {
    if (validation.disposition === 'proposed-extension') {
      next.proposals.push({...clone(candidate), state: 'proposed', extensionType: text(candidate.type), createdAt});
      return {state: next, relationship: null, validation};
    }
    throw new TypeError(validation.code);
  }
  if (!derived && (actor?.kind !== 'human' || !text(actor?.id))) throw new TypeError('Only a human actor can accept a relationship');
  const rule = RELATIONSHIP_REGISTRY[candidate.type];
  const normalized = clone(candidate);
  if (rule.symmetric && normalized.fromEntityId.localeCompare(normalized.toEntityId) > 0) {
    [normalized.fromEntityId, normalized.toEntityId] = [normalized.toEntityId, normalized.fromEntityId];
    [normalized.fromVersionId, normalized.toVersionId] = [normalized.toVersionId, normalized.fromVersionId];
  }
  for (const [key, value] of Object.entries(normalized)) if (value === undefined) delete normalized[key];
  const body = {
    ...normalized,
    state: 'accepted',
    assertedBy: derived ? {kind: 'system', id: 'rule:latest-update-v1'} : {kind: 'human', id: actor.id},
    activityId: text(activityId) || `activity:relationship:${next.relationships.length + 1}`,
    createdAt,
    derived,
    importOrigin: clone(candidate.importOrigin ?? {kind: 'local'}),
  };
  const contentHash = await sha256(canonicalJson(body));
  const relationship = {id: text(candidate.id) || `relationship:${contentHash.slice(7, 39)}`, contentHash, ...body};
  next.relationships.push(relationship);
  next.activities.push({id: relationship.activityId, type: derived ? 'relationship-derived' : 'relationship-accepted', actor: clone(relationship.assertedBy), relationshipId: relationship.id, createdAt});
  return {state: next, relationship, validation};
}

export async function assignToTopic(state, assignment, options) {
  return acceptRelationship(state, {type: 'assigned-to-topic', ...assignment}, options);
}

export function deriveLatestUpdate(state, {rootEntityId, topicScopeId = null}) {
  const relevant = state.relationships.filter((item) => ['accepted', 'disputed'].includes(item.state) && ['updates', 'supersedes'].includes(item.type) && scopeKey(item) === text(topicScopeId));
  const accepted = relevant.filter(({state: status}) => status === 'accepted');
  const outgoing = new Map();
  const incoming = new Map();
  for (const item of accepted) {
    if (!outgoing.has(item.toEntityId)) outgoing.set(item.toEntityId, []);
    outgoing.get(item.toEntityId).push(item.fromEntityId);
    incoming.set(item.fromEntityId, (incoming.get(item.fromEntityId) ?? 0) + 1);
  }
  let current = rootEntityId;
  const seen = new Set([current]);
  while (true) {
    if (relevant.some((item) => item.state === 'disputed' && item.toEntityId === current)) return null;
    const choices = [...new Set(outgoing.get(current) ?? [])];
    if (!choices.length) break;
    if (choices.length !== 1) return null;
    current = choices[0];
    if (seen.has(current) || (incoming.get(current) ?? 0) > 1) return null;
    seen.add(current);
  }
  return current === rootEntityId ? null : {type: 'latest-update', fromEntityId: rootEntityId, toEntityId: current, topicScopeId, derivationRule: 'latest-update-v1'};
}

export async function commitNarrativeProposal(state, proposal, {actor, acceptNarrative = false, acceptedRelationshipIds = [], textEdit, createdAt = new Date().toISOString()}) {
  if (actor?.kind !== 'human' || !text(actor?.id)) throw new TypeError('Only a human actor can commit a narrative proposal');
  const next = clone(state);
  const accepted = new Set(acceptedRelationshipIds);
  const decisions = [];
  let narrative = null;
  if (acceptNarrative) {
    const sourceVersionIds = [...new Set(proposal.sourceVersionIds ?? [])];
    if (!sourceVersionIds.length) throw new TypeError('An accepted narrative needs exact source versions');
    const knownVersions = new Set(next.entities.flatMap((item) => item.versionIds ?? [item.currentVersionId]).filter(Boolean));
    if (sourceVersionIds.some((versionId) => !knownVersions.has(versionId))) throw new TypeError('An accepted narrative names an unknown source version');
    const body = {title: text(proposal.title), text: text(textEdit ?? proposal.text), topicId: proposal.topicId, sourceVersionIds};
    const contentHash = await sha256(canonicalJson(body));
    narrative = {id: proposal.narrativeId, type: 'narrative', collectionId: next.collectionId, currentVersionId: `version:${contentHash.slice(7, 39)}`, versionIds: [`version:${contentHash.slice(7, 39)}`], contentHash, ...body};
    next.entities.push(narrative);
    next.narratives.push(clone(narrative));
  }
  for (const candidate of proposal.relationships ?? []) {
    const outcome = accepted.has(candidate.id) ? 'accepted' : 'rejected';
    decisions.push({relationshipId: candidate.id, outcome, rationale: text(candidate.rationale)});
    if (outcome === 'accepted') {
      const result = await acceptRelationship(next, candidate, {actor, createdAt});
      Object.assign(next, result.state);
    }
  }
  const receiptBody = {format: 'knowledge-pipeline/v1', use: 'narrative-review-receipt', proposalId: proposal.id, actor: {id: actor.id, kind: 'human'}, narrative: acceptNarrative ? {outcome: 'accepted', narrativeId: narrative.id, textEdited: textEdit !== undefined} : {outcome: 'rejected', narrativeId: proposal.narrativeId}, decisions, createdAt};
  const receiptHash = await sha256(canonicalJson(receiptBody));
  const receipt = {receiptId: `receipt:${receiptHash.slice(7, 39)}`, receiptHash, ...receiptBody};
  next.proposals.push({...clone(proposal), state: 'reviewed', review: {narrative: clone(receiptBody.narrative), decisions: clone(decisions)}});
  next.receipts.push(receipt);
  next.activities.push({id: `activity:${receipt.receiptId.slice(8)}`, type: 'narrative-review', actorId: actor.id, narrativeId: narrative?.id ?? null, createdAt});
  return {state: next, narrative, receipt};
}

export function evidenceClosure(state, narrativeId) {
  const narrative = state.narratives.find(({id}) => id === narrativeId) ?? state.entities.find((entity) => entity.id === narrativeId && entity.type === 'narrative');
  if (!narrative) return null;
  const sourceVersions = new Set(narrative.sourceVersionIds ?? []);
  const sourceIds = new Set(state.entities.filter((entity) => (entity.versionIds ?? [entity.currentVersionId]).some((versionId) => sourceVersions.has(versionId))).map(({id}) => id));
  const relationships = state.relationships.filter((item) => item.state === 'accepted' && (
    item.fromEntityId === narrativeId || item.toEntityId === narrativeId || sourceIds.has(item.fromEntityId) || sourceIds.has(item.toEntityId)
  ));
  return {narrativeId, narrativeVersionId: narrative.currentVersionId, sourceVersionIds: clone(narrative.sourceVersionIds ?? []), relationships: relationships.map(({type, fromEntityId, fromVersionId, toEntityId, toVersionId}) => ({type, fromEntityId, fromVersionId: fromVersionId ?? null, toEntityId, toVersionId: toVersionId ?? null}))};
}

export function reorderTopic(state, {topicId, orderedRelationshipIds, actor, createdAt = new Date().toISOString()}) {
  if (actor?.kind !== 'human' || !text(actor?.id)) throw new TypeError('Only a human actor can reorder a topic');
  const next = clone(state);
  const positions = new Map(orderedRelationshipIds.map((id, index) => [id, index + 1]));
  const beforeVersions = new Map(next.narratives.map(({id, currentVersionId}) => [id, currentVersionId]));
  for (const item of next.relationships) if (item.type === 'assigned-to-topic' && item.toEntityId === topicId && positions.has(item.id)) item.position = positions.get(item.id);
  next.activities.push({id: `activity:topic-order:${next.activities.length + 1}`, type: 'topic-order-changed', actorId: actor.id, topicId, orderedRelationshipIds: clone(orderedRelationshipIds), createdAt});
  return {state: next, narrativeVersionsUnchanged: next.narratives.every((item) => beforeVersions.get(item.id) === item.currentVersionId)};
}

export function relationshipTable(state) {
  return state.relationships.filter(({state: status}) => status === 'accepted').map((item) => ({...clone(item), inverseLabel: RELATIONSHIP_REGISTRY[item.type]?.inverse ?? null}));
}

export function relationshipNeighborhood(state, entityId, {limit = 1000} = {}) {
  const bounded = Math.max(0, Math.min(1000, Number(limit) || 0));
  const rows = [];
  for (const item of state.relationships) {
    if (item.state !== 'accepted' || (item.fromEntityId !== entityId && item.toEntityId !== entityId)) continue;
    rows.push({...clone(item), direction: item.fromEntityId === entityId ? 'outgoing' : 'incoming', displayLabel: item.fromEntityId === entityId ? item.type : RELATIONSHIP_REGISTRY[item.type]?.inverse ?? item.type});
    if (rows.length === bounded) break;
  }
  return {entityId, limit: bounded, truncated: rows.length === bounded && state.relationships.length > rows.length, relationships: rows};
}
