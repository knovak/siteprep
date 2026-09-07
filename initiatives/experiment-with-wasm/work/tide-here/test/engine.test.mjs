import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {decodeHarmonics, nearbyPoints, makePlaceIndex, searchPlaces, parseCoordinates} from '../src/data.mjs';
import {forecastRows, makeForecast} from '../src/forecast.mjs';
import {createEngine} from '../src/wasm-engine.mjs';
import {createHistory} from '../src/history.mjs';
const data = decodeHarmonics(gunzipSync(await readFile(new URL('../data/coastal-harmonics.bin.gz', import.meta.url))));
const guest = (await build({entryPoints: [new URL('../src/guest.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'TideGuest'})).outputFiles[0].text;

test('real WebAssembly predictions match recorded original FES forecasts across regions and dates', async () => {
  const cases = JSON.parse(await readFile(new URL('./original-forecasts.json', import.meta.url)));
  const engine = await createEngine(guest);
  try {
    for (const example of cases) {
      const nearest = nearbyPoints(data, example.place)[0];
      assert.ok(nearest, example.name);
      const point = data.point(nearest.index);
      assert.equal(point.latitude, example.point.latitude);
      assert.equal(point.longitude, example.point.longitude);
      const actual = engine.predict({constituents: point.constituents, start: example.start, end: example.end});
      assert.equal(actual.length, example.events.length, example.name);
      for (const [i, event] of actual.entries()) {
        assert.equal(event.type, example.events[i].type);
        assert.ok(Math.abs(Date.parse(event.at) - Date.parse(example.events[i].at)) < 1000, example.name+' event time');
        assert.ok(Math.abs(event.height - example.events[i].height) < 0.00001, example.name+' height');
      }
    }
    assert.throws(() => engine.predict({constituents: [], start: 'bad', end: 'bad'}));
  } finally { engine.dispose(); }
});

test('coverage matches all 65,203 coastal points and rejects inland and invalid locations', () => {
  assert.equal(data.metadata.count, 65203);
  assert.equal(data.metadata.constituents.length, 34);
  for (let i = 0; i < data.locations.length; i += 1000) assert.ok(nearbyPoints(data, data.locations[i]).length);
  assert.deepEqual(nearbyPoints(data, {latitude: 39.7392, longitude: -104.9903}), []);
  assert.throws(() => parseCoordinates('95, 180'));
  assert.throws(() => parseCoordinates('20, 181'));
  assert.deepEqual(parseCoordinates('-33.86, 151.21'), {latitude:-33.86,longitude:151.21,label:'-33.86000, 151.21000'});
  assert.equal(parseCoordinates('Galway'), null);
});

test('offline place search resolves native names, aliases, regions and ambiguity', async () => {
  const places = makePlaceIndex(JSON.parse(gunzipSync(await readFile(new URL('../data/places.json.gz',import.meta.url)))).places);
  assert.equal(places.length, 170946);
  for (const query of ['Half Moon Bay, California', 'Galway, Ireland', 'Cooktown, Queensland', '東京', 'Cochin']) assert.ok(searchPlaces(places, query).length, query);
  assert.ok(searchPlaces(places, 'Newport').length > 1);
  assert.equal(searchPlaces(places, 'no-such-place-xyz').length, 0);
});

test('five-day windows preserve daylight saving, date line, astronomy and polar no-event states', async () => {
  const dst = forecastRows('2026-11-01', 'America/Los_Angeles');
  assert.equal(dst[0].durationHours, 25);
  assert.equal(forecastRows('2026-03-08','America/Los_Angeles')[0].durationHours, 23);
  assert.equal(forecastRows('', 'Pacific/Auckland', new Date('2026-09-07T20:00:00Z'))[0].date, '2026-09-08');
  const point = {...data.point(nearbyPoints(data,{latitude:69.65,longitude:18.96})[0].index),distanceKm:0};
  const rows = forecastRows('2026-06-21', point.timeZone);
  const result = makeForecast({point, place:{label:'Tromsø'},rows,events:[],dataset:data.metadata.dataset});
  assert.equal(result.days.length,5);
  assert.equal(result.days[0].sunState,'always-up');
  assert.equal(result.days[0].sunrise.length,0);
  assert.equal(result.days[0].astronomyState,'available');
});

test('history exports, restores and survives storage failure without affecting forecasts', () => {
  const values = new Map(); const storage = {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const h = createHistory(storage);
  const forecast = {schema:'tide-here/standalone-forecast/v1',input:{display:'Galway'},place:{latitude:53.27,longitude:-9.05,label:'Galway'},timeZone:'Europe/Dublin',days:Array.from({length:5},()=>({date:'2026-09-07'}))};
  h.append(forecast); const backup = h.export();
  assert.equal(createHistory(storage).read().length,1);
  h.clear(); h.import(backup); h.import(backup); assert.equal(h.read().length,1);
  assert.throws(()=>h.import('{"schema":"bad","entries":[]}'));
  assert.equal(h.read().length,1);
  const broken=createHistory({getItem(){throw Error();},setItem(){throw Error();}});
  broken.append(forecast); assert.equal(broken.read().length,1); assert.match(broken.warning(),/only in this window/);
  for(let i=0;i<105;i++)h.append(forecast);assert.equal(h.read().length,100);
});
