import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { normalizeStationCatalogues } from '../../phase-2/src/station-catalogue.mjs';
import { TideProvider } from '../../phase-3/src/tide-provider.mjs';
import { ASTRONOMY_UNAVAILABLE, Astronomy, eventDisplayState } from '../../phase-4/src/astronomy.mjs';
import { Geocoder, GEOCODER_UNAVAILABLE, INVALID_INPUT, PLACE_NOT_FOUND, parsePlaceInput } from '../src/geocoder.mjs';
import {
  COAST_CHOICE_REQUIRED,
  COVERAGE_UNAVAILABLE,
  FAILURE_CODES,
  FAILURE_MESSAGES,
  TIDES_UNAVAILABLE,
  TideHereService
} from '../src/resolve-forecast.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workDirectory = resolve(phaseDirectory, '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(workDirectory, path), 'utf8'));
const geocoderConfig = await readJson('phase-5/data/geocoder-config.json');
const providerConfig = await readJson('phase-2/data/provider-config.json');
const catalogueFixture = await readJson('phase-2/data/catalogue-slices.fixture.json');
const noaaPayload = await readJson('phase-0/fixtures/noaa-seattle-hilo.json');
const chsPayload = await readJson('phase-0/fixtures/chs-halifax-hilo.json');
const stations = normalizeStationCatalogues(catalogueFixture, providerConfig);
const fixedNow = new Date('2026-08-21T18:00:00.000Z');

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
}

const response = (payload, status = 200) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => structuredClone(payload) });

test('input accepts text and valid decimal coordinates without losing what was typed', () => {
  assert.deepEqual(parsePlaceInput(' Seattle, WA '), { ok: true, kind: 'text', display: ' Seattle, WA ', query: 'Seattle, WA' });
  assert.deepEqual(parsePlaceInput('47.61, -122.33'), { ok: true, kind: 'coordinates', display: '47.61, -122.33', latitude: 47.61, longitude: -122.33 });
  assert.equal(parsePlaceInput('91, -122').code, INVALID_INPUT);
  assert.equal(parsePlaceInput('   ').code, INVALID_INPUT);
});

test('forward lookup makes one attributed request and reuses a hashed 24-hour cache', async () => {
  const calls = [];
  const storage = memoryStorage();
  const payload = [{ display_name: 'Seattle, King County, Washington, United States', lat: '47.6062', lon: '-122.3321' }];
  const geocoder = new Geocoder({
    config: geocoderConfig,
    storage,
    now: () => fixedNow.getTime(),
    fetchImpl: async (url) => { calls.push(String(url)); return response(payload)(); }
  });
  const first = await geocoder.resolve('Seattle, WA');
  const second = await geocoder.resolve('  seattle,   wa  ');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]).searchParams.get('q'), 'Seattle, WA');
  assert.equal(first.source.attribution, geocoderConfig.attribution);
  assert.equal(second.cache, 'hit');
  assert.ok([...storage.values.keys()].every((key) => !/seattle/i.test(key)));
});

test('coordinate lookup reverses once and an empty reverse result preserves coordinates', async () => {
  let requests = 0;
  const geocoder = new Geocoder({
    config: geocoderConfig,
    now: () => fixedNow.getTime(),
    fetchImpl: async () => { requests += 1; return response({ error: 'Unable to geocode' })(); }
  });
  const result = await geocoder.resolve('47.60620, -122.33210');
  assert.equal(requests, 1);
  assert.equal(result.ok, true);
  assert.deepEqual(result.place, { name: '47.60620, -122.33210', lat: 47.6062, lon: -122.3321 });
});

test('requests serialize to one per second and the endpoint switches by configuration alone', async () => {
  let now = 10_000;
  const sleeps = [];
  const urls = [];
  const config = { ...geocoderConfig, searchUrl: 'https://geo.example.test/find', reverseUrl: 'https://geo.example.test/reverse' };
  const geocoder = new Geocoder({
    config,
    now: () => now,
    sleep: async (milliseconds) => { sleeps.push(milliseconds); now += milliseconds; },
    fetchImpl: async (url) => {
      urls.push(String(url));
      return response([{ display_name: 'Fixture', lat: '47', lon: '-122' }])();
    }
  });
  await geocoder.resolve('first place');
  await geocoder.resolve('second place');
  assert.deepEqual(sleeps, [1000]);
  assert.ok(urls.every((url) => url.startsWith(config.searchUrl)));
});

test('not found and provider failure stay distinct', async () => {
  const missing = await new Geocoder({ config: geocoderConfig, fetchImpl: response([]) }).resolve('Missing place');
  const unavailable = await new Geocoder({ config: geocoderConfig, fetchImpl: response({}, 429) }).resolve('Throttled place');
  assert.equal(missing.code, PLACE_NOT_FOUND);
  assert.equal(unavailable.code, GEOCODER_UNAVAILABLE);
});

function fixtureGeocoder() {
  return {
    async resolve(input) {
      if (input === 'Denver') return { ok: true, input: { display: input }, place: { name: 'Denver', lat: 39.7392, lon: -104.9903 }, source: { provider: 'fixture-geocoder' } };
      if (input === 'Bainbridge') return { ok: true, input: { display: input }, place: { name: 'Bainbridge Island', lat: 47.60835, lon: -122.5125 }, source: { provider: 'fixture-geocoder' } };
      return { ok: true, input: { display: input }, place: { name: 'Halifax, Nova Scotia, Canada', lat: 44.648618, lon: -63.5859487 }, source: { provider: 'fixture-geocoder' } };
    }
  };
}

