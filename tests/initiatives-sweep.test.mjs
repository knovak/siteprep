/**
 * The deterministic parts of a sweep run: selecting work, choosing which
 * questions to propose an answer to, recording an item done, and the
 * write-scope check.
 *
 * Run with `node --test tests/initiatives-sweep.test.mjs`, or via
 * `scripts/build_tests.sh`.
 *
 * `complete` mutates files, so those tests copy the fixtures into a temporary
 * directory first. Nothing here touches the real `initiatives/`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'initiatives.mjs');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'initiatives');

function run(args, initiativesDir = FIXTURES) {
  return execFileSync('node', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, INITIATIVES_DIR: initiativesDir }
  });
}

/** A throwaway copy of the fixtures, optionally with a patched sweep.json. */
function scratch(configPatch = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'initiatives-'));
  cpSync(FIXTURES, dir, { recursive: true });
  const configPath = join(dir, 'sweep.json');
  const config = { ...JSON.parse(readFileSync(configPath, 'utf8')), ...configPatch };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return dir;
}

// ------------------------------------------------------------------ select

test('selects nothing while the work phase is switched off', () => {
  const dir = scratch({ phases: ['survey'] });
  const selection = JSON.parse(run(['select', '--json'], dir));

  assert.equal(selection.selected.length, 0);
  assert.match(selection.stop, /does not enable the "work" phase/);
});

test('ranks a stage-advancing item above an ordinary one', () => {
  const dir = scratch({ phases: ['survey', 'work'], items_per_run: 4 });
  const selection = JSON.parse(run(['select', '--json'], dir));

  const ids = selection.selected.map((s) => `${s.slug}/${s.item}`);
  assert.ok(ids.includes('needs-decision/spec'), 'the only actionable item in needs-decision');
  assert.ok(ids.includes('healthy/obj'));

  const advancing = selection.selected.filter((s) => s.advancesStage);
  assert.ok(advancing.length > 0, 'stage-advancing items should be selected');
  assert.equal(selection.selected[0].advancesStage, true,
    'a stage gate should outrank items that do not advance the lifecycle');
});

test('never picks an item that already has an open sweep PR', () => {
  const dir = scratch({ phases: ['survey', 'work'], items_per_run: 4 });
  const selection = JSON.parse(
    run(['select', '--json', '--claimed', 'sweep/healthy/obj'], dir)
  );

  const ids = selection.selected.map((s) => `${s.slug}/${s.item}`);
  assert.ok(!ids.includes('healthy/obj'), 'claimed work must not be started twice');
  assert.ok(
    selection.skipped.some((s) => s.item === 'obj' && /open sweep PR/.test(s.reason))
  );
});

test('honours items_per_run and the per-initiative cap', () => {
  const dir = scratch({ phases: ['survey', 'work'], items_per_run: 1 });
  const selection = JSON.parse(run(['select', '--json'], dir));

  assert.equal(selection.selected.length, 1, 'budget of 1 means one item');
  assert.ok(selection.skipped.some((s) => /budget/.test(s.reason)));
});

test('stops entirely once max_open_prs is reached', () => {
  const dir = scratch({ phases: ['survey', 'work'], max_open_prs: 2 });
  const selection = JSON.parse(run(['select', '--json', '--open-prs', '2'], dir));

  assert.equal(selection.selected.length, 0);
  assert.match(selection.stop, /max_open_prs/);
});

test('drops items whose effort exceeds max_effort', () => {
  const dir = scratch({ phases: ['survey', 'work'], max_effort: 'small' });
  const initiative = join(dir, 'healthy', 'initiative.json');
  const data = JSON.parse(readFileSync(initiative, 'utf8'));
  data.todo[0].effort = 'large';
  writeFileSync(initiative, `${JSON.stringify(data, null, 2)}\n`);

  const selection = JSON.parse(run(['select', '--json'], dir));
  assert.ok(!selection.selected.some((s) => s.slug === 'healthy'));
  assert.ok(selection.skipped.some((s) => /max_effort/.test(s.reason)));
});

