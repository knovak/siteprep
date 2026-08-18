import assert from 'node:assert/strict';
import {test} from 'node:test';

import {ingestBookmarkHtml} from '../src/ingest.mjs';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';

function largeExport(size) {
  const links = Array.from({length: size}, (_, index) =>
    `<DT><A HREF="https://example.test/item/${index}?utm_source=large" ADD_DATE="1700000000">Item ${index}</A>`,
  ).join('\n');
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>${links}</DL><p>`;
}

test('generated large export lands exactly 10,000 distinct items', async () => {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'pile', name: 'Pile', kind: 'personal'});
  const result = await ingestBookmarkHtml({
    store,
    collectionId: 'pile',
    html: largeExport(10_000),
    source: 'sizing-export',
    ingestedAt: '2026-08-18T00:00:00Z',
  });
  assert.deepEqual(result, {parsed: 10_000, added: 10_000, merged: 0, total: 10_000});
  assert.equal(store.countItems('pile'), 10_000);
});
