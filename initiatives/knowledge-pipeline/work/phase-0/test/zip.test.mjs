import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {strFromU8, strToU8, unzipSync, zipSync} from 'fflate';
import {canonicalJson, deepClone} from '../src/canonical.mjs';
import {CustodyError} from '../src/findings.mjs';
import {createFixturePackage} from '../src/fixture.mjs';
import {exportPackageFile, readPackageFile} from '../src/package.mjs';
import {inspectZip} from '../src/zip.mjs';

test('archive manifest carries hashes while permitted asset bytes stay in their own entry', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-zip-'));
  try {
    const path = join(directory, 'fixture.zip');
    await exportPackageFile(path, createFixturePackage());
    const raw = unzipSync(await readFile(path));
    const manifest = JSON.parse(strFromU8(raw['manifest.json']));
    assert.equal(manifest.assets[0].bytes, undefined);
    assert.equal(raw[manifest.assets[0].path].byteLength, manifest.assets[0].size);
    const loaded = await readPackageFile(path);
    assert.equal(typeof loaded.package.assets[0].bytes, 'string');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('path traversal and compression-ratio bombs are refused before extraction', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-hostile-'));
  try {
    const traversal = join(directory, 'traversal.zip');
    await writeFile(traversal, zipSync({'../escape.txt': strToU8('escape')}, {level: 0}));
    await assert.rejects(() => readPackageFile(traversal), (error) => {
      assert.ok(error instanceof CustodyError);
      assert.ok(error.findings.some(({code}) => code === 'zip.path.unsafe'));
      return true;
    });

    const compressed = zipSync({'large.txt': new Uint8Array(20_000)}, {level: 9});
    const inspected = inspectZip(compressed, {
      maxPackageBytes: 1_000_000,
      maxEntries: 10,
      maxEntryBytes: 1_000_000,
      maxExpandedBytes: 1_000_000,
      maxCompressionRatio: 2,
      maxPathDepth: 10,
    });
    assert.ok(inspected.findings.some(({code}) => code === 'zip.ratio.limit'));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('asset checksum mismatch is refused', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-checksum-'));
  try {
    const fixture = deepClone(createFixturePackage());
    const asset = fixture.assets[0];
    delete asset.bytes;
    const path = join(directory, 'mismatch.zip');
    await writeFile(path, zipSync({
      'manifest.json': strToU8(canonicalJson(fixture)),
      [asset.path]: strToU8('wrong bytes'),
    }, {level: 0}));
    await assert.rejects(() => readPackageFile(path), (error) => {
      assert.ok(error.findings.some(({code}) => code === 'asset.file.mismatch'));
      return true;
    });
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('duplicate manifest keys are refused before parsing can overwrite them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-duplicates-'));
  try {
    const path = join(directory, 'duplicates.zip');
    await writeFile(path, zipSync({
      'manifest.json': strToU8('{"format":"knowledge-pipeline/v1","format":"knowledge-pipeline/v99"}'),
    }, {level: 0}));
    await assert.rejects(() => readPackageFile(path), (error) => {
      assert.ok(error.findings.some(({code}) => code === 'json.duplicate_key'));
      return true;
    });
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
