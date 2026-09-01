import assert from 'node:assert/strict';
import {test} from 'node:test';

import {sha256} from '../../phase-9/src/dataset.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
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

  const activation = await post(app, '/import/activate', 'correct-token', JSON.stringify({
    dataset,
    objects: [
      {name: 'tile-index', sha256: indexSha256},
      {name, sha256: tileSha256},
    ],
  }));
  assert.equal(activation.status, 200, await activation.text());
  const health = await (await app.fetch(new Request('https://tide.example/health'))).json();
  assert.equal(health.registry.version, 'stage-4-global-test-r1');
  assert.deepEqual(health.providers.find(provider => provider.id === 'fes2022').dataset, {
    id: dataset.id,
    version: dataset.version,
    verification: 'manifest-and-selected-objects',
  });

  const repeated = await post(app, '/init', 'correct-token');
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).registry.preserved, true);
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
