import assert from 'node:assert/strict';
import {test} from 'node:test';

import {ACTIVE_MANIFEST_KEY} from '../src/dataset.mjs';
import {MemoryObjectStore} from '../src/object-store.mjs';
import {createStageOneApp} from '../src/worker.mjs';

function harness() {
  const store = new MemoryObjectStore();
  const app = createStageOneApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-26T12:00:00.000Z'),
  });
  return {app, store};
}

test('health is not ready until the dataset is initialized', async () => {
  const {app} = harness();
  const response = await app.fetch(new Request('http://localhost/health'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {ready: false, reason: 'not-initialized'});
});

test('the initializer writes versioned objects, activates last, and is idempotent', async () => {
  const {app, store} = harness();
  const firstResponse = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json();
  assert.equal(first.created.length, 3);
  assert.deepEqual(first.updated, []);
  assert.deepEqual(first.unchanged, []);
  assert.equal(store.writeLog.at(-1), ACTIVE_MANIFEST_KEY);
  assert.match(store.writeLog[0], /\/tiles\/brest-stage-one[.]json$/);
  assert.match(store.writeLog[1], /\/manifest[.]json$/);

  const writesAfterFirst = store.writeLog.length;
  const secondResponse = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(secondResponse.status, 200);
  const second = await secondResponse.json();
  assert.deepEqual(second.created, []);
  assert.deepEqual(second.updated, []);
  assert.equal(second.unchanged.length, 3);
  assert.equal(store.writeLog.length, writesAfterFirst);

  const healthResponse = await app.fetch(new Request('http://localhost/health'));
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), {
    ready: true,
    dataset: {id: 'ticon3-brest-pyfes-example', version: '2026-08-26'},
    dataClass: 'test-fixture',
    isFes2022: false,
  });
});

test('hosted initialization requires the configured bearer token', async () => {
  const {app, store} = harness();
  const denied = await app.fetch(new Request('https://stage-one.example/init', {method: 'POST'}), {
    INIT_TOKEN: 'stage-one-secret',
  });
  assert.equal(denied.status, 403);
  assert.equal(store.writeLog.length, 0);

  const allowed = await app.fetch(new Request('https://stage-one.example/init', {
    method: 'POST',
    headers: {authorization: 'Bearer stage-one-secret'},
  }), {INIT_TOKEN: 'stage-one-secret'});
  assert.equal(allowed.status, 200);
  assert.equal(store.writeLog.length, 3);
});

test('a hosted deployment without an initializer token remains closed', async () => {
  const {app} = harness();
  const response = await app.fetch(new Request('https://stage-one.example/init', {method: 'POST'}));
  assert.equal(response.status, 403);
});

test('GET cannot mutate storage through the initializer route', async () => {
  const {app, store} = harness();
  const response = await app.fetch(new Request('http://localhost/init'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.equal(store.writeLog.length, 0);
});

test('an existing versioned object cannot be overwritten under the same dataset version', async () => {
  const {app, store} = harness();
  const tileKey = 'tide-data/datasets/ticon3-brest-pyfes-example/2026-08-26/tiles/brest-stage-one.json';
  await store.put(tileKey, '{"corrupt":true}');
  const response = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Immutable dataset object conflicts/);
  assert.equal((await store.get(tileKey)).body, '{"corrupt":true}');
});
