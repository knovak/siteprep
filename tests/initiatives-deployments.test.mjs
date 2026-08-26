/**
 * How an initiative reaches the world: the deployments list, its kinds, the two
 * environments each kind has, and the rules that keep a routine test deploy
 * from ever writing production.
 *
 * Run with `node --test tests/initiatives-deployments.test.mjs`, or via
 * `scripts/build_tests.sh`.
 *
 * `record` mutates initiative.json, so those tests work on a throwaway copy of
 * the fixtures. A `source` is always a real repository path, because that is
 * what the engines are handed - `tests/fixtures/site`, `site-app` and
 * `demo-source` exist for exactly this and are never deployed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'initiatives.mjs');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'initiatives');
const SITE = 'tests/fixtures/site';
const APP = 'tests/fixtures/site-app';
const DEMO_SOURCE = 'tests/fixtures/demo-source';
// Release history is read from git, so the tests that exercise it need a source
// with more than one commit behind it. The fixture directories were added in a
// single commit; this one has real history and is not going away.
//
// These tests therefore need the repository's real history: in a shallow clone
// (`git clone --depth 1`, or an `actions/checkout` without `fetch-depth: 0`)
// `git log` reports one commit for every path and they fail. That is the
// checkout's problem, not the test's - the build workflow fetches full history
// for the same reason.
const HISTORIED_SOURCE = 'initiatives/repo-guide/work/guide/out';

const staticSite = (extra = {}) => ({ kind: 'chatgpt-site', build: 'static', source: SITE, ...extra });

function run(args, initiativesDir) {
  return execFileSync('node', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, INITIATIVES_DIR: initiativesDir }
  });
}

/** Run a command expected to fail; return its exit status and output. */
function runFailing(args, initiativesDir) {
  try {
    run(args, initiativesDir);
  } catch (err) {
    return { status: err.status, stderr: String(err.stderr || ''), stdout: String(err.stdout || '') };
  }
  throw new Error(`expected \`${args.join(' ')}\` to exit non-zero`);
}

