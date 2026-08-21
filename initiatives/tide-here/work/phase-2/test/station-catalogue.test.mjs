import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { greatCircleDistanceKm, matchCoast, rankStations } from '../src/coastal-match.mjs';
import { normalizeStationCatalogues, readThroughStationCatalogue } from '../src/station-catalogue.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(resolve(phaseDirectory, 'data/provider-config.json'), 'utf8'));
const fixture = JSON.parse(await readFile(resolve(phaseDirectory, 'data/catalogue-slices.fixture.json'), 'utf8'));
const stations = normalizeStationCatalogues(fixture, config);

test('NOAA and CHS slices normalize to one provider-independent shape', () => {
  assert.equal(stations.length, 11);
  for (const station of stations) {
    assert.deepEqual(Object.keys(station).sort(), [
      'active', 'code', 'country', 'datum', 'id', 'jurisdiction', 'kind',
      'latitude', 'longitude', 'name', 'provider', 'referenceStationId', 'sourceUrl'
    ]);
    assert.ok(Number.isFinite(station.latitude));
    assert.ok(Number.isFinite(station.longitude));
  }

  const eagleHarbor = stations.find((station) => station.code === '9445882');
  assert.equal(eagleHarbor.kind, 'subordinate');
  assert.equal(eagleHarbor.referenceStationId, '9447130');
  assert.equal(eagleHarbor.jurisdiction, 'US-WA');

  const whiteRock = stations.find((station) => station.code === '07577');
  assert.equal(whiteRock.kind, 'subordinate');
  assert.equal(whiteRock.referenceStationId, '5cebf1de3d0f4a073c4bb94c');
  assert.equal(whiteRock.jurisdiction, 'CA-BC');
});

test('ranking is great-circle distance and exact Seattle accepts automatically', () => {
  assert.ok(Math.abs(greatCircleDistanceKm(
    { latitude: 47.60263888888889, longitude: -122.3393055555556 },
    { latitude: 47.60263888888889, longitude: -122.3393055555556 }
  )) < 1e-9);

  const place = { latitude: 47.60263888888889, longitude: -122.3393055555556 };
  const ranked = rankStations(place, stations);
  assert.equal(ranked[0].station.code, '9447130');
  const result = matchCoast(place, stations, config.match);
  assert.equal(result.status, 'accepted');
  assert.equal(result.station.code, '9447130');
  assert.equal(result.coast.distanceKm, 0);
});

test('an island-side tie asks and preserves the subordinate relationship', () => {
  const result = matchCoast(
    { latitude: 47.60835, longitude: -122.5125 },
    stations,
    config.match
  );
  assert.equal(result.status, 'coast-choice-required');
  assert.deepEqual(result.candidates.slice(0, 2).map((choice) => choice.code), ['9445882', '9445913']);
  assert.ok(result.candidates.slice(0, 2).every((choice) => choice.kind === 'subordinate'));
  assert.ok(result.candidates.slice(0, 2).every((choice) => choice.referenceStationId === '9447130'));
});

test('a border result carries each candidate provider and jurisdiction', () => {
  const result = matchCoast(
    { latitude: 49.002, longitude: -122.785 },
    stations,
    config.match
  );
  assert.equal(result.status, 'coast-choice-required');
  const borderChoices = result.candidates.filter((choice) => choice.code === '07577' || choice.code === '9449679');
  assert.equal(borderChoices.length, 2);
  assert.deepEqual(new Set(borderChoices.map((choice) => choice.country)), new Set(['CA', 'US']));
  assert.deepEqual(new Set(borderChoices.map((choice) => choice.jurisdiction)), new Set(['CA-BC', 'US-WA']));
});

test('an inland place refuses coverage instead of naming a distant coast', () => {
  const result = matchCoast({ latitude: 39.7392, longitude: -104.9903 }, stations, config.match);
  assert.equal(result.status, 'coverage-unavailable');
  assert.equal(result.station, null);
  assert.deepEqual(result.candidates, []);
  assert.ok(result.nearestDistanceKm > 150);
  assert.deepEqual(result.supportedCountries, ['CA', 'US']);
});

test('25 km, 60%, and 150 km are configuration rather than matcher constants', () => {
  const place = { latitude: 0, longitude: 0 };
  const synthetic = [
    { ...stations[0], id: 'near', longitude: 0.1, latitude: 0 },
    { ...stations[0], id: 'far', longitude: 0.2, latitude: 0 }
  ];
  assert.equal(matchCoast(place, synthetic, { automaticKm: 25, clarityRatio: 0.6, maximumKm: 150, maxChoices: 3 }).status, 'accepted');
  assert.equal(matchCoast(place, synthetic, { automaticKm: 25, clarityRatio: 0.4, maximumKm: 150, maxChoices: 3 }).status, 'coast-choice-required');
  assert.equal(matchCoast(place, synthetic, { automaticKm: 5, clarityRatio: 0.6, maximumKm: 150, maxChoices: 3 }).status, 'coast-choice-required');
  assert.equal(matchCoast(place, synthetic, { automaticKm: 25, clarityRatio: 0.6, maximumKm: 5, maxChoices: 3 }).status, 'coverage-unavailable');
});

test('the normalized catalogue is reused for seven days and then refreshed', async () => {
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); }
  };
  let fetches = 0;
  const fetchCatalogue = async () => {
    fetches += 1;
    return stations;
  };
  const day = 24 * 60 * 60 * 1000;

  const first = await readThroughStationCatalogue({ storage, now: 0, ttlMs: config.catalogueCacheTtlMs, fetchCatalogue });
  const sixthDay = await readThroughStationCatalogue({ storage, now: 6 * day, ttlMs: config.catalogueCacheTtlMs, fetchCatalogue });
  const eighthDay = await readThroughStationCatalogue({ storage, now: 8 * day, ttlMs: config.catalogueCacheTtlMs, fetchCatalogue });

  assert.equal(first.source, 'provider');
  assert.equal(sixthDay.source, 'cache');
  assert.equal(eighthDay.source, 'provider');
  assert.equal(fetches, 2);
});
