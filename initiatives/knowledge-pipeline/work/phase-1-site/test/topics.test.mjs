import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import test from 'node:test';
import {
  RELATIONSHIP_REGISTRY,
  acceptRelationship,
  assignToTopic,
  commitNarrativeProposal,
  deriveLatestUpdate,
  evidenceClosure,
  newTopicState,
  relationshipNeighborhood,
  relationshipTable,
  reorderTopic,
  validateRelationship,
} from '../lib/topics.mjs';

const collectionId = 'collection:heat';
const actor = {id: 'actor:curator', kind: 'human'};
const createdAt = '2026-09-02T19:00:00.000Z';
const entity = (id, type, version = `version:${id}`) => ({id, type, collectionId, currentVersionId: version, versionIds: [version]});
const entities = [
  entity('source:a', 'source'), entity('source:b', 'source'), entity('source:c', 'source'),
  entity('topic:heat', 'topic'), entity('topic:cooling', 'topic'),
  entity('narrative:one', 'narrative'), entity('narrative:two', 'narrative'), entity('narrative:three', 'narrative'),
  entity('assessment:one', 'assessment'), entity('comparison:one', 'comparison'),
  entity('document:one', 'standing-document'), entity('archive:one', 'archive-disposition'),
];

test('the exact Phase 4 registry is explicit and unknown types remain proposed extensions', async () => {
  assert.deepEqual(Object.keys(RELATIONSHIP_REGISTRY), [
    'supports', 'contradicts', 'evidence-for', 'derived-from', 'duplicate-of', 'syndicated-from',
    'updates', 'supersedes', 'latest-update', 'assigned-to-topic', 'part-of', 'incorporated-into', 'archived-as',
  ]);
  const state = newTopicState({collectionId, entities});
  const result = await acceptRelationship(state, {id: 'rel:extension', type: 'siteprep:nearby', fromEntityId: 'source:a', toEntityId: 'source:b'}, {actor, createdAt});
  assert.equal(result.relationship, null);
  assert.equal(result.validation.disposition, 'proposed-extension');
  assert.equal(result.state.proposals[0].state, 'proposed');

  const valid = [
    {type: 'supports', fromEntityId: 'source:a', toEntityId: 'narrative:one'},
    {type: 'contradicts', fromEntityId: 'source:a', toEntityId: 'narrative:one'},
    {type: 'evidence-for', fromEntityId: 'source:a', toEntityId: 'assessment:one'},
    {type: 'derived-from', fromEntityId: 'narrative:one', fromVersionId: 'version:narrative:one', toEntityId: 'source:a', toVersionId: 'version:source:a'},
    {type: 'duplicate-of', fromEntityId: 'source:a', toEntityId: 'source:b'},
    {type: 'syndicated-from', fromEntityId: 'source:a', toEntityId: 'source:b'},
    {type: 'updates', fromEntityId: 'source:a', toEntityId: 'source:b'},
    {type: 'supersedes', fromEntityId: 'source:a', toEntityId: 'source:b', scope: 'topic:heat'},
    {type: 'latest-update', fromEntityId: 'source:a', toEntityId: 'source:b'},
    {type: 'assigned-to-topic', fromEntityId: 'source:a', fromVersionId: 'version:source:a', toEntityId: 'topic:heat'},
    {type: 'part-of', fromEntityId: 'narrative:one', toEntityId: 'topic:heat'},
    {type: 'incorporated-into', fromEntityId: 'narrative:one', toEntityId: 'document:one', toVersionId: 'version:document:one'},
    {type: 'archived-as', fromEntityId: 'narrative:one', toEntityId: 'archive:one'},
  ];
  assert.equal(valid.every((candidate) => validateRelationship(state, candidate, {derived: candidate.type === 'latest-update'}).ok), true);
});

test('one retained source can be assigned to two topics with exact version links and different angles', async () => {
  let state = newTopicState({collectionId, entities});
  const first = await assignToTopic(state, {id: 'rel:heat', fromEntityId: 'source:a', fromVersionId: 'version:source:a', toEntityId: 'topic:heat', rationale: 'Policy angle'}, {actor, createdAt});
  state = first.state;
  const second = await assignToTopic(state, {id: 'rel:cooling', fromEntityId: 'source:a', fromVersionId: 'version:source:a', toEntityId: 'topic:cooling', rationale: 'Access angle'}, {actor, createdAt});
  assert.equal(second.state.entities.filter(({id}) => id === 'source:a').length, 1);
  assert.deepEqual(second.state.relationships.map(({fromVersionId, rationale}) => [fromVersionId, rationale]), [['version:source:a', 'Policy angle'], ['version:source:a', 'Access angle']]);
});

