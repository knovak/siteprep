import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { filterMovements, variantClip, variantRecord } from '../src/movement-library.mjs';
import { globalMatrices, transformPoint } from '../../phase-0/scripts/rig-math.mjs';
import { interpolateMovementPose } from '../src/movement-pose.mjs';
import { expandedStudies } from '../scripts/expanded-studies.mjs';
const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const collection = await read('../data/collection.json');
const clips = await read('../data/movement-clips.json');
const rig = await read('../../phase-2/data/rig-core.json');

test('navigation covers every record once and searches names, aliases, region and tradition together', () => {
  assert.equal(collection.records.length, 140);
  assert.equal(new Set(collection.records.map(entry => entry.id)).size, 140);
  for (const [tradition, count] of Object.entries({ feldenkrais: 60, yoga: 60, alexander: 20 })) {
    assert.equal(filterMovements(collection.records, { tradition }).length, count);
  }
  assert.equal(filterMovements(collection.records, { query: 'Vṛkṣāsana' })[0].id, 'tree-pose-study');
  assert.equal(filterMovements(collection.records, { query: 'Adho Mukha Svanasana' })[0].id, 'downward-facing-dog-study');
  assert.ok(filterMovements(collection.records, { tradition: 'feldenkrais', region: 'head' }).every(entry => entry.tradition === 'feldenkrais' && entry.regions.includes('head')));
  assert.equal(filterMovements(collection.records, { tradition: 'alexander', query: 'Vrksasana' }).length, 0);
  assert.equal(filterMovements(collection.records, { query: 'Alexander Technique' }).length, 20);
});

test('smaller range halves excursions, keeps timing and pauses, and leaves source clips untouched', () => {
  for (const clip of Object.values(clips)) {
    const original = JSON.stringify(clip);
    const smaller = variantClip(clip, { smaller: true });
    assert.equal(smaller.duration_seconds, clip.duration_seconds);
    smaller.frames.forEach((frame, index) => {
      assert.equal(frame.t, clip.frames[index].t);
      for (const field of ['rotations_deg', 'translations_mm']) {
        for (const [node, values] of Object.entries(frame[field])) values.forEach((value, axis) => {
          const start = clip.frames[0][field]?.[node]?.[axis] || 0;
          const end = clip.frames[index][field]?.[node]?.[axis] || 0;
          assert.equal(value, start + (end - start) / 2);
        });
      }
    });
    assert.equal(JSON.stringify(clip), original);
  }
  for (const study of expandedStudies) {
    const clip = clips[study.id];
    if (study.tradition === 'feldenkrais') assert.deepEqual(interpolateMovementPose(rig, clip, .8), interpolateMovementPose(rig, clip, .95));
    if (study.tradition === 'alexander') assert.deepEqual(interpolateMovementPose(rig, clip, 0), interpolateMovementPose(rig, clip, .19));
  }
});

test('mirroring reflects world-space landmarks and anatomy labels without changing canonical claim paths', async () => {
  const swap = id => id.replace(/-(left|right)$/, (_, side) => side === 'left' ? '-right' : '-left');
  for (const clip of Object.values(clips)) {
    const mirrored = variantClip(clip, { mirrored: true });
    for (const time of [0, .35, .7, 1]) {
      const original = globalMatrices(rig, interpolateMovementPose(rig, clip, time));
      const reflected = globalMatrices(rig, interpolateMovementPose(rig, mirrored, time));
      for (const node of rig.nodes) {
        const point = transformPoint(original.get(node.id), [0, 0, 0]);
        const other = transformPoint(reflected.get(swap(node.id)), [0, 0, 0]);
        point.forEach((value, axis) => assert.ok(Math.abs(value * (axis === 0 ? -1 : 1) - other[axis]) < 1e-6, `${clip.id}/${time}/${node.id}`));
      }
    }
  }
  const record = await read('../../phase-1/fixtures/yoga.json');
  const before = JSON.stringify(record);
  const mirrored = variantRecord(record, { mirrored: true });
  assert.equal(mirrored.phases[0].joint_actions[0].joint, swap(record.phases[0].joint_actions[0].joint));
  assert.equal(mirrored.source, record.source);
  assert.equal(JSON.stringify(record), before);
});
