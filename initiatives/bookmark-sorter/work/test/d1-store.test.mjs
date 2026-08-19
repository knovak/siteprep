import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {D1BookmarkStore} from '../src/d1-store.mjs';
import {ingestBookmarkHtml} from '../src/ingest.mjs';
import {importExportDocument} from '../src/round-trip.mjs';

const fixture = name => readFile(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8');

class FakeStatement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.values = values;
  }

  bind(...values) {
    this.database.boundParameterCounts.push(values.length);
    return new FakeStatement(this.database, this.sql, values);
  }

  async first() {
    if (this.sql.startsWith('SELECT c.id') && this.sql.includes('FROM collections c')) {
      const row = this.database.collections.get(this.values[0]);
      if (!row) return null;
      const ownerMatches = this.sql.includes('c.owner_id IS NULL')
        ? row.owner_id === null
        : !this.sql.includes('c.owner_id = ?') || row.owner_id === this.values[1];
      if (!ownerMatches && !(this.sql.includes("OR c.kind = 'demo-template'") && row.kind === 'demo-template')) return null;
      return {...row};
    }
    if (this.sql.startsWith('SELECT id FROM collections')) {
      const row = this.database.collections.get(this.values[0]);
      if (!row) return null;
      if (this.sql.includes('owner_id IS NULL') && row.owner_id !== null) return null;
      if (this.sql.includes('owner_id = ?') && row.owner_id !== this.values[1]) return null;
      return {id: row.id};
    }
    if (this.sql.startsWith('SELECT id, collection_id, started_at')) {
      const session = this.database.sessions.get(this.values[0]);
      return session?.collection_id === this.values[1] ? {...session} : null;
    }
    if (this.sql.startsWith('SELECT id, action_kind, payload_json FROM triage_actions')) {
      const [collectionId, sessionId] = this.values;
      return [...this.database.actions.values()]
        .filter(action => action.collection_id === collectionId && action.session_id === sessionId && !action.undone_at)
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))[0] ?? null;
    }
    if (this.sql.startsWith('SELECT url_key, image_ref')) {
      const capture = this.database.captures.get(this.values[0]);
      return capture ? {...capture} : null;
    }
    if (this.sql.startsWith('SELECT id, name, collection_id, expression FROM selections')) {
      const selection = this.database.selections.get(this.values[0]);
      return selection?.collection_id === this.values[1] ? {...selection} : null;
    }
    throw new Error(`Unexpected first(): ${this.sql}`);
  }

  async all() {
    const collectionId = this.values[0];
    if (this.sql.startsWith('SELECT id, url, url_key')) {
      return {results: [...this.database.items.values()].filter(item => item.collection_id === collectionId)};
    }
    if (this.sql.startsWith('SELECT COUNT(*)')) {
      const count = [...this.database.items.values()].filter(item =>
        item.collection_id === collectionId && (!this.sql.includes('verdict IS NULL') || item.verdict === null),
      ).length;
      return {results: [{count}]};
    }
    if (this.sql.startsWith('SELECT id, verdict, verdict_at FROM items')) {
      const ids = new Set(this.values.slice(1));
      return {results: [...this.database.items.values()].filter(item => item.collection_id === collectionId && ids.has(item.id)).map(({id, verdict, verdict_at}) => ({id, verdict, verdict_at}))};
    }
    if (this.sql.startsWith('SELECT i.id, t.tag FROM items')) {
      const ids = new Set(this.values.slice(1));
      const results = [];
      for (const item of this.database.items.values()) {
        if (item.collection_id !== collectionId || !ids.has(item.id)) continue;
        const tags = [...this.database.tags.get(item.id)];
        if (!tags.length) results.push({id: item.id, tag: null});
        else for (const tag of tags) results.push({id: item.id, tag});
      }
      return {results};
    }
    if (this.sql.startsWith('SELECT i.id')) {
      const limit = this.values[1];
      const offset = this.values[2];
      const results = [...this.database.items.values()]
        .filter(item => item.collection_id === collectionId)
        .sort((left, right) => (right.added_at || right.ingested_at).localeCompare(left.added_at || left.ingested_at) || left.id.localeCompare(right.id))
        .slice(offset, offset + limit)
        .map(item => ({
          ...item,
          capture_image_ref: this.database.captures.get(item.url_key)?.image_ref ?? null,
          capture_source: this.database.captures.get(item.url_key)?.source ?? null,
          capture_state: this.database.captures.get(item.url_key)?.state ?? null,
          capture_error_tag: this.database.captures.get(item.url_key)?.error_tag ?? null,
          capture_page_title: this.database.captures.get(item.url_key)?.page_title ?? null,
          capture_description: this.database.captures.get(item.url_key)?.description ?? null,
          capture_displayable: 1,
          tags_json: JSON.stringify([...this.database.tags.get(item.id) ?? []].sort()),
        }));
      return {results};
    }
    if (this.sql.startsWith('SELECT id, name, collection_id, expression FROM selections')) {
      return {results: [...this.database.selections.values()].filter(selection => selection.collection_id === collectionId)};
    }
    throw new Error(`Unexpected all(): ${this.sql}`);
  }

  async run() {
    if (this.sql.startsWith('INSERT OR IGNORE INTO collections')) {
      const [id, name, owner_id, kind, created_at] = this.values;
      if (!this.database.collections.has(id)) this.database.collections.set(id, {id, name, owner_id, kind, created_at});
      return {success: true};
    }
    if (this.sql.startsWith('INSERT INTO triage_sessions')) {
      const [id, collection_id, started_at] = this.values;
      this.database.sessions.set(id, {id, collection_id, started_at, ended_at: null, items_judged: 0, elapsed_ms: null});
      return {success: true};
    }
    if (this.sql.startsWith('UPDATE triage_sessions SET ended_at')) {
      const [ended_at, elapsed_ms, id, collection_id] = this.values;
      const session = this.database.sessions.get(id);
      assert.equal(session.collection_id, collection_id);
      Object.assign(session, {ended_at, elapsed_ms});
      return {success: true};
    }
    if (this.sql.startsWith('INSERT INTO captures')) {
      const [url_key, image_ref, source, captured_at, image_hash, state, page_title, description, favicon_url, error_tag, image_candidate, content_type, width, height, byte_size] = this.values;
      this.database.captures.set(url_key, {url_key, image_ref, source, captured_at, image_hash, state, page_title, description, favicon_url, error_tag, image_candidate, content_type, width, height, byte_size});
      return {success: true};
    }
    if (this.sql.startsWith('INSERT INTO selections')) {
      const [id, name, collection_id, expression] = this.values;
      this.database.selections.set(id, {id, name, collection_id, expression});
      return {success: true};
    }
    if (this.sql.startsWith('INSERT OR IGNORE INTO tags (item_id, tag) SELECT id')) {
      const [tag, collectionId, urlKey] = this.values;
      for (const item of this.database.items.values()) {
        if (item.collection_id === collectionId && item.url_key === urlKey) this.database.tags.get(item.id).add(tag);
      }
      return {success: true};
    }
    if (this.sql.startsWith('INSERT OR IGNORE INTO tags (item_id, tag) SELECT i.id')) {
      const [collectionId, ...urlKeys] = this.values;
      const keys = new Set(urlKeys);
      for (const item of this.database.items.values()) {
        const errorTag = this.database.captures.get(item.url_key)?.error_tag;
        if (item.collection_id === collectionId && keys.has(item.url_key) && errorTag) this.database.tags.get(item.id).add(errorTag);
      }
      return {success: true};
    }
    throw new Error(`Unexpected run(): ${this.sql}`);
  }
}

