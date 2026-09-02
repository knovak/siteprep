import {contentIdentity, sha256} from './canonical.mjs';

export const FIXED_TIME = '2026-08-31T18:00:00.000Z';
export const FIXTURE_SCOPE = Object.freeze({
  knowledgeSpaceId: 'space:community-evidence',
  collectionId: 'collection:community-heat-resilience',
});

const CAPTURE_STATES = [
  'retained-text',
  'metadata-only',
  'remote-only',
  'restricted',
  'unavailable',
  'retained-object',
];

function entityWithVersion({id, type, content, index, extensions}) {
  const activityId = 'activity:fixture-genesis';
  const versionId = `${id}:v1`;
  return {
    entity: {
      id,
      type,
      createdAt: FIXED_TIME,
      createdBy: 'actor:fixture-author',
      currentVersionId: versionId,
    },
    version: {
      id: versionId,
      entityId: id,
      schemaVersion: 1,
      createdAt: FIXED_TIME,
      createdBy: 'actor:fixture-author',
      activityId,
      previousVersionId: null,
      state: 'accepted',
      content,
      ...(extensions ? {extensions} : {}),
      contentHash: contentIdentity(content),
    },
  };
}

function relationship(id, type, from, to, entities, extra = {}) {
  const fromEntity = entities.find(({entity}) => entity.id === from);
  const toEntity = entities.find(({entity}) => entity.id === to);
  const value = {
    id,
    type,
    fromEntityId: from,
    toEntityId: to,
    fromVersionId: fromEntity.version.id,
    toVersionId: toEntity.version.id,
    state: extra.state ?? 'accepted',
    createdAt: FIXED_TIME,
    createdBy: 'actor:fixture-author',
    activityId: 'activity:fixture-genesis',
    ...extra,
  };
  return {...value, contentHash: contentIdentity(value)};
}

