import assert from 'node:assert/strict';
import {test} from 'node:test';

import {pyfesBrestReference, stageOneFixture} from '../fixtures/brest-stage-one.mjs';
import {MemoryObjectStore} from '../src/object-store.mjs';
import {compareWithPyfes} from '../src/reference-comparison.mjs';
import {createStageOneApp} from '../src/worker.mjs';

async function initializedApp() {
  const store = new MemoryObjectStore();
  const app = createStageOneApp({storeFactory: () => store});
  const response = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(response.status, 200);
  return app;
}

test('the stored harmonic fixture produces ordered finite five-day extremes', async () => {
  const app = await initializedApp();
  const response = await app.fetch(new Request(
    'http://localhost/forecast?lat=48.383&lon=-4.495&start=2025-06-01T00:00:00Z&days=5',
  ));
  assert.equal(response.status, 200);
  const forecast = await response.json();
  assert.equal(forecast.dataset.isFes2022, false);
  assert.equal(forecast.dataset.dataClass, 'test-fixture');
  assert.equal(forecast.engine.nodeCorrections, 'schureman');
  assert.ok(forecast.tides.length >= 18 && forecast.tides.length <= 22);
  assert.ok(forecast.tides.every(event => ['high', 'low'].includes(event.type)));
  assert.ok(forecast.tides.every(event => Number.isFinite(event.height) && event.unit === 'cm'));
  assert.deepEqual(
    forecast.tides.map(event => event.at),
    [...forecast.tides].sort((left, right) => Date.parse(left.at) - Date.parse(right.at)).map(event => event.at),
  );
  assert.match(forecast.warnings[0], /not FES2022/i);
});

test('the first five highs and lows stay within the Stage 1 PyFES tolerance', async () => {
  const app = await initializedApp();
  const response = await app.fetch(new Request(
    'http://localhost/forecast?lat=48.383&lon=-4.495&start=2025-06-01T00:00:00Z&days=5',
  ));
  const forecast = await response.json();
  const comparison = compareWithPyfes(forecast.tides, pyfesBrestReference);
  assert.equal(comparison.comparedEvents, 10);
  assert.equal(comparison.passed, true, JSON.stringify(comparison, null, 2));
  assert.ok(comparison.maxTimeDifferenceMinutes <= 6);
  assert.ok(comparison.maxHeightDifferenceCm <= 5);
});

test('a location outside the initialized fixture fails rather than inventing coverage', async () => {
  const app = await initializedApp();
  const response = await app.fetch(new Request(
    'http://localhost/forecast?lat=-33.8688&lon=151.2093&start=2025-06-01T00:00:00Z&days=5',
  ));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, 'coverage-unavailable');
});

test('forecast coordinates and start time are required explicitly', async () => {
  const app = await initializedApp();
  const response = await app.fetch(new Request('http://localhost/forecast?lat=48.383&lon=-4.495'));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Missing start parameter');
});

test('the committed tile identifies itself as a non-FES test fixture', () => {
  assert.equal(stageOneFixture.dataset.isFes2022, false);
  assert.equal(stageOneFixture.dataset.dataClass, 'test-fixture');
  assert.match(stageOneFixture.dataset.model, /TICON-3/);
  assert.doesNotMatch(stageOneFixture.dataset.displayName, /FES2022/i);
});
