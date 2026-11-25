import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

import {
  buildExtremityRecord,
  classifyExtrema,
  EXCEPTIONAL,
  extremitySentence,
  NOTABLE,
  rankTide,
  recordMatches,
} from '../src/extremity.mjs';
import {
  chsYearEvents,
  chsYearUrl,
  fetchDirectExtremityRecord,
  noaaYearEvents,
  noaaYearUrl,
} from '../src/extremity-sources.mjs';
import {
  EXTREMITY_CACHE_PREFIX,
  ExtremityCache,
  ExtremityLoader,
  extremityExpiresAt,
  extremityKey,
  extremityTarget,
} from '../src/extremity-cache.mjs';

const config = JSON.parse(await readFile(new URL('../../phase-2/data/provider-config.json', import.meta.url), 'utf8'));
const noaaYear = JSON.parse(await readFile(new URL('../fixtures/noaa-9447130-2026-hilo.fixture.json', import.meta.url), 'utf8'));
const chsYear = JSON.parse(await readFile(new URL('../fixtures/chs-5cebf1df3d0f4a073c4bbcbb-2026-hilo.fixture.json', import.meta.url), 'utf8'));
const seattle = {provider: 'noaa', stationId: '9447130', datum: 'MLLW', unit: 'm', year: 2026};

function seattleRecord() {
  return buildExtremityRecord({...seattle, events: noaaYearEvents(noaaYear, 2026), computedAt: '2026-11-24T20:31:05Z'});
}

class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

test('the Seattle 2026 record matches the measured quantiles in the specification', () => {
  const record = seattleRecord();
  assert.equal(record.highCount, 705);
  assert.equal(record.lowCount, 705);
  assert.deepEqual(record.high, [2.26, 2.302, 2.42, 2.594, 2.856, 2.933, 3.265, 3.501, 3.542, 3.649, 3.741, 3.84, 3.907]);
  assert.deepEqual(record.low, [-1.165, -1.074, -0.801, -0.493, -0.196, -0.057, 0.81, 1.972, 2.155, 2.378, 2.473, 2.591, 2.653]);
  assert.ok(JSON.stringify(record).length < 600, 'the record stays small');
  assert.ok(recordMatches(record, seattle));
});

test('only high highs and low lows are marked, at 20% and 5%', () => {
  const record = seattleRecord();
  // The 24-28 November 2026 Seattle week used by the mockups. N is
  // interpolated between stored quantiles: an exact count gives 11% here.
  assert.deepEqual(rankTide(record, {type: 'high', height: 3.636}), {type: 'high', level: NOTABLE, top: 12, count: 705, year: 2026});
  assert.equal(rankTide(record, {type: 'high', height: 3.862}).level, EXCEPTIONAL);
  assert.equal(rankTide(record, {type: 'high', height: 3.475}), null);
  assert.equal(rankTide(record, {type: 'low', height: -1.172}).level, EXCEPTIONAL);
  assert.equal(rankTide(record, {type: 'low', height: -1.172}).top, 1);
  // A high low tide and a low high tide are never marked.
  assert.equal(rankTide(record, {type: 'low', height: 2.6}), null);
  assert.equal(rankTide(record, {type: 'high', height: 2.3}), null);
});

test('threshold heights themselves are marked at their level and N never exceeds it', () => {
  const record = seattleRecord();
  assert.deepEqual(rankTide(record, {type: 'high', height: 3.542}), {type: 'high', level: NOTABLE, top: 20, count: 705, year: 2026});
  assert.deepEqual(rankTide(record, {type: 'high', height: 3.741}), {type: 'high', level: EXCEPTIONAL, top: 5, count: 705, year: 2026});
  assert.equal(rankTide(record, {type: 'high', height: 3.5419}), null);
  assert.deepEqual(rankTide(record, {type: 'low', height: -0.196}), {type: 'low', level: NOTABLE, top: 20, count: 705, year: 2026});
  assert.deepEqual(rankTide(record, {type: 'low', height: -0.801}), {type: 'low', level: EXCEPTIONAL, top: 5, count: 705, year: 2026});
  assert.equal(rankTide(record, {type: 'high', height: 9}).top, 1);
  assert.equal(rankTide(record, {type: 'high', height: Number.NaN}), null);
  assert.equal(rankTide(null, {type: 'high', height: 3.9}), null);
});

