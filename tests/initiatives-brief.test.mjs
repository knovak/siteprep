/**
 * The brief: the short "where this stands" summary on an initiative overview,
 * its staleness stamp, and the rules that keep it a summary rather than a
 * second place where facts live.
 *
 * Run with `node --test tests/initiatives-brief.test.mjs`, or via
 * `scripts/build_tests.sh`.
 *
 * The digest is read from git, so tests that need one run against the real
 * repository rather than a fixture directory; tests about the rendering and
 * the section parser use a throwaway fixture copy.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'initiatives.mjs');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'initiatives');

function run(args, initiativesDir) {
  return execFileSync('node', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, INITIATIVES_DIR: initiativesDir }
  });
}

function runFailing(args, initiativesDir) {
  try {
    run(args, initiativesDir);
  } catch (err) {
    return { status: err.status, stderr: String(err.stderr || ''), stdout: String(err.stdout || '') };
  }
  throw new Error(`expected \`${args.join(' ')}\` to exit non-zero`);
}

/** Turn a phase on in a scratch copy's sweep.json. The fixture ships survey-only. */
function enablePhase(dir, phase) {
  const path = join(dir, 'sweep.json');
  const sweep = JSON.parse(readFileSync(path, 'utf8'));
  sweep.phases = [...new Set([...(sweep.phases || ['survey']), phase])];
  writeFileSync(path, `${JSON.stringify(sweep, null, 2)}\n`);
  return dir;
}

/** A throwaway fixture copy, with `healthy` patched. */
function scratch(patch = {}, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'initiative-brief-'));
  cpSync(FIXTURES, dir, { recursive: true });
  const path = join(dir, 'healthy', 'initiative.json');
  const data = { ...JSON.parse(readFileSync(path, 'utf8')), ...patch };
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, 'healthy', name), body);
  }
  return dir;
}

const BRIEF = `# Brief

## Done
Thirteen movement studies and a viewer.

## Waiting on others
Reviewers owe acceptance or disputes.

## Remaining work
Apply corrections and rerun the checks.

## Optional later
Breathing motion, additional studies.
`;

// ------------------------------------------------------------ which stages

test('only building and refining are asked for a brief', () => {
  for (const stage of ['wish', 'shaped', 'specified', 'planned']) {
    const out = run(['validate'], scratch({ stage }));
    // Scoped to `healthy`: the `idle-one` fixture is itself at `building`.
    assert.doesNotMatch(out, /healthy: stage is .* but brief\.md is missing/,
      `${stage} should not want a brief`);
  }
});

test('a building initiative with no brief warns, and the sweep is what clears it', () => {
  const dir = enablePhase(scratch({ stage: 'building' }), 'brief');
  assert.match(run(['validate'], dir), /healthy: stage is "building" but brief\.md is missing/);

  const candidates = JSON.parse(run(['brief', '--json'], dir));
  assert.ok(candidates.selected.some((item) => item.slug === 'healthy' && item.reason === 'no brief yet'));
});

test('a resting initiative keeps its brief without being asked to refresh it', () => {
  // Coming back to a dormant initiative, its last brief is exactly what you want.
  const dir = enablePhase(scratch({ stage: 'dormant' }, { 'brief.md': BRIEF }), 'brief');
  assert.doesNotMatch(run(['validate'], dir), /healthy:.*brief/);
  const candidates = JSON.parse(run(['brief', '--json'], dir));
  assert.ok(!candidates.selected.some((item) => item.slug === 'healthy'));
});

// -------------------------------------------------------------- the phase

test('the brief phase is off when sweep.json does not list it', () => {
  const dir = scratch({ stage: 'building' });
  const sweepPath = join(dir, 'sweep.json');
  const sweep = JSON.parse(readFileSync(sweepPath, 'utf8'));
  sweep.phases = ['survey'];
  writeFileSync(sweepPath, JSON.stringify(sweep, null, 2));

  const result = JSON.parse(run(['brief', '--json'], dir));
  assert.equal(result.enabled, false);
  assert.match(result.reason, /sweep\.json decides/);
  assert.deepEqual(result.selected, []);
});

// -------------------------------------------------------------- sections

test('the brief parses into ordered sections and drops empty ones', () => {
  const dir = scratch({ stage: 'building' }, {
    'brief.md': '# Brief\n\n## Optional later\nLater things.\n\n## Done\nDone things.\n\n## Remaining work\n\n'
  });
  const out = run(['page', 'healthy'], dir);

  // Declared order wins over file order, and a heading with no body is dropped.
  const done = out.indexOf('Done');
  const later = out.indexOf('Optional later');
  assert.ok(done > -1 && later > -1 && done < later, 'Done comes before Optional later');
  assert.doesNotMatch(out, /Remaining work/, 'an empty section is not rendered');
});

test('an unrecognised section is kept rather than silently dropped', () => {
  const dir = scratch({ stage: 'building' }, {
    'brief.md': '# Brief\n\n## Done\nA thing.\n\n## Rights review\nStill open.\n'
  });
  assert.match(run(['page', 'healthy'], dir), /Rights review/);
});

// ------------------------------------------------- what a brief may not say

