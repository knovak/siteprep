import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {canonicalJson} from '../src/canonical.mjs';
import {createScalePackage} from '../src/fixture.mjs';
import {PACKAGE_LIMITS} from '../src/limits.mjs';
import {writeCanonicalManifest} from '../src/package.mjs';
import {validatePackage} from '../src/validate.mjs';

test('10,000-entity scale manifest validates and streams within the Phase 0 budget', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-scale-'));
  try {
    const fixture = createScalePackage(10_000);
    assert.deepEqual(validatePackage(fixture), []);
    const before = process.memoryUsage().heapUsed;
    const path = join(directory, 'manifest.json');
    await writeCanonicalManifest(path, fixture);
    const after = process.memoryUsage().heapUsed;
    assert.ok(after - before < 64 * 1024 * 1024, `heap grew by ${after - before} bytes`);
    const metadata = await stat(path);
    assert.ok(metadata.size < PACKAGE_LIMITS.maxManifestBytes);
    const written = await readFile(path, 'utf8');
    assert.equal(written, canonicalJson(fixture));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
