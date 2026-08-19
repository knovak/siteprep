import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, test} from 'node:test';

import {buildSimulatorSteps, generateSimulator, SIMULATOR_FACT_KEYS} from '../build/simulator.mjs';

const TEST_DIR = new URL('.', import.meta.url).pathname;
const FIXTURES = join(TEST_DIR, 'fixtures');
const REPO_OK = join(FIXTURES, 'repo-ok');

const syntheticFacts = {
  'lifecycle.stages': ['seed', 'grown', 'planned', 'resting'],
  'blockers.proposable': ['person'],
  'sweep.phases': ['survey', 'work'],
  'sweep.budget': {items_per_run: 2},
};
const dating = {
  pdfs: [],
  simulator: {watched: '2026-08-15', source_date: '2026-08-17', possibly_stale: true},
  diagnostics: ['Simulator may need re-watching: watched 2026-08-15; sources changed 2026-08-17.'],
};

describe('simulator choreography', () => {
  test('six fixed steps use only derived stage, blocker, phase, and budget vocabulary', () => {
    const {steps, vocabulary} = buildSimulatorSteps(syntheticFacts);
    assert.equal(steps.length, 6);
    assert.deepEqual(vocabulary.stages, syntheticFacts['lifecycle.stages']);
    assert.ok(steps.every(step => vocabulary.stages.includes(step.stage)));
    assert.ok(steps.some(step => step.items.some(item => item.detail.includes('person:'))));
    assert.ok(steps.every(step => Object.keys(step.phases).every(phase => vocabulary.phases.includes(phase))));
    assert.ok(steps[3].items.some(item => item.state === 'passed' && item.detail.includes('2/2')));
    assert.ok(steps[5].items.some(item => item.cascade && item.state === 'actionable'));
  });

  test('generation resolves only its four fact keys and never reads initiative data', async () => {
    const outputPath = join(mkdtempSync(join(tmpdir(), 'repo-guide-simulator-')), 'simulator.html');
    const report = await generateSimulator({
      root: REPO_OK,
      outputPath,
      now: '2026-08-18T00:00:00Z',
      sha: 'abc1234',
      repositoryUrl: 'https://github.com/example/repo',
      factOverrides: {initiativesDir: join(FIXTURES, 'does-not-exist')},
      dating,
    });
    assert.equal(report.steps, 6);
    assert.deepEqual(Object.keys(report.vocabulary).sort(), ['blocker_classes', 'items_per_run', 'phases', 'stages']);
    assert.deepEqual(SIMULATOR_FACT_KEYS, ['lifecycle.stages', 'blockers.proposable', 'sweep.phases', 'sweep.budget']);
    assert.equal(report.dating.simulator.possibly_stale, true);
    assert.match(report.dating.diagnostics[0], /may need re-watching/);
    const html = readFileSync(outputPath, 'utf8');
    assert.match(html, /data-source-sha="abc1234"/);
    assert.doesNotMatch(html, /initiative\.json/);
  });

  test('a lifecycle rename inconsistent with its source map fails generation', async () => {
    const outputPath = join(mkdtempSync(join(tmpdir(), 'repo-guide-simulator-drift-')), 'simulator.html');
    await assert.rejects(generateSimulator({
      root: REPO_OK,
      outputPath,
      sha: 'abc1234',
      repositoryUrl: 'https://github.com/example/repo',
      factOverrides: {initiativesModule: join(FIXTURES, 'repo-renamed-stage', 'initiatives.mjs')},
      dating,
    }), /Lifecycle drift/);
  });
});