class FakeD1Database {
  collections = new Map();
  items = new Map();
  tags = new Map();
  sessions = new Map();
  actions = new Map();
  captures = new Map();
  selections = new Map();
  batches = [];
  boundParameterCounts = [];

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async batch(statements) {
    this.batches.push(statements);
    for (const statement of statements) {
      if (statement.sql.startsWith('INSERT INTO items')) {
        const [id, collection_id, url, url_key, title, title_key, note, added_at, ingested_at, verdict, verdict_at] = statement.values;
        this.items.set(id, {id, collection_id, url, url_key, title, title_key, note, added_at, ingested_at, verdict, verdict_at});
        this.tags.set(id, new Set());
      } else if (statement.sql.startsWith('UPDATE items SET added_at')) {
        const [added_at, note, title_key, verdict, verdict_at, id, collection_id] = statement.values;
        const current = this.items.get(id);
        assert.equal(current.collection_id, collection_id);
        this.items.set(id, {...current, added_at, note, title_key, verdict, verdict_at});
      } else if (statement.sql.startsWith('INSERT OR IGNORE INTO tags') && !statement.sql.includes('SELECT id')) {
        const [itemId, tag] = statement.values;
        this.tags.get(itemId).add(tag);
      } else if (statement.sql.startsWith('INSERT OR IGNORE INTO tags') && statement.sql.includes('SELECT id')) {
        const [tag, collectionId, ...ids] = statement.values;
        for (const id of ids) if (this.items.get(id)?.collection_id === collectionId) this.tags.get(id).add(tag);
      } else if (statement.sql.startsWith('UPDATE items SET verdict')) {
        if (statement.sql.includes('id IN')) {
          const [verdict, verdict_at, collection_id, ...ids] = statement.values;
          for (const id of ids) {
            const item = this.items.get(id); assert.equal(item.collection_id, collection_id); Object.assign(item, {verdict, verdict_at});
          }
        } else {
          const [verdict, verdict_at, id, collection_id] = statement.values;
          const item = this.items.get(id); assert.equal(item.collection_id, collection_id); Object.assign(item, {verdict, verdict_at});
        }
      } else if (statement.sql.startsWith('INSERT INTO triage_actions')) {
        const [id, collection_id, session_id, payload_json, created_at] = statement.values;
        const action_kind = statement.sql.includes("'tag-apply'") ? 'tag-apply' : 'verdict';
        this.actions.set(id, {id, collection_id, session_id, action_kind, payload_json, created_at, undone_at: null});
      } else if (statement.sql.startsWith('DELETE FROM tags')) {
        const [itemId, tag] = statement.values;
        this.tags.get(itemId).delete(tag);
      } else if (statement.sql.startsWith('UPDATE triage_sessions SET items_judged = items_judged +')) {
        const [amount, id, collection_id] = statement.values;
        const session = this.sessions.get(id);
        assert.equal(session.collection_id, collection_id);
        session.items_judged += amount;
      } else if (statement.sql.startsWith('UPDATE triage_actions SET undone_at')) {
        const [undone_at, id, collection_id] = statement.values;
        const action = this.actions.get(id);
        assert.equal(action.collection_id, collection_id);
        action.undone_at = undone_at;
      } else if (statement.sql.startsWith('UPDATE triage_sessions SET items_judged = MAX')) {
        const [amount, id, collection_id] = statement.values;
        const session = this.sessions.get(id);
        assert.equal(session.collection_id, collection_id);
        session.items_judged = Math.max(0, session.items_judged - amount);
      } else {
        throw new Error(`Unexpected batch statement: ${statement.sql}`);
      }
    }
    return statements.map(() => ({success: true}));
  }
}

