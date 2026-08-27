#!/usr/bin/env node
/**
 * Initiatives: validation and page generation.
 *
 * `build.sh` reads deck.json with grep and sed, deliberately avoiding a jq
 * dependency. That works for flat string fields and does not survive the nested
 * todo[] and outputs[] arrays here, so this part of the build is Node - which
 * also gets us real HTML escaping of hand-written fields for free.
 *
 * Subcommands:
 *   validate            check every initiative; exit 1 on an error, 0 on warnings
 *   digest [--json]     the sweep survey: what needs attention, as markdown
 *   propose [--json]    which `human:` questions this run should propose answers to
 *                       [--claimed a,b] branches of open sweep PRs
 *                       [--open-prs n]  how many sweep PRs are already open
 *                       [--spent n]     budget already used earlier in the run
 *   select [--json]     which items this run should work on
 *                       [--claimed a,b] branches of open sweep PRs
 *                       [--open-prs n]  how many sweep PRs are already open
 *                       [--spent n]     budget already used earlier in the run
 *   add <slug> <item-id> --title "..." [--value ...] [--effort ...]
 *                       [--blocked-by <prefix:text>] [--advances-stage]
 *                       author a new todo item
 *   complete <slug> <item-id> [--note "..."] [--stage <stage>]
 *                       record an item done: remove it, unblock dependents, log it
 *                       refuses to leave a non-dormant initiative with nothing to do
 *   check-scope <slug> --files <path>...   or --files-from <file>
 *                       fail if a change reaches outside the initiative's write scope
 *   deployments <slug> [--json]        every deployment, both environment URLs each
 *   deployments <slug> plan --env test|prod [--kind <kind>]
 *                       what a deployment would do; exits 1 if the release gate blocks it
 *   deployments <slug> record --env test|prod [--kind <kind>] ...
 *                       record a completed deployment
 *   list                print one slug per line
 *   toc                 print the TOC page body
 *   page <slug>         print an initiative's overview page body
 *   docs <slug>         print "<file>|<output-name>|<title>" per rendered document
 *   doc <slug> <file>   print a rendered markdown document as a page body
 *
 * Page bodies are wrapped by build.sh's shared TOC shell, so the page furniture
 * is defined in exactly one place.
 *
 * See INITIATIVES_TECHDOC.md.
 */

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Overridable so the tests can point at a fixture directory rather than having
// to create and delete real initiatives to exercise the digest.
const INITIATIVES_DIR = process.env.INITIATIVES_DIR
  ? resolve(process.env.INITIATIVES_DIR)
  : join(ROOT, 'initiatives');
const SWEEP_CONFIG = join(INITIATIVES_DIR, 'sweep.json');

export const STAGES = [
  'wish', 'shaped', 'specified', 'planned', 'building', 'refining', 'dormant', 'archived'
];

/**
 * Stages at which an empty todo list is an honest state rather than neglect.
 *
 * Everywhere else, no actionable work means the initiative has gone quiet
 * without anyone deciding it should - the §5.1 distinction the validator has
 * always warned about and nothing enforced.
 */
export const RESTING_STAGES = new Set(['dormant', 'archived']);

/**
 * The work that entering `refining` creates, seeded automatically by
 * `complete --stage refining`.
 *
 * An output that has graduated has an audience, and the two things it most
 * reliably lacks are a way in for someone who did not build it and any pressure
 * to keep getting better. Neither arrives on its own, so both are items rather
 * than hopes. The improvements item is what keeps a refining initiative from
 * going silent: completing it empties the list, which the guard below refuses
 * unless the initiative is also being declared dormant.
 */
export const REFINING_ENTRY_ITEMS = [
  {
    id: 'refining-readme',
    title: 'Write a user-facing README covering how to use it and how to deploy it',
    state: 'actionable',
    value: 'high',
    effort: 'small',
    advances_stage: false
  },
  {
    id: 'refining-improvements',
    title: 'Propose optional improvements as a pull request, from better documentation to suggested features',
    state: 'actionable',
    value: 'medium',
    effort: 'medium',
    advances_stage: false
  }
];

/**
 * Documents expected once a stage is reached, used for warnings only.
 *
 * This is the *incremental* record - what each stage adds. `wish.md` is not
 * here because it is required at every stage and has its own check below;
 * `decisions.md` and `log.md` are not here because they are not tied to a
 * stage at all - they appear when there is a question to settle or something
 * to record. `DOCUMENTS` is the full set an initiative can carry.
 */
export const STAGE_DOCUMENTS = {
  shaped: ['objectives.md'],
  specified: ['objectives.md', 'spec.md'],
  planned: ['objectives.md', 'spec.md', 'plan.md', 'test-plan.md'],
  building: ['objectives.md', 'spec.md', 'plan.md', 'test-plan.md'],
  refining: ['objectives.md', 'spec.md', 'plan.md', 'test-plan.md']
};

export const BLOCKER_PREFIXES = [
  'todo', 'initiative', 'review', 'schedule',
  'human', 'permission', 'cost', 'legal',
  'data', 'external', 'upstream'
];

/** Blockers the sweep can clear on its own, versus those needing a person. */
export const HUMAN_BLOCKERS = new Set(['human', 'permission', 'cost', 'legal', 'data']);

/**
 * The sweep may propose an answer only to a judgement call.
 *
 * `permission:`, `cost:` and `legal:` need the user's authority rather than
 * reasoning, and `data:` is a fact about their world - proposing one would be
 * an invention wearing the costume of an answer.
 */
export const PROPOSABLE_BLOCKERS = new Set(['human']);

/**
 * Every document an initiative can carry, in the order they are rendered and
 * listed. Exported because it is the whole record, not just the part the
 * lifecycle gates: the wish the work started from, the decisions that settled
 * what it is, the plans, what shipped, and the log of what happened.
 */
export const DOCUMENTS = [
  ['README.md', 'README'],
  ['wish.md', 'Wish'],
  ['background.md', 'Background'],
  ['objectives.md', 'Objectives'],
  ['decisions.md', 'Decisions'],
  ['spec.md', 'Specification'],
  ['plan.md', 'Implementation plan'],
  ['test-plan.md', 'Test plan'],
  ['releases.md', 'Releases'],
  ['log.md', 'Log'],
  ['notes.md', 'Notes']
];

const DEFAULT_STALENESS_DAYS = 14;

/** What a sweep run is permitted to do, in order. Survey is never optional. */
const SWEEP_PHASES = ['survey', 'respond', 'propose', 'work'];

// ---------------------------------------------------------------- loading

function listSlugs() {
  if (!existsSync(INITIATIVES_DIR)) return [];
  return readdirSync(INITIATIVES_DIR)
    .filter((name) => statSync(join(INITIATIVES_DIR, name)).isDirectory())
    .sort();
}

function loadSweepConfig() {
  if (!existsSync(SWEEP_CONFIG)) return { present: false, config: {} };
  try {
    return { present: true, config: JSON.parse(readFileSync(SWEEP_CONFIG, 'utf8')) };
  } catch (err) {
    return { present: true, error: err.message, config: {} };
  }
}

function loadInitiative(slug) {
  const dir = join(INITIATIVES_DIR, slug);
  const jsonPath = join(dir, 'initiative.json');
  // Relative to the repo root, so `git log` resolves it.
  const record = { slug, dir, path: relative(ROOT, dir) || `initiatives/${slug}`, data: null, error: null };

  if (!existsSync(jsonPath)) {
    record.error = 'initiative.json is missing';
    return record;
  }
  try {
    record.data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    record.error = `initiative.json does not parse: ${err.message}`;
    return record;
  }
  record.lastActivity = lastActivity(record.path);
  return record;
}

function loadAll() {
  return listSlugs().map(loadInitiative);
}

/**
 * Last activity comes from git rather than a hand-maintained field, which
 * cannot be forgotten or left behind by an edit that touched only markdown.
 */
