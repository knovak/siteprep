import {pyfesBrestReference} from '../fixtures/brest-stage-one.mjs';
import {MemoryObjectStore} from '../src/object-store.mjs';
import {compareWithPyfes} from '../src/reference-comparison.mjs';
import {createStageOneApp} from '../src/worker.mjs';

const store = new MemoryObjectStore();
const app = createStageOneApp({
  storeFactory: () => store,
  now: () => new Date('2026-08-26T12:00:00.000Z'),
});

async function request(path, options) {
  const response = await app.fetch(new Request(`http://localhost${path}`, options));
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const initialized = await request('/init', {method: 'POST'});
const repeated = await request('/init', {method: 'POST'});
const health = await request('/health');
const forecast = await request('/forecast?lat=48.383&lon=-4.495&start=2025-06-01T00:00:00Z&days=5');
const comparison = compareWithPyfes(forecast.tides, pyfesBrestReference);

const result = {
  initialized,
  repeated,
  health,
  forecastEventCount: forecast.tides.length,
  comparison: {
    sourceUrl: comparison.sourceUrl,
    comparedEvents: comparison.comparedEvents,
    timeToleranceMinutes: comparison.timeToleranceMinutes,
    heightToleranceCm: comparison.heightToleranceCm,
    maxTimeDifferenceMinutes: comparison.maxTimeDifferenceMinutes,
    maxHeightDifferenceCm: comparison.maxHeightDifferenceCm,
    passed: comparison.passed,
  },
};

console.log(JSON.stringify(result, null, 2));
if (!comparison.passed) process.exitCode = 1;