test('D1 adapter creates an owner-scoped collection and imports idempotently in batches', async () => {
  const database = new FakeD1Database();
  let sequence = 0;
  const store = new D1BookmarkStore(database, {batchSize: 4, idFactory: () => `d1-${++sequence}`});
  await store.ensureCollection({id: 'pile', name: 'Pile', createdAt: '2026-08-18T00:00:00Z'});

  const html = await fixture('export-small.html');
  const first = await ingestBookmarkHtml({store, collectionId: 'pile', html, source: 'chrome-export', ingestedAt: '2026-08-18'});
  assert.deepEqual(first, {parsed: 4, added: 3, merged: 1, total: 3});
  assert.ok(database.batches.length > 1, 'statements are chunked rather than sent as one unbounded D1 batch');

  const second = await ingestBookmarkHtml({store, collectionId: 'pile', html, source: 'chrome-export', ingestedAt: '2026-08-18'});
  assert.deepEqual(second, {parsed: 4, added: 0, merged: 4, total: 3});
  assert.equal(await store.countItems('pile'), 3);

  const items = await store.listItems('pile');
  const guide = items.find(item => item.url_key === 'https://example.com/guide');
  assert.deepEqual(guide.tags, ['folder:Reading & research/Rust', 'in:2026-08-18', 'src:chrome-export']);
});

