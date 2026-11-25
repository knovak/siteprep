import assert from 'node:assert/strict';
import {test} from 'node:test';

import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {createStageFourApp} from '../../phase-12/src/worker.mjs';
import {createStageFiveApp} from '../../phase-13/src/stage-five.mjs';
import {rankTide, recordMatches} from '../src/extremity.mjs';

const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();

async function initializedApp() {
  const store = new MemoryObjectStore();
  const app = createStageFourApp({storeFactory: () => store, now: () => new Date('2026-08-27T18:00:00Z')});
  const response = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(response.status, 200);
  return app;
}

function postExtremity(app, body) {
  return app.fetch(new Request('http://localhost/extremity', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  }));
}

async function fesPoint(app, latitude, longitude) {
  const response = await app.fetch(new Request('http://localhost/resolve', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({provider: 'fes2022', latitude, longitude}),
  }));
  assert.equal(response.status, 200);
  return (await response.json()).station;
}

test('a Bureau port record is ranked against its stored annual predictions', async () => {
  const app = await initializedApp();
  const station = australiaPreparedOfficial.stations[0];
  const response = await postExtremity(app, {provider: 'australia-standard-ports', station: {id: station.id}, year: 2026});
  assert.equal(response.status, 200);
  const record = await response.json();
  assert.ok(recordMatches(record, {provider: 'australia-standard-ports', stationId: station.id, datum: station.datum, unit: 'm', year: 2026}));
  assert.ok(record.highCount > 600 && record.lowCount > 600);
  assert.equal(rankTide(record, {type: 'high', height: record.high.at(-1)}).level, 'exceptional');
});

test('a Bureau record for a year that is not loaded is refused', async () => {
  const app = await initializedApp();
  const station = australiaPreparedOfficial.stations[0];
  const response = await postExtremity(app, {provider: 'australia-standard-ports', station: {id: station.id}, year: 2027});
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, 'dataset-year-unavailable');
});

test('an FES model-point record is generated from the point constituents in metres', async () => {
  const app = await initializedApp();
  const point = await fesPoint(app, -15.4667, 145.2833);
  const response = await postExtremity(app, {
    provider: 'fes2022',
    station: {id: point.id, latitude: point.latitude, longitude: point.longitude},
    year: 2026,
  });
  assert.equal(response.status, 200);
  const record = await response.json();
  assert.ok(recordMatches(record, {provider: 'fes2022', stationId: point.id, datum: point.datum, unit: 'm', year: 2026}));
  assert.ok(record.highCount > 650 && record.lowCount > 650);
  assert.ok(record.high.at(-1) < 5 && record.low[0] > -5, 'heights are metres, not centimetres');
});

test('an unknown FES point and a browser-direct provider are refused', async () => {
  const app = await initializedApp();
  const missing = await postExtremity(app, {provider: 'fes2022', station: {id: 'no-such-point', latitude: -15.4667, longitude: 145.2833}, year: 2026});
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).code, 'coverage-unavailable');
  const direct = await postExtremity(app, {provider: 'noaa', station: {id: '9447130'}, year: 2026});
  assert.equal((await direct.json()).code, 'provider-not-ready');
});

test('the Stage 5 entry point routes /extremity and logs only the provider', async () => {
  const store = new MemoryObjectStore();
  const lines = [];
  const app = createStageFiveApp({storeFactory: () => store, logger: {info: (line) => lines.push(JSON.parse(line))}});
  await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  const station = australiaPreparedOfficial.stations[0];
  const response = await postExtremity(app, {provider: 'australia-standard-ports', station: {id: station.id}, year: 2026});
  assert.equal(response.status, 200);
  const logged = lines.find((line) => line.route === '/extremity');
  assert.deepEqual(Object.keys(logged).sort(), ['durationMs', 'event', 'method', 'provider', 'route', 'status']);
  assert.equal(logged.provider, 'australia-standard-ports');
});
