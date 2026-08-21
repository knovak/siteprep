// Block-level fact rendering.
//
// Facts come in two shapes and they want two different treatments. A scalar —
// a count, a command, a single name — belongs inside a sentence, where it reads
// as English. Anything structured — a list, a map, a set of records — does not:
// flattening it into prose forces every sentence that carries one into the same
// "the X are A; B; C" frame, which is what made the first version read like a
// machine.
//
// So structure renders as structure. A section names a block directive on its
// own line and the fact arrives as a rail, a table, or a set of cards, next to
// prose that is free to be prose. `sections.mjs` enforces the split: a
// structured value used inline is an error, not a style note.

import {renderFigure} from './figures.mjs';

export const BLOCK_DIRECTIVE = /^@(fact|figure)\s+([A-Za-z0-9_.*-]+)(?:\s+as\s+([a-z-]+))?\s*$/;

const VIEWS = new Set(['rail', 'chips', 'table', 'stack', 'cards', 'list', 'initiatives', 'paths']);

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function isScalar(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

export function parseBlockDirective(line) {
  const match = line.match(BLOCK_DIRECTIVE);
  if (!match) return null;
  const [, kind, target, view] = match;
  if (view && !VIEWS.has(view)) throw new Error(`Unsupported block view: ${view}`);
  return {kind, target, view: view ?? null, line};
}

// A directive may name one key or a `prefix.*` glob. The glob is what lets a
// section cite a whole registered collection — every workflow, every skill —
// without naming each one in a sentence it does not want to carry.
export function resolveBlockKeys(facts, target) {
  if (target.endsWith('.*')) {
    const prefix = target.slice(0, -1);
    const keys = Object.keys(facts).filter(key => key.startsWith(prefix)).sort();
    if (keys.length === 0) throw new Error(`Block matched no facts: ${target}`);
    return keys;
  }
  const base = Object.keys(facts)
    .filter(key => target === key || target.startsWith(`${key}.`))
    .sort((a, b) => b.length - a.length)[0];
  if (!base) throw new Error(`Unknown fact: ${target}`);
  return [base];
}

function pathValue(facts, target) {
  const [base] = resolveBlockKeys(facts, target);
  let value = facts[base];
  for (const part of target.slice(base.length).split('.').filter(Boolean)) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) {
      throw new Error(`Unknown fact: ${target}`);
    }
    value = value[part];
  }
  return value;
}

function defaultView(value) {
  if (Array.isArray(value)) {
    if (value.every(isScalar)) {
      return value.some(item => String(item).length > 42) ? 'list' : 'chips';
    }
    return 'cards';
  }
  if (value && typeof value === 'object') {
    return Object.values(value).every(isScalar) ? 'table' : 'stack';
  }
  return 'chips';
}

const ACRONYMS = {prs: 'PRs', pr: 'PR', url: 'URL', urls: 'URLs', ci: 'CI'};

// GitHub Actions trigger keys are meaningful to someone who already knows the
// `on:` block syntax; everyone else just needs a plain-language reason the
// workflow runs. Anything not in this list falls back to the raw key rather
// than failing, so a new trigger still renders.
const TRIGGER_CLAUSES = {
  push: 'a push happens',
  pull_request: 'a pull request opens or updates',
  pull_request_target: 'a pull request opens or updates',
  workflow_dispatch: 'someone starts it manually',
  workflow_call: 'another workflow calls it',
  schedule: 'its schedule fires',
  delete: 'a branch or tag is deleted',
  release: 'a release is published',
  issue_comment: 'an issue gets a new comment',
};

function triggerSentence(triggers) {
  const clauses = triggers.map(trigger => TRIGGER_CLAUSES[trigger] ?? trigger);
  const joined = clauses.length > 1
    ? `${clauses.slice(0, -1).join(', ')} or ${clauses.at(-1)}`
    : clauses[0];
  return `Runs when ${joined}.`;
}

function humanLabel(key) {
  return key
    .split('_')
    .map((word, index) => ACRONYMS[word] ?? (index === 0 ? word.replace(/^./, character => character.toUpperCase()) : word))
    .join(' ');
}

