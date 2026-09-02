import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalJson, contentIdentity} from '../src/canonical.mjs';
import {createFixturePackage, FIXED_TIME, FIXTURE_SCOPE} from '../src/fixture.mjs';
import {exportPackageFile, readPackageFile} from '../src/package.mjs';
import {CustodyRepository} from '../src/repository.mjs';

const directory = await mkdtemp(join(tmpdir(), 'knowledge-pipeline-round-trip-'));
const packagePath = join(directory, 'community-heat-resilience.kp.zip');
const source = new CustodyRepository(join(directory, 'source.sqlite'), {clock: () => FIXED_TIME});
const restored = new CustodyRepository(join(directory, 'restored.sqlite'), {clock: () => FIXED_TIME});

try {
  const fixture = createFixturePackage();
  source.commitImport(source.previewImport(fixture, {
    mode: 'restore',
    targetScope: FIXTURE_SCOPE,
    operationId: 'operation:source-restore',
  }));
  const exported = source.exportPackage(FIXTURE_SCOPE, {createdAt: FIXED_TIME});
  await exportPackageFile(packagePath, exported);
  const loaded = await readPackageFile(packagePath);
  restored.commitImport(restored.previewImport(loaded.package, {
    mode: 'restore',
    targetScope: FIXTURE_SCOPE,
    operationId: 'operation:restored-restore',
  }));

  const sourceInventory = source.inventory(FIXTURE_SCOPE, {portableOnly: true});
  const restoredInventory = restored.inventory(FIXTURE_SCOPE, {portableOnly: true});
  if (canonicalJson(sourceInventory) !== canonicalJson(restoredInventory)) {
    throw new Error('Restored logical inventory differs from the source');
  }
  const replay = restored.commitImport(restored.previewImport(loaded.package, {
    mode: 'merge',
    targetScope: FIXTURE_SCOPE,
    operationId: 'operation:reimport',
  }));
  console.log(JSON.stringify({
    packagePath,
    packageId: loaded.package.packageId,
    inventoryHash: contentIdentity(restoredInventory),
    entities: restoredInventory.entities.length,
    sourceEntities: restoredInventory.entities.filter(({type}) => type === 'source').length,
    relationships: restoredInventory.relationships.length,
    portableReceipts: restoredInventory.receipts.length,
    reimportCreated: replay.createdHashes.length,
  }, null, 2));
} finally {
  source.close();
  restored.close();
  await rm(directory, {recursive: true, force: true});
}
