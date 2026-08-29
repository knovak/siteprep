import assert from 'node:assert/strict';
import {test} from 'node:test';

import {fesPreparedSample} from '../fixtures/fes-prepared-sample.mjs';
import {fesSourceOfficial} from '../fixtures/fes-source-official.mjs';
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

test('the committed licensed extract prepares five tiles and seven 34-constituent points', async () => {
  const prepared = await prepareFesDataset(fesSourceOfficial);
  const points = Object.values(prepared.tiles).flatMap(tile => tile.tile.points);
  assert.equal(prepared.dataset.dataClass, 'licensed-source');
  assert.equal(prepared.dataset.isFes2022, true);
  assert.equal(prepared.tileIndex.inventory.length, 5);
  assert.equal(points.length, 7);
  assert.ok(points.every(point => point.constituents.length === 34));
  assert.ok(points.every(point => point.constituentRoundTripMaxErrorCm <= 0.01));
  assert.equal(points.find(point => point.id === 'fes2022-cooktown').interpolationMethod, 'interpolated');
  assert.ok(points.filter(point => point.id !== 'fes2022-cooktown').every(point => point.interpolationMethod === 'extrapolated'));
  assert.deepEqual([...new Set(points.map(point => Math.abs(point.interpolationQuality)))].sort((a, b) => a - b), [6, 30, 33, 39]);
  assert.deepEqual(prepared.dataset.sourceFiles, [{
    name: 'FES2022b_OceanTide_NSgrid.nc',
    bytes: 3953139340,
    sha256: '6479dbd9acdfb63405ff15de1265154c4659b1f7112b8dfb1cabef945a481a23',
  }]);
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
  licensed.dataset.licenceUrl = 'https://example.invalid/licence';
  licensed.dataset.disclaimer = 'Modified model output; not for navigation.';
  licensed.dataset.sourceFiles = [{name: 'fes2022.nc', bytes: 10, sha256: 'a'.repeat(64)}];
  for (const tile of licensed.tiles) {
    tile.points[0].interpolationQuality = 1;
    tile.points[0].interpolationMethod = 'interpolated';
    tile.points[0].constituentRoundTripMaxErrorCm = 0.001;
  }
  assert.equal((await prepareFesDataset(licensed)).dataset.isFes2022, true);

  licensed.dataset.sourceUrl = null;
  await assert.rejects(prepareFesDataset(licensed), /must identify FES2022, its source, licence and disclaimer/);
});

test('licensed preparation rejects missing atlas integrity and PyFES interpolation evidence', async () => {
  const licensed = structuredClone(fesSourceSample);
  Object.assign(licensed.dataset, {
    dataClass: 'licensed-source',
    isFes2022: true,
    model: 'FES2022 ocean tide atlas',
    sourceUrl: 'https://example.invalid/licensed-fes-source',
    licenceUrl: 'https://example.invalid/licence',
    disclaimer: 'Modified model output; not for navigation.',
  });
  await assert.rejects(prepareFesDataset(licensed), /source file checksums/);
  licensed.dataset.sourceFiles = [{name: 'fes2022.nc', bytes: 10, sha256: 'a'.repeat(64)}];
  await assert.rejects(prepareFesDataset(licensed), /interpolation quality/);
  for (const tile of licensed.tiles) tile.points[0].interpolationQuality = 1;
  await assert.rejects(prepareFesDataset(licensed), /disclose its PyFES interpolation method/);
  for (const tile of licensed.tiles) tile.points[0].interpolationMethod = 'interpolated';
  await assert.rejects(prepareFesDataset(licensed), /constituent round-trip/);
});
