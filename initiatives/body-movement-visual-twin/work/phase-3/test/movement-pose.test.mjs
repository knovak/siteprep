import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { globalMatrices, transformPoint, distanceBetween } from '../../phase-0/scripts/rig-math.mjs';
import { scaleReferenceRig, DEFAULT_VISUAL_PROFILE } from '../../phase-4/src/visual-twin-controls.mjs';
import { interpolateMovementPose } from '../src/movement-pose.mjs';

const rig = JSON.parse(await readFile(new URL('../../phase-2/data/rig-core.json', import.meta.url)));
const clips = JSON.parse(await readFile(new URL('../data/movement-clips.json', import.meta.url)));
const at = (matrices, id) => transformPoint(matrices.get(id), [0, 0, 0]);

test('chair and standing fold keep ankles and forward-facing toes planted throughout playback at different statures', () => {
  for (const statureCm of [145, 170, 200]) {
    const scaled = scaleReferenceRig(rig, { ...DEFAULT_VISUAL_PROFILE, statureCm });
    const rest = globalMatrices(scaled, { rotations_deg: {} });
    for (const id of Object.keys(clips).filter(id => clips[id].planted_sagittal_feet)) {
      for (let sample = 0; sample <= 100; sample += 1) {
        const pose = interpolateMovementPose(scaled, clips[id], sample / 100);
        const matrices = globalMatrices(scaled, pose);
        for (const side of ['left', 'right']) {
          for (const node of [`tibia-${side}`, `toe-${side}`]) {
            assert.ok(distanceBetween(at(matrices, node), at(rest, node)) < 1e-7, `${id}/${sample}/${node}`);
          }
        }
      }
    }
  }
});

test('seated knees and toes remain anterior between keyframes, including knee extension', () => {
  for (const id of ['seated-pelvic-clock-exploration', 'supported-seated-side-reach', 'pause-before-standing', 'seated-knee-extension-study']) {
    for (let sample = 0; sample <= 100; sample += 1) {
      const matrices = globalMatrices(rig, interpolateMovementPose(rig, clips[id], sample / 100));
      for (const side of ['left', 'right']) {
        assert.ok(at(matrices, `femur-${side}`)[2] > at(matrices, `hip-${side}`)[2] + 300);
        assert.ok(at(matrices, `toe-${side}`)[2] > at(matrices, `tibia-${side}`)[2] + 200);
      }
    }
  }
});

test('folded seats bring the shins across the support plane and downward dog forms an inverted V', () => {
  for (const id of ['easy-crossed-seat-study', 'accomplished-seat-study', 'lotus-arrangement-study', 'bound-angle-study']) {
    const matrices = globalMatrices(rig, interpolateMovementPose(rig, clips[id], .7));
    for (const side of ['left', 'right']) {
      const hip = at(matrices, `hip-${side}`), knee = at(matrices, `femur-${side}`), ankle = at(matrices, `tibia-${side}`);
      assert.ok(Math.abs(knee[1] - hip[1]) < 1e-6, `${id}: thigh should open in the seated plane`);
      assert.ok(Math.abs(ankle[1] - knee[1]) < 75, `${id}: shin should cross the seat, not hang down`);
      assert.ok(Math.abs(ankle[0]) < Math.abs(knee[0]), `${id}: shin should return toward the midline`);
    }
  }
  const matrices = globalMatrices(rig, interpolateMovementPose(rig, clips['downward-facing-dog-study'], .7));
  const hip = at(matrices, 'hip-left'), ankle = at(matrices, 'tibia-left'), head = at(matrices, 'head');
  assert.ok(hip[1] > ankle[1] && hip[1] > head[1]);
  assert.ok((head[2] - hip[2]) * (ankle[2] - hip[2]) < 0, 'head and feet extend to opposite sides of the hip apex');
});

test('ankle explorations can intentionally flex and all 140 clips interpolate finite, distinct poses', () => {
  const signatures = new Set();
  for (const clip of Object.values(clips)) {
    const positions = [];
    for (let sample = 0; sample <= 20; sample += 1) {
      const pose = interpolateMovementPose(rig, clip, sample / 20);
      const matrices = globalMatrices(rig, pose);
      // Oriented landmarks capture terminal-joint rotation (especially the skull),
      // which a signature of joint origins alone cannot distinguish.
      const points = rig.nodes.flatMap(node => [[0, 0, 0], [30, 40, 50]].map(point => transformPoint(matrices.get(node.id), point)));
      assert.ok(points.flat().every(Number.isFinite), `${clip.id}/${sample}`);
      positions.push(points);
    }
    signatures.add(JSON.stringify(positions));
  }
  assert.equal(signatures.size, 140);
  const flex = interpolateMovementPose(rig, clips['ankle-flexion-study'], .35);
  const extend = interpolateMovementPose(rig, clips['ankle-flexion-study'], .7);
  assert.ok(flex.rotations_deg['tibia-left'][0] < 0);
  assert.ok(extend.rotations_deg['tibia-left'][0] > 0);
});
