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
 *   complete <slug> <item-id> [--note "..."] [--stage <stage>]
 *                       record an item done: remove it, unblock dependents, log it
 *   check-scope <slug> --files <path>...   or --files-from <file>
 *                       fail if a change reaches outside the initiative's write scope
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

const STAGES = [
  'wish', 'shaped', 'specified', 'planned', 'building', 'refining', 'dormant', 'archived'
];

/** Documents expected once a stage is reached, used for warnings only. */
const STAGE_DOCUMENTS = {
  shaped: ['objectives.md'],
  specified: ['objectives.md', 'spec.md'],
  planned: ['objectives.md', 'spec.md', 'plan.md'],
  building: ['objectives.md', 'spec.md', 'plan.md'],
  refining: ['objectives.md', 'spec.md', 'plan.md']
};

const BLOCKER_PREFIXES = [
  'todo', 'initiative', 'review', 'schedule',
  'human', 'permission', 'cost', 'legal',
  'data', 'external', 'upstream'
];

/** Blockers the sweep can clear on its own, versus those needing a person. */
const HUMAN_BLOCKERS = new Set(['human', 'permission', 'cost', 'legal', 'data']);

/**
 * The sweep may propose an answer only to a judgement call.
 *
 * `permission:`, `cost:` and `legal:` need the user's authority rather than
 * reasoning, and `data:` is a fact about their world - proposing one would be
 * an invention wearing the costume of an answer.
 */
const PROPOSABLE_BLOCKERS = new Set(['human']);

const DOCUMENTS = [
  ['wish.md', 'Wish'],
  ['objectives.md', 'Objectives'],
  ['decisions.md', 'Decisions'],
  ['spec.md', 'Specification'],
  ['plan.md', 'Implementation plan'],
  ['test-plan.md', 'Test plan'],
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
    data.stage = stage;
  } else if (done.advances_stage) {
    changes.push('warning: this item advances the stage, but no --stage was given');
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

const [command, ...args] = process.argv.slice(2);

switch (command) {
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
    console.error('usage: initiatives.mjs validate|digest|propose|select|complete|check-scope|list|toc|page|docs|doc|title');
    process.exit(2);
}
