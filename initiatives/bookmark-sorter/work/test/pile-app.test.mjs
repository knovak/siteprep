import assert from 'node:assert/strict';
import {Blob} from 'node:buffer';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {createCapturePipeline} from '../src/capture-pipeline.mjs';
import {MemoryCaptureImages, sha256Hex} from '../src/capture-images.mjs';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {createPileApp} from '../src/worker.mjs';

const fixture = name => readFile(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8');

class AppStore extends MemoryBookmarkStore {
  async ensureCollection(collection) {
    if (!this.hasCollection(collection.id)) this.createCollection(collection);
    return this.ownedCollection(collection.id);
  }

  listItems(collectionId, {limit = 200, offset = 0} = {}) {
    return super.listItems(collectionId).slice(Number(offset), Number(offset) + Number(limit));
  }
}

const createTestApp = options => createPileApp({
  ...options,
  identityFromRequest: options?.identityFromRequest || (() => ({id: 'test-user', email: 'krnovak@gmail.com'})),
  personalCollectionIdFactory: options?.personalCollectionIdFactory || (() => 'pile'),
});

test('pile app serves the upload/list surface and imports through its API', async () => {
  const store = new AppStore();
  const app = createTestApp({storeFactory: () => store, now: () => new Date('2026-08-18T12:00:00Z')});
  const page = await app.fetch(new Request('https://pile.test/'));
  const html = await page.text();
  assert.match(html, /type="file"/);
  assert.match(html, /id="count"/);
  assert.match(html, /id="grid"/);
  assert.match(html, /id="selection-expression"/);
  assert.match(html, /id="sweep-rest"/);
  assert.match(html, /id="tag-selection"/);
  assert.match(html, /data-verdict="keeper"/);
  assert.match(html, /-webkit-line-clamp: 5/);
  assert.match(html, /titleLink\.target = '_blank'/);
  assert.match(html, /navigator\.clipboard\.writeText\(item\.url\)/);
  assert.match(html, /id="help-toggle"/);
  assert.match(html, /Sweep untriaged/);
  assert.match(html, /id="capture-gaps" class="admin-capture" type="button" disabled/);
  assert.match(html, /id="capture-pass-one" class="admin-capture" type="button" disabled/);
  assert.match(html, /api\/captures\/pass-one\?limit=20/);
  assert.match(html, /id="previous-page"/);
  assert.match(html, /id="next-page"/);
  assert.match(html, /id="rename-form"/);
  assert.match(html, /id="new-collection" type="button">New</);
  assert.match(html, /id="exporter"/);
  assert.match(html, /id="export-scope"/);
  assert.match(html, /id="selector"/);
  assert.match(html, /id="previous-selections"/);
  assert.match(html, /id="erase-collection"/);
  assert.match(html, /id="admin-menu"/);
  assert.match(html, />Load a copy</);
  assert.match(html, /id="sweep-mode"/);
  assert.match(html, />Sweep all selected</);
  assert.match(html, /\.html,\.json,text\/html,application\/json/);
  assert.match(html, /image:present/);
  assert.match(html, /id="tag-popover"/);
  assert.match(html, /can be used as a suffix to match any trailing characters/);
  assert.match(html, /exact folder names used by Automatic proposals/);
  assert.doesNotMatch(html, /prompt\('Collection name'/);
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
  const app = createTestApp({
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

test('selection API scopes, saves, proposes, tags, sweeps visibly, and confirms only unopened sets', async () => {
  const store = new AppStore();
  let sequence = 0;
  const app = createTestApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-18T12:00:00Z'),
    idFactory: prefix => `${prefix}-${++sequence}`,
  });
  const form = new FormData();
  form.append('source', 'chrome-export');
  form.append('file', new Blob([await fixture('export-small.html')], {type: 'text/html'}), 'bookmarks.html');
  await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}));

  const selected = await (await app.fetch(new Request('https://pile.test/api/selection?expression=site%3Aexample.com&limit=10'))).json();
  assert.equal(selected.total, 2);
  assert.equal(selected.collection_total, 3);
  assert.equal(selected.effective_expression, 'collection:pile and (site:example.com)');
  const ids = selected.items.map(item => item.id);

  const proposals = await (await app.fetch(new Request('https://pile.test/api/proposals'))).json();
  assert.equal(proposals.proposals.find(proposal => proposal.id === 'site:example.com').count, 2);
  assert.equal(proposals.proposals.find(proposal => proposal.id === 'src:chrome-export').count, 3);
  assert.ok(proposals.proposals.some(proposal => proposal.kind === 'tag'));
  assert.equal(proposals.proposals.find(proposal => proposal.id === 'image:none').count, 3);

  const savedResponse = await app.fetch(new Request('https://pile.test/api/selections', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name: 'Example site', expression: 'site:example.com'}),
  }));
  assert.equal(savedResponse.status, 201);
  const saved = await savedResponse.json();
  assert.equal((await (await app.fetch(new Request('https://pile.test/api/selections'))).json()).selections[0].expression, 'site:example.com');

  const session = await (await app.fetch(new Request('https://pile.test/api/session', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'}),
  }))).json();

  const tagged = await (await app.fetch(new Request('https://pile.test/api/tag', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, expression: 'site:example.com', tags: ['cluster:example']}),
  }))).json();
  assert.equal(tagged.changes.length, 2);
  assert.equal(store.listAllItems('pile').filter(item => item.tags.includes('cluster:example')).length, 2);
  const tagUndo = await (await app.fetch(new Request('https://pile.test/api/undo', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: session.id}),
  }))).json();
  assert.equal(tagUndo.kind, 'tag-apply');
  assert.ok(store.listAllItems('pile').every(item => !item.tags.includes('cluster:example')));

  const visible = await app.fetch(new Request('https://pile.test/api/selection/verdict', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, expression: 'site:example.com', exclude_item_ids: [ids[0]], verdict: 'junk', visible: true}),
  }));
  assert.equal(visible.status, 200);
  assert.equal((await visible.json()).changes.length, 1);
  await app.fetch(new Request('https://pile.test/api/undo', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: session.id}),
  }));

  const unopened = await app.fetch(new Request('https://pile.test/api/selection/verdict', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, selection_id: saved.id, verdict: 'archive', visible: false}),
  }));
  assert.equal(unopened.status, 409);
  assert.deepEqual(await unopened.json(), {confirmation_required: true, count: 2});
  const confirmed = await app.fetch(new Request('https://pile.test/api/selection/verdict', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, selection_id: saved.id, verdict: 'archive', visible: false, confirmed: true}),
  }));
  assert.equal(confirmed.status, 200);
  assert.equal((await confirmed.json()).changes.length, 2);
  assert.equal((await (await app.fetch(new Request('https://pile.test/api/selection?expression=verdict%3Aarchive'))).json()).total, 2);
  assert.equal((await (await app.fetch(new Request('https://pile.test/api/selection?expression=verdict%3Auntriaged'))).json()).total, 1);
});

