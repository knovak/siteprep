import assert from 'node:assert/strict';
import {test} from 'node:test';

import {R2ObjectStore} from '../src/object-store.mjs';

test('the R2 adapter preserves JSON bodies and checksum metadata', async () => {
  const objects = new Map();
  const bucket = {
    async get(key) {
      const value = objects.get(key);
      return value ? {
        customMetadata: value.customMetadata,
        text: async () => value.body,
      } : null;
    },
    async put(key, body, options) {
      objects.set(key, {body, customMetadata: options.customMetadata, httpMetadata: options.httpMetadata});
    },
  };
  const store = new R2ObjectStore(bucket);
  await store.put('fixture.json', '{"ready":true}', {customMetadata: {sha256: 'abc123'}});
  assert.deepEqual(await store.get('fixture.json'), {
    body: '{"ready":true}',
    customMetadata: {sha256: 'abc123'},
  });
  assert.equal(objects.get('fixture.json').httpMetadata.contentType, 'application/json; charset=utf-8');
  assert.equal(await store.get('missing.json'), null);
});
