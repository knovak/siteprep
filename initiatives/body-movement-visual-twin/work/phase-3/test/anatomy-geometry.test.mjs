import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAxialGeometry, createMuscleGeometry } from '../src/anatomy-geometry.mjs';
import { globalMatrices, distanceBetween, transformPoint } from '../../phase-0/scripts/rig-math.mjs';
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
  assert.ok(!baseline.bones.some((bone) => bone.id === 'C1-spinous'), 'atlas has no spinous process');
  assert.ok(baseline.bones.some((bone) => bone.id === 'C2-disc'));
});

test('each vertebra, rib, collarbone and the skull moves within a clip, with the sacrum staying fused', () => {
  const moved = new Set();
  for (const clip of Object.values(clips)) {
    const start = createAxialGeometry(rig, globalMatrices(rig, clip.frames[0]));
    const landmarks = (g) => [...g.vertebrae.map((v) => [v.id,v.center]), ...g.ribs.map((r) => [r.id,r.points[12]]),
      ...g.bones.filter((b) => b.id.startsWith('clavicle-') || b.id.startsWith('occipital-condyle-')).map((b) => [b.id,b.points[2]]), ['skull',g.skull.center]];
    const initial = new Map(landmarks(start));
    for (const frame of clip.frames.slice(1)) {
      const geometry = createAxialGeometry(rig, globalMatrices(rig, frame));
      for (const [id,point] of landmarks(geometry)) if (distanceBetween(point,initial.get(id)) > 1) moved.add(id);
      const sacral = geometry.vertebrae.filter((v) => v.region === 'sacral');
      const reference = baseline.vertebrae.filter((v) => v.region === 'sacral');
      for (let i=1; i<sacral.length; i+=1) assert.ok(Math.abs(distanceBetween(sacral[0].center,sacral[i].center) - distanceBetween(reference[0].center,reference[i].center)) < 1e-8);
    }
  }
  for (const id of [...baseline.vertebrae.map((v) => v.id),...baseline.ribs.map((r) => r.id),'clavicle-left','clavicle-right','occipital-condyle--1','occipital-condyle-1','skull']) assert.ok(moved.has(id), `${id} must move during playback, not merely differ from the T-pose`);
});

test('skull nods at the occiput and keeps the atlas beneath it instead of rotating a flat oval', () => {
  const nodded = createAxialGeometry(rig, globalMatrices(rig, { rotations_deg: { head: [10,12,0] } }));
  assert.ok(distanceBetween(nodded.skull.pivot,baseline.skull.pivot) < 1e-8);
  assert.ok(distanceBetween(nodded.skull.center,baseline.skull.center) > 10);
  assert.ok(distanceBetween(nodded.vertebrae[0].center,baseline.vertebrae[0].center) < 1e-8);
  assert.ok(distanceBetween(nodded.skull.pivot,nodded.vertebrae[0].center) < 10);
  for (const id of ['nasal-bridge','maxilla','mandible-front','occipital-condyle--1','occipital-condyle-1']) assert.ok(nodded.bones.some((b) => b.id === id));
  assert.ok(nodded.bones.some((b) => b.id.startsWith('occiput-')));
});

test('collarbones respond to shoulder motion and the neck-to-clavicle muscles stay attached', () => {
  const clip=clips['shoulder-clock-study'];
  const first=globalMatrices(rig,clip.frames[0]);
  const next=globalMatrices(rig,clip.frames[1]);
  const a=createAxialGeometry(rig,first);
  const b=createAxialGeometry(rig,next);
  const clavicle=(g,side)=>g.bones.find((bone)=>bone.id===`clavicle-${side}`);
  assert.ok(distanceBetween(clavicle(a,'left').points.at(-1),clavicle(b,'left').points.at(-1))>15);
  assert.ok(distanceBetween(clavicle(a,'right').points.at(-1),clavicle(b,'right').points.at(-1))<1e-8);
  const scm=createMuscleGeometry(rig,next).find((p)=>p.id==='sternocleidomastoid-clavicular-left');
  assert.ok(distanceBetween(scm.attachments[1].point,clavicle(b,'left').points[1])<1e-8);
});

