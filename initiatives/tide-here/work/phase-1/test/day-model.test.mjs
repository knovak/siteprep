import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import {
  describeInstant,
  fiveLocalDays,
  localDateForInstant,
  localMidnightUtc,
  offsetMinutesAt,
  placeInstantInRow,
  resolveTimeZone
} from '../src/day-model.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(here, '../src/day-model.mjs');
const dataset = JSON.parse(await readFile(resolve(here, '../data/time-zones.fixture.geojson'), 'utf8'));

test('pinned coordinate fixtures resolve to their expected IANA zones', () => {
  const fixtures = [
    [47.6062, -122.3321, 'America/Los_Angeles'],
    [42.3601, -71.0589, 'America/New_York'],
    [44.6488, -63.5752, 'America/Halifax'],
    [70.2556, -148.3372, 'America/Anchorage'],
    [49.0, -123.05, 'America/Vancouver'],
    [21.3069, -157.8583, 'Pacific/Honolulu'],
    [39.7392, -104.9903, 'America/Denver'],
    [33.4484, -112.074, 'America/Phoenix'],
    [38.7223, -9.1393, 'Europe/Lisbon']
  ];
  for (const [latitude, longitude, expected] of fixtures) {
    assert.equal(resolveTimeZone(latitude, longitude, dataset), expected);
  }
  assert.throws(() => resolveTimeZone(51.5072, -0.1276, dataset), /No pinned time-zone coverage/);
});

test('five rows start on the coast-local date containing now', () => {
  const rows = fiveLocalDays('2026-08-21T04:30:00.000Z', 'Pacific/Honolulu');
  assert.deepEqual(rows.map((row) => row.date), [
    '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'
  ]);
  assert.equal(rows.length, 5);
  assert.equal(localDateForInstant(rows[0].startUtc, 'Pacific/Honolulu'), rows[0].date);
  assert.equal(localDateForInstant(new Date(Date.parse(rows[0].endUtc) - 1000), 'Pacific/Honolulu'), rows[0].date);
});

test('the process device zone cannot change the same inputs', () => {
  const moduleUrl = pathToFileURL(modulePath).href;
  const program = `import { fiveLocalDays } from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(fiveLocalDays('2026-03-08T06:30:00.000Z', 'America/New_York')));`;
  const outputs = ['UTC', 'America/Los_Angeles', 'Asia/Kolkata', 'Pacific/Auckland'].map((TZ) => (
    execFileSync(process.execPath, ['--input-type=module', '--eval', program], {
      encoding: 'utf8',
      env: { ...process.env, TZ }
    })
  ));
  assert.equal(new Set(outputs).size, 1);
});

test('local-midnight bounds include 23-hour and 25-hour DST days', () => {
  const spring = fiveLocalDays('2026-03-07T12:00:00.000Z', 'America/New_York');
  const fall = fiveLocalDays('2026-10-31T12:00:00.000Z', 'America/New_York');
  assert.equal(spring.find((row) => row.date === '2026-03-08').durationHours, 23);
  assert.equal(fall.find((row) => row.date === '2026-11-01').durationHours, 25);
  assert.equal(localMidnightUtc('2026-03-08', 'America/New_York'), '2026-03-08T05:00:00.000Z');
  assert.equal(localMidnightUtc('2026-03-09', 'America/New_York'), '2026-03-09T04:00:00.000Z');
  assert.ok(fiveLocalDays('2026-03-07T12:00:00.000Z', 'Pacific/Honolulu').every((row) => row.durationHours === 24));
});

test('an instant belongs to exactly one half-open local-day row', () => {
  const rows = fiveLocalDays('2026-03-08T12:00:00.000Z', 'America/New_York');
  const boundary = Date.parse(rows[0].endUtc);
  assert.equal(placeInstantInRow(boundary - 1000, rows, 'America/New_York').rowIndex, 0);
  assert.equal(placeInstantInRow(boundary, rows, 'America/New_York').rowIndex, 1);
  assert.equal(placeInstantInRow(boundary + 1000, rows, 'America/New_York').rowIndex, 1);
  assert.equal(placeInstantInRow(Date.parse(rows[0].startUtc) - 1, rows, 'America/New_York'), null);
});

test('the numeric offset travels with each described displayed instant', () => {
  assert.equal(offsetMinutesAt('2026-03-08T06:59:59.000Z', 'America/New_York'), -300);
  assert.equal(offsetMinutesAt('2026-03-08T07:00:00.000Z', 'America/New_York'), -240);
  assert.deepEqual(describeInstant('2026-03-08T07:00:00.000Z', 'America/New_York'), {
    instantUtc: '2026-03-08T07:00:00.000Z',
    localDate: '2026-03-08',
    localTime: '03:00:00',
    offsetMinutes: -240,
    offset: '-04:00'
  });
});

test('the implementation has no implicit local-zone date or formatting calls', async () => {
  const source = await readFile(modulePath, 'utf8');
  for (const forbidden of [
    '.getFullYear(', '.getMonth(', '.getDate(', '.getHours(', '.getMinutes(', '.getSeconds(',
    '.setFullYear(', '.setMonth(', '.setDate(', '.toLocaleString(', '.toLocaleDateString(', '.toLocaleTimeString('
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden device-zone operation: ${forbidden}`);
  }
});
