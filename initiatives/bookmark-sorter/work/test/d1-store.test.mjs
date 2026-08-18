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
    throw new Error(`Unexpected first(): ${this.sql}`);
  }

  async all() {
    const collectionId = this.values[0];
    if (this.sql.startsWith('SELECT id, url, url_key')) {
      return {results: [...this.database.items.values()].filter(item => item.collection_id === collectionId)};
    }
    if (this.sql.startsWith('SELECT COUNT(*)')) {
      const count = [...this.database.items.values()].filter(item => item.collection_id === collectionId).length;
      return {results: [{count}]};
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
    throw new Error(`Unexpected run(): ${this.sql}`);
  }
}

class FakeD1Database {
  collections = new Map();
  items = new Map();
  tags = new Map();
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
      } else if (statement.sql.startsWith('UPDATE items')) {
        const [added_at, note, id, collection_id] = statement.values;
        const current = this.items.get(id);
        assert.equal(current.collection_id, collection_id);
        this.items.set(id, {...current, added_at, note});
      } else if (statement.sql.startsWith('INSERT OR IGNORE INTO tags')) {
        const [itemId, tag] = statement.values;
        this.tags.get(itemId).add(tag);
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