test('leaves budget for later phases when earlier ones have spent some', () => {
  const dir = scratch({ phases: ['survey', 'work'], items_per_run: 4 });
  const selection = JSON.parse(run(['select', '--json', '--spent', '3'], dir));

  assert.equal(selection.selected.length, 1, 'three of four already spent leaves one');

  const spent = JSON.parse(run(['select', '--json', '--spent', '4'], dir));
  assert.equal(spent.selected.length, 0);
  assert.match(spent.stop, /budget of 4 item\(s\) is already spent/);
});

// ----------------------------------------------------------------- propose

test('proposes nothing while the propose phase is switched off', () => {
  const dir = scratch({ phases: ['survey', 'work'] });
  const proposals = JSON.parse(run(['propose', '--json'], dir));

  assert.equal(proposals.selected.length, 0);
  assert.match(proposals.stop, /does not enable the "propose" phase/);
});

test('proposes an answer to a judgement call, and never to one needing authority', () => {
  const dir = scratch({ phases: ['survey', 'propose', 'work'] });
  const proposals = JSON.parse(run(['propose', '--json'], dir));

  const ids = proposals.selected.map((p) => `${p.slug}/${p.item}`);
  assert.deepEqual(ids, ['needs-decision/pick'], 'only the human: blocker is proposable');
  assert.equal(proposals.selected[0].question, 'SQLite or Postgres?');

  // permission:, cost: and legal: need consent and data: needs a fact only the
  // user has, so a proposal for one would be a fabrication. All of them are
  // still reported, rather than silently dropped.
  const refused = proposals.notProposable.map((p) => p.blocker);
  assert.deepEqual(refused, ['permission:AWS deploy role', 'data:which senders count?']);
  assert.ok(!ids.includes('needs-decision/deploy'));
  assert.ok(!ids.includes('needs-decision/harvest'));
});

test('names a proposal branch so it cannot collide with the work branch', () => {
  const dir = scratch({ phases: ['survey', 'propose'] });
  const proposals = JSON.parse(run(['propose', '--json'], dir));

  assert.equal(proposals.selected[0].branch, 'sweep/needs-decision/propose-pick');
});

test('never opens a second proposal for a question that already has one', () => {
  const dir = scratch({ phases: ['survey', 'propose'] });
  const proposals = JSON.parse(
    run(['propose', '--json', '--claimed', 'sweep/needs-decision/propose-pick'], dir)
  );

  assert.equal(proposals.selected.length, 0);
  assert.ok(proposals.skipped.some((s) => /open proposal PR/.test(s.reason)));
});

test('proposals come out of the same budget as new work', () => {
  const dir = scratch({ phases: ['survey', 'propose'], items_per_run: 1 });
  const proposals = JSON.parse(run(['propose', '--json', '--spent', '1'], dir));

  assert.equal(proposals.selected.length, 0);
  assert.match(proposals.stop, /already spent/);
});

