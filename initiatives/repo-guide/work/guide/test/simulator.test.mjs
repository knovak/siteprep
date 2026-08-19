import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, test} from 'node:test';

import {buildSimulatorSteps, generateSimulator, SIMULATOR_FACT_KEYS} from '../build/simulator.mjs';

const TEST_DIR = new URL('.', import.meta.url).pathname;
const FIXTURES = join(TEST_DIR, 'fixtures');
const REPO_LIFECYCLE = join(FIXTURES, 'repo-lifecycle');

const syntheticFacts = {
  'lifecycle.stages': ['seed', 'sketched', 'chosen', 'ordered', 'making', 'polishing', 'resting', 'closed'],
  'lifecycle.stage_documents': {sketched: ['shape.md'], chosen: ['shape.md', 'choice.md']},
  'blockers.proposable': ['person'],
  'blockers.human': ['person', 'ledger'],
  'sweep.phases': ['look', 'reply', 'start'],
  'sweep.budget': {items_per_run: 3},
};
const dating = {
  pdfs: [],
  simulator: {watched: '2026-08-15', source_date: '2026-08-17', possibly_stale: true},
  diagnostics: ['Simulator may need re-watching: watched 2026-08-15; sources changed 2026-08-17.'],
};

describe('simulator choreography', () => {
  test('the walk-through visits every stage, in order, using only derived vocabulary', () => {
    const {steps, vocabulary} = buildSimulatorSteps(syntheticFacts);
    assert.deepEqual(vocabulary.stages, syntheticFacts['lifecycle.stages']);
    assert.ok(steps.every(step => vocabulary.stages.includes(step.stage)));

    // Every stage appears, and the first time each is reached is in lifecycle order.
    const firstReached = vocabulary.stages.map(stage => steps.findIndex(step => step.stage === stage));
    assert.ok(firstReached.every(index => index >= 0), 'every stage is visited');
    assert.deepEqual(firstReached, [...firstReached].sort((a, b) => a - b));

    assert.ok(steps.every(step => Object.keys(step.phases).every(phase => vocabulary.phases.includes(phase))));
    assert.ok(steps.some(step => step.items.some(item => item.detail.includes('person:'))));
    assert.ok(steps.some(step => step.items.some(item => item.detail.includes('ledger:'))),
      'a human class that cannot be proposed is shown as well as one that can');
  });

  test('the lifecycle also moves backwards at least once', () => {
    const {steps, vocabulary} = buildSimulatorSteps(syntheticFacts);
    const indexes = steps.map(step => vocabulary.stages.indexOf(step.stage));
    assert.ok(indexes.some((value, index) => index > 0 && value < indexes[index - 1]),
      'moving back when the reasoning changes is a supported move and is shown');
  });

  test('every item carries a stable key so a step can be reconciled rather than replaced', () => {
    const {steps} = buildSimulatorSteps(syntheticFacts);
    for (const step of steps) {
      const keys = step.items.map(item => item.key);
      assert.ok(keys.every(key => typeof key === 'string' && key.length > 0), `${step.id} keys every item`);
      assert.equal(new Set(keys).size, keys.length, `${step.id} has no duplicate keys`);
      for (const beat of step.beats ?? []) {
        for (const item of beat.items ?? []) assert.ok(item.key, `${step.id} beat items are keyed`);
      }
    }
  });

  test('the record only grows, and never loses a document the work already wrote', () => {
    const {steps} = buildSimulatorSteps(syntheticFacts);
    for (const [index, step] of steps.entries()) {
      if (index === 0) continue;
      for (const name of steps[index - 1].documents) {
        assert.ok(step.documents.includes(name), `${step.id} keeps ${name}`);
      }
    }
    assert.deepEqual(steps.at(-1).documents, ['shape.md', 'choice.md']);
  });

  test('the sweep step spends its allowance in beats rather than presenting it finished', () => {
    const {steps, vocabulary} = buildSimulatorSteps(syntheticFacts);
    const sweep = steps.find(step => step.id === 'sweep-runs');
    assert.ok(sweep.beats.length >= 3, 'the interesting moment is choreographed');
    assert.equal(sweep.beats[0].budget.spent, 0);
    assert.equal(sweep.beats.at(-1).budget.spent, vocabulary.items_per_run);
    assert.ok(sweep.beats.at(-1).items.some(item => item.state === 'passed'
      && item.detail.includes(`${vocabulary.items_per_run}/${vocabulary.items_per_run}`)));
    assert.deepEqual(sweep.beats.map(beat => beat.at), [...sweep.beats.map(beat => beat.at)].sort((a, b) => a - b));
  });

  test('every step but the last says what the next one will do', () => {
    const {steps} = buildSimulatorSteps(syntheticFacts);
    for (const step of steps.slice(0, -1)) {
      assert.ok(step.advance && step.advance.length > 0, `${step.id} names its next move`);
    }
    assert.equal(steps.at(-1).advance, null);
  });

  test('a lifecycle too short for the whole walk-through fails rather than truncating it', () => {
    assert.throws(
      () => buildSimulatorSteps({...syntheticFacts, 'lifecycle.stages': ['seed', 'sketched', 'chosen']}),
      /at least 8/
    );
  });

  test('a human blocker set with nothing unproposable fails', () => {
    assert.throws(
      () => buildSimulatorSteps({...syntheticFacts, 'blockers.human': ['person', 'other'], 'blockers.proposable': ['person', 'other']}),
      /cannot be proposed/
    );
  });

  test('generation resolves only its registered fact keys and never reads initiative data', async () => {
    const outputPath = join(mkdtempSync(join(tmpdir(), 'repo-guide-simulator-')), 'simulator.html');
    const report = await generateSimulator({
      root: REPO_LIFECYCLE,
      outputPath,
      now: '2026-08-18T00:00:00Z',
      sha: 'abc1234',
      repositoryUrl: 'https://github.com/example/repo',
      factOverrides: {initiativesDir: join(FIXTURES, 'does-not-exist')},
      dating,
    });
    assert.ok(report.steps >= 12, 'the whole lifecycle needs more than a handful of steps');
    assert.deepEqual(report.stages_visited, syntheticFacts['lifecycle.stages']);
    assert.deepEqual(Object.keys(report.vocabulary).sort(),
      ['blocker_classes', 'items_per_run', 'phases', 'stage_documents', 'stages', 'unproposable_class']);
    assert.deepEqual(SIMULATOR_FACT_KEYS, [
      'lifecycle.stages',
      'lifecycle.stage_documents',
      'blockers.proposable',
      'blockers.human',
      'sweep.phases',
      'sweep.budget',
    ]);
    assert.equal(report.dating.simulator.possibly_stale, true);
    assert.match(report.dating.diagnostics[0], /may need re-watching/);
    const html = readFileSync(outputPath, 'utf8');
    assert.match(html, /data-source-sha="abc1234"/);
    assert.doesNotMatch(html, /initiative\.json/);
  });

  test('a lifecycle rename inconsistent with its source map fails generation', async () => {
    const outputPath = join(mkdtempSync(join(tmpdir(), 'repo-guide-simulator-drift-')), 'simulator.html');
    await assert.rejects(generateSimulator({
      root: REPO_LIFECYCLE,
      outputPath,
      sha: 'abc1234',
      repositoryUrl: 'https://github.com/example/repo',
      factOverrides: {initiativesModule: join(FIXTURES, 'repo-renamed-stage', 'initiatives.mjs')},
      dating,
    }), /Lifecycle drift/);
  });
});
