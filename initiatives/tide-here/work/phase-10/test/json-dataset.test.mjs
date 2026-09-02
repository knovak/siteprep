import assert from 'node:assert/strict';
import {test} from 'node:test';

import {sha256} from '../../phase-9/src/dataset.mjs';
import {MemoryObjectStore} from '../../phase-9/src/object-store.mjs';
import {loadVerifiedDatasetObject} from '../src/json-dataset.mjs';

test('an invalid selected object reports its dataset reference', async () => {
  const store = new MemoryObjectStore();
  const reference = {
    id: 'fes2022b-global-coast-test',
    version: 'test-r1',
    verification: 'manifest-and-selected-objects',
  };
  const name = 'tile-test';
  const key = `tide-data/datasets/${reference.id}/${reference.version}/${name}.json`;
  const body = 'not valid JSON';
  await store.put(key, body);

  const result = await loadVerifiedDatasetObject(store, {
    ready: true,
    reference,
    manifest: {
      objects: [{name, key, sha256: await sha256(body)}],
    },
  }, name);

  assert.deepEqual(result, {
    ready: false,
    reason: 'dataset-object-invalid',
    reference,
    object: name,
  });
});