test('selection history persists recent expressions and only administrators can edit authorized users', async () => {
  const store = new AppStore();
  let tick = 0;
  const app = createTestApp({
    storeFactory: () => store,
    now: () => new Date(Date.UTC(2026, 7, 18, 12, tick++)),
  });

  for (const expression of ['site:first.example', 'folder:Reading/*', 'site:first.example']) {
    const response = await app.fetch(new Request('https://pile.test/api/selection-history', {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({expression}),
    }));
    assert.equal(response.status, 201);
  }
  const history = await (await app.fetch(new Request('https://pile.test/api/selection-history'))).json();
  assert.deepEqual(history.selections.map(row => row.expression), ['site:first.example', 'folder:Reading/*']);

  const initial = await (await app.fetch(new Request('https://pile.test/api/authorized-users'))).json();
  assert.deepEqual(initial.users, [
    {email: 'julie.duffield@gmail.com', type: 'user'},
    {email: 'krnovak@gmail.com', type: 'admin'},
  ]);
  const added = await (await app.fetch(new Request('https://pile.test/api/authorized-users', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'add', email: 'New.Reader@Example.com', type: 'user'}),
  }))).json();
  assert.deepEqual(added.user, {email: 'new.reader@example.com', type: 'user'});
  assert.equal((await (await app.fetch(new Request('https://pile.test/api/collections'))).json()).collections.length, 1);
  await app.fetch(new Request('https://pile.test/api/authorized-users', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'remove', email: 'new.reader@example.com'}),
  }));
  assert.equal((await (await app.fetch(new Request('https://pile.test/api/authorized-users'))).json()).users.length, 2);

  const readerApp = createTestApp({
    storeFactory: () => store,
    identityFromRequest: () => ({id: 'reader-user', email: 'julie.duffield@gmail.com'}),
  });
  const readerPage = await (await readerApp.fetch(new Request('https://pile.test/'))).text();
  assert.doesNotMatch(readerPage, /id="admin-menu"/);
  const denied = await readerApp.fetch(new Request('https://pile.test/api/authorized-users'));
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), {error: 'Admin access required'});
});

