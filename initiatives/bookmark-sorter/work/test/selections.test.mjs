import assert from 'node:assert/strict';
import {test} from 'node:test';

import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {compileSelection, evaluateSelection, normaliseTitle, proposeSelections, wrapUiSelection} from '../src/selections.mjs';

const items = [
  {id: 'a', collection_id: 'alpha', url: 'https://news.test/one', title: 'Rust: A Guide!', title_key: normaliseTitle('Rust: A Guide!'), tags: ['topic:rust', 'folder:reading/rust']},
  {id: 'b', collection_id: 'alpha', url: 'https://news.test/two', title: 'Rust — A Guide', title_key: normaliseTitle('Rust — A Guide'), tags: ['topic:rust', 'saved:later', 'folder:reading/rust']},
  {id: 'c', collection_id: 'alpha', url: 'https://other.test/three', title: 'Gardens', title_key: normaliseTitle('Gardens'), tags: ['topic:garden', 'saved:later', 'folder:reading/garden']},
  {id: 'd', collection_id: 'beta', url: 'https://news.test/four', title: 'Rust A Guide', title_key: normaliseTitle('Rust A Guide'), tags: ['topic:rust', 'folder:reading/rust']},
];

test('selection grammar covers precedence, grouping, not, wildcards, unknown tags, and clear errors', () => {
  assert.deepEqual(evaluateSelection(items, 'topic:garden or topic:rust and saved:later').map(item => item.id), ['b', 'c']);
  assert.deepEqual(evaluateSelection(items, '(topic:garden or topic:rust) and saved:later').map(item => item.id), ['b', 'c']);
  assert.deepEqual(evaluateSelection(items, 'topic:rust and not saved:later').map(item => item.id), ['a', 'd']);
  assert.deepEqual(evaluateSelection(items, 'folder:reading/*').map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(evaluateSelection(items, 'unknown:value'), []);
  assert.throws(() => compileSelection('topic:rust and (saved:later or)'), /Expected a tag.*character/);
  assert.throws(() => compileSelection('topic:*:rust'), /wildcard.*end.*character/i);
});

test('UI scope wrapping and administrative selection use the same evaluator', () => {
  assert.equal(wrapUiSelection('alpha', 'collection:beta or topic:rust'), 'collection:alpha and (collection:beta or topic:rust)');
  assert.deepEqual(evaluateSelection(items, 'collection:beta or topic:rust', {collectionId: 'alpha'}).map(item => item.id), ['a', 'b']);
  assert.deepEqual(evaluateSelection(items, 'collection:beta or topic:garden').map(item => item.id), ['c', 'd']);
});

test('verdict clauses use the labels visible in the interface', () => {
  const verdictItems = [
    {...items[0], id: 'keep', verdict: 'keeper'},
    {...items[0], id: 'junk', verdict: 'junk'},
    {...items[0], id: 'archive', verdict: 'archive'},
    {...items[0], id: 'needs-time', verdict: 'needs-more-time'},
    {...items[0], id: 'untriaged', verdict: null},
  ];
  for (const id of ['keep', 'junk', 'archive', 'needs-time', 'untriaged']) {
    assert.deepEqual(evaluateSelection(verdictItems, `verdict:${id}`).map(item => item.id), [id]);
  }
  assert.deepEqual(evaluateSelection(verdictItems, 'verdict:keep or verdict:needs-time').map(item => item.id), ['keep', 'needs-time']);
});

test('cheap proposals are ordinary selections and mutable folder tags are recomputed on demand', () => {
  assert.equal(normaliseTitle('  Rust — A GUIDE! '), 'rust-a-guide');
  const first = proposeSelections(items);
  const site = first.find(proposal => proposal.id === 'site:news.test');
  const title = first.find(proposal => proposal.id === 'title:rust-a-guide');
  const folder = first.find(proposal => proposal.id === 'folder:reading/rust');
  assert.equal(site.count, 3);
  assert.equal(title.count, 3);
  assert.equal(folder.count, 3);
  assert.deepEqual(evaluateSelection(items, site.expression).map(item => item.id), ['a', 'b', 'd']);

  const changed = structuredClone(items);
  changed[1].tags = ['topic:rust', 'saved:later', 'folder:reading/changed'];
  assert.equal(proposeSelections(changed).some(proposal => proposal.id === 'folder:reading/rust'), true);
  assert.equal(proposeSelections(changed).find(proposal => proposal.id === 'folder:reading/rust').count, 2);
});

test('saved selections, additive tags, mark-then-sweep, and one-action undo share the same item set', () => {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'pile', name: 'Pile'});
  for (let index = 0; index < 50; index += 1) {
    const item = store.insertItem({
      collection_id: 'pile', url: `https://example.test/${index}`, url_key: `https://example.test/${index}`,
      title: `Example ${index}`, title_key: `example-${index}`, note: null, added_at: null,
      ingested_at: '2026-08-18T00:00:00Z', verdict: null, verdict_at: null,
    });
    store.addTags(item.id, [index < 40 ? 'group:large' : 'group:small', 'existing']);
  }
  store.saveSelection('pile', {id: 'saved-1', name: 'Large', expression: 'group:large'});
  assert.equal(store.selection('pile', 'saved-1').expression, 'group:large');
  assert.equal(store.listSelections('pile').length, 1);

  const session = store.startSession('pile', {id: 'session-1', startedAt: '2026-08-18T12:00:00Z'});
  const selected = evaluateSelection(store.listAllItems('pile'), 'group:large', {collectionId: 'pile'});
  const tagged = store.applyTags('pile', {itemIds: selected.map(item => item.id), tags: ['existing', 'cluster:large'], at: '2026-08-18T12:01:00Z', sessionId: session.id, actionId: 'tag-1'});
  assert.equal(tagged.changes.length, 40);
  assert.ok(store.listAllItems('pile').filter(item => item.tags.includes('cluster:large')).length === 40);
  const tagUndo = store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:02:00Z'});
  assert.equal(tagUndo.kind, 'tag-apply');
  assert.equal(store.listAllItems('pile').filter(item => item.tags.includes('cluster:large')).length, 0);
  assert.ok(store.listAllItems('pile').every(item => item.tags.includes('existing')));

  const marked = new Set(selected.slice(0, 4).map(item => item.id));
  const rest = selected.filter(item => !marked.has(item.id));
  const swept = store.applyVerdict('pile', {itemIds: rest.map(item => item.id), verdict: 'junk', at: '2026-08-18T12:03:00Z', sessionId: session.id, actionId: 'sweep-1'});
  assert.equal(swept.changes.length, 36);
  assert.equal(store.countUntriagedItems('pile'), 14);
  const sweepUndo = store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:04:00Z'});
  assert.equal(sweepUndo.kind, 'verdict');
  assert.equal(sweepUndo.changes.length, 36);
  assert.equal(store.countUntriagedItems('pile'), 50);
});