test('D1 portable import carries judgement and preserves it on a conflicting re-import', async () => {
  const database = new FakeD1Database();
  let sequence = 0;
  const store = new D1BookmarkStore(database, {batchSize: 4, idFactory: () => `portable-${++sequence}`});
  await store.ensureCollection({id: 'pile', name: 'Pile', createdAt: '2026-08-18T00:00:00Z'});
  const document = JSON.parse(await fixture('export-v1.json'));
  const first = await importExportDocument({store, collectionId: 'pile', document, importedAt: '2026-08-19T00:00:00Z'});
  assert.deepEqual(first, {parsed: 1, added: 1, merged: 0, total: 1});
  const item = (await store.listAllItems('pile'))[0];
  assert.equal(item.verdict, 'keeper');
  assert.equal(item.note, 'A note from a file the importer did not write.');
  assert.deepEqual(item.tags, ['src:hand-written', 'topic:portable']);

  document.items[0].note = 'Conflicting later note';
  document.items[0].verdict = 'archive';
  document.items[0].verdict_at = '2026-08-20T00:00:00Z';
  await importExportDocument({store, collectionId: 'pile', document, importedAt: '2026-08-20T00:00:00Z'});
  const preserved = (await store.listAllItems('pile'))[0];
  assert.equal(preserved.verdict, 'keeper');
  assert.equal(preserved.note, 'A note from a file the importer did not write.');
});

test('D1 collection ownership is enforced by every entry point', async () => {
  const database = new FakeD1Database();
  database.collections.set('private', {id: 'private', owner_id: 'someone-else'});
  const store = new D1BookmarkStore(database, {ownerId: 'owner-1'});
  assert.equal(await store.hasCollection('private'), false);
  await assert.rejects(store.countItems('private'), /Unknown collection/);
});

test('D1 verdict actions update the backlog and undo a marked set atomically', async () => {
  const database = new FakeD1Database();
  let sequence = 0;
  const store = new D1BookmarkStore(database, {batchSize: 4, idFactory: () => `d1-${++sequence}`});
  await store.ensureCollection({id: 'pile', name: 'Pile', createdAt: '2026-08-18T00:00:00Z'});
  await ingestBookmarkHtml({store, collectionId: 'pile', html: await fixture('export-small.html'), source: 'chrome-export', ingestedAt: '2026-08-18'});
  const ids = (await store.listItems('pile')).map(item => item.id);
  const session = await store.startSession('pile', {id: 'session-1', startedAt: '2026-08-18T12:00:00Z'});

  const applied = await store.applyVerdict('pile', {
    itemIds: ids.slice(0, 2), verdict: 'keeper', at: '2026-08-18T12:01:00Z', sessionId: session.id, actionId: 'action-1',
  });
  assert.equal(applied.backlog, 1);
  assert.equal(applied.session.items_judged, 2);
  assert.equal(database.actions.size, 1);

  const undone = await store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:02:00Z'});
  assert.equal(undone.changes.length, 2);
  assert.equal(undone.backlog, 3);
  assert.equal(undone.session.items_judged, 0);
  assert.ok([...database.items.values()].every(item => item.verdict === null));

  const finished = await store.finishSession('pile', {sessionId: session.id, endedAt: '2026-08-18T12:03:00Z'});
  assert.equal(finished.elapsed_ms, 180000);
});

