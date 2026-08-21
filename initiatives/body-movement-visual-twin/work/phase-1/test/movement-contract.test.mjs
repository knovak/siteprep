import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateMovement, validateMovementSet } from '../src/validate-movement.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(phaseDirectory, '../phase-0/assets/original/reference-rig.json'), 'utf8'));

async function fixture(name) {
  return JSON.parse(await readFile(resolve(phaseDirectory, 'fixtures', `${name}.json`), 'utf8'));
}

const records = {
  feldenkrais: await fixture('feldenkrais'),
  yoga: await fixture('yoga'),
  alexander: await fixture('alexander')
};

test('one fixture per tradition passes the movement contract', () => {
  const result = validateMovementSet(Object.values(records), manifest);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('flattening an instruction into generic prose is a useful failure', () => {
  const flattened = structuredClone(records.feldenkrais);
  flattened.instruction = { caption: 'Move slowly and pay attention.' };
  const result = validateMovement(flattened, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /instruction\.exploration is required/);
  assert.match(result.errors.join('\n'), /instruction\.caption is not allowed/);
});

test('an instruction shape cannot be relabelled as another tradition', () => {
  const relabelled = structuredClone(records.feldenkrais);
  relabelled.tradition = 'yoga';
  const result = validateMovement(relabelled, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /instruction\.posture is required/);
  assert.match(result.errors.join('\n'), /instruction\.exploration is not allowed/);
});

test('a missing per-record source fails without affecting another record', () => {
  const unsourced = structuredClone(records.yoga);
  delete unsourced.source;
  const result = validateMovement(unsourced, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /\$\.source is required/);

  const smallerBuild = validateMovementSet([records.feldenkrais, records.alexander], manifest);
  assert.equal(smallerBuild.ok, true, smallerBuild.errors.join('\n'));
});

test('over-claiming fields fail even when nested in otherwise valid data', () => {
  const overClaiming = structuredClone(records.alexander);
  overClaiming.phases[0].muscles[0].activation_percentage = 42;
  const result = validateMovement(overClaiming, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /activation_percentage is forbidden/);
});

test('timing anchors and anatomy names must resolve', () => {
  const dangling = structuredClone(records.feldenkrais);
  dangling.instruction.attention[0].phase = 'missing-phase';
  dangling.phases[0].joint_actions[0].joint = 'imaginary-joint';
  dangling.phases[0].muscles[0].id = 'imaginary-muscle';
  const result = validateMovement(dangling, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /references unknown phase "missing-phase"/);
  assert.match(result.errors.join('\n'), /references unknown anatomy "imaginary-joint"/);
  assert.match(result.errors.join('\n'), /references unknown anatomy "imaginary-muscle"/);
});

test('geometry paths stay in the asset manifest', () => {
  const embeddedGeometry = structuredClone(records.yoga);
  embeddedGeometry.phases[0].geometry_path = 'movement-specific.glb';
  const result = validateMovement(embeddedGeometry, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /geometry_path is forbidden/);
});