/** A throwaway copy of the fixtures, with `deployments` set on `healthy`. */
function scratch(deployments) {
  const dir = mkdtempSync(join(tmpdir(), 'initiative-deploy-'));
  cpSync(FIXTURES, dir, { recursive: true });
  const path = join(dir, 'healthy', 'initiative.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (deployments !== undefined) data.deployments = deployments;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  return dir;
}

// ------------------------------------------------------------- not deployed

test('an initiative with no deployments is valid and says so', () => {
  const dir = scratch();
  assert.match(run(['validate'], dir), /INITIATIVE PASS/);
  assert.match(run(['deployments', 'healthy'], dir), /not deployed anywhere/);
});

test('an empty deployments list is also just "not deployed"', () => {
  const dir = scratch([]);
  assert.match(run(['validate'], dir), /INITIATIVE PASS/);
  assert.match(run(['deployments', 'healthy'], dir), /not deployed anywhere/);
  assert.match(runFailing(['deployments', 'healthy', 'plan', '--env', 'test'], dir).stderr,
    /not deployed anywhere/);
});

test('the superseded "sites" block is an error, not silently ignored', () => {
  const dir = mkdtempSync(join(tmpdir(), 'initiative-deploy-'));
  cpSync(FIXTURES, dir, { recursive: true });
  const path = join(dir, 'healthy', 'initiative.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.sites = { source: SITE };
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

  assert.match(runFailing(['validate'], dir).stderr, /"sites" was replaced by "deployments"/);
});

// ------------------------------------------------------------- validation

test('a kind and a source are all a deployment needs', () => {
  assert.match(run(['validate'], scratch([staticSite()])), /INITIATIVE PASS/);
});

test('every kind validates in its fully populated form', () => {
  const out = run(['validate'], scratch([
    staticSite({
      test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' },
      prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', access: 'public' }
    }),
    {
      kind: 'demo',
      source: DEMO_SOURCE,
      destination: 'Guide to Initiatives',
      root_html: 'main.html'
    }
  ]));
  assert.match(out, /INITIATIVE PASS/);
});

test('an unknown kind is refused', () => {
  const { stderr } = runFailing(['validate'], scratch([{ kind: 'netlify', source: SITE }]));
  assert.match(stderr, /unknown kind "netlify"/);
});

test('a deployment needs a source', () => {
  const { stderr } = runFailing(['validate'], scratch([{ kind: 'chatgpt-site' }]));
  assert.match(stderr, /needs a "source" directory/);
});

test('a source outside the repository is refused', () => {
  const { stderr } = runFailing(['validate'], scratch([staticSite({ source: '../../etc' })]));
  assert.match(stderr, /escapes the repo/);
});

test('a static Site needs index.html and a sites-app needs package.json', () => {
  assert.match(
    runFailing(['validate'], scratch([staticSite({ source: APP })])).stderr,
    /is a static Site but tests\/fixtures\/site-app has no index\.html/
  );
  assert.match(
    runFailing(['validate'], scratch([{ kind: 'chatgpt-site', build: 'sites-app', source: SITE }])).stderr,
    /is a sites-app but tests\/fixtures\/site has no package\.json/
  );
});

test('a sites-app validates against a project directory', () => {
  const out = run(['validate'], scratch([{ kind: 'chatgpt-site', build: 'sites-app', source: APP }]));
  assert.match(out, /INITIATIVE PASS/);
});

test('a demo needs a destination and a root page that exists', () => {
  assert.match(
    runFailing(['validate'], scratch([{ kind: 'demo', source: DEMO_SOURCE }])).stderr,
    /needs a "destination" folder name/
  );
  assert.match(
    runFailing(['validate'], scratch([{ kind: 'demo', source: DEMO_SOURCE, destination: 'X' }])).stderr,
    /root page does not exist/
  );
  assert.match(
    runFailing(['validate'], scratch([
      { kind: 'demo', source: DEMO_SOURCE, destination: 'a/b', root_html: 'main.html' }
    ])).stderr,
    /destination must be one folder name, not a path/
  );
});

test('the two environments may not be the same Site', () => {
  const { stderr } = runFailing(['validate'], scratch([staticSite({
    test: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' },
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
  })]));
  assert.match(stderr, /a test deploy would overwrite production/);
});

test('an environment needs both a slug and an https url', () => {
  const { stderr } = runFailing(['validate'], scratch([staticSite({
    test: { slug: 'healthy-test' },
    prod: { url: 'http://healthy.example.chatgpt.site/' }
  })]));
  assert.match(stderr, /test has no url/);
  assert.match(stderr, /prod has no slug/);
  assert.match(stderr, /is not an https URL/);
});

test('a misspelled key is an error rather than silently ignored', () => {
  assert.match(
    runFailing(['validate'], scratch([staticSite({ stage: 'x' })])).stderr,
    /unknown key "stage" for a chatgpt-site deployment/
  );
  // `build` belongs to a Site, not to a demo.
  assert.match(
    runFailing(['validate'], scratch([
      { kind: 'demo', source: DEMO_SOURCE, destination: 'X', root_html: 'main.html', build: 'static' }
    ])).stderr,
    /unknown key "build" for a demo deployment/
  );
});

test('a demo cannot record a test environment it does not deploy', () => {
  const { stderr } = runFailing(['validate'], scratch([{
    kind: 'demo',
    source: DEMO_SOURCE,
    destination: 'X',
    root_html: 'main.html',
    test: { url: 'https://example.com/' }
  }]));
  assert.match(stderr, /a demo's test environment is derived rather than deployed/);
});

test('two deployments of one kind are refused', () => {
  const { stderr } = runFailing(['validate'], scratch([staticSite(), staticSite()]));
  assert.match(stderr, /two "chatgpt-site" deployments/);
});

test('a test Site named like the initiative warns without failing', () => {
  const out = run(['validate'], scratch([staticSite({
    test: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
  })]));
  assert.match(out, /INITIATIVE WARN: healthy: test Site slug .* reads like production/);
  assert.match(out, /INITIATIVE PASS/);
});

// ------------------------------------------------------------------- plan

test('a first test deploy is a new private Site named <slug>-test', () => {
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'test', '--json'], scratch([staticSite()])));

  assert.equal(plan.kind, 'chatgpt-site');
  assert.equal(plan.engine, 'deploy-to-chatgpt-sites');
  assert.equal(plan.mode, 'new');
  assert.equal(plan.site_slug, 'healthy-test');
  assert.equal(plan.access, 'private');
  assert.equal(plan.deployable, true);
  assert.ok(plan.source_files >= 2, 'counts the files it would publish');
  assert.equal(plan.ready, true);
});

