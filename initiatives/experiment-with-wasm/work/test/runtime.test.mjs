import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import initSqlJs from 'sql.js';
import {createRuntime, validateDatabase} from '../src/runtime.mjs';
import {evaluateSelection} from '../src/selections.mjs';

const SQL = await initSqlJs();
const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
class Persistence {
  value = null; fail = false;
  async read() { return structuredClone(this.value); }
  async save(bytes, revision) {
    if (this.fail) throw new Error('Quota exceeded');
    if ((this.value?.revision ?? 0) !== revision) throw new Error('Another window saved changes');
    this.value = {bytes: bytes.slice(), revision: revision + 1};
    return revision + 1;
  }
}
async function setup(persistence = new Persistence()) {
  const runtime = await createRuntime({SQL, schema, persistence});
  const call = async (path, body, collection = 'personal') => {
    const response = await runtime.request(path, {headers: {'content-type': 'application/json', 'x-bookmark-collection-id': collection}, ...(body ? {method: 'POST', body: JSON.stringify(body)} : {})});
    const data = await response.json(); assert.equal(response.ok, true, JSON.stringify(data)); return data;
  };
  const importItems = items => call('/api/import-json', {format: 'bookmark-sorter/v1', items});
  return {runtime, persistence, call, importItems};
}
const records = [
  {url: 'https://example.org/a?utm_source=mail', title: 'Modern Art — Café', tags: ['Topic:Modern Art', 'src:safari', 'folder:Reading/Art'], verdict: 'keeper'},
  {url: 'https://example.org/b', title: 'Tide research', tags: ['topic:ocean', 'src:chrome'], verdict: null},
  {url: 'https://other.org/c', title: 'Ancient architecture', tags: ['topic:history'], verdict: 'archive'},
];

test('real WASM SQL preserves import, deduplication, Unicode/boolean selection and round trip', async () => {
  const {runtime, call, importItems} = await setup();
  assert.equal((await importItems(records)).added, 3);
  assert.equal((await importItems([{...records[0], url: 'https://example.org/a?utm_source=other', tags: ['new-tag']}])).merged, 1);
  const all = await runtime.store.listAllItems('personal');
  for (const expression of ['', 'verdict:*', 'not verdict:*', 'verdict:untriaged', 'site:example.org', 'topic:*art*', 'title:modern-art*', 'title:*café*', 'folder:*reading*', 'src:saf*', '(topic:*art* or topic:history) and not verdict:junk', 'image:none']) {
    const actual = await call('/api/selection?expression=' + encodeURIComponent(expression));
    const expected = evaluateSelection(all, expression, {collectionId: 'personal'});
    assert.deepEqual(actual.items.map(i => i.id).sort(), expected.map(i => i.id).sort(), expression);
    assert.equal(actual.total, expected.length);
  }
  const exported = await call('/api/export');
  assert.equal(exported.format, 'bookmark-sorter/v1');
  const clone = await setup(); await clone.call('/api/import-json', exported);
  assert.deepEqual((await clone.call('/api/export')).items.sort((a,b) => a.url.localeCompare(b.url)), exported.items.sort((a,b) => a.url.localeCompare(b.url)));
  assert.ok(runtime.diagnostics().statements > 50);
});

test('verdicts, tags, removal, undo, sitting reports and history survive database reload', async () => {
  const {runtime, persistence, call, importItems} = await setup(); await importItems(records);
  const item = (await call('/api/selection?expression=verdict:untriaged')).items[0];
  const session = await call('/api/session', {action: 'start'});
  await call('/api/verdict', {session_id: session.id, item_ids: [item.id], verdict: 'junk'});
  assert.equal((await call('/api/selection?expression=verdict:junk')).total, 1);
  await call('/api/undo', {session_id: session.id});
  assert.equal((await call('/api/selection?expression=verdict:untriaged')).total, 1);
  await call('/api/tag', {session_id: session.id, item_ids: [item.id], tags: ['topic:water']});
  await call('/api/tag', {session_id: session.id, item_ids: [item.id], tags: ['topic:water'], mode: 'remove'});
  assert.equal((await call('/api/selection?expression=topic:water')).total, 0);
  await call('/api/undo', {session_id: session.id});
  await call('/api/selections', {name: 'Water', expression: 'topic:water'});
  await call('/api/selection-history', {expression: 'topic:water'});
  await call('/api/session', {action: 'finish', session_id: session.id});
  const reopened = await setup(persistence);
  assert.equal((await reopened.call('/api/selection?expression=topic:water')).total, 1);
  assert.equal((await reopened.call('/api/selections')).selections[0].name, 'Water');
  assert.equal((await reopened.call('/api/selection-history')).selections[0].expression, 'topic:water');
  assert.equal((await reopened.call('/api/session')).actions.length, 3);
  assert.ok(runtime.diagnostics().revision > 5);
});