export function createFixturePackage() {
  const pairs = [];
  for (let index = 1; index <= 18; index += 1) {
    const id = `source:heat-${String(index).padStart(2, '0')}`;
    pairs.push(entityWithVersion({
      id,
      type: 'source',
      index,
      content: {
        title: `Project-authored heat resilience source ${index}`,
        originalUrl: `https://example.invalid/heat-resilience/${index}`,
        sourceSystem: index % 3 === 0 ? 'newsletter-story-harvester' : index % 2 === 0 ? 'bookmark-sorter' : 'direct',
        captureState: CAPTURE_STATES[(index - 1) % CAPTURE_STATES.length],
        rightsState: index % 4 === 0 ? 'restricted-reference' : 'project-authored',
        summary: `Fixture statement ${index}; not real-world advice or evidence.`,
        tags: index % 2 === 0 ? ['actor:community', 'value:well-being'] : ['actor:government', 'value:environment'],
        externalAliases: [{system: 'fixture', namespace: 'heat', externalId: String(index)}],
      },
      extensions: index === 18 ? {'fixture:unknown-preserved': {enabled: true}} : undefined,
    }));
  }
  pairs.push(entityWithVersion({
    id: 'topic:community-heat-resilience',
    type: 'topic',
    index: 19,
    content: {name: 'Community heat resilience', standingDocumentState: 'project-authored'},
  }));
  pairs.push(entityWithVersion({
    id: 'topic:cooling-access',
    type: 'topic',
    index: 20,
    content: {name: 'Cooling access', standingDocumentState: 'none'},
  }));

  const relationships = [
    relationship('relationship:duplicate-01-02', 'duplicate-of', 'source:heat-01', 'source:heat-02', pairs),
    relationship('relationship:syndicated-03-04', 'syndicated-from', 'source:heat-03', 'source:heat-04', pairs),
    relationship('relationship:syndicated-04-05', 'syndicated-from', 'source:heat-04', 'source:heat-05', pairs),
    relationship('relationship:update-06-07', 'updates', 'source:heat-07', 'source:heat-06', pairs),
    relationship('relationship:contradiction-08-09', 'contradicts', 'source:heat-08', 'source:heat-09', pairs, {state: 'disputed'}),
    relationship('relationship:topic-10-a', 'assigned-to-topic', 'source:heat-10', 'topic:community-heat-resilience', pairs),
    relationship('relationship:topic-10-b', 'assigned-to-topic', 'source:heat-10', 'topic:cooling-access', pairs),
  ];
  const activity = {
    id: 'activity:fixture-genesis',
    type: 'fixture-authoring',
    actorId: 'actor:fixture-author',
    createdAt: FIXED_TIME,
    status: 'completed',
    details: {rights: 'project-authored', sourceCount: 18},
  };
  const assetBytes = Buffer.from('Project-authored fixture note. No external source body is included.\n');
  const assets = [{
    path: 'assets/project-authored-note.txt',
    hash: sha256(assetBytes),
    size: assetBytes.byteLength,
    redistributable: true,
    rightsState: 'project-authored',
    bytes: assetBytes.toString('base64'),
  }];
  const recordsWithoutReceipt = {
    entities: pairs.map(({entity}) => entity),
    entityVersions: pairs.map(({version}) => version),
    relationships,
    activities: [activity],
    receipts: [],
  };
  const receipt = {
    id: 'receipt:fixture-genesis',
    operationId: 'operation:fixture-genesis',
    packageHash: contentIdentity({scope: FIXTURE_SCOPE, records: recordsWithoutReceipt, assets}),
    activityId: activity.id,
    createdAt: FIXED_TIME,
    mode: 'restore',
    createdHashes: [
      ...recordsWithoutReceipt.entities,
      ...recordsWithoutReceipt.entityVersions,
      ...recordsWithoutReceipt.relationships,
      ...recordsWithoutReceipt.activities,
    ].map(contentIdentity).sort(),
  };
  const records = {...recordsWithoutReceipt, receipts: [receipt]};
  const identity = contentIdentity({scope: FIXTURE_SCOPE, records, assets});
  return {
    format: 'knowledge-pipeline/v1',
    packageId: `package:${identity.slice('sha256:'.length, 'sha256:'.length + 32)}`,
    createdAt: FIXED_TIME,
    scope: {...FIXTURE_SCOPE},
    records,
    assets,
    extensions: {'siteprep:fixture': {name: 'community-heat-resilience', version: 1}},
  };
}

export function createScalePackage(count = 10_000) {
  const activity = {
    id: 'activity:scale',
    type: 'fixture-generation',
    actorId: 'actor:fixture-author',
    createdAt: FIXED_TIME,
    status: 'completed',
    details: {seed: 20260831, count},
  };
  const entities = [];
  const entityVersions = [];
  for (let index = 0; index < count; index += 1) {
    const id = `source:scale-${String(index).padStart(5, '0')}`;
    const versionId = `${id}:v1`;
    const content = {title: `Scale source ${index}`, captureState: 'metadata-only', seed: 20260831};
    entities.push({id, type: 'source', createdAt: FIXED_TIME, createdBy: 'actor:fixture-author', currentVersionId: versionId});
    entityVersions.push({
      id: versionId,
      entityId: id,
      schemaVersion: 1,
      createdAt: FIXED_TIME,
      createdBy: 'actor:fixture-author',
      activityId: activity.id,
      previousVersionId: null,
      state: 'accepted',
      content,
      contentHash: contentIdentity(content),
    });
  }
  const records = {entities, entityVersions, relationships: [], activities: [activity], receipts: []};
  const assets = [];
  const identity = contentIdentity({scope: FIXTURE_SCOPE, records, assets});
  return {
    format: 'knowledge-pipeline/v1',
    packageId: `package:${identity.slice(7, 39)}`,
    createdAt: FIXED_TIME,
    scope: {...FIXTURE_SCOPE},
    records,
    assets,
    extensions: {'siteprep:fixture': {name: 'scale', seed: 20260831}},
  };
}
