import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateMovement } from '../../phase-1/src/validate-movement.mjs';
import { checkPhase0Data } from '../../phase-0/scripts/check-registration.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(phaseDirectory, path), 'utf8'));

test('the browser package reconstructs the registered Phase 0 rig', async () => {
  const [core, muscles, movement, ledger] = await Promise.all([
    readJson('data/rig-core.json'),
    readJson('data/muscles.json'),
    readJson('data/movement.json'),
    readJson('../phase-0/rights-ledger.json')
  ]);
  const rig = {
    ...core,
    layers: { ...core.layers, ...muscles.layers },
    attachments: muscles.attachments
  };
  const registration = checkPhase0Data(rig, ledger, { repoRoot: resolve(phaseDirectory, '../../../..') });
  const contract = validateMovement(movement, rig);

  assert.deepEqual(registration.errors, []);
  assert.equal(registration.report.maximum_distance_mm <= 8, true);
  assert.deepEqual(contract.errors, []);
  assert.equal(movement.source.review.status, 'unreviewed');
  assert.match(movement.safety.notes, /not diagnosis/i);
});
