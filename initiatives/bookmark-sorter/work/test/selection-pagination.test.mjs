import assert from 'node:assert/strict';
import {test} from 'node:test';
import {D1BookmarkStore} from '../src/d1-store.mjs';
import {evaluateSelection} from '../src/selections.mjs';
import {pageCursor} from '../src/selection-sql.mjs';
import {createPileApp} from '../src/worker.mjs';
import {sqliteStoreDatabase} from './sqlite-d1.mjs';

async function pile(count = 90) {
  const fixture = await sqliteStoreDatabase();
  const {database, d1} = fixture;
  const store = new D1BookmarkStore(d1, {ownerId: 'tester', ownerEmail: 'krnovak@gmail.com'});
  await store.ensurePersonalCollection({id: 'pile'});
  database.exec('BEGIN');
  for (let n = 0; n < count; n++) {
    const id = `item-${String(n).padStart(5, '0')}`;
    database.prepare(`INSERT INTO items (id,collection_id,url,url_key,title,title_key,added_at,ingested_at)
      VALUES (?, 'pile', ?, ?, ?, ?, ?, ?)`).run(id, `https://www.example${n % 3}.test/${n}`, `https://example${n % 3}.test/${n}`,
      n % 2 ? 'Café Art / Music' : 'Other title', n % 2 ? 'cafe-art-music' : '', n % 2 ? null : '2026-09-07', '2026-09-07');
    for (const tag of ['src:Safari Reading', n % 2 ? 'folder:Art / Music' : 'folder:Other', 'topic:Modern Art']) {
      database.prepare('INSERT INTO tags VALUES (?, ?)').run(id, tag);
    }
  }
  database.exec('COMMIT');
  fixture.queries.length = 0;
  return {...fixture, store};
}

test('SQL pages hydrate at most 48 cards from a 6,001-item pile, and use the ordering index', async t => {
  const {database, store, queries} = await pile(6001);
  t.after(() => database.close());
  store.listAllItems = () => { throw new Error('Full collection hydration is forbidden'); };
  const first = await store.selectionWindow('pile', {limit: 48});
  assert.equal(first.items.length, 48);
  assert.equal(first.total, 6001);
  assert.equal(first.backlog, 6001);
  const cards = queries.filter(query => query.sql.includes('AS tags_json'));
  assert.equal(cards.length, 1);
  assert.equal(cards[0].rows, 48);
  const plan = database.prepare('EXPLAIN QUERY PLAN ' + cards[0].sql).all(...cards[0].values);
  assert.ok(plan.some(row => row.detail.includes('idx_items_collection_page')));
  const next = await store.selectionWindow('pile', {limit: 48, after: pageCursor(first.items[35])});
  assert.equal(next.offset, 36);
  assert.equal(next.items[0].id, 'item-00036');
  queries.length = 0;
  const counts = await store.selectionWindow('pile', {countsOnly: true, expression: 'verdict:untriaged'});
  assert.equal(counts.total, 6001);
  assert.deepEqual(counts.items, []);
  assert.ok(queries.every(query => !query.sql.includes('AS tags_json')));
});

