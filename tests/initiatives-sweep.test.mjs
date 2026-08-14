/**
 * The deterministic parts of a sweep run: selecting work, recording it done,
 * and the write-scope check.
 *
 * Run with `node --test tests/initiatives-sweep.test.mjs`, or via
 * `scripts/build_tests.sh`.
 *
 * `complete` mutates files, so those tests copy the fixtures into a temporary
 * directory first. Nothing here touches the real `initiatives/`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

test('writes a dated log entry', () => {
  const dir = scratch();
  run(['complete', 'healthy', 'obj', '--note', 'Drafted the objectives.'], dir);

  const log = readFileSync(join(dir, 'healthy', 'log.md'), 'utf8');
  assert.match(log, /^# Log/);
  assert.match(log, /Drafted the objectives\./);
  assert.match(log, /\d{4}-\d{2}-\d{2}/);
});

test('advances the stage only when told to', () => {
  const dir = scratch();
  const path = join(dir, 'healthy', 'initiative.json');

  const output = run(['complete', 'healthy', 'obj'], dir);
  assert.match(output, /warning: this item advances the stage/);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).stage, 'wish',
    'the stage must not move on its own');

  const dir2 = scratch();
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
  data.outputs = [{ kind: 'demo', path: 'demos/migration_map', status: 'published' }];
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

  const output = run(
    ['check-scope', 'healthy', '--files', 'demos/migration_map/index.html'],
    dir
  );
  assert.match(output, /within scope/);
});
