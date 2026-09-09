import {readFile} from 'node:fs/promises';
import initSqlJs from 'sql.js';
import {SqliteBinding} from '../src/sqlite-adapter.mjs';
import {WasmBookmarkStore} from '../src/bookmark-store.mjs';
const SQL = await initSqlJs();
const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const factories = [['WASM', async () => {
  const db = new SQL.Database(); db.run(schema);
  return new WasmBookmarkStore(new SqliteBinding(db));
}]];
import test from 'node:test';
import assert from 'node:assert/strict';
import {importExportDocument} from '../src/round-trip.mjs';
import {evaluateSelection, parseSelection} from '../src/selections.mjs';
const stamps = tags => tags.filter(tag => tag.startsWith('updated_at'));
const old = ['updated_at:2024-01-01T01:02:03', 'updated_at:2025-02-03T04:05:06', 'updated_at_old:legacy'];
const timestamp = at => 'updated_at:' + at.slice(0, 19);

for (const [name, factory] of factories) {
  async function setup(items) {
    const store = await factory();
    await store.ensureCollection({id: 'pile', name: 'Test pile'});
    await importExportDocument({store, collectionId: 'pile', document: {format: 'bookmark-sorter/v1', items}});
    const session = await store.startSession('pile', {id: 'sitting', startedAt: '2026-09-09T01:00:00Z'});
    return {store, sessionId: session.id};
  }
  test(name + ': additions and repeated verdicts replace one timestamp, preserve other tags and undo exactly', async () => {
    const {store, sessionId} = await setup([
      {url: 'https://example.org/a', title: 'A', tags: [...old, 'tag_run:2026-09-01T01:02:03', 'topic:art']},
      {url: 'https://example.org/b', title: 'B', tags: ['untouched']},
    ]);
    const original = await store.listAllItems('pile');
    const id = original.find(item => item.title === 'A').id;
    const get = async () => (await store.listAllItems('pile')).find(item => item.id === id);
    const at1 = '2026-09-09T02:03:04.987Z', at2 = '2026-09-09T02:03:05.001Z', at3 = '2026-09-09T02:03:06.001Z';
    await store.applyTags('pile', {itemIds: [id], tags: ['reviewed', 'updated_at:fake'], at: at1, sessionId, actionId: '1'});
    assert.deepEqual(stamps((await get()).tags), [timestamp(at1)]);
    assert.ok((await get()).tags.includes('reviewed'));
    assert.ok((await get()).tags.includes('tag_run:2026-09-01T01:02:03'));
    await store.applyVerdict('pile', {itemIds: [id], verdict: 'keeper', at: at2, sessionId, actionId: '2'});
    assert.deepEqual(stamps((await get()).tags), [timestamp(at2)]);
    await store.applyVerdict('pile', {itemIds: [id], verdict: 'keeper', at: at3, sessionId, actionId: '3'});
    assert.deepEqual(stamps((await get()).tags), [timestamp(at3)]);
    await store.undoLast('pile', {sessionId, at: '2026-09-09T02:04:00Z'});
    assert.equal((await get()).verdict, 'keeper');
    assert.deepEqual(stamps((await get()).tags), [timestamp(at2)]);
    await store.undoLast('pile', {sessionId, at: '2026-09-09T02:04:01Z'});
    assert.equal((await get()).verdict, null);
    assert.deepEqual(stamps((await get()).tags), [timestamp(at1)]);
    await store.undoLast('pile', {sessionId, at: '2026-09-09T02:04:02Z'});
    assert.deepEqual((await get()).tags.sort(), original.find(item => item.id === id).tags.sort());
    assert.deepEqual((await store.listAllItems('pile')).find(item => item.title === 'B'), original.find(item => item.title === 'B'));
    await store.applyTags('pile', {itemIds: [id], tags: ['topic:art'], at: at3, sessionId, actionId: '4'});
    assert.deepEqual(stamps((await get()).tags), [timestamp(at3)], 'reapplying an existing tag records the update');
    await store.removeTags('pile', {itemIds: [id], tags: ['topic:art'], at: at2, sessionId, actionId: '5'});
    assert.deepEqual(stamps((await get()).tags), [timestamp(at3)], 'removal alone does not create a timestamp');
  });

  test(name + ': partial and complete string comparisons have exact boundaries and match SQL membership/counts', async () => {
    const {store} = await setup([
      {url: 'https://example.org/a', title: 'A', tags: ['tag_run:2026-08-31T23:59:59', 'updated_at:2026-09-09T02:03:04', 'version:beta']},
      {url: 'https://example.org/b', title: 'B', tags: ['tag_run:2026-09-01T00:00:00', 'updated_at:2027-01-01T00:00:00', 'version:alpha']},
      {url: 'https://example.org/c', title: 'C', tags: ['tag_run:2026-09', 'updated_at:', 'version:gamma']},
      {url: 'https://example.org/d', title: 'D', tags: ['topic:art']},
    ]);
    const cases = [
      ['tag_run:>2026-09', ['B']], ['tag_run:<2026-09', ['A']],
      ['updated_at:<2027', ['A']], ['updated_at*', ['A', 'B', 'C']],
      ['updated_at:>2026-09-09T02:03:04', ['B']], ['updated_at:<2026-09-09T02:03:04', []],
      ['version:>beta', ['C']], ['version:<beta', ['B']],
      ['not (tag_run:>2026-09 or updated_at:<2027)', ['C', 'D']],
      ['tag_run:>2026 and updated_at:<2027', ['A']],
    ];
    const all = await store.listAllItems('pile');
    for (const [expression, expected] of cases) {
      assert.deepEqual(evaluateSelection(all, expression).map(item => item.title).sort(), expected, expression);
      const window = await store.selectionWindow('pile', {expression, limit: 1});
      assert.equal(window.total, expected.length, expression);
      const count = await store.selectionWindow('pile', {expression, countsOnly: true});
      assert.equal(count.total, expected.length, expression);
      const page = await store.selectionWindow('pile', {expression, limit: 20});
      assert.deepEqual(page.items.map(item => item.title).sort(), expected, expression);
    }
    for (const expression of ['tag_run:>', 'updated_at:<', 'version:>=beta', 'version:>beta*']) {
      assert.throws(() => parseSelection(expression), /comparison/, expression);
    }
  });

  test(name + ': bulk updates respect binding limits and replace timestamps on every item', async () => {
    const {store, sessionId} = await setup(Array.from({length: 201}, (_, i) => ({url: `https://example.org/${i}`, title: 'Bulk ' + i, tags: old})));
    const itemIds = (await store.listAllItems('pile')).map(item => item.id);
    const at = '2026-09-09T03:04:05Z';
    await store.applyTags('pile', {itemIds, tags: ['bulk'], at, sessionId, actionId: 'bulk-tag'});
    assert.ok((await store.listAllItems('pile')).every(item => JSON.stringify(stamps(item.tags)) === JSON.stringify([timestamp(at)])));
    const next = '2026-09-09T03:05:06Z';
    await store.applyVerdict('pile', {itemIds, verdict: 'archive', at: next, sessionId, actionId: 'bulk-verdict'});
    assert.ok((await store.listAllItems('pile')).every(item => item.verdict === 'archive' && JSON.stringify(stamps(item.tags)) === JSON.stringify([timestamp(next)])));
  });
}
