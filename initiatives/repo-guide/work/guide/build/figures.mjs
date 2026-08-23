// Fact-derived inline SVG figures.
//
// Every figure is a pure function of resolved repository facts, so a diagram
// cannot disagree with the repository the way a hand-drawn one would. Each
// figure declares the fact keys it consumes; `sections.mjs` cites those keys on
// the figure's behalf, which is what lets a figure discharge the uncited-fact
// rule instead of forcing the value into a sentence.
//
// Figures carry no colours of their own. They paint with CSS custom properties
// (`--fig-*`) that the description and the deck each define, so one source
// renders correctly on a white page and on a cream slide.

const CHAR_WIDTH = 7.15;
const CHIP_PADDING = 13;
const CHIP_HEIGHT = 30;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function chipWidth(label, padding = CHIP_PADDING) {
  return Math.round(padding * 2 + label.length * CHAR_WIDTH);
}

function svg({width, height, title, body, className = ''}) {
  const classes = ['figure-svg', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(title)}" preserveAspectRatio="xMidYMid meet"><title>${escapeHtml(title)}</title>${body}</svg>`;
}

function chip(x, y, label, {variant = 'plain', width, height = CHIP_HEIGHT} = {}) {
  const boxWidth = width ?? chipWidth(label);
  return `<g class="fig-chip fig-chip--${variant}" data-figure-label="${escapeHtml(label)}">
    <rect x="${x}" y="${y}" width="${boxWidth}" height="${height}" rx="${height / 2}"></rect>
    <text x="${x + boxWidth / 2}" y="${y + height / 2}" dominant-baseline="central" text-anchor="middle">${escapeHtml(label)}</text>
  </g>`;
}

// Chips wrap inside a fixed width. The number and length of these labels comes
// from the repository, so a lane has to survive a longer set than today's.
function chipRows(x, y, maxWidth, labels, {variant = 'plain', height = 24, padding = 9, gap = 6, rowGap = 6} = {}) {
  const rows = [[]];
  let used = 0;
  for (const label of labels) {
    const boxWidth = chipWidth(label, padding);
    if (used > 0 && used + gap + boxWidth > maxWidth) {
      rows.push([]);
      used = 0;
    }
    rows.at(-1).push({label, width: boxWidth});
    used += (used > 0 ? gap : 0) + boxWidth;
  }
  const html = rows.map((row, rowIndex) => {
    let cursor = x;
    return row.map(({label, width}) => {
      const chipHtml = chip(cursor, y + rowIndex * (height + rowGap), label, {variant, width, height});
      cursor += width + gap;
      return chipHtml;
    }).join('');
  }).join('');
  return {html, rows: rows.length, height: rows.length * height + (rows.length - 1) * rowGap};
}

function panel(x, y, width, height, {variant = 'plain', label} = {}) {
  return `<g class="fig-panel fig-panel--${variant}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14"></rect>
    ${label ? `<text class="fig-panel-label" x="${x + 18}" y="${y + 26}">${escapeHtml(label)}</text>` : ''}
  </g>`;
}

function text(x, y, value, {variant = 'body', anchor = 'start'} = {}) {
  return `<text class="fig-text fig-text--${variant}" x="${x}" y="${y}" text-anchor="${anchor}">${escapeHtml(value)}</text>`;
}

function arrow(x1, y1, x2, y2, {variant = 'plain'} = {}) {
  return `<line class="fig-arrow fig-arrow--${variant}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#fig-arrowhead)"></line>`;
}

const ARROW_DEFS = `<defs><marker id="fig-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fig-arrow-head" d="M 0 1 L 9 5 L 0 9 z"></path></marker></defs>`;

function wrapLines(value, maxCharacters) {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
      continue;
    }
    line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