// Values reaching a block come from markdown sources, so they can carry emphasis
// markers and code fences meant for a file, not for a card. Blocks render text,
// not markup, so the markers are stripped rather than shown literally.
function clean(value) {
  return String(value)
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function chipList(values, {variant = ''} = {}) {
  return `<ul class="fact-chips${variant ? ` fact-chips--${variant}` : ''}">${values
    .map(value => `<li data-fact-value="${escapeHtml(value)}">${escapeHtml(value)}</li>`)
    .join('')}</ul>`;
}

function railList(values) {
  return `<ol class="fact-rail">${values
    .map(value => `<li data-fact-value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span></li>`)
    .join('')}</ol>`;
}

function table(value) {
  return `<dl class="fact-table">${Object.entries(value)
    .map(([key, item]) => `<div data-fact-key="${escapeHtml(key)}"><dt>${escapeHtml(humanLabel(key))}</dt><dd>${escapeHtml(item)}</dd></div>`)
    .join('')}</dl>`;
}

function stack(value) {
  return `<dl class="fact-stack">${Object.entries(value)
    .map(([key, items]) => `<div data-fact-key="${escapeHtml(key)}">
      <dt>${escapeHtml(key)}</dt>
      <dd>${Array.isArray(items) ? chipList(items, {variant: 'file'}) : escapeHtml(items)}</dd>
    </div>`)
    .join('')}</dl>`;
}

function plainList(values) {
  return `<ul class="fact-list">${values.map(value => `<li>${escapeHtml(clean(value))}</li>`).join('')}</ul>`;
}

// One card per record. Records reach here from two directions: a registered
// collection resolved by glob (each key holding one object), or a single fact
// whose value is an array of objects.
function cards(records) {
  return `<div class="fact-cards">${records.map(record => `
    <article data-fact-key="${escapeHtml(record.key)}">
      <h4>${escapeHtml(clean(record.title))}</h4>
      <p>${escapeHtml(clean(record.body))}</p>${record.meta ? `
      <p class="fact-card-meta">${escapeHtml(record.meta)}</p>` : ''}
    </article>`).join('')}</div>`;
}

function cardRecord(key, value) {
  if (isScalar(value)) return {key, title: key, body: String(value)};
  // A skill: name plus its own first sentence.
  if (value.name && value.summary) return {key, title: value.name, body: value.summary};
  // A sweep phase summary.
  if (value.phase && value.title) return {key: value.phase, title: value.title, body: value.summary ?? '', meta: value.phase};
  // A workflow shape.
  if (value.file && value.triggers) {
    return {
      key: value.file,
      title: value.file.replace(/\.ya?ml$/, ''),
      body: triggerSentence(value.triggers),
      meta: `${value.jobs.length === 1 ? 'Job' : 'Jobs'}: ${value.jobs.join(', ')}`,
    };
  }
  throw new Error(`Cannot render a card for ${key}: unrecognised record shape`);
}

function initiatives(rows) {
  return `<table class="fact-initiatives"><thead><tr><th>Initiative</th><th>Stage</th></tr></thead><tbody>${rows
    .map(row => `<tr data-fact-key="${escapeHtml(row.slug)}"><td>${escapeHtml(row.title)}</td><td><span class="fact-stage">${escapeHtml(row.stage)}</span></td></tr>`)
    .join('')}</tbody></table>`;
}

function renderView(view, keys, facts, target) {
  if (view === 'cards') {
    const records = keys.length > 1 || target.endsWith('.*')
      ? keys.map(key => cardRecord(key, facts[key]))
      : (() => {
        const value = pathValue(facts, target);
        if (!Array.isArray(value)) throw new Error(`The cards view needs a list of records: ${target}`);
        return value.map((item, index) => cardRecord(`${target}.${index}`, item));
      })();
    return cards(records);
  }

  if (keys.length > 1) throw new Error(`A glob block only supports the cards view: ${target}`);
  const value = pathValue(facts, target);

  if (view === 'initiatives') {
    if (!Array.isArray(value)) throw new Error(`The initiatives view needs a list: ${target}`);
    if (value.length === 0) return '<p class="fact-empty">No initiatives are live in this copy of the repository.</p>';
    return initiatives(value);
  }
  if (view === 'rail') {
    if (!Array.isArray(value)) throw new Error(`The rail view needs a list: ${target}`);
    return railList(value);
  }
  if (view === 'chips' || view === 'paths') {
    if (!Array.isArray(value)) throw new Error(`The chips view needs a list: ${target}`);
    return chipList(value, {variant: view === 'paths' ? 'file' : ''});
  }
  if (view === 'list') {
    if (!Array.isArray(value)) throw new Error(`The list view needs a list: ${target}`);
    return plainList(value);
  }
  if (view === 'table') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`The table view needs an object: ${target}`);
    return table(value);
  }
  if (view === 'stack') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`The stack view needs an object: ${target}`);
    return stack(value);
  }
  throw new Error(`Unsupported block view: ${view}`);
}

