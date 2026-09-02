import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizationDecision,
  canonicalJson,
  confirmErase,
  erasePreview,
  makeCollectionBackup,
  makeEmptyBackup,
  normalizeCollectionName,
  normalizeEmail,
  privateBlobKey,
  selectionToken,
  sha256,
  validateCollectionBackup,
  validateEmptyBackup,
} from '../lib/domain.mjs';

test('identity is complete, allowlisted, and linked exactly once', () => {
  const identity = {userId: 'site-user-1', email: 'Curator@Example.COM'};
  assert.equal(normalizeEmail(identity.email), 'curator@example.com');
  assert.equal(authorizationDecision(null, null).status, 401);
  assert.equal(authorizationDecision(identity, null).status, 403);
  assert.equal(authorizationDecision(identity, {siteUserId: null, disabledAt: null}).code, 'identity.link_required');
  assert.equal(authorizationDecision(identity, {siteUserId: 'site-user-1', disabledAt: null}).status, 200);
  assert.equal(authorizationDecision(identity, {siteUserId: 'site-user-2', disabledAt: null}).code, 'identity.link_conflict');
});

test('collection names are trimmed, bounded, and case-folded without becoming ids', () => {
  assert.deepEqual(normalizeCollectionName('  Heat Resilience  '), {
    ok: true,
    code: null,
    name: 'Heat Resilience',
    normalized: 'heat resilience',
  });
  for (const value of ['', '  ', '/', '\\', `bad\u0000name`, 'x'.repeat(81)]) {
    assert.equal(normalizeCollectionName(value).ok, false);
  }
});

test('selection and erase previews pin actor, collection, and both revisions', () => {
  const collection = {id: 'collection:one', name: 'One', ownerActorId: 'actor:one', revision: 4};
  const preview = erasePreview(collection, {entities: 12, assets: 2, backups: 1}, 7);
  assert.equal(preview.token, selectionToken('actor:one', 'collection:one', 7, 4));
  assert.equal(confirmErase(preview, {token: preview.token, collectionName: 'One'}).ok, true);
  assert.equal(confirmErase(preview, {token: preview.token, collectionName: 'one'}).code, 'erase.name.mismatch');
  assert.equal(confirmErase(preview, {token: `${preview.token}x`, collectionName: 'One'}).code, 'erase.preview.stale');
});

test('empty canonical backup carries collection, actor, configuration, and receipts', async () => {
  const activity = {id: 'activity:create', type: 'collection-create', actorId: 'actor:one', createdAt: '2026-09-01T00:00:00.000Z', status: 'completed'};
  const receipt = {id: 'receipt:create', operationId: 'operation:create', packageHash: 'sha256:genesis', activityId: activity.id, createdAt: activity.createdAt, mode: 'merge', createdHashes: []};
  const pkg = await makeEmptyBackup({
    collection: {id: 'collection:one', name: 'One', ownerActorId: 'actor:one', state: 'active', revision: 1},
    actor: {id: 'actor:one'},
    activities: [activity],
    receipts: [receipt],
    createdAt: '2026-09-01T00:00:00.000Z',
  });
  assert.match(pkg.packageId, /^package:[0-9a-f]{32}$/u);
  assert.deepEqual(validateEmptyBackup(pkg, 'collection:one'), []);
  assert.equal(pkg.extensions['siteprep:collection'].ownerActorId, 'actor:one');
  assert.equal(pkg.extensions['siteprep:configuration'].blobBinding, 'private');
  assert.equal(canonicalJson({b: 2, a: 1}), '{"a":1,"b":2}');
});

test('backup validation and private object keys refuse scope confusion', () => {
  assert.deepEqual(validateEmptyBackup({format: 'future/v2'}, 'collection:one'), [
    'package.version.unsupported',
    'package.scope.mismatch',
    'package.records.entities.invalid',
    'package.records.entityVersions.invalid',
    'package.records.relationships.invalid',
    'package.records.activities.invalid',
    'package.records.receipts.invalid',
    'package.assets.invalid',
    'package.source_tags.invalid',
  ]);
  assert.equal(
    privateBlobKey('actor:one', 'collection:one', 'backup', 'backup:one'),
    'private/actor:one/collection:one/backup/backup:one',
  );
  assert.throws(() => privateBlobKey('actor:one', '../other', 'backup', 'one'));
});

test('source-aware backup round-trips versions, aliases, tags, and dependency proposals', async () => {
  const content = {
    canonicalKey: 'https://example.org/source', aliases: [{namespace: 'url', key: 'https://example.org/source'}],
    sourceKind: 'direct', title: 'Source', url: 'https://example.org/source', body: null,
    bodyState: 'metadata-only', rightsState: 'metadata-only', captureState: 'metadata-only',
    capturedAt: null, contributor: null, sourceUpdatedAt: null, externalJudgement: null,
    tags: [{label: 'Heat', key: 'heat', status: 'accepted', type: 'user', stage: 'harvest'}],
    dependencies: [], origin: {route: 'direct'}, metadata: {},
  };
  const hash = await sha256(canonicalJson(content));
  const pkg = await makeCollectionBackup({
    collection: {id: 'collection:one', name: 'One', ownerActorId: 'actor:one', state: 'active', revision: 2},
    actor: {id: 'actor:one'}, activities: [], receipts: [], createdAt: '2026-09-01T00:00:00.000Z',
    sourceRecords: [{
      id: 'source:one', canonicalKey: content.canonicalKey, state: 'active', currentVersionId: 'version:one',
      createdAt: '2026-09-01T00:00:00.000Z', aliases: content.aliases,
      versions: [{id: 'version:one', contentHash: hash, content, actorId: 'actor:one', createdAt: '2026-09-01T00:00:00.000Z'}],
      tags: [{label: 'Heat', key: 'heat', status: 'accepted', type: 'user', stage: 'harvest', createdAt: '2026-09-01T00:00:00.000Z', archivedAt: null}],
    }],
    dependencyProposals: [{id: 'dependency:one', sourceId: 'source:one', type: 'duplicate-of', targetNamespace: 'url', targetKey: 'https://example.org/other', state: 'proposed', createdAt: '2026-09-01T00:00:00.000Z'}],
  });
  assert.deepEqual(validateCollectionBackup(pkg, 'collection:one'), []);
  assert.equal(pkg.records.entities[0].aliases[0].namespace, 'url');
  assert.equal(pkg.records.entityVersions[0].contentHash, hash);
  assert.equal(pkg.records.relationships[0].type, 'duplicate-of');
  assert.equal(pkg.extensions['siteprep:sourceTags'][0].key, 'heat');
});
