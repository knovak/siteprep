import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { canonicalJson, sha256 } from '../lib/domain.mjs';
import {
  RETRY_DELAYS_MS,
  assertCredentialFree,
  copyCollectionSubset,
  eraseCollectionBatch,
  hostedScheduleStatus,
  makeKnowledgeSpaceBackup,
  migrateRecoveryPackage,
  packageIdentity,
  pageRows,
  restoreAtomically,
  runDueScheduleTrigger,
  runExportCaller,
  runWithRecoveryRetries,
  scheduleOperationId,
  selectRetainedSuccesses,
  verifyRecoveryPackage,
} from '../lib/recovery.mjs';

const FIXED_AT = '2026-09-01T12:00:00.000Z';
const SCOPE = { knowledgeSpaceId: 'space:one', collectionId: 'collection:one' };

async function collectionPackage({
  scope = SCOPE,
  entities = [],
  versions = [],
  relationships = [],
  assets = [],
  format = 'knowledge-pipeline/v1',
} = {}) {
  const logical = {
    format,
    createdAt: FIXED_AT,
    scope,
    records: {
      entities,
      entityVersions: versions,
      relationships,
      activities: [],
      receipts: [],
    },
    assets,
    extensions: { 'siteprep:sourceTags': [], 'siteprep:reviews': [] },
  };
  const identity = await sha256(canonicalJson(logical));
  return { packageId: `package:${identity.slice(7, 39)}`, ...logical };
}

test('web, administrator, and schedule callers share one export service and equivalent receipts', async () => {
  const pkg = await collectionPackage();
  const exportsByOperation = new Map();
  const stored = [];
  const dependencies = {
    exportsByOperation,
    exportScope: async (scope) => {
      assert.deepEqual(scope, SCOPE);
      return pkg;
    },
    storeAccepted: async (record) => {
      stored.push(record);
      return { objectKey: 'private/accepted' };
    },
  };
  const web = await runExportCaller({
    ...dependencies,
    caller: 'web',
    context: { actorId: 'actor:user', role: 'user' },
    requestedScope: SCOPE,
    operationId: 'operation:web',
  });
  const admin = await runExportCaller({
    ...dependencies,
    caller: 'admin',
    context: { actorId: 'actor:admin', role: 'admin' },
    requestedScope: SCOPE,
    operationId: 'operation:admin',
  });
  const schedule = {
    id: 'schedule:daily',
    active: true,
    nextRunAt: FIXED_AT,
    scope: SCOPE,
  };
  const [scheduled] = await runDueScheduleTrigger({
    ...dependencies,
    context: { actorId: 'actor:admin', role: 'admin' },
    schedules: [schedule],
    now: FIXED_AT,
  });
  assert.equal(
    new Set([
      web.receipt.packageHash,
      admin.receipt.packageHash,
      scheduled.receipt.packageHash,
    ]).size,
    1,
  );
  assert.equal(
    new Set([web.pkg.packageId, admin.pkg.packageId, scheduled.pkg.packageId])
      .size,
    1,
  );
  assert.deepEqual(web.receipt.scope, admin.receipt.scope);
  assert.deepEqual(admin.receipt.scope, scheduled.receipt.scope);
  assert.equal(stored.length, 3);
});

test('scheduled scope is server-derived, administrator-only, credential-free, and idempotent', async () => {
  const pkg = await collectionPackage();
  const exportsByOperation = new Map();
  const calls = [];
  const schedule = {
    id: 'schedule:daily',
    active: true,
    nextRunAt: FIXED_AT,
    scope: SCOPE,
  };
  const input = {
    caller: 'schedule',
    context: { actorId: 'actor:admin', role: 'admin' },
    requestedScope: { knowledgeSpaceId: 'space:attacker' },
    schedule,
    dueAt: FIXED_AT,
    exportsByOperation,
    exportScope: async (scope) => {
      calls.push(scope);
      return pkg;
    },
    storeAccepted: async () => ({
      objectKey: 'private/space:one/schedule:daily',
    }),
  };
  const first = await runExportCaller(input);
  const repeated = await runExportCaller(input);
  assert.deepEqual(calls, [SCOPE]);
  assert.equal(repeated.duplicate, true);
  assert.equal(
    repeated.receipt.operationId,
    scheduleOperationId(schedule.id, FIXED_AT),
  );
  assert.throws(
    () => assertCredentialFree({ authToken: 'must-not-enter-the-adapter' }),
    /forbidden/u,
  );
  assert.throws(
    () =>
      assertCredentialFree({
        callback: 'https://example.test/run?token=must-not-enter-the-adapter',
      }),
    /forbidden/u,
  );
  await assert.rejects(
    () =>
      runExportCaller({
        ...input,
        context: { actorId: 'actor:user', role: 'user' },
      }),
    /admin.required/u,
  );
  assert.equal(first.accepted.objectKey.startsWith('private/'), true);
});

