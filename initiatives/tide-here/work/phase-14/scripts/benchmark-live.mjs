// Opt-in, read-only HTTPS endpoint timings. Never initializes or imports data.
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';

const usage = 'Usage: node phase-14/scripts/benchmark-live.mjs --url <site-url> [--samples 3] [--at <ISO-instant>] [--output <report.json>]';
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const option = process.argv[index];
  const value = process.argv[index + 1];
  if (!['--url', '--samples', '--at', '--output'].includes(option) || !value) throw new Error(usage);
  options[option.slice(2)] = value;
}
if (!options.url) throw new Error(usage);
const base = new URL(options.url);
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Expected an HTTP(S) Site URL without credentials');
if (base.pathname !== '/' || base.search || base.hash) throw new Error('Expected the Site origin, without a path or query');
const sampleCount = Number(options.samples ?? 3);
if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 10) throw new Error('--samples must be an integer from 1 through 10');
const at = new Date(options.at ?? Date.now());
if (!Number.isFinite(at.getTime())) throw new Error('--at must be a valid ISO instant');

const samples = [];
const startedAt = new Date().toISOString();
async function activeSnapshot() {
  const response = await fetch(new URL('/health', base), {signal: AbortSignal.timeout(60_000)});
  const health = await response.json();
  if (!response.ok || !health.ready) throw new Error('The benchmark Site is not ready');
  return {registry: health.registry, providers: health.providers};
}
const activeBefore = await activeSnapshot();
async function measuredFetch(route, iteration, {station, body} = {}) {
  const start = performance.now();
  const response = await fetch(new URL(route, base), {
    ...(body ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(60_000),
  });
  const headersMs = performance.now() - start;
  const text = await response.text();
  const totalMs = performance.now() - start;
  let payload;
  try { payload = JSON.parse(text); } catch { /* Preserve status and timings for non-JSON errors. */ }
  const sample = {
    route: route.split('?')[0],
    iteration,
    ...(station ? {station: station.id} : {}),
    status: response.status,
    headersMs,
    totalMs,
    bytes: new TextEncoder().encode(text).byteLength,
    cacheControl: response.headers.get('cache-control'),
    cacheStatus: response.headers.get('cf-cache-status'),
    cfRay: response.headers.get('cf-ray'),
    ...(payload?.days ? {events: payload.days.reduce((sum, day) => sum + day.tides.length, 0)} : {}),
    ...(payload?.sources?.[0]?.datasetVersion ? {datasetVersion: payload.sources[0].datasetVersion} : {}),
    ...(!response.ok ? {errorCode: payload?.code ?? null} : {}),
  };
  samples.push(sample);
  console.log(JSON.stringify(sample));
  return payload;
}

let catalogue;
for (let iteration = 1; iteration <= sampleCount; iteration += 1) {
  const payload = await measuredFetch('/stations?provider=australia-standard-ports', iteration);
  if (Array.isArray(payload?.stations)) catalogue = payload.stations;
}
if (!catalogue) throw new Error('No valid Australian station catalogue was returned');
for (const id of ['au-qld-brisbane-bar', 'au-nsw-sydney', 'au-wa-fremantle']) {
  const station = catalogue.find(item => item.id === id);
  if (!station) throw new Error(`Required benchmark station is missing: ${id}`);
  const body = {
    provider: 'australia-standard-ports',
    context: {
      input: {display: station.name},
      place: {name: station.name, lat: station.latitude, lon: station.longitude},
      coast: {name: station.name, distanceKm: 0},
    },
    station: {id: station.id},
    timeZone: station.timeZone,
    rows: fiveLocalDays(at, station.timeZone),
  };
  for (let iteration = 1; iteration <= sampleCount; iteration += 1) {
    await measuredFetch('/forecast', iteration, {station, body});
  }
}
// A cached static asset is a network/edge control, not a forecast substitute.
for (let iteration = 1; iteration <= sampleCount; iteration += 1) {
  await measuredFetch('/phase-2/data/provider-config.json', iteration);
}
const groups = new Map();
for (const sample of samples) {
  const key = [sample.route, sample.station].filter(Boolean).join(':');
  const group = groups.get(key) ?? [];
  group.push(sample);
  groups.set(key, group);
}
const summaries = [...groups].map(([key, group]) => {
  const durations = group.map(sample => sample.totalMs).sort((left, right) => left - right);
  const middle = Math.floor(durations.length / 2);
  return {
    key,
    n: durations.length,
    statuses: group.map(sample => sample.status),
    medianMs: durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2,
    minMs: durations[0],
    maxMs: durations.at(-1),
  };
});
const report = {
  schema: 'tide-here/live-response-benchmark/v1',
  url: base.origin,
  startedAt,
  finishedAt: new Date().toISOString(),
  forecastAt: at.toISOString(),
  sampleCount,
  activeBefore,
  activeAfter: await activeSnapshot(),
  scope: 'Read-only endpoint timings from the execution host. CF-Ray identifies the responding edge, not the physical client location. Excludes page startup, geolocation and geocoding.',
  samples,
  summaries,
};
if (options.output) await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({summaries, output: options.output ?? null}, null, 2));
if (samples.some(sample => sample.status !== 200)) process.exitCode = 1;
if (JSON.stringify(report.activeBefore) !== JSON.stringify(report.activeAfter)) {
  console.error('The active dataset changed during measurement; repeat when activation has finished.');
  process.exitCode = 1;
}
