import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createAustralianTides} from '../src/australia.mjs';
import {automaticStation} from '../src/online.mjs';
import {forecastRows} from '../src/forecast.mjs';
import {importAustralianAnnualSource, australiaDatasetBundle} from '../../../../tide-here/work/phase-11/src/australia-importer.mjs';
import {forecastAustralianStandardPort} from '../../../../tide-here/work/phase-11/src/australia-provider.mjs';
import {initializeJsonDataset} from '../../../../tide-here/work/phase-10/src/json-dataset.mjs';

const prepared = importAustralianAnnualSource(JSON.parse(gunzipSync(await readFile(new URL('../../../../tide-here/work/phase-11/data/bom-annual-2026.source.json.gz', import.meta.url)))));
const bundled = JSON.parse(gunzipSync(await readFile(new URL('../data/australia-bom-2026.json.gz', import.meta.url))));
const api = createAustralianTides(async () => bundled);

test('standalone Bureau events match the hosted provider at Mooloolaba, Sydney DST and Cocos', async () => {
  assert.deepEqual(bundled, prepared);
  assert.equal(prepared.stations.length, 76); assert.equal(prepared.events.length, 103597);
  const values = new Map();
  const store = {get: async key => values.get(key), put: async (key, body) => values.set(key, {body})};
  await initializeJsonDataset(store, australiaDatasetBundle(prepared));
  for (const [id, date] of [['au-qld-mooloolaba', '2026-09-09'], ['au-nsw-sydney', '2026-10-03'], ['au-wa-cocos-islands', '2026-09-09']]) {
    const port = prepared.stations.find(port => port.id === id);
    const place = {label: port.name, latitude: port.latitude, longitude: port.longitude};
    const station = automaticStation(await api.stations(place));
    assert.equal(station.id, id);
    const rows = forecastRows(date, station.timeZone);
    const standalone = await api.forecast({place, station, rows});
    const hosted = await forecastAustralianStandardPort({store, descriptor: {id: 'australia-standard-ports', dataRef: prepared.dataset},
      request: {station, timeZone: station.timeZone, rows, context: {input: {display: place.label}, place, coast: {name: port.name, distanceKm: 0}}}});
    const events = forecast => forecast.days.map(day => ({date: day.date, tides: day.tides.map(({at, type, height, unit}) => ({at, type, height, unit}))}));
    assert.deepEqual(events(standalone), events(hosted));
    assert.equal(standalone.datum, hosted.station.datum);
    assert.equal(standalone.sources[0].attribution, hosted.sources[0].attribution);
    assert.equal(standalone.sources[0].disclaimer, hosted.sources[0].disclaimer);
    assert.equal(standalone.official.bundled, true); assert.equal(standalone.online, undefined);
  }
});

test('Maroochydore selects Mooloolaba and incomplete annual coverage never becomes a partial official forecast', async () => {
  const place = {label: 'Maroochydore', latitude: -26.655, longitude: 153.091};
  const station = automaticStation(await api.stations(place));
  assert.equal(station.id, 'au-qld-mooloolaba'); assert.equal(station.timeZone, 'Australia/Brisbane');
  for (const date of ['2025-12-31', '2026-12-28', '2027-01-01']) {
    await assert.rejects(api.forecast({place, station, rows: forecastRows(date, station.timeZone)}), /tables cover 2026-01-01 through 2026-12-31/);
  }
  assert.deepEqual(await api.stations({latitude: 32.717, longitude: -117.162}), []);
});
