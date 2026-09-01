import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {canonicalJson} from '../src/canonical.mjs';
import {createFixturePackage, FIXED_TIME, FIXTURE_SCOPE} from '../src/fixture.mjs';
import {exportPackageFile, readPackageFile} from '../src/package.mjs';
import {CustodyRepository} from '../src/repository.mjs';

test('canonical package restores every portable logical record and permitted asset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-test-'));
  const first = new CustodyRepository(join(directory, 'first.sqlite'), {clock: () => FIXED_TIME});
  const second = new CustodyRepository(join(directory, 'second.sqlite'), {clock: () => FIXED_TIME});
  try {
    const fixture = createFixturePackage();
    first.commitImport(first.previewImport(fixture, {
      mode: 'restore', targetScope: FIXTURE_SCOPE, operationId: 'operation:first',
    }));
    const exported = first.exportPackage(FIXTURE_SCOPE, {createdAt: FIXED_TIME});
    const path = join(directory, 'fixture.kp.zip');
    await exportPackageFile(path, exported);
    const loaded = await readPackageFile(path);
    second.commitImport(second.previewImport(loaded.package, {
      mode: 'restore', targetScope: FIXTURE_SCOPE, operationId: 'operation:second',
    }));
    assert.equal(
      canonicalJson(second.inventory(FIXTURE_SCOPE, {portableOnly: true})),
      canonicalJson(first.inventory(FIXTURE_SCOPE, {portableOnly: true})),
    );
    assert.equal(second.count(FIXTURE_SCOPE, 'entity'), 20);
    assert.equal(second.count(FIXTURE_SCOPE, 'relationship'), 7);
  } finally {
    first.close();
    second.close();
    await rm(directory, {recursive: true, force: true});
  }
});
