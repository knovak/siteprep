import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { greatCircleDistanceKm, matchCoast, rankStations } from '../src/coastal-match.mjs';
import { fetchStationCatalogues, normalizeStationCatalogues, readThroughStationCatalogue } from '../src/station-catalogue.mjs';
import { fetchStationDetails, normalizeStationDetails, readThroughStationDetails } from '../src/station-details.mjs';

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

test('normal mode fetches and normalizes the complete provider catalogue shapes', async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    return {
      ok: true,
      async json() {
        return structuredClone(url === config.providers.noaa.catalogueUrl ? fixture.noaa : fixture.chs.stations);
      }
    };
  };
  const fetched = await fetchStationCatalogues({ config, fetchImpl });
  assert.equal(fetched.length, stations.length);
  assert.deepEqual(requests.sort(), [config.providers.noaa.catalogueUrl, config.providers.chs.catalogueUrl].sort());
  assert.equal(fetched.find((station) => station.code === '07735').kind, 'unknown');
});

test('chosen station metadata supplies coast time zone and CHS reference details', async () => {
  const halfMoonBay = {
    provider: 'noaa', country: 'US', id: '9414131', code: '9414131', name: 'Pillar Point Harbor, Half Moon Bay',
    latitude: 37.5025, longitude: -122.4821667, jurisdiction: 'US-CA', datum: 'MLLW', kind: 'reference', referenceStationId: null
  };
  const vancouver = stations.find((station) => station.code === '07735');
  const noaa = normalizeStationDetails(halfMoonBay, {
    stations: [{ id: '9414131', state: 'CA', lng: -122.48217, timezonecorr: -8 }]
  });
  const chs = normalizeStationDetails(vancouver, {
    provinceCode: 'BC', isTideTableReferencePort: true, referencePortStationId: null, timeZoneCode: 'Canada/Pacific'
  });
  assert.equal(noaa.timeZone, 'America/Los_Angeles');
  assert.equal(chs.timeZone, 'Canada/Pacific');
  assert.equal(chs.jurisdiction, 'CA-BC');
  assert.equal(chs.kind, 'reference');

  const requests = [];
  const fetched = await fetchStationDetails({
    station: halfMoonBay,
    config,
    fetchImpl: async (url) => {
      requests.push(url);
      return { ok: true, json: async () => ({ stations: [{ id: '9414131', state: 'CA', lng: -122.48217, timezonecorr: -8 }] }) };
    }
  });
  assert.equal(fetched.timeZone, 'America/Los_Angeles');
  assert.deepEqual(requests, [config.providers.noaa.stationMetadataUrl.replace('{stationId}', '9414131')]);
});

test('chosen station details are cached for seven days', async () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
  const station = { provider: 'noaa', id: '9414131' };
  let fetches = 0;
  const fetchDetails = async () => {
    fetches += 1;
    return { ...station, timeZone: 'America/Los_Angeles' };
  };
  const day = 24 * 60 * 60 * 1000;
  const first = await readThroughStationDetails({ storage, station, now: 0, ttlMs: config.catalogueCacheTtlMs, fetchDetails });
  const sixth = await readThroughStationDetails({ storage, station, now: 6 * day, ttlMs: config.catalogueCacheTtlMs, fetchDetails });
  const eighth = await readThroughStationDetails({ storage, station, now: 8 * day, ttlMs: config.catalogueCacheTtlMs, fetchDetails });
  assert.deepEqual([first.source, sixth.source, eighth.source], ['provider', 'cache', 'provider']);
  assert.equal(fetches, 2);
});