test('a large item is still worth a proposal, since answering is not doing', () => {
  const dir = scratch({ phases: ['survey', 'propose'], max_effort: 'small' });
  const path = join(dir, 'needs-decision', 'initiative.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.todo.find((i) => i.id === 'pick').effort = 'large';
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

  const proposals = JSON.parse(run(['propose', '--json'], dir));
  assert.deepEqual(proposals.selected.map((p) => p.item), ['pick']);
});

// ---------------------------------------------------------------- complete

test('removing an item unblocks whatever was waiting on it', () => {
  const dir = scratch();
  const path = join(dir, 'needs-decision', 'initiative.json');
  const before = JSON.parse(readFileSync(path, 'utf8'));
  before.todo.push({
    id: 'after', title: 'Follows the spec', state: 'blocked',
    blocked_by: 'todo:spec', value: 'high', effort: 'small'
  });
  writeFileSync(path, `${JSON.stringify(before, null, 2)}\n`);

  run(['complete', 'needs-decision', 'spec', '--note', 'Done.'], dir);

  const after = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(!after.todo.some((i) => i.id === 'spec'), 'the completed item is gone');

  const dependent = after.todo.find((i) => i.id === 'after');
  assert.equal(dependent.state, 'actionable');
  assert.equal(dependent.blocked_by, undefined, 'a cleared blocker must not linger');
});

/** `healthy` has a single item, so completing it needs a successor seeded. */
function withSuccessor(dir) {
  run(['add', 'healthy', 'spec', '--title', 'Write the spec', '--effort', 'small'], dir);
  return dir;
}

test('writes a dated log entry', () => {
  const dir = withSuccessor(scratch());
  run(['complete', 'healthy', 'obj', '--note', 'Drafted the objectives.'], dir);

  const log = readFileSync(join(dir, 'healthy', 'log.md'), 'utf8');
  assert.match(log, /^# Log/);
  assert.match(log, /Drafted the objectives\./);
  assert.match(log, /\d{4}-\d{2}-\d{2}/);
});

test('advances the stage only when told to', () => {
  const dir = withSuccessor(scratch());
  const path = join(dir, 'healthy', 'initiative.json');

  const output = run(['complete', 'healthy', 'obj'], dir);
  assert.match(output, /warning: this item advances the stage/);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).stage, 'wish',
    'the stage must not move on its own');

  const dir2 = withSuccessor(scratch());
  run(['complete', 'healthy', 'obj', '--stage', 'shaped'], dir2);
  assert.equal(
    JSON.parse(readFileSync(join(dir2, 'healthy', 'initiative.json'), 'utf8')).stage,
    'shaped'
  );
});

test('refuses an unknown item rather than doing nothing quietly', () => {
  const dir = scratch();
  assert.throws(() => run(['complete', 'healthy', 'no-such-item'], dir));
});

// ------------------------------------------------- never leave nothing to do

test('refuses to leave a live initiative with an empty todo list', () => {
  const dir = scratch();
  const path = join(dir, 'healthy', 'initiative.json');

  assert.throws(
    () => run(['complete', 'healthy', 'obj', '--stage', 'shaped'], dir),
    /would leave nothing to do/
  );
  const after = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(after.todo.length, 1, 'a refused completion must not half-apply');
  assert.equal(after.stage, 'wish', 'nor move the stage');
});

test('the refusal names both ways out', () => {
  const dir = scratch();
  try {
    run(['complete', 'healthy', 'obj'], dir);
    assert.fail('expected the guard to refuse');
  } catch (err) {
    const message = String(err.stderr || err.message);
    assert.match(message, /initiatives\.mjs add healthy/, 'seed what comes next');
    assert.match(message, /--stage dormant/, 'or declare it finished');
  }
});

test('declaring it dormant is how an initiative is allowed to run out', () => {
  const dir = scratch();
  run(['complete', 'healthy', 'obj', '--stage', 'dormant'], dir);

  const after = JSON.parse(readFileSync(join(dir, 'healthy', 'initiative.json'), 'utf8'));
  assert.equal(after.stage, 'dormant');
  assert.equal(after.todo.length, 0, 'a dormant initiative may have nothing to do');
});

test('entering refining seeds the readme and the improvements item', () => {
  const dir = scratch();
  const output = run(
    ['complete', 'needs-decision', 'spec', '--stage', 'refining', '--note', 'Shipped.'],
    dir
  );
  assert.match(output, /seeded/);

  const after = JSON.parse(
    readFileSync(join(dir, 'needs-decision', 'initiative.json'), 'utf8')
  );
  const readme = after.todo.find((i) => i.id === 'refining-readme');
  const improvements = after.todo.find((i) => i.id === 'refining-improvements');

  assert.ok(readme, 'a graduated output needs a way in for someone who did not build it');
  assert.match(readme.title, /how to use it and how to deploy it/);
  assert.equal(readme.state, 'actionable');

  assert.ok(improvements, 'and standing pressure to keep getting better');
  assert.equal(improvements.state, 'actionable');
  assert.equal(improvements.advances_stage, false);
});

