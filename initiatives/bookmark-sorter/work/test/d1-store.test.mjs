import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {D1BookmarkStore} from '../src/d1-store.mjs';
import {ingestBookmarkHtml} from '../src/ingest.mjs';

const fixture = name => readFile(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8');

class FakeStatement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.values = values;
  }

  bind(...values) {
    return new FakeStatement(this.database, this.sql, values);
  }

  async first() {
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
    if (this.sql.startsWith('SELECT id, payload_json FROM triage_actions')) {
      const [collectionId, sessionId] = this.values;
      return [...this.database.actions.values()]
        .filter(action => action.collection_id === collectionId && action.session_id === sessionId && !action.undone_at)
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))[0] ?? null;
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
    if (this.sql.startsWith('SELECT i.id')) {
      const limit = this.values[1];
      const offset = this.values[2];
      const results = [...this.database.items.values()]
        .filter(item => item.collection_id === collectionId)
        .sort((left, right) => (right.added_at || right.ingested_at).localeCompare(left.added_at || left.ingested_at) || left.id.localeCompare(right.id))
        .slice(offset, offset + limit)
        .map(item => ({
          ...item,
          tags_json: JSON.stringify([...this.database.tags.get(item.id) ?? []].sort()),
        }));
      return {results};
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
    throw new Error(`Unexpected run(): ${this.sql}`);
  }
}

class FakeD1Database {
  collections = new Map();
  items = new Map();
  tags = new Map();
  sessions = new Map();
  actions = new Map();
  batches = [];

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async batch(statements) {
    this.batches.push(statements);
    for (const statement of statements) {
      if (statement.sql.startsWith('INSERT INTO items')) {
        const [id, collection_id, url, url_key, title, note, added_at, ingested_at] = statement.values;
        this.items.set(id, {id, collection_id, url, url_key, title, note, added_at, ingested_at, verdict: null, verdict_at: null});
        this.tags.set(id, new Set());
      } else if (statement.sql.startsWith('UPDATE items SET added_at')) {
        const [added_at, note, id, collection_id] = statement.values;
        const current = this.items.get(id);
        assert.equal(current.collection_id, collection_id);
        this.items.set(id, {...current, added_at, note});
      } else if (statement.sql.startsWith('INSERT OR IGNORE INTO tags')) {
        const [itemId, tag] = statement.values;
        this.tags.get(itemId).add(tag);
      } else if (statement.sql.startsWith('UPDATE items SET verdict')) {
        const [verdict, verdict_at, id, collection_id] = statement.values;
        const item = this.items.get(id);
        assert.equal(item.collection_id, collection_id);
        Object.assign(item, {verdict, verdict_at});
      } else if (statement.sql.startsWith('INSERT INTO triage_actions')) {
        const [id, collection_id, session_id, payload_json, created_at] = statement.values;
        this.actions.set(id, {id, collection_id, session_id, payload_json, created_at, undone_at: null});
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
