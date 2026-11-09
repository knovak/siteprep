import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {AUSTRALIAN_PROVIDER_ID, FES_PROVIDER_ID, loadAvailableStations, STATION_CACHE_PREFIX, STATION_CACHE_TTL_MS, StoredTideClient, usesAustralianCatalogue} from '../src/stored-tide-client.mjs';

const station = {
  provider: 'australia-standard-ports',
  country: 'AU',
  id: 'au-sydney-sample',
  name: 'Sydney (Fort Denison) sample',
  latitude: -33.855,
  longitude: 151.225,
  timeZone: 'Australia/Sydney',
  datum: 'Chart datum (fixture label)',
  kind: 'reference',
  referenceStationId: null,
};
const rows = fiveLocalDays('2026-08-27T12:00:00Z', station.timeZone);
const context = {
  input: {display: 'Sydney'},
  place: {name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093},
  coast: {name: station.name, distanceKm: 1.9},
};

function response(value, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => structuredClone(value),
  });
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('public station data survives reload within five minutes and then refreshes', async () => {
  const storage = memoryStorage();
  let instant = 1000;
  let calls = 0;
  const options = {
    storage, now: () => instant,
    fetchImpl: async () => {
      calls += 1;
      return response({provider: AUSTRALIAN_PROVIDER_ID, stations: [{...station, name: `Port revision ${calls}`} ]});
    },
  };
  const firstClient = new StoredTideClient(options);
  assert.equal((await firstClient.stations())[0].name, 'Port revision 1');
  instant += STATION_CACHE_TTL_MS - 1;
  const reloadedClient = new StoredTideClient(options);
  assert.equal((await reloadedClient.stations())[0].name, 'Port revision 1');
  assert.equal(calls, 1);
  instant += 1;
  assert.equal((await reloadedClient.stations())[0].name, 'Port revision 2');
  assert.equal(calls, 2);
});

test('station caches stay separate by provider and origin storage and exclude fixtures', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const fetchImpl = async url => {
    calls += 1;
    const provider = new URL(url, 'https://tide.example').searchParams.get('provider');
    return response({provider, stations: [{...station, id: `${provider}-port`} ]});
  };
  await new StoredTideClient({storage, fetchImpl}).stations();
  assert.equal((await new StoredTideClient({storage, fetchImpl, provider: FES_PROVIDER_ID}).stations())[0].id, `${FES_PROVIDER_ID}-port`);
  await new StoredTideClient({storage: memoryStorage(), fetchImpl}).stations();
  assert.equal(calls, 3);
  assert.equal((await new StoredTideClient({storage, stationFixtures: [{...station, id: 'fixture-port'}], fetchImpl}).stations())[0].id, 'fixture-port');
  assert.equal((await new StoredTideClient({storage, fetchImpl}).stations())[0].id, `${AUSTRALIAN_PROVIDER_ID}-port`);
  assert.equal(calls, 3);
});

test('corrupt, future-dated, mismatched, and invalid station caches are misses', async () => {
  for (const cached of [
    '{broken',
    JSON.stringify({provider: AUSTRALIAN_PROVIDER_ID, savedAt: 2000, stations: [station]}),
    JSON.stringify({provider: 'another-provider', savedAt: 500, stations: [station]}),
    JSON.stringify({provider: AUSTRALIAN_PROVIDER_ID, savedAt: 500, stations: [{...station, timeZone: null}]}),
    JSON.stringify({provider: AUSTRALIAN_PROVIDER_ID, savedAt: 500, stations: []}),
  ]) {
    const storage = memoryStorage();
    storage.setItem(`${STATION_CACHE_PREFIX}${AUSTRALIAN_PROVIDER_ID}`, cached);
    let calls = 0;
    const client = new StoredTideClient({storage, now: () => 1000, fetchImpl: async () => {
      calls += 1;
      return response({provider: AUSTRALIAN_PROVIDER_ID, stations: [station]});
    }});
    assert.equal((await client.stations())[0].id, station.id);
    assert.equal(calls, 1);
  }
});