test('re-entering refining does not seed the entry items twice', () => {
  const dir = scratch();
  run(['complete', 'needs-decision', 'spec', '--stage', 'refining'], dir);
  run(['add', 'needs-decision', 'more', '--title', 'Something else'], dir);
  run(['complete', 'needs-decision', 'refining-readme', '--stage', 'refining'], dir);

  const after = JSON.parse(
    readFileSync(join(dir, 'needs-decision', 'initiative.json'), 'utf8')
  );
  const seeded = after.todo.filter((i) => i.id === 'refining-improvements');
  assert.equal(seeded.length, 1, 'the seed is for entering refining, not for being in it');
});

// --------------------------------------------------------------------- add

test('adds an actionable item the sweep can then rank', () => {
  const dir = scratch({ phases: ['survey', 'work'] });
  run(['add', 'idle-one', 'first', '--title', 'Get going', '--value', 'high',
    '--effort', 'small', '--advances-stage'], dir);

  const after = JSON.parse(readFileSync(join(dir, 'idle-one', 'initiative.json'), 'utf8'));
  const item = after.todo.find((i) => i.id === 'first');
  assert.equal(item.title, 'Get going');
  assert.equal(item.state, 'actionable');
  assert.equal(item.value, 'high');
  assert.equal(item.effort, 'small');
  assert.equal(item.advances_stage, true);

  const selection = JSON.parse(
    run(['select', '--json'], dir)
  );
  assert.ok(
    selection.selected.some((s) => s.item === 'first'),
    'an added item is indistinguishable from one written by hand'
  );
});

test('adds a blocked item, which is how a question gets recorded', () => {
  const dir = scratch();
  run(['add', 'idle-one', 'ask', '--title', 'Ask about the host',
    '--blocked-by', 'human:where should this run?'], dir);

  const after = JSON.parse(readFileSync(join(dir, 'idle-one', 'initiative.json'), 'utf8'));
  const item = after.todo.find((i) => i.id === 'ask');
  assert.equal(item.state, 'blocked');
  assert.equal(item.blocked_by, 'human:where should this run?');
});

test('refuses a duplicate id, an unknown blocker, and a dangling todo reference', () => {
  const dir = scratch();
  assert.throws(
    () => run(['add', 'healthy', 'obj', '--title', 'Again'], dir),
    /already exists/
  );
  assert.throws(
    () => run(['add', 'healthy', 'x', '--title', 'X', '--blocked-by', 'weather:rain'], dir),
    /unknown blocker prefix/
  );
  assert.throws(
    () => run(['add', 'healthy', 'y', '--title', 'Y', '--blocked-by', 'todo:nope'], dir),
    /does not exist/
  );
});

test('refuses an item with no title, which would be unrankable and unreadable', () => {
  const dir = scratch();
  assert.throws(() => run(['add', 'healthy', 'untitled'], dir));
});

// ----------------------------------------------------------- automerge

/** `automerge` exits non-zero for "do not merge this", so stdout is read either way. */
function askMerge(args, initiativesDir) {
  const result = spawnSync('node', [SCRIPT, 'automerge', ...args, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, INITIATIVES_DIR: initiativesDir }
  });
  return { status: result.status, answer: JSON.parse(result.stdout) };
}

const MERGING = { phases: ['survey', 'merge'] };
/** Every stage a policy is allowed to name - the resting two are refused by validation. */
const EVERY_STAGE = ['wish', 'shaped', 'specified', 'planned', 'building', 'refining'];
/** Comfortably past any holding window the tests configure. */
const LONG_AGO = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString();

test('nothing merges while the merge phase is switched off', () => {
  const dir = scratch({ phases: ['survey', 'work'] });
  const { status, answer } = askMerge(
    ['sweep/idle-one/step', '--opened-at', LONG_AGO()], dir
  );

  assert.equal(answer.eligible, false);
  assert.equal(status, 1);
  assert.match(answer.blockers.join(' '), /does not enable the "merge" phase/);
});

