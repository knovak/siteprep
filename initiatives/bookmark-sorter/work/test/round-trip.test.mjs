import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {ingestBookmarkHtml} from '../src/ingest.mjs';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {acceptProposedTag, exportSelection, importExportDocument, readProposalDocument} from '../src/round-trip.mjs';

const fixture = name => readFile(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8');

async function sourceStore() {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'source', name: 'Source'});
  await ingestBookmarkHtml({
    store,
    collectionId: 'source',
    html: await fixture('export-small.html'),
    source: 'chrome-export',
    ingestedAt: '2026-08-18T00:00:00Z',
  });
  const items = store.listAllItems('source');
  const guide = items.find(item => item.url_key === 'https://example.com/guide');
  store.addTags(guide.id, ['topic:rust']);
  const session = store.startSession('source', {id: 'source-session', startedAt: '2026-08-18T01:00:00Z'});
  store.applyVerdict('source', {
    itemIds: [guide.id], verdict: 'keeper', verdict_at: '2026-08-18T01:01:00Z',
    at: '2026-08-18T01:01:00Z', sessionId: session.id, actionId: 'source-verdict',
  });
  store.upsertCapture({
    url_key: guide.url_key, image_ref: 'captures/guide.webp', source: 'og', captured_at: '2026-08-18T01:02:00Z',
    image_hash: 'guide-hash', state: 'pass1-ready', page_title: guide.title, description: null, favicon_url: null,
    error_tag: null, image_candidate: 'og:image', content_type: 'image/webp', width: 300, height: 180, byte_size: 100,
  });
  return store;
}

test('a selection export is self-describing, capture-free, and a same-collection import is a no-op', async () => {
  const store = await sourceStore();
  const before = store.listAllItems('source');
  const document = await exportSelection({
    store, collectionId: 'source', expression: 'site:example.com', exportedAt: '2026-08-18T02:00:00Z',
  });
  assert.equal(document.format, 'bookmark-sorter/v1');
  assert.equal(document.selection, 'site:example.com');
  assert.equal(document.items.length, 2);
  assert.ok(document.items.every(item => !('capture' in item) && !('url_key' in item) && !('id' in item)));

  const result = await importExportDocument({
    store, collectionId: 'source', document, importedAt: '2026-08-19T00:00:00Z',
  });
  assert.deepEqual(result, {parsed: 2, added: 0, merged: 2, total: 3});
  assert.deepEqual(store.listAllItems('source'), before);
});

test('a different collection receives portable judgement, preserves its own writing, and reuses the URL capture', async () => {
  const store = await sourceStore();
  store.createCollection({id: 'destination', name: 'Destination'});
  const existing = store.insertItem({
    collection_id: 'destination', url: 'https://example.com/guide', url_key: 'https://example.com/guide',
    title: 'Destination title', title_key: 'destination-title', note: 'Keep this destination note',
    added_at: '2018-01-01T00:00:00Z', ingested_at: '2026-08-17T00:00:00Z', verdict: 'archive', verdict_at: '2026-08-17T01:00:00Z',
  });
  store.addTags(existing.id, ['destination-only']);
  const document = await exportSelection({store, collectionId: 'source', expression: 'site:example.com', exportedAt: '2026-08-18T02:00:00Z'});
  const result = await importExportDocument({store, collectionId: 'destination', document, importedAt: '2026-08-19T00:00:00Z'});
  assert.deepEqual(result, {parsed: 2, added: 1, merged: 1, total: 2});
  const items = store.listAllItems('destination');
  const guide = items.find(item => item.url_key === 'https://example.com/guide');
  assert.equal(guide.note, 'Keep this destination note');
  assert.equal(guide.verdict, 'archive');
  assert.ok(guide.tags.includes('destination-only') && guide.tags.includes('topic:rust'));
  assert.equal(guide.capture.image_ref, 'captures/guide.webp');
  assert.equal(store.countItems('source'), 3);
});

test('a hand-written v1 document imports without depending on exporter output', async () => {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'pile', name: 'Pile'});
  const result = await importExportDocument({
    store, collectionId: 'pile', document: await fixture('export-v1.json'), importedAt: '2026-08-19T00:00:00Z',
  });
  assert.deepEqual(result, {parsed: 1, added: 1, merged: 0, total: 1});
  const item = store.listAllItems('pile')[0];
  assert.equal(item.url_key, 'https://portable.example/one');
  assert.equal(item.verdict, 'keeper');
  assert.equal(item.note, 'A note from a file the importer did not write.');
});

test('proposal loading is read-only, URL-matched, grouped per tag, and acceptance uses the additive undo path', async () => {
  const store = await sourceStore();
  const before = store.listAllItems('source');
  const document = await fixture('proposals.json');
  const proposals = await readProposalDocument({store, collectionId: 'source', document});
  assert.deepEqual(proposals.unmatched_urls, ['https://missing.example/not-in-the-pile']);
  assert.deepEqual(proposals.groups.map(group => [group.tag, group.count, group.already_tagged]), [
    ['cluster:example-guides', 2, 0],
    ['topic:rust', 1, 1],
  ]);
  assert.deepEqual(store.listAllItems('source'), before, 'loading or discarding the file writes nothing');

  const session = store.startSession('source', {id: 'proposal-session', startedAt: '2026-08-18T13:01:00Z'});
  const accepted = await acceptProposedTag({
    store, collectionId: 'source', document, tag: 'cluster:example-guides', sessionId: session.id,
    actionId: 'proposal-action', at: '2026-08-18T13:02:00Z',
  });
  assert.equal(accepted.selection.count, 2);
  assert.equal(accepted.result.changes.length, 2);
  assert.equal(store.listAllItems('source').filter(item => item.tags.includes('cluster:example-guides')).length, 2);
  const undone = store.undoLast('source', {sessionId: session.id, at: '2026-08-18T13:03:00Z'});
  assert.equal(undone.kind, 'tag-apply');
  assert.ok(store.listAllItems('source').every(item => !item.tags.includes('cluster:example-guides')));

  const alreadyPresent = await acceptProposedTag({
    store, collectionId: 'source', document, tag: 'topic:rust', sessionId: session.id,
    actionId: 'proposal-existing', at: '2026-08-18T13:04:00Z',
  });
  assert.equal(alreadyPresent.result.changes.length, 0);
  assert.equal(store.listAllItems('source').find(item => item.url_key === 'https://example.com/guide').tags.filter(tag => tag === 'topic:rust').length, 1);
});
