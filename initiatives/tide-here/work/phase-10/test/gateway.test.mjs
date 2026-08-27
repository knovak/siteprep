import assert from 'node:assert/strict';
import {test} from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {createStageTwoApp} from '../src/worker.mjs';

function harness() {
  const store = new MemoryObjectStore();
  const app = createStageTwoApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-27T05:00:00Z'),
  });
  return {app, store};
}

async function initialize(app) {
  const response = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(response.status, 200);
}

async function postForecast(app, body) {
  return app.fetch(new Request('http://localhost/forecast', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  }));
}

test('health and provider discovery expose the exact active registry', async () => {
  const {app} = harness();
  assert.equal((await app.fetch(new Request('http://localhost/health'))).status, 503);
  await initialize(app);
  const health = await (await app.fetch(new Request('http://localhost/health'))).json();
  assert.deepEqual(health.registry, {id: 'tide-here-providers', version: 'stage-2-v1'});
  assert.deepEqual(health.providers.map(provider => [provider.id, provider.execution]), [
    ['noaa', 'browser-direct'],
    ['chs', 'browser-direct'],
    ['australia-standard-ports', 'server-stored'],
    ['fes2022', 'server-stored'],
  ]);
  const providers = await (await app.fetch(new Request('http://localhost/providers'))).json();
  assert.equal(providers.providers.find(provider => provider.id === 'noaa').status, 'active');
  assert.equal(providers.providers.find(provider => provider.id === 'australia-standard-ports').status, 'planned');
});

test('NOAA and CHS remain direct browser providers', async () => {
  const {app} = harness();
  await initialize(app);
  for (const provider of ['noaa', 'chs']) {
    const response = await postForecast(app, {provider});
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'direct-provider-required');
  }
});

test('the stored harmonic adapter returns the existing normalized response shape', async () => {
  const {app} = harness();
  await initialize(app);
  const rows = fiveLocalDays('2025-06-01T10:00:00Z', 'Europe/Paris');
  const response = await postForecast(app, {
    provider: 'fes2022',
    context: {
      input: {display: 'Brest'},
      place: {name: 'Brest, France', lat: 48.383, lon: -4.495},
      coast: {name: 'Brest', distanceKm: 0},
    },
    station: {id: 'brest-ticon3', country: 'FR', latitude: 48.383, longitude: -4.495},
    timeZone: 'Europe/Paris',
    rows,
  });
  assert.equal(response.status, 200);
  const forecast = await response.json();
  assert.deepEqual(Object.keys(forecast), ['input', 'place', 'coast', 'station', 'timeZone', 'days', 'sources', 'warnings']);
  assert.equal(forecast.station.provider, 'fes2022');
  assert.equal(forecast.days.length, 5);
  assert.ok(forecast.days.flatMap(day => day.tides).length >= 18);
  assert.equal(forecast.sources[0].dataClass, 'test-fixture');
  assert.equal(forecast.sources[0].approximate, true);
  assert.equal(forecast.warnings[0].code, 'approximate-fallback');
});

test('hosted initialization remains closed without the configured token', async () => {
  const {app, store} = harness();
  const response = await app.fetch(new Request('https://stage-two.example/init', {method: 'POST'}), {
    INIT_TOKEN: 'secret',
  });
  assert.equal(response.status, 403);
  assert.equal(store.writeLog.length, 0);
});
