import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {matchCoast} from '../../phase-2/src/coastal-match.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {ACTIVE_REGISTRY_KEY, selectProvider} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../fixtures/australia-prepared-official.mjs';
import {stageThreeProviderRegistry} from '../fixtures/provider-registry.mjs';
import {initializeStageThree} from '../src/stage-three.mjs';
import {createStageThreeApp} from '../src/worker.mjs';

const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();
const gapMatrix = JSON.parse(await readFile(
  new URL('../data/australia-coverage-gap-matrix-2026.json', import.meta.url),
));

function harness() {
  const store = new MemoryObjectStore();
  const app = createStageThreeApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-27T23:15:00Z'),
  });
  return {app, store};
}

async function initialize(app) {
  const response = await app.fetch(new Request('http://localhost/init', {method: 'POST'}));
  assert.equal(response.status, 200);
  return response.json();
}

async function forecast(app, station, rows = fiveLocalDays('2026-08-27T12:00:00Z', station.timeZone)) {
  return app.fetch(new Request('http://localhost/forecast', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      provider: 'australia-standard-ports',
      context: {
        input: {display: station.name},
        place: {name: station.name, lat: station.latitude, lon: station.longitude},
        coast: {name: station.name, distanceKm: 0},
      },
      station: {id: station.id},
      timeZone: station.timeZone,
      rows,
    }),
  }));
}

test('Stage 3 initializes both datasets and activates its registry last without repeat writes', async () => {
  const store = new MemoryObjectStore();
  const first = await initializeStageThree(store, {now: () => new Date('2026-08-27T23:15:00Z')});
  assert.equal(store.writeLog.at(-1), ACTIVE_REGISTRY_KEY);
  assert.equal(first.harmonic.created.length, 3);
  assert.equal(first.australia.created.length, 3);
  assert.equal(first.registry.created.length, 2);
  const writes = store.writeLog.length;
  const second = await initializeStageThree(store, {now: () => new Date('2026-08-27T06:30:00Z')});
  assert.equal(store.writeLog.length, writes);
  assert.equal(second.harmonic.unchanged.length, 3);
  assert.equal(second.australia.unchanged.length, 3);
  assert.equal(second.registry.unchanged.length, 2);
});

test('licensed Australian annual data is active without a fixture opt-in', () => {
  assert.equal(selectProvider(stageThreeProviderRegistry, {countryCode: 'AU'}).id, 'australia-standard-ports');
});

test('health and the stored station catalogue name the exact Stage 3 data', async () => {
  const {app} = harness();
  await initialize(app);
  const health = await (await app.fetch(new Request('http://localhost/health'))).json();
  assert.deepEqual(health.registry, {id: 'tide-here-providers', version: 'stage-3-v5'});
  const australia = health.providers.find(provider => provider.id === 'australia-standard-ports');
  assert.deepEqual(australia.dataset, {id: 'australia-bom-annual-tides', version: '2026-bom-v2'});
  assert.equal(australia.status, 'active');

  const catalogueResponse = await app.fetch(new Request(
    'http://localhost/stations?provider=australia-standard-ports',
  ));
  assert.equal(catalogueResponse.status, 200);
  const catalogue = await catalogueResponse.json();
  assert.equal(catalogue.stations.length, 76);
  assert.deepEqual([...new Set(catalogue.stations.map(station => station.jurisdiction))].sort(), [
    'AU-NSW', 'AU-NT', 'AU-QLD', 'AU-SA', 'AU-TAS', 'AU-VIC', 'AU-WA',
  ]);
  assert.deepEqual([...new Set(catalogue.stations.map(station => station.timeZone))].sort(), [
    'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Darwin', 'Australia/Hobart',
    'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney', 'Indian/Christmas',
    'Indian/Cocos', 'Pacific/Norfolk',
  ]);
});

