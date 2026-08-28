import assert from 'node:assert/strict';
import {test} from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {pyfesBrestReference} from '../../phase-9/fixtures/brest-stage-one.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {compareWithPyfes} from '../../phase-9/src/reference-comparison.mjs';
import {ACTIVE_REGISTRY_KEY, selectProvider} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {stageFourProviderRegistry} from '../fixtures/provider-registry.mjs';
import {initializeStageFour} from '../src/stage-four.mjs';
import {createStageFourApp} from '../src/worker.mjs';

const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();

function harness() {
  const store = new MemoryObjectStore();
  const app = createStageFourApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-27T18:00:00Z'),
  });
  return {app, store};
}

async function initialize(app) {
  const response = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(response.status, 200);
  return response.json();
}

function postForecast(app, body) {
  return app.fetch(new Request('http://localhost/forecast', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  }));
}

function fesRequest({latitude = 48.383, longitude = -4.495, timeZone = 'Europe/Paris'} = {}) {
  return {
    provider: 'fes2022',
    context: {
      input: {display: `${latitude}, ${longitude}`},
      place: {name: 'Model test place', lat: latitude, lon: longitude},
      coast: {name: 'Nearest initialized model point', distanceKm: 0},
    },
    station: {id: 'requested-model-point', latitude, longitude},
    timeZone,
    rows: fiveLocalDays('2025-06-01T10:00:00Z', timeZone),
  };
}

test('Stage 4 initializes complete inventories and activates the registry last without repeat writes', async () => {
  const store = new MemoryObjectStore();
  const first = await initializeStageFour(store, {now: () => new Date('2026-08-27T18:00:00Z')});
  assert.equal(store.writeLog.at(-1), ACTIVE_REGISTRY_KEY);
  assert.equal(first.australia.created.length, 3);
  assert.equal(first.fes.created.length, 6);
  assert.equal(first.registry.created.length, 2);
  const writes = store.writeLog.length;
  const second = await initializeStageFour(store, {now: () => new Date('2026-08-27T19:00:00Z')});
  assert.equal(store.writeLog.length, writes);
  assert.equal(second.australia.unchanged.length, 3);
  assert.equal(second.fes.unchanged.length, 6);
  assert.equal(second.registry.unchanged.length, 2);
});

test('national providers still outrank the Stage 4 fallback', () => {
  assert.equal(selectProvider(stageFourProviderRegistry, {countryCode: 'US', includeFixtures: true}).id, 'noaa');
  assert.equal(selectProvider(stageFourProviderRegistry, {countryCode: 'AU', includeFixtures: true}).id, 'australia-standard-ports');
  assert.equal(selectProvider(stageFourProviderRegistry, {countryCode: 'IE', includeFixtures: true}).id, 'fes2022');
});

test('health exposes the exact Australian and FES fixture versions', async () => {
  const {app} = harness();
  await initialize(app);
  const health = await (await app.fetch(new Request('http://localhost/health'))).json();
  assert.deepEqual(health.registry, {id: 'tide-here-providers', version: 'stage-4-v4'});
  assert.deepEqual(
    health.providers.find(provider => provider.id === 'fes2022').dataset,
    {id: 'fes-shaped-global-sample', version: '2026-08-27'},
  );
});

test('the FES fallback returns normalized approximate five-day tides', async () => {
  const {app} = harness();
  await initialize(app);
  const response = await postForecast(app, fesRequest());
  assert.equal(response.status, 200);
  const forecast = await response.json();
  assert.deepEqual(Object.keys(forecast), ['input', 'place', 'coast', 'station', 'timeZone', 'days', 'sources', 'warnings']);
  assert.equal(forecast.days.length, 5);
  assert.ok(forecast.days.flatMap(day => day.tides).length >= 18);
  assert.ok(forecast.days.flatMap(day => day.tides).every(event => event.unit === 'm'));
  assert.equal(forecast.sources[0].approximate, true);
  assert.equal(forecast.sources[0].official, false);
  assert.deepEqual(forecast.warnings.map(warning => warning.code), ['approximate-fallback', 'fixture-data']);
});

test('the Brest runtime remains within the independent PyFES feasibility tolerance', async () => {
  const {app} = harness();
  await initialize(app);
  const forecast = await (await postForecast(app, fesRequest())).json();
  const events = forecast.days.flatMap(day => day.tides).map(event => ({...event, height: event.height * 100}));
  const comparison = compareWithPyfes(events, pyfesBrestReference);
  assert.equal(comparison.passed, true, JSON.stringify(comparison, null, 2));
});

test('separate initialized tiles serve Ireland and South Africa model points', async () => {
  const {app} = harness();
  await initialize(app);
  for (const location of [
    {latitude: 53.27, longitude: -9.05, timeZone: 'Europe/Dublin'},
    {latitude: -33.92, longitude: 18.42, timeZone: 'Africa/Johannesburg'},
  ]) {
    const response = await postForecast(app, fesRequest(location));
    assert.equal(response.status, 200);
    assert.ok((await response.json()).days.flatMap(day => day.tides).length >= 18);
  }
});

test('land or missing tile coverage fails explicitly', async () => {
  const {app} = harness();
  await initialize(app);
  const response = await postForecast(app, fesRequest({latitude: 39.7392, longitude: -104.9903, timeZone: 'America/Denver'}));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, 'coverage-unavailable');
});

test('the Australian stored adapter remains available beside the fallback', async () => {
  const {app} = harness();
  await initialize(app);
  const station = australiaPreparedOfficial.stations[0];
  const response = await postForecast(app, {
    provider: 'australia-standard-ports',
    context: {
      input: {display: station.name},
      place: {name: station.name, lat: station.latitude, lon: station.longitude},
      coast: {name: station.name, distanceKm: 0},
    },
    station: {id: station.id},
    timeZone: station.timeZone,
    rows: fiveLocalDays('2026-08-27T12:00:00Z', station.timeZone),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).station.provider, 'australia-standard-ports');
});
