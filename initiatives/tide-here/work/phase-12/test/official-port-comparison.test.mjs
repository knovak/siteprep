import assert from 'node:assert/strict';
import {test} from 'node:test';

import {compareWithOfficialPort} from '../src/official-port-comparison.mjs';

const thresholds = {
  minimumPairs: 4,
  pairingWindowMinutes: 180,
  p90TimeDifferenceMinutes: 30,
  maximumTimeDifferenceMinutes: 45,
  maximumHeightResidualM: 0.35,
};

const officialEvents = [
  ['high', '2026-08-27T00:00:00.000Z', 2.0],
  ['low', '2026-08-27T06:00:00.000Z', 0.4],
  ['high', '2026-08-27T12:00:00.000Z', 2.2],
  ['low', '2026-08-27T18:00:00.000Z', 0.3],
].map(([type, at, height]) => ({type, at, height}));

test('official comparison removes one datum offset and preserves timing and shape tests', () => {
  const modelEvents = officialEvents.map((event, index) => ({
    ...event,
    at: new Date(Date.parse(event.at) + (index + 1) * 60_000).toISOString(),
    height: event.height - 1.25 + (index % 2 ? -0.02 : 0.02),
  }));
  const comparison = compareWithOfficialPort({modelEvents, officialEvents, thresholds});
  assert.equal(comparison.passed, true);
  assert.equal(comparison.metrics.pairedEvents, 4);
  assert.equal(comparison.metrics.datumOffsetM, 1.25);
  assert.equal(comparison.metrics.maximumTimeDifferenceMinutes, 4);
  assert.equal(comparison.metrics.maximumHeightResidualM, 0.02);
});

test('official comparison fails fixed timing, shape and sample-size gates', () => {
  const slowModel = officialEvents.map(event => ({
    ...event,
    at: new Date(Date.parse(event.at) + 40 * 60_000).toISOString(),
    height: event.height - 1,
  }));
  assert.equal(compareWithOfficialPort({modelEvents: slowModel, officialEvents, thresholds}).passed, false);

  const distortedModel = officialEvents.map((event, index) => ({
    ...event,
    height: event.height - 1 + (index === 0 ? 0.8 : 0),
  }));
  assert.equal(compareWithOfficialPort({modelEvents: distortedModel, officialEvents, thresholds}).passed, false);

  const tooFew = compareWithOfficialPort({
    modelEvents: officialEvents.slice(0, 3),
    officialEvents,
    thresholds,
  });
  assert.equal(tooFew.passed, false);
});
