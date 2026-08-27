import assert from 'node:assert/strict';
import {test} from 'node:test';

import {fesPreparedSample} from '../fixtures/fes-prepared-sample.mjs';
import {fesSourceSample} from '../fixtures/fes-source-sample.mjs';
import {
  fesDatasetBundle,
  prepareFesDataset,
  validatePreparedFesDataset,
} from '../src/fes-preparer.mjs';

test('offline preparation exactly reproduces the committed tile inventory', async () => {
  const prepared = await prepareFesDataset(fesSourceSample);
  assert.deepEqual(prepared, fesPreparedSample);
  assert.equal(prepared.tileIndex.inventory.length, 3);
  assert.equal(Object.keys(prepared.tiles).length, 3);
  assert.ok(prepared.tileIndex.inventory.every(entry => entry.bytes > 0 && /^[a-f0-9]{64}$/.test(entry.sha256)));
});

test('missing, altered and undeclared tiles fail before initialization', async () => {
  const altered = structuredClone(fesPreparedSample);
  altered.tiles['tile-europe-west'].tile.points[0].constituents[0].amplitude += 1;
  await assert.rejects(validatePreparedFesDataset(altered), /inventory does not match/);

  const missing = structuredClone(fesPreparedSample);
  delete missing.tiles['tile-europe-west'];
  await assert.rejects(fesDatasetBundle(missing), /tile is missing/);

  const undeclared = structuredClone(fesPreparedSample);
  undeclared.tiles.extra = structuredClone(undeclared.tiles['tile-europe-west']);
  await assert.rejects(validatePreparedFesDataset(undeclared), /undeclared tile/);
});

test('only a licensed source may identify itself as FES2022', async () => {
  const falseClaim = structuredClone(fesSourceSample);
  falseClaim.dataset.isFes2022 = true;
  await assert.rejects(prepareFesDataset(falseClaim), /test fixture cannot identify itself as FES2022/);

  const licensed = structuredClone(fesSourceSample);
  licensed.dataset.dataClass = 'licensed-source';
  licensed.dataset.isFes2022 = true;
  licensed.dataset.model = 'FES2022 ocean tide atlas';
  licensed.dataset.sourceUrl = 'https://example.invalid/licensed-fes-source';
  assert.equal((await prepareFesDataset(licensed)).dataset.isFes2022, true);

  licensed.dataset.sourceUrl = null;
  await assert.rejects(prepareFesDataset(licensed), /must identify FES2022 and its source URL/);
});