test('a first release is a new Site named for the initiative, with no assumed access', () => {
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'], scratch([staticSite()])));

  assert.equal(plan.mode, 'new');
  assert.equal(plan.site_slug, 'healthy');
  assert.equal(plan.access, null, 'public access is never inferred');
});

test('a sites-app is planned through the Sites hosting workflow, not the static engine', () => {
  const plan = JSON.parse(run(
    ['deployments', 'healthy', 'plan', '--env', 'test', '--json'],
    scratch([{ kind: 'chatgpt-site', build: 'sites-app', source: APP }])
  ));

  assert.equal(plan.build, 'sites-app');
  assert.equal(plan.engine, 'sites-hosting');
});

test('a demo has a test environment it cannot deploy, and a prod one it can', () => {
  const dir = scratch([{
    kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html'
  }]);

  const test_ = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'test', '--json'], dir));
  assert.equal(test_.engine, 'deploy-demo');
  assert.equal(test_.deployable, false, 'nothing to deploy - the preview comes from the push');
  assert.match(test_.note, /branch preview|straight to production/);

  const prod = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'], dir));
  assert.equal(prod.deployable, true);
});

test("a demo's URLs are derived from its destination, both environments", () => {
  const plan = JSON.parse(run(
    ['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([{ kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html' }])
  ));

  // Spaces are encoded, and prod is the published path with no branch segment.
  assert.match(plan.urls.prod, /\/demos\/Fixture%20Demo\/$/);
  assert.ok(!plan.urls.prod.includes('/branch/'), 'production is never under a branch preview');
  assert.match(plan.urls.test, /\/demos\/Fixture%20Demo\/$/);
});

test('every plan carries both environment URLs', () => {
  const dir = scratch([staticSite({
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/' },
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
  })]);

  for (const env of ['test', 'prod']) {
    const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', env, '--json'], dir));
    assert.equal(plan.urls.test, 'https://healthy-test.example.chatgpt.site/');
    assert.equal(plan.urls.prod, 'https://healthy.example.chatgpt.site/');
  }
});

test('more than one deployment requires naming the kind', () => {
  const dir = scratch([
    staticSite(),
    { kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html' }
  ]);

  assert.match(runFailing(['deployments', 'healthy', 'plan', '--env', 'test'], dir).stderr,
    /name one with --kind \(chatgpt-site, demo\)/);

  const plan = JSON.parse(run(
    ['deployments', 'healthy', 'plan', '--env', 'test', '--kind', 'demo', '--json'], dir));
  assert.equal(plan.kind, 'demo');
});

test('an unknown environment is refused', () => {
  const { stderr } = runFailing(['deployments', 'healthy', 'plan', '--env', 'staging'], scratch([staticSite()]));
  assert.match(stderr, /unknown environment "staging"/);
});

// ----------------------------------------------------------- release gate

test('an uncommitted source blocks a release but not a test deploy', () => {
  const dir = scratch([staticSite()]);
  const stray = join(ROOT, SITE, 'uncommitted-fixture.txt');
  writeFileSync(stray, 'written by the deployments test\n');
  try {
    const blocked = runFailing(['deployments', 'healthy', 'plan', '--env', 'prod'], dir);
    assert.equal(blocked.status, 1, 'the gate is an exit code, not a suggestion');
    assert.match(blocked.stdout, /BLOCKED: \d+ uncommitted change\(s\)/);

    // The test environment exists precisely to look at work that is not committed yet.
    const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'test', '--json'], dir));
    assert.equal(plan.ready, true);
    assert.deepEqual(plan.blockers, []);
  } finally {
    rmSync(stray, { force: true });
  }
});