function service({ geocoder = fixtureGeocoder(), getStations = async () => stations, tideFetch = response(chsPayload), astronomy = new Astronomy({ now: () => fixedNow }), resolveFallback = null } = {}) {
  return new TideHereService({
    geocoder,
    getStations,
    matchConfig: providerConfig.match,
    timeZoneLookup: async (_latitude, longitude) => longitude < -100 ? 'America/Los_Angeles' : 'America/Halifax',
    tideProvider: new TideProvider({ config: providerConfig, fetchImpl: tideFetch, now: () => fixedNow }),
    astronomy,
    resolveFallback,
    now: () => fixedNow
  });
}

test('text and coordinates compose to the same place, coast, station, and five dates', async () => {
  const tideHere = service();
  const textResolution = await tideHere.resolve('Halifax');
  const coordinateResolution = await tideHere.resolve('44.648618, -63.5859487');
  const textForecast = await tideHere.forecast(textResolution);
  const coordinateForecast = await tideHere.forecast(coordinateResolution);
  assert.equal(textResolution.ok, true);
  assert.deepEqual(textForecast.place, coordinateForecast.place);
  assert.deepEqual(textForecast.coast, coordinateForecast.coast);
  assert.deepEqual(textForecast.station, coordinateForecast.station);
  assert.deepEqual(textForecast.days.map((day) => day.date), coordinateForecast.days.map((day) => day.date));
  assert.equal(textForecast.days.length, 5);
  assert.equal(textForecast.input.display, 'Halifax');
  assert.equal(coordinateForecast.input.display, '44.648618, -63.5859487');
});

test('coverage refusal never names a distant station as the coast', async () => {
  const resolution = await service().resolve('Denver');
  assert.equal(resolution.ok, false);
  assert.equal(resolution.code, COVERAGE_UNAVAILABLE);
  assert.equal(Object.hasOwn(resolution, 'coast'), false);
  assert.deepEqual(resolution.supportedCountries, ['CA', 'US']);
});

test('the model resolver is consulted only after official catalogue coverage declines', async () => {
  let fallbackCalls = 0;
  const fallback = {
    station: {
      provider: 'fes2022', id: 'fes-denver-fixture', name: 'Fixture model point', kind: 'model-point',
      latitude: 39.74, longitude: -104.99, timeZone: 'America/Denver', datum: 'model datum',
    },
    coast: {name: 'Fixture model point', distanceKm: 1},
  };
  const tideHere = service({
    resolveFallback: async () => { fallbackCalls += 1; return fallback; },
  });
  const covered = await tideHere.resolve('Halifax');
  const declined = await tideHere.resolve('Denver');
  assert.equal(covered.station.provider, 'chs');
  assert.equal(declined.station.provider, 'fes2022');
  assert.equal(declined.coast.name, 'Fixture model point');
  assert.equal(fallbackCalls, 1);
});

test('choosing an ambiguous coast repeats neither geocoding nor catalogue work', async () => {
  let geocodes = 0;
  let catalogues = 0;
  const geocoder = fixtureGeocoder();
  const wrappedGeocoder = { async resolve(input) { geocodes += 1; return geocoder.resolve(input); } };
  const tideHere = service({
    geocoder: wrappedGeocoder,
    getStations: async () => { catalogues += 1; return stations; },
    tideFetch: response(noaaPayload)
  });
  const resolution = await tideHere.resolve('Bainbridge');
  assert.equal(resolution.code, COAST_CHOICE_REQUIRED);
  const result = await tideHere.forecast(resolution, resolution.candidates[0]);
  assert.equal(result.days.length, 5);
  assert.equal(geocodes, 1);
  assert.equal(catalogues, 1);
});

test('a tide failure preserves place, coast, station, and astronomy', async () => {
  const tideHere = service({ tideFetch: response({}, 500) });
  const resolution = await tideHere.resolve('Halifax');
  const result = await tideHere.forecast(resolution);
  assert.deepEqual(result.warnings.map((warning) => warning.code), [TIDES_UNAVAILABLE]);
  assert.equal(result.place.name, 'Halifax, Nova Scotia, Canada');
  assert.ok(result.station.id);
  assert.ok(result.days.every((day) => day.tides.length === 0));
  assert.ok(result.days.every((day) => day.sunrise.length > 0));
});

test('an astronomy failure preserves tide rows through composition', async () => {
  const failingAstronomy = {
    enrich({ forecast }) {
      return { ...forecast, warnings: [...forecast.warnings, { code: ASTRONOMY_UNAVAILABLE, message: 'fixture failure' }] };
    }
  };
  const resolution = await service({ astronomy: failingAstronomy }).resolve('Halifax');
  const result = await service({ astronomy: failingAstronomy }).forecast(resolution);
  assert.ok(result.days.flatMap((day) => day.tides).length > 0);
  assert.deepEqual(result.warnings.map((warning) => warning.code), [ASTRONOMY_UNAVAILABLE]);
});

test('the vocabulary contains exactly eight distinct states and no-event remains ordinary', () => {
  assert.deepEqual(FAILURE_CODES, [
    INVALID_INPUT, PLACE_NOT_FOUND, GEOCODER_UNAVAILABLE, COVERAGE_UNAVAILABLE,
    COAST_CHOICE_REQUIRED, TIDES_UNAVAILABLE, ASTRONOMY_UNAVAILABLE, 'no-event'
  ]);
  assert.equal(new Set(FAILURE_CODES).size, 8);
  assert.ok(FAILURE_CODES.every((code) => FAILURE_MESSAGES[code]));
  assert.deepEqual(eventDisplayState({ astronomyState: 'available', moonrise: [] }, 'moonrise'), { code: 'no-event', message: 'does not rise' });
});
