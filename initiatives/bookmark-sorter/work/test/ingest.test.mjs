import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {parseBookmarkHtml} from '../src/bookmark-html.mjs';
import {ingestBookmarkHtml} from '../src/ingest.mjs';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {normaliseUrl} from '../src/url-key.mjs';

const fixture = name => readFile(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8');

function newStore() {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'pile', name: 'Pile', kind: 'personal'});
  return store;
}

test('parses title, URL, date, nested folder path, and DD note', async () => {
  const items = parseBookmarkHtml(await fixture('export-small.html'));
  assert.equal(items.length, 4);
  assert.deepEqual(items[0], {
    title: 'The <Guide>',
    url: 'https://Example.COM:443/guide?utm_source=newsletter#part',
    add_date: '1700000000',
    folder_path: 'Reading & research/Rust',
    note: 'A note with useful context.',
  });
  assert.equal(items[3].folder_path, '');
});

test('normalises only the URL identity rules in the spec', () => {
  assert.equal(normaliseUrl('HTTPS://Example.COM:443/?utm_source=x#part'), 'https://example.com');
  assert.equal(normaliseUrl('https://example.com/path?chapter=2&utm_medium=x'), 'https://example.com/path?chapter=2');
  assert.notEqual(normaliseUrl('https://example.com/path?chapter=2'), normaliseUrl('https://example.com/path?chapter=3'));
});

test('ingestion deduplicates normalised URLs and retains the saved URL', async () => {
  const store = newStore();
  const result = await ingestBookmarkHtml({
    store,
    collectionId: 'pile',
    html: await fixture('export-small.html'),
    source: 'chrome-export',
    ingestedAt: '2026-08-18T12:00:00Z',
  });
  assert.deepEqual(result, {parsed: 4, added: 3, merged: 1, total: 3});
  const guide = store.listItems('pile').find(item => item.url_key === 'https://example.com/guide');
  assert.equal(guide.url, 'https://Example.COM:443/guide?utm_source=newsletter#part');
  assert.equal(guide.title_key, 'the-guide');
  assert.deepEqual(guide.tags, ['folder:Reading & research/Rust', 'in:2026-08-18', 'src:chrome-export']);
});

test('re-import is idempotent', async () => {
  const store = newStore();
  const html = await fixture('export-small.html');
  await ingestBookmarkHtml({store, collectionId: 'pile', html, source: 'chrome-export', ingestedAt: '2026-08-18'});
  const second = await ingestBookmarkHtml({store, collectionId: 'pile', html, source: 'chrome-export', ingestedAt: '2026-08-18'});
  assert.equal(second.added, 0);
  assert.equal(second.total, 3);
  assert.equal(store.listItems('pile').length, 3);
});

test('overlap unions tags, keeps the earliest date, and preserves user state', async () => {
  const store = newStore();
  await ingestBookmarkHtml({store, collectionId: 'pile', html: await fixture('export-small.html'), source: 'chrome-export', ingestedAt: '2026-08-18'});
  const guide = store.listItems('pile').find(item => item.url_key === 'https://example.com/guide');
  store.updateItem(guide.id, {verdict: 'keeper', verdict_at: '2026-08-19T00:00:00Z', note: 'My note'});

  const result = await ingestBookmarkHtml({store, collectionId: 'pile', html: await fixture('export-overlap.html'), source: 'firefox-export', ingestedAt: '2026-08-19'});
  const merged = store.listItems('pile').find(item => item.id === guide.id);
  assert.deepEqual(result, {parsed: 2, added: 1, merged: 1, total: 4});
  assert.equal(merged.added_at, new Date(1600000000 * 1000).toISOString());
  assert.equal(merged.note, 'My note');
  assert.equal(merged.verdict, 'keeper');
  assert.deepEqual(merged.tags, [
    'folder:Reading & research/Rust',
    'folder:Revisited',
    'in:2026-08-18',
    'in:2026-08-19',
    'src:chrome-export',
    'src:firefox-export',
  ]);
});

test('the migration pins collection identity and global capture identity', async () => {
  const sql = await readFile(fileURLToPath(new URL('../migrations/0001_core.sql', import.meta.url)), 'utf8');
  assert.match(sql, /UNIQUE \(collection_id, url_key\)/);
  assert.match(sql, /CREATE TABLE captures \(\s*url_key TEXT PRIMARY KEY/);
  assert.match(sql, /owner_id TEXT/);
});

test('the triage migration persists sittings, undo actions, and the backlog index', async () => {
  const sql = await readFile(fileURLToPath(new URL('../migrations/0002_triage.sql', import.meta.url)), 'utf8');
  assert.match(sql, /CREATE TABLE triage_sessions/);
  assert.match(sql, /CREATE TABLE triage_actions/);
  assert.match(sql, /WHERE verdict IS NULL/);
  assert.match(sql, /WHERE undone_at IS NULL/);
  assert.match(sql, /PRAGMA optimize/);
});

test('the capture migration indexes duplicate hashes and an explicitly driven resumable queue', async () => {
  const sql = await readFile(fileURLToPath(new URL('../migrations/0003_captures.sql', import.meta.url)), 'utf8');
  assert.match(sql, /CREATE TABLE capture_queue/);
  assert.match(sql, /reason IN \('missing-image', 'duplicate-image'\)/);
  assert.match(sql, /idx_captures_image_hash/);
  assert.match(sql, /idx_capture_queue_pending/);
  assert.match(sql, /PRAGMA optimize/);
});

test('the selection migration stores title keys and makes tag actions undoable', async () => {
  const sql = await readFile(fileURLToPath(new URL('../migrations/0004_selections.sql', import.meta.url)), 'utf8');
  assert.match(sql, /ADD COLUMN title_key/);
  assert.match(sql, /idx_items_collection_title_key/);
  assert.match(sql, /'verdict', 'tag-apply'/);
  assert.match(sql, /idx_triage_actions_session_active/);
  assert.match(sql, /PRAGMA optimize/);
});