// The lifecycle as a rail, with the documents each stage expects stacked
// beneath it so the reader sees the record growing rather than reading that it
// does.
function lifecycleFlow(facts) {
  const stages = facts['lifecycle.stages'];
  const documents = facts['lifecycle.stage_documents'];
  const gap = 15;
  const widths = stages.map(stage => Math.max(chipWidth(stage), 84));
  const positions = [];
  let cursor = 4;
  for (const width of widths) {
    positions.push(cursor);
    cursor += width + gap;
  }
  const width = cursor - gap + 4;
  const railY = 18;
  const tickTop = railY + CHIP_HEIGHT + 20;
  const maxDocuments = Math.max(...stages.map(stage => (documents[stage] ?? []).length), 1);
  const height = tickTop + maxDocuments * 20 + 28;

  const rail = stages.map((stage, index) => {
    const documentNames = documents[stage] ?? [];
    const marks = documentNames.map((name, documentIndex) => `
      <g class="fig-doc">
        <rect x="${positions[index]}" y="${tickTop + documentIndex * 20}" width="${widths[index]}" height="14" rx="3"></rect>
        <text x="${positions[index] + widths[index] / 2}" y="${tickTop + documentIndex * 20 + 7}" dominant-baseline="central" text-anchor="middle">${escapeHtml(name)}</text>
      </g>`).join('');
    const connector = index === 0 ? '' : `<line class="fig-rail" x1="${positions[index - 1] + widths[index - 1]}" y1="${railY + CHIP_HEIGHT / 2}" x2="${positions[index]}" y2="${railY + CHIP_HEIGHT / 2}"></line>`;
    const isTerminal = index >= stages.length - 2;
    return `${connector}${chip(positions[index], railY, stage, {variant: isTerminal ? 'quiet' : 'stage', width: widths[index]})}${marks}`;
  }).join('');

  return {
    uses: ['lifecycle.stages', 'lifecycle.stage_documents'],
    html: svg({
      width,
      height,
      title: `The lifecycle in order, with the documents each stage expects: ${stages.join(', ')}`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}${rail}${text(4, height - 8, 'A document shows up when the stage reaches it, and not before.', {variant: 'caption'})}`,
    }),
  };
}

// Who supplies what, as two lanes that hand work to each other.
function divisionOfLabour(facts) {
  const humanClasses = facts['blockers.human'];
  const personLines = [
    'The wish, in their own words',
    'Facts only they can observe',
    'Authority to spend or grant access',
    'The answer to a blocked question',
  ];
  const agentLines = [
    'Objectives, specification, plan',
    'One bounded increment at a time',
    'Replies to review feedback',
    'A pull request, never a merge',
  ];
  const width = 720;
  const laneWidth = 300;
  const lineHeight = 26;
  const bodyTop = 76;
  const rightX = width - laneWidth;
  const waiting = chipRows(18, 0, laneWidth - 36, humanClasses, {variant: 'wait'});
  const laneHeight = bodyTop + personLines.length * lineHeight + waiting.height + 20;
  const height = laneHeight + 34;

  const lane = (x, label, eyebrow, lines, variant) => `
    ${panel(x, 0, laneWidth, laneHeight, {variant})}
    ${text(x + 18, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 18, 56, label, {variant: 'heading'})}
    ${lines.map((line, index) => `
      <circle class="fig-dot fig-dot--${variant}" cx="${x + 24}" cy="${bodyTop + index * lineHeight - 4}" r="3.5"></circle>
      ${text(x + 38, bodyTop + index * lineHeight, line)}`).join('')}`;

  const waitingChips = chipRows(18, laneHeight - waiting.height - 16, laneWidth - 36, humanClasses, {variant: 'wait'}).html;

  return {
    uses: ['blockers.human'],
    html: svg({
      width,
      height,
      title: `The person supplies intent, facts, and authority; the agents supply the structure. The classes that wait for a person are ${humanClasses.join(', ')}.`,
      body: `${ARROW_DEFS}
        ${lane(0, 'The person', 'Supplies', personLines, 'person')}
        ${lane(rightX, 'The agents', 'Supply', agentLines, 'agent')}
        ${waitingChips}
        ${arrow(laneWidth + 10, laneHeight / 2 - 12, rightX - 10, laneHeight / 2 - 12, {variant: 'person'})}
        ${arrow(rightX - 10, laneHeight / 2 + 30, laneWidth + 10, laneHeight / 2 + 30, {variant: 'agent'})}
        ${text(width / 2, laneHeight / 2 - 22, 'intent', {variant: 'edge', anchor: 'middle'})}
        ${text(width / 2, laneHeight / 2 + 20, 'increments', {variant: 'edge', anchor: 'middle'})}
        ${text(0, height - 6, 'The amber labels sit there waiting until a person answers.', {variant: 'caption'})}`,
    }),
  };
}

// One sweep run: the phases in order, and the budget they share.
function sweepRun(facts) {
  const phases = facts['sweep.phases'];
  const budget = facts['sweep.budget'];
  const gap = 30;
  const widths = phases.map(phase => Math.max(chipWidth(phase, 18), 96));
  const positions = [];
  let cursor = 4;
  for (const width of widths) {
    positions.push(cursor);
    cursor += width + gap;
  }
  const railWidth = cursor - gap + 4;
  const meterTop = 108;
  const slots = budget.items_per_run;
  const slotWidth = Math.min(46, Math.floor((railWidth - 8) / slots) - 8);
  const width = Math.max(railWidth, 520);
  const height = meterTop + 84;

  const rail = phases.map((phase, index) => {
    const connector = index === 0 ? '' : arrow(positions[index - 1] + widths[index - 1] + 5, 39, positions[index] - 7, 39);
    return `${connector}${chip(positions[index], 24, phase, {variant: 'phase', width: widths[index], height: 30})}`;
  }).join('');

  const meter = Array.from({length: slots}, (_, index) => `
    <rect class="fig-slot" x="${4 + index * (slotWidth + 8)}" y="${meterTop}" width="${slotWidth}" height="20" rx="5"></rect>`).join('');

  return {
    uses: ['sweep.phases', 'sweep.budget'],
    html: svg({
      width,
      height,
      title: `A run moves through ${phases.join(', then ')} and spends one shared budget of ${slots} items.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}
        ${text(4, 12, 'Every run, in this order', {variant: 'eyebrow'})}
        ${rail}
        ${text(4, meterTop - 12, 'One shared budget, spent left to right', {variant: 'eyebrow'})}
        ${meter}
        ${text(4, meterTop + 46, `Earlier phases spend it first, so a run that only answers review has done its job.`, {variant: 'caption'})}
        ${text(4, meterTop + 66, `At most ${budget.max_items_per_initiative} from any one initiative, and the run stops altogether at ${budget.max_open_prs} open pull requests.`, {variant: 'caption'})}`,
    }),
  };
}

// Which blocked items a person has to touch, and which clear on their own.
function blockerTriage(facts) {
  const prefixes = facts['blockers.prefixes'].map(value => value.replace(/:$/, ''));
  const humanClasses = facts['blockers.human'].map(value => value.replace(/:$/, ''));
  const proposable = facts['blockers.proposable'].map(value => value.replace(/:$/, ''));
  const needsPerson = prefixes.filter(prefix => humanClasses.includes(prefix));
  const clearsItself = prefixes.filter(prefix => !humanClasses.includes(prefix));

  const width = 720;
  const columnWidth = 344;
  const rightX = width - columnWidth;
  const rows = Math.max(needsPerson.length, clearsItself.length);
  const bodyTop = 84;
  const panelHeight = bodyTop + rows * 34 + 18;
  const height = panelHeight + 34;

  const column = (x, variant, eyebrow, heading, values) => `
    ${panel(x, 0, columnWidth, panelHeight, {variant})}
    ${text(x + 18, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 18, 58, heading, {variant: 'heading'})}
    ${values.map((value, index) => {
      const canPropose = proposable.includes(value);
      const chipHtml = chip(x + 18, bodyTop + index * 34 - 14, value, {variant: canPropose ? 'propose' : variant, height: 26});
      const note = canPropose ? text(x + 18 + chipWidth(value) + 12, bodyTop + index * 34, 'may receive a reasoned proposal', {variant: 'note'}) : '';
      return `${chipHtml}${note}`;
    }).join('')}`;

  return {
    uses: ['blockers.prefixes', 'blockers.human', 'blockers.proposable'],
    html: svg({
      width,
      height,
      title: `${needsPerson.join(', ')} wait for a person; ${clearsItself.join(', ')} clear when something else moves. Only ${proposable.join(', ')} can receive a proposed answer.`,
      body: `${ARROW_DEFS}
        ${column(0, 'wait', 'Blocked on', 'A person must answer', needsPerson)}
        ${column(rightX, 'auto', 'Blocked on', 'Clears when something else moves', clearsItself)}
        ${text(0, height - 6, 'Changing the label doesn’t change who can honestly answer the question.', {variant: 'caption'})}`,
    }),
  };
}

// What a fork carries away, and what it leaves behind.
function forkBoundary(facts) {
  const protectedPaths = facts['sweep.protected_paths'];
  const carry = [
    'The working instruction file',
    'Lifecycle scripts and their tests',
    'The sweep prompt and configuration',
    'The focused skills',
    'The workflows that schedule and publish',
  ];
  const leave = [
    'Published decks',
    'Standalone demos',
    'Existing initiative histories',
    'This repository’s travel content',
  ];
  const width = 720;
  const columnWidth = 340;
  const rightX = width - columnWidth;
  const bodyTop = 84;
  const paths = chipRows(18, 0, columnWidth - 36, protectedPaths, {variant: 'path'});
  const panelHeight = bodyTop + Math.max(carry.length, leave.length) * 26 + paths.height + 22;
  const height = panelHeight + 34;

  const column = (x, variant, eyebrow, heading, lines, footer) => `
    ${panel(x, 0, columnWidth, panelHeight, {variant})}
    ${text(x + 18, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 18, 58, heading, {variant: 'heading'})}
    ${lines.map((line, index) => `
      <circle class="fig-dot fig-dot--${variant}" cx="${x + 24}" cy="${bodyTop + index * 26 - 4}" r="3.5"></circle>
      ${text(x + 38, bodyTop + index * 26, line)}`).join('')}
    ${footer}`;

  const pathChips = chipRows(18, panelHeight - paths.height - 16, columnWidth - 36, protectedPaths, {variant: 'path'}).html;

  return {
    uses: ['sweep.protected_paths'],
    html: svg({
      width,
      height,
      title: `A fork carries the process-bearing files and leaves this repository's own content behind. The protected paths are ${protectedPaths.join(', ')}.`,
      body: `${ARROW_DEFS}
        ${column(0, 'carry', 'Take it', 'Carries the process', carry, pathChips)}
        ${column(rightX, 'leave', 'Leave it', 'Belongs to this repository', leave, '')}
        ${text(0, height - 6, 'Protected paths are the shared machinery a sweep can’t casually rewrite.', {variant: 'caption'})}`,
    }),
  };
}