test('expired catalogue data is never used during an outage and a failed request can retry', async () => {
  const storage = memoryStorage();
  storage.setItem(`${STATION_CACHE_PREFIX}${AUSTRALIAN_PROVIDER_ID}`, JSON.stringify({
    provider: AUSTRALIAN_PROVIDER_ID, savedAt: 0, stations: [station],
  }));
  let calls = 0;
  const client = new StoredTideClient({storage, now: () => STATION_CACHE_TTL_MS, fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? response({}, 503) : response({provider: AUSTRALIAN_PROVIDER_ID, stations: [station]});
  }});
  await assert.rejects(client.stations(), /HTTP 503/);
  assert.equal((await client.stations())[0].id, station.id);
  assert.equal(calls, 2);
});

test('disabled browser storage does not prevent station loading', async () => {
  const storage = {
    getItem() { throw new Error('storage unavailable'); },
    setItem() { throw new Error('quota exceeded'); },
  };
  const client = new StoredTideClient({storage, fetchImpl: () => response({provider: AUSTRALIAN_PROVIDER_ID, stations: [station]})});
  assert.equal((await client.stations())[0].id, station.id);
});

test('the Australian catalogue is normalized once and keeps its IANA zone', async () => {
  let calls = 0;
  const client = new StoredTideClient({
    fetchImpl: async (url) => {
      calls += 1;
      assert.equal(url, '/stations?provider=australia-standard-ports');
      return response({provider: 'australia-standard-ports', stations: [station]});
    },
  });
  const first = await client.stations();
  const second = await client.stations();
  assert.equal(calls, 1);
  assert.strictEqual(first, second);
  assert.deepEqual(first.map(({id, provider, timeZone}) => ({id, provider, timeZone})), [{
    id: 'au-sydney-sample',
    provider: 'australia-standard-ports',
    timeZone: 'Australia/Sydney',
  }]);
});

test('direct and stored station catalogues fail independently', async () => {
  const direct = [{provider: 'noaa', id: '9447130'}];
  const stored = [station];
  assert.deepEqual(await loadAvailableStations({
    direct: async () => { throw new Error('direct unavailable'); },
    stored: async () => stored,
  }), stored);
  assert.deepEqual(await loadAvailableStations({
    direct: async () => direct,
    stored: async () => { throw new Error('stored unavailable'); },
  }), direct);
  await assert.rejects(
    loadAvailableStations({
      direct: async () => { throw new Error('direct unavailable'); },
      stored: async () => { throw new Error('stored unavailable'); },
    }),
    /No tide station catalogue/
  );
});

test('Australian locations never wait for or request unrelated direct catalogues', async () => {
  let directCalls = 0;
  let storedCalls = 0;
  const result = await loadAvailableStations({
    place: {lat: -26.683, lon: 153.12},
    direct: () => { directCalls += 1; return new Promise(() => {}); },
    stored: async () => { storedCalls += 1; return [station]; },
  });
  assert.deepEqual(result, [station]);
  assert.equal(directCalls, 0);
  assert.equal(storedCalls, 1);
});

test('regional routing includes every configured Australian port and excludes North American territories', async () => {
  const catalogue = JSON.parse(await readFile(new URL('../data/australia-stations.json', import.meta.url), 'utf8'));
  for (const port of catalogue.stations) {
    assert.equal(usesAustralianCatalogue({lat: port.latitude, lon: port.longitude}), true, port.name);
  }
  for (const place of [
    {name: 'Seattle', lat: 47.6062, lon: -122.3321},
    {name: 'Halifax', lat: 44.6486, lon: -63.5859},
    {name: 'Guam', lat: 13.44, lon: 144.65},
    {name: 'American Samoa', lat: -14.28, lon: -170.69},
    {name: 'Hawaii', lat: 19.73, lon: -155.06},
    {name: 'Missing location'},
  ]) assert.equal(usesAustralianCatalogue(place), false, place.name);
});

