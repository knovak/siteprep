import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import { dayViewModel, forecastViewModel, formatCoastTime, providerLabel, statePresentation, tideProgress, moonPhaseIcon } from '../src/page-view.mjs';

const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();

const day = {
  date: '2026-08-20',
  tides: [{ type: 'high', at: '2026-08-20T15:30:00.000Z', height: 2.34, unit: 'm' }],
  sunrise: ['2026-08-20T13:05:00.000Z'],
  sunset: ['2026-08-21T03:14:00.000Z'],
  moonrise: [],
  moonset: ['2026-08-20T22:02:00.000Z'],
  moonPhase: { name: 'First Quarter' },
  astronomyState: 'available'
};

test('event times always use the named coast zone', () => {
  assert.equal(formatCoastTime('2026-08-20T15:30:00.000Z', 'America/Los_Angeles'), '8:30 AM');
  assert.equal(formatCoastTime('2026-08-20T15:30:00.000Z', 'America/Halifax'), '12:30 PM');
  const model = dayViewModel(day, 'America/Los_Angeles');
  assert.equal(model.tides[0].time, '8:30 AM');
  assert.deepEqual(model.moonrise, { label: 'does not rise', code: 'no-event' });
});

test('past tide styling compares absolute instants while labels stay in the coast zone', () => {
  const model = dayViewModel({
    ...day,
    tides: [
      { type: 'low', at: '2026-08-20T14:30:00.000Z', height: 0.5, unit: 'm' },
      { type: 'high', at: '2026-08-20T15:30:00.000Z', height: 2.34, unit: 'm' }
    ]
  }, 'America/Halifax', '2026-08-20T15:00:00.000Z');
  assert.deepEqual(model.tides.map(({ time, isPast }) => ({ time, isPast })), [
    { time: '11:30 AM', isPast: true },
    { time: '12:30 PM', isPast: false }
  ]);
});

test('the page vocabulary gives every state a distinct message', () => {
  const codes = [
    'invalid-input', 'place-not-found', 'geocoder-unavailable', 'coverage-unavailable',
    'coast-choice-required', 'tides-unavailable', 'astronomy-unavailable', 'no-event',
    'fixture-data', 'approximate-fallback', 'location-permission-denied', 'location-unavailable'
  ];
  const states = codes.map(statePresentation);
  assert.equal(new Set(states.map((state) => state.message)).size, 12);
});

test('provider labels distinguish the Australian test path from official sources', () => {
  assert.equal(providerLabel('noaa'), 'NOAA');
  assert.equal(providerLabel('chs'), 'CHS');
  assert.equal(providerLabel('australia-standard-ports'), 'Australian test port');
  assert.equal(providerLabel('australia-standard-ports', {official: true}), 'Bureau of Meteorology');
  assert.equal(providerLabel('fes2022'), 'FES2022 approximate model');
});

test('the browser catalogue exactly matches the initialized Australian station artifact', async () => {
  const catalogue = JSON.parse(await readFile(new URL('../data/australia-stations.json', import.meta.url), 'utf8'));
  assert.equal(catalogue.provider, 'australia-standard-ports');
  assert.deepEqual(catalogue.stations, australiaPreparedOfficial.stations);
});

test('the forecast view keeps all three names, station, zone, and five equal-shape days', () => {
  const forecast = {
    input: { display: 'Seattle' },
    place: { name: 'Seattle, Washington, United States' },
    coast: { name: 'SEATTLE (Madison St.), Elliott Bay' },
    station: { provider: 'noaa', name: 'SEATTLE (Madison St.), Elliott Bay', kind: 'reference', datum: 'MLLW' },
    timeZone: 'America/Los_Angeles',
    days: Array.from({ length: 5 }, (_, index) => ({ ...day, date: `2026-08-${20 + index}` })),
    warnings: []
  };
  const model = forecastViewModel(forecast);
  assert.deepEqual([model.entered, model.resolved, model.coast], [
    'Seattle', 'Seattle, Washington, United States', 'SEATTLE (Madison St.), Elliott Bay'
  ]);
  assert.equal(model.days.length, 5);
  assert.equal(model.timeZone, 'America/Los_Angeles');
});