test('all 76 licensed Australian ports return five source-matching local days in the normalized shape', async () => {
  const {app} = harness();
  await initialize(app);
  for (const station of australiaPreparedOfficial.stations) {
    const response = await forecast(app, station);
    assert.equal(response.status, 200, station.id);
    const result = await response.json();
    assert.deepEqual(Object.keys(result), ['input', 'place', 'coast', 'station', 'timeZone', 'days', 'sources', 'warnings']);
    assert.equal(result.station.id, station.id);
    assert.equal(result.timeZone, station.timeZone);
    assert.equal(result.days.length, 5);
    const expectedEvents = australiaPreparedOfficial.events.filter(event => (
      event.stationId === station.id
      && event.localDate >= result.days[0].date
      && event.localDate <= result.days.at(-1).date
    ));
    assert.equal(result.days.flatMap(day => day.tides).length, expectedEvents.length);
    assert.ok(expectedEvents.length > 0);
    assert.equal(result.sources[0].official, true);
    assert.equal(result.sources[0].dataClass, 'licensed-source');
    assert.match(result.sources[0].attribution, /Bureau of Meteorology/);
    assert.equal(result.warnings.length, 0);
    const sourceFirst = australiaPreparedOfficial.events.find(event => (
      event.stationId === station.id && event.localDate === result.days[0].date
    ));
    const resultFirst = result.days.flatMap(day => day.tides)[0];
    assert.deepEqual(
      [resultFirst.type, resultFirst.at, resultFirst.localTime, resultFirst.height],
      [sourceFirst.type, sourceFirst.at, sourceFirst.sourceLocalTime, sourceFirst.height],
    );
  }
});

test('major coastal-city searches resolve around the Australian mainland and Tasmania', () => {
  const places = [
    ['Brisbane', -27.4698, 153.0251, 'au-qld-brisbane-bar'],
    ['Cairns', -16.9186, 145.7781, 'au-qld-cairns'],
    ['Sydney', -33.8688, 151.2093, 'au-nsw-sydney'],
    ['Melbourne', -37.8136, 144.9631, 'au-vic-melbourne'],
    ['Hobart', -42.8821, 147.3272, 'au-tas-hobart'],
    ['Adelaide', -34.9285, 138.6007, 'au-sa-port-adelaide'],
    ['Perth', -31.9523, 115.8613, 'au-wa-fremantle'],
    ['Broome', -17.9614, 122.2359, 'au-wa-broome'],
    ['Darwin', -12.4634, 130.8456, 'au-nt-darwin'],
    ['Weipa', -12.6493, 141.8536, 'au-qld-weipa'],
  ];
  const config = {automaticKm: 25, clarityRatio: 0.6, maximumKm: 150, maxChoices: 3};
  for (const [name, latitude, longitude, expectedId] of places) {
    const match = matchCoast({latitude, longitude}, australiaPreparedOfficial.stations, config);
    assert.notEqual(match.status, 'coverage-unavailable', name);
    assert.equal(match.station?.id ?? match.candidates[0]?.id, expectedId, name);
  }
});

test('the representative gap matrix reproduces the 23-port baseline and expanded catalogue outcomes', () => {
  assert.equal(gapMatrix.schema, 'tide-here/australia-coverage-gap-matrix/v1');
  assert.equal(gapMatrix.baselineDatasetVersion, '2026-bom-v1');
  assert.equal(gapMatrix.expandedDatasetVersion, australiaPreparedOfficial.dataset.version);
  const baselineIds = new Set(gapMatrix.baselineStationIds);
  const baselineStations = australiaPreparedOfficial.stations.filter(station => baselineIds.has(station.id));
  assert.equal(baselineStations.length, 23);

  const summarize = (place, stations) => {
    const match = matchCoast(place, stations, gapMatrix.matcher);
    return {
      status: match.status,
      stationId: match.station?.id ?? match.candidates[0]?.id ?? null,
      distanceKm: match.coast?.distanceKm ?? match.candidates[0]?.distanceKm ?? match.nearestDistanceKm,
    };
  };
  for (const place of gapMatrix.places) {
    const coordinates = {latitude: place.latitude, longitude: place.longitude};
    assert.deepEqual(summarize(coordinates, baselineStations), place.before, `${place.name} before`);
    assert.deepEqual(summarize(coordinates, australiaPreparedOfficial.stations), place.after, `${place.name} after`);
  }
});

test('dates outside the loaded year fail explicitly', async () => {
  const {app} = harness();
  await initialize(app);
  const station = australiaPreparedOfficial.stations[0];
  const outsideYear = await forecast(app, station, fiveLocalDays('2027-01-15T00:00:00Z', station.timeZone));
  assert.equal(outsideYear.status, 422);
  assert.equal((await outsideYear.json()).code, 'dataset-year-unavailable');
});
