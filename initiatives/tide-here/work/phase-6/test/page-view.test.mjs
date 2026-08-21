import assert from 'node:assert/strict';
import test from 'node:test';

import { dayViewModel, forecastViewModel, formatCoastTime, statePresentation } from '../src/page-view.mjs';

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

test('the page vocabulary gives every state a distinct message and action', () => {
  const codes = [
    'invalid-input', 'place-not-found', 'geocoder-unavailable', 'coverage-unavailable',
    'coast-choice-required', 'tides-unavailable', 'astronomy-unavailable', 'no-event'
  ];
  const states = codes.map(statePresentation);
  assert.equal(new Set(states.map((state) => state.message)).size, 8);
  assert.equal(new Set(states.map((state) => state.action)).size, 8);
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
