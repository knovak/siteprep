import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalJson} from '../src/canonical.mjs';
import {readBundle, writeBundle} from '../src/bundle.mjs';
import {makeMinimumFixture} from '../src/fixture.mjs';
import {SceneRepository} from '../src/repository.mjs';
import {applyIntent, createSession} from '../src/scene.mjs';
import {trustedInventory} from '../src/validate.mjs';

const root = await mkdtemp(join(tmpdir(), 'educational-global-maps-phase-0-'));
try {
  const fixture = makeMinimumFixture();
  const source = new SceneRepository(join(root, 'source'));
  const restored = new SceneRepository(join(root, 'restored'));
  await source.accept(fixture);
  const bundlePath = join(root, 'scene.egm.zip');
  const manifest = await writeBundle(bundlePath, fixture);
  const imported = await readBundle(bundlePath);
  await restored.accept(imported.inventory);
  const sourceInventory = await source.inventory();
  const restoredInventory = await restored.inventory();
  if (canonicalJson(sourceInventory) !== canonicalJson(restoredInventory)) throw new Error('Restored logical inventory differs from source');
  const duplicate = await restored.accept(imported.inventory);
  if (duplicate.changed) throw new Error('Repeated restore changed accepted state');

  const sceneObject = fixture.objects.find(({id}) => id === fixture.rootScene);
  const layersById = new Map(fixture.objects.filter(({schema}) => schema.endsWith('/layer/v1')).map((layer) => [layer.id, layer]));
  const intentObject = fixture.objects.find(({schema}) => schema.endsWith('/intent/v1'));
  const reduced = applyIntent(createSession(sceneObject.content, 'session:minimum'), intentObject, layersById);
  if (reduced.status !== 'accepted' || reduced.session.scene.period !== '2020') throw new Error('Portable scene reducer did not reproduce expected state');

  process.stdout.write(`${JSON.stringify({
    bundleId: manifest.bundleId,
    objects: trustedInventory(fixture).objects.length,
    assets: trustedInventory(fixture).assets.length,
    acceptedRevision: reduced.session.acceptedRevision,
    duplicateRestoreChanged: duplicate.changed,
  }, null, 2)}\n`);
} finally {
  await rm(root, {recursive: true, force: true});
}
