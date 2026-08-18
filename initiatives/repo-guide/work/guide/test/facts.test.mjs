import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, test } from 'node:test';
import {
  FactRegistry,
  createFactRegistry,
  readSkillFrontmatter,
  readSweepPrompt,
  readWorkflow,
  repositorySources,
  resolveRepositoryFacts
} from '../build/facts.mjs';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(TEST_DIR, 'fixtures');
const REPO_OK = join(FIXTURES, 'repo-ok');

function okSources(overrides = {}) {
  return repositorySources(REPO_OK, overrides);
}

describe('strict text readers', () => {
  test('workflow reader returns only direct trigger and job keys', async () => {
    const path = join(REPO_OK, '.github', 'workflows', 'example.yml');
    assert.deepEqual(readWorkflow(await readFile(path, 'utf8'), path), {
      triggers: ['push', 'manual'],
      jobs: ['inspect', 'publish']
    });
  });

  test('workflow reader fails on an unsupported inline trigger', async () => {
    const path = join(FIXTURES, 'repo-odd-yaml', 'inline.yml');
    assert.throws(
      () => readWorkflow(readFixture(path), path),
      /missing on: block/
    );
  });

  test('skill reader folds a multiline description', async () => {
    const path = join(REPO_OK, '.claude', 'skills', 'sample', 'SKILL.md');
    assert.deepEqual(readSkillFrontmatter(await readFile(path, 'utf8'), path), {
      name: 'sample',
      description: 'Read a miniature source and return its exact facts.'
    });
  });

  test('skill reader fails when its delimiter is missing', () => {
    assert.throws(
      () => readSkillFrontmatter('---\nname: sample\ndescription: Broken'),
      /missing closing delimiter/
    );
  });

  test('sweep prompt reader binds numbered headings to configured phases', async () => {
    const path = join(REPO_OK, 'initiatives', 'sweep-prompt.md');
    const facts = readSweepPrompt(await readFile(path, 'utf8'), ['survey', 'work'], path);
    assert.deepEqual(facts.phaseSummaries.map(({ phase }) => phase), ['survey', 'work']);
    assert.deepEqual(facts.rules, ['Never invent a source value.', 'Never merge.']);
    assert.throws(
      () => readSweepPrompt(readFixture(path).replace('## Phase 2', '## Review'), ['survey', 'work'], path),
      /phase headings were 1, expected 1,2/
    );
  });
});

describe('fact registry', () => {
  test('every approved key resolves from the miniature repository', async () => {
    const facts = await resolveRepositoryFacts(REPO_OK);
    assert.deepEqual(facts['lifecycle.stages'], ['seed', 'grown', 'resting']);
    assert.deepEqual(facts['lifecycle.stage_documents'], { grown: ['shape.md'] });
    assert.deepEqual(facts['blockers.prefixes'], ['todo', 'person']);
    assert.deepEqual(facts['blockers.human'], ['person']);
    assert.deepEqual(facts['blockers.proposable'], ['person']);
    assert.deepEqual(facts['sweep.phases'], ['survey', 'work']);
    assert.deepEqual(facts['sweep.budget'], {
      items_per_run: 2,
      max_items_per_initiative: 1,
      max_open_prs: 3,
      max_effort: 'tiny'
    });
    assert.deepEqual(facts['sweep.protected_paths'], ['engine/']);
    assert.deepEqual(facts['agent.commands'], { check: 'node check.mjs' });
    assert.deepEqual(facts['workflows.example'].jobs, ['inspect', 'publish']);
    assert.equal(facts['skills.sample'].name, 'sample');
  });

  test('one source per key is enforced before either source is read', () => {
    const first = join(FIXTURES, 'repo-two-sources', 'first.json');
    const second = join(FIXTURES, 'repo-two-sources', 'second.json');
    const registry = new FactRegistry();
    registry.register('lifecycle.stages', first, () => ['first']);
    assert.throws(
      () => registry.register('lifecycle.stages', second, () => ['second']),
      (error) => error.message.includes(first) && error.message.includes(second)
    );
  });

  test('a missing export is an unresolvable-fact error with no partial result', async () => {
    const modulePath = join(FIXTURES, 'repo-missing-export', 'initiatives.mjs');
    await assert.rejects(
      resolveRepositoryFacts(REPO_OK, { initiativesModule: modulePath }),
      /Unresolvable fact: .* does not export PROPOSABLE_BLOCKERS/
    );
  });

  test('constants are imported, independent of their source formatting', async () => {
    const facts = await resolveRepositoryFacts(REPO_OK);
    assert.deepEqual(facts['lifecycle.stages'], ['seed', 'grown', 'resting']);
  });

  test('importing the real-shaped module does not run its CLI branch', async () => {
    const modulePath = join(REPO_OK, 'scripts', 'initiatives.mjs');
    const imported = await import(`${pathToFileURL(modulePath).href}?guard-test`);
    assert.deepEqual(imported.STAGES, ['seed', 'grown', 'resting']);
  });

  test('renaming a stage without its dependent map fails as detectable drift', async () => {
    const modulePath = join(FIXTURES, 'repo-renamed-stage', 'initiatives.mjs');
    await assert.rejects(
      resolveRepositoryFacts(REPO_OK, { initiativesModule: modulePath }),
      /Lifecycle drift: STAGE_DOCUMENTS names unknown stage grown/
    );
  });

  test('a removed sweep phase disappears from the resolved fact set', async () => {
    const facts = await resolveRepositoryFacts(REPO_OK);
    assert(!JSON.stringify(facts).includes('respond'));
  });

  test('initiatives.live exposes no backlog or blocker details', async () => {
    const facts = await resolveRepositoryFacts(REPO_OK);
    assert.deepEqual(facts['initiatives.live'], [
      { slug: 'alpha', title: 'Alpha', stage: 'seed' },
      { slug: 'beta', title: 'Beta', stage: 'grown' }
    ]);
    assert.deepEqual(Object.keys(facts['initiatives.live'][0]), ['slug', 'title', 'stage']);
    assert(!JSON.stringify(facts['initiatives.live']).includes('secret-detail'));
  });

  test('the registry records one source label for every live key', async () => {
    const registry = await createFactRegistry(okSources());
    const entries = registry.entries();
    assert(entries.length > 12);
    assert.equal(new Set(entries.map(({ key }) => key)).size, entries.length);
    assert(entries.every(({ source }) => typeof source === 'string' && source.length > 0));
  });
});

function readFixture(path) {
  return readFileSync(path, 'utf8');
}
