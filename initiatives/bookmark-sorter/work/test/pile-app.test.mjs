import assert from 'node:assert/strict';
import {Blob} from 'node:buffer';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {createPileApp} from '../src/worker.mjs';

const fixture = name => readFile(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8');

class AppStore extends MemoryBookmarkStore {
  async ensureCollection(collection) {
    if (!this.hasCollection(collection.id)) this.createCollection(collection);
  }

  listItems(collectionId, {limit = 200, offset = 0} = {}) {
    return super.listItems(collectionId).slice(Number(offset), Number(offset) + Number(limit));
  }
}

test('pile app serves the upload/list surface and imports through its API', async () => {
  const store = new AppStore();
  const app = createPileApp({storeFactory: () => store, now: () => new Date('2026-08-18T12:00:00Z')});
  const page = await app.fetch(new Request('https://pile.test/'));
  const html = await page.text();
  assert.match(html, /type="file"/);
  assert.match(html, /id="count"/);
  assert.match(html, /id="grid"/);
  assert.match(html, /data-verdict="keeper"/);
  assert.match(html, /textContent = text/);
  assert.doesNotMatch(html, /innerHTML/);

  const form = new FormData();
  form.append('source', 'chrome-export');
  form.append('file', new Blob([await fixture('export-small.html')], {type: 'text/html'}), 'bookmarks.html');
  const imported = await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}));
  assert.equal(imported.status, 201);
  assert.deepEqual(await imported.json(), {parsed: 4, added: 3, merged: 1, total: 3});

  const listed = await app.fetch(new Request('https://pile.test/api/items?limit=2'));
  const payload = await listed.json();
  assert.equal(payload.total, 3);
  assert.equal(payload.backlog, 3);
  assert.equal(payload.items.length, 2);
  assert.equal(payload.collection_id, 'pile');
});

test('verdicts update the backlog and a marked-set action undoes as one step', async () => {
  const store = new AppStore();
  let tick = 0;
  let sequence = 0;
  const app = createPileApp({
    storeFactory: () => store,
    now: () => new Date(Date.UTC(2026, 7, 18, 12, tick++)),
    idFactory: prefix => `${prefix}-${++sequence}`,
  });
  const form = new FormData();
  form.append('source', 'chrome-export');
  form.append('file', new Blob([await fixture('export-small.html')], {type: 'text/html'}), 'bookmarks.html');
  await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}));

  const start = await app.fetch(new Request('https://pile.test/api/session', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'}),
  }));
  const session = await start.json();
  const listed = await (await app.fetch(new Request('https://pile.test/api/items?limit=10'))).json();
  const ids = listed.items.map(item => item.id);

  const marked = await app.fetch(new Request('https://pile.test/api/verdict', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, item_ids: ids.slice(0, 2), verdict: 'keeper'}),
  }));
  const markedResult = await marked.json();
  assert.equal(markedResult.backlog, 1);
  assert.equal(markedResult.session.items_judged, 2);
  assert.equal(markedResult.changes.length, 2);

  const last = await app.fetch(new Request('https://pile.test/api/verdict', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, item_ids: ids.slice(2), verdict: 'junk'}),
  }));
  assert.equal((await last.json()).backlog, 0);

  const undone = await app.fetch(new Request('https://pile.test/api/undo', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: session.id}),
  }));
  const undoResult = await undone.json();
  assert.equal(undoResult.backlog, 1);
  assert.equal(undoResult.changes.length, 1);
  assert.equal(undoResult.session.items_judged, 2);

  const finished = await app.fetch(new Request('https://pile.test/api/session', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'finish', session_id: session.id}),
  }));
  const finishResult = await finished.json();
  assert.equal(finishResult.items_judged, 2);
  assert.ok(finishResult.elapsed_ms > 0);
});

test('pile app refuses oversized uploads before reading them', async () => {
  const store = new AppStore();
  const app = createPileApp({storeFactory: () => store});
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(20 * 1024 * 1024 + 1)]), 'too-large.html');
  const response = await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}));
  assert.equal(response.status, 413);
});
