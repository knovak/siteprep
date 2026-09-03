import {access, mkdtemp, readFile, rename, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {writeSpherePackage, verifySpherePackage} from '../src/sphere.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = resolve(process.argv[2] ?? join(root, 'sphere-export'));
const [scenes, rendererFixture, temporalFixture] = await Promise.all([
  readFile(join(root, 'fixtures/educational-scenes.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'fixtures/renderer-scene.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'fixtures/temporal-scene.json'), 'utf8').then(JSON.parse),
]);
const scene = scenes.scenes.find(({sceneId}) => sceneId === 'scene:population-and-education');
const stage = await mkdtemp(join(tmpdir(), 'egm-sphere-export-'));
try {
  try {
    await access(destination);
    throw new Error(`Refusing to replace existing destination ${destination}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const result = await writeSpherePackage({directory: stage, scene, catalogue: scenes.catalogue, rendererFixture, temporalFixture});
  if (result.status !== 'accepted') throw new Error(JSON.stringify(result.report));
  const verification = await verifySpherePackage(stage);
  if (verification.status !== 'accepted') throw new Error(JSON.stringify(verification.findings));
  await rename(stage, destination);
  process.stdout.write(`${destination}\n${result.manifest.frame.count} verified 2:1 PNG frames\n`);
} catch (error) {
  await rm(stage, {recursive: true, force: true});
  throw error;
}
