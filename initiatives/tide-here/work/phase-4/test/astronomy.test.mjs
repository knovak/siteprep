import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { fiveLocalDays, localDateTimeUtc } from '../../phase-1/src/day-model.mjs';
import {
  ASTRONOMY_UNAVAILABLE,
  Astronomy,
  NO_EVENT,
  SUNCALC_SOURCE,
  calculateAstronomyDay,
  eventDisplayState
} from '../src/astronomy.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = resolve(phaseDirectory, 'src/astronomy.mjs');
const dayModelPath = resolve(phaseDirectory, '../phase-1/src/day-model.mjs');

function forecastFor(rows) {
  return {
    input: { display: 'Seattle' },
    place: { name: 'Seattle', lat: 47.6062, lon: -122.3321 },
    coast: { name: 'Seattle coast', distanceKm: 0 },
    station: { provider: 'noaa', id: '9447130', name: 'Seattle' },
    timeZone: 'America/Los_Angeles',
    days: rows.map((row, index) => ({
      date: row.date,
      tides: [{ type: index % 2 ? 'low' : 'high', at: row.startUtc }],
      sunrise: [],
      sunset: [],
      moonrise: [],
      moonset: [],
      moonPhase: null
    })),
    sources: [{ provider: 'noaa' }],
    warnings: []
  };
}

test('pinned SunCalc fills five station-local rows with absolute instants and a local-noon phase', () => {
  const rows = fiveLocalDays('2026-08-21T18:00:00.000Z', 'America/Los_Angeles');
  const result = new Astronomy({ now: () => new Date('2026-08-21T18:00:00.000Z') }).enrich({
    forecast: forecastFor(rows),
    rows,
    station: { lat: 47.6026, lon: -122.3393 },
    timeZone: 'America/Los_Angeles'
  });

  assert.equal(result.days.length, 5);
  assert.equal(result.sources.at(-1), SUNCALC_SOURCE);
  assert.equal(result.sources.at(-1).version, '2.0.1');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.days.filter((day) => day.moonPhase.isCurrent).length, 1);

  for (const [index, day] of result.days.entries()) {
    assert.equal(day.sunrise.length, 1);
    assert.equal(day.sunset.length, 1);
    assert.equal(day.moonPhase.at, localDateTimeUtc(day.date, 'America/Los_Angeles', { hour: 12 }));
    assert.match(day.moonPhase.name, /Moon|Crescent|Quarter|Gibbous/);
    for (const instant of [...day.sunrise, ...day.sunset, ...day.moonrise, ...day.moonset]) {
      assert.match(instant, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assert.ok(Date.parse(instant) >= Date.parse(rows[index].startUtc));
      assert.ok(Date.parse(instant) < Date.parse(rows[index].endUtc));
    }
  }
});

test('the local-day window keeps two moonrises and always uses station coordinates', () => {
  const row = fiveLocalDays('2026-08-21T18:00:00.000Z', 'America/Los_Angeles')[0];
  const seenCoordinates = [];
  let moonCall = 0;
  const record = (latitude, longitude) => seenCoordinates.push([latitude, longitude]);
  const calculator = {
    getTimes(_date, latitude, longitude) {
      record(latitude, longitude);
      return {
        sunrise: new Date(Date.parse(row.startUtc) + 2 * 60 * 60 * 1000),
        sunset: new Date(Date.parse(row.startUtc) + 10 * 60 * 60 * 1000)
      };
    },
    getPosition(_date, latitude, longitude) {
      record(latitude, longitude);
      return { altitude: 10 };
    },
    getMoonTimes(_date, latitude, longitude) {
      record(latitude, longitude);
      const rise = new Date(Date.parse(row.startUtc) + (moonCall++ === 0 ? 1 : 20) * 60 * 60 * 1000);
      return { rise };
    },
    getMoonPosition(_date, latitude, longitude) {
      record(latitude, longitude);
      return { altitude: 10 };
    },
    getMoonIllumination() {
      return { fraction: 0.5, phase: 0.375 };
    }
  };

  const day = calculateAstronomyDay(row, {
    latitude: 47.6026,
    longitude: -122.3393,
    timeZone: 'America/Los_Angeles',
    calculator
  });
  assert.equal(day.moonrise.length, 2);
  assert.equal(day.moonset.length, 0);
  assert.equal(day.moonPhase.name, 'Waxing Gibbous');
  assert.ok(seenCoordinates.length > 0);
  assert.ok(seenCoordinates.every((coordinates) => coordinates[0] === 47.6026 && coordinates[1] === -122.3393));
});

