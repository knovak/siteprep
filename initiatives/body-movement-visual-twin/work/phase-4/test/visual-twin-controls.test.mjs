import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { registrationSamples } from '../../phase-0/scripts/rig-math.mjs';
import {
  DEFAULT_VISUAL_PROFILE,
  describeProfileChange,
  normalizeVisualProfile,
  personalizeSurfacePoint,
  scaleMuscleData,
  scaleReferenceRig,
  statureScale,
  surfaceAppearance
} from '../src/visual-twin-controls.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const initiativeDirectory = resolve(phaseDirectory, '../..');
const readJson = async (path) => JSON.parse(await readFile(resolve(initiativeDirectory, path), 'utf8'));
const core = await readJson('work/phase-2/data/rig-core.json');
const muscles = await readJson('work/phase-2/data/muscles.json');
const clip = await readJson('work/phase-3/data/movement-clips.json');

test('controls are bounded presentation choices rather than anatomical claims', () => {
  assert.deepEqual(normalizeVisualProfile({ statureCm: 900, build: 4, torsoToLimb: -5, presentation: 'claimed-female' }), {
    statureCm: 200,
    build: 1,
    torsoToLimb: -1,
    presentation: 'neutral'
  });
  const copy = describeProfileChange(DEFAULT_VISUAL_PROFILE, { statureCm: 180, build: .4, torsoToLimb: -.2, presentation: 'soft' });
  assert.match(copy, /surface outline width/);
  assert.match(copy, /Internal anatomy remains fitted reference geometry/);
  assert.match(copy, /do not infer mobility, muscle behaviour, force, or biomechanics/);
});

test('stature scales the shared rig, attachments, and registration tolerance together', () => {
  const profile = { ...DEFAULT_VISUAL_PROFILE, statureCm: 195 };
  const scaledCore = scaleReferenceRig(core, profile);
  const scaledMuscles = scaleMuscleData(muscles, profile);
  const factor = statureScale(profile);
  assert.equal(scaledCore.registration_tolerance_mm, 8 * factor);
  assert.equal(scaledCore.nodes.find((node) => node.id === 'lumbar-spine').translation_mm[1], 105 * factor);
  assert.equal(scaledMuscles.attachments[0].bone_landmark_local_mm[1], muscles.attachments[0].bone_landmark_local_mm[1] * factor);

  const rig = {
    ...scaledCore,
    layers: { ...scaledCore.layers, muscles: scaledMuscles.layers.muscles },
    attachments: scaledMuscles.attachments,
    clip: clip['seated-pelvic-clock-exploration']
  };
  const samples = registrationSamples(rig);
  assert.ok(samples.length > 0);
  assert.ok(samples.every((sample) => sample.distance_mm <= scaledCore.registration_tolerance_mm));
});

test('build, proportion, and presentation affect only the authored surface representation', () => {
  const profile = { ...DEFAULT_VISUAL_PROFILE, build: .75, torsoToLimb: .6, presentation: 'angular' };
  const appearance = surfaceAppearance(profile);
  assert.equal(appearance.finish, 'angular');
  assert.ok(appearance.radiusFactor > 1);
  assert.notDeepEqual(personalizeSurfacePoint([-300, 1000, 0], 'humerus-left', profile), [-300, 1000, 0]);
  assert.deepEqual(scaleReferenceRig(core, profile).nodes, core.nodes);
  assert.deepEqual(scaleMuscleData(muscles, profile).attachments, muscles.attachments);
});

test('the source has no correctness score or internal-truth selector', async () => {
  const source = await readFile(resolve(phaseDirectory, 'src/visual-twin-controls.mjs'), 'utf8');
  assert.doesNotMatch(source, /correct(?:ness)?[_ -]?score|accuracy[_ -]?score|activation[_ -]?percent/i);
  assert.doesNotMatch(source, /sex|gender|ethnicity|race/i);
});
