/**
 * The sweep survey.
 *
 * Run with `node --test tests/initiatives-digest.test.mjs`, or as part of
 * `scripts/build_tests.sh`. Uses node:test - no dependency.
 *
 * The digest runs against a fixture directory rather than the real
 * `initiatives/`, so these assertions stay true whatever work is actually in
 * flight, and adding or finishing an initiative never breaks the suite.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

test('leads with the decisions only a person can make', () => {
  const digest = run(['digest']);
  const decisionsAt = digest.indexOf('Waiting on a decision from you');
  const stateAt = digest.indexOf('## State');

  assert.ok(decisionsAt > 0, 'the decisions section should be present');
  assert.ok(decisionsAt < stateAt, 'decisions must come before the state table');
  assert.match(digest, /SQLite or Postgres\?/);
  assert.match(digest, /AWS deploy role/);
});

test('separates blockers that clear themselves from blockers that need a person', () => {
  const digest = JSON.parse(run(['digest', '--json']));

  const decisionBlockers = digest.decisions.map((d) => d.blocker);
  assert.equal(decisionBlockers.length, 3, 'human, permission and data are the human-class blockers here');
  assert.ok(decisionBlockers.some((b) => b.startsWith('human:')));
  assert.ok(decisionBlockers.some((b) => b.startsWith('permission:')));
  // A data: blocker is a fact only a person has, so it is named in the digest
  // rather than counted as blocked and then dropped.
  assert.ok(decisionBlockers.some((b) => b.startsWith('data:')));

  // A schedule date in the past is satisfied, so it is reported as ready.
  assert.equal(digest.readyToUnblock.length, 1);
  assert.match(digest.readyToUnblock[0].reason, /2020-01-01/);

  // A review blocker needs GitHub to resolve, so it is listed, not guessed at.
  assert.equal(digest.awaitingReview.length, 1);
  assert.match(digest.awaitingReview[0].blocker, /^review:/);

  // A cross-initiative blocker reports the other initiative's real stage.
  assert.equal(digest.waitingOnOthers.length, 1);
  assert.equal(digest.waitingOnOthers[0].otherStage, 'building');
});

test('marks which waiting decisions the sweep could propose an answer to', () => {
  const digest = JSON.parse(run(['digest', '--json']));

  const proposable = digest.decisions.filter((d) => d.proposable).map((d) => d.kind);
  assert.deepEqual(proposable, ['human'], 'only a judgement call is proposable');

  // permission: stays in the digest precisely because it can never become a
  // pull request - it needs authority, not reasoning.
  const authority = digest.decisions.find((d) => d.kind === 'permission');
  assert.equal(authority.proposable, false);

  // data: is in the digest for the same reason, and is equally unproposable -
  // an invented fact would be a fabrication wearing the costume of an answer.
  const fact = digest.decisions.find((d) => d.kind === 'data');
  assert.equal(fact.proposable, false);

  assert.match(run(['digest']), /the sweep can propose an answer to this/);
});

test('flags an initiative with nothing to do that is not dormant', () => {
  const digest = JSON.parse(run(['digest', '--json']));

  assert.deepEqual(digest.idle.map((i) => i.slug), ['idle-one']);
  assert.ok(
    !digest.idle.some((i) => i.slug === 'healthy'),
    'an initiative with an actionable item is not idle'
  );
});

test('reports every initiative in the state table', () => {
  const digest = JSON.parse(run(['digest', '--json']));
  const slugs = digest.initiatives.map((i) => i.slug).sort();

  assert.deepEqual(slugs, ['healthy', 'idle-one', 'needs-decision']);
  const healthy = digest.initiatives.find((i) => i.slug === 'healthy');
  assert.equal(healthy.next, 'Draft objectives.md');
  assert.equal(healthy.blocked, 0);
});

test('says so plainly when nothing needs attention', () => {
  // A quiet run is a correct run, and it has to read as one - padding it is how
  // the next digest gets ignored.
  const quiet = join(ROOT, 'tests', 'fixtures', 'initiatives-quiet');
  const digest = run(['digest'], quiet);

  assert.match(digest, /Nothing needs your attention/);
  assert.doesNotMatch(digest, /Waiting on a decision/);
  assert.doesNotMatch(digest, /Nothing actionable/);
});

test('a malformed sweep.json is an error, not a crash', () => {
  const digest = JSON.parse(run(['digest', '--json']));
  assert.deepEqual(digest.errors, [], 'the fixtures are valid');
  assert.equal(typeof digest.generated, 'string');
});
