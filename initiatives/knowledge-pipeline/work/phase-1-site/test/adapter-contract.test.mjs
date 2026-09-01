import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalAdapters } from '../lib/local-adapters.mjs';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-phase-1-'));
  const adapter = new LocalAdapters(join(root, 'local.sqlite'), join(root, 'blobs'));
  try { await run(adapter); } finally { adapter.close(); await rm(root, {recursive: true, force: true}); }
}

test('local repository contract links allowlisted identities and isolates collection ids', () => fixture(async (adapter) => {
  adapter.seed('admin@example.com', 'admin');
  adapter.seed('user@example.com', 'user');
  const admin = adapter.authorize({userId: 'site-admin', email: 'ADMIN@example.com'});
  const user = adapter.authorize({userId: 'site-user', email: 'user@example.com'});
  assert.equal(admin.status, 200);
  assert.equal(user.status, 200);
  assert.equal(adapter.authorize({userId: 'intruder', email: 'no@example.com'}).status, 403);
  assert.equal(adapter.authorize({userId: 'different', email: 'admin@example.com'}).code, 'identity.link_conflict');
  const first = adapter.createCollection(admin.actorId, 'Heat Resilience');
  const second = adapter.createCollection(user.actorId, 'Heat Resilience');
  assert.equal(adapter.listCollections(admin.actorId).length, 1);
  assert.equal(adapter.listCollections(user.actorId).length, 1);
  assert.throws(() => adapter.selectCollection(admin.actorId, second), /collection.not_found/u);
  assert.throws(() => adapter.selectCollection(user.actorId, first), /collection.not_found/u);
}));

test('local repository contract rolls back failed commits and enforces case-folded uniqueness', () => fixture(async (adapter) => {
  adapter.seed('admin@example.com');
  const {actorId} = adapter.authorize({userId: 'site-admin', email: 'admin@example.com'});
  assert.throws(() => adapter.createCollection(actorId, 'Will Roll Back', {faultAfterInsert: true}), /Injected/u);
  assert.equal(adapter.listCollections(actorId).length, 0);
  adapter.createCollection(actorId, 'One Collection');
  assert.throws(() => adapter.createCollection(actorId, 'one collection'), /UNIQUE/u);
  assert.equal(adapter.listCollections(actorId).length, 1);
}));

test('private blob contract requires an owned collection and preserves shared bytes until the final reference is erased', () => fixture(async (adapter) => {
  adapter.seed('admin@example.com');
  const {actorId} = adapter.authorize({userId: 'site-admin', email: 'admin@example.com'});
  const first = adapter.createCollection(actorId, 'First');
  const second = adapter.createCollection(actorId, 'Second');
  const bytes = new TextEncoder().encode('private fixture object');
  await adapter.putBlob(actorId, first, 'asset:shared', bytes);
  await adapter.putBlob(actorId, second, 'asset:shared', bytes);
  assert.equal(new TextDecoder().decode(adapter.readBlob(actorId, first, 'asset:shared')), 'private fixture object');
  adapter.eraseCollection(actorId, first);
  assert.equal(new TextDecoder().decode(adapter.readBlob(actorId, second, 'asset:shared')), 'private fixture object');
  adapter.eraseCollection(actorId, second);
  assert.throws(() => adapter.readBlob(actorId, second, 'asset:shared'));
}));
