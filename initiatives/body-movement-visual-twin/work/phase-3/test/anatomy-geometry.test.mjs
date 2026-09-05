import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAxialGeometry, createMuscleGeometry } from '../src/anatomy-geometry.mjs';
import { globalMatrices, distanceBetween } from '../../phase-0/scripts/rig-math.mjs';
import { scaleReferenceRig, DEFAULT_VISUAL_PROFILE } from '../../phase-4/src/visual-twin-controls.mjs';

const rig = JSON.parse(await readFile(new URL('../../phase-2/data/rig-core.json', import.meta.url)));
const muscles = JSON.parse(await readFile(new URL('../../phase-2/data/muscles.json', import.meta.url)));
const clips = JSON.parse(await readFile(new URL('../data/movement-clips.json', import.meta.url)));
const neutral = { rotations_deg: {} };
const baseline = createAxialGeometry(rig, globalMatrices(rig, neutral));

test('complete vertebral regions and twelve bilateral ribs retain their connection classes', () => {
  for (const [prefix, count] of [['C', 7], ['T', 12], ['L', 5], ['S', 5], ['Co', 4]]) {
    for (let number = 1; number <= count; number += 1) assert.ok(baseline.vertebrae.some((v) => v.id === `${prefix}${number}`));
  }
  assert.equal(baseline.vertebrae.length, 33);
  assert.equal(baseline.vertebrae.filter((v) => !v.fused).length, 24);
  assert.equal(baseline.ribs.length, 24);
  assert.equal(new Set(baseline.ribs.map((rib) => rib.id)).size, 24);
  for (const rib of baseline.ribs) {
    assert.equal(rib.vertebra, `T${rib.number}`);
    assert.equal(rib.floating, rib.number >= 11);
    assert.equal(Boolean(rib.connection), rib.number <= 10);
    assert.ok(rib.points.some((p) => Math.abs(p[2] - rib.points[0][2]) > 40), 'ribs must curve in depth, not be frontal ellipses');
  }
  assert.ok(baseline.bones.some((bone) => bone.id === 'C2-dens'));
  assert.ok(!baseline.bones.some((bone) => bone.id === 'C1-disc'));
  assert.ok(baseline.bones.some((bone) => bone.id === 'C2-disc'));
});

test('axial geometry scales proportionally and follows every movement without nonfinite geometry or detached rib roots', () => {
  const taller = scaleReferenceRig(rig, { ...DEFAULT_VISUAL_PROFILE, statureCm: 195 });
  const scaled = createAxialGeometry(taller, globalMatrices(taller, neutral));
  for (let i = 0; i < baseline.vertebrae.length; i += 1) {
    const expected = baseline.vertebrae[i].center.map((v) => v * 195 / 170);
    assert.ok(distanceBetween(expected, scaled.vertebrae[i].center) < 1e-8);
  }
  let largestChange = 0;
  for (const clip of Object.values(clips)) for (const frame of clip.frames) {
    const geometry = createAxialGeometry(rig, globalMatrices(rig, frame));
    assert.ok(geometry.bones.every((bone) => bone.points.flat().every(Number.isFinite)));
    for (const rib of geometry.ribs) {
      const center = geometry.vertebrae.find((v) => v.id === rib.vertebra).center;
      assert.ok(distanceBetween(rib.points[0], center) <= 22, `${clip.id}: ${rib.id} detached`);
    }
    largestChange = Math.max(largestChange, distanceBetween(geometry.vertebrae[0].center, baseline.vertebrae[0].center));
  }
  assert.ok(largestChange > 50, 'the detailed spine must actually move');
});

test('distinct muscle surfaces keep known claim IDs, depth and complete finite fibres through all clip extrema', () => {
  const knownClaims = new Set(muscles.layers.muscles.map((muscle) => muscle.id));
  const initial = createMuscleGeometry(rig, globalMatrices(rig, neutral));
  assert.ok(initial.length > 60);
  assert.equal(new Set(initial.map((patch) => patch.id)).size, initial.length);
  assert.ok(initial.every((patch) => patch.claimId === null || knownClaims.has(patch.claimId)));
  assert.deepEqual(new Set(initial.filter((patch) => patch.claimId).map((patch) => patch.claimId)), knownClaims);
  assert.equal(initial.filter((patch) => patch.claimId === 'rectus-abdominis-left').length, 5);
  assert.equal(initial.filter((patch) => patch.claimId === 'quadriceps-left').length, 3);
  const recordBefore = JSON.stringify(muscles);
  for (const clip of Object.values(clips)) for (const frame of clip.frames) {
    const patches = createMuscleGeometry(rig, globalMatrices(rig, frame));
    assert.ok(patches.every((patch) => patch.contour.flat().every(Number.isFinite)
      && patch.fibers.flat(2).every(Number.isFinite) && patch.strips.every((strip) => strip.points.flat().every(Number.isFinite))));
  }
  assert.equal(JSON.stringify(muscles), recordBefore);
  assert.ok(muscles.layers.muscles.every((entry) => entry.review_status === 'unreviewed'));
});