const turningTides = [
  { type: 'low', at: '2026-08-20T21:00:00Z' },
  { type: 'high', at: '2026-08-21T03:00:00Z' },
  { type: 'low', at: '2026-08-21T09:00:00Z' }
];

test('tide direction and fill follow the surrounding extrema across midnight', () => {
  const rising = tideProgress(turningTides, '2026-08-21T00:00:00Z');
  assert.equal(rising.direction, 'up');
  assert.equal(rising.fill, .5);
  const nearHigh = tideProgress(turningTides, '2026-08-21T02:00:00Z');
  assert.equal(nearHigh.fill, 5 / 6);
  const falling = tideProgress(turningTides, '2026-08-21T06:00:00Z');
  assert.equal(falling.direction, 'down');
  assert.equal(falling.fill, .5);
});

test('the arrow changes direction at an extremum and is full at high or empty at low', () => {
  assert.deepEqual([tideProgress(turningTides, turningTides[0].at).direction, tideProgress(turningTides, turningTides[0].at).fill], ['up', 0]);
  assert.deepEqual([tideProgress(turningTides, turningTides[1].at).direction, tideProgress(turningTides, turningTides[1].at).fill], ['down', 1]);
});

test('tide fill stays unknown without a preceding opposite extremum and no arrow is invented past the window', () => {
  const unknown = tideProgress(turningTides.slice(1), '2026-08-21T00:00:00Z');
  assert.equal(unknown.direction, 'up');
  assert.equal(unknown.fill, null);
  assert.match(unknown.description, /cannot be estimated/);
  assert.equal(tideProgress([{ type: 'high', at: '2026-08-20T21:00:00Z' }, turningTides[1]], '2026-08-21T00:00:00Z').fill, null);
  assert.equal(tideProgress(turningTides, '2026-08-22T00:00:00Z'), null);
});

test('the current day moon is computed at the current instant and future days keep their daily phase', () => {
  const stalePhase = { phase: .01, fraction: .001, name: 'New Moon' };
  const today = dayViewModel({ ...day, moonPhase: stalePhase }, 'America/Los_Angeles', '2026-08-20T13:00:00Z', { latitude: -27 });
  assert.equal(today.isToday, true);
  assert.notEqual(today.moonIcon.phase, stalePhase.phase);
  assert.equal(today.moonIcon.southernHemisphere, true);
  const tomorrow = dayViewModel({ ...day, date: '2026-08-21', moonPhase: stalePhase }, 'America/Los_Angeles', '2026-08-20T13:00:00Z');
  assert.equal(tomorrow.isToday, false);
  assert.equal(tomorrow.moonPhase, 'New Moon');
  assert.ok(Math.abs(tomorrow.moonIcon.phase - .01) < 1e-12);
  assert.equal(moonPhaseIcon(null), null);
  assert.equal(dayViewModel({ ...day, moonPhase: null, astronomyState: 'unavailable' }, 'UTC', '2026-08-20T13:00:00Z').moonIcon, null);
});

test('forecast progress includes the previous-day context and only attaches to the coast current day', () => {
  const forecast = {
    input: { display: 'Seattle' }, place: { name: 'Seattle', lat: 47 }, coast: { name: 'Seattle' },
    station: { provider: 'noaa', name: 'Seattle', kind: 'reference', datum: 'MLLW' },
    timeZone: 'UTC', warnings: [], previousTide: turningTides[0],
    days: [{ ...day, date: '2026-08-21', tides: turningTides.slice(1).map((event) => ({ ...event, height: 1, unit: 'm' })) }]
  };
  const current = forecastViewModel(forecast, '2026-08-21T00:00:00Z');
  assert.equal(current.days[0].tideProgress.fill, .5);
  assert.equal(forecastViewModel(forecast, '2026-08-22T00:00:00Z').days[0].tideProgress, null);
});
