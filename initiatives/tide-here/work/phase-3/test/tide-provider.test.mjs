import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { fiveLocalDays } from '../../phase-1/src/day-model.mjs';
import {
  TideProvider,
  buildChsRequest,
  buildNoaaRequest,
  normalizeChsPredictions,
  normalizeNoaaPredictions
} from '../src/tide-provider.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const initiativeDirectory = resolve(phaseDirectory, '../..');
const readJson = async (path) => JSON.parse(await readFile(resolve(initiativeDirectory, path), 'utf8'));
const config = await readJson('work/phase-2/data/provider-config.json');
const evidence = await readJson('work/phase-0/evidence.json');
const noaaPayload = await readJson('work/phase-0/fixtures/noaa-seattle-hilo.json');
const chsPayload = await readJson('work/phase-0/fixtures/chs-halifax-hilo.json');

const context = {
  input: { display: 'recorded fixture' },
  place: { name: 'Recorded place', lat: 0, lon: 0 },
  coast: { name: 'Recorded coast', distanceKm: 0 }
};
const noaaStation = {
  provider: 'noaa', country: 'US', id: '9447130', name: 'Seattle', kind: 'reference',
  datum: 'MLLW', referenceStationId: null
};
const chsStation = {
  provider: 'chs', country: 'CA', id: '5cebf1df3d0f4a073c4bbcbb', name: 'Halifax', kind: 'reference',
  datum: 'chart-datum', referenceStationId: null
};
const fixtureResponse = (payload) => async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) });

function assertStableShape(result, provider) {
  assert.deepEqual(Object.keys(result), ['input', 'place', 'coast', 'station', 'timeZone', 'days', 'sources', 'warnings']);
  assert.equal(result.station.provider, provider);
  assert.equal(result.days.length, 5);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].datum, result.station.datum);
  assert.ok(result.sources[0].licenceUrl);
  assert.ok(result.sources[0].attribution);
}

test('recorded NOAA and CHS payloads become the same frozen response shape', async () => {
  const noaaRows = fiveLocalDays('2026-08-19T19:00:00Z', 'America/Los_Angeles');
  const chsRows = fiveLocalDays('2026-08-20T12:00:00Z', 'America/Halifax');
  const now = () => new Date(evidence.observed_at);
  const noaa = await new TideProvider({ config, fetchImpl: fixtureResponse(noaaPayload), now }).forecast({
    context, station: noaaStation, timeZone: 'America/Los_Angeles', rows: noaaRows
  });
  const chs = await new TideProvider({ config, fetchImpl: fixtureResponse(chsPayload), now }).forecast({
    context, station: chsStation, timeZone: 'America/Halifax', rows: chsRows
  });

  assertStableShape(noaa, 'noaa');
  assertStableShape(chs, 'chs');
  assert.equal(noaa.sources[0].retrievedAt, evidence.observed_at);
  assert.equal(chs.sources[0].retrievedAt, evidence.observed_at);
  assert.deepEqual(noaa.warnings, []);
  assert.deepEqual(chs.warnings, []);
  assert.equal(noaa.days.flatMap((day) => day.tides).length, noaaPayload.length ?? noaaPayload.predictions.length);
  assert.equal(chs.days.flatMap((day) => day.tides).length, chsPayload.length);
  const normalizedText = JSON.stringify([noaa, chs]);
  for (const providerField of ['predictions', 'eventDate', 'qcFlagCode', 'timeSeriesId']) {
    assert.equal(normalizedText.includes(`"${providerField}"`), false);
  }
});

test('a subordinate station keeps its reference relationship in station and source details', async () => {
  const rows = fiveLocalDays('2026-08-19T19:00:00Z', 'America/Los_Angeles');
  const station = { ...noaaStation, id: '9445882', name: 'Eagle Harbor', kind: 'subordinate', referenceStationId: '9447130' };
  const result = await new TideProvider({ config, fetchImpl: fixtureResponse(noaaPayload) }).forecast({
    context, station, timeZone: 'America/Los_Angeles', rows
  });
  assert.equal(result.station.kind, 'subordinate');
  assert.equal(result.station.referenceStationId, '9447130');
  assert.equal(result.sources[0].referenceStationId, '9447130');
});