test('registry validation enforces endpoint, exact-version, same-type, scope, derived, and cardinality rules', async () => {
  let state = newTopicState({collectionId, entities: [...entities, {...entity('source:foreign', 'source'), collectionId: 'collection:other'}]});
  assert.equal(validateRelationship(state, {type: 'supports', fromEntityId: 'topic:heat', toEntityId: 'narrative:one'}).code, 'relationship.endpoint.type');
  assert.equal(validateRelationship(state, {type: 'supports', fromEntityId: 'source:foreign', toEntityId: 'narrative:one'}).code, 'relationship.collection.crossed');
  assert.equal(validateRelationship(state, {type: 'derived-from', fromEntityId: 'narrative:one', toEntityId: 'source:a'}).code, 'relationship.version.from_required');
  assert.equal(validateRelationship(state, {type: 'updates', fromEntityId: 'source:a', toEntityId: 'narrative:one'}).code, 'relationship.endpoint.type_mismatch');
  assert.equal(validateRelationship(state, {type: 'supersedes', fromEntityId: 'source:a', toEntityId: 'source:b'}).code, 'relationship.scope.required');
  assert.equal(validateRelationship(state, {type: 'latest-update', fromEntityId: 'source:a', toEntityId: 'source:b'}).code, 'relationship.derived.required');
  assert.equal(validateRelationship(state, {type: 'incorporated-into', fromEntityId: 'narrative:one', toEntityId: 'document:one'}).code, 'relationship.version.to_required');

  state = (await acceptRelationship(state, {id: 'rel:archive', type: 'archived-as', fromEntityId: 'narrative:one', toEntityId: 'archive:one'}, {actor, createdAt})).state;
  assert.equal(validateRelationship(state, {type: 'archived-as', fromEntityId: 'narrative:one', toEntityId: 'archive:one'}).code, 'relationship.cardinality.outgoing');
  state = (await acceptRelationship(state, {id: 'rel:primary', type: 'part-of', fromEntityId: 'narrative:two', toEntityId: 'topic:heat', primary: true}, {actor, createdAt})).state;
  assert.equal(validateRelationship(state, {type: 'part-of', fromEntityId: 'narrative:two', toEntityId: 'topic:cooling', primary: true}).code, 'relationship.cardinality.primary');
});

test('acyclic relationships refuse cycles and symmetric duplicate pairs collapse to one assertion', async () => {
  for (const relationshipType of ['syndicated-from', 'updates', 'supersedes']) {
    let state = newTopicState({collectionId, entities});
    const scope = relationshipType === 'supersedes' ? {scope: 'topic:heat'} : {};
    state = (await acceptRelationship(state, {id: `rel:${relationshipType}:one`, type: relationshipType, fromEntityId: 'source:b', toEntityId: 'source:a', ...scope}, {actor, createdAt})).state;
    assert.equal(validateRelationship(state, {type: relationshipType, fromEntityId: 'source:a', toEntityId: 'source:b', ...scope}).code, 'relationship.cycle');
  }
  let state = newTopicState({collectionId, entities});
  state = (await acceptRelationship(state, {id: 'rel:duplicate', type: 'duplicate-of', fromEntityId: 'source:b', toEntityId: 'source:a'}, {actor, createdAt})).state;
  assert.deepEqual([state.relationships[0].fromEntityId, state.relationships[0].toEntityId], ['source:a', 'source:b']);
  assert.equal(validateRelationship(state, {type: 'duplicate-of', fromEntityId: 'source:a', toEntityId: 'source:b'}).code, 'relationship.duplicate');
});

test('latest update derives for a simple chain and is suppressed by a disputed fork', () => {
  const base = newTopicState({collectionId, entities, relationships: [
    {id: 'rel:u1', type: 'updates', fromEntityId: 'source:b', toEntityId: 'source:a', state: 'accepted'},
    {id: 'rel:u2', type: 'updates', fromEntityId: 'source:c', toEntityId: 'source:b', state: 'accepted'},
  ]});
  assert.deepEqual(deriveLatestUpdate(base, {rootEntityId: 'source:a'}), {type: 'latest-update', fromEntityId: 'source:a', toEntityId: 'source:c', topicScopeId: null, derivationRule: 'latest-update-v1'});
  base.relationships.push({id: 'rel:fork', type: 'updates', fromEntityId: 'narrative:one', toEntityId: 'source:a', state: 'disputed'});
  assert.equal(deriveLatestUpdate(base, {rootEntityId: 'source:a'}), null);
});

