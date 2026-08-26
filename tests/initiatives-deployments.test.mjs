/**
 * The two-Site arrangement: an initiative's test Site, its production Site, and
 * the rules that keep a routine test deploy from ever writing production.
 *
 * Run with `node --test tests/initiatives-sites.test.mjs`, or via
 * `scripts/build_tests.sh`.
 *
 * `record` mutates initiative.json, so those tests work on a throwaway copy of
 * the fixtures. `sites.source` is always a real repository path, because that
 * is what the deploy skills hand to ChatGPT Sites - `tests/fixtures/site` is a
 * static directory that exists for exactly this and is never deployed.
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
const SITE = 'tests/fixtures/site';

function run(args, initiativesDir) {
  return execFileSync('node', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, INITIATIVES_DIR: initiativesDir }
  });
}

/** Run a command expected to fail; return its exit status and stderr. */
function runFailing(args, initiativesDir) {
  try {
    run(args, initiativesDir);
  } catch (err) {
    return { status: err.status, stderr: String(err.stderr || ''), stdout: String(err.stdout || '') };
  }
  throw new Error(`expected \`${args.join(' ')}\` to exit non-zero`);
}

/** A throwaway copy of the fixtures, with a `sites` block on `healthy`. */
function scratch(sites = { source: SITE }) {
  const dir = mkdtempSync(join(tmpdir(), 'initiative-sites-'));
  cpSync(FIXTURES, dir, { recursive: true });
  const path = join(dir, 'healthy', 'initiative.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (sites) data.sites = sites;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  return dir;
}

// ------------------------------------------------------------- validation

test('a source directory and nothing else is a valid sites block', () => {
  const out = run(['validate'], scratch());
  assert.match(out, /INITIATIVE PASS/);
});

test('a full pair validates', () => {
  const out = run(['validate'], scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' },
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', access: 'public' }
  }));
  assert.match(out, /INITIATIVE PASS/);
});

test('sites needs a source directory', () => {
  const { stderr } = runFailing(['validate'], scratch({
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/' }
  }));
  assert.match(stderr, /needs a "source" directory/);
});

test('a source without index.html is refused', () => {
  const { stderr } = runFailing(['validate'], scratch({ source: 'tests/fixtures/site-no-index' }));
  assert.match(stderr, /has no index\.html/);
});

test('a source outside the repository is refused', () => {
  const { stderr } = runFailing(['validate'], scratch({ source: '../../etc' }));
  assert.match(stderr, /escapes the repo/);
});

test('the two environments may not be the same Site', () => {
  const { stderr } = runFailing(['validate'], scratch({
    source: SITE,
    test: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' },
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
  }));
  assert.match(stderr, /a test deploy would overwrite production/);
});

test('an environment needs both a slug and an https url', () => {
  const { stderr } = runFailing(['validate'], scratch({
    source: SITE,
    test: { slug: 'healthy-test' },
    prod: { url: 'http://healthy.example.chatgpt.site/' }
  }));
  assert.match(stderr, /sites\.test has no url/);
  assert.match(stderr, /sites\.prod has no slug/);
  assert.match(stderr, /is not an https URL/);
});

test('a misspelled key is an error rather than silently ignored', () => {
  const { stderr } = runFailing(['validate'], scratch({ source: SITE, staging: {} }));
  assert.match(stderr, /unknown sites key "staging"/);
});

test('a test Site named like the initiative warns without failing', () => {
  const out = run(['validate'], scratch({
    source: SITE,
    test: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
  }));
  assert.match(out, /INITIATIVE WARN: healthy: test Site slug .* reads like production/);
  assert.match(out, /INITIATIVE PASS/);
});

// ------------------------------------------------------------------- plan

test('an initiative with no sites block cannot be deployed', () => {
  const { stderr } = runFailing(['sites', 'healthy', 'plan', '--env', 'test'], scratch(null));
  assert.match(stderr, /no "sites" block/);
});

test('a first test deploy is a new private Site named <slug>-test', () => {
  const plan = JSON.parse(run(['sites', 'healthy', 'plan', '--env', 'test', '--json'], scratch()));

  assert.equal(plan.mode, 'new');
  assert.equal(plan.site_slug, 'healthy-test');
  assert.equal(plan.access, 'private');
  assert.equal(plan.source, SITE);
  assert.ok(plan.source_files >= 2, 'counts the files it would publish');
  assert.equal(plan.ready, true);
});

test('a first release is a new Site named for the initiative, with no assumed access', () => {
  const plan = JSON.parse(run(['sites', 'healthy', 'plan', '--env', 'prod', '--json'], scratch()));

  assert.equal(plan.mode, 'new');
  assert.equal(plan.site_slug, 'healthy');
  assert.equal(plan.access, null, 'public access is never inferred');
});

test('a recorded environment makes the next deploy a replacement', () => {
  const plan = JSON.parse(run(['sites', 'healthy', 'plan', '--env', 'test', '--json'], scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' }
  })));

  assert.equal(plan.mode, 'replacement');
  assert.equal(plan.site_url, 'https://healthy-test.example.chatgpt.site/');
});