test('zero-event and polar days remain valid astronomy results', () => {
  const row = fiveLocalDays('2026-06-21T12:00:00.000Z', 'America/Anchorage')[0];
  const calculator = {
    getTimes: () => ({ sunrise: null, sunset: null, alwaysUp: true }),
    getPosition: () => ({ altitude: 20 }),
    getMoonTimes: () => ({}),
    getMoonPosition: () => ({ altitude: -20 }),
    getMoonIllumination: () => ({ fraction: 0.7, phase: 0.6 })
  };
  const day = calculateAstronomyDay(row, {
    latitude: 70.2556,
    longitude: -148.3372,
    timeZone: 'America/Anchorage',
    calculator
  });

  assert.deepEqual(day.sunrise, []);
  assert.deepEqual(day.moonrise, []);
  assert.equal(day.sunState, 'always-up');
  assert.equal(day.moonState, 'always-down');
  assert.deepEqual(eventDisplayState(day, 'moonrise'), { code: NO_EVENT, message: 'does not rise' });
  assert.deepEqual(eventDisplayState(day, 'sunset'), { code: NO_EVENT, message: 'does not set' });
});

test('an astronomy failure preserves tide rows and adds only astronomy-unavailable', () => {
  const rows = fiveLocalDays('2026-08-21T18:00:00.000Z', 'America/Los_Angeles');
  const forecast = forecastFor(rows);
  forecast.warnings.push({ code: 'tides-unavailable', message: 'Recorded tide failure.' });
  const calculator = {
    getTimes: () => { throw new Error('calculation failed'); },
    getPosition: () => ({ altitude: 0 }),
    getMoonTimes: () => ({}),
    getMoonPosition: () => ({ altitude: 0 }),
    getMoonIllumination: () => ({ fraction: 0, phase: 0 })
  };
  const result = new Astronomy({ calculator }).enrich({
    forecast,
    rows,
    station: { lat: 47.6026, lon: -122.3393 }
  });

  assert.deepEqual(result.warnings.map((warning) => warning.code), ['tides-unavailable', ASTRONOMY_UNAVAILABLE]);
  assert.deepEqual(result.days.map((day) => day.tides), forecast.days.map((day) => day.tides));
  assert.ok(result.days.every((day) => day.astronomyState === 'unavailable' && day.moonPhase === null));
  assert.deepEqual(eventDisplayState(result.days[0], 'sunrise'), { code: ASTRONOMY_UNAVAILABLE, message: 'unavailable' });
});

test('the same coast-local inputs are independent of the process device zone', () => {
  const astronomyUrl = pathToFileURL(modulePath).href;
  const dayModelUrl = pathToFileURL(dayModelPath).href;
  const program = `
    import { Astronomy } from ${JSON.stringify(astronomyUrl)};
    import { fiveLocalDays } from ${JSON.stringify(dayModelUrl)};
    const rows = fiveLocalDays('2026-03-08T12:00:00.000Z', 'America/New_York');
    const forecast = {
      input: {}, place: {}, coast: {}, station: {}, timeZone: 'America/New_York',
      days: rows.map((row) => ({ date: row.date, tides: [], sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null })),
      sources: [], warnings: []
    };
    const result = new Astronomy({ now: () => new Date('2026-03-08T12:00:00.000Z') }).enrich({
      forecast, rows, station: { lat: 42.3601, lon: -71.0589 }
    });
    process.stdout.write(JSON.stringify(result.days));
  `;
  const outputs = ['UTC', 'America/Los_Angeles', 'Asia/Kolkata', 'Pacific/Auckland'].map((TZ) => (
    execFileSync(process.execPath, ['--input-type=module', '--eval', program], {
      encoding: 'utf8',
      env: { ...process.env, TZ }
    })
  ));
  assert.equal(new Set(outputs).size, 1);
});

test('the vendored SunCalc source matches the recorded release checksum', async () => {
  const source = await readFile(resolve(phaseDirectory, 'vendor/suncalc-2.0.1.mjs'));
  const manifest = JSON.parse(await readFile(resolve(phaseDirectory, 'vendor/source.json'), 'utf8'));
  assert.equal(createHash('sha256').update(source).digest('hex'), manifest.sha256);
  assert.equal(manifest.version, '2.0.1');
  assert.equal(manifest.commit, SUNCALC_SOURCE.commit);
});