test('a work branch merges at a stage the policy covers', () => {
  const dir = scratch(MERGING);
  const { status, answer } = askMerge(
    ['sweep/idle-one/step', '--opened-at', LONG_AGO()], dir
  );

  assert.equal(answer.eligible, true, 'idle-one is building, which is in the default stages');
  assert.equal(status, 0);
  assert.equal(answer.kind, 'work');
  assert.deepEqual(answer.blockers, []);
});

/**
 * The stages dial is the whole request behind this phase: a pull request that
 * writes the objectives, the spec or the plan is where the user's judgement is
 * the point, so it waits for them however green it is.
 */
test('an early-stage initiative is left for the user to merge', () => {
  const dir = scratch(MERGING);
  const { answer } = askMerge(['sweep/healthy/obj', '--opened-at', LONG_AGO()], dir);

  assert.equal(answer.eligible, false, 'healthy is at wish');
  assert.match(answer.blockers.join(' '), /stage "wish".*is not in auto_merge\.stages/);
});

test('the covered stages are configuration, not a constant', () => {
  const dir = scratch({ ...MERGING, auto_merge: { stages: ['wish'], min_age_minutes: 0 } });
  const { answer } = askMerge(['sweep/healthy/obj'], dir);

  assert.equal(answer.eligible, true, 'a config naming wish covers healthy');
  assert.deepEqual(answer.policy.stages, ['wish']);
});

/**
 * A proposal *is* the question, put as a pull request. Merging it is what
 * answers a `human:` blocker, so no stage and no config may do it.
 */
test('a proposal never merges unattended, whatever the stage', () => {
  const dir = scratch({ ...MERGING, auto_merge: { stages: EVERY_STAGE, min_age_minutes: 0 } });
  const { answer } = askMerge(['sweep/idle-one/propose-pick'], dir);

  assert.equal(answer.eligible, false);
  assert.equal(answer.kind, 'propose');
  assert.match(answer.blockers.join(' '), /only a person merges one/);
});

test('a pull request is held for the configured window', () => {
  const dir = scratch(MERGING);
  const justNow = new Date(Date.now() - 60 * 1000).toISOString();
  const { answer } = askMerge(['sweep/idle-one/step', '--opened-at', justNow], dir);

  assert.equal(answer.eligible, false);
  assert.ok(answer.wait_minutes >= 13, `still holding, ${answer.wait_minutes} minute(s) to go`);
  assert.match(answer.blockers.join(' '), /holds it for 15/);
});

test('a window of zero needs no opening time at all', () => {
  const dir = scratch({ ...MERGING, auto_merge: { min_age_minutes: 0 } });
  const { answer } = askMerge(['sweep/idle-one/step'], dir);

  assert.equal(answer.eligible, true);
});

test('a branch outside the sweep namespace is not the sweep\'s to merge', () => {
  const dir = scratch(MERGING);
  const { answer } = askMerge(['feature/something', '--opened-at', LONG_AGO()], dir);

  assert.equal(answer.eligible, false);
  assert.match(answer.blockers.join(' '), /only the sweep's own work merges unattended/);
});

test('the summary says which initiatives the policy covers', () => {
  const dir = scratch(MERGING);
  const result = spawnSync('node', [SCRIPT, 'automerge', '--json'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, INITIATIVES_DIR: dir }
  });
  const summary = JSON.parse(result.stdout);

  assert.equal(summary.enabled, true);
  assert.equal(summary.min_age_minutes, 15);
  const covered = Object.fromEntries(summary.initiatives.map((i) => [i.slug, i.covered]));
  assert.equal(covered['idle-one'], true, 'building');
  assert.equal(covered['needs-decision'], true, 'planned');
  assert.equal(covered.healthy, false, 'wish');
});