test('the release gate applies to a demo too', () => {
  const dir = scratch([{
    kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html'
  }]);
  const stray = join(ROOT, DEMO_SOURCE, 'uncommitted-fixture.txt');
  writeFileSync(stray, 'written by the deployments test\n');
  try {
    const blocked = runFailing(['deployments', 'healthy', 'plan', '--env', 'prod'], dir);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stdout, /BLOCKED: \d+ uncommitted change\(s\)/);
  } finally {
    rmSync(stray, { force: true });
  }
});

test('a committed source is releasable and reports the commit it would release', () => {
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'], scratch([staticSite()])));

  assert.equal(plan.ready, true);
  assert.deepEqual(plan.blockers, []);
  assert.match(plan.source_commit || '', /^[0-9a-f]{40}$/, 'the commit the release would record');
});

// ----------------------------------------------------------------- record

test('recording a Site deployment stamps the environment and returns both URLs', () => {
  const dir = scratch([staticSite()]);
  const result = JSON.parse(run([
    'deployments', 'healthy', 'record', '--env', 'test',
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
  assert.equal(saved.deployments[0].test.url, 'https://healthy-test.example.chatgpt.site/');
  assert.match(saved.deployments[0].test.commit, /^[0-9a-f]{40}$/);
});

test("recording a demo release takes no target - the URL comes from the destination", () => {
  const dir = scratch([{
    kind: 'demo', source: DEMO_SOURCE, destination: 'Guide to Initiatives', root_html: 'main.html'
  }]);
  const result = JSON.parse(run(
    ['deployments', 'healthy', 'record', '--env', 'prod', '--json'], dir));

  assert.match(result.entry.deployed_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(result.urls.prod, /\/demos\/Guide%20to%20Initiatives\/$/);
  assert.equal(result.entry.url, undefined, 'nothing that could drift from demos/');

  assert.match(runFailing([
    'deployments', 'healthy', 'record', '--env', 'prod', '--url', 'https://example.com/'
  ], dir).stderr, /do not pass --url or --site-slug/);
});

test("a demo's test environment cannot be recorded", () => {
  const dir = scratch([{
    kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html'
  }]);
  assert.match(runFailing(['deployments', 'healthy', 'record', '--env', 'test'], dir).stderr,
    /derived rather than deployed - nothing to record/);
});

test('a release cannot be recorded onto the test Site', () => {
  const dir = scratch([staticSite({
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' }
  })]);
  const { stderr } = runFailing([
    'deployments', 'healthy', 'record', '--env', 'prod',
    '--site-slug', 'healthy-test', '--url', 'https://healthy-test.example.chatgpt.site/',
    '--access', 'public'
  ], dir);

  assert.match(stderr, /would point both environments at one Site/);
});

test('recording refuses a non-https URL and an unknown access level', () => {
  const dir = scratch([staticSite()]);
  assert.match(runFailing([
    'deployments', 'healthy', 'record', '--env', 'test',
    '--site-slug', 'healthy-test', '--url', 'http://healthy-test.example.chatgpt.site/'
  ], dir).stderr, /not an https URL/);

  assert.match(runFailing([
    'deployments', 'healthy', 'record', '--env', 'test',
    '--site-slug', 'healthy-test', '--url', 'https://healthy-test.example.chatgpt.site/',
    '--access', 'shared'
  ], dir).stderr, /access must be one of/);
});

// ------------------------------------------------------------- displaying

test('the plain listing shows every deployment with both environments', () => {
  const out = run(['deployments', 'healthy'], scratch([
    staticSite({ test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' } }),
    { kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html' }
  ]));

  assert.match(out, /ChatGPT Site \(chatgpt-site\)/);
  assert.match(out, /test\s+https:\/\/healthy-test\.example\.chatgpt\.site\//);
  assert.match(out, /prod\s+not released yet/);
  assert.match(out, /Demo \(demo\)/);
  assert.match(out, /demos\/Fixture%20Demo\//);
});

test('the overview page shows every deployment, both environments each', () => {
  const page = run(['page', 'healthy'], scratch([
    staticSite({
      test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', access: 'private' },
      prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', access: 'public', version: 2 }
    }),
    { kind: 'demo', source: DEMO_SOURCE, destination: 'Fixture Demo', root_html: 'main.html' }
  ]));

  assert.match(page, /initiative-deployments/);
  assert.match(page, /<strong>ChatGPT Site<\/strong>/);
  assert.match(page, /<strong>Demo<\/strong>/);
  assert.match(page, /Test — <a href="https:\/\/healthy-test\.example\.chatgpt\.site\/"/);
  assert.match(page, /Production — <a href="https:\/\/healthy\.example\.chatgpt\.site\/"/);
  assert.match(page, /version 2/);
});

test('an environment with nothing deployed still gets a row', () => {
  const page = run(['page', 'healthy'], scratch([staticSite({
    test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/' }
  })]));

  assert.match(page, /Production — <em>not released yet<\/em>/);
});

// --------------------------------------------------- release state and history

/** The oldest commit touching a path - a release far enough behind to have changes. */
function firstCommitFor(path) {
  const out = execFileSync('git', ['log', '--format=%H', '--', path], {
    cwd: ROOT, encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
  return out[out.length - 1];
}

const historiedDemo = (prod) => ({
  kind: 'demo',
  source: HISTORIED_SOURCE,
  destination: 'Fixture History Demo',
  root_html: 'description.html',
  ...(prod ? { prod } : {})
});

test('an initiative never released says so rather than guessing', () => {
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([staticSite()])));

  assert.equal(plan.release.released, false);
  assert.equal(plan.release.summary, 'not released yet');
  assert.deepEqual(plan.release.changes, []);
});

test('a deployment on test but never released is distinguished from one never deployed', () => {
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([staticSite({
      test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/' }
    })])));

  assert.equal(plan.release.summary, 'on test, never released');
});

test('production released at the current source commit reads as current', () => {
  const head = firstCommitFor(SITE);
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([staticSite({
      prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', commit: head }
    })])));

  assert.equal(plan.release.summary, 'production is current');
  assert.equal(plan.release.unreleased, 0);
});

test('an older release reports how much is unreleased, and what it is', () => {
  const old = firstCommitFor(HISTORIED_SOURCE);
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([historiedDemo({ deployed_at: '2026-01-01T00:00:00Z', commit: old })])));

  assert.equal(plan.release.released, true);
  assert.equal(plan.release.known, true);
  assert.ok(plan.release.unreleased >= 1, 'commits have landed since that release');
  assert.equal(plan.release.changes.length, plan.release.unreleased);
  assert.match(plan.release.summary, /commit\(s\) unreleased/);
});

test('a release whose commit is unknown degrades to a statement rather than a wrong count', () => {
  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([staticSite({
      prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/' }
    })])));

  assert.equal(plan.release.known, false);
  assert.match(plan.release.summary, /released, but the released commit is unknown/);
});

test('test being ahead of production is reported', () => {
  const old = firstCommitFor(HISTORIED_SOURCE);
  const head = execFileSync('git', ['log', '-1', '--format=%H', '--', HISTORIED_SOURCE], {
    cwd: ROOT, encoding: 'utf8'
  }).trim();

  const plan = JSON.parse(run(['deployments', 'healthy', 'plan', '--env', 'prod', '--json'],
    scratch([{
      kind: 'chatgpt-site',
      build: 'static',
      source: SITE,
      test: { slug: 'healthy-test', url: 'https://healthy-test.example.chatgpt.site/', commit: head },
      prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', commit: old }
    }])));

  assert.equal(plan.release.test_ahead, true);
});

test('a release writes a history entry; a test deploy writes none', () => {
  const dir = scratch([staticSite()]);

  run(['deployments', 'healthy', 'record', '--env', 'test',
    '--site-slug', 'healthy-test', '--url', 'https://healthy-test.example.chatgpt.site/'], dir);
  assert.equal(existsSync(join(dir, 'healthy', 'releases.md')), false,
    'the hundreds of test deploys before a release are not worth a durable record');

  const result = JSON.parse(run(['deployments', 'healthy', 'record', '--env', 'prod',
    '--site-slug', 'healthy', '--url', 'https://healthy.example.chatgpt.site/',
    '--access', 'public', '--version', '4', '--json'], dir));

  assert.equal(result.history, 'releases.md');
  const history = readFileSync(join(dir, 'healthy', 'releases.md'), 'utf8');
  assert.match(history, /^# Releases/);
  assert.match(history, /ChatGPT Site — version 4/);
  assert.match(history, /https:\/\/healthy\.example\.chatgpt\.site\//);
  assert.match(history, /Released `[0-9a-f]{7}`/);
  // The one test observation worth keeping: where test stood at release time.
  assert.match(history, /test last deployed \d{4}-\d{2}-\d{2}/);
});

test('a release summarizes what changed since the previous one', () => {
  const old = firstCommitFor(HISTORIED_SOURCE);
  const dir = scratch([historiedDemo({ deployed_at: '2026-01-01T00:00:00Z', commit: old })]);

  const result = JSON.parse(run(
    ['deployments', 'healthy', 'record', '--env', 'prod', '--json'], dir));

  assert.ok(result.changes.length >= 1);
  const history = readFileSync(join(dir, 'healthy', 'releases.md'), 'utf8');
  assert.match(history, /Changes since the previous release:/);
  assert.match(history, /commit\(s\) since the previous release/);
  for (const change of result.changes.slice(0, 3)) {
    assert.ok(history.includes(`- ${change}`), `history should list "${change}"`);
  }
});

test('a second release keeps the first, newest first', () => {
  const dir = scratch([staticSite()]);
  const record = () => run(['deployments', 'healthy', 'record', '--env', 'prod',
    '--site-slug', 'healthy', '--url', 'https://healthy.example.chatgpt.site/',
    '--access', 'public'], dir);

  run(['deployments', 'healthy', 'record', '--env', 'prod',
    '--site-slug', 'healthy', '--url', 'https://healthy.example.chatgpt.site/',
    '--access', 'public', '--version', '1', '--deployed-at', '2026-01-01T00:00:00Z'], dir);
  run(['deployments', 'healthy', 'record', '--env', 'prod',
    '--site-slug', 'healthy', '--url', 'https://healthy.example.chatgpt.site/',
    '--access', 'public', '--version', '2', '--deployed-at', '2026-02-02T00:00:00Z'], dir);

  const history = readFileSync(join(dir, 'healthy', 'releases.md'), 'utf8');
  assert.ok(history.includes('version 1'), 'the earlier release survives');
  assert.ok(history.includes('version 2'));
  assert.ok(history.indexOf('version 2') < history.indexOf('version 1'), 'newest first');
  assert.equal(history.match(/^# Releases/gm).length, 1, 'one header, not one per release');
});

test('the digest reports unreleased work without treating it as work to pick up', () => {
  const old = firstCommitFor(HISTORIED_SOURCE);
  const digest = JSON.parse(run(['digest', '--json'],
    scratch([historiedDemo({ deployed_at: '2026-01-01T00:00:00Z', commit: old })])));

  const entry = digest.unreleased.find((u) => u.slug === 'healthy');
  assert.ok(entry, 'the initiative appears under unreleased work');
  assert.equal(entry.kind, 'demo');
  assert.ok(entry.commits >= 1);
  assert.ok(entry.latest, 'names the most recent unreleased change');

  const text = run(['digest'], scratch([historiedDemo({ deployed_at: '2026-01-01T00:00:00Z', commit: old })]));
  assert.match(text, /## Unreleased work/);
});

test('the overview page states whether production is current', () => {
  const head = firstCommitFor(SITE);
  const current = run(['page', 'healthy'], scratch([staticSite({
    prod: { slug: 'healthy', url: 'https://healthy.example.chatgpt.site/', commit: head }
  })]));
  assert.match(current, /class="deployment-status">production is current</);

  const behind = run(['page', 'healthy'], scratch([
    historiedDemo({ deployed_at: '2026-01-01T00:00:00Z', commit: firstCommitFor(HISTORIED_SOURCE) })
  ]));
  assert.match(behind, /class="deployment-status">\d+ commit\(s\) unreleased</);
});
