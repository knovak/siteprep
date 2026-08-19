import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {D1BookmarkStore} from '../src/d1-store.mjs';
import {ingestBookmarkHtml} from '../src/ingest.mjs';
import {readSiteIdentity} from '../src/site-identity.mjs';
import {createPileApp} from '../src/worker.mjs';

const workRoot = fileURLToPath(new URL('../', import.meta.url));
const fixture = name => readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8');

class SqliteD1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return {results: this.database.prepare(this.sql).all(...this.values)};
  }

  async run() {
    return this.database.prepare(this.sql).run(...this.values);
  }
}

class SqliteD1 {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

async function identityDatabase() {
  const database = new DatabaseSync(':memory:');
  for (const migration of ['0001_core.sql', '0002_triage.sql', '0003_captures.sql', '0004_selections.sql', '0005_identity_collections.sql']) {
    database.exec(await readFile(`${workRoot}migrations/${migration}`, 'utf8'));
  }
  return {database, d1: new SqliteD1(database)};
}

test('Sites identity uses the stable id and treats display headers as optional', () => {
  const identity = readSiteIdentity(new Request('https://pile.test/api/collections', {headers: {
    'oai-authenticated-user-id': 'opaque-user-1',
    'oai-authenticated-user-email': 'reader@example.com',
    'oai-authenticated-user-full-name': 'Avery%20Reader',
    'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
  }}));
  assert.deepEqual(identity, {id: 'opaque-user-1', email: 'reader@example.com', fullName: 'Avery Reader'});
  assert.equal(readSiteIdentity(new Request('https://pile.test/')), null);
  assert.equal(readSiteIdentity(new Request('https://pile.test/', {headers: {
    'oai-authenticated-user-id': 'opaque-user-2',
    'oai-authenticated-user-full-name': 'not%20trusted',
  }})).fullName, null);
});

test('API routes reject requests without a Sites identity before touching storage', async () => {
  const app = createPileApp();
  const response = await app.fetch(new Request('https://pile.test/api/collections'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {error: 'Sign in with ChatGPT to continue'});
});

test('two authenticated API sessions cannot address each other’s collection', async () => {
  const {database, d1} = await identityDatabase();
  let sequence = 0;
  const app = createPileApp({
    personalCollectionIdFactory: identity => `personal-${identity.id}`,
    idFactory: prefix => `${prefix}-${++sequence}`,
  });
  const env = {DB: d1};
  const userHeaders = id => ({'oai-authenticated-user-id': id});

  const userA = await (await app.fetch(new Request('https://pile.test/api/collections', {
    headers: userHeaders('user-a'),
  }), env)).json();
  assert.deepEqual(userA.collections.map(collection => collection.id), ['personal-user-a']);

  const form = new FormData();
  form.append('source', 'test');
  form.append('file', new Blob([await fixture('export-small.html')], {type: 'text/html'}), 'bookmarks.html');
  const imported = await app.fetch(new Request('https://pile.test/api/import', {
    method: 'POST',
    headers: {...userHeaders('user-a'), 'x-bookmark-collection-id': 'personal-user-a'},
    body: form,
  }), env);
  assert.equal(imported.status, 201);

  const userB = await (await app.fetch(new Request('https://pile.test/api/collections', {
    headers: userHeaders('user-b'),
  }), env)).json();
  assert.deepEqual(userB.collections.map(collection => collection.id), ['personal-user-b']);

  for (const path of ['/api/items', '/api/selection', '/api/export']) {
    const response = await app.fetch(new Request(`https://pile.test${path}`, {
      headers: {...userHeaders('user-b'), 'x-bookmark-collection-id': 'personal-user-a'},
    }), env);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Unknown collection/);
  }
  database.close();
});

test('owner collections isolate two users while templates copy privately and captures stay shared', async () => {
  const {database, d1} = await identityDatabase();
  const admin = new D1BookmarkStore(d1, {ownerId: 'user-a'});
  const tester = new D1BookmarkStore(d1, {ownerId: 'user-b'});
  await admin.ensureUser();
  database.prepare('UPDATE app_users SET can_edit_templates = 1 WHERE owner_id = ?').run('user-a');
  await tester.ensureUser();

  await admin.ensurePersonalCollection({id: 'personal-a', createdAt: '2026-08-19T00:00:00Z'});
  await tester.ensurePersonalCollection({id: 'personal-b', createdAt: '2026-08-19T00:00:00Z'});
  const template = await admin.ensureCollection({
    id: 'template-one', name: 'Starter pile', kind: 'demo-template', createdAt: '2026-08-19T00:00:00Z',
  });
  await ingestBookmarkHtml({
    store: admin,
    collectionId: template.id,
    html: await fixture('export-small.html'),
    source: 'template',
    ingestedAt: '2026-08-19T00:00:00Z',
  });
  const templateItem = (await admin.listAllItems(template.id))[0];
  await admin.upsertCapture({
    url_key: templateItem.url_key, image_ref: 'capture/shared.webp', source: 'og', captured_at: '2026-08-19T00:00:00Z',
    image_hash: 'shared-hash', state: 'pass1-ready', page_title: templateItem.title, description: null,
    favicon_url: null, error_tag: null, image_candidate: 'og:image', content_type: 'image/webp', width: 300,
    height: 180, byte_size: 100,
  });

  assert.deepEqual((await tester.listTemplates()).map(value => value.id), ['template-one']);
  assert.equal(await tester.countItems(template.id), 3, 'templates are the only cross-owner readable collection');
  await assert.rejects(
    tester.ingestCandidates(template.id, []),
    /read-only collection/,
  );

  const copy = await tester.copyTemplate(template.id, {
    id: 'copy-one', copiedAt: '2026-08-19T01:00:00Z', createdAt: '2026-08-19T01:00:00Z',
  });
  assert.equal(copy.owner_id, 'user-b');
  assert.equal(copy.kind, 'demo-copy');
  assert.equal(copy.template_id, template.id);
  assert.equal(await tester.countItems(copy.id), 3);
  assert.equal((await tester.listAllItems(copy.id))[0].capture.image_ref, 'capture/shared.webp');
  assert.equal(await admin.hasCollection(copy.id), false);
  await assert.rejects(admin.countItems(copy.id), /Unknown collection/);

  await admin.renameCollection(template.id, 'Starter pile revised');
  assert.equal((await tester.ownedCollection(copy.id)).name, 'Starter pile copy', 'an existing copy does not sync');
  const fresh = await tester.copyTemplate(template.id, {
    id: 'copy-two', copiedAt: '2026-08-19T02:00:00Z', createdAt: '2026-08-19T02:00:00Z',
  });
  assert.notEqual(fresh.id, copy.id);
  assert.notEqual(fresh.name, copy.name);

  await tester.deleteDemoCopy(copy.id);
  assert.equal(await tester.hasCollection(copy.id), false);
  assert.equal((await tester.getCapture(templateItem.url_key)).image_ref, 'capture/shared.webp');

  const itemForeignKeys = database.prepare("PRAGMA foreign_key_list('items')").all();
  assert.deepEqual(itemForeignKeys.map(row => row.table), ['collections']);
  database.close();
});