test('what the initiative needs from you is computed, not summarised', () => {
  // The blocker text is rendered above the brief. A brief that restated it
  // could soften it; this asserts the computed row is the one on the page.
  const dir = scratch({
    stage: 'building',
    todo: [{
      id: 'reviewers', title: 'Record practitioner findings', state: 'blocked',
      value: 'high', effort: 'medium',
      blocked_by: 'data:reviewer roles and invitation addresses'
    }]
  }, { 'brief.md': BRIEF });

  const out = run(['page', 'healthy'], dir);
  assert.match(out, /Needs from you/);
  assert.match(out, /reviewer roles and invitation addresses/);
  assert.match(out, /Record practitioner findings/);
});

test('a blocker that clears on its own is scheduled, not asked of you', () => {
  const dir = scratch({
    stage: 'building',
    todo: [{
      id: 'wait', title: 'Await the upstream release', state: 'blocked',
      value: 'low', effort: 'small', blocked_by: 'upstream:library 2.0'
    }]
  });
  const out = run(['page', 'healthy'], dir);
  const needs = out.indexOf('Needs from you');
  const scheduled = out.indexOf('Scheduled');
  assert.ok(needs > -1 && scheduled > needs);
  assert.match(out.slice(needs, scheduled), /Nothing\./, 'an upstream blocker is not yours');
  assert.match(out.slice(scheduled), /clears on its own/);
});

// --------------------------------------------------------------- the stamp

test('record refuses an initiative with no brief written yet', () => {
  const dir = scratch({ stage: 'building' });
  assert.match(runFailing(['brief', 'healthy', 'record'], dir).stderr,
    /no brief\.md to record - write it first/);
});

test('a brief outside a repository reports unknown rather than current', () => {
  // The fixtures live outside git's view of an initiative directory, so the
  // digest cannot be computed - which must never read as "nothing changed".
  const dir = scratch({ stage: 'building', brief: { digest: 'made-up' } }, { 'brief.md': BRIEF });
  const state = JSON.parse(run(['brief', 'healthy', '--json'], dir));
  assert.equal(state.present, true);
  assert.equal(state.status, 'unknown');
});

// ------------------------------------------ the real repository's own state

test('the digest ignores the brief itself', async () => {
  const { initiativeDigest } = await import('../scripts/initiatives.mjs');
  const before = initiativeDigest('repo-guide');
  assert.ok(before, 'the real repository can be digested');

  // Writing a brief must not invalidate the stamp it is about to be given.
  const path = join(ROOT, 'initiatives', 'repo-guide', 'brief.md');
  writeFileSync(path, BRIEF);
  try {
    assert.equal(initiativeDigest('repo-guide'), before,
      'an uncommitted brief does not move the digest');
  } finally {
    rmSync(path, { force: true });
  }
});

/**
 * The digest reads `HEAD`, so the only way to ask what a *commit* does to it is
 * to make one. A detached worktree gives somewhere to commit that the real
 * checkout never sees, and the script is copied in from the working tree so the
 * version under test is the one being edited rather than the one at HEAD.
 */
function committedDigest(edit) {
  const dir = mkdtempSync(join(tmpdir(), 'initiative-digest-'));
  const tree = join(dir, 'tree');
  execFileSync('git', ['worktree', 'add', '--detach', '-q', tree, 'HEAD'], { cwd: ROOT });
  try {
    cpSync(SCRIPT, join(tree, 'scripts', 'initiatives.mjs'));
    const record = join(tree, 'initiatives', 'repo-guide', 'initiative.json');
    const data = JSON.parse(readFileSync(record, 'utf8'));
    edit(data);
    writeFileSync(record, `${JSON.stringify(data, null, 2)}\n`);
    execFileSync('git', ['add', '-A'], { cwd: tree });
    execFileSync('git', [
      '-c', 'user.name=test', '-c', 'user.email=test@example.com',
      // --allow-empty so the baseline call, which edits nothing, still makes a
      // commit once this file matches HEAD.
      'commit', '-q', '--allow-empty', '-m', 'digest fixture'
    ], { cwd: tree });
    return execFileSync('node', [
      '-e',
      "import('./scripts/initiatives.mjs').then((m) => "
        + "process.stdout.write(String(m.initiativeDigest('repo-guide'))))"
    ], { cwd: tree, encoding: 'utf8' }).trim();
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', tree], { cwd: ROOT });
    rmSync(dir, { recursive: true, force: true });
  }
}

test('committing the stamp does not make the brief it stamps stale', () => {
  // The bug this covers: `recordBrief` writes `brief` into initiative.json, so
  // hashing that file by its blob meant every brief went stale the moment its
  // own stamp was committed - and the next sweep rewrote a brief that was
  // already correct.
  const unstamped = committedDigest(() => {});
  const stamped = committedDigest((data) => {
    data.brief = {
      generated_at: '2026-01-01T00:00:00Z',
      commit: '0'.repeat(40),
      digest: 'whatever the stamp says'
    };
  });
  assert.equal(stamped, unstamped, 'the stamp is not part of what it stamps');
});

test('the digest still moves when the record itself changes', () => {
  // Holding the stamp out must not hold the rest of initiative.json out with
  // it: a new todo item or a stage change is exactly what a brief is for.
  const unchanged = committedDigest(() => {});
  const retodoed = committedDigest((data) => {
    data.todo = [...(data.todo || []), {
      id: 'digest-fixture',
      title: 'Something a brief would have to mention',
      status: 'actionable'
    }];
  });
  assert.notEqual(retodoed, unchanged, 'a changed todo list moves the digest');
});