test('the explanation names the year, the count and the place', () => {
  const rank = rankTide(seattleRecord(), {type: 'low', height: -1.172});
  assert.equal(extremitySentence(rank), "Among the lowest 1% of 2026's low tides here (705 predicted low tides in 2026).");
  assert.match(extremitySentence(rank, {modelPoint: true}), /at this model point/);
});

test('a record describes only its own provider, station, datum, unit and year', () => {
  const record = seattleRecord();
  for (const change of [{provider: 'chs'}, {stationId: '9447131'}, {datum: 'MSL'}, {unit: 'ft'}, {year: 2027}]) {
    assert.equal(recordMatches(record, {...seattle, ...change}), false, JSON.stringify(change));
  }
  assert.equal(recordMatches({...record, high: [...record.high].reverse()}, seattle), false);
  assert.equal(recordMatches({...record, highCount: 99}, seattle), false);
});

test('a short or damaged year is rejected', () => {
  const events = Array.from({length: 99}, (_, index) => ({type: index % 2 ? 'high' : 'low', height: index}));
  assert.throws(() => buildExtremityRecord({...seattle, events}), {code: 'extremity-insufficient-events'});
});

test('NOAA and CHS year requests keep the forecast request shape for the whole year', () => {
  const noaa = new URL(noaaYearUrl({station: {id: '9447130'}, year: 2026, config: config.providers.noaa}));
  assert.equal(noaa.searchParams.get('begin_date'), '20260101');
  assert.equal(noaa.searchParams.get('end_date'), '20261231');
  assert.equal(noaa.searchParams.get('interval'), 'hilo');
  assert.equal(noaa.searchParams.get('datum'), 'MLLW');
  assert.equal(noaa.searchParams.get('units'), 'metric');
  const chs = new URL(chsYearUrl({station: {id: '5cebf1df3d0f4a073c4bbcbb'}, year: 2026, config: config.providers.chs}));
  assert.match(chs.pathname, /stations\/5cebf1df3d0f4a073c4bbcbb\/data$/);
  assert.equal(chs.searchParams.get('time-series-code'), 'wlp-hilo');
  assert.equal(chs.searchParams.get('from'), '2026-01-01T00:00:00Z');
  assert.equal(chs.searchParams.get('to'), '2027-01-01T00:00:00Z');
});

test('CHS extrema are typed from their neighbours, so a gap does not flip the rest of the year', () => {
  assert.deepEqual(classifyExtrema([0.5, 1.5, 0.4, 1.6, 0.6]), ['low', 'high', 'low', 'high', 'low']);
  // One missing low between two highs: only the neighbourhood is affected.
  assert.deepEqual(classifyExtrema([0.5, 1.5, 1.4, 0.4, 1.6, 0.6]), ['low', 'high', 'high', 'low', 'high', 'low']);
  const events = chsYearEvents(chsYear, 2026);
  const highs = events.filter((event) => event.type === 'high').length;
  const lows = events.filter((event) => event.type === 'low').length;
  assert.ok(Math.abs(highs - lows) <= 2, `${highs} highs and ${lows} lows`);
  assert.ok(highs > 690);
});

test('a direct record is fetched with low priority and the provider datum', async () => {
  const seen = [];
  const record = await fetchDirectExtremityRecord({
    station: {provider: 'noaa', id: '9447130'},
    year: 2026,
    config,
    fetchImpl: async (url, options) => { seen.push({url, options}); return {ok: true, json: async () => noaaYear}; },
    now: () => new Date('2026-11-24T20:31:05Z'),
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].options.priority, 'low');
  assert.ok(recordMatches(record, seattle));
  await assert.rejects(fetchDirectExtremityRecord({
    station: {provider: 'noaa', id: '9447130'}, year: 2026, config,
    fetchImpl: async () => ({ok: false, status: 503}),
  }));
});

