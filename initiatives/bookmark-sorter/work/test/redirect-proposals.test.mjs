import assert from 'node:assert/strict';
import {test} from 'node:test';

import {D1BookmarkStore} from '../src/d1-store.mjs';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {sqliteStoreDatabase} from './sqlite-d1.mjs';

const at = '2026-09-08T01:00:00Z';

function candidate(url, title, {tags = [], note = null, addedAt = null, verdict = null, verdictAt = null} = {}) {
  return {
    url,
    url_key: url,
    title,
    title_key: title.toLowerCase().replaceAll(' ', '-'),
    note,
    added_at: addedAt,
    ingested_at: at,
    verdict,
    verdict_at: verdictAt,
    tags,
  };
}

async function exerciseRedirects(store) {
  await store.ensureCollection({id: 'pile', name: 'Pile', createdAt: at});
  await store.ingestCandidates('pile', [
    candidate('https://old.example/article', 'Moved article', {
      tags: ['src:old', 'topic:shared'], note: 'Source note', addedAt: '2020-01-01T00:00:00Z',
      verdict: 'keeper', verdictAt: '2026-09-01T00:00:00Z',
    }),
    candidate('https://old.example/solo', 'Solo redirect', {tags: ['src:solo']}),
    candidate('https://new.example/article', 'Canonical article', {
      tags: ['src:new', 'topic:shared'], note: 'Destination note', addedAt: '2021-01-01T00:00:00Z',
      verdict: 'archive', verdictAt: '2026-09-02T00:00:00Z',
    }),
  ]);
  await store.upsertCapture({
    url_key: 'https://old.example/article', source: 'none', state: 'pass1-gap', captured_at: at,
    image_ref: null, image_hash: null, page_title: null, description: null, favicon_url: null,
    error_tag: null, image_candidate: null, content_type: null, width: null, height: null, byte_size: null,
    final_url: 'https://new.example/article?utm_source=capture',
  });
  await store.upsertCapture({
    url_key: 'https://old.example/solo', source: 'none', state: 'pass1-gap', captured_at: at,
    image_ref: null, image_hash: null, page_title: null, description: null, favicon_url: null,
    error_tag: null, image_candidate: null, content_type: null, width: null, height: null, byte_size: null,
    final_url: 'https://new.example/solo',
  });

  const proposals = await store.listRedirectProposals('pile');
  assert.deepEqual(proposals.map(proposal => [proposal.id, proposal.mode]).sort((a, b) => a[1].localeCompare(b[1])), [
    [proposals.find(proposal => proposal.title === 'Moved article').id, 'merge'],
    [proposals.find(proposal => proposal.title === 'Solo redirect').id, 'replace'],
  ]);
  const session = await store.startSession('pile', {id: 'session', startedAt: at});

  const replacement = proposals.find(proposal => proposal.mode === 'replace');
  const replaced = await store.applyRedirectProposal('pile', {
    itemId: replacement.id, at: '2026-09-08T01:01:00Z', sessionId: session.id, actionId: 'replace-action',
  });
  assert.equal(replaced.mode, 'replace');
  assert.equal((await store.listAllItems('pile')).find(item => item.id === replacement.id).url, 'https://new.example/solo');
  assert.equal((await store.listRedirectProposals('pile')).length, 1);
  assert.equal((await store.undoLast('pile', {sessionId: session.id, at: '2026-09-08T01:02:00Z'})).kind, 'redirect');
  assert.equal((await store.listAllItems('pile')).find(item => item.id === replacement.id).url, 'https://old.example/solo');

  const merge = (await store.listRedirectProposals('pile')).find(proposal => proposal.mode === 'merge');
  const merged = await store.applyRedirectProposal('pile', {
    itemId: merge.id, at: '2026-09-08T01:03:00Z', sessionId: session.id, actionId: 'merge-action',
  });
  assert.equal(merged.mode, 'merge');
  assert.equal(await store.countItems('pile'), 2);
  const destination = (await store.listAllItems('pile')).find(item => item.url_key === 'https://new.example/article');
  assert.deepEqual(destination.tags, ['src:new', 'src:old', 'topic:shared']);
  assert.equal(destination.note, 'Destination note');
  assert.equal(destination.added_at, '2020-01-01T00:00:00Z');
  assert.equal(destination.verdict, 'archive');

  const undone = await store.undoLast('pile', {sessionId: session.id, at: '2026-09-08T01:04:00Z'});
  assert.equal(undone.kind, 'redirect');
  assert.equal(await store.countItems('pile'), 3);
  const restoredSource = (await store.listAllItems('pile')).find(item => item.url_key === 'https://old.example/article');
  const restoredDestination = (await store.listAllItems('pile')).find(item => item.url_key === 'https://new.example/article');
  assert.deepEqual(restoredSource.tags, ['src:old', 'topic:shared']);
  assert.deepEqual(restoredDestination.tags, ['src:new', 'topic:shared']);
  assert.equal(restoredDestination.added_at, '2021-01-01T00:00:00Z');
}

test('memory redirect proposals replace or merge only after confirmation and undo exactly', async () => {
  const store = new MemoryBookmarkStore();
  store.ensureCollection = collection => {
    if (!store.hasCollection(collection.id)) store.createCollection(collection);
    return store.ownedCollection(collection.id);
  };
  await exerciseRedirects(store);
});

test('D1 redirect proposals replace or merge atomically and undo exactly', async () => {
  const {d1} = await sqliteStoreDatabase();
  let sequence = 0;
  const store = new D1BookmarkStore(d1, {idFactory: () => `item-${++sequence}`});
  await exerciseRedirects(store);
});