test('SQL selection grammar matches the existing evaluator, including normalized and literal tags', async t => {
  const {database, store} = await pile(15);
  t.after(() => database.close());
  database.exec(`UPDATE items SET verdict = 'keeper' WHERE id = 'item-00001';
    UPDATE items SET verdict = 'needs-more-time' WHERE id = 'item-00002';
    UPDATE items SET verdict = 'junk' WHERE id = 'item-00003';
    INSERT INTO tags VALUES ('item-00001', 'verdict:untriaged');
    INSERT INTO tags VALUES ('item-00002', 'a_%quote''s');
    INSERT INTO captures (url_key, source, state, image_ref) VALUES ('https://example0.test/0', 'og', 'pass1-ready', 'image');
    INSERT INTO captures (url_key, source, state, error_tag) VALUES ('https://example1.test/1', 'none', 'pass1-error', 'err:404');`);
  const all = await store.listAllItems('pile');
  for (const expression of ['', 'verdict:*', 'verdict:untriaged', 'not verdict:keep',
    '(verdict:keep or verdict:needs-time) and topic:modern-art', 'src:safari-reading', 'folder:art-music',
    'folder:*art*', 'topic:*art*', 'folder-key:Art%20%2F%20Music', 'tag-key:src%3ASafari%20Reading',
    'title:cafe*', 'title:*art*', 'title:other-title', 'site:example1.test', 'site:*example*',
    'image:present', 'image:failed', 'not image:present', 'collection:pile', 'not collection:other',
    '*art*', 's*', 'not missing', "a_%quote's", Array.from({length: 120}, (_, n) => 'tag' + n).join(' or ')]) {
    const expected = evaluateSelection(all, expression, {collectionId: 'pile'}).map(item => item.id);
    const actual = await store.selectionWindow('pile', {expression});
    assert.deepEqual(actual.items.map(item => item.id), expected, expression);
    assert.equal(actual.total, expected.length, expression);
  }
  await assert.rejects(store.selectionWindow('pile', {expression: 'title:**'}), /Wildcards/);
  const stranger = new D1BookmarkStore(store.db, {ownerId: 'stranger'});
  await assert.rejects(stranger.selectionWindow('pile', {}), /Unknown collection/);
});

test('sweeping an untriaged page keeps its prefetched successor and accurate counts after deletion from the selection', async t => {
  const {database, store} = await pile();
  t.after(() => database.close());
  const session = await store.startSession('pile', {id: 'sitting', startedAt: '2026-09-07'});
  const expression = 'verdict:untriaged and folder:art-music';
  const first = await store.selectionWindow('pile', {expression, limit: 36});
  const after = pageCursor(first.items[35]);
  const prefetched = await store.selectionWindow('pile', {expression, limit: 36, after});
  await store.applyVerdict('pile', {sessionId: session.id, actionId: 'sweep', verdict: 'keeper', at: '2026-09-07', itemIds: first.items.map(item => item.id)});
  const next = await store.selectionWindow('pile', {expression, limit: 36, after});
  assert.deepEqual(next.items.map(item => item.id), prefetched.items.map(item => item.id));
  assert.equal(next.total, 9);
  assert.equal(next.offset, 0);
  await store.undoLast('pile', {sessionId: session.id, at: '2026-09-07'});
  assert.equal((await store.selectionWindow('pile', {expression, countsOnly: true})).total, 45);
});

test('selection API can omit capture statistics and sweep returns counts without another card read', async t => {
  const {database, store, queries} = await pile();
  t.after(() => database.close());
  let captureStats = 0;
  const app = createPileApp({storeFactory: () => store, identityFromRequest: () => ({id: 'tester', email: 'krnovak@gmail.com'}),
    personalCollectionIdFactory: () => 'pile', captureFactory: () => ({status() { captureStats++; return {total: 0}; }})});
  const request = (path, body) => app.fetch(new Request('https://pile.test' + path, body ? {method: 'POST',
    headers: {'content-type': 'application/json'}, body: JSON.stringify(body)} : {}));
  const session = await (await request('/api/session', {action: 'start'})).json();
  const page = await (await request('/api/selection?limit=48&include_captures=0')).json();
  queries.length = 0;
  const result = await (await request('/api/verdict', {session_id: session.id, item_ids: page.items.slice(0, 36).map(item => item.id),
    verdict: 'keeper', selection: {expression: 'verdict:untriaged', after: pageCursor(page.items[35])}})).json();
  assert.equal(result.selection.total, 54);
  assert.equal(result.selection.cursor_offset, 0);
  assert.equal(captureStats, 0);
  assert.ok(queries.every(query => !query.sql.includes('AS tags_json')));
});