test('an Australian catalogue outage leaves model fallback possible without direct requests', async () => {
  const stations = await loadAvailableStations({
    place: {lat: -33.86, lon: 151.21},
    direct: async () => { assert.fail('An unrelated direct catalogue must not be requested'); },
    stored: async () => { throw new Error('stored unavailable'); },
  });
  assert.deepEqual(stations, []);
});

test('locations outside the Australian region retain both catalogues and alternatives', async () => {
  const direct = [{provider: 'noaa', id: '9447130'}];
  let directCalls = 0;
  let storedCalls = 0;
  const result = await loadAvailableStations({
    place: {lat: -14.28, lon: -170.69},
    direct: async () => { directCalls += 1; return direct; },
    stored: async () => { storedCalls += 1; return [station]; },
  });
  assert.deepEqual(result, [...direct, station]);
  assert.equal(directCalls, 1);
  assert.equal(storedCalls, 1);
});

test('an Australian forecast sends only the selected stored-provider request', async () => {
  let submitted;
  const expected = {
    input: {display: context.input.display},
    place: context.place,
    coast: context.coast,
    station,
    timeZone: station.timeZone,
    days: rows.map((row) => ({...row, tides: [], sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null})),
    sources: [{provider: station.provider, dataClass: 'test-fixture'}],
    warnings: [{code: 'fixture-data', message: 'Synthetic fixture'}],
  };
  const client = new StoredTideClient({
    fetchImpl: async (url, options) => {
      assert.equal(url, '/forecast');
      submitted = JSON.parse(options.body);
      return response(expected);
    },
  });
  const result = await client.forecast({context, station, timeZone: station.timeZone, rows});
  assert.deepEqual(result, expected);
  assert.deepEqual(submitted, {
    provider: 'australia-standard-ports',
    context,
    station: {id: station.id},
    timeZone: station.timeZone,
    rows,
  });
});

test('a model client resolves a server-stored water point and submits its coordinates', async () => {
  const modelStation = {
    provider: FES_PROVIDER_ID,
    country: null,
    id: 'fes-model-point',
    name: 'FES2022 model point',
    latitude: -26.66,
    longitude: 153.1,
    timeZone: 'Australia/Brisbane',
    datum: 'FES2022 mean sea level',
    kind: 'model-point',
    referenceStationId: null,
  };
  let submitted;
  const client = new StoredTideClient({
    provider: FES_PROVIDER_ID,
    fetchImpl: async (url, options = {}) => {
      if (url === '/resolve') {
        assert.equal(options.method, 'POST');
        assert.deepEqual(JSON.parse(options.body), {
          provider: FES_PROVIDER_ID,
          latitude: -26.66008,
          longitude: 153.09953,
          displayName: 'Maroochydore, Queensland',
        });
        return response({provider: FES_PROVIDER_ID, station: modelStation, coast: {name: modelStation.name, distanceKm: 0.2}});
      }
      submitted = JSON.parse(options.body);
      return response({
        input: {display: context.input.display}, place: context.place, coast: context.coast,
        station: modelStation, timeZone: modelStation.timeZone,
        days: rows.map((row) => ({...row, tides: [], sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null})),
        sources: [], warnings: [],
      });
    },
  });
  const resolved = await client.resolve({
    latitude: -26.66008,
    longitude: 153.09953,
    name: 'Maroochydore, Queensland',
  });
  assert.equal(resolved.station.id, modelStation.id);
  await client.forecast({context, station: modelStation, timeZone: modelStation.timeZone, rows});
  assert.deepEqual(submitted.station, {
    id: modelStation.id,
    latitude: modelStation.latitude,
    longitude: modelStation.longitude,
    country: null,
  });
});

test('a stored-provider failure remains a partial forecast instead of becoming another coast', async () => {
  const client = new StoredTideClient({fetchImpl: async () => response({code: 'storage-unavailable'}, 503)});
  const result = await client.forecast({context, station, timeZone: station.timeZone, rows});
  assert.equal(result.station.id, station.id);
  assert.equal(result.coast.name, station.name);
  assert.equal(result.days.length, 5);
  assert.equal(result.days.every((day) => day.tides.length === 0), true);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ['tides-unavailable']);
});
