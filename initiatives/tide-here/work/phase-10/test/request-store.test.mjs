import assert from 'node:assert/strict';
import {test} from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {createStageThreeApp} from '../../phase-11/src/worker.mjs';
import {requestObjectStore} from '../src/request-store.mjs';

test('request-local reads coalesce and a write invalidates even a cached absence', async () => {
  const underlying = new MemoryObjectStore();
  let reads = 0;
  const store = requestObjectStore({
    get: key => { reads += 1; return underlying.get(key); },
    put: (...args) => underlying.put(...args),
  });
  assert.deepEqual(await Promise.all([store.get('value'), store.get('value')]), [null, null]);
  assert.equal(reads, 1);
  await store.put('value', 'first');
  assert.equal((await store.get('value')).body, 'first');
  assert.equal(reads, 2);
  await store.put('value', 'second');
  assert.equal((await store.get('value')).body, 'second');
  assert.equal(reads, 3);
});

test('Australian catalogue and forecast read each object once per request and recheck corruption next time', async () => {
  const underlying = new MemoryObjectStore();
  const reads = new Map();
  const app = createStageThreeApp({
    storeFactory: () => ({
      get: key => { reads.set(key, (reads.get(key) ?? 0) + 1); return underlying.get(key); },
      put: (...args) => underlying.put(...args),
    }),
  });
  assert.equal((await app.fetch(new Request('http://localhost/init', {method: 'POST'}))).status, 200);
  reads.clear();
  const catalogueResponse = await app.fetch(new Request('http://localhost/stations?provider=australia-standard-ports'));
  assert.equal(catalogueResponse.status, 200);
  assert.ok([...reads.values()].every(count => count === 1));
  const predictionKey = [...reads.keys()].find(key => key.includes('/australia-bom-annual-tides/') && key.endsWith('/predictions.json'));
  assert.ok(predictionKey);
  const catalogue = await catalogueResponse.json();
  const station = catalogue.stations.find(port => port.id === 'au-qld-brisbane-bar');
  assert.ok(station);
  const body = {
    provider: 'australia-standard-ports',
    context: {
      input: {display: 'Brisbane'},
      place: {name: 'Brisbane', lat: -27.47, lon: 153.03},
      coast: {name: station.name, distanceKm: 10},
    },
    station: {id: station.id},
    timeZone: station.timeZone,
    rows: fiveLocalDays('2026-10-20T01:00:00Z', station.timeZone),
  };
  const request = () => new Request('http://localhost/forecast', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body),
  });
  reads.clear();
  const forecast = await app.fetch(request());
  assert.equal(forecast.status, 200);
  assert.ok((await forecast.json()).days.some(day => day.tides.length > 0));
  assert.equal(reads.get(predictionKey), 1);
  assert.ok([...reads.values()].every(count => count === 1));

  await underlying.put(predictionKey, '{"corrupted":true}');
  reads.clear();
  const corrupted = await app.fetch(request());
  assert.equal(corrupted.status, 503);
  assert.equal((await corrupted.json()).reason, 'provider-dataset-unavailable');
  assert.equal(reads.get(predictionKey), 1);
});