// The three content areas, which is the vocabulary everything else assumes.
function contentAreas() {
  const areas = [
    {name: 'Decks', body: 'Published collections of travel pages, built and deployed to the site.'},
    {name: 'Demos', body: 'Standalone examples that own their pages, assets, and prompt history.'},
    {name: 'Initiatives', body: 'Durable units of intent that keep the wish, the reasoning, and the next move.'},
  ];
  const width = 720;
  const columnWidth = 226;
  const gap = (width - columnWidth * areas.length) / (areas.length - 1);
  const bodyLines = areas.map(area => wrapLines(area.body, 30));
  const panelHeight = 74 + Math.max(...bodyLines.map(lines => lines.length)) * 20 + 14;
  const height = panelHeight + 30;

  const columns = areas.map((area, index) => {
    const x = index * (columnWidth + gap);
    return `
      ${panel(x, 0, columnWidth, panelHeight, {variant: 'area'})}
      ${text(x + 18, 34, area.name, {variant: 'heading'})}
      ${bodyLines[index].map((line, lineIndex) => text(x + 18, 66 + lineIndex * 20, line)).join('')}`;
  }).join('');

  return {
    uses: [],
    html: svg({
      width,
      height,
      title: 'The three content areas: decks, demos, and initiatives.',
      body: `${columns}${text(0, height - 4, 'The working instructions keep the three vocabularies apart on purpose.', {variant: 'caption'})}`,
    }),
  };
}