test('portable API exports a selection, imports JSON, and reviews proposed tags before acceptance', async () => {
  const store = new AppStore();
  let sequence = 0;
  const app = createTestApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-18T12:00:00Z'),
    idFactory: prefix => `${prefix}-${++sequence}`,
  });
  const form = new FormData();
  form.append('source', 'chrome-export');
  form.append('file', new Blob([await fixture('export-small.html')], {type: 'text/html'}), 'bookmarks.html');
  await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}));

  const exported = await app.fetch(new Request('https://pile.test/api/export?expression=site%3Aexample.com'));
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get('content-disposition'), /bookmark-sorter-export\.json/);
  const document = await exported.json();
  assert.equal(document.selection, 'site:example.com');
  assert.equal(document.items.length, 2);
  assert.ok(document.items.every(item => !('capture' in item)));

  const wholeCollection = await app.fetch(new Request('https://pile.test/api/export'));
  assert.equal(wholeCollection.status, 200);
  assert.equal((await wholeCollection.json()).items.length, 3);

  const fileForm = new FormData();
  fileForm.append('source', 'ignored-for-json');
  fileForm.append('file', new Blob([JSON.stringify(document)], {type: 'application/json'}), 'bookmark-sorter-export.json');
  const importedFile = await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: fileForm}));
  assert.equal(importedFile.status, 201);
  assert.deepEqual(await importedFile.json(), {parsed: 2, added: 0, merged: 2, total: 3});

  const imported = await app.fetch(new Request('https://pile.test/api/import-json', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(document),
  }));
  assert.equal(imported.status, 201);
  assert.deepEqual(await imported.json(), {parsed: 2, added: 0, merged: 2, total: 3});

  const proposalDocument = JSON.parse(await fixture('proposals.json'));
  const reviewed = await app.fetch(new Request('https://pile.test/api/proposal-file', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(proposalDocument),
  }));
  assert.equal(reviewed.status, 200);
  const review = await reviewed.json();
  assert.equal(review.groups.find(group => group.tag === 'cluster:example-guides').count, 2);
  assert.deepEqual(review.unmatched_urls, ['https://missing.example/not-in-the-pile']);
  assert.ok(store.listAllItems('pile').every(item => !item.tags.includes('cluster:example-guides')));

  const session = await (await app.fetch(new Request('https://pile.test/api/session', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'}),
  }))).json();
  const accepted = await app.fetch(new Request('https://pile.test/api/proposal-file/accept', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, tag: 'cluster:example-guides', document: proposalDocument}),
  }));
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).result.changes.length, 2);
  assert.equal(store.listAllItems('pile').filter(item => item.tags.includes('cluster:example-guides')).length, 2);
});

test('a visible sweep across several thousand items never gains a count-based confirmation', async () => {
  const store = new AppStore();
  store.createCollection({id: 'pile', name: 'Pile'});
  for (let index = 0; index < 3_000; index += 1) {
    const item = store.insertItem({
      collection_id: 'pile', url: `https://bulk.test/${index}`, url_key: `https://bulk.test/${index}`,
      title: `Bulk ${index}`, title_key: `bulk-${index}`, note: null, added_at: null,
      ingested_at: '2026-08-18T00:00:00Z', verdict: null, verdict_at: null,
    });
    store.addTags(item.id, ['group:bulk']);
  }
  let sequence = 0;
  const app = createTestApp({storeFactory: () => store, idFactory: prefix => `${prefix}-${++sequence}`});
  const session = await (await app.fetch(new Request('https://pile.test/api/session', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'}),
  }))).json();
  const swept = await app.fetch(new Request('https://pile.test/api/selection/verdict', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({session_id: session.id, expression: 'group:bulk', verdict: 'junk', visible: true}),
  }));
  assert.equal(swept.status, 200);
  assert.equal((await swept.json()).changes.length, 3_000);
  const undone = await (await app.fetch(new Request('https://pile.test/api/undo', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: session.id}),
  }))).json();
  assert.equal(undone.changes.length, 3_000);
  assert.equal(store.countUntriagedItems('pile'), 3_000);
});

