import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { workflowStore } from '../lib/workflow-store.mjs';
import {
  applyWorkflowOperation,
  emptyWorkflow,
  workflowPackage,
  validateWorkflowPackage,
  workflowCounts,
} from '../lib/workflow.mjs';

class D1 {
  constructor(path) {
    this.raw = new DatabaseSync(path);
  }
  prepare(sql) {
    const stmt = this.raw.prepare(sql);
    return {
      bind: (...params) => ({
        first: async () => stmt.get(...params) ?? null,
        all: async () => ({ results: stmt.all(...params) }),
        run: async () => {
          const r = stmt.run(...params);
          return { meta: { changes: Number(r.changes) } };
        },
      }),
    };
  }
}
class Files {
  constructor(directory) {
    this.directory = directory;
    this.fail = false;
  }
  async put(key, bytes) {
    if (this.fail) throw new Error('Injected object-store interruption');
    await writeFile(join(this.directory, encodeURIComponent(key)), bytes);
  }
  async get(key) {
    try {
      const bytes = await readFile(
        join(this.directory, encodeURIComponent(key)),
      );
      return {
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      };
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }
  async delete(key) {
    await rm(join(this.directory, encodeURIComponent(key)), { force: true });
  }
}
async function setup(
  t,
  actorId = 'actor:test',
  collectionId = 'collection:test',
) {
  const directory = await mkdtemp(join(tmpdir(), 'kp-workflow-test-'));
  const path = join(directory, 'database.sqlite');
  const db = new D1(path);
  const files = new Files(directory);
  for (const file of (await readdir(new URL('../drizzle/', import.meta.url)))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    db.raw.exec(
      await readFile(new URL('../drizzle/' + file, import.meta.url), 'utf8'),
    );
  db.raw
    .prepare(
      'INSERT INTO collection (id,owner_actor_id,name,normalized_name,state,revision,created_at) VALUES (?,?,?,?,?,?,?)',
    )
    .run(
      collectionId,
      actorId,
      'Practice',
      'practice',
      'active',
      1,
      '2026-09-05T00:00:00Z',
    );
  db.raw
    .prepare(
      'INSERT INTO actor_state (actor_id,selected_collection_id,selection_revision,updated_at) VALUES (?,?,?,?)',
    )
    .run(actorId, collectionId, 1, '2026-09-05T00:00:00Z');
  const actor = { id: actorId, kind: 'human', role: 'admin' };
  const store = workflowStore(db, files, actor);
  t.after(async () => {
    try {
      db.raw.close();
    } catch {}
    await rm(directory, { recursive: true, force: true });
  });
  const mutate = async (input) => {
    const loaded = await store.load(collectionId);
    return store.mutate(collectionId, {
      operationId: crypto.randomUUID(),
      revision: loaded.revision,
      selectionRevision: loaded.selectionRevision,
      ...input,
    });
  };
  return { db, files, actor, store, mutate, collectionId, path };
}

test('the persistent workflow completes document approval, four archives, reopen, and database restart', async (t) => {
  const c = await setup(t);
  await c.mutate({ type: 'fixture' });
  let loaded = await c.store.load(c.collectionId);
  assert.equal(loaded.state.harvest.sources.length, 18);
  const source = loaded.state.harvest.sources[0];
  const sourceHash = loaded.state.harvest.versions.find(
    (v) => v.id === source.currentVersionId,
  ).contentHash;
  await c.mutate({
    type: 'review-source',
    sourceId: source.id,
    sourceHash,
    tags: 'corrected, fixture',
    disposition: 'promoted',
    rationale: 'Human rehearsal correction; unknown claims stay unknown.',
    dimensions: Object.fromEntries(
      ['relevance', 'quality', 'novelty', 'importance', 'urgency'].map(
        (key) => [key, 'unknown'],
      ),
    ),
  });
  for (const topicId of loaded.state.integration.topics.map((t) => t.id))
    await c.mutate({ type: 'assign-topic', sourceId: source.id, topicId });
  await c.mutate({
    type: 'narrative',
    title: 'Rewritten narrative',
    topicId: 'topic:fixture-0',
    sourceIds: [source.id],
    proposedText: 'Original proposal.',
    text: 'Human-edited statement with an exact source.',
  });
  await c.mutate({
    type: 'document-proposal',
    topicId: 'topic:fixture-0',
    text: 'Draft with a part to reject.',
    rationale: 'Review all incoming narratives.',
  });
  loaded = await c.store.load(c.collectionId);
  await c.mutate({
    type: 'approve-document',
    proposalId: loaded.state.integration.proposals.at(-1).id,
    text: 'Human-approved corrected standing document.',
    rejectedParts: 'Overconfident draft sentence.',
  });
  loaded = await c.store.load(c.collectionId);
  const documentVersion =
    loaded.state.integration.documents[0].currentVersionId;
  const narratives = loaded.state.integration.narratives;
  for (const [index, kind] of [
    'incorporated',
    'rejected',
    'deferred',
    'superseded',
  ].entries())
    await c.mutate({
      type: 'archive',
      narrativeId: narratives[index].id,
      kind,
      reason: 'Does not support this conclusion.',
      revisitCondition: 'When new evidence arrives.',
      standingDocumentVersionId: documentVersion,
      replacingNarrativeVersionId: narratives[4].currentVersionId,
    });
  await c.mutate({
    type: 'reopen',
    narrativeId: narratives[0].id,
    reason: 'Revisit the accepted conclusion.',
  });
  const before = await c.store.load(c.collectionId);
  c.db.raw.close();
  c.db.raw = new DatabaseSync(c.path);
  const after = await c.store.load(c.collectionId);
  assert.deepEqual(after, before);
  assert.equal(after.state.integration.archiveDispositions.length, 4);
  assert.equal(after.state.integration.documents[0].versions.length, 2);
  assert.equal(after.state.decisions[0].tags[0], 'corrected');
  assert.deepEqual(workflowCounts(after.state), {
    sources: 18,
    sourceVersions: 18,
    topics: 2,
    narratives: 7,
    documents: 1,
    archived: 3,
    assets: 1,
  });
});

test('real repository and object-store exports are equivalent; a fresh database restores without source credentials', async (t) => {
  const source = await setup(t);
  await source.mutate({ type: 'fixture' });
  const web = await source.store.exportCollection(
    source.collectionId,
    'web',
    'web-export',
  );
  const admin = await source.store.exportCollection(
    source.collectionId,
    'admin',
    'admin-export',
  );
  assert.equal(web.packageHash, admin.packageHash);
  const exported = await source.store.readExport(web.id);
  const pkg = JSON.parse(new TextDecoder().decode(exported.bytes));
  const destination = await setup(
    t,
    'actor:destination',
    'collection:destination',
  );
  const loaded = await destination.store.load(destination.collectionId);
  const preview = await destination.store.previewRestore(
    destination.collectionId,
    pkg,
    loaded,
  );
  const restored = await destination.store.commitRestore(
    destination.collectionId,
    preview.id,
  );
  assert.equal(restored.restoredAssetObjects, 1);
  const state = (await destination.store.load(destination.collectionId)).state;
  assert.deepEqual(
    state.harvest,
    pkg.extensions['siteprep:workflow-v1'].harvest,
  );
  assert.equal(
    state.integration.documents[0].versions[0].text,
    pkg.extensions['siteprep:workflow-v1'].integration.documents[0].versions[0]
      .text,
  );
  assert.equal(state.collectionId, destination.collectionId);
  assert.equal(
    (
      await destination.store.commitRestore(
        destination.collectionId,
        preview.id,
      )
    ).duplicate,
    true,
  );
  await assert.rejects(destination.store.readExport(web.id), /unavailable/);
});

test('object-store interruption and commit failure expose no partial restore and retry succeeds once', async (t) => {
  const source = await setup(t);
  await source.mutate({ type: 'fixture' });
  const loaded = await source.store.load(source.collectionId);
  const pkg = await workflowPackage(
    loaded.state,
    loaded.name,
    loaded.createdAt,
  );
  const dest = await setup(t, 'actor:restore', 'collection:restore');
  const preview = await dest.store.previewRestore(
    dest.collectionId,
    pkg,
    await dest.store.load(dest.collectionId),
  );
  dest.files.fail = true;
  await assert.rejects(
    dest.store.commitRestore(dest.collectionId, preview.id),
    /Injected/,
  );
  assert.equal((await dest.store.load(dest.collectionId)).revision, 0);
  dest.files.fail = false;
  dest.db.raw.exec(
    "CREATE TRIGGER fail_workflow BEFORE INSERT ON workflow_snapshot BEGIN SELECT RAISE(ABORT,'Injected commit failure'); END",
  );
  await assert.rejects(
    dest.store.commitRestore(dest.collectionId, preview.id),
    /Injected commit/,
  );
  assert.equal(
    (await dest.store.load(dest.collectionId)).state.harvest.sources.length,
    0,
  );
  dest.db.raw.exec('DROP TRIGGER fail_workflow');
  assert.equal(
    (await dest.store.commitRestore(dest.collectionId, preview.id)).status,
    'completed',
  );
  assert.equal((await dest.store.load(dest.collectionId)).revision, 1);
});

test('stale pages, selection changes, cross-owner access, and AI authority are refused', async (t) => {
  const c = await setup(t);
  const old = await c.store.load(c.collectionId);
  await c.mutate({ type: 'fixture' });
  await assert.rejects(
    c.store.mutate(c.collectionId, {
      ...old,
      operationId: 'stale',
      type: 'create-topic',
      title: 'Stale',
    }),
    /stale/,
  );
  const foreign = workflowStore(c.db, c.files, {
    id: 'actor:other',
    kind: 'human',
    role: 'user',
  });
  await assert.rejects(foreign.load(c.collectionId), /Select an active/);
  await assert.rejects(
    foreign.exportCollection(c.collectionId, 'admin', 'foreign'),
    /Administrator/,
  );
  await assert.rejects(
    applyWorkflowOperation(
      emptyWorkflow('c'),
      { type: 'create-topic', title: 'Unsafe', operationId: 'ai' },
      { id: 'model:test', kind: 'ai' },
    ),
    /human/,
  );
  const snapshot = await c.store.load(c.collectionId);
  c.db.raw.exec(
    'UPDATE actor_state SET selection_revision=selection_revision+1',
  );
  await assert.rejects(
    c.store.mutate(c.collectionId, {
      ...snapshot,
      operationId: 'selection-stale',
      type: 'create-topic',
      title: 'Wrong selection',
    }),
    /stale/,
  );
});

test('corrupt packages and broken evidence refuse before accepting a destination', async (t) => {
  const c = await setup(t);
  await c.mutate({ type: 'fixture' });
  const loaded = await c.store.load(c.collectionId);
  const pkg = await workflowPackage(
    loaded.state,
    loaded.name,
    loaded.createdAt,
  );
  pkg.records.entityVersions[0].content.title = 'Tampered';
  await assert.rejects(validateWorkflowPackage(pkg), /identity_mismatch/);
  const state = structuredClone(loaded.state);
  state.integration.narratives[0].versions[0].sourceVersionIds = [
    'version:missing',
  ];
  const broken = await workflowPackage(state, loaded.name, loaded.createdAt);
  await assert.rejects(validateWorkflowPackage(broken), /original is missing/);
});
