import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkPhase0Data } from '../../phase-0/scripts/check-registration.mjs';
import { validateMovementSet } from '../../phase-1/src/validate-movement.mjs';
import { anatomySummary, instructionSections, movementCompleteness, phaseCue } from '../src/collection.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const initiativeDirectory = resolve(phaseDirectory, '../..');
const readJson = async (path) => JSON.parse(await readFile(resolve(initiativeDirectory, path), 'utf8'));
const collection = await readJson('work/phase-3/data/collection.json');
const clips = await readJson('work/phase-3/data/movement-clips.json');
const records = await Promise.all(collection.records.map(async (entry) => JSON.parse(await readFile(resolve(phaseDirectory, entry.record), 'utf8'))));
const core = await readJson('work/phase-2/data/rig-core.json');
const muscles = await readJson('work/phase-2/data/muscles.json');
const ledger = await readJson('work/phase-0/rights-ledger.json');
const rig = {
  ...core,
  layers: { ...core.layers, ...muscles.layers },
  attachments: muscles.attachments
};

test('the collection has 13 valid, sourced, unreviewed records across the three traditions', () => {
  assert.deepEqual(validateMovementSet(records, rig).errors, []);
  assert.deepEqual(
    Object.fromEntries(['alexander', 'feldenkrais', 'yoga'].map((tradition) => [tradition, records.filter((record) => record.tradition === tradition).length])),
    { alexander: 1, feldenkrais: 6, yoga: 6 }
  );
  for (const record of records) {
    assert.equal(record.source.review.status, 'unreviewed');
    assert.match(record.source.rights_basis, /^provisional:/);
    assert.ok(record.safety.cautions.length > 0);
    assert.ok(record.source.claim_sources.length > 0);
    assert.ok(record.source.claim_sources.every((source) => source.url.startsWith('https://') && source.supports.length > 0));
    assert.equal(movementCompleteness(record).complete, true);
  }
});

test('removing non-geometric instruction makes every record visibly incomplete', () => {
  for (const record of records) {
    const withoutInstruction = structuredClone(record);
    delete withoutInstruction.instruction;
    assert.deepEqual(movementCompleteness(withoutInstruction), {
      complete: false,
      missing: ['tradition-specific instruction']
    });
    assert.ok(instructionSections(record).length >= 3);
  }
});

test('tradition-specific phase cues survive collection rendering', () => {
  const [feldenkrais, yoga, alexander] = ['feldenkrais', 'yoga', 'alexander'].map((tradition) => (
    records.find((record) => record.tradition === tradition)
  ));
  assert.match(phaseCue(feldenkrais, 'notice-center'), /contact with the chair/i);
  assert.match(phaseCue(yoga, 'enter'), /raise the arm/i);
  assert.match(phaseCue(alexander, 'pause'), /allow length and width/i);
  assert.ok(instructionSections(alexander).some((section) => /hands-on guidance/i.test(section.label)));
  assert.match(anatomySummary(yoga, 'enter'), /scapula.*left.*upward rotation/i);
  assert.match(anatomySummary(yoga, 'enter'), /serratus anterior.*left.*shortens/i);
});

test('each hand-authored clip is distinct, bounded, and stays on the registered shared rig', () => {
  const nodeIds = new Set(rig.nodes.map((node) => node.id));
  const serialized = new Set();
  for (const record of records) {
    const clip = clips[record.id];
    assert.ok(clip, `missing clip for ${record.id}`);
    assert.equal(clip.duration_seconds, Math.max(...record.phases.map((phase) => phase.t[1])));
    assert.equal(clip.frames[0].t, 0);
    assert.equal(clip.frames.at(-1).t, 1);
    assert.ok(clip.frames.every((frame, index) => index === 0 || frame.t > clip.frames[index - 1].t));
    for (const frame of clip.frames) {
      assert.ok(Object.keys(frame.rotations_deg).every((nodeId) => nodeIds.has(nodeId)));
    }
    serialized.add(JSON.stringify(clip.frames));
    const registration = checkPhase0Data({ ...rig, clip }, ledger, { repoRoot: resolve(initiativeDirectory, '../..') });
    assert.deepEqual(registration.errors, []);
    assert.ok(registration.report.maximum_distance_mm <= 8);
  }
  assert.equal(serialized.size, 13);
});