// Resolve a directive without rendering it, so `sections.mjs` can validate the
// target and record the citation before any HTML exists.
export function inspectBlock(directive, facts) {
  if (directive.kind === 'figure') {
    const figure = renderFigure(directive.target, facts);
    return {cites: figure.uses};
  }
  const keys = resolveBlockKeys(facts, directive.target);
  if (directive.view) {
    // Validate the view against the value now rather than at render time.
    renderView(directive.view, keys, facts, directive.target);
  }
  return {cites: keys};
}

export function renderBlock(directive, facts) {
  if (directive.kind === 'figure') {
    const figure = renderFigure(directive.target, facts);
    return `<figure class="figure" data-figure="${escapeHtml(directive.target)}">${figure.html}</figure>`;
  }
  const keys = resolveBlockKeys(facts, directive.target);
  const view = directive.view ?? (keys.length > 1 ? 'cards' : defaultView(pathValue(facts, directive.target)));
  return `<div class="fact-block" data-fact-block="${escapeHtml(directive.target)}" data-fact-view="${escapeHtml(view)}">${renderView(view, keys, facts, directive.target)}</div>`;
}

// The CSS both hosts inline for block rendering. Like the figures, it reads its
// palette from the host so one renderer serves the page and the slides.
export const BLOCK_CSS = `
.fact-block { margin: 22px 0; }
.fact-chips { display: flex; flex-wrap: wrap; gap: 7px; margin: 0; padding: 0; list-style: none; }
.fact-chips li { padding: 6px 11px; border: 1px solid var(--fig-line); border-radius: 999px; background: var(--fig-fill); color: var(--fig-ink); font-size: .82em; font-weight: 750; }
.fact-chips--file li { border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .76em; font-weight: 600; }
.fact-rail { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; counter-reset: rail; }
.fact-rail li { display: flex; align-items: center; gap: 6px; }
.fact-rail li span { padding: 7px 13px; border: 1px solid var(--fig-accent); border-radius: 999px; background: var(--fig-accent-soft); color: var(--fig-accent-ink); font-size: .84em; font-weight: 800; }
.fact-rail li + li::before { content: '→'; color: var(--fig-muted); font-weight: 800; }
.fact-table { display: grid; gap: 1px; margin: 0; padding: 0; border: 1px solid var(--fig-line); border-radius: 12px; overflow: hidden; background: var(--fig-line); }
.fact-table > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: baseline; padding: 11px 15px; background: var(--fig-surface); }
.fact-table dt { color: var(--fig-muted); font-size: .86em; font-weight: 700; }
.fact-table dd { margin: 0; color: var(--fig-ink); font-size: 1.05em; font-weight: 800; font-variant-numeric: tabular-nums; }
.fact-stack { display: grid; gap: 8px; margin: 0; padding: 0; }
.fact-stack > div { display: grid; grid-template-columns: minmax(96px, auto) minmax(0, 1fr); gap: 8px 16px; align-items: center; padding: 9px 14px; border: 1px solid var(--fig-line); border-radius: 10px; background: var(--fig-surface); }
.fact-stack dt { color: var(--fig-accent-ink); font-size: .84em; font-weight: 850; }
.fact-stack dd { margin: 0; }
.fact-list { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.fact-list li { padding: 9px 14px 9px 30px; position: relative; border: 1px solid var(--fig-line); border-radius: 10px; background: var(--fig-surface); font-size: .92em; }
.fact-list li::before { content: '✕'; position: absolute; left: 12px; color: var(--fig-warn); font-weight: 900; }
.fact-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
.fact-cards article { padding: 14px 16px; border: 1px solid var(--fig-line); border-radius: 12px; background: var(--fig-surface); }
.fact-cards h4 { margin: 0 0 5px; color: var(--fig-ink); font-size: .95em; font-weight: 800; }
.fact-cards p { margin: 0; color: var(--fig-muted); font-size: .84em; line-height: 1.45; overflow-wrap: anywhere; }
.fact-card-meta { margin-top: 6px !important; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .74em !important; }
.fact-initiatives { width: 100%; border-collapse: collapse; border: 1px solid var(--fig-line); border-radius: 12px; overflow: hidden; font-size: .9em; }
.fact-initiatives th { padding: 9px 14px; background: var(--fig-fill); color: var(--fig-muted); font-size: .82em; font-weight: 800; letter-spacing: .05em; text-align: left; text-transform: uppercase; }
.fact-initiatives td { padding: 9px 14px; border-top: 1px solid var(--fig-line); background: var(--fig-surface); }
.fact-stage { padding: 3px 9px; border-radius: 999px; background: var(--fig-accent-soft); color: var(--fig-accent-ink); font-size: .82em; font-weight: 800; }
.fact-empty { color: var(--fig-muted); font-style: italic; }
`;
