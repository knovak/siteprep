import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkPhase0Data } from '../scripts/check-registration.mjs';

const PHASE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rig = JSON.parse(readFileSync(resolve(PHASE_DIR, 'assets/original/reference-rig.json'), 'utf8'));
const ledger = JSON.parse(readFileSync(resolve(PHASE_DIR, 'rights-ledger.json'), 'utf8'));

test('the rights-ledgered fixture passes every Phase 0 contract', () => {
  const result = checkPhase0Data(rig, ledger);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.report.registration_sample_count, 100);
  assert.ok(result.report.maximum_distance_mm < 8);
});

test('a drifting landmark fails rather than hiding under the surface', () => {
  const drifting = structuredClone(rig);
  drifting.attachments[0].geometry_landmark_local_mm[0] += 12;
  const result = checkPhase0Data(drifting, ledger);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /trapezius-superior\/origin misses by/);
});

test('an excluded third-party asset cannot enter the packaged rig', () => {
  const contaminated = structuredClone(rig);
  contaminated.rights_refs.push('skel-data-software');
  const result = checkPhase0Data(contaminated, ledger);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /skel-data-software is not marked used/);
});
