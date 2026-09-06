import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {createReviewWorker} from '../src/review-worker.mjs';

const seed = {store_id: 'review-test', stories: [
  {id: 'a', verdict: null, verdict_at: null},
  {id: 'b', verdict: 'kept', verdict_at: '2026-08-01T00:00:00.000Z'},
]};
function database(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_needy_virginia_dare.sql', import.meta.url), 'utf8'));
  t.after(() => sqlite.close());
  return {prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {bind(...values) { return {
      async run() { return statement.run(...values); },
      async first() { return statement.get(...values) ?? null; },
    }; }};
  }};
}
function request(worker, DB, {method = 'GET', changes, revision = 0, store_id = seed.store_id, headers = {}, body} = {}) {
  return worker.fetch(new Request('https://review.test/api/verdicts?store_id=' + store_id, {
    method, headers: {'oai-authenticated-user-id': 'owner', origin: 'https://review.test', 'content-type': 'application/json', ...headers},
    body: method === 'GET' ? undefined : body ?? JSON.stringify({revision, changes}),
  }), {DB});
}

test('database survives a new Worker, preserves seeds, and atomically saves and undoes several stories', async t => {
  const DB = database(t); let worker = createReviewWorker({seed, html: ''});
  const initial = await (await request(worker, DB)).json();
  assert.equal(initial.judgments.b.verdict, 'kept');
  let response = await request(worker, DB, {method: 'PATCH', changes: [{id: 'a', verdict: 'emphasised'}, {id: 'b', verdict: 'dropped'}]});
  assert.equal(response.status, 200);
  worker = createReviewWorker({seed, html: ''});
  const saved = await (await request(worker, DB)).json();
  assert.equal(saved.revision, 1);
  assert.equal(saved.judgments.a.verdict, 'emphasised');
  assert.equal(saved.judgments.b.verdict, 'dropped');
  assert.equal(saved.judgments.a.verdict_at, saved.judgments.b.verdict_at);
  response = await request(worker, DB, {method: 'PATCH', revision: 1, changes: [{id: 'a', verdict: null}, {id: 'b', verdict: 'kept'}]});
  const undone = await response.json();
  assert.equal(undone.judgments.a.verdict, null);
  assert.ok(undone.judgments.a.verdict_at);
  assert.equal(undone.judgments.b.verdict, 'kept');
});

test('stale and racing browser writes cannot replace newer database choices', async t => {
  const DB = database(t), worker = createReviewWorker({seed, html: ''});
  await request(worker, DB);
  const responses = await Promise.all(['kept', 'dropped'].map(verdict => request(worker, DB, {method: 'PATCH', changes: [{id: 'a', verdict}]})));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const conflict = await responses.find(response => response.status === 409).json();
  assert.equal(conflict.revision, 1);
  const stale = await request(worker, DB, {method: 'PATCH', changes: [{id: 'b', verdict: 'dropped'}]});
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).judgments.b.verdict, 'kept');
});

test('a rebuilt harvest adds new IDs without overwriting saved choices', async t => {
  const DB = database(t), worker = createReviewWorker({seed, html: ''});
  await request(worker, DB, {method: 'PATCH', changes: [{id: 'a', verdict: 'dropped'}]});
  const rebuilt = createReviewWorker({seed: {...seed, stories: [...seed.stories, {id: 'c', verdict: null}]}, html: ''});
  const state = await (await request(rebuilt, DB)).json();
  assert.equal(state.judgments.a.verdict, 'dropped');
  assert.equal(state.judgments.c.verdict, null);
});

test('anonymous, cross-origin, wrong-store and invalid writes are refused without partial mutation', async t => {
  const DB = database(t), worker = createReviewWorker({seed, html: 'private content'});
  assert.equal((await worker.fetch(new Request('https://review.test/'), {DB})).status, 401);
  assert.equal((await request(worker, DB, {headers: {'oai-authenticated-user-id': ''}})).status, 401);
  assert.equal((await request(worker, DB, {store_id: 'wrong'})).status, 409);
  assert.equal((await request(worker, DB, {method: 'PATCH', headers: {origin: 'https://other.test'}})).status, 403);
  for (const changes of [[{id: 'a', verdict: 'kept'}, {id: 'missing', verdict: 'kept'}], [{id: 'a', verdict: 'invented'}], [{id: 'a', verdict: 'kept'}, {id: 'a', verdict: 'dropped'}]]) {
    assert.equal((await request(worker, DB, {method: 'PATCH', changes})).status, 400);
  }
  assert.equal((await request(worker, DB, {method: 'PATCH', body: '{broken'})).status, 400);
  assert.equal((await request(worker, DB, {method: 'PATCH', body: 'x'.repeat(250001)})).status, 413);
  assert.equal((await (await request(worker, DB)).json()).revision, 0);
  const broken = {prepare() { throw new Error('private internals'); }};
  const failed = await request(worker, broken);
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private internals/);
});