test('every plan carries both environment URLs', () => {
  const dir = scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/' },
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
  });

  for (const env of ['test', 'prod']) {
    const plan = JSON.parse(run(['sites', 'healthy', 'plan', '--env', env, '--json'], dir));
    assert.equal(plan.urls.test, 'https://healthy-test.example.chatgpt.site/');
    assert.equal(plan.urls.prod, 'https://healthy.example.chatgpt.site/');
  }
});

test('an unknown environment is refused', () => {
  const { stderr } = runFailing(['sites', 'healthy', 'plan', '--env', 'staging'], scratch());
  assert.match(stderr, /unknown environment "staging"/);
});

// ----------------------------------------------------------- release gate

test('an uncommitted source blocks a release but not a test deploy', () => {
  const dir = scratch();
  const stray = join(ROOT, SITE, 'uncommitted-fixture.txt');
  writeFileSync(stray, 'written by the sites test\n');
  try {
    const blocked = runFailing(['sites', 'healthy', 'plan', '--env', 'prod'], dir);
    assert.equal(blocked.status, 1, 'the gate is an exit code, not a suggestion');
    assert.match(blocked.stdout, /BLOCKED: \d+ uncommitted change\(s\)/);

    // The test Site exists precisely to look at work that is not committed yet.
    const plan = JSON.parse(run(['sites', 'healthy', 'plan', '--env', 'test', '--json'], dir));
    assert.equal(plan.ready, true);
    assert.deepEqual(plan.blockers, []);
  } finally {
    rmSync(stray, { force: true });
  }
});

test('a committed source is releasable and reports the commit it would release', () => {
  const plan = JSON.parse(run(['sites', 'healthy', 'plan', '--env', 'prod', '--json'], scratch()));

  assert.equal(plan.ready, true);
  assert.deepEqual(plan.blockers, []);
  assert.match(plan.source_commit || '', /^[0-9a-f]{40}$/, 'the commit the release would record');
});

// ----------------------------------------------------------------- record

test('recording a deployment stamps the environment and returns both URLs', () => {
  const dir = scratch();
  const result = JSON.parse(run([
    'sites', 'healthy', 'record', '--env', 'test',
    '--site-slug', 'healthy-test', '--url', 'https://healthy-test.example.chatgpt.site/',
    '--access', 'private', '--version', '3', '--json'
  ], dir));

  assert.equal(result.entry.slug, 'healthy-test');
  assert.equal(result.entry.access, 'private');
  assert.equal(result.entry.version, 3);
  assert.match(result.entry.deployed_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(result.urls.test, 'https://healthy-test.example.chatgpt.site/');
  assert.equal(result.urls.prod, null, 'both keys are always present');

  const saved = JSON.parse(readFileSync(join(dir, 'healthy', 'initiative.json'), 'utf8'));
  assert.equal(saved.sites.test.url, 'https://healthy-test.example.chatgpt.site/');
  assert.match(saved.sites.test.commit, /^[0-9a-f]{40}$/);
});

test('a release cannot be recorded onto the test Site', () => {
  const dir = scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' }
  });
  const { stderr } = runFailing([
    'sites', 'healthy', 'record', '--env', 'prod',
    '--site-slug', 'healthy-test', '--url', 'https://healthy-test.example.chatgpt.site/',
    '--access', 'public'
  ], dir);

  assert.match(stderr, /would point both environments at one Site/);
});

test('recording refuses a non-https URL and an unknown access level', () => {
  const dir = scratch();
  assert.match(runFailing([
    'sites', 'healthy', 'record', '--env', 'test',
    '--site-slug', 'healthy-test', '--url', 'http://healthy-test.example.chatgpt.site/'
  ], dir).stderr, /not an https URL/);

  assert.match(runFailing([
    'sites', 'healthy', 'record', '--env', 'test',
    '--site-slug', 'healthy-test', '--url', 'https://healthy-test.example.chatgpt.site/',
    '--access', 'shared'
  ], dir).stderr, /access must be one of/);
});

// ------------------------------------------------------------- displaying

test('an initiative without a Site says so rather than failing', () => {
  const out = run(['sites', 'healthy'], scratch(null));
  assert.match(out, /no ChatGPT Site/);
});

test('the plain listing shows both environments, deployed or not', () => {
  const out = run(['sites', 'healthy'], scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' }
  }));

  assert.match(out, /test\s+https:\/\/healthy-test\.example\.chatgpt\.site\//);
  assert.match(out, /prod\s+not deployed yet/);
});

test('the overview page shows both environments', () => {
  const page = run(['page', 'healthy'], scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' },
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', access: 'public', version: 2 }
  }));

  assert.match(page, /initiative-sites/);
  assert.match(page, /Test — <a href="https:\/\/healthy-test\.example\.chatgpt\.site\/"/);
  assert.match(page, /Production — <a href="https:\/\/healthy\.example\.chatgpt\.site\/"/);
  assert.match(page, /version 2/);
});

test('an initiative with only a test Site still shows a production row', () => {
  const page = run(['page', 'healthy'], scratch({
    source: SITE,
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/' }
  }));

  assert.match(page, /Production — <em>not released yet<\/em>/);
});