function lastActivity(relPath) {
  try {
    const out = execFileSync(
      'git', ['log', '-1', '--format=%cI', '--', relPath],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out || null;
  } catch {
    return null;
  }
}

function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

function relativeDays(days) {
  if (days === null) return 'not yet committed';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// ------------------------------------------------------------- validation

/**
 * Errors mean the data is malformed or unsafe and anything generated from it
 * would be wrong. Warnings mean the backlog needs attention, which is a matter
 * for the dashboard and the digest - not a reason to block a site deploy.
 */
function validate() {
  const errors = [];
  const warnings = [];
  const records = loadAll();
  const outputOwners = new Map();
  const targetOwners = new Map();

  const sweep = loadSweepConfig();
  if (sweep.error) {
    errors.push(`initiatives/sweep.json does not parse: ${sweep.error}`);
  } else if (sweep.present) {
    const perRun = sweep.config.items_per_run;
    const perInitiative = sweep.config.max_items_per_initiative;
    if (Number.isFinite(perRun) && Number.isFinite(perInitiative) && perInitiative > perRun) {
      errors.push(
        `sweep.json: max_items_per_initiative (${perInitiative}) exceeds items_per_run (${perRun})`
      );
    }
    // Which phases the sweep may run is config, so widening what the job is
    // allowed to do is a reviewable commit rather than an edit to the prompt.
    const phases = sweep.config.phases;
    if (phases !== undefined) {
      if (!Array.isArray(phases) || phases.length === 0) {
        errors.push('sweep.json: phases must be a non-empty array');
      } else {
        for (const phase of phases) {
          if (!SWEEP_PHASES.includes(phase)) {
            errors.push(`sweep.json: unknown phase "${phase}"`);
          }
        }
        if (!phases.includes('survey')) {
          errors.push('sweep.json: phases must include "survey" - the sweep always looks before acting');
        }
      }
    }
  }

  for (const record of records) {
    const { slug, data } = record;
    if (record.error) {
      errors.push(`${slug}: ${record.error}`);
      continue;
    }

    if (!data.title) warnings.push(`${slug}: no title, falling back to the slug`);

    if (!STAGES.includes(data.stage)) {
      errors.push(`${slug}: unknown stage "${data.stage}"`);
    }

    for (const output of data.outputs || []) {
      if (!output.path) continue;
      if (output.path.includes('..')) {
        errors.push(`${slug}: output path escapes the repo: ${output.path}`);
        continue;
      }
      if (!existsSync(join(ROOT, output.path))) {
        errors.push(`${slug}: output path does not exist: ${output.path}`);
        continue;
      }
      // Exclusive ownership is what makes parallel sweep PRs safe: two
      // initiatives writing the same path could conflict with each other.
      if (outputOwners.has(output.path)) {
        errors.push(
          `${slug}: output path ${output.path} is already declared by ${outputOwners.get(output.path)}`
        );
      } else {
        outputOwners.set(output.path, slug);
      }
      errors.push(...checkOutputIndependence(slug, output.path));
    }

    const deployed = checkDeployments(slug, data, targetOwners);
    errors.push(...deployed.errors);
    warnings.push(...deployed.warnings);

    const ids = new Set((data.todo || []).map((item) => item.id));
    let actionable = 0;

    for (const item of data.todo || []) {
      if (!item.id) {
        errors.push(`${slug}: a todo item has no id`);
        continue;
      }
      if (item.state === 'actionable') {
        actionable += 1;
        continue;
      }
      if (item.state !== 'blocked') {
        errors.push(`${slug}: todo "${item.id}" has unknown state "${item.state}"`);
        continue;
      }
      if (!item.blocked_by) {
        errors.push(`${slug}: blocked todo "${item.id}" does not say what blocks it`);
        continue;
      }
      const prefix = String(item.blocked_by).split(':', 1)[0];
      if (!BLOCKER_PREFIXES.includes(prefix)) {
        errors.push(`${slug}: todo "${item.id}" has unknown blocker prefix "${prefix}"`);
      }
      if (prefix === 'todo') {
        const target = String(item.blocked_by).slice('todo:'.length);
        // A dangling reference means an unblock was forgotten and the item is
        // stranded, so this is an error rather than a warning.
        if (!ids.has(target)) {
          errors.push(`${slug}: todo "${item.id}" is blocked by "${target}", which does not exist`);
        }
      }
      if (HUMAN_BLOCKERS.has(prefix)) {
        warnings.push(`${slug}: waiting on you - ${item.blocked_by}`);
      }
    }

    const resting = data.stage === 'dormant' || data.stage === 'archived';
    if (!resting && actionable === 0) {
      warnings.push(`${slug}: nothing actionable, and not marked dormant`);
    }

    for (const doc of STAGE_DOCUMENTS[data.stage] || []) {
      if (!existsSync(join(record.dir, doc))) {
        warnings.push(`${slug}: stage is "${data.stage}" but ${doc} is missing`);
      }
    }

    if (!existsSync(join(record.dir, 'wish.md'))) {
      warnings.push(`${slug}: no wish.md`);
    }

    const threshold = Number.isFinite(data.staleness_days)
      ? data.staleness_days
      : (Number.isFinite(sweep.config.staleness_days)
        ? sweep.config.staleness_days
        : DEFAULT_STALENESS_DAYS);
    const age = daysSince(record.lastActivity);
    if (!resting && age !== null && age > threshold) {
      warnings.push(`${slug}: stale - no activity for ${age} days (threshold ${threshold})`);
    }
  }

  return { errors, warnings, records };
}

/**
 * A published output may not reference code under initiatives/, or an ordinary
 * edit inside an initiative would silently change a published artifact.
 */
function checkOutputIndependence(slug, outputPath) {
  const problems = [];
  const abs = join(ROOT, outputPath);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return problems;

  const suspects = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(html|js|css|json|md)$/i.test(entry.name)) suspects.push(full);
    }
  };
  walk(abs);

  for (const file of suspects) {
    const text = readFileSync(file, 'utf8');
    if (/(?:^|["'(\s/])initiatives\//.test(text)) {
      problems.push(
        `${slug}: published output ${file.slice(ROOT.length + 1)} references a path under initiatives/`
      );
    }
  }
  return problems;
}

// ------------------------------------------------------------ deployments

/*
 * How an initiative reaches the world.
 *
 * Most initiatives are not deployed at all, and an initiative may develop for
 * months before it is - so `deployments` is absent by default, added when there
 * is something to publish, and may change kind late without anything else in
 * the initiative moving. It is a list because nothing stops an initiative from
 * having both a demo and a Site.
 *
 * Each entry names a `kind`. The kind decides which environments exist, which
 * of them are recorded rather than derived, what a source directory has to
 * contain, and which skill does the deploying. Adding a new deployment scheme
 * means adding a KINDS entry and a skill - not touching the validator, the
 * plan, the record, or the page.
 *
 * Two environments, everywhere: `test` is overwritten as often as the work
 * needs it, by whichever agent is doing the work; `prod` moves only when a
 * person runs the release skill. A kind that cannot deploy its test
 * environment still has one - a demo's is the branch preview, which appears
 * from the push rather than from a deployment.
 */

export const DEPLOY_ENVIRONMENTS = ['test', 'prod'];

/** Site access is never inferred - a Site is owner-only unless someone said otherwise. */
export const SITE_ACCESS = ['private', 'public'];

/**
 * How a ChatGPT Site is built. `static` is a folder of files the platform
 * serves as-is. `sites-app` is a project that builds itself and brings its own
 * `.openai/hosting.json`, bindings and migrations - Bookmark Sorter's shape,
 * which the static-folder engine cannot deploy.
 */
export const CHATGPT_SITE_BUILDS = ['static', 'sites-app'];

const KINDS = {
  'chatgpt-site': {
    label: 'ChatGPT Site',
    keys: ['kind', 'source', 'build', 'test', 'prod'],
    envKeys: ['slug', 'url', 'access', 'deployed_at', 'version', 'commit'],
    /** Environments stored in the record; the rest are derived at read time. */
    recorded: ['test', 'prod'],
    // A static folder is what `deploy-to-chatgpt-sites` exists for. A
    // sites-app builds itself and brings its own bindings and migrations, so
    // it goes through the platform's own Sites build and hosting workflow -
    // which is why Bookmark Sorter could never use the static-folder skill.
    engine: (entry) => (entry.build === 'sites-app' ? 'sites-hosting' : 'deploy-to-chatgpt-sites'),
    /** What makes two entries the same target, for cross-initiative ownership. */
    identity: (entry, env) => [entry[env]?.slug, entry[env]?.url].filter(Boolean)
  },
  demo: {
    label: 'Demo',
    keys: ['kind', 'source', 'destination', 'root_html', 'prod'],
    envKeys: ['deployed_at', 'commit'],
    // A demo has no test Site to write: its test environment is the branch
    // preview, which exists because the branch was pushed.
    recorded: ['prod'],
    engine: () => 'deploy-demo',
    identity: (entry) => (entry.destination ? [`demos/${entry.destination}`] : [])
  }
};

export const DEPLOYMENT_KINDS = Object.keys(KINDS);

/** Human labels, exported so the page renderer needs no access to KINDS itself. */
export const DEPLOYMENT_LABELS = Object.fromEntries(
  Object.entries(KINDS).map(([kind, spec]) => [kind, spec.label])
);

/** ChatGPT Sites slugs: lowercase, digits, single interior hyphens. */
const SITE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ------------------------------------------------------- git and page URLs

function git(gitArgs) {
  return execFileSync('git', gitArgs, {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

/**
 * What git knows about the directory being published.
 *
 * A release records the commit its files came from, which is only meaningful if
 * those files were committed - so `dirty` is what the release gate refuses on.
 * It is scoped to the source directory: unrelated edits elsewhere in the
 * repository are none of this release's business.
 */
function sourceStatus(relPath) {
  let commit = null;
  let dirty = [];
  try {
    commit = git(['log', '-1', '--format=%H', '--', relPath]) || null;
  } catch { /* not a repository, or no history for this path */ }
  try {
    const out = git(['status', '--porcelain=v1', '-uall', '--', relPath]);
    dirty = out ? out.split('\n').map((line) => line.slice(3).trim()).filter(Boolean) : [];
  } catch { /* not a repository */ }
  return { commit, dirty };
}

/** The current branch, and the directory gh-pages.yml publishes it to. */
function currentBranch() {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD']) || null;
  } catch {
    return null;
  }
}

/**
 * The GitHub Pages base URL, derived from the origin remote rather than
 * written down - a fork or a rename should not need this file edited.
 */
function pagesBase() {
  let url;
  try {
    url = git(['remote', 'get-url', 'origin']);
  } catch {
    return null;
  }
  const match = /(?:github\.com[/:])([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url || '');
  if (!match) return null;
  return `https://${match[1]}.github.io/${match[2]}/`;
}

// ------------------------------------------------------------ reading them

function deploymentList(data) {
  const list = data && data.deployments;
  return Array.isArray(list) ? list : [];
}

function environmentEntry(entry, env) {
  const value = entry && entry[env];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

/**
 * Both URLs for one deployment, always both keys.
 *
 * A ChatGPT Site's URLs are recorded when it is deployed. A demo's are computed
 * from its destination: production is the published path, and test is the same
 * path under this branch's preview. On `main` the preview *is* production,
 * which the caller is told rather than left to infer.
 */
export function deploymentUrls(entry) {
  const urls = { test: null, prod: null };
  if (!entry || typeof entry !== 'object') return urls;

  if (entry.kind === 'demo') {
    const base = pagesBase();
    if (!base || !entry.destination) return urls;
    const path = `demos/${encodeURIComponent(entry.destination)}/`;
    const branch = currentBranch();
    urls.prod = `${base}${path}`;
    urls.test = (!branch || branch === 'main')
      ? urls.prod
      : `${base}branch/${branch.replace(/\//g, '-')}/${path}`;
    return urls;
  }

  for (const env of DEPLOY_ENVIRONMENTS) {
    urls[env] = environmentEntry(entry, env)?.url || null;
  }
  return urls;
}

/** Whether an environment has actually been deployed, as opposed to merely addressable. */
function isDeployed(entry, env) {
  if (!entry) return false;
  if (entry.kind === 'demo' && env === 'test') {
    // The preview exists once the branch is pushed; there is nothing to record.
    return Boolean(deploymentUrls(entry).test);
  }
  return Boolean(environmentEntry(entry, env));
}

/**
 * Pick the deployment a command is about.
 *
 * One deployment needs no `--kind`. Several do, because guessing which one a
 * release meant is exactly the mistake this whole arrangement exists to
 * prevent.
 */
function selectDeployment(slug, list, kind) {
  if (!list.length) {
    throw new Error(`${slug}: no deployments - this initiative is not deployed anywhere`);
  }
  if (!kind) {
    if (list.length === 1) return list[0];
    throw new Error(
      `${slug}: ${list.length} deployments - name one with --kind `
      + `(${list.map((entry) => entry.kind).join(', ')})`
    );
  }
  const matches = list.filter((entry) => entry.kind === kind);
  if (!matches.length) throw new Error(`${slug}: no "${kind}" deployment`);
  if (matches.length > 1) throw new Error(`${slug}: more than one "${kind}" deployment`);
  return matches[0];
}

// --------------------------------------------------------------- validation

/**
 * Validate one initiative's deployments.
 *
 * The rule here that is a safety property rather than tidiness is that the two
 * environments may never resolve to the same target: that is the difference
 * between a routine test deploy and silently overwriting production.
 */
function checkDeployments(slug, data, targetOwners) {
  const errors = [];
  const warnings = [];

  // The narrow `sites` block this replaced. Erroring rather than ignoring it
  // means a record left half-migrated cannot quietly stop being deployed.
  if (data.sites !== undefined) {
    errors.push(`${slug}: "sites" was replaced by "deployments" - move it to a deployments entry with kind "chatgpt-site"`);
  }

  if (data.deployments === undefined) return { errors, warnings };

  if (!Array.isArray(data.deployments)) {
    errors.push(`${slug}: deployments must be a list`);
    return { errors, warnings };
  }

  const seenKinds = new Set();

  for (const [index, entry] of data.deployments.entries()) {
    const at = `deployments[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${slug}: ${at} must be an object`);
      continue;
    }

    const kind = KINDS[entry.kind];
    if (!kind) {
      errors.push(`${slug}: ${at} has unknown kind "${entry.kind}" - one of ${DEPLOYMENT_KINDS.join(', ')}`);
      continue;
    }
    if (seenKinds.has(entry.kind)) {
      errors.push(`${slug}: two "${entry.kind}" deployments - one target of each kind per initiative`);
    }
    seenKinds.add(entry.kind);

    for (const key of Object.keys(entry)) {
      if (!kind.keys.includes(key)) {
        errors.push(`${slug}: ${at} has unknown key "${key}" for a ${entry.kind} deployment`);
      }
    }

    errors.push(...checkDeploymentSource(slug, at, entry));
    if (entry.kind === 'chatgpt-site') {
      const checked = checkSiteEnvironments(slug, at, entry, targetOwners);
      errors.push(...checked.errors);
      warnings.push(...checked.warnings);
    } else {
      errors.push(...checkDemoTarget(slug, at, entry, targetOwners));
    }

    // An environment the kind does not record cannot be written down.
    for (const env of DEPLOY_ENVIRONMENTS) {
      if (entry[env] !== undefined && !kind.recorded.includes(env)) {
        errors.push(
          `${slug}: ${at} records a "${env}" environment, but a ${entry.kind}'s ${env} `
          + 'environment is derived rather than deployed'
        );
      }
    }
  }

  return { errors, warnings };
}

/** What each kind needs to find in its source directory before it can deploy. */
function checkDeploymentSource(slug, at, entry) {
  const errors = [];
  if (!entry.source) {
    errors.push(`${slug}: ${at} needs a "source" directory to publish`);
    return errors;
  }
  if (String(entry.source).includes('..')) {
    errors.push(`${slug}: ${at} source escapes the repo: ${entry.source}`);
    return errors;
  }
  const abs = join(ROOT, entry.source);
  if (!existsSync(abs)) {
    errors.push(`${slug}: ${at} source does not exist: ${entry.source}`);
    return errors;
  }

  if (entry.kind === 'chatgpt-site') {
    const build = entry.build || 'static';
    if (!CHATGPT_SITE_BUILDS.includes(build)) {
      errors.push(`${slug}: ${at} build must be one of ${CHATGPT_SITE_BUILDS.join(', ')}`);
    } else if (build === 'static') {
      if (!existsSync(join(abs, 'index.html'))) {
        errors.push(`${slug}: ${at} is a static Site but ${entry.source} has no index.html`);
      }
    } else if (!existsSync(join(abs, 'package.json'))) {
      errors.push(`${slug}: ${at} is a sites-app but ${entry.source} has no package.json to build`);
    }
    return errors;
  }

  // A demo needs an entry page, either index.html or a named root_html.
  const root = entry.root_html || 'index.html';
  if (String(root).includes('..')) {
    errors.push(`${slug}: ${at} root_html escapes the source: ${root}`);
  } else if (!existsSync(join(abs, root))) {
    errors.push(`${slug}: ${at} root page does not exist: ${entry.source}/${root}`);
  }
  return errors;
}

function checkSiteEnvironments(slug, at, entry, targetOwners) {
  const errors = [];
  const warnings = [];
  const envKeys = KINDS['chatgpt-site'].envKeys;

  for (const env of DEPLOY_ENVIRONMENTS) {
    const value = entry[env];
    if (value === undefined) continue;
    const record = environmentEntry(entry, env);
    if (!record) {
      errors.push(`${slug}: ${at}.${env} must be an object`);
      continue;
    }

    for (const key of Object.keys(record)) {
      if (!envKeys.includes(key)) {
        errors.push(`${slug}: ${at}.${env} has unknown key "${key}"`);
      }
    }
    if (!record.slug) {
      errors.push(`${slug}: ${at}.${env} has no slug`);
    } else if (!SITE_SLUG.test(record.slug)) {
      errors.push(`${slug}: ${at}.${env} slug is not a valid Site slug: ${record.slug}`);
    }
    if (!record.url) {
      errors.push(`${slug}: ${at}.${env} has no url`);
    } else if (!/^https:\/\/[^\s]+$/.test(record.url)) {
      errors.push(`${slug}: ${at}.${env} url is not an https URL: ${record.url}`);
    }
    if (record.access !== undefined && !SITE_ACCESS.includes(record.access)) {
      errors.push(`${slug}: ${at}.${env} access must be one of ${SITE_ACCESS.join(', ')}`);
    }

    errors.push(...claimTargets(slug, env, KINDS['chatgpt-site'].identity(entry, env), targetOwners));
  }

  const test = environmentEntry(entry, 'test');
  const prod = environmentEntry(entry, 'prod');
  if (test && prod) {
    if (test.slug && test.slug === prod.slug) {
      errors.push(`${slug}: ${at} test and prod are the same Site (${test.slug}) - a test deploy would overwrite production`);
    }
    if (test.url && test.url === prod.url) {
      errors.push(`${slug}: ${at} test and prod have the same URL (${test.url}) - a test deploy would overwrite production`);
    }
  }

  // Naming is a convention rather than a safety property, so it warns. New
  // Sites are named `<slug>-test` and `<slug>` by the skills.
  if (test?.slug && test.slug === slug) {
    warnings.push(`${slug}: test Site slug "${test.slug}" is the bare initiative slug, so its URL reads like production - "${slug}-test" is the convention`);
  }
  if (prod?.slug && /(^|-)test(-|$)/.test(prod.slug)) {
    warnings.push(`${slug}: production Site slug "${prod.slug}" says "test"`);
  }

  return { errors, warnings };
}

function checkDemoTarget(slug, at, entry, targetOwners) {
  const errors = [];
  if (!entry.destination) {
    errors.push(`${slug}: ${at} needs a "destination" folder name under demos/`);
  } else if (entry.destination.includes('/') || entry.destination.includes('..')) {
    errors.push(`${slug}: ${at} destination must be one folder name, not a path: ${entry.destination}`);
  } else {
    errors.push(...claimTargets(slug, 'prod', KINDS.demo.identity(entry), targetOwners));
  }

  const record = environmentEntry(entry, 'prod');
  if (entry.prod !== undefined && !record) {
    errors.push(`${slug}: ${at}.prod must be an object`);
  } else if (record) {
    for (const key of Object.keys(record)) {
      if (!KINDS.demo.envKeys.includes(key)) {
        errors.push(`${slug}: ${at}.prod has unknown key "${key}"`);
      }
    }
    // A recorded demo release must actually be in the tree.
    if (!existsSync(join(ROOT, 'demos', entry.destination || ''))) {
      errors.push(`${slug}: ${at} is recorded as released but demos/${entry.destination} does not exist`);
    }
  }
  return errors;
}

/**
 * Exclusive target ownership, for the same reason outputs[] has it: two
 * initiatives deploying to one target would overwrite each other.
 */
function claimTargets(slug, env, targets, targetOwners) {
  const errors = [];
  for (const target of targets) {
    if (targetOwners.has(target)) {
      errors.push(`${slug}: deployment target ${target} is already declared by ${targetOwners.get(target)}`);
    } else {
      targetOwners.set(target, `${slug} (${env})`);
    }
  }
  return errors;
}

// -------------------------------------------------------------------- plan

function countStaticFiles(abs) {
  let files = 0;
  const walk = (dir) => {
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      if (['.git', '.openai', 'node_modules', '.wrangler', 'dist'].includes(dirent.name)) continue;
      if (dirent.isDirectory()) walk(join(dir, dirent.name));
      else files += 1;
    }
  };
  walk(abs);
  return files;
}

/**
 * Everything a deploy skill needs before it touches anything: which target to
 * write, whether it exists yet, what the other environment is, and - for a
 * release - whether the source is committed.
 *
 * Deriving it here rather than in the skill means the release gate is code. A
 * prompt can be talked out of refusing; `deployments plan --env prod` exits
 * non-zero.
 */
export function deploymentPlan(slug, env, { kind } = {}) {
  if (!DEPLOY_ENVIRONMENTS.includes(env)) {
    throw new Error(env
      ? `unknown environment "${env}" - use ${DEPLOY_ENVIRONMENTS.join(' or ')}`
      : `--env ${DEPLOY_ENVIRONMENTS.join('|')} is required`);
  }
  const record = loadInitiative(slug);
  if (record.error) throw new Error(`${slug}: ${record.error}`);

  const entry = selectDeployment(slug, deploymentList(record.data), kind);
  const spec = KINDS[entry.kind];
  if (!spec) throw new Error(`${slug}: unknown deployment kind "${entry.kind}"`);

  const sourceErrors = checkDeploymentSource(slug, `the ${entry.kind} deployment`, entry);
  if (sourceErrors.length) throw new Error(sourceErrors[0]);

  const abs = join(ROOT, entry.source);
  const status = sourceStatus(entry.source);
  const existing = environmentEntry(entry, env);
  const urls = deploymentUrls(entry);
  const blockers = [];

  // Production is released from committed files only. Test is not: the whole
  // point of a test environment is to look at work in progress.
  if (env === 'prod' && status.dirty.length) {
    blockers.push(`${status.dirty.length} uncommitted change(s) under ${entry.source}`);
  }
  if (env === 'prod' && !status.commit) {
    blockers.push(`${entry.source} has never been committed`);
  }

  const plan = {
    slug,
    kind: entry.kind,
    label: spec.label,
    environment: env,
    engine: spec.engine(entry),
    deployable: spec.recorded.includes(env),
    mode: existing ? 'replacement' : 'new',
    source: entry.source,
    source_files: countStaticFiles(abs),
    source_commit: status.commit,
    uncommitted: status.dirty,
    urls,
    deployed: { test: isDeployed(entry, 'test'), prod: isDeployed(entry, 'prod') },
    release: releaseState(entry),
    blockers,
    ready: blockers.length === 0
  };

  if (entry.kind === 'chatgpt-site') {
    plan.build = entry.build || 'static';
    plan.site_slug = existing?.slug || (env === 'test' ? `${slug}-test` : slug);
    plan.site_url = existing?.url || null;
    // Both environments can be public or private; private is the default and
    // the user confirms it. A replacement keeps whatever the Site already has,
    // so only a first deploy of an environment needs asking.
    plan.access = existing?.access || 'private';
    plan.confirm_access = !existing?.access;
    plan.last_version = existing?.version ?? null;
  } else {
    plan.destination = entry.destination;
    plan.root_html = entry.root_html || 'index.html';
    plan.branch = currentBranch();
  }
  plan.last_deployed_at = existing?.deployed_at || null;
  plan.last_commit = existing?.commit || null;

  // A derived environment has nothing to deploy; say what makes it appear.
  if (!plan.deployable) {
    plan.note = plan.branch === 'main'
      ? 'a demo has no separate preview on main - main publishes straight to production'
      : `a demo's test environment is its branch preview, published by pushing ${plan.branch || 'this branch'}`;
  }

  return plan;
}

// ------------------------------------------------------------------ record

/**
 * Record a completed deployment.
 *
 * The skills write through this rather than editing initiative.json, for the
 * same reason `add` and `complete` exist: the fields a model forgets by hand -
 * the timestamp, the commit, the environment it actually wrote - are exactly
 * the ones the validator and the overview page depend on.
 */
export function recordDeployment(slug, env, {
  kind, siteSlug, url, access, version, commit, deployedAt
} = {}) {
  if (!DEPLOY_ENVIRONMENTS.includes(env)) {
    throw new Error(env
      ? `unknown environment "${env}" - use ${DEPLOY_ENVIRONMENTS.join(' or ')}`
      : `--env ${DEPLOY_ENVIRONMENTS.join('|')} is required`);
  }
  const record = loadInitiative(slug);
  if (record.error) throw new Error(`${slug}: ${record.error}`);

  const data = record.data;
  const entry = selectDeployment(slug, deploymentList(data), kind);
  const spec = KINDS[entry.kind];
  if (!spec) throw new Error(`${slug}: unknown deployment kind "${entry.kind}"`);
  if (!spec.recorded.includes(env)) {
    throw new Error(
      `${slug}: a ${entry.kind}'s ${env} environment is derived rather than deployed - nothing to record`
    );
  }

  const previous = environmentEntry(entry, env) || {};
  const stamp = deployedAt || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const sourceCommit = commit || sourceStatus(entry.source).commit;
  let written;

  if (entry.kind === 'chatgpt-site') {
    if (!siteSlug) throw new Error(`${slug}: recording a Site deployment needs --site-slug`);
    if (!SITE_SLUG.test(siteSlug)) throw new Error(`${slug}: not a valid Site slug: ${siteSlug}`);
    if (!url) throw new Error(`${slug}: recording a Site deployment needs --url`);
    if (!/^https:\/\/[^\s]+$/.test(url)) throw new Error(`${slug}: not an https URL: ${url}`);
    if (access !== undefined && !SITE_ACCESS.includes(access)) {
      throw new Error(`${slug}: access must be one of ${SITE_ACCESS.join(', ')}`);
    }

    // The check the whole two-environment arrangement rests on.
    const other = environmentEntry(entry, env === 'test' ? 'prod' : 'test');
    if (other && (other.slug === siteSlug || other.url === url)) {
      throw new Error(
        `${slug}: ${siteSlug} is already the ${env === 'test' ? 'production' : 'test'} Site `
        + '- recording it here would point both environments at one Site'
      );
    }

    written = {
      slug: siteSlug,
      url,
      // Never inferred upward: an environment stays owner-only unless told otherwise.
      access: access || previous.access || 'private',
      deployed_at: stamp
    };
    if (version !== undefined && version !== null && version !== '') {
      if (!Number.isFinite(Number(version))) {
        throw new Error(`${slug}: version must be a number, got "${version}"`);
      }
      written.version = Number(version);
    } else if (previous.version !== undefined) {
      written.version = previous.version;
    }
  } else {
    // A demo's URL comes from its destination, so there is nothing to pass in
    // and nothing that can drift out of step with demos/.
    if (url || siteSlug) {
      throw new Error(`${slug}: a demo's URL comes from its destination - do not pass --url or --site-slug`);
    }
    written = { deployed_at: stamp };
  }

  if (sourceCommit) written.commit = sourceCommit;

  // Read the state *before* the record moves, so "since the previous release"
  // means what it says.
  const state = releaseState(entry);
  entry[env] = written;

  writeFileSync(
    join(record.dir, 'initiative.json'),
    `${JSON.stringify(data, null, 2)}\n`
  );

  const history = appendReleaseHistory(record.dir, slug, entry, env, written, state);

  return {
    slug,
    kind: entry.kind,
    environment: env,
    entry: written,
    urls: deploymentUrls(entry),
    history,
    changes: env === 'prod' ? state.changes : []
  };
}

// -------------------------------------------------- release state and history

/**
 * How far production has fallen behind, from git.
 *
 * Best-effort by design. The commits recorded against the two environments are
 * the only inputs, so a deployment made before this existed, a rewritten
 * history, or a source that moved under a different path all degrade to
 * "unknown" rather than to a wrong answer. Nothing here blocks a release.
 */
export function releaseState(entry) {
  const state = {
    released: false,
    known: false,
    unreleased: null,
    test_ahead: false,
    changes: [],
    summary: 'not released yet'
  };
  if (!entry || typeof entry !== 'object') return state;

  const prod = environmentEntry(entry, 'prod');
  const test = environmentEntry(entry, 'test');
  state.released = Boolean(prod);
  if (!prod) {
    state.summary = test ? 'on test, never released' : 'not released yet';
    return state;
  }

  // What the next release would carry: the source as it stands now, against
  // what production last got. The test environment's own commit only tells us
  // whether test is looking at newer code than production.
  const head = entry.source ? sourceStatus(entry.source).commit : null;
  if (!prod.commit || !head) {
    state.summary = 'released, but the released commit is unknown';
    return state;
  }

  state.known = true;
  if (prod.commit === head) {
    state.summary = 'production is current';
    state.unreleased = 0;
  } else {
    state.changes = commitSubjects(prod.commit, head, entry.source);
    state.unreleased = state.changes.length;
    state.summary = state.unreleased
      ? `${state.unreleased} commit(s) unreleased`
      : 'production is behind by an unknown amount';
  }

  if (test?.commit && test.commit !== prod.commit) {
    // Only "ahead" if test really is newer, not merely different.
    state.test_ahead = isAncestor(prod.commit, test.commit);
  }
  return state;
}

/** Commit subjects touching `path` in (from, to], newest first. Empty on any doubt. */
function commitSubjects(from, to, path) {
  try {
    const out = git(['log', '--format=%s', `${from}..${to}`, '--', path]);
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

function isAncestor(older, newer) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', older, newer], {
      cwd: ROOT, stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Append one entry to the initiative's release history.
 *
 * A release is worth a durable record; the hundreds of test deploys that
 * preceded it are not. So this is written on a production release, and notes
 * the test environment's state at that moment as the one test observation
 * worth keeping.
 *
 * Best-effort throughout: a git call that fails costs a line of the entry, not
 * the release. This never throws.
 */
function appendReleaseHistory(dir, slug, entry, env, written, state) {
  if (env !== 'prod') return null;

  const path = join(dir, 'releases.md');
  const label = KINDS[entry.kind]?.label || entry.kind;
  const url = deploymentUrls(entry).prod;
  const lines = [];

  const heading = [
    `## ${String(written.deployed_at).slice(0, 10)}`,
    label,
    written.version !== undefined ? `version ${written.version}` : null
  ].filter(Boolean).join(' — ');
  lines.push(heading, '');

  if (url) lines.push(`<${url}>`, '');

  const facts = [];
  if (written.commit) facts.push(`Released \`${written.commit.slice(0, 7)}\``);
  if (state.known && state.unreleased) {
    facts.push(`${state.unreleased} commit(s) since the previous release`);
  }
  const test = environmentEntry(entry, 'test');
  if (test?.deployed_at) {
    facts.push(`test last deployed ${String(test.deployed_at).slice(0, 10)}`
      + (test.commit ? ` at \`${test.commit.slice(0, 7)}\`` : ''));
  }
  if (facts.length) lines.push(`${facts.join(' · ')}.`, '');

  if (state.changes.length) {
    // Naming the source makes the scope self-evident: these are the commits
    // that touched *this* directory, not everything that landed in the repo.
    lines.push(`Changes since the previous release, in \`${entry.source}\`:`, '');
    // Enough to see what shipped, not a changelog nobody reads.
    for (const change of state.changes.slice(0, 20)) lines.push(`- ${change}`);
    if (state.changes.length > 20) {
      lines.push(`- …and ${state.changes.length - 20} more`);
    }
    lines.push('');
  }

  appendReleaseLogLine(dir, label, written, url, state);

  try {
    // Newest first, so the current release is the first thing on the page.
    const header = '# Releases\n\nWritten by `initiatives.mjs deployments … record --env prod`.\nNewest first.\n';
    const existing = existsSync(path) ? readFileSync(path, 'utf8') : null;
    const body = existing
      ? existing.slice(existing.indexOf('\n## ') === -1 ? existing.length : existing.indexOf('\n## ') + 1)
      : '';
    writeFileSync(path, `${header}\n${lines.join('\n')}\n${body}`.replace(/\n{3,}$/, '\n\n'));
    return 'releases.md and log.md';
  } catch {
    return null;
  }
}

/**
 * One line in the initiative's narrative log, alongside its other notable
 * moments. `releases.md` is the detailed history; the log is where someone
 * reading the initiative's story finds out a release happened at all.
 *
 * Best-effort like the rest: a failed write costs the breadcrumb, not the
 * release.
 */
function appendReleaseLogLine(dir, label, written, url, state) {
  const path = join(dir, 'log.md');
  const detail = [
    label,
    written.version !== undefined ? `version ${written.version}` : null,
    written.commit ? `\`${written.commit.slice(0, 7)}\`` : null
  ].filter(Boolean).join(', ');

  const body = [
    `Released to production — ${detail}.`,
    state.known && state.unreleased
      ? ` ${state.unreleased} commit(s) since the previous release.`
      : '',
    url ? ` <${url}>` : '',
    ' See releases.md.'
  ].join('');

  try {
    const existing = existsSync(path) ? readFileSync(path, 'utf8').trimEnd() : '# Log';
    writeFileSync(path, `${existing}\n\n## ${String(written.deployed_at).slice(0, 10)} — Release\n\n${body}\n`);
  } catch { /* the breadcrumb is not worth failing a release over */ }
}

// --------------------------------------------------------------- reporting

/** Every deployment, both environments each, as the skills report them. */
export function formatDeployments(slug, data) {
  const list = deploymentList(data);
  const lines = [slug];
  if (!list.length) {
    lines.push('  not deployed anywhere');
    return lines.join('\n');
  }

  for (const entry of list) {
    const spec = KINDS[entry.kind] || { label: entry.kind };
    lines.push(`  ${spec.label} (${entry.kind}) from ${entry.source || '(no source)'}`);
    const urls = deploymentUrls(entry);
    for (const env of DEPLOY_ENVIRONMENTS) {
      const stored = environmentEntry(entry, env);
      const detail = stored ? [
        stored.access,
        stored.version !== undefined ? `v${stored.version}` : null,
        stored.deployed_at,
        stored.commit ? stored.commit.slice(0, 7) : null
      ].filter(Boolean).join(', ') : '';
      const where = urls[env]
        ? `${urls[env]}${detail ? `  (${detail})` : ''}`
        : (env === 'test' ? 'not deployed yet' : 'not released yet');
      lines.push(`    ${env.padEnd(5)} ${where}`);
    }
    const state = releaseState(entry);
    lines.push(`    status ${state.summary}${state.test_ahead ? ' (test is ahead)' : ''}`);
  }
  return lines.join('\n');
}

// ----------------------------------------------------------------- digest

/**
 * The sweep survey.
 *
 * Every item the design asks the survey to report is *derived* from
 * initiative.json, the files present, and git - none of it needs judgement. So
 * this is code rather than a prompt: it cannot hallucinate a blocker or miss a
 * stale initiative, it runs in milliseconds, and it costs nothing. A model is
 * only needed once the sweep starts doing work.
 *
 * `review:` blockers are the one exception - clearing them means asking GitHub
 * whether a pull request has closed - so they are listed for a caller that can
 * check rather than guessed at here.
 */
function buildDigest() {
  const { records, errors, warnings } = validate();
  const sweep = loadSweepConfig().config;
  const globalStaleness = Number.isFinite(sweep.staleness_days)
    ? sweep.staleness_days
    : DEFAULT_STALENESS_DAYS;

  const stageOf = new Map(
    records.filter((r) => r.data).map((r) => [r.slug, r.data.stage])
  );

  const digest = {
    generated: new Date().toISOString().slice(0, 10),
    total: records.length,
    unreadable: [],
    decisions: [],
    readyToUnblock: [],
    awaitingReview: [],
    waitingOnOthers: [],
    stale: [],
    idle: [],
    unreleased: [],
    initiatives: [],
    errors,
    warnings
  };

  for (const record of records) {
    if (record.error) {
      digest.unreadable.push({ slug: record.slug, reason: record.error });
      continue;
    }

    const data = record.data;
    const todo = data.todo || [];
    const actionable = todo.filter((item) => item.state === 'actionable');
    const blocked = todo.filter((item) => item.state === 'blocked');
    const age = daysSince(record.lastActivity);
    const threshold = Number.isFinite(data.staleness_days)
      ? data.staleness_days
      : globalStaleness;
    const resting = data.stage === 'dormant' || data.stage === 'archived';

    for (const item of blocked) {
      const raw = String(item.blocked_by || '');
      const prefix = raw.split(':', 1)[0];
      const detail = raw.slice(prefix.length + 1);
      const entry = { slug: record.slug, item: item.title || item.id, blocker: raw, detail };

      if (HUMAN_BLOCKERS.has(prefix)) {
        // Flagged rather than filtered: a proposable question still waits on
        // you, it just arrives as a pull request to judge instead of a blank
        // page to fill.
        digest.decisions.push({
          ...entry,
          kind: prefix,
          proposable: PROPOSABLE_BLOCKERS.has(prefix)
        });
      } else if (prefix === 'schedule') {
        const due = new Date(detail);
        if (!Number.isNaN(due.getTime()) && due.getTime() <= Date.now()) {
          digest.readyToUnblock.push({ ...entry, reason: `scheduled date ${detail} has passed` });
        }
      } else if (prefix === 'review') {
        digest.awaitingReview.push(entry);
      } else if (prefix === 'initiative') {
        digest.waitingOnOthers.push({
          ...entry,
          otherStage: stageOf.get(detail) || 'unknown initiative'
        });
      }
    }

    if (!resting && age !== null && age > threshold) {
      digest.stale.push({ slug: record.slug, days: age, threshold });
    }
    if (!resting && actionable.length === 0) {
      digest.idle.push({ slug: record.slug, stage: data.stage });
    }

    // Deployment currency, derived from the recorded commits rather than asked
    // of anyone. Reported, never acted on: a release is always a person's call.
    for (const entry of deploymentList(data)) {
      const state = releaseState(entry);
      if (state.released && state.known && state.unreleased) {
        digest.unreleased.push({
          slug: record.slug,
          kind: entry.kind,
          commits: state.unreleased,
          testAhead: state.test_ahead,
          latest: state.changes[0] || null
        });
      }
    }

    digest.initiatives.push({
      slug: record.slug,
      title: data.title || record.slug,
      stage: data.stage,
      next: actionable.length ? (actionable[0].title || actionable[0].id) : null,
      actionable: actionable.length,
      blocked: blocked.length,
      lastActivity: relativeDays(age)
    });
  }

  return digest;
}

function formatDigest(digest) {
  const out = [];
  const attention = digest.decisions.length + digest.readyToUnblock.length
    + digest.stale.length + digest.idle.length + digest.unreadable.length
    + digest.errors.length;

  out.push(`# Initiatives digest — ${digest.generated}`);
  out.push('');

  if (digest.total === 0) {
    out.push('No initiatives yet.');
    return out.join('\n');
  }

  out.push(attention === 0
    ? `${digest.total} initiative(s). Nothing needs your attention.`
    : `${digest.total} initiative(s). **${attention} thing(s) need your attention.**`);
  out.push('');

  const section = (title, rows) => {
    if (!rows.length) return;
    out.push(`## ${title}`, '');
    out.push(...rows);
    out.push('');
  };

  // The most valuable part: what the sweep cannot decide for itself. A
  // proposable entry is still yours to settle - it just arrives as a pull
  // request rather than a blank page.
  section('Waiting on a decision from you', digest.decisions.map(
    (d) => `- **${d.slug}** — ${d.item}\n  - \`${d.kind}\`: ${d.detail}`
      + (d.proposable ? '\n  - the sweep can propose an answer to this' : '')
  ));

  section('Cannot be read', digest.unreadable.map(
    (u) => `- **${u.slug}** — ${u.reason}`
  ));

  // Informational: releasing is a person's decision, so this is a list to read
  // rather than work to pick up.
  section('Unreleased work', digest.unreleased.map(
    (u) => `- **${u.slug}** (${u.kind}) — ${u.commits} commit(s) since the last release`
      + (u.testAhead ? ', already on test' : '')
      + (u.latest ? `\n  - latest: ${u.latest}` : '')
  ));

  section('Invalid', digest.errors.map((e) => `- ${e}`));

  section('Ready to unblock', digest.readyToUnblock.map(
    (r) => `- **${r.slug}** — ${r.item} (${r.reason})`
  ));

  section('Awaiting review', digest.awaitingReview.map(
    (r) => `- **${r.slug}** — ${r.item} (${r.blocker})`
  ));

  section('Waiting on another initiative', digest.waitingOnOthers.map(
    (w) => `- **${w.slug}** — ${w.item} (waiting on \`${w.detail}\`, currently *${w.otherStage}*)`
  ));

  section('Stale', digest.stale.map(
    (s) => `- **${s.slug}** — no activity for ${s.days} days (threshold ${s.threshold})`
  ));

  section('Nothing actionable, and not dormant', digest.idle.map(
    (i) => `- **${i.slug}** — stage *${i.stage}*`
  ));

  out.push('## State', '');
  out.push('| Initiative | Stage | Next | Blocked | Last activity |');
  out.push('|---|---|---|---|---|');
  for (const row of digest.initiatives) {
    out.push(`| ${row.title} | ${row.stage} | ${row.next || '—'} | ${row.blocked || '—'} | ${row.lastActivity} |`);
  }

  return out.join('\n');
}

// ------------------------------------------------------- selecting work

const VALUE_WEIGHT = { high: 3, medium: 2, low: 1 };
const EFFORT_WEIGHT = { small: 1, medium: 2, large: 3 };

/** An item that advances the lifecycle beats a slightly juicier item that does not. */
const STAGE_GATE_BONUS = 3;
/** Neglect compounds: at twice the staleness threshold an initiative gains this much. */
const MAX_STALENESS_BONUS = 2;

function weight(table, key, fallback) {
  return table[String(key || '').toLowerCase()] ?? fallback;
}

/**
 * The configuration a selecting phase runs under, resolved once.
 *
 * `spent` is what earlier phases of the same run have already used. Review
 * responses and proposals come out of the same `items_per_run` as new work,
 * taken in phase order, so the remaining budget is arithmetic rather than
 * something the prompt has to reason about.
 */
function runContext({ claimed = [], openPrs = 0, spent = 0 } = {}) {
  const sweep = loadSweepConfig().config;
  const perRun = Number.isFinite(sweep.items_per_run) ? sweep.items_per_run : 1;
  const maxOpen = Number.isFinite(sweep.max_open_prs) ? sweep.max_open_prs : 4;

  return {
    sweep,
    phases: sweep.phases || ['survey'],
    perRun,
    perInitiative: Number.isFinite(sweep.max_items_per_initiative)
      ? sweep.max_items_per_initiative
      : 1,
    maxOpen,
    openPrs,
    spent,
    remaining: Math.min(perRun - spent, maxOpen - openPrs),
    globalStaleness: Number.isFinite(sweep.staleness_days)
      ? sweep.staleness_days
      : DEFAULT_STALENESS_DAYS,
    // sweep/<slug>/<branch-suffix> - the branch name is the record of what is
    // claimed, so no second source of truth is needed.
    claimedItems: new Set(
      claimed
        .map((branch) => branch.trim().replace(/^sweep\//, ''))
        .filter(Boolean)
    )
  };
}

/** Why a phase cannot proceed at all, or null when it can. */
function phaseStop(ctx, phase) {
  // The config is the switch. If a phase is not enabled, nothing is selected -
  // enabling it has to be a reviewable commit, not a persuasive prompt.
  if (!ctx.phases.includes(phase)) {
    return `sweep.json does not enable the "${phase}" phase`;
  }
  if (ctx.openPrs >= ctx.maxOpen) {
    return `already ${ctx.openPrs} open sweep PR(s), at the max_open_prs limit of ${ctx.maxOpen}`;
  }
  if (ctx.remaining <= 0) {
    return `the budget of ${ctx.perRun} item(s) is already spent (${ctx.spent} used earlier this run)`;
  }
  return null;
}

function stalenessBonusFor(record, ctx) {
  const age = daysSince(record.lastActivity);
  const threshold = Number.isFinite(record.data.staleness_days)
    ? record.data.staleness_days
    : ctx.globalStaleness;
  return age === null ? 0 : Math.min(age / Math.max(threshold, 1), MAX_STALENESS_BONUS);
}

function scoreItem(data, item, stalenessBonus) {
  const effort = weight(EFFORT_WEIGHT, item.effort, 2);
  const score = (weight(VALUE_WEIGHT, data.value, 2) * weight(VALUE_WEIGHT, item.value, 2)) / effort
    + (item.advances_stage ? STAGE_GATE_BONUS : 0)
    + stalenessBonus;
  return Math.round(score * 100) / 100;
}

/** Rank, then apply the run budget and the per-initiative cap. */
function applyBudget(candidates, ctx, result) {
  candidates.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  const perInitiativeCount = new Map();
  for (const candidate of candidates) {
    if (result.selected.length >= ctx.remaining) {
      result.skipped.push({ ...candidate, reason: 'budget for this run is spent' });
      continue;
    }
    const taken = perInitiativeCount.get(candidate.slug) || 0;
    if (taken >= ctx.perInitiative) {
      result.skipped.push({
        ...candidate,
        reason: `max_items_per_initiative (${ctx.perInitiative}) reached`
      });
      continue;
    }
    perInitiativeCount.set(candidate.slug, taken + 1);
    result.selected.push(candidate);
  }
  return result;
}

/**
 * Which items a sweep run should work on.
 *
 * Ranking is arithmetic over recorded state — value, effort, whether the item
 * advances the stage, how long the initiative has been untouched — so like the
 * survey it is computed rather than judged. Leaving it to the model would mean
 * the definition of "most important" quietly changing between runs, and no way
 * to test it.
 *
 * @param {object} options
 * @param {string[]} options.claimed   branches of open sweep PRs
 * @param {number}   options.openPrs   how many sweep PRs are already open
 * @param {number}   options.spent     budget used by earlier phases of this run
 */
function selectWork({ claimed = [], openPrs = 0, spent = 0 } = {}) {
  const ctx = runContext({ claimed, openPrs, spent });
  const effortCeiling = weight(EFFORT_WEIGHT, ctx.sweep.max_effort, 3);
  const result = { phases: ctx.phases, selected: [], skipped: [], stop: phaseStop(ctx, 'work') };
  if (result.stop) return result;

  const candidates = [];
  for (const record of loadAll()) {
    if (record.error) {
      result.skipped.push({ slug: record.slug, reason: record.error });
      continue;
    }
    const data = record.data;
    const stalenessBonus = stalenessBonusFor(record, ctx);

    for (const item of data.todo || []) {
      if (item.state !== 'actionable') continue;

      if (ctx.claimedItems.has(`${record.slug}/${item.id}`)) {
        result.skipped.push({ slug: record.slug, item: item.id, reason: 'already has an open sweep PR' });
        continue;
      }
      if (weight(EFFORT_WEIGHT, item.effort, 2) > effortCeiling) {
        result.skipped.push({
          slug: record.slug,
          item: item.id,
          reason: `effort "${item.effort}" exceeds max_effort "${ctx.sweep.max_effort}"`
        });
        continue;
      }

      candidates.push({
        slug: record.slug,
        item: item.id,
        title: item.title || item.id,
        branch: `sweep/${record.slug}/${item.id}`,
        score: scoreItem(data, item, stalenessBonus),
        advancesStage: Boolean(item.advances_stage),
        effort: item.effort || 'medium'
      });
    }
  }

  return applyBudget(candidates, ctx, result);
}

/**
 * Which open questions this run should propose an answer to.
 *
 * Only `human:` blockers qualify. `permission:`, `cost:` and `legal:` need the
 * user's authority and `data:` needs a fact only they have, so a proposal for
 * one of those would be a fabrication - they are reported separately as things
 * that can never become a pull request.
 *
 * `max_effort` deliberately does not apply. It caps the work the sweep may
 * attempt unattended, and composing a proposal is not doing the item: a large
 * item's question is often exactly the one worth answering first.
 */
function selectProposals({ claimed = [], openPrs = 0, spent = 0 } = {}) {
  const ctx = runContext({ claimed, openPrs, spent });
  const result = {
    phases: ctx.phases,
    selected: [],
    skipped: [],
    notProposable: [],
    stop: phaseStop(ctx, 'propose')
  };
  if (result.stop) return result;

  const candidates = [];
  for (const record of loadAll()) {
    if (record.error) {
      result.skipped.push({ slug: record.slug, reason: record.error });
      continue;
    }
    const data = record.data;
    const stalenessBonus = stalenessBonusFor(record, ctx);

    for (const item of data.todo || []) {
      if (item.state !== 'blocked') continue;
      const raw = String(item.blocked_by || '');
      const prefix = raw.split(':', 1)[0];
      const question = raw.slice(prefix.length + 1);

      if (!PROPOSABLE_BLOCKERS.has(prefix)) {
        if (HUMAN_BLOCKERS.has(prefix)) {
          result.notProposable.push({
            slug: record.slug,
            item: item.id,
            title: item.title || item.id,
            blocker: raw,
            reason: prefix === 'data'
              ? `"${prefix}" needs a fact only you have, not reasoning`
              : `"${prefix}" needs your authority, not reasoning`
          });
        }
        continue;
      }

      // A proposal branch is namespaced so it cannot collide with the work
      // branch for the same item once the answer merges and the item unblocks.
      const branch = `sweep/${record.slug}/propose-${item.id}`;
      if (ctx.claimedItems.has(`${record.slug}/propose-${item.id}`)) {
        result.skipped.push({
          slug: record.slug,
          item: item.id,
          reason: 'already has an open proposal PR'
        });
        continue;
      }

      candidates.push({
        slug: record.slug,
        item: item.id,
        title: item.title || item.id,
        question,
        blocker: raw,
        branch,
        score: scoreItem(data, item, stalenessBonus),
        advancesStage: Boolean(item.advances_stage)
      });
    }
  }

  return applyBudget(candidates, ctx, result);
}

function formatSelection(selection) {
  if (selection.stop) return `No new work: ${selection.stop}`;
  if (!selection.selected.length) {
    return 'No new work: nothing actionable is available.';
  }
  const lines = ['Work for this run:', ''];
  for (const item of selection.selected) {
    lines.push(`- ${item.slug}/${item.item} — ${item.title}`);
    lines.push(`  branch: ${item.branch}  score: ${item.score}${item.advancesStage ? '  (advances the stage)' : ''}`);
  }
  if (selection.skipped.length) {
    lines.push('', 'Not this run:');
    for (const skip of selection.skipped) {
      lines.push(`- ${skip.slug}${skip.item ? `/${skip.item}` : ''} — ${skip.reason}`);
    }
  }
  return lines.join('\n');
}

function formatProposals(selection) {
  const lines = [];
  if (selection.stop) {
    lines.push(`No proposals: ${selection.stop}`);
  } else if (!selection.selected.length) {
    lines.push('No proposals: no question is waiting on a judgement call.');
  } else {
    lines.push('Answers to propose this run:', '');
    for (const item of selection.selected) {
      lines.push(`- ${item.slug}/${item.item} — ${item.title}`);
      lines.push(`  question: ${item.question}`);
      lines.push(`  branch: ${item.branch}  score: ${item.score}`);
    }
    if (selection.skipped.length) {
      lines.push('', 'Not this run:');
      for (const skip of selection.skipped) {
        lines.push(`- ${skip.slug}${skip.item ? `/${skip.item}` : ''} — ${skip.reason}`);
      }
    }
  }

  // Reported next to the selection, because these are the entries that stay in
  // the digest issue: no amount of reasoning can advance them.
  if (selection.notProposable?.length) {
    lines.push('', 'Never proposable — these need you:');
    for (const entry of selection.notProposable) {
      lines.push(`- ${entry.slug}/${entry.item} — \`${entry.blocker}\` (${entry.reason})`);
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------- adding work

/**
 * Add a todo item.
 *
 * The system could remove items and never create one, so the todo list could
 * only ever run down. That is how an initiative reaches a stage with nothing
 * left to do and no sign anything is wrong: `select` has nothing to rank, and
 * the digest reports a quiet initiative rather than a stalled one.
 *
 * Authoring items by hand-editing the JSON is what this exists to stop, for the
 * same reason `complete` exists - the fields a person forgets are exactly the
 * ones the ranking and the validator depend on.
 */
function addItem(slug, itemId, {
  title, value = 'medium', effort = 'medium', blockedBy, advancesStage = false
} = {}) {
  const record = loadInitiative(slug);
  if (record.error) throw new Error(`${slug}: ${record.error}`);
  if (!title) throw new Error(`${slug}: an item needs a --title`);

  const data = record.data;
  data.todo = data.todo || [];
  if (data.todo.some((item) => item.id === itemId)) {
    throw new Error(`${slug}: a todo item with id "${itemId}" already exists`);
  }
  if (!(value in VALUE_WEIGHT)) throw new Error(`unknown value "${value}"`);
  if (!(effort in EFFORT_WEIGHT)) throw new Error(`unknown effort "${effort}"`);

  const item = {
    id: itemId,
    title,
    state: blockedBy ? 'blocked' : 'actionable',
    value,
    effort,
    advances_stage: Boolean(advancesStage)
  };
  if (blockedBy) {
    const prefix = String(blockedBy).split(':', 1)[0];
    if (!BLOCKER_PREFIXES.includes(prefix)) {
      throw new Error(`unknown blocker prefix "${prefix}" in "${blockedBy}"`);
    }
    if (prefix === 'todo' && !data.todo.some(
      (other) => other.id === String(blockedBy).slice('todo:'.length)
    )) {
      throw new Error(`${slug}: blocked by "${blockedBy}", which does not exist`);
    }
    item.blocked_by = blockedBy;
  }

  data.todo.push(item);
  writeFileSync(
    join(record.dir, 'initiative.json'),
    `${JSON.stringify(data, null, 2)}\n`
  );
  return [`added "${title}"${blockedBy ? ` (blocked on ${blockedBy})` : ''}`];
}

// ------------------------------------------------------- completing work

/**
 * Record an item as done, exactly as §6.3 requires.
 *
 * These are the mechanics a model editing JSON by hand gets subtly wrong -
 * forgetting a dependent item, or leaving the log unwritten - so they are done
 * once, here. The change still only takes effect when the pull request merges.
 */
function completeItem(slug, itemId, { note, stage } = {}) {
  const record = loadInitiative(slug);
  if (record.error) throw new Error(`${slug}: ${record.error}`);

  const data = record.data;
  const index = (data.todo || []).findIndex((item) => item.id === itemId);
  if (index === -1) throw new Error(`${slug}: no todo item with id "${itemId}"`);

  const [done] = data.todo.splice(index, 1);
  const changes = [`removed "${done.title || done.id}"`];

  if (done.state !== 'actionable') {
    changes.push(`warning: it was "${done.state}", not actionable`);
  }

  // Anything waiting on this item is now free. A dangling todo: reference is a
  // build error, so a missed unblock cannot pass unnoticed - but it should not
  // get that far.
  for (const item of data.todo) {
    if (item.state === 'blocked' && item.blocked_by === `todo:${itemId}`) {
      item.state = 'actionable';
      delete item.blocked_by;
      changes.push(`unblocked "${item.title || item.id}"`);
    }
  }

  if (stage) {
    if (!STAGES.includes(stage)) throw new Error(`unknown stage "${stage}"`);
    changes.push(`stage ${data.stage} → ${stage}`);
    const enteringRefining = stage === 'refining' && data.stage !== 'refining';
    data.stage = stage;

    // Reaching `refining` means the output has an audience, which creates work
    // that nothing else in the lifecycle asks for. Seeding it here rather than
    // trusting the transition to be remembered is the whole point.
    if (enteringRefining) {
      for (const seed of REFINING_ENTRY_ITEMS) {
        if (data.todo.some((item) => item.id === seed.id)) continue;
        data.todo.push({ ...seed });
        changes.push(`seeded "${seed.title}"`);
      }
    }
  } else if (done.advances_stage) {
    changes.push('warning: this item advances the stage, but no --stage was given');
  }

  // The durable half of §5.1: an initiative may not be left with nothing to do
  // unless someone has decided it is finished. Refusing here rather than
  // warning later is the difference between a rule and a wish - a warning at
  // validate time is read after the fact, by which point the initiative has
  // already gone quiet and nobody is looking.
  if (!RESTING_STAGES.has(data.stage) && data.todo.length === 0) {
    throw new Error(
      `${slug}: completing "${itemId}" would leave nothing to do at stage `
      + `"${data.stage}", and an initiative with no work is either finished or `
      + `forgotten. Either seed what comes next:\n`
      + `  node scripts/initiatives.mjs add ${slug} <item-id> --title "..." `
      + `[--effort small|medium|large] [--advances-stage]\n`
      + `or, if the user has said it is finished:\n`
      + `  node scripts/initiatives.mjs complete ${slug} ${itemId} --stage dormant`
    );
  }

  writeFileSync(
    join(record.dir, 'initiative.json'),
    `${JSON.stringify(data, null, 2)}\n`
  );

  const today = new Date().toISOString().slice(0, 10);
  const logPath = join(record.dir, 'log.md');
  const existing = existsSync(logPath) ? readFileSync(logPath, 'utf8').trimEnd() : '# Log';
  const entry = [
    '',
    '',
    `## ${today} — ${done.title || done.id}`,
    '',
    note || 'Completed.'
  ].join('\n');
  writeFileSync(logPath, `${existing}${entry}\n`);
  changes.push('appended to log.md');

  return changes;
}

// ---------------------------------------------------------- write scope

/**
 * Whether a set of changed files stays inside what a sweep PR may touch.
 *
 * This is the invariant that lets several sweep PRs merge in any order, and it
 * was previously only a sentence in a prompt. Enforcing it in CI means it holds
 * whether or not the agent remembered it.
 */
function checkScope(slug, files) {
  const sweep = loadSweepConfig().config;
  const protectedPaths = sweep.protected_paths || [];
  const record = loadInitiative(slug);

  const allowed = [`initiatives/${slug}/`];
  if (!record.error) {
    for (const output of record.data.outputs || []) {
      if (output.path) allowed.push(`${output.path.replace(/\/$/, '')}/`);
    }
  }

  const violations = [];
  for (const file of files) {
    const path = file.trim();
    if (!path) continue;

    const blocked = protectedPaths.find((prefix) => path.startsWith(prefix));
    if (blocked) {
      violations.push({ path, reason: `protected path (${blocked})` });
      continue;
    }
    if (!allowed.some((prefix) => path.startsWith(prefix))) {
      violations.push({ path, reason: 'outside this initiative and its declared outputs' });
    }
  }

  return { slug, allowed, violations, unreadable: record.error || null };
}

// -------------------------------------------------------------- rendering

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A deliberately small markdown renderer, for documents we write ourselves.
 *
 * The design recommended a client-side widget, with build-time rendering as the
 * runner-up "if the build already grows a markdown dependency for another
 * reason". Validation made this part of the build Node anyway, which is that
 * reason - and rendering here means no client JS, no fetch, and no flash of an
 * unrendered page. The source of truth is still the .md file, so this stays
 * reversible.
 *
 * Supported: headings, paragraphs, lists, fenced code, blockquotes, tables,
 * horizontal rules, links, bold, italic, inline code.
 */
function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let index = 0;

  const inline = (text) => escapeHtml(text)
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
      `<a href="${href}">${label}</a>`);

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) { index += 1; continue; }

    if (line.startsWith('```')) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push('<hr>');
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith('>')) {
      const quote = [];
      while (index < lines.length && lines[index].trimStart().startsWith('>')) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      out.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`);
      continue;
    }

    if (line.includes('|') && /^\s*\|?[-:\s|]+\|[-:\s|]*$/.test(lines[index + 1] || '')) {
      const rows = [];
      while (index < lines.length && lines[index].includes('|')) {
        rows.push(lines[index]);
        index += 1;
      }
      const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '')
        .split('|').map((cell) => cell.trim());
      const header = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(
        '<div class="table-scroll"><table><thead><tr>'
        + header.map((cell) => `<th>${inline(cell)}</th>`).join('')
        + '</tr></thead><tbody>'
        + body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')
        + '</tbody></table></div>'
      );
      continue;
    }

    const bullet = /^\s*[-*+]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line) && !bullet.test(line);
      const pattern = ordered ? numbered : bullet;
      const items = [];
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(lines[index].replace(pattern, ''));
        index += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim()
      && !lines[index].startsWith('```')
      && !/^#{1,6}\s/.test(lines[index])
      && !bullet.test(lines[index]) && !numbered.test(lines[index])
      && !lines[index].trimStart().startsWith('>')) {
      paragraph.push(lines[index]);
      index += 1;
    }
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  return out.join('\n');
}

function documentsFor(record) {
  return DOCUMENTS
    .filter(([file]) => existsSync(join(record.dir, file)))
    .map(([file, title]) => ({
      file,
      title,
      output: `${file.replace(/\.md$/, '')}.html`
    }));
}

function stageBadge(stage) {
  return `<span class="tag">${escapeHtml(stage || 'unknown')}</span>`;
}

function card(title, id, body) {
  return `  <main class="card" aria-labelledby="${id}">
    <div class="card-header">
      <h2 id="${id}">${escapeHtml(title)}</h2>
    </div>
    <div class="card-content">
${body}
    </div>
  </main>`;
}

/** The initiatives TOC: what this collection is, then one entry per initiative. */
function renderToc() {
  const { records } = validate();
  const parts = [];

  parts.push(card('What initiatives are', 'initiatives-about', `      <p>An <strong>initiative</strong> is a durable unit of intent: the wish behind a piece of
      work, the documents that elaborate it, the capability it develops, and pointers to
      whatever it produced. Unlike a project it does not end - it goes dormant, and can be
      revisited later to produce a new version using the tooling it built the first time.</p>
      <p>An initiative can produce a deck, a demo, code that runs somewhere else entirely, or
      nothing published at all - one whose only output is a reusable script or skill is still
      an initiative.</p>
      <p>Each moves through a lifecycle, and carries a list of what is actionable and what is
      blocked:</p>
      <p><code>wish → shaped → specified → planned → building → refining → dormant</code></p>`));

  if (!records.length) {
    parts.push(card('Initiatives', 'initiative-list',
      '      <p>No initiatives yet.</p>'));
    return parts.join('\n');
  }

  const rows = records.map((record) => {
    if (record.error) {
      return `        <li class="toc-item">
          <h3>${escapeHtml(record.slug)}</h3>
          <p><strong>Cannot be read:</strong> ${escapeHtml(record.error)}</p>
        </li>`;
    }
    const data = record.data;
    const todo = data.todo || [];
    const next = todo.find((item) => item.state === 'actionable');
    const blocked = todo.filter((item) => item.state === 'blocked');
    const bits = [
      stageBadge(data.stage),
      next ? `Next: ${escapeHtml(next.title)}` : '<strong>Nothing actionable</strong>',
      blocked.length ? `${blocked.length} blocked` : null,
      relativeDays(daysSince(record.lastActivity))
    ].filter(Boolean);

    return `        <li class="toc-item">
          <h3><a href="./${escapeHtml(record.slug)}/index.html">${escapeHtml(data.title || record.slug)}</a></h3>
          <p>${escapeHtml(data.summary || '')}</p>
          <p class="meta">${bits.join(' · ')}</p>
        </li>`;
  });

  parts.push(card('Initiatives', 'initiative-list',
    `      <ul class="toc-grid">\n${rows.join('\n')}\n      </ul>`));
  return parts.join('\n');
}

/** One initiative's overview page. Everything here is derived, so it cannot drift. */
function renderPage(slug) {
  const record = loadInitiative(slug);
  if (record.error) {
    return card('Unreadable initiative', 'initiative-error',
      `      <p>${escapeHtml(record.error)}</p>`);
  }

  const data = record.data;
  const todo = data.todo || [];
  const actionable = todo.filter((item) => item.state === 'actionable');
  const blocked = todo.filter((item) => item.state === 'blocked');
  const parts = [];

  const wishPath = join(record.dir, 'wish.md');
  const purpose = existsSync(wishPath)
    ? renderMarkdown(readFileSync(wishPath, 'utf8').replace(/^#\s+Wish\s*$/m, ''))
    : `<p>${escapeHtml(data.summary || '')}</p>`;

  parts.push(card('Purpose', 'initiative-purpose', purpose));

  parts.push(card('Status', 'initiative-status', `      <ul>
        <li>Stage: ${stageBadge(data.stage)}</li>
        <li>Value: ${escapeHtml(data.value || 'unset')}</li>
        <li>Last activity: ${escapeHtml(relativeDays(daysSince(record.lastActivity)))}</li>
      </ul>`));

  parts.push(card("What's next", 'initiative-next', actionable.length
    ? `      <ul>\n${actionable.map((item) =>
      `        <li>${escapeHtml(item.title)}${item.advances_stage ? ' <em>(advances the stage)</em>' : ''}</li>`
    ).join('\n')}\n      </ul>`
    : '      <p>Nothing actionable.</p>'));

  if (blocked.length) {
    parts.push(card("What's blocked", 'initiative-blocked',
      `      <ul>\n${blocked.map((item) => {
        const prefix = String(item.blocked_by).split(':', 1)[0];
        const kind = HUMAN_BLOCKERS.has(prefix) ? 'needs a decision' : 'clears on its own';
        return `        <li>${escapeHtml(item.title)} — <code>${escapeHtml(item.blocked_by)}</code> <em>(${kind})</em></li>`;
      }).join('\n')}\n      </ul>`));
  }

  // Every deployment, both environments each - a pair is only useful if you can
  // see at a glance which one is ahead, and a row is never simply missing.
  const deployments = (data.deployments || []).filter(
    (entry) => entry && typeof entry === 'object'
  );
  if (deployments.length) {
    parts.push(card('Deployments', 'initiative-deployments',
      deployments.map((entry) => {
        const urls = deploymentUrls(entry);
        const rows = DEPLOY_ENVIRONMENTS.map((env) => {
          const label = env === 'test' ? 'Test' : 'Production';
          const stored = entry[env] && typeof entry[env] === 'object' ? entry[env] : null;
          if (!urls[env]) {
            return `        <li>${label} — <em>${env === 'test' ? 'not deployed yet' : 'not released yet'}</em></li>`;
          }
          const detail = [
            stored?.access,
            stored?.version !== undefined ? `version ${stored.version}` : null,
            stored?.deployed_at ? `deployed ${String(stored.deployed_at).slice(0, 10)}` : null,
            // On main the preview is production, so say that rather than
            // showing one URL twice under two labels with no explanation.
            !stored && env === 'test'
              ? (urls.test === urls.prod ? 'published from main' : 'branch preview')
              : null
          ].filter(Boolean).join(', ');
          return `        <li>${label} — <a href="${escapeHtml(urls[env])}">${escapeHtml(urls[env])}</a>`
            + `${detail ? ` <em>(${escapeHtml(detail)})</em>` : ''}</li>`;
        }).join('\n');
        const heading = escapeHtml(DEPLOYMENT_LABELS[entry.kind] || entry.kind || 'Deployment');
        // Whether production is the latest, derived from the two recorded
        // commits - so the page cannot claim a currency it has not checked.
        const state = releaseState(entry);
        const status = escapeHtml(state.summary
          + (state.test_ahead ? ', and test is ahead of production' : ''));
        return `      <p><strong>${heading}</strong></p>\n      <ul>\n${rows}\n      </ul>\n`
          + `      <p class="deployment-status">${status}</p>`;
      }).join('\n')));
  }

  const outputs = data.outputs || [];
  if (outputs.length) {
    parts.push(card('Outputs', 'initiative-outputs',
      `      <ul>\n${outputs.map((output) => {
        const label = escapeHtml(output.path || output.url || '');
        const href = output.url || `../../${output.path}/`;
        return `        <li><a href="${escapeHtml(href)}">${label}</a> — ${escapeHtml(output.kind || '')}, ${escapeHtml(output.status || '')}</li>`;
      }).join('\n')}\n      </ul>`));
  }

  const docs = documentsFor(record);
  if (docs.length) {
    parts.push(card('Documents', 'initiative-documents',
      `      <ul>\n${docs.map((doc) =>
        `        <li><a href="./${escapeHtml(doc.output)}">${escapeHtml(doc.title)}</a></li>`
      ).join('\n')}\n      </ul>`));
  }

  const overviewPath = join(record.dir, 'overview.md');
  if (existsSync(overviewPath)) {
    parts.push(card('Overview', 'initiative-overview',
      renderMarkdown(readFileSync(overviewPath, 'utf8'))));
  }

  return parts.join('\n');
}

function renderDoc(slug, file) {
  const path = join(INITIATIVES_DIR, slug, file);
  if (!existsSync(path)) {
    return card('Missing document', 'doc-missing',
      `      <p>${escapeHtml(file)} does not exist.</p>`);
  }
  const title = (DOCUMENTS.find(([name]) => name === file) || [null, file])[1];
  return card(title, 'doc-body', renderMarkdown(readFileSync(path, 'utf8')));
}

// -------------------------------------------------------------------- cli

// Dispatch only when this file is run as a program. Importing it - which the
// repo guide's generator does, to read the constants above rather than keep a
// second copy of them - must not run a command or exit the process.
//
// The `switch` is the body of the `if` without braces, deliberately: wrapping it
// would re-indent every case below and bury the change in whitespace.
const RUN_AS_CLI = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const [command, ...args] = process.argv.slice(2);

if (RUN_AS_CLI) switch (command) {
  case 'validate': {
    const { errors, warnings } = validate();
    for (const warning of warnings) console.log(`INITIATIVE WARN: ${warning}`);
    for (const error of errors) console.error(`INITIATIVE FAIL: ${error}`);
    if (errors.length) process.exit(1);
    console.log(`INITIATIVE PASS: ${listSlugs().length} initiative(s) validated`);
    break;
  }
  case 'digest': {
    const digest = buildDigest();
    console.log(args.includes('--json')
      ? JSON.stringify(digest, null, 2)
      : formatDigest(digest));
    break;
  }
  case 'propose':
  case 'select': {
    const claimedArg = args[args.indexOf('--claimed') + 1];
    const options = {
      claimed: args.includes('--claimed') && claimedArg ? claimedArg.split(',') : [],
      openPrs: args.includes('--open-prs') ? Number(args[args.indexOf('--open-prs') + 1]) || 0 : 0,
      spent: args.includes('--spent') ? Number(args[args.indexOf('--spent') + 1]) || 0 : 0
    };
    const proposing = command === 'propose';
    const selection = proposing ? selectProposals(options) : selectWork(options);
    console.log(args.includes('--json')
      ? JSON.stringify(selection, null, 2)
      : (proposing ? formatProposals(selection) : formatSelection(selection)));
    break;
  }
  case 'add': {
    const [slug, itemId] = args;
    if (!slug || !itemId) {
      console.error('usage: initiatives.mjs add <slug> <item-id> --title "..." '
        + '[--value high|medium|low] [--effort small|medium|large] '
        + '[--blocked-by <prefix:text>] [--advances-stage]');
      process.exit(2);
    }
    const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
    try {
      const changes = addItem(slug, itemId, {
        title: flag('--title'),
        value: flag('--value') || 'medium',
        effort: flag('--effort') || 'medium',
        blockedBy: flag('--blocked-by'),
        advancesStage: args.includes('--advances-stage')
      });
      for (const change of changes) console.log(change);
    } catch (err) {
      console.error(`INITIATIVE FAIL: ${err.message}`);
      process.exit(1);
    }
    break;
  }
  case 'complete': {
    const [slug, itemId] = args;
    if (!slug || !itemId) {
      console.error('usage: initiatives.mjs complete <slug> <item-id> [--note "..."] [--stage <stage>]');
      process.exit(2);
    }
    try {
      const changes = completeItem(slug, itemId, {
        note: args.includes('--note') ? args[args.indexOf('--note') + 1] : undefined,
        stage: args.includes('--stage') ? args[args.indexOf('--stage') + 1] : undefined
      });
      for (const change of changes) console.log(change);
    } catch (err) {
      console.error(`INITIATIVE FAIL: ${err.message}`);
      process.exit(1);
    }
    break;
  }
  case 'check-scope': {
    const slug = args[0];
    let files = [];
    if (args.includes('--files-from')) {
      const path = args[args.indexOf('--files-from') + 1];
      files = readFileSync(path, 'utf8').split('\n');
    } else if (args.includes('--files')) {
      files = args.slice(args.indexOf('--files') + 1);
    }
    if (!slug) {
      console.error('usage: initiatives.mjs check-scope <slug> --files <path>... | --files-from <file>');
      process.exit(2);
    }
    const scope = checkScope(slug, files);
    if (scope.unreadable) {
      console.error(`INITIATIVE FAIL: ${slug}: ${scope.unreadable}`);
      process.exit(1);
    }
    if (scope.violations.length) {
      console.error(`INITIATIVE FAIL: ${scope.violations.length} file(s) outside the write scope for ${slug}`);
      console.error(`Allowed: ${scope.allowed.join(', ')}`);
      for (const violation of scope.violations) {
        console.error(`  ${violation.path} — ${violation.reason}`);
      }
      process.exit(1);
    }
    console.log(`INITIATIVE PASS: ${files.filter((f) => f.trim()).length} changed file(s) within scope for ${slug}`);
    break;
  }
  case 'deployments': {
    const [slug, sub] = args;
    const json = args.includes('--json');
    const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

    if (!slug) {
      console.error('usage: initiatives.mjs deployments <slug> [--json]\n'
        + '       initiatives.mjs deployments <slug> plan --env test|prod [--kind <kind>] [--json]\n'
        + '       initiatives.mjs deployments <slug> record --env test|prod [--kind <kind>]\n'
        + '         ChatGPT Site: --site-slug <slug> --url <https://...> [--access private|public] [--version n]\n'
        + '         demo:         (no target arguments - the URL comes from the destination)\n'
        + '         both:         [--commit <sha>]');
      process.exit(2);
    }

    try {
      if (sub === 'plan') {
        const plan = deploymentPlan(slug, flag('--env'), { kind: flag('--kind') });
        console.log(json ? JSON.stringify(plan, null, 2) : [
          `${plan.slug} ${plan.environment}: ${plan.deployable ? `${plan.mode} ` : ''}`
            + `${plan.label} deployment of ${plan.source} (${plan.source_files} file(s))`,
          `  engine: ${plan.engine}`,
          ...(plan.note ? [`  note:   ${plan.note}`] : []),
          `  test:   ${plan.urls.test || 'not deployed yet'}`,
          `  prod:   ${plan.urls.prod || 'not released yet'}`,
          `  status: ${plan.release.summary}${plan.release.test_ahead ? ' (test is ahead of production)' : ''}`,
          ...plan.release.changes.slice(0, 10).map((change) => `    - ${change}`),
          ...plan.blockers.map((blocker) => `  BLOCKED: ${blocker}`)
        ].join('\n'));
        // The release gate is code, not a prompt: a caller that ignores this
        // exit code has to do so deliberately.
        if (!plan.ready) process.exit(1);
        break;
      }

      if (sub === 'record') {
        const result = recordDeployment(slug, flag('--env'), {
          kind: flag('--kind'),
          siteSlug: flag('--site-slug'),
          url: flag('--url'),
          access: flag('--access'),
          version: flag('--version'),
          commit: flag('--commit'),
          deployedAt: flag('--deployed-at')
        });
        console.log(json ? JSON.stringify(result, null, 2) : [
          `recorded ${result.slug} ${result.kind} ${result.environment}`,
          `  test: ${result.urls.test || 'not deployed yet'}`,
          `  prod: ${result.urls.prod || 'not released yet'}`,
          ...(result.history ? [`  history: ${result.history} updated`] : [])
        ].join('\n'));
        break;
      }

      const record = loadInitiative(slug);
      if (record.error) throw new Error(`${slug}: ${record.error}`);
      console.log(json
        ? JSON.stringify({
          slug,
          deployments: (record.data.deployments || []).map((entry) => ({
            kind: entry.kind,
            source: entry.source || null,
            urls: deploymentUrls(entry)
          }))
        }, null, 2)
        : formatDeployments(slug, record.data));
    } catch (err) {
      console.error(`INITIATIVE FAIL: ${err.message}`);
      process.exit(1);
    }
    break;
  }
  case 'list':
    console.log(listSlugs().join('\n'));
    break;
  case 'toc':
    console.log(renderToc());
    break;
  case 'page':
    console.log(renderPage(args[0]));
    break;
  case 'docs': {
    const record = loadInitiative(args[0]);
    if (!record.error) {
      for (const doc of documentsFor(record)) {
        console.log(`${doc.file}|${doc.output}|${doc.title}`);
      }
    }
    break;
  }
  case 'doc':
    console.log(renderDoc(args[0], args[1]));
    break;
  case 'title': {
    const record = loadInitiative(args[0]);
    console.log(record.error ? args[0] : (record.data.title || args[0]));
    break;
  }
  default:
    console.error('usage: initiatives.mjs validate|digest|propose|select|add|complete|check-scope|deployments|list|toc|page|docs|doc|title');
    process.exit(2);
}