test('a human can rewrite and accept a narrative while rejecting one relationship with a full receipt', async () => {
  const state = newTopicState({collectionId, entities});
  const proposal = {
    id: 'proposal:narrative', narrativeId: 'narrative:new', title: 'Cooling access', text: 'Model wording', topicId: 'topic:cooling',
    sourceVersionIds: ['version:source:a', 'version:source:b'],
    relationships: [
      {id: 'rel:support', type: 'supports', fromEntityId: 'source:a', toEntityId: 'narrative:new', rationale: 'Direct evidence'},
      {id: 'rel:contradiction', type: 'contradicts', fromEntityId: 'source:b', toEntityId: 'narrative:new', rationale: 'Human disputes this interpretation'},
    ],
  };
  const result = await commitNarrativeProposal(state, proposal, {actor, acceptNarrative: true, acceptedRelationshipIds: ['rel:support'], textEdit: 'Human-rewritten wording', createdAt});
  assert.equal(result.narrative.text, 'Human-rewritten wording');
  assert.equal(result.state.relationships.length, 1);
  assert.equal(result.state.proposals[0].state, 'reviewed');
  assert.equal(result.state.proposals[0].relationships.length, 2);
  assert.deepEqual(result.receipt.decisions.map(({outcome}) => outcome), ['accepted', 'rejected']);
  assert.equal(result.receipt.narrative.textEdited, true);
});

test('evidence closure retains exact source versions and distinct semantic claims', () => {
  const narrative = {...entity('narrative:closure', 'narrative'), sourceVersionIds: ['version:source:a', 'version:source:b']};
  const state = newTopicState({collectionId, entities: [...entities, narrative], relationships: [
    {id: 'rel:support', type: 'supports', fromEntityId: 'source:a', fromVersionId: 'version:source:a', toEntityId: narrative.id, toVersionId: narrative.currentVersionId, state: 'accepted'},
    {id: 'rel:contradict', type: 'contradicts', fromEntityId: 'source:b', fromVersionId: 'version:source:b', toEntityId: narrative.id, toVersionId: narrative.currentVersionId, state: 'accepted'},
    {id: 'rel:depend', type: 'syndicated-from', fromEntityId: 'source:b', toEntityId: 'source:a', state: 'accepted'},
    {id: 'rel:update', type: 'updates', fromEntityId: 'source:c', toEntityId: 'source:a', state: 'accepted'},
  ]});
  state.narratives.push(narrative);
  const closure = evidenceClosure(state, narrative.id);
  assert.deepEqual(closure.sourceVersionIds, ['version:source:a', 'version:source:b']);
  assert.deepEqual(closure.relationships.map(({type}) => type), ['supports', 'contradicts', 'syndicated-from', 'updates']);
});

test('topic ordering updates assignment metadata and activity without versioning narrative text', () => {
  const narratives = [entity('narrative:order-a', 'narrative'), entity('narrative:order-b', 'narrative')];
  const state = newTopicState({collectionId, entities: [...entities, ...narratives], relationships: [
    {id: 'rel:order-a', type: 'assigned-to-topic', fromEntityId: narratives[0].id, toEntityId: 'topic:heat', state: 'accepted', position: 1},
    {id: 'rel:order-b', type: 'assigned-to-topic', fromEntityId: narratives[1].id, toEntityId: 'topic:heat', state: 'accepted', position: 2},
  ]});
  state.narratives.push(...narratives);
  const result = reorderTopic(state, {topicId: 'topic:heat', orderedRelationshipIds: ['rel:order-b', 'rel:order-a'], actor, createdAt});
  assert.equal(result.narrativeVersionsUnchanged, true);
  assert.deepEqual(result.state.relationships.map(({position}) => position), [2, 1]);
  assert.equal(result.state.activities.at(-1).type, 'topic-order-changed');
});

test('relationship table and bounded neighborhood display inverse labels without manufacturing records', () => {
  const state = newTopicState({collectionId, entities, relationships: [
    {id: 'rel:one', type: 'supports', fromEntityId: 'source:a', toEntityId: 'narrative:one', state: 'accepted'},
    {id: 'rel:two', type: 'contradicts', fromEntityId: 'source:b', toEntityId: 'narrative:one', state: 'accepted'},
  ]});
  assert.equal(relationshipTable(state).length, 2);
  const neighborhood = relationshipNeighborhood(state, 'narrative:one', {limit: 1});
  assert.equal(neighborhood.relationships.length, 1);
  assert.equal(neighborhood.relationships[0].displayLabel, 'supported by');
  assert.equal(state.relationships.length, 2);
});

test('a 1,000-edge relationship neighborhood remains below the two-second budget', () => {
  const scaleEntities = Array.from({length: 1001}, (_, index) => entity(`source:scale:${index}`, 'source'));
  const relationships = Array.from({length: 1000}, (_, index) => ({id: `rel:scale:${index}`, type: 'supports', fromEntityId: scaleEntities[index + 1].id, toEntityId: 'narrative:one', state: 'accepted'}));
  const state = newTopicState({collectionId, entities: [...entities, ...scaleEntities], relationships});
  const samples = [];
  for (let run = 0; run < 20; run += 1) {
    const started = performance.now();
    assert.equal(relationshipNeighborhood(state, 'narrative:one', {limit: 1000}).relationships.length, 1000);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  assert.ok(samples[Math.ceil(samples.length * 0.95) - 1] < 2000);
});