test('seated feet and knees point anteriorly together and standing sagittal studies keep feet planted', () => {
  for (const clip of Object.values(clips)) for (const frame of clip.frames) {
    const matrices = globalMatrices(rig,frame);
    const at = (id) => transformPoint(matrices.get(id),[0,0,0]);
    if (['seated-pelvic-clock-exploration', 'supported-seated-side-reach', 'pause-before-standing', 'dynamic-chair-clock-study', 'shoulder-clock-study', 'sliding-hand-study', 'seated-counterturn-study', 'seated-weight-shift-study'].includes(clip.id)) {
      const m = matrices.get('pelvis');
      const forward = [m[2],m[6],m[10]];
      const anterior = (a,b) => a.reduce((sum,v,i) => sum + (v-b[i])*forward[i],0);
      for (const side of ['left','right']) {
        assert.ok(anterior(at(`femur-${side}`),at(`hip-${side}`)) > 300, `${clip.id}/${frame.id}: knee must be in front of hip`);
        assert.ok(anterior(at(`toe-${side}`),at(`tibia-${side}`)) > 200, `${clip.id}/${frame.id}: toes must be in front of ankle`);
      }
    }
    if (['chair-pose-study','standing-forward-fold-study'].includes(clip.id)) for (const side of ['left','right']) {
      assert.ok(distanceBetween(at(`tibia-${side}`),[side === 'left' ? -90 : 90,80,0]) < 1e-7);
      assert.ok(distanceBetween(at(`toe-${side}`),[side === 'left' ? -90 : 90,25,260]) < 1e-7);
    }
  }
});

test('new cervical, occipital, clavicular and segmental muscle attachments deform without losing their landmarks', () => {
  const rest = createMuscleGeometry(rig,globalMatrices(rig,neutral));
  for (const side of ['left','right']) {
    for (const name of ['splenius-capitis','semispinalis-capitis','rectus-capitis-posterior-major','rectus-capitis-posterior-minor','obliquus-capitis-superior','obliquus-capitis-inferior','scalene-anterior','scalene-middle','scalene-posterior','levator-scapulae','subclavius','pectoralis-minor','sternocleidomastoid-sternal','sternocleidomastoid-clavicular']) assert.ok(rest.some((p) => p.id === `${name}-${side}`));
    assert.equal(rest.filter((p) => p.id.startsWith('external-intercostal-') && p.id.endsWith(side)).length,11);
    assert.equal(rest.filter((p) => p.id.startsWith('intertransversarii-') && p.id.endsWith(side)).length,23);
  }
  const seen = new Set();
  for (const clip of Object.values(clips)) {
    const initial = createMuscleGeometry(rig,globalMatrices(rig,clip.frames[0]));
    for (const frame of clip.frames.slice(1)) {
      const matrices = globalMatrices(rig,frame);
      const axial = createAxialGeometry(rig,matrices);
      const muscles = createMuscleGeometry(rig,matrices);
      for (let i=0; i<muscles.length; i+=1) {
        const patch = muscles[i];
        if (patch.attachments && patch.attachments.some((a,j) => distanceBetween(a.point,initial[i].attachments[j].point) > 1)) seen.add(patch.id);
        if (patch.id.startsWith('external-intercostal-')) for (const a of patch.attachments) {
          const rib = axial.ribs.find((r) => r.id === a.bone);
          assert.ok(distanceBetween(a.point,rib.points[10]) < 1e-8, `${patch.id} detached from ${a.bone}`);
        }
        if (patch.id.startsWith('subclavius-')) {
          const a=patch.attachments[1];
          assert.ok(distanceBetween(a.point,axial.bones.find((b) => b.id === a.bone).points[2]) < 1e-8);
        }
      }
    }
  }
  for (const patch of rest.filter((p) => p.attachments)) assert.ok(seen.has(patch.id),`${patch.id} must move during a clip`);
  const taller=scaleReferenceRig(rig,{...DEFAULT_VISUAL_PROFILE,statureCm:195});
  const scaled=createMuscleGeometry(taller,globalMatrices(taller,neutral));
  rest.forEach((patch,i) => patch.attachments?.forEach((a,j) => assert.ok(distanceBetween(scaled[i].attachments[j].point,a.point.map((v)=>v*195/170))<1e-8)));
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
