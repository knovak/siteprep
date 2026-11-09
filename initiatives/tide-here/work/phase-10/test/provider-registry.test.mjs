import assert from 'node:assert/strict';
import {test} from 'node:test';

import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {stageTwoProviderRegistry} from '../fixtures/provider-registry.mjs';
import {
  ACTIVE_REGISTRY_KEY,
  initializeProviderRegistry,
  loadActiveProviderRegistry,
  selectProvider,
  validateProviderRegistry,
} from '../src/provider-registry.mjs';
import {initializeStageTwo} from '../src/stage-two.mjs';
import {datasetManifestKey, initializeJsonDataset} from '../src/json-dataset.mjs';

test('national providers win by configuration and fixtures require an explicit opt-in', () => {
  assert.equal(selectProvider(stageTwoProviderRegistry, {countryCode: 'US'}).id, 'noaa');
  assert.equal(selectProvider(stageTwoProviderRegistry, {countryCode: 'CA'}).id, 'chs');
  assert.equal(selectProvider(stageTwoProviderRegistry, {countryCode: 'AU'}), null);
  assert.equal(selectProvider(stageTwoProviderRegistry, {countryCode: 'IE'}), null);
  assert.equal(selectProvider(stageTwoProviderRegistry, {countryCode: 'IE', includeFixtures: true}).id, 'fes2022');
});

test('an exact national provider outranks a higher-priority global fallback', () => {
  const registry = structuredClone(stageTwoProviderRegistry);
  registry.providers.find(provider => provider.id === 'fes2022').priority = 1000;
  assert.equal(
    selectProvider(registry, {countryCode: 'US', includeFixtures: true}).id,
    'noaa',
  );
});

test('another national source is added as data rather than a gateway code branch', () => {
  const registry = structuredClone(stageTwoProviderRegistry);
  registry.version = 'future-national-source-test';
  registry.providers.push({
    id: 'korea-hydrographic',
    name: 'Korean national source',
    sourceKind: 'national',
    status: 'active',
    execution: 'browser-direct',
    countryCodes: ['KR'],
    fallback: false,
    priority: 100,
    forecastContract: 'tide-here/normalized-forecast/v1',
    attribution: 'Test descriptor',
  });
  validateProviderRegistry(registry);
  assert.equal(selectProvider(registry, {countryCode: 'KR'}).id, 'korea-hydrographic');
});

test('registry activation refuses a referenced dataset that is absent', async () => {
  await assert.rejects(
    initializeProviderRegistry(new MemoryObjectStore(), stageTwoProviderRegistry),
    /Dataset for fes2022 is not ready/,
  );
});

test('Stage 2 initializes referenced data, activates the registry last, and repeats without writes', async () => {
  const store = new MemoryObjectStore();
  const first = await initializeStageTwo(store, {now: () => new Date('2026-08-27T05:00:00Z')});
  assert.equal(store.writeLog.at(-1), ACTIVE_REGISTRY_KEY);
  assert.equal(first.harmonic.created.length, 3);
  assert.equal(first.registry.created.length, 2);
  const writes = store.writeLog.length;
  const second = await initializeStageTwo(store, {now: () => new Date('2026-08-27T06:00:00Z')});
  assert.equal(store.writeLog.length, writes);
  assert.equal(second.harmonic.unchanged.length, 3);
  assert.equal(second.registry.unchanged.length, 2);
});

test('duplicate provider ids and stored active providers without data are rejected', () => {
  const duplicate = structuredClone(stageTwoProviderRegistry);
  duplicate.providers.push({...duplicate.providers[0]});
  assert.throws(() => validateProviderRegistry(duplicate), /duplicated/);

  const missing = structuredClone(stageTwoProviderRegistry);
  const australia = missing.providers.find(provider => provider.id === 'australia-standard-ports');
  australia.status = 'active';
  assert.throws(() => validateProviderRegistry(missing), /requires a dataset reference/);
});


test('independent provider manifests load concurrently while activation order stays stable', {timeout: 2000}, async () => {
  const store = new MemoryObjectStore();
  const providers = [];
  for (const id of ['national-test', 'fallback-test']) {
    const dataset = {id, version: 'v1', schema: 'test/v1', preparedAt: '2026-11-09T00:00:00Z'};
    await initializeJsonDataset(store, {schema: 'tide-here/json-dataset-bundle/v1', dataset, objects: {data: {id}}});
    providers.push({
      id, status: 'active', execution: 'server-stored', countryCodes: ['*'],
      priority: 10, fallback: true,
      dataRef: {id, version: 'v1', verification: 'manifest-and-selected-objects'},
    });
  }
  const registry = {...stageTwoProviderRegistry, version: 'parallel-manifests-v1', providers};
  await initializeProviderRegistry(store, registry);
  const manifestKeys = providers.map(provider => datasetManifestKey(provider.dataRef));
  const pending = [];
  const tracked = {
    get(key) {
      if (!manifestKeys.includes(key)) return store.get(key);
      return new Promise(resolve => {
        pending.push({key, resolve});
        if (pending.length === 2) {
          // Return the later provider first; Promise.all must keep the registry's order.
          for (const read of [...pending].reverse()) read.resolve(store.get(read.key));
        }
      });
    },
  };
  const active = await loadActiveProviderRegistry(tracked);
  assert.equal(active.ready, true);
  assert.deepEqual(active.active.verifiedDatasets.map(reference => reference.provider), providers.map(provider => provider.id));
  assert.equal(pending.length, 2);
  const writes = store.writeLog.length;
  await initializeProviderRegistry(store, registry);
  assert.equal(store.writeLog.length, writes);
});
