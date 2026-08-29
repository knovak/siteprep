import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {createStageFiveApp} from '../src/stage-five.mjs';

function harness() {
  const store = new MemoryObjectStore();
  const logs = [];
  const app = createStageFiveApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-27T18:30:00Z'),
    logger: {info: value => logs.push(value)},
  });
  return {app, store, logs};
}

test('hosted Stage 5 initialization is protected, exact and idempotent', async () => {
  const {app, store} = harness();
  const env = {INIT_TOKEN: 'stage-five-secret'};
  const denied = await app.fetch(new Request('https://tide.example/init', {method: 'POST'}), env);
  assert.equal(denied.status, 403);
  assert.equal(store.writeLog.length, 0);

  const initialized = new Request('https://tide.example/init', {
    method: 'POST',
    headers: {authorization: 'Bearer stage-five-secret'},
  });
  const first = await app.fetch(initialized, env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).stage, 4);
  const writes = store.writeLog.length;
  const second = await app.fetch(new Request('https://tide.example/init', {
    method: 'POST',
    headers: {authorization: 'Bearer stage-five-secret'},
  }), env);
  assert.equal(second.status, 200);
  assert.equal(store.writeLog.length, writes);
  const health = await (await app.fetch(new Request('https://tide.example/health'), env)).json();
  assert.deepEqual(health.registry, {id: 'tide-here-providers', version: 'stage-4-v7'});
});

test('operational logs contain route outcomes but never submitted locations', async () => {
  const {app, logs} = harness();
  const resolution = await app.fetch(new Request('http://localhost/resolve', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({provider: 'fes2022', latitude: 48.383, longitude: -4.495}),
  }));
  assert.equal(resolution.status, 503);
  const response = await app.fetch(new Request('http://localhost/forecast', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      provider: 'fes2022',
      context: {
        input: {display: 'SECRET PLACE NAME'},
        place: {name: 'SECRET PLACE NAME', lat: 48.383, lon: -4.495},
        coast: {name: 'SECRET COAST', distanceKm: 0},
      },
      station: {id: 'secret-station', latitude: 48.383, longitude: -4.495},
      timeZone: 'Europe/Paris',
      rows: fiveLocalDays('2025-06-01T10:00:00Z', 'Europe/Paris'),
    }),
  }));
  assert.equal(response.status, 503);
  assert.equal(logs.length, 2);
  const log = JSON.parse(logs[1]);
  assert.deepEqual(
    {event: log.event, route: log.route, method: log.method, status: log.status, provider: log.provider},
    {event: 'tide-here-request', route: '/forecast', method: 'POST', status: 503, provider: 'fes2022'},
  );
  assert.doesNotMatch(logs.join('\n'), /SECRET|48[.]383|-4[.]495/);
});

test('the Sites project declares only the Tide Here R2 binding', async () => {
  const hosting = JSON.parse(await readFile(new URL('../../.openai/hosting.json', import.meta.url), 'utf8'));
  assert.match(hosting.project_id, /^appgprj_[a-f0-9]{32}$/);
  assert.equal(hosting.d1, null);
  assert.equal(hosting.r2, 'TIDE_DATA');
  const worker = await readFile(new URL('../../worker/index.ts', import.meta.url), 'utf8');
  assert.match(worker, /TIDE_DATA: R2Bucket/);
  assert.match(worker, /INIT_TOKEN[?]: string/);
  assert.match(worker, /\/phase-\[0-7\]/);
});

test('the static staging allowlist excludes tests and initiative records', async () => {
  const script = await readFile(new URL('../scripts/stage-static.mjs', import.meta.url), 'utf8');
  assert.match(script, /phase-6\/index[.]html/);
  assert.match(script, /phase-7\/src/);
  assert.doesNotMatch(script, /README|evidence|\/test['"`]/);
});

test('the live smoke script covers initialization and all three source families', async () => {
  const script = await readFile(new URL('../scripts/smoke-test.mjs', import.meta.url), 'utf8');
  assert.match(script, /const first = await initialize/);
  assert.match(script, /const second = await initialize/);
  assert.match(script, /\['noaa', 'chs'\]/);
  assert.match(script, /australia-standard-ports/);
  assert.match(script, /catalogue[.]stations[.]length !== 76/);
  assert.match(script, /for \(const station of catalogue[.]stations\)/);
  assert.match(script, /!australia[.]sources\[0\][.]official/);
  assert.match(script, /bom[.]gov[.]au\/ntc\/IDO59001/);
  assert.match(script, /request\('\/resolve'/);
  assert.match(script, /fes2022-galway/);
  assert.match(script, /fes2022-cooktown/);
  assert.match(script, /fes2022-gibraltar/);
  assert.match(script, /licensed-source/);
  assert.match(script, /provider: 'fes2022'/);
});
