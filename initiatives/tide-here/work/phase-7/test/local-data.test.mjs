import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FORECAST_CACHE_INDEX_KEY,
  FORECAST_CACHE_PREFIX,
  ForecastCache,
  HISTORY_KEY,
  HISTORY_LIMIT,
  LocalHistory,
  coastHour
} from '../src/local-data.mjs';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
}

function forecast(marker = 'Seattle') {
  return {
    input: { display: marker },
    place: { name: `${marker}, Washington`, lat: 47.6, lon: -122.3 },
    coast: { name: 'SEATTLE', distanceKm: 2 },
    station: { provider: 'noaa', id: '9447130', name: 'SEATTLE' },
    timeZone: 'America/Los_Angeles',
    days: [],
    sources: [],
    warnings: []
  };
}

test('history appends complete responses, survives malformed storage, and keeps the newest 100', () => {
  const storage = memoryStorage();
  storage.setItem(HISTORY_KEY, '{bad json');
  let tick = 0;
  const history = new LocalHistory({ storage, now: () => new Date(1_780_000_000_000 + tick++ * 1000) });
  for (let index = 0; index < HISTORY_LIMIT + 1; index += 1) history.append(forecast(`Place ${index}`));
  const entries = history.read();
  assert.equal(entries.length, HISTORY_LIMIT);
  assert.equal(entries[0].response.input.display, 'Place 1');
  assert.equal(entries.at(-1).response.input.display, 'Place 100');
  assert.match(history.downloadText(), /"recordedAt"/);
});

test('clearing history removes only the documented history key', () => {
  const storage = memoryStorage();
  const history = new LocalHistory({ storage });
  history.append(forecast());
  storage.setItem('tide-here.station-catalogue.v2', 'cached stations');
  history.clear();
  assert.equal(storage.getItem(HISTORY_KEY), null);
  assert.equal(storage.getItem('tide-here.station-catalogue.v2'), 'cached stations');
});

test('forecast cache keys are hashed and expire when the coast-local hour changes', async () => {
  const storage = memoryStorage();
  let now = new Date('2026-08-22T08:30:00.000Z');
  const cache = new ForecastCache({ storage, now: () => now });
  const context = {
    input: 'Private Harbor Name',
    station: { provider: 'noaa', id: '9447130' },
    timeZone: 'America/Los_Angeles'
  };
  const key = await cache.key(context);
  assert.ok(key.startsWith(FORECAST_CACHE_PREFIX));
  assert.doesNotMatch(key, /private|harbor/i);
  assert.equal(await cache.read(context), null);
  await cache.write(context, forecast('Private Harbor Name'));
  assert.equal((await cache.read(context)).input.display, 'Private Harbor Name');
  now = new Date('2026-08-22T09:01:00.000Z');
  assert.equal(await cache.read(context), null);
  assert.deepEqual(JSON.parse(storage.getItem(FORECAST_CACHE_INDEX_KEY)), [key]);
});

test('coast-hour keys follow the selected coast rather than the device zone', () => {
  const instant = '2026-11-01T08:30:00.000Z';
  assert.equal(coastHour(instant, 'America/Los_Angeles'), '2026-11-01T01');
  assert.equal(coastHour(instant, 'America/Halifax'), '2026-11-01T04');
});

test('history and cache code contain no implicit device-zone date operations', async () => {
  const sources = await Promise.all([
    readFile(new URL('../src/local-data.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../phase-6/app.mjs', import.meta.url), 'utf8')
  ]);
  for (const forbidden of [
    '.getFullYear(', '.getMonth(', '.getDate(', '.getHours(', '.getMinutes(',
    '.setFullYear(', '.setMonth(', '.setDate(', '.toLocaleString(',
    '.toLocaleDateString(', '.toLocaleTimeString('
  ]) assert.ok(sources.every((source) => !source.includes(forbidden)), `forbidden device-zone operation: ${forbidden}`);
});
