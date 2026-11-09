import assert from 'node:assert/strict';
import {test} from 'node:test';

import {sha256} from '../../phase-9/src/dataset.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry, loadActiveProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {australiaDatasetBundle, australiaShardedDatasetBundle} from '../../phase-11/src/australia-importer.mjs';
import {stageThreeProviderRegistry} from '../../phase-11/fixtures/provider-registry.mjs';
import {fesSourceOfficial} from '../fixtures/fes-source-official.mjs';
import {prepareFesDataset} from '../src/fes-preparer.mjs';
import {createStageFourApp} from '../src/worker.mjs';

const prepared = await prepareFesDataset(fesSourceOfficial);

function harness() {
  const store = new MemoryObjectStore();
  const app = createStageFourApp({
    storeFactory: () => store,
    now: () => new Date('2026-08-29T22:00:00Z'),
  });
  return {app, store};
}

async function post(app, path, token, body = null, headers = {}) {
  return app.fetch(new Request(`https://tide.example${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === null ? {} : {'content-type': 'application/json'}),
      ...headers,
    },
    body,
  }), {INIT_TOKEN: 'correct-token'});
}

test('a protected resumable import activates broad FES coverage and later initialization preserves it', async () => {
  const {app, store} = harness();
  assert.equal((await post(app, '/init', 'correct-token')).status, 200);

  const dataset = {
    ...prepared.dataset,
    id: 'fes2022b-global-coast-test',
    version: 'test-r1',
    schema: 'tide-here/fes-prepared-dataset/v2',
    sampling: {pointCount: 1_000},
  };
  const [name, originalTile] = Object.entries(prepared.tiles)
    .find(([, tile]) => tile.tile.points.some(point => point.id === 'fes2022-brest'));
  const tile = {...originalTile, dataset};
  const tileBody = JSON.stringify(tile);
  const tileSha256 = await sha256(tileBody);
  const originalEntry = prepared.tileIndex.inventory.find(entry => entry.objectName === name);
  const index = {
    schema: 'tide-here/fes-tile-index/v1',
    dataset: {id: dataset.id, version: dataset.version},
    inventory: [{...originalEntry, sha256: tileSha256, bytes: new TextEncoder().encode(tileBody).byteLength}],
  };
  const indexBody = JSON.stringify(index);
  const indexSha256 = await sha256(indexBody);
  const objectHeaders = {
    'x-tide-dataset-id': dataset.id,
    'x-tide-dataset-version': dataset.version,
    'x-tide-dataset-schema': dataset.schema,
    'x-tide-dataset-prepared-at': dataset.preparedAt,
  };

  const denied = await post(app, `/import/object?name=${name}`, 'wrong-token', tileBody, {
    ...objectHeaders,
    'x-tide-sha256': tileSha256,
  });
  assert.equal(denied.status, 403);
  for (const object of [
    {name, body: tileBody, checksum: tileSha256},
    {name: 'tile-index', body: indexBody, checksum: indexSha256},
  ]) {
    const response = await post(app, `/import/object?name=${object.name}`, 'correct-token', object.body, {
      ...objectHeaders,
      'x-tide-sha256': object.checksum,
    });
    assert.equal(response.status, 200, await response.text());
  }

  const activationBody = JSON.stringify({
    dataset,
    objects: [
      {name: 'tile-index', sha256: indexSha256},
      {name, sha256: tileSha256},
    ],
  });
  const activation = await post(app, '/import/activate', 'correct-token', activationBody);
  assert.equal(activation.status, 200, await activation.text());
  const health = await (await app.fetch(new Request('https://tide.example/health'))).json();
  assert.equal(health.registry.version, 'stage-4-global-test-r1-au-ports-r2');
  assert.deepEqual(health.providers.find(provider => provider.id === 'fes2022').dataset, {
    id: dataset.id,
    version: dataset.version,
    verification: 'manifest-and-selected-objects',
  });

  // Model an already deployed global registry that still references the old
  // annual Australian object. The new initializer migrates only Australia.
  const beforeMigration = await loadActiveProviderRegistry(store);
  const legacyAustralia = stageThreeProviderRegistry.providers.find(provider => provider.id === 'australia-standard-ports');
  await initializeJsonDataset(store, australiaDatasetBundle(await loadAustraliaPreparedOfficial()));
  await initializeProviderRegistry(store, {
    ...beforeMigration.registry,
    version: 'stage-4-global-test-r1',
    providers: beforeMigration.registry.providers.map(provider => (
      provider.id === legacyAustralia.id ? legacyAustralia : provider
    )),
  });
  const migrated = await post(app, '/init', 'correct-token');
  assert.equal(migrated.status, 200);
  const afterMigration = await loadActiveProviderRegistry(store);
  assert.equal(afterMigration.registry.version, 'stage-4-global-test-r1-au-ports-r2');
  assert.deepEqual(
    afterMigration.registry.providers.find(provider => provider.id === 'fes2022'),
    beforeMigration.registry.providers.find(provider => provider.id === 'fes2022'),
  );
  assert.equal(afterMigration.registry.providers.find(provider => provider.id === legacyAustralia.id).dataRef.version, '2026-bom-v2-ports-r2');
  // The first performance candidate was deployed with r1 shards. Migrating
  // that registry must reuse the same deterministic r2 identity as direct
  // legacy migration and import activation, without a suffix chain.
  const r1Bundle = australiaShardedDatasetBundle(await loadAustraliaPreparedOfficial(), {revision: 1});
  await initializeJsonDataset(store, r1Bundle);
  await initializeProviderRegistry(store, {
    ...beforeMigration.registry,
    version: 'stage-4-global-test-r1-au-ports-r1',
    providers: beforeMigration.registry.providers.map(provider => (
      provider.id === legacyAustralia.id ? {
        ...provider,
        requiredDatasetSchema: r1Bundle.dataset.schema,
        dataRef: {id: r1Bundle.dataset.id, version: r1Bundle.dataset.version, verification: 'manifest-and-selected-objects'},
      } : provider
    )),
  });
  const migratedR1 = await post(app, '/init', 'correct-token');
  assert.equal(migratedR1.status, 200, await migratedR1.clone().text());
  assert.equal((await loadActiveProviderRegistry(store)).registry.version, 'stage-4-global-test-r1-au-ports-r2');
  const writesBeforeRepeat = store.writeLog.length;
  const repeated = await post(app, '/init', 'correct-token');
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).registry.preserved, true);
  assert.equal(store.writeLog.length, writesBeforeRepeat);
  const reimported = await post(app, '/import/activate', 'correct-token', activationBody);
  assert.equal(reimported.status, 200, await reimported.clone().text());
  assert.equal(store.writeLog.length, writesBeforeRepeat);
  const resolution = await app.fetch(new Request('https://tide.example/resolve', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({provider: 'fes2022', latitude: 48.383, longitude: -4.495}),
  }));
  assert.equal(resolution.status, 200, await resolution.clone().text());
  assert.equal((await resolution.json()).station.id, 'fes2022-brest');

  await store.put(`tide-data/datasets/${dataset.id}/${dataset.version}/${name}.json`, '{"tampered":true}');
  const tampered = await app.fetch(new Request('https://tide.example/resolve', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({provider: 'fes2022', latitude: 48.383, longitude: -4.495}),
  }));
  assert.equal(tampered.status, 503);
  assert.equal((await tampered.json()).code, 'stored-dataset-unavailable');
});
