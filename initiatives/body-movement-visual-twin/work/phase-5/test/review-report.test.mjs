import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateMovement } from '../../phase-1/src/validate-movement.mjs';
import {
  claimDescriptors,
  createReviewReport,
  reviewEmailUrl,
  serializeReviewReport,
  valueAtClaimPath
} from '../src/review-report.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const initiativeDirectory = resolve(phaseDirectory, '../..');
const readJson = async (path) => JSON.parse(await readFile(resolve(initiativeDirectory, path), 'utf8'));
const record = await readJson('work/phase-1/fixtures/feldenkrais.json');
const core = await readJson('work/phase-2/data/rig-core.json');
const muscles = await readJson('work/phase-2/data/muscles.json');
const anatomy = { layers: { skeleton: core.layers.skeleton, muscles: muscles.layers.muscles } };

test('every joint action, muscle annotation, attribution, and safety claim has a traceable path', () => {
  const claims = claimDescriptors(record);
  const expectedCount = record.phases.reduce((count, phase) => count + phase.joint_actions.length + phase.muscles.length, 0)
    + record.source.claim_sources.length + record.safety.cautions.length + 1;
  assert.equal(claims.length, expectedCount);
  assert.deepEqual(new Set(claims.map((claim) => claim.kind)), new Set(['anatomy', 'movement', 'attribution', 'safety']));
  for (const claim of claims) assert.notEqual(valueAtClaimPath(record, claim.path), undefined);
});

test('a report carries the exact claim, optional reviewer, and separate-evidence boundary', () => {
  const original = JSON.stringify(record);
  const report = createReviewReport({
    movement: record,
    claimPath: 'phases.0.muscles.0',
    reviewer: 'Practitioner 17',
    date: new Date('2026-08-21T20:30:00.000Z'),
    kind: 'anatomy',
    severity: 'important',
    note: 'Please distinguish observed movement from the fitted reference annotation.'
  });
  assert.deepEqual(Object.keys(report), ['schema_version', 'movement_id', 'claim_path', 'reviewer', 'date', 'kind', 'severity', 'note', 'record_changed']);
  assert.equal(report.record_changed, false);
  assert.equal(JSON.stringify(record), original);
  assert.match(serializeReviewReport(report), /"claim_path": "phases\.0\.muscles\.0"/);
  assert.match(decodeURIComponent(reviewEmailUrl(report, 'review@example.test')), /^mailto:review@example\.test\?/);
});

test('kind cannot drift away from the selected claim path', () => {
  assert.throws(() => createReviewReport({
    movement: record,
    claimPath: 'safety.notes',
    kind: 'anatomy',
    severity: 'question',
    note: 'Wrong kind.'
  }), /requires kind safety/);
});

test('human triage can correct, dispute, or remove a source while preserving the report', () => {
  const report = createReviewReport({
    movement: record,
    claimPath: 'source.claim_sources.0',
    reviewer: '',
    date: '2026-08-21T20:30:00.000Z',
    kind: 'attribution',
    severity: 'blocking',
    note: 'Remove this source unless its scope can be confirmed.'
  });
  const evidence = serializeReviewReport(report);
  const corrected = structuredClone(record);
  corrected.safety.cautions[0] = `${corrected.safety.cautions[0]} Pause and reassess before continuing.`;
  corrected.source.review = { status: 'reviewed', by: 'triage fixture', on: '2026-08-21', notes: 'Wording corrected after report.' };
  assert.equal(validateMovement(corrected, anatomy).ok, true);

  const disputed = structuredClone(record);
  disputed.source.review = { status: 'disputed', by: 'triage fixture', on: '2026-08-21', notes: 'Claim retained with unresolved practitioner concern.' };
  assert.equal(validateMovement(disputed, anatomy).ok, true);

  const sourceRemoved = structuredClone(record);
  sourceRemoved.source.claim_sources.splice(0, 1);
  assert.equal(validateMovement(sourceRemoved, anatomy).ok, true);
  assert.equal(serializeReviewReport(report), evidence);
  assert.equal(record.source.review.status, 'unreviewed');
});

test('review code does not persist identity or reports', async () => {
  const source = await readFile(resolve(phaseDirectory, 'src/review-report.mjs'), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\s*\(/);
});
