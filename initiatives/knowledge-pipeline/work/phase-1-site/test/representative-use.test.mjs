import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  REQUIRED_MEASUREMENTS,
  REQUIRED_WITNESSED_ACTIONS,
  compareDistributionTopologies,
  createRepresentativeUseTemplate,
  representativeUseStatus,
} from '../lib/representative-use.mjs';

const evidence = JSON.parse(
  await readFile(
    fileURLToPath(
      new URL('../fixtures/phase-7-representative-use.json', import.meta.url),
    ),
    'utf8',
  ),
);

test('Phase 7 template names every witnessed action and measurement without fabricating a person', () => {
  const generated = createRepresentativeUseTemplate({
    createdAt: evidence.createdAt,
  });
  assert.deepEqual(generated, evidence);
  assert.deepEqual(
    generated.independentWitness.actions.map(({id}) => id),
    REQUIRED_WITNESSED_ACTIONS,
  );
  assert.deepEqual(Object.keys(generated.measurements), REQUIRED_MEASUREMENTS);
  const result = representativeUseStatus(generated);
  assert.equal(result.status, 'pending');
  assert.ok(result.findings.includes('representative.independent_witness.required'));
  assert.ok(result.findings.includes('representative.recovery.disposable_restore'));
});

test('a green suite cannot impersonate an independent witness', () => {
  const record = structuredClone(evidence);
  record.independentWitness.actions.forEach((action) => {
    action.status = 'passed';
  });
  for (const key of REQUIRED_MEASUREMENTS) record.measurements[key] = 0;
  record.recovery.disposableRestore = 'passed';
  assert.equal(representativeUseStatus(record).status, 'pending');
  record.independentWitness = {
    ...record.independentWitness,
    status: 'witnessed',
    role: 'independent curator',
    independentOfImplementation: true,
  };
  assert.deepEqual(representativeUseStatus(record), {
    status: 'complete',
    findings: [],
  });
});

test('distribution comparison retains all four topologies and makes no permanent choice', () => {
  const comparison = compareDistributionTopologies(evidence);
  assert.deepEqual(
    comparison.topologies.map(({id}) => id),
    [
      'one-multi-user-website',
      'self-maintained-kit-per-user',
      'maintainer-operated-single-user-sites',
      'skills-and-apps-over-portable-boundaries',
    ],
  );
  assert.equal(comparison.recommendation, null);
  assert.ok(comparison.topologies.every(({evidenceMissing}) => evidenceMissing.length));
});