test('collection API creates empty private collections and manages template copies', async () => {
  const store = new AppStore({canEditTemplates: true});
  store.createCollection({id: 'template-one', name: 'Starter pile', kind: 'demo-template', created_at: '2026-08-19T00:00:00Z'});
  const seeded = store.insertItem({
    collection_id: 'template-one', url: 'https://example.com/starter', url_key: 'https://example.com/starter',
    title: 'Starter', title_key: 'starter', note: null, added_at: null,
    ingested_at: '2026-08-19T00:00:00Z', verdict: null, verdict_at: null,
  });
  store.addTags(seeded.id, ['topic:starter']);
  let sequence = 0;
  const app = createTestApp({storeFactory: () => store, idFactory: prefix => `${prefix}-${++sequence}`});

  const listed = await (await app.fetch(new Request('https://pile.test/api/collections'))).json();
  assert.equal(listed.active_collection_id, 'pile');
  assert.deepEqual(listed.templates.map(template => template.id), ['template-one']);
  assert.equal(listed.can_edit_templates, true);

  const created = await (await app.fetch(new Request('https://pile.test/api/collections', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'create', name: 'Research queue'}),
  }))).json();
  assert.equal(created.collection.name, 'Research queue');
  assert.equal(created.collection.kind, 'private');
  assert.equal(store.countItems(created.collection.id), 0);

  const copied = await (await app.fetch(new Request('https://pile.test/api/collections', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'copy-template', template_id: 'template-one'}),
  }))).json();
  assert.equal(copied.collection.kind, 'demo-copy');
  assert.equal(store.countItems(copied.collection.id), 1);

  const fresh = await (await app.fetch(new Request('https://pile.test/api/collections', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'fresh-copy', collection_id: copied.collection.id}),
  }))).json();
  assert.notEqual(fresh.collection.id, copied.collection.id);
  assert.notEqual(fresh.collection.name, copied.collection.name);

  const renamed = await (await app.fetch(new Request('https://pile.test/api/collections', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'rename', collection_id: fresh.collection.id, name: 'My clean demo'}),
  }))).json();
  assert.equal(renamed.collection.name, 'My clean demo');

  const erased = await (await app.fetch(new Request('https://pile.test/api/collections', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'erase', collection_id: fresh.collection.id}),
  }))).json();
  assert.equal(erased.erased_items, 1);
  assert.equal(store.countItems(fresh.collection.id), 0);
  assert.equal(store.hasCollection(fresh.collection.id), true);

  const deleted = await app.fetch(new Request('https://pile.test/api/collections', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({action: 'delete-copy', collection_id: copied.collection.id}),
  }));
  assert.equal(deleted.status, 200);
  assert.equal(store.hasCollection(copied.collection.id), false);
  assert.equal(store.hasCollection(fresh.collection.id), true);
});

test('pile app refuses oversized uploads before reading them', async () => {
  const store = new AppStore();
  const app = createTestApp({storeFactory: () => store});
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(20 * 1024 * 1024 + 1)]), 'too-large.html');
  const response = await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}));
  assert.equal(response.status, 413);
});

test('pass-1 backfill processes only uncaptured items in repeatable bounded batches', async () => {
  const store = new AppStore();
  store.createCollection({id: 'pile', name: 'Pile', owner_id: null, kind: 'personal', created_at: '2026-08-18T00:00:00Z'});
  for (const suffix of ['one', 'two']) {
    store.insertItem({
      collection_id: 'pile', url: `https://example.com/${suffix}`, url_key: `https://example.com/${suffix}`,
      title: suffix, title_key: suffix, note: null, added_at: null, ingested_at: '2026-08-18T00:00:00Z',
      verdict: null, verdict_at: null,
    });
  }
  const captured = [];
  const optionsSeen = [];
  const capture = {
    captureMany: async (collectionId, candidates, options = {}) => {
      optionsSeen.push(options);
      for (const candidate of candidates) {
        captured.push(candidate.url_key);
        store.upsertCapture({
          url_key: candidate.url_key, image_ref: null, source: 'none', captured_at: '2026-08-20T00:00:00Z',
          image_hash: null, state: options.markRetried ? 'pass1-final-gap' : 'pass1-gap', page_title: null, description: null, favicon_url: null,
          error_tag: null, image_candidate: options.force ? 'og:image' : null, content_type: null, width: null, height: null, byte_size: null,
        });
      }
      return {processed: candidates.length, captures: [], status: {total: captured.length}};
    },
  };
  const app = createTestApp({storeFactory: () => store, captureFactory: () => capture});
  const run = () => app.fetch(new Request('https://pile.test/api/captures/pass-one?limit=1', {method: 'POST'}));
  assert.equal((await (await run()).json()).processed, 1);
  assert.equal((await (await run()).json()).processed, 1);
  assert.equal((await (await run()).json()).processed, 0);
  assert.deepEqual(captured, ['https://example.com/one', 'https://example.com/two']);
  store.upsertCapture({...(await store.getCapture('https://example.com/one')), state: 'pass1-gap', image_candidate: 'og:image'});
  const retried = await app.fetch(new Request('https://pile.test/api/captures/pass-one?limit=1&retry=1', {method: 'POST'}));
  assert.equal((await retried.json()).processed, 1);
  assert.deepEqual(optionsSeen.at(-1), {force: true, markRetried: true});
  const caughtUp = await app.fetch(new Request('https://pile.test/api/captures/pass-one?limit=1&retry=1', {method: 'POST'}));
  assert.equal((await caughtUp.json()).processed, 0);
  assert.deepEqual(captured, ['https://example.com/one', 'https://example.com/two', 'https://example.com/one']);
});