test('a malformed auto_merge block fails validation', () => {
  const dir = scratch({ ...MERGING, auto_merge: { stages: ['bulding'], hold: 5 } });
  const result = spawnSync('node', [SCRIPT, 'validate'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, INITIATIVES_DIR: dir }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown stage "bulding"/);
  assert.match(result.stderr, /unknown key "hold"/);
});

test('a resting stage may not be configured for unattended merges', () => {
  const dir = scratch({ ...MERGING, auto_merge: { stages: ['building', 'dormant'] } });
  const result = spawnSync('node', [SCRIPT, 'validate'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, INITIATIVES_DIR: dir }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /may not include "dormant"/);
});

// ------------------------------------------------------------- check-scope

test('accepts changes inside the initiative', () => {
  const dir = scratch();
  const output = run(
    ['check-scope', 'healthy', '--files', 'initiatives/healthy/spec.md', 'initiatives/healthy/initiative.json'],
    dir
  );
  assert.match(output, /within scope/);
});

test('rejects a change to another initiative', () => {
  const dir = scratch();
  assert.throws(
    () => run(['check-scope', 'healthy', '--files', 'initiatives/idle-one/initiative.json'], dir),
    /outside this initiative|FAIL/
  );
});

test('rejects a change to a protected path', () => {
  const dir = scratch({ protected_paths: ['shared/', 'scripts/', '.github/'] });
  assert.throws(
    () => run(['check-scope', 'healthy', '--files', 'shared/nav_bar/nav_bar.js'], dir),
    /protected|FAIL/
  );
});

test('allows a declared output, which is the point of declaring it', () => {
  const dir = scratch();
  const path = join(dir, 'healthy', 'initiative.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.outputs = [{ kind: 'demo', path: 'demos/world_migration_atlas', status: 'published' }];
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

  const output = run(
    ['check-scope', 'healthy', '--files', 'demos/world_migration_atlas/index.html'],
    dir
  );
  assert.match(output, /within scope/);
});

/**
 * The module is importable, and importing it does not run a command.
 *
 * The repo guide's generator reads these constants rather than keeping a second
 * copy that has to be kept in step (`initiatives/repo-guide/spec.md` §3.3), so
 * two properties have to hold together: the values are exported, and importing
 * the file is side-effect free. Before the export was added the second was
 * false - a bare import fell through the CLI dispatch to `default:` and exited
 * the importing process, which is the kind of failure that looks like a broken
 * generator rather than a module that was never meant to be imported.
 */
test('importing the module exports the vocabulary without running the CLI', async () => {
  const module = await import(SCRIPT);

  assert.ok(Array.isArray(module.STAGES), 'STAGES is exported as an array');
  assert.ok(module.STAGES.includes('specified'), 'the stage list is the real one');
  assert.ok(module.BLOCKER_PREFIXES.includes('human'), 'blocker prefixes are exported');
  assert.ok(module.HUMAN_BLOCKERS.has('cost'), 'the human blocker classes are exported');
  assert.ok(module.PROPOSABLE_BLOCKERS.has('human'), 'the proposable class is exported');
  assert.deepEqual(
    module.STAGE_DOCUMENTS.specified,
    ['objectives.md', 'spec.md'],
    'the stage document map is exported'
  );

  // Reaching this line at all is the side-effect assertion: a dispatching
  // module would have called process.exit(2) during the import above.
  assert.equal(module.PROPOSABLE_BLOCKERS.size, 1);
});

/**
 * The guard is what makes the import above safe, and it is one line that an
 * ordinary refactor could drop while every other test stayed green - the CLI
 * would keep working and only the import would break. So the line itself is
 * pinned, the way BUILD-20 pins build.sh's call to the build tests.
 */
test('the CLI dispatch stays behind the run-as-a-program guard', () => {
  const source = readFileSync(SCRIPT, 'utf8');
  assert.match(
    source,
    /if \(RUN_AS_CLI\) switch \(command\)/,
    'the switch must stay guarded, or importing this module runs a command'
  );
});