test('the cache key and target come from the displayed forecast', () => {
  const forecast = {station: {provider: 'noaa', id: '9447130', datum: 'MLLW'}, days: [{date: '2026-12-30'}, {date: '2027-01-01'}]};
  assert.deepEqual(extremityTarget(forecast), seattle);
  assert.equal(extremityKey(seattle), `${EXTREMITY_CACHE_PREFIX}noaa.9447130.MLLW.2026`);
  assert.equal(extremityTarget({station: {}, days: []}), null);
});

test('records are cached until 31 days after their year and stay within 50 entries', () => {
  const storage = new MemoryStorage();
  let clock = Date.parse('2026-11-24T20:31:05Z');
  const cache = new ExtremityCache({storage, now: () => clock});
  const record = seattleRecord();
  assert.equal(cache.write(seattle, record), true);
  assert.deepEqual(new ExtremityCache({storage, now: () => clock}).read(seattle), record);
  clock = extremityExpiresAt(2026) - 1;
  assert.ok(new ExtremityCache({storage, now: () => clock}).read(seattle));
  clock = extremityExpiresAt(2026);
  assert.equal(new ExtremityCache({storage, now: () => clock}).read(seattle), null);

  clock = Date.parse('2026-11-24T20:31:05Z');
  const bounded = new ExtremityCache({storage: new MemoryStorage(), now: () => clock});
  for (let index = 0; index < 55; index += 1) {
    const target = {...seattle, stationId: String(9000000 + index)};
    bounded.write(target, {...record, stationId: target.stationId, computedAt: new Date(clock + index * 1000).toISOString()});
  }
  const keys = Array.from({length: bounded.storage.length}, (_, index) => bounded.storage.key(index));
  assert.equal(keys.length, 50);
  assert.ok(!keys.includes(extremityKey({...seattle, stationId: '9000000'})), 'the oldest record is removed first');
});

test('blocked storage still keeps the record for this page', () => {
  const blocked = {get length() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }};
  const cache = new ExtremityCache({storage: blocked});
  assert.equal(cache.write(seattle, seattleRecord()), false);
  assert.ok(cache.read(seattle));
  assert.equal(new ExtremityCache({storage: blocked}).read(seattle), null);
});

test('the loader shares one request per station and cancels it for a superseded search', async () => {
  let calls = 0;
  let release;
  const signals = [];
  const loader = new ExtremityLoader({
    cache: new ExtremityCache(),
    fetchRecord: ({signal}) => {
      calls += 1;
      signals.push(signal);
      return new Promise((resolve) => { release = () => resolve(seattleRecord()); });
    },
  });
  const first = loader.load(seattle, {});
  const second = loader.load(seattle, {});
  assert.equal(calls, 1);
  first.cancel();
  assert.equal(signals[0].aborted, false, 'another caller still wants it');
  release();
  assert.equal(await first.promise, null);
  assert.ok(await second.promise);
  assert.ok(loader.cached(seattle));
  assert.equal(calls, 1);

  const loaderTwo = new ExtremityLoader({cache: new ExtremityCache(), fetchRecord: ({signal}) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  })});
  const only = loaderTwo.load(seattle, {});
  only.cancel();
  assert.equal(await only.promise, null);
});

test('a failed or mismatched record resolves to no marks', async () => {
  const failing = new ExtremityLoader({cache: new ExtremityCache(), fetchRecord: async () => { throw new Error('offline'); }});
  assert.equal(await failing.load(seattle, {}).promise, null);
  const wrong = new ExtremityLoader({cache: new ExtremityCache(), fetchRecord: async () => ({...seattleRecord(), datum: 'MSL'})});
  assert.equal(await wrong.load(seattle, {}).promise, null);
});