test('pile app serves stored derivatives and the explicit gap action without exposing vendor configuration', async () => {
  const store = new AppStore();
  store.createCollection({id: 'pile', name: 'Pile', owner_id: null, kind: 'personal', created_at: '2026-08-18T00:00:00Z'});
  const item = store.insertItem({collection_id: 'pile', url: 'https://example.com/one', url_key: 'https://example.com/one', title: 'One', note: null, added_at: null, ingested_at: '2026-08-18T00:00:00Z', verdict: null, verdict_at: null});
  store.addTags(item.id, ['src:test']);
  const images = new MemoryCaptureImages();
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const imageHash = await sha256Hex(bytes);
  const imageRef = await images.putDerivative({urlKey: item.url_key, bytes, contentType: 'image/webp', width: 4, height: 3, imageHash});
  store.upsertCapture({url_key: item.url_key, image_ref: imageRef, source: 'og', captured_at: '2026-08-18T00:00:00Z', image_hash: imageHash, state: 'pass1-ready', page_title: 'One', description: null, favicon_url: null, error_tag: null, image_candidate: 'og:image', content_type: 'image/webp', width: 4, height: 3, byte_size: 4});
  store.refreshCaptureQueue({duplicateThreshold: 30, at: '2026-08-18T00:00:00Z'});
  let vendorCalls = 0;
  const pipeline = createCapturePipeline({store, imageStore: images, transformImage: value => value, passTwoEnabled: false, vendorCapture: async () => { vendorCalls += 1; }});
  const app = createTestApp({storeFactory: () => store, captureFactory: () => pipeline});

  const pageText = await (await app.fetch(new Request('https://pile.test/'))).text();
  assert.match(pageText, /id="capture-gaps"/);
  assert.doesNotMatch(pageText, /secret-test-value|screenshot\.vendor\.test/);
  const listed = await (await app.fetch(new Request('https://pile.test/api/items'))).json();
  assert.match(listed.items[0].capture_url, /^\/api\/capture-image/);
  const image = await app.fetch(new Request(`https://pile.test${listed.items[0].capture_url}`));
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), bytes);
  const gaps = await (await app.fetch(new Request('https://pile.test/api/captures/gaps', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({limit: 20})}))).json();
  assert.equal(gaps.enabled, false);
  assert.equal(vendorCalls, 0);
});

test('import commits the pile before pass 1 continues in the request lifetime', async () => {
  const store = new AppStore();
  let release;
  let captureStarted = false;
  const capture = {
    captureMany: async () => {
      captureStarted = true;
      await new Promise(resolve => { release = resolve; });
    },
  };
  const pending = [];
  const app = createTestApp({storeFactory: () => store, captureFactory: () => capture, now: () => new Date('2026-08-18T12:00:00Z')});
  const form = new FormData();
  form.append('source', 'chrome-export');
  form.append('file', new Blob([await fixture('export-small.html')], {type: 'text/html'}), 'bookmarks.html');
  const response = await app.fetch(new Request('https://pile.test/api/import', {method: 'POST', body: form}), {}, {waitUntil: promise => pending.push(promise)});
  assert.equal(response.status, 201);
  assert.equal(captureStarted, true);
  assert.equal(pending.length, 1);
  assert.equal(store.countItems('pile'), 3, 'items are usable before capture completion');
  release();
  await Promise.all(pending);
});
