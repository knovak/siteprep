import assert from 'node:assert/strict';
import {test} from 'node:test';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {initializeJsonDataset, datasetManifestKey} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry, loadActiveProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {requestObjectStore} from '../../phase-10/src/request-store.mjs';
import {loadAustraliaPreparedOfficial} from '../fixtures/australia-prepared-official.mjs';
import {stageThreeProviderRegistry} from '../fixtures/provider-registry.mjs';
import {australiaDatasetBundle, australiaShardedDatasetBundle} from '../src/australia-importer.mjs';
import {australianStationCatalogue, forecastAustralianStandardPort} from '../src/australia-provider.mjs';

const prepared = await loadAustraliaPreparedOfficial();
const bundle = australiaShardedDatasetBundle(prepared);
const originalDescriptor = stageThreeProviderRegistry.providers.find(provider => provider.id === 'australia-standard-ports');
const descriptor = {
  ...originalDescriptor,
  requiredDatasetSchema: bundle.dataset.schema,
  dataRef: {id: bundle.dataset.id, version: bundle.dataset.version, verification: 'manifest-and-selected-objects'},
};

function forecastRequest(station, instant = '2026-10-03T18:00:00Z') {
  return {
    provider: descriptor.id,
    context: {input: {display: station.name}, place: {name: station.name}, coast: {name: station.name}},
    station,
    timeZone: station.timeZone,
    rows: fiveLocalDays(instant, station.timeZone),
  };
}

function registry() {
  return {...stageThreeProviderRegistry, version: 'sharded-test-r1', providers: [descriptor]};
}

test('sharding preserves all 76 official ports, events, source versions and normalized forecasts', async () => {
  assert.equal(bundle.dataset.version, '2026-bom-v2-ports-r2');
  assert.equal(bundle.dataset.sourceVersion, prepared.dataset.version);
  assert.equal(bundle.objects.catalogue.stations.length, 76);
  assert.equal(Object.keys(bundle.objects).length, 77);
  assert.equal('events' in bundle.objects.catalogue, false);
  const legacyStore = new MemoryObjectStore();
  const shardedStore = new MemoryObjectStore();
  const previousStore = new MemoryObjectStore();
  const previousBundle = australiaShardedDatasetBundle(prepared, {revision: 1});
  const previousDescriptor = {...descriptor, dataRef: {...descriptor.dataRef, version: previousBundle.dataset.version}};
  await initializeJsonDataset(previousStore, previousBundle);
  await initializeJsonDataset(legacyStore, australiaDatasetBundle(prepared));
  await initializeJsonDataset(shardedStore, bundle);
  for (const station of prepared.stations) {
    const events = bundle.objects[`predictions-${station.id}`].events;
    assert.deepEqual(events, prepared.events.filter(event => event.stationId === station.id));
    const request = forecastRequest(station);
    const original = await forecastAustralianStandardPort({store: legacyStore, descriptor: originalDescriptor, request});
    const sharded = await forecastAustralianStandardPort({store: shardedStore, descriptor, request});
    assert.deepEqual(sharded, original, station.id);
    assert.deepEqual(await forecastAustralianStandardPort({store: previousStore, descriptor: previousDescriptor, request}), original, station.id);
  }
});

test('catalogue reads no prediction objects; forecast reads and verifies only the selected port', async () => {
  const store = new MemoryObjectStore();
  await initializeJsonDataset(store, bundle);
  await initializeProviderRegistry(store, registry());
  let keys = [];
  const tracked = {get(key) {keys.push(key); return store.get(key);}};
  let requestStore = requestObjectStore(tracked);
  assert.equal((await loadActiveProviderRegistry(requestStore)).ready, true);
  assert.deepEqual(await australianStationCatalogue({store: requestStore, descriptor}), prepared.stations);
  assert.equal(keys.some(key => key.includes('/predictions')), false);
  keys = [];
  requestStore = requestObjectStore(tracked);
  assert.equal((await loadActiveProviderRegistry(requestStore)).ready, true);
  const station = prepared.stations.find(item => item.id === 'au-qld-mooloolaba');
  const request = forecastRequest(station);
  const original = await forecastAustralianStandardPort({store: requestStore, descriptor, request});
  assert.deepEqual(keys.filter(key => key.includes('/predictions')), [
    `tide-data/datasets/${bundle.dataset.id}/${bundle.dataset.version}/predictions-${station.id}.json`,
  ]);
  assert.equal(keys.some(key => key.endsWith('/catalogue.json')), false);
  assert.equal(keys.length, 4);
  await store.put(keys.find(key => key.includes('/predictions')), '{"tampered":true}');
  await assert.rejects(
    forecastAustralianStandardPort({store: requestObjectStore(tracked), descriptor, request}),
    error => error.code === 'stored-dataset-unavailable',
  );
  assert.equal(original.sources[0].datasetVersion, '2026-bom-v2');
});

test('registry activation verifies every shard and pins the immutable manifest digest', async () => {
  const store = new MemoryObjectStore();
  await initializeJsonDataset(store, bundle);
  const firstPortKey = `tide-data/datasets/${bundle.dataset.id}/${bundle.dataset.version}/predictions-${prepared.stations[0].id}.json`;
  const firstPort = await store.get(firstPortKey);
  await store.put(firstPortKey, '{"tampered":true}');
  await assert.rejects(initializeProviderRegistry(store, registry(), {verifyObjectsFor: [descriptor.id]}), /not ready/);
  await store.put(firstPortKey, firstPort.body);
  await initializeProviderRegistry(store, registry());
  assert.equal((await loadActiveProviderRegistry(store)).ready, true);
  const manifestKey = datasetManifestKey(bundle.dataset);
  const manifest = JSON.parse((await store.get(manifestKey)).body);
  manifest.objects = manifest.objects.slice(1);
  await store.put(manifestKey, JSON.stringify(manifest));
  const invalid = await loadActiveProviderRegistry(store);
  assert.equal(invalid.ready, false);
  assert.equal(invalid.reason, 'provider-dataset-activation-mismatch');
});