test('D1 saved selections and additive tag actions round-trip and undo only their additions', async () => {
  const database = new FakeD1Database();
  let sequence = 0;
  const store = new D1BookmarkStore(database, {batchSize: 4, idFactory: () => `d1-${++sequence}`});
  await store.ensureCollection({id: 'pile', name: 'Pile', createdAt: '2026-08-18T00:00:00Z'});
  await ingestBookmarkHtml({store, collectionId: 'pile', html: await fixture('export-small.html'), source: 'chrome-export', ingestedAt: '2026-08-18'});
  const items = await store.listItems('pile');
  const selection = await store.saveSelection('pile', {id: 'selection-1', name: 'Examples', expression: 'site:example.com'});
  assert.equal(selection.expression, 'site:example.com');
  assert.deepEqual((await store.listSelections('pile')).map(value => value.id), ['selection-1']);

  const session = await store.startSession('pile', {id: 'session-tags', startedAt: '2026-08-18T12:00:00Z'});
  const changed = await store.applyTags('pile', {
    itemIds: items.slice(0, 2).map(item => item.id), tags: ['src:chrome-export', 'cluster:examples'],
    at: '2026-08-18T12:01:00Z', sessionId: session.id, actionId: 'tag-action',
  });
  assert.equal(changed.changes.length, 2);
  assert.ok((await store.listItems('pile')).slice(0, 2).every(item => item.tags.includes('cluster:examples')));
  const undone = await store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:02:00Z'});
  assert.equal(undone.kind, 'tag-apply');
  assert.ok((await store.listItems('pile')).every(item => !item.tags.includes('cluster:examples')));
  assert.ok((await store.listItems('pile')).every(item => item.tags.includes('src:chrome-export')));
});

test('D1 capture errors stay collection-local and attach from the shared cache on later ingestion', async () => {
  const database = new FakeD1Database();
  let sequence = 0;
  const store = new D1BookmarkStore(database, {idFactory: () => `d1-${++sequence}`});
  await store.ensureCollection({id: 'alpha', name: 'Alpha', createdAt: '2026-08-18T00:00:00Z'});
  await store.ensureCollection({id: 'beta', name: 'Beta', createdAt: '2026-08-18T00:00:00Z'});
  const html = await fixture('export-small.html');
  await ingestBookmarkHtml({store, collectionId: 'alpha', html, source: 'test', ingestedAt: '2026-08-18'});
  await ingestBookmarkHtml({store, collectionId: 'beta', html, source: 'test', ingestedAt: '2026-08-18'});
  const urlKey = 'https://example.com/guide';
  await store.upsertCapture({
    url_key: urlKey, image_ref: null, source: 'none', captured_at: '2026-08-18T12:00:00Z', image_hash: null,
    state: 'pass1-error', page_title: null, description: null, favicon_url: null, error_tag: 'err:404',
    image_candidate: null, content_type: null, width: null, height: null, byte_size: null,
  });
  await store.applyCaptureError('alpha', urlKey, 'err:404');
  assert.ok((await store.listItems('alpha')).find(item => item.url_key === urlKey).tags.includes('err:404'));
  assert.ok(!(await store.listItems('beta')).find(item => item.url_key === urlKey).tags.includes('err:404'));
  await store.applyKnownCaptureErrors('beta', [urlKey]);
  assert.ok((await store.listItems('beta')).find(item => item.url_key === urlKey).tags.includes('err:404'));
});

test('D1 capture-error lookup reserves a binding for the collection id', async () => {
  const database = new FakeD1Database();
  const store = new D1BookmarkStore(database);
  await store.ensureCollection({id: 'pile', name: 'Pile', createdAt: '2026-08-19T00:00:00Z'});
  database.boundParameterCounts.length = 0;

  const urlKeys = Array.from({length: 205}, (_, index) => `https://example.com/${index}`);
  await store.applyKnownCaptureErrors('pile', urlKeys);

  assert.deepEqual(database.boundParameterCounts.filter(count => count > 2), [100, 100, 8]);
  assert.ok(database.boundParameterCounts.every(count => count <= 100));
});