test('every prediction lands once with type, local time, offset, datum, and metres', () => {
  const noaaRows = fiveLocalDays('2026-08-19T19:00:00Z', 'America/Los_Angeles');
  const chsRows = fiveLocalDays('2026-08-20T12:00:00Z', 'America/Halifax');
  const noaa = normalizeNoaaPredictions(noaaPayload, { rows: noaaRows, timeZone: 'America/Los_Angeles' });
  const chs = normalizeChsPredictions(chsPayload, { rows: chsRows, timeZone: 'America/Halifax' });

  assert.equal(noaa.length, noaaPayload.predictions.length);
  assert.equal(chs.length, chsPayload.length);
  for (const { tide } of [...noaa, ...chs]) {
    assert.match(tide.type, /^(high|low)$/);
    assert.match(tide.localTime, /^\d{2}:\d{2}:\d{2}$/);
    assert.match(tide.offset, /^[+-]\d{2}:\d{2}$/);
    assert.equal(tide.unit, 'm');
  }
});

test('mixed semidiurnal highs remain separate', () => {
  const rows = fiveLocalDays('2026-08-19T19:00:00Z', 'America/Los_Angeles');
  const events = normalizeNoaaPredictions(noaaPayload, { rows, timeZone: 'America/Los_Angeles' });
  const firstDayHighs = events.filter(({ rowIndex, tide }) => rowIndex === 0 && tide.type === 'high').map(({ tide }) => tide.height);
  assert.deepEqual(firstDayHighs, [3.054]);
  const secondDayHighs = events.filter(({ rowIndex, tide }) => rowIndex === 1 && tide.type === 'high').map(({ tide }) => tide.height);
  assert.deepEqual(secondDayHighs, [2.741, 2.862]);
});

test('requests cover all five local days, including a DST transition', () => {
  const rows = fiveLocalDays('2026-10-31T16:00:00Z', 'America/Los_Angeles');
  assert.equal(rows.some((row) => row.durationHours === 25), true);
  const noaaUrl = new URL(buildNoaaRequest({ station: noaaStation, rows, config: config.providers.noaa }));
  const chsUrl = new URL(buildChsRequest({ station: chsStation, rows, config: config.providers.chs }));
  assert.equal(noaaUrl.searchParams.get('begin_date'), rows[0].startUtc.slice(0, 10).replaceAll('-', ''));
  assert.equal(noaaUrl.searchParams.get('end_date'), rows.at(-1).endUtc.slice(0, 10).replaceAll('-', ''));
  assert.equal(chsUrl.searchParams.get('from'), rows[0].startUtc);
  assert.equal(chsUrl.searchParams.get('to'), rows.at(-1).endUtc);
});

for (const [label, fetchImpl] of [
  ['empty predictions', fixtureResponse({ predictions: [] })],
  ['malformed payload', fixtureResponse({ data: 'not predictions' })],
  ['HTTP 500', async () => ({ ok: false, status: 500 })],
  ['timeout', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  })]
]) {
  test(`${label} maps only to tides-unavailable`, async () => {
    const rows = fiveLocalDays('2026-08-19T19:00:00Z', 'America/Los_Angeles');
    const result = await new TideProvider({ config, fetchImpl, timeoutMs: 5 }).forecast({
      context, station: noaaStation, timeZone: 'America/Los_Angeles', rows
    });
    assertStableShape(result, 'noaa');
    assert.deepEqual(result.warnings.map((warning) => warning.code), ['tides-unavailable']);
    assert.equal(result.days.every((day) => day.tides.length === 0), true);
  });
}