test('hosted schedule remains visibly inactive without explicit permission', () => {
  assert.deepEqual(hostedScheduleStatus(false), {
    active: false,
    code: 'schedule.hosted.permission_required',
  });
  assert.deepEqual(
    RETRY_DELAYS_MS.map((delay) => delay / 60_000),
    [1, 5, 20],
  );
});

test('recovery retry records each attempt, notifies only finally, and preserves the last success', async () => {
  const waits = [];
  const notifications = [];
  const previousSuccess = { packageId: 'package:previous' };
  const result = await runWithRecoveryRetries({
    attempt: async () => {
      throw Object.assign(new Error('r2.unavailable'), {
        code: 'r2.unavailable',
      });
    },
    wait: async (delay) => {
      waits.push(delay);
    },
    previousSuccess,
    notify: async (notice) => {
      notifications.push(notice);
    },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.attempts.length, 4);
  assert.deepEqual(waits, RETRY_DELAYS_MS);
  assert.deepEqual(notifications, [
    { code: 'scheduled-export.final-failure', attempts: 4 },
  ]);
  assert.equal(result.currentSuccess, previousSuccess);
});

test('retention keeps fourteen daily and six monthly accepted recovery points only', () => {
  const artifacts = [];
  for (let month = 1; month <= 8; month += 1) {
    artifacts.push({
      id: `monthly:${month}`,
      state: 'accepted',
      createdAt: `2026-${String(month).padStart(2, '0')}-01T01:00:00.000Z`,
    });
  }
  for (let day = 2; day <= 20; day += 1) {
    artifacts.push({
      id: `daily:${day}`,
      state: 'accepted',
      createdAt: `2026-08-${String(day).padStart(2, '0')}T01:00:00.000Z`,
    });
  }
  artifacts.push({
    id: 'failed',
    state: 'failed',
    createdAt: '2026-08-21T01:00:00.000Z',
  });
  artifacts.push({
    id: 'partial',
    state: 'partial',
    createdAt: '2026-08-22T01:00:00.000Z',
  });
  const retained = selectRetainedSuccesses(artifacts);
  assert.equal(
    new Set(retained.map((item) => item.createdAt.slice(0, 10))).size >= 14,
    true,
  );
  assert.equal(
    new Set(retained.map((item) => item.createdAt.slice(0, 7))).size,
    6,
  );
  assert.equal(
    retained.some((item) => item.state !== 'accepted'),
    false,
  );
  assert.equal(retained.length, 19);
});

test('knowledge-space backup is deterministic and restores atomically without an original-site secret', async () => {
  const assetBytes = 'private fixture bytes';
  const first = await collectionPackage({
    assets: [
      {
        id: 'asset:one',
        bytes: assetBytes,
        contentHash: await sha256(assetBytes),
      },
    ],
  });
  const second = await collectionPackage({
    scope: { knowledgeSpaceId: 'space:one', collectionId: 'collection:two' },
  });
  const space = await makeKnowledgeSpaceBackup({
    knowledgeSpaceId: 'space:one',
    collectionPackages: [second, first],
    createdAt: FIXED_AT,
  });
  const reverse = await makeKnowledgeSpaceBackup({
    knowledgeSpaceId: 'space:one',
    collectionPackages: [first, second],
    createdAt: FIXED_AT,
  });
  assert.equal(space.packageId, reverse.packageId);
  const hash = await packageIdentity(space);
  const visible = [];
  const result = await restoreAtomically({
    pkg: space,
    expectedHash: hash,
    createStage: async () => ({
      pending: [],
      async writeCollection(collection) {
        this.pending.push(collection.scope.collectionId);
      },
    }),
    commitStage: async (stage) => {
      visible.push(...stage.pending);
      return { collections: stage.pending.length };
    },
    abortStage: async () => {
      throw new Error('unexpected abort');
    },
  });
  assert.deepEqual(result.summary, { collections: 2 });
  assert.deepEqual(visible, ['collection:one', 'collection:two']);
  const tampered = structuredClone(space);
  tampered.collections[0].createdAt = 'tampered';
  await assert.rejects(
    () => verifyRecoveryPackage(tampered, hash),
    /package.hash_mismatch/u,
  );
  const tamperedAsset = structuredClone(space);
  tamperedAsset.collections[0].assets[0].bytes = 'tampered private bytes';
  const tamperedCollectionIdentity = await packageIdentity(
    tamperedAsset.collections[0],
  );
  tamperedAsset.collections[0].packageId = `package:${tamperedCollectionIdentity.slice(7, 39)}`;
  const tamperedSpaceIdentity = await packageIdentity(tamperedAsset);
  tamperedAsset.packageId = `package:${tamperedSpaceIdentity.slice(7, 39)}`;
  await assert.rejects(
    () => verifyRecoveryPackage(tamperedAsset),
    /package.asset.hash_mismatch/u,
  );

  let failedVisibility = 'unchanged';
  await assert.rejects(
    () =>
      restoreAtomically({
        pkg: space,
        expectedHash: hash,
        createStage: async () => ({
          async writeCollection() {
            throw new Error('injected write failure');
          },
        }),
        commitStage: async () => {
          failedVisibility = 'partial';
        },
        abortStage: async () => {
          failedVisibility = 'unchanged';
        },
      }),
    /injected write failure/u,
  );
  assert.equal(failedVisibility, 'unchanged');
});

test('cross-space copy remaps internal ids, retains origin aliases, and warns on omitted dependencies', async () => {
  const content = { title: 'One' };
  const contentHash = await sha256(canonicalJson(content));
  const pkg = await collectionPackage({
    entities: [
      { id: 'source:one', currentVersionId: 'version:one' },
      { id: 'source:two', currentVersionId: 'version:two' },
    ],
    versions: [
      { id: 'version:one', entityId: 'source:one', content, contentHash },
      { id: 'version:two', entityId: 'source:two', content, contentHash },
    ],
    relationships: [
      {
        id: 'relationship:self',
        fromEntityId: 'source:one',
        toEntityId: 'source:one',
        type: 'duplicate-of',
      },
      {
        id: 'relationship:outside',
        fromEntityId: 'source:one',
        toEntityId: 'source:two',
        type: 'supports',
      },
    ],
  });
  const copied = await copyCollectionSubset(pkg, {
    targetSpaceId: 'space:target',
    targetCollectionId: 'collection:target',
    targetActorId: 'actor:target',
    entityIds: ['source:one'],
  });
  const copiedEntity = copied.pkg.records.entities[0];
  assert.notEqual(copiedEntity.id, 'source:one');
  assert.equal(copied.pkg.records.entityVersions[0].entityId, copiedEntity.id);
  assert.equal(
    copied.pkg.records.relationships[0].fromEntityId,
    copiedEntity.id,
  );
  assert.equal(copied.pkg.records.relationships.length, 1);
  assert.deepEqual(copied.warnings, [
    { code: 'copy.dependency.omitted', relationshipId: 'relationship:outside' },
  ]);
  assert.equal(
    copied.pkg.extensions['siteprep:copyOrigin'].sourceCollectionId,
    'collection:one',
  );
  assert.equal(
    copied.pkg.extensions['siteprep:collection'].ownerActorId,
    'actor:target',
  );
  assert.equal(copied.pkg.scope.knowledgeSpaceId, 'space:target');
  assert.equal(Object.hasOwn(copied.pkg.extensions, 'sourceAccess'), false);
});

test('pre-migration package adapts to v1 and compares by logical content', async () => {
  const current = await collectionPackage();
  const older = structuredClone(current);
  older.format = 'knowledge-pipeline/v0';
  delete older.assets;
  delete older.records.relationships;
  delete older.extensions;
  const migrated = await migrateRecoveryPackage(older);
  assert.equal(migrated.format, 'knowledge-pipeline/v1');
  assert.deepEqual(migrated.assets, []);
  assert.deepEqual(migrated.records.relationships, []);
  assert.deepEqual(migrated.records.entities, current.records.entities);
});

test('large erasure tombstones, resumes, disables schedules, applies backup choice, and reference-collects blobs', () => {
  const state = {
    collection: { id: 'collection:one', state: 'active' },
    schedules: [{ id: 'schedule:one', active: true }],
    entities: Array.from({ length: 7 }, (_, index) => ({
      id: `entity:${index}`,
      collectionId: 'collection:one',
    })),
    versions: Array.from({ length: 7 }, (_, index) => ({
      id: `version:${index}`,
      collectionId: 'collection:one',
    })),
    relationships: Array.from({ length: 7 }, (_, index) => ({
      id: `relationship:${index}`,
      collectionId: 'collection:one',
    })),
    assetRefs: [
      {
        id: 'asset-ref:owned',
        collectionId: 'collection:one',
        assetId: 'asset:shared',
      },
      {
        id: 'asset-ref:other',
        collectionId: 'collection:other',
        assetId: 'asset:shared',
      },
      {
        id: 'asset-ref:orphan',
        collectionId: 'collection:one',
        assetId: 'asset:orphan',
      },
    ],
    assets: [{ id: 'asset:shared' }, { id: 'asset:orphan' }],
    backups: [{ id: 'backup:one', collectionId: 'collection:one' }],
    receipts: [
      { id: 'receipt:old', collectionId: 'collection:one' },
      { id: 'receipt:other', collectionId: 'collection:other' },
    ],
  };
  let result = eraseCollectionBatch(state, {
    batchSize: 5,
    backupChoice: 'delete',
  });
  assert.equal(result.done, false);
  assert.equal(state.collection.state, 'tombstoned');
  assert.equal(state.schedules[0].active, false);
  while (!result.done) result = eraseCollectionBatch(state, { batchSize: 5 });
  assert.equal(state.collection.state, 'erased');
  assert.deepEqual(state.assets, [{ id: 'asset:shared' }]);
  assert.equal(state.backups.length, 0);
  assert.deepEqual(
    state.receipts.map((item) => item.id),
    ['receipt:other', 'receipt:erase:collection:one'],
  );
});

test('hosted-equivalent scale fixture stays inside manifest, paging, neighborhood, and atomic restore budgets', async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL('../fixtures/phase-6-recovery.json', import.meta.url),
      'utf8',
    ),
  );
  const content = { title: 'Scale fixture', bodyState: 'metadata-only' };
  const contentHash = await sha256(canonicalJson(content));
  const entities = Array.from(
    { length: fixture.scale.currentEntities },
    (_, index) => ({
      id: `source:${String(index).padStart(5, '0')}`,
      currentVersionId: `version:${String(index).padStart(5, '0')}:4`,
    }),
  );
  const versions = Array.from(
    { length: fixture.scale.retainedVersions },
    (_, index) => ({
      id: `version:${String(index % fixture.scale.currentEntities).padStart(5, '0')}:${Math.floor(index / fixture.scale.currentEntities)}`,
      entityId: `source:${String(index % fixture.scale.currentEntities).padStart(5, '0')}`,
      contentHash,
      content,
    }),
  );
  const relationships = Array.from(
    { length: fixture.scale.relationships },
    (_, index) => ({
      id: `relationship:${String(index).padStart(6, '0')}`,
      fromEntityId: `source:${String(index % fixture.scale.currentEntities).padStart(5, '0')}`,
      toEntityId: `source:${String((index + 1) % fixture.scale.currentEntities).padStart(5, '0')}`,
      type: 'supports',
    }),
  );
  const pkg = await collectionPackage({ entities, versions, relationships });

  const exportStarted = performance.now();
  const manifest = canonicalJson(pkg);
  const exportMs = performance.now() - exportStarted;
  assert.equal(
    Buffer.byteLength(manifest) < fixture.budgets.manifestMemoryBytes,
    true,
  );
  assert.equal(exportMs < fixture.budgets.manifestMilliseconds, true);

  const querySamples = [];
  let sourcePage;
  let queuePage;
  let neighborhood;
  for (let sample = 0; sample < 20; sample += 1) {
    const queryStarted = performance.now();
    sourcePage = pageRows(entities, {
      after: sample ? entities[sample - 1].id : null,
      limit: 100,
    });
    queuePage = pageRows(versions, {
      after: sample ? versions[sample - 1].id : null,
      limit: 100,
    });
    neighborhood = relationships
      .filter(
        (item) =>
          item.fromEntityId === `source:${String(sample).padStart(5, '0')}`,
      )
      .slice(0, 1_000);
    querySamples.push(performance.now() - queryStarted);
  }
  querySamples.sort((left, right) => left - right);
  const queryP95 = querySamples[Math.ceil(querySamples.length * 0.95) - 1];
  assert.equal(sourcePage.rows.length, 100);
  assert.equal(queuePage.rows.length, 100);
  assert.equal(neighborhood.length > 0, true);
  assert.equal(queryP95 < fixture.budgets.queryP95Milliseconds, true);

  const restoreStarted = performance.now();
  let visible = null;
  await restoreAtomically({
    pkg,
    expectedHash: await packageIdentity(pkg),
    createStage: async () => ({
      collections: [],
      async writeCollection(collection) {
        this.collections.push(collection);
      },
    }),
    commitStage: async (stage) => {
      visible = stage.collections;
      return { collections: stage.collections.length };
    },
    abortStage: async () => {
      visible = null;
    },
  });
  const restoreMs = performance.now() - restoreStarted;
  assert.equal(restoreMs < fixture.budgets.restoreMilliseconds, true);
  assert.equal(
    visible[0].records.entities.length,
    fixture.scale.currentEntities,
  );
  assert.equal(
    visible[0].records.entityVersions.length,
    fixture.scale.retainedVersions,
  );
  assert.equal(
    visible[0].records.relationships.length,
    fixture.scale.relationships,
  );
});
