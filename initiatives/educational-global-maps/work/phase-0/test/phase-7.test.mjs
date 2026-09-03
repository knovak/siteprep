import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createSphereConversionReport, verifySpherePackage, writeSpherePackage} from '../src/sphere.mjs';

const load = (name) => readFile(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8').then(JSON.parse);
const [scenes, rendererFixture, temporalFixture, evidence] = await Promise.all([
  load('educational-scenes.json'), load('renderer-scene.json'), load('temporal-scene.json'), load('phase-7-sphere-validation.json'),
]);
const scene = scenes.scenes.find(({sceneId}) => sceneId === 'scene:population-and-education');

test('generic export emits deterministic SOS-profile PNG frames, context assets, and a verified manifest', async (context) => {
  const first = await mkdtemp(join(tmpdir(), 'egm-sphere-first-'));
  const second = await mkdtemp(join(tmpdir(), 'egm-sphere-second-'));
  context.after(() => Promise.all([rm(first, {recursive: true, force: true}), rm(second, {recursive: true, force: true})]));
  const options = {scene, catalogue: scenes.catalogue, rendererFixture, temporalFixture, width: 360, height: 180, fps: 1};
  const a = await writeSpherePackage({directory: first, ...options});
  const b = await writeSpherePackage({directory: second, ...options});
  assert.equal(a.status, 'accepted');
  assert.equal((await verifySpherePackage(first)).status, 'accepted');
  assert.deepEqual(a.manifest, b.manifest);
  assert.equal(a.manifest.frame.count, temporalFixture.timeline.length);
  assert.equal(a.manifest.frame.ratio, '2:1');
  assert.ok(a.manifest.files.some(({path}) => path === 'legend.svg'));
  assert.ok(a.manifest.files.some(({path}) => path === 'attribution.txt'));
  assert.ok(a.manifest.files.some(({path}) => path === 'index.html'));
  assert.deepEqual(
    a.manifest.files.filter(({mediaType}) => mediaType === 'image/png').map(({checksum}) => checksum),
    b.manifest.files.filter(({mediaType}) => mediaType === 'image/png').map(({checksum}) => checksum),
  );
});

test('conversion reports projection, raster, live-asset, interaction, and typography loss instead of silently dropping it', () => {
  const unsupported = structuredClone(scenes.scenes.find(({sceneId}) => sceneId === 'scene:learner-flow'));
  unsupported.projection = 'population-cartogram';
  unsupported.app.layerIds.push('layer:sea-temperature-frame');
  const report = createSphereConversionReport({scene: unsupported, catalogue: scenes.catalogue, temporalFixture});
  assert.equal(report.compatible, false);
  for (const kind of ['projection', 'layer', 'live-asset', 'interaction', 'typography'])
    assert.ok(report.losses.some((loss) => loss.kind === kind));
});

test('tampered frame fails manifest verification', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'egm-sphere-tamper-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  const result = await writeSpherePackage({directory, scene, catalogue: scenes.catalogue, rendererFixture, temporalFixture, width: 360, height: 180});
  await writeFile(join(directory, result.manifest.frames[0].path), 'not a png');
  const verification = await verifySpherePackage(directory);
  assert.equal(verification.status, 'refused');
  assert.ok(verification.findings.some((finding) => finding.startsWith('sphere.file.checksum:')));
  assert.ok(verification.findings.some((finding) => finding.startsWith('sphere.frame.png:')));
});

test('evidence records the official profile and keeps hardware and independent comprehension unproved', () => {
  assert.equal(evidence.profile.target, 'NOAA Science On a Sphere site-custom dataset');
  assert.equal(evidence.profile.projection, 'equatorial cylindrical equidistant');
  assert.equal(evidence.profile.ratio, '2:1');
  assert.equal(evidence.localValidation.status, 'passed');
  assert.equal(evidence.hardware.status, 'unavailable');
  assert.equal(evidence.independentWitness.status, 'needed');
  assert.ok(evidence.limitations.some((item) => /not been tested on sphere hardware/iu.test(item)));
});