test('invalid imports and mid-batch SQL errors roll back; persistence failure never reports success', async () => {
  const {runtime, persistence, call, importItems} = await setup(); await importItems(records);
  for (const url of ['javascript:alert(1)', 'data:text/html,Hi', 'file:///tmp/private']) {
    const bad = await runtime.request('/api/import-json', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({format: 'bookmark-sorter/v1', items: [{url, tags: []}]})});
    assert.equal(bad.ok, false);
  }
  await assert.rejects(runtime.binding.batch([
    runtime.binding.prepare("UPDATE items SET title = 'changed'"),
    runtime.binding.prepare('INSERT INTO missing_table VALUES (1)'),
  ]));
  assert.equal((await call('/api/export')).items.some(i => i.title === 'changed'), false);
  persistence.fail = true;
  const result = await runtime.request('/api/collections', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'rename', collection_id: 'personal', name: 'lost'})});
  assert.equal(result.status, 507); assert.match((await result.json()).error, /not saved/);
  assert.equal((await call('/api/collections')).collections[0].name, 'My bookmarks');
  assert.equal((await call('/api/export')).items.length, 3);
});

test('stale tabs cannot overwrite saved changes', async () => {
  const first = await setup(); const second = await setup(first.persistence);
  await first.importItems(records);
  const stale = await second.runtime.request('/api/import-json', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({format:'bookmark-sorter/v1', items:[]})});
  assert.equal(stale.status, 507); assert.match((await stale.json()).error, /Another window/);
  assert.equal((await (await setup(first.persistence)).call('/api/export')).items.length, 3);
});

test('collections, local images and backups retain data; corrupt or altered schemas are rejected', async () => {
  const {runtime, call, importItems} = await setup(); await importItems(records);
  const template = await call('/api/collections', {action: 'create-template', name: 'My template'});
  await call('/api/import-json', {format:'bookmark-sorter/v1', items:records}, template.collection.id);
  const copy = await call('/api/collections', {action: 'copy-template', template_id: template.collection.id});
  assert.equal((await call('/api/export', null, copy.collection.id)).items.length, 3);
  const item = (await call('/api/selection')).items[0];
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4t8AAAAASUVORK5CYII=';
  await runtime.attachImage('personal', item.url_key, image);
  const backup = await runtime.backup();
  await call('/api/collections', {action:'erase', collection_id:'personal'});
  await runtime.restore(backup);
  assert.equal((await call('/api/selection?expression=image:present')).items[0].capture_url, image);
  await assert.rejects(runtime.restore(new Uint8Array([1,2,3])));
  const changed = new SQL.Database(backup); changed.run('CREATE TABLE unwanted (value)');
  assert.throws(() => validateDatabase(SQL, changed.export(), schema), /schema/); changed.close();
  assert.equal((await call('/api/export')).items.length, 3);
});

test('5,600-bookmark workload: import, indexed page/contains query and bulk verdict', async t => {
  const {call, importItems} = await setup();
  const start = performance.now();
  await importItems(Array.from({length:5600}, (_,i) => ({url:`https://example.org/${i}`, title:`Reference item ${i}`, tags:[i%2 ? 'topic:art':'topic:science'], added_at:'2026-09-01T00:00:00Z'})));
  const imported = performance.now();
  const selected = await call('/api/selection?expression=topic:art&limit=16&offset=2000');
  assert.equal(selected.total,2800); assert.equal(selected.items.length,16);
  const session = await call('/api/session', {action:'start'});
  const result = await call('/api/selection/verdict', {session_id:session.id, expression:'topic:art', verdict:'archive', confirmed:true});
  assert.equal((await call('/api/selection?expression=verdict:archive')).total,2800);
  t.diagnostic(JSON.stringify({items:5600, import_ms:Math.round(imported-start), query_and_bulk_ms:Math.round(performance.now()-imported), bulk_result_count:result.changed ?? result.changes?.length}));
});
