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

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
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
const HUMAN_BLOCKERS = new Set(['human', 'permission', 'cost', 'legal']);

const DOCUMENTS = [
  ['wish.md', 'Wish'],
  ['objectives.md', 'Objectives'],
  ['spec.md', 'Specification'],
  ['plan.md', 'Implementation plan'],
  ['test-plan.md', 'Test plan'],
  ['log.md', 'Log'],
  ['notes.md', 'Notes']
];

const DEFAULT_STALENESS_DAYS = 14;

/** What a sweep run is permitted to do, in order. Survey is never optional. */
const SWEEP_PHASES = ['survey', 'respond', 'work'];

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
        digest.decisions.push({ ...entry, kind: prefix });
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

  // The most valuable part: the only things the sweep genuinely cannot resolve.
  section('Waiting on a decision from you', digest.decisions.map(
    (d) => `- **${d.slug}** — ${d.item}\n  - \`${d.kind}\`: ${d.detail}`
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
    console.error('usage: initiatives.mjs validate|list|toc|page|docs|doc|title');
    process.exit(2);
}
