// Compare complete gateway responses against the same licensed annual data.
// These are local CPU/object-byte measurements, not Australian network latency.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {createProviderGatewayApp} from '../../phase-10/src/gateway.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {stageThreeProviderRegistry} from '../../phase-11/fixtures/provider-registry.mjs';
import {australiaDatasetBundle, australiaShardedDatasetBundle} from '../../phase-11/src/australia-importer.mjs';
import {australianStationCatalogue, forecastAustralianStandardPort} from '../../phase-11/src/australia-provider.mjs';

const args = process.argv.slice(2);
function argument(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
const iterations = Number(argument('--iterations', '15'));
if (!Number.isInteger(iterations) || iterations < 3 || iterations > 100) throw new Error('Use 3–100 iterations');
const output = argument('--output', fileURLToPath(new URL('../evidence/server-benchmark-r2.json', import.meta.url)));
const prepared = await loadAustraliaPreparedOfficial();
const legacyBundle = australiaDatasetBundle(prepared);
const shardedBundle = australiaShardedDatasetBundle(prepared, {revision: 1});
const portRecordBundle = australiaShardedDatasetBundle(prepared);
const originalDescriptor = stageThreeProviderRegistry.providers.find(provider => provider.id === 'australia-standard-ports');
const selectedOnly = {...originalDescriptor, dataRef: {...originalDescriptor.dataRef, verification: 'manifest-and-selected-objects'}};
const shardedDescriptor = {
  ...originalDescriptor,
  requiredDatasetSchema: shardedBundle.dataset.schema,
  dataRef: {id: shardedBundle.dataset.id, version: shardedBundle.dataset.version, verification: 'manifest-and-selected-objects'},
};

const portRecordDescriptor = {...shardedDescriptor, requiredDatasetSchema: portRecordBundle.dataset.schema, dataRef: {...shardedDescriptor.dataRef, version: portRecordBundle.dataset.version}};

async function harness(bundle, descriptor, cacheBodies = false) {
  const store = new MemoryObjectStore();
  await initializeJsonDataset(store, bundle);
  await initializeProviderRegistry(store, {
    ...stageThreeProviderRegistry, version: 'server-benchmark-r1', providers: [descriptor],
  }, {verifyObjectsFor: [descriptor.id]});
  const cache = new Map();
  const reads = [];
  const tracked = {
    async get(key) {
      if (cacheBodies && cache.has(key)) return cache.get(key);
      const value = await store.get(key);
      reads.push({key, bytes: value ? Buffer.byteLength(value.body) : 0});
      if (cacheBodies) cache.set(key, value);
      return value;
    },
  };
  return {
    reads,
    app: createProviderGatewayApp({
      initialize: async () => ({}), storeFactory: () => tracked,
      forecastAdapters: {[descriptor.id]: forecastAustralianStandardPort},
      stationCatalogues: {[descriptor.id]: australianStationCatalogue},
    }),
  };
}

function requestFor(station, instant) {
  return {
    provider: originalDescriptor.id,
    context: {input: {display: station.name}, place: {name: station.name}, coast: {name: station.name}},
    station, timeZone: station.timeZone, rows: fiveLocalDays(instant, station.timeZone),
  };
}
function forecastRequest(body) {
  return new Request('https://benchmark.invalid/forecast', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body),
  });
}
const scenarios = [
  {id: 'legacy-full-validation', bundle: legacyBundle, descriptor: originalDescriptor},
  {id: 'legacy-manifest-selected', bundle: legacyBundle, descriptor: selectedOnly},
  {id: 'legacy-raw-body-cache', bundle: legacyBundle, descriptor: originalDescriptor, cacheBodies: true},
  {id: 'sharded-manifest-selected', bundle: shardedBundle, descriptor: shardedDescriptor},
  {id: 'port-records-manifest-selected', bundle: portRecordBundle, descriptor: portRecordDescriptor},
];
const cases = [
  ['au-qld-mooloolaba', '2026-11-08T18:00:00Z'],
  ['au-nsw-sydney', '2026-10-03T18:00:00Z'],
  ['au-sa-port-adelaide', '2026-10-03T18:00:00Z'],
].map(([id, instant]) => {
  const station = prepared.stations.find(item => item.id === id);
  if (!station) throw new Error(`Benchmark station is absent: ${id}`);
  return requestFor(station, instant);
});
const expected = new Map();
const measurements = [];
for (const scenario of scenarios) {
  const {app, reads} = await harness(scenario.bundle, scenario.descriptor, scenario.cacheBodies);
  for (const [index, body] of cases.entries()) {
    const times = [];
    const firstRead = reads.length;
    for (let sample = 0; sample < iterations; sample++) {
      const start = performance.now();
      const response = await app.fetch(forecastRequest(body));
      const value = await response.json();
      times.push(performance.now() - start);
      assert.equal(response.status, 200, JSON.stringify(value));
      if (!expected.has(index)) expected.set(index, value);
      assert.deepEqual(value, expected.get(index), `${scenario.id}: ${body.station.id}`);
    }
    const selectedReads = reads.slice(firstRead);
    times.sort((left, right) => left - right);
    measurements.push({
      option: scenario.id, endpoint: 'forecast', station: body.station.id, timeZone: body.timeZone,
      localDates: body.rows.map(row => row.date), iterations,
      medianMs: times[Math.floor(iterations / 2)], p95Ms: times[Math.ceil(iterations * 0.95) - 1],
      objectReadsPerRequest: selectedReads.length / iterations,
      objectBytesPerRequest: selectedReads.reduce((sum, read) => sum + read.bytes, 0) / iterations,
      largestObjectBytes: Math.max(0, ...selectedReads.map(read => read.bytes)),
    });
  }
  const times = [];
  const firstRead = reads.length;
  for (let sample = 0; sample < iterations; sample++) {
    const start = performance.now();
    const response = await app.fetch(new Request('https://benchmark.invalid/stations?provider=australia-standard-ports'));
    const value = await response.json();
    times.push(performance.now() - start);
    assert.equal(response.status, 200);
    assert.deepEqual(value.stations, prepared.stations);
  }
  const selectedReads = reads.slice(firstRead);
  times.sort((left, right) => left - right);
  measurements.push({
    option: scenario.id, endpoint: 'catalogue', iterations,
    medianMs: times[Math.floor(iterations / 2)], p95Ms: times[Math.ceil(iterations * 0.95) - 1],
    objectReadsPerRequest: selectedReads.length / iterations,
    objectBytesPerRequest: selectedReads.reduce((sum, read) => sum + read.bytes, 0) / iterations,
    largestObjectBytes: Math.max(0, ...selectedReads.map(read => read.bytes)),
  });
}
const evidence = {
  schema: 'tide-here/server-performance/v1', measuredAt: new Date().toISOString(),
  environment: {node: process.version, platform: process.platform, arch: process.arch},
  method: 'Local Node gateway with MemoryObjectStore; each un-cached request rereads provider object bodies. No network delay, Australian execution location or deployed Worker latency is implied. Raw-body cache is an experiment only and bypasses cross-request freshness.',
  equality: 'Deep equality of complete normalized forecasts, previousTide, source metadata, local dates/times, heights and warnings across all five options; catalogue equals all 76 original stations.',
  annual: {stations: prepared.stations.length, events: prepared.events.length, bytes: Buffer.byteLength(JSON.stringify(prepared))},
  sharded: {objects: Object.keys(shardedBundle.objects).length, catalogueBytes: Buffer.byteLength(JSON.stringify(shardedBundle.objects.catalogue))},
  portRecords: {objects: Object.keys(portRecordBundle.objects).length, catalogueBytes: Buffer.byteLength(JSON.stringify(portRecordBundle.objects.catalogue))},
  measurements,
};
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