export const FIGURES = {
  'content-areas': contentAreas,
  'lifecycle-flow': lifecycleFlow,
  'division-of-labor': divisionOfLabour,
  'sweep-run': sweepRun,
  'blocker-triage': blockerTriage,
  'fork-boundary': forkBoundary,
};

export function figureNames() {
  return Object.keys(FIGURES).sort();
}

export function renderFigure(name, facts) {
  const figure = FIGURES[name];
  if (!figure) throw new Error(`Unknown figure: ${name}`);
  const rendered = figure(facts);
  // Every figure defines its own arrowhead marker, and several of them share a
  // page. Duplicate ids would make every arrow point at whichever marker
  // rendered first, so each figure's marker is namespaced on the way out.
  const html = rendered.html
    .replaceAll('fig-arrowhead', `fig-arrowhead-${name}`)
    .replace(/[ \t]+$/gm, '');
  return {...rendered, html};
}

// The CSS both hosts inline. Colours come from the host's `--fig-*` values so a
// figure reads correctly on a white page and on a cream slide.
export const FIGURE_CSS = `
.figure { margin: 26px 0; }
.figure-svg { display: block; width: 100%; height: auto; max-width: 720px; margin: 0 auto; overflow: visible; }
.figure-svg--wide { max-width: 100%; }
.fig-chip rect { fill: var(--fig-fill); stroke: var(--fig-line); stroke-width: 1; }
.fig-chip text { fill: var(--fig-ink); font-size: 13px; font-weight: 750; }
.fig-chip--stage rect { fill: var(--fig-accent-soft); stroke: var(--fig-accent); }
.fig-chip--stage text { fill: var(--fig-accent-ink); }
.fig-chip--quiet rect { fill: none; stroke: var(--fig-line); stroke-dasharray: 4 3; }
.fig-chip--quiet text { fill: var(--fig-muted); }
.fig-chip--phase rect { fill: var(--fig-accent-soft); stroke: var(--fig-accent); }
.fig-chip--phase text { fill: var(--fig-accent-ink); font-size: 13.5px; }
.fig-chip--wait rect, .fig-chip--propose rect { fill: var(--fig-warn-soft); stroke: var(--fig-warn); }
.fig-chip--wait text, .fig-chip--propose text { fill: var(--fig-warn-ink); font-size: 12px; }
.fig-chip--propose rect { stroke-dasharray: 5 3; }
.fig-chip--auto rect { fill: var(--fig-go-soft); stroke: var(--fig-go); }
.fig-chip--auto text { fill: var(--fig-go-ink); font-size: 12px; }
.fig-chip--path rect { fill: var(--fig-fill); stroke: var(--fig-line); }
.fig-chip--path text { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
.fig-panel rect { fill: var(--fig-fill); stroke: var(--fig-line); stroke-width: 1; }
.fig-panel--person rect, .fig-panel--wait rect, .fig-panel--carry rect { fill: var(--fig-warn-soft); stroke: var(--fig-warn); }
.fig-panel--agent rect, .fig-panel--auto rect { fill: var(--fig-accent-soft); stroke: var(--fig-accent); }
.fig-panel--carry rect { fill: var(--fig-go-soft); stroke: var(--fig-go); }
.fig-panel--leave rect { fill: var(--fig-fill); stroke: var(--fig-line); stroke-dasharray: 5 4; }
.fig-panel--area rect { fill: var(--fig-fill); stroke: var(--fig-line); }
.fig-text { fill: var(--fig-ink); font-size: 13.5px; }
.fig-text--eyebrow { fill: var(--fig-muted); font-size: 10.5px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.fig-text--heading { fill: var(--fig-ink); font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
.fig-text--caption { fill: var(--fig-muted); font-size: 12px; }
.fig-text--note { fill: var(--fig-muted); font-size: 11.5px; font-style: italic; }
.fig-text--edge { fill: var(--fig-muted); font-size: 11.5px; font-weight: 750; letter-spacing: .04em; }
.fig-doc rect { fill: var(--fig-doc); stroke: none; }
.fig-doc text { fill: var(--fig-doc-ink); font-size: 10px; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.fig-rail { stroke: var(--fig-line); stroke-width: 2; }
.fig-arrow { stroke: var(--fig-muted); stroke-width: 1.6; }
.fig-arrow--person { stroke: var(--fig-warn); }
.fig-arrow--agent { stroke: var(--fig-accent); }
.fig-arrow-head { fill: var(--fig-muted); }
.fig-dot { fill: var(--fig-muted); }
.fig-dot--person, .fig-dot--carry { fill: var(--fig-warn); }
.fig-dot--agent { fill: var(--fig-accent); }
.fig-slot { fill: var(--fig-accent-soft); stroke: var(--fig-accent); stroke-width: 1; }
`;
