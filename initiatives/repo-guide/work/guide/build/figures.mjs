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
// renders correctly on a white page and on a slide.

const CHAR_WIDTH = 7.4;
const CHIP_PADDING = 12;
const CHIP_HEIGHT = 28;
const WIDTH = 800;

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
function chipRows(x, y, maxWidth, labels, {variant = 'plain', height = 26, padding = 10, gap = 7, rowGap = 7} = {}) {
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

function panel(x, y, width, height, {variant = 'plain', radius = 14} = {}) {
  return `<g class="fig-panel fig-panel--${variant}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"></rect></g>`;
}

function text(x, y, value, {variant = 'body', anchor = 'start'} = {}) {
  return `<text class="fig-text fig-text--${variant}" x="${x}" y="${y}" text-anchor="${anchor}">${escapeHtml(value)}</text>`;
}

function lines(x, y, values, {variant = 'body', lineHeight = 20, anchor = 'start'} = {}) {
  return values.map((value, index) => text(x, y + index * lineHeight, value, {variant, anchor})).join('');
}

function arrow(x1, y1, x2, y2, {variant = 'plain'} = {}) {
  return `<line class="fig-arrow fig-arrow--${variant}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#fig-arrowhead)"></line>`;
}

function curve(path, {variant = 'plain'} = {}) {
  return `<path class="fig-arrow fig-arrow--${variant}" d="${path}" fill="none" marker-end="url(#fig-arrowhead)"></path>`;
}

const ARROW_DEFS = `<defs><marker id="fig-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fig-arrow-head" d="M 0 1 L 9 5 L 0 9 z"></path></marker></defs>`;

function wrapLines(value, maxCharacters) {
  const wrapped = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      wrapped.push(line);
      line = word;
      continue;
    }
    line = candidate;
  }
  if (line) wrapped.push(line);
  return wrapped;
}

// A titled box with an optional eyebrow and a few body lines. Most figures are
// built from these, so they share one measure of height.
function node(x, y, width, {variant = 'plain', eyebrow, title, body = [], mono = false, minHeight = 0} = {}) {
  const pad = 16;
  let cursor = y + pad + 4;
  let content = '';
  if (eyebrow) {
    content += text(x + pad, cursor + 8, eyebrow, {variant: 'eyebrow'});
    cursor += 20;
  }
  if (title) {
    content += text(x + pad, cursor + 12, title, {variant: 'heading'});
    cursor += 26;
  }
  if (body.length) {
    content += lines(x + pad, cursor + 10, body, {variant: mono ? 'mono' : 'body', lineHeight: 20});
    cursor += body.length * 20 + 2;
  }
  const height = Math.max(minHeight, cursor - y + pad - 4);
  return {html: `${panel(x, y, width, height, {variant})}${content}`, height};
}

function bulletLines(x, y, values, variant, lineHeight = 22) {
  return values.map((value, index) => `
    <circle class="fig-dot fig-dot--${variant}" cx="${x + 5}" cy="${y + index * lineHeight - 5}" r="3.5"></circle>
    ${text(x + 18, y + index * lineHeight, value)}`).join('');
}

// ---------------------------------------------------------------- figures

// The three content areas and the machinery around them.
function repoMap() {
  const areas = [
    {name: 'decks/', title: 'Decks', body: ['Static web content organized', 'into collections. Here, travel', 'information: places, dates,', 'attractions, events, maps.']},
    {name: 'demos/', title: 'Demos', body: ['Standalone web examples.', 'Each owns its pages and', 'assets and is copied to the', 'site unchanged.']},
    {name: 'initiatives/', title: 'Initiatives', body: ['Where software gets made.', 'A wish, a record of', 'documents, capability, and', 'pointers to what shipped.']},
  ];
  const machinery = [
    ['scripts/', 'the build and the lifecycle script'],
    ['shared/', 'opt-in web libraries: maps, galleries, nav'],
    ['.claude/skills/', 'procedures an agent runs by name'],
    ['.github/workflows/', 'build, publish, digest, scope check'],
  ];
  const columnWidth = 248;
  const gap = (WIDTH - columnWidth * 3) / 2;
  const top = 8;
  let areaHeight = 0;
  const columns = areas.map((area, index) => {
    const x = index * (columnWidth + gap);
    const drawn = node(x, top, columnWidth, {variant: index === 2 ? 'accent' : 'area', eyebrow: area.name, title: area.title, body: area.body});
    areaHeight = Math.max(areaHeight, drawn.height);
    return drawn.html;
  }).join('');
  const stripTop = top + areaHeight + 28;
  const rowHeight = 24;
  const stripHeight = 44 + machinery.length * rowHeight;
  const strip = `${panel(0, stripTop, WIDTH, stripHeight, {variant: 'quiet'})}
    ${text(16, stripTop + 26, 'Machinery, shared by all three', {variant: 'eyebrow'})}
    ${machinery.map(([path, meaning], index) => `
      ${text(16, stripTop + 54 + index * rowHeight, path, {variant: 'mono'})}
      ${text(190, stripTop + 54 + index * rowHeight, meaning)}`).join('')}`;
  const siteTop = stripTop + stripHeight + 30;
  const site = chip(WIDTH / 2 - 170, siteTop, 'Built and published to GitHub Pages', {variant: 'stage', width: 340, height: 32});
  const height = siteTop + 40;
  return {
    uses: [],
    html: svg({
      width: WIDTH, height,
      title: 'The repository has three content areas, decks, demos, and initiatives, plus shared machinery, and is published to GitHub Pages.',
      body: `${ARROW_DEFS}${columns}${strip}
        ${arrow(WIDTH / 2, stripTop + stripHeight + 2, WIDTH / 2, siteTop - 4)}
        ${site}`,
    }),
  };
}

// What accumulates inside an initiative, and where its outputs go.
function initiativeProducts(facts) {
  const titles = facts['documents.titles'];
  const kinds = facts['deployments.kinds'];
  const laneWidth = 158;
  const laneGap = 12;
  const panelX = 0;
  const panelWidth = laneWidth * 3 + laneGap * 2 + 32;
  const laneTop = 58;
  const record = chipRows(0, 0, laneWidth - 24, titles, {variant: 'doc', height: 22, padding: 8, gap: 5, rowGap: 5});
  const laneHeight = Math.max(record.height + 62, 176);
  const lane = (index, eyebrow, title, content) => {
    const x = panelX + 16 + index * (laneWidth + laneGap);
    return `${panel(x, laneTop, laneWidth, laneHeight, {variant: 'surface', radius: 10})}
      ${text(x + 12, laneTop + 22, eyebrow, {variant: 'eyebrow'})}
      ${text(x + 12, laneTop + 44, title, {variant: 'heading'})}
      ${content(x + 12, laneTop + 60)}`;
  };
  const lanes = [
    lane(0, 'Never shrinks', 'Record', (x, y) => chipRows(x, y, laneWidth - 24, titles, {variant: 'doc', height: 22, padding: 8, gap: 5, rowGap: 5}).html),
    lane(1, 'Kept for later', 'Capability', (x, y) => lines(x, y + 14, ['lib/', 'prompts/', 'scripts'], {variant: 'mono', lineHeight: 24})),
    lane(2, 'Graduates out', 'In progress', (x, y) => lines(x, y + 14, ['work/', '', 'Not published,', 'and not under', 'deck or demo', 'rules yet.'], {variant: 'body', lineHeight: 20})),
  ].join('');
  const panelHeight = laneTop + laneHeight + 16;
  const big = `${panel(panelX, 0, panelWidth, panelHeight, {variant: 'accent'})}
    ${text(16, 26, 'One initiative', {variant: 'eyebrow'})}
    ${text(150, 26, 'initiatives/<slug>/', {variant: 'mono'})}${lanes}`;

  const targetsX = panelWidth + 60;
  const targetWidth = WIDTH - targetsX;
  const targets = [
    {label: 'decks/', note: 'a deck graduates here', variant: 'go'},
    {label: 'demos/', note: 'a demo graduates here', variant: 'go'},
    ...kinds.filter(kind => !/demo/i.test(kind)).map(kind => ({label: kind, note: 'deployed outside the repository', variant: 'go'})),
    {label: 'shared/', note: 'a library used by other work', variant: 'plain'},
    {label: '.claude/skills/', note: 'skills live here from the start', variant: 'plain'},
  ];
  const targetGap = (panelHeight - 4) / targets.length;
  const targetHtml = targets.map((target, index) => {
    const y = 5 + index * targetGap;
    const from = index < 3 ? {x: panelX + 16 + 2 * (laneWidth + laneGap) + laneWidth, y: laneTop + laneHeight / 2} : {x: panelX + 16 + (laneWidth + laneGap) + laneWidth, y: laneTop + laneHeight / 2 + 10};
    const to = {x: targetsX - 6, y: y + 15};
    return `${curve(`M ${from.x} ${from.y} C ${from.x + 30} ${from.y}, ${to.x - 30} ${to.y}, ${to.x} ${to.y}`, {variant: index < 3 ? 'go' : 'plain'})}
      ${chip(targetsX, y, target.label, {variant: target.variant === 'go' ? 'go' : 'path', width: 124, height: 28})}
      ${text(targetsX, y + 44, target.note, {variant: 'note'})}`;
  }).join('');
  const height = panelHeight + 30;
  return {
    uses: ['documents.titles', 'deployments.kinds'],
    html: svg({
      width: WIDTH, height,
      title: `An initiative accumulates a record of documents (${titles.join(', ')}), capability that stays, and work in progress that graduates to decks, demos, or a ${kinds.join(' or ')}.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}${big}${targetHtml}
        ${text(0, height - 6, 'The record and the capability stay. Outputs graduate out, and the initiative keeps a pointer to each.', {variant: 'caption'})}`,
    }),
  };
}

// How an initiative is born.
function initiativeBirth(facts) {
  const skill = facts['skills.new-initiative'].name;
  const firstStage = facts['lifecycle.stages'][0];
  const steps = [
    {variant: 'person', eyebrow: 'You', title: 'Describe it', body: ['In your own words.', 'A paragraph is', 'enough.']},
    {variant: 'accent', eyebrow: 'Skill', title: skill, body: ['Asks three questions:', 'value, summary, and', 'research or not.']},
    {variant: 'surface', eyebrow: 'New folder', title: 'Two files', body: ['initiative.json', 'wish.md', 'background.md', '(optional)'], mono: true},
    {variant: 'go', eyebrow: 'Pull request', title: 'You merge it', body: [`Stage: ${firstStage}.`, 'The wish is fixed.', 'One item: draft', 'the objectives.']},
  ];
  const boxWidth = 188;
  const gap = (WIDTH - boxWidth * steps.length) / (steps.length - 1);
  let maxHeight = 0;
  const drawn = steps.map((step, index) => {
    const x = index * (boxWidth + gap);
    const box = node(x, 0, boxWidth, {...step, minHeight: 128});
    maxHeight = Math.max(maxHeight, box.height);
    return {x, html: box.html};
  });
  const arrows = drawn.slice(1).map((box, index) => arrow(drawn[index].x + boxWidth + 4, maxHeight / 2, box.x - 6, maxHeight / 2)).join('');
  const height = maxHeight + 34;
  return {
    uses: ['skills.new-initiative', 'lifecycle.stages'],
    html: svg({
      width: WIDTH, height,
      title: `You describe the idea, the ${skill} skill scaffolds the folder, and merging the pull request fixes the wish at the ${firstStage} stage.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}${drawn.map(box => box.html).join('')}${arrows}
        ${text(0, height - 6, 'While the pull request is open the wish can be tidied. After the merge, changes are added above it with a date.', {variant: 'caption'})}`,
    }),
  };
}

// The record growing stage by stage: one row per document, one column per stage.
function recordGrowth(facts) {
  const stages = facts['lifecycle.stages'];
  const stageDocuments = facts['lifecycle.stage_documents'];
  const documents = facts['documents.record'];
  const gated = new Set(Object.values(stageDocuments).flat());
  const workingStages = stages.filter(stage => Object.hasOwn(stageDocuments, stage) || stage === stages[0]);
  const lastGated = workingStages.filter(stage => Object.hasOwn(stageDocuments, stage)).at(-1);
  const labelWidth = 150;
  const cell = (WIDTH - labelWidth - 8) / stages.length;
  const rowHeight = 26;
  const headerHeight = 40;
  const rows = documents.filter(doc => doc.file !== 'README.md');
  const height = headerHeight + rows.length * rowHeight + 56;
  const header = stages.map((stage, index) => text(labelWidth + index * cell + cell / 2, 24, stage, {variant: index >= stages.length - 2 ? 'muted-head' : 'head', anchor: 'middle'})).join('');
  const body = rows.map((doc, rowIndex) => {
    const y = headerHeight + rowIndex * rowHeight;
    const isWish = doc.file === 'wish.md';
    const cells = stages.map((stage, index) => {
      const x = labelWidth + index * cell + 3;
      let variant = null;
      if (isWish) variant = 'on';
      else if (gated.has(doc.file)) {
        if ((stageDocuments[stage] ?? []).includes(doc.file)) variant = 'on';
        else if (!Object.hasOwn(stageDocuments, stage) && stage !== stages[0] && (stageDocuments[lastGated] ?? []).includes(doc.file)) variant = 'rest';
      }
      if (!variant) return '';
      return `<rect class="fig-cell fig-cell--${variant}" x="${x}" y="${y + 4}" width="${cell - 6}" height="${rowHeight - 8}" rx="4"></rect>`;
    }).join('');
    const untied = !isWish && !gated.has(doc.file)
      ? `<line class="fig-dash" x1="${labelWidth + 6}" y1="${y + rowHeight / 2}" x2="${WIDTH - 6}" y2="${y + rowHeight / 2}"></line>`
      : '';
    return `${text(0, y + rowHeight / 2 + 5, doc.file, {variant: 'mono'})}${cells}${untied}`;
  }).join('');
  const legendY = height - 8;
  return {
    uses: ['lifecycle.stages', 'lifecycle.stage_documents', 'documents.record'],
    html: svg({
      width: WIDTH, height,
      title: `Which documents each stage expects. The wish is required at every stage; ${[...gated].join(', ')} are expected from the stage that adds them; the rest appear whenever there is something to record.`,
      className: 'figure-svg--wide',
      body: `${header}${body}
        <rect class="fig-cell fig-cell--on" x="0" y="${legendY - 32}" width="18" height="12" rx="3"></rect>${text(24, legendY - 22, 'expected at this stage; the validator warns if it is missing', {variant: 'caption'})}
        <rect class="fig-cell fig-cell--rest" x="480" y="${legendY - 32}" width="18" height="12" rx="3"></rect>${text(504, legendY - 22, 'still present while it rests', {variant: 'caption'})}
        <line class="fig-dash" x1="0" y1="${legendY - 6}" x2="18" y2="${legendY - 6}"></line>${text(24, legendY - 2, 'tied to no stage: appears whenever there is something to record', {variant: 'caption'})}`,
    }),
  };
}

// Plan, critique the plan, then build.
function planCritique(facts) {
  const stages = facts['lifecycle.stages'];
  const planned = stages.find(stage => /plan/.test(stage)) ?? stages[3];
  const building = stages.find(stage => /build/.test(stage)) ?? stages[4];
  const steps = [
    {variant: 'accent', eyebrow: 'Agent writes', title: 'Plan, test plan', body: ['Phases small enough', 'to review one at a', 'time, and how each', 'one is checked.']},
    {variant: 'go', eyebrow: 'You merge', title: `Stage: ${planned}`, body: ['First todo item:', 'critique the plan.']},
    {variant: 'accent', eyebrow: 'Agent critiques', title: 'The critique', body: ['Against objectives', 'and spec. Splits big', 'phases, adds missing', 'checks and gates.']},
    {variant: 'go', eyebrow: 'You merge', title: 'Revised plan', body: ['Then the first', 'increment in work/,', 'and the stage moves', `to ${building}.`]},
  ];
  const boxWidth = 188;
  const gap = (WIDTH - boxWidth * steps.length) / (steps.length - 1);
  let maxHeight = 0;
  const drawn = steps.map((step, index) => {
    const x = index * (boxWidth + gap);
    const box = node(x, 0, boxWidth, {...step, minHeight: 128});
    maxHeight = Math.max(maxHeight, box.height);
    return {x, html: box.html};
  });
  const arrows = drawn.slice(1).map((box, index) => arrow(drawn[index].x + boxWidth + 4, maxHeight / 2, box.x - 6, maxHeight / 2)).join('');
  const height = maxHeight + 34;
  return {
    uses: ['lifecycle.stages'],
    html: svg({
      width: WIDTH, height,
      title: `The plan and test plan merge at the ${planned} stage, the first item critiques them, and building starts after the revised plan merges.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}${drawn.map(box => box.html).join('')}${arrows}
        ${text(0, height - 6, 'The critique is a todo item with a pull request, not a comment. The log records what it changed.', {variant: 'caption'})}`,
    }),
  };
}

// The lifecycle as a rail, with what each stage adds beneath it.
function lifecycleFlow(facts) {
  const stages = facts['lifecycle.stages'];
  const documents = facts['lifecycle.stage_documents'];
  const gap = 12;
  const widths = stages.map(stage => Math.max(chipWidth(stage, 14), 88));
  const positions = [];
  let cursor = 0;
  for (const width of widths) {
    positions.push(cursor);
    cursor += width + gap;
  }
  const scale = Math.min(1, WIDTH / (cursor - gap));
  const railY = 64;
  const chipH = 34;
  const docTop = railY + chipH + 22;
  let previous = [];
  const added = stages.map(stage => {
    const expected = documents[stage] ?? [];
    const delta = expected.filter(name => !previous.includes(name));
    if (expected.length) previous = expected;
    return delta;
  });
  const maxAdded = Math.max(...added.map(list => list.length), 1);
  const height = docTop + maxAdded * 22 + 44;
  const restingFrom = stages.length - 2;
  const rail = stages.map((stage, index) => {
    const x = positions[index] * scale;
    const w = widths[index] * scale;
    const connector = index === 0 ? '' : arrow(positions[index - 1] * scale + widths[index - 1] * scale + 2, railY + chipH / 2, x - 4, railY + chipH / 2);
    const marks = added[index].map((name, docIndex) => `
      <g class="fig-doc"><rect x="${x}" y="${docTop + docIndex * 22}" width="${w}" height="17" rx="4"></rect>
      <text x="${x + w / 2}" y="${docTop + docIndex * 22 + 8.5}" dominant-baseline="central" text-anchor="middle">${escapeHtml(name)}</text></g>`).join('');
    const note = index === 0
      ? `<g class="fig-doc"><rect x="${x}" y="${docTop}" width="${w}" height="17" rx="4"></rect><text x="${x + w / 2}" y="${docTop + 8.5}" dominant-baseline="central" text-anchor="middle">wish.md</text></g>`
      : '';
    return `${connector}${chip(x, railY, stage, {variant: index >= restingFrom ? 'quiet' : 'stage', width: w, height: chipH})}${marks}${note}`;
  }).join('');
  // The deliberate move back, and the graduation label.
  const backFrom = stages.findIndex(stage => /build/.test(stage));
  const backTo = stages.findIndex(stage => /shape/.test(stage));
  const fromX = (positions[backFrom] + widths[backFrom] / 2) * scale;
  const toX = (positions[backTo] + widths[backTo] / 2) * scale;
  const back = backFrom > 0 && backTo >= 0
    ? `${curve(`M ${fromX} ${railY - 4} C ${fromX} ${railY - 36}, ${toX} ${railY - 36}, ${toX} ${railY - 6}`, {variant: 'person'})}
       ${text((fromX + toX) / 2, railY - 40, 'moves back when an assumption breaks', {variant: 'edge', anchor: 'middle'})}`
    : '';
  const refining = stages.findIndex(stage => /refin/.test(stage));
  const graduation = refining > 0
    ? text((positions[refining] * scale) - 8, railY + chipH + 14, 'graduates', {variant: 'edge', anchor: 'middle'})
    : '';
  const restX = positions[restingFrom] * scale;
  const restW = (positions.at(-1) + widths.at(-1) - positions[restingFrom]) * scale;
  const resting = `<line class="fig-bracket" x1="${restX}" y1="${height - 22}" x2="${restX + restW}" y2="${height - 22}"></line>
    ${text(WIDTH, height - 6, 'resting states: nothing actionable, by your choice', {variant: 'caption', anchor: 'end'})}`;
  return {
    uses: ['lifecycle.stages', 'lifecycle.stage_documents'],
    html: svg({
      width: WIDTH, height,
      title: `The lifecycle in order: ${stages.join(', ')}. Beneath each stage, the documents it adds to the record.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}${rail}${back}${graduation}${resting}
        ${text(0, height - 6, 'Each stage adds documents; none are removed.', {variant: 'caption'})}`,
    }),
  };
}

// Who supplies what, as two lanes that hand work to each other.
function divisionOfLabour(facts) {
  const humanClasses = facts['blockers.human'];
  const personLines = [
    'What you want, in your own words',
    'Facts only you can observe',
    'Authority: spending, access, policy',
    'Answers to blocked questions',
    'The merge, every time',
  ];
  const agentLines = [
    'Objectives, spec, plan, test plan',
    'Alternatives, and the ones rejected',
    'One reviewable increment at a time',
    'Replies to every review comment',
    'Proposed answers to judgment calls',
  ];
  const laneWidth = 330;
  const lineHeight = 24;
  const bodyTop = 78;
  const rightX = WIDTH - laneWidth;
  const waiting = chipRows(0, 0, laneWidth - 40, humanClasses, {variant: 'wait'});
  const laneHeight = bodyTop + personLines.length * lineHeight + waiting.height + 34;
  const height = laneHeight + 30;
  const lane = (x, eyebrow, label, values, variant) => `
    ${panel(x, 0, laneWidth, laneHeight, {variant})}
    ${text(x + 20, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 20, 56, label, {variant: 'heading'})}
    ${bulletLines(x + 20, bodyTop + 6, values, variant, lineHeight)}`;
  const waitingChips = chipRows(20, laneHeight - waiting.height - 18, laneWidth - 40, humanClasses, {variant: 'wait'}).html;
  const midY = laneHeight / 2;
  return {
    uses: ['blockers.human'],
    html: svg({
      width: WIDTH, height,
      title: `You supply intent, facts, authority, and the merge; the agents supply the documents, the increments, and the replies. Items labeled ${humanClasses.join(', ')} wait for a person.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}
        ${lane(0, 'You supply', 'Intent, facts, authority', personLines, 'person')}
        ${lane(rightX, 'The agents supply', 'Everything downstream', agentLines, 'agent')}
        ${text(20, laneHeight - waiting.height - 28, 'Labels that wait for you', {variant: 'eyebrow'})}
        ${waitingChips}
        ${arrow(laneWidth + 12, midY - 16, rightX - 12, midY - 16, {variant: 'person'})}
        ${arrow(rightX - 12, midY + 26, laneWidth + 12, midY + 26, {variant: 'agent'})}
        ${text(WIDTH / 2, midY - 26, 'intent and answers', {variant: 'edge', anchor: 'middle'})}
        ${text(WIDTH / 2, midY + 44, 'pull requests', {variant: 'edge', anchor: 'middle'})}`,
    }),
  };
}

const BLOCKER_MEANINGS = {
  todo: 'another item in this initiative',
  initiative: 'another initiative',
  review: 'an open pull request',
  schedule: 'a date',
  human: 'a judgment call',
  permission: 'an access grant',
  cost: 'money',
  legal: 'a policy question',
  data: 'a fact only you have',
  external: 'an outside service',
  upstream: 'a dependency',
};

// Which blocked items a person has to touch, and which clear on their own.
function blockerTriage(facts) {
  const prefixes = facts['blockers.prefixes'].map(value => value.replace(/:$/, ''));
  const humanClasses = facts['blockers.human'].map(value => value.replace(/:$/, ''));
  const proposable = facts['blockers.proposable'].map(value => value.replace(/:$/, ''));
  const needsPerson = prefixes.filter(prefix => humanClasses.includes(prefix));
  const clearsItself = prefixes.filter(prefix => !humanClasses.includes(prefix));
  const columnWidth = 384;
  const rightX = WIDTH - columnWidth;
  const rows = Math.max(needsPerson.length, clearsItself.length);
  const bodyTop = 86;
  const rowHeight = 34;
  const panelHeight = bodyTop + rows * rowHeight + 10;
  const height = panelHeight + 30;
  const column = (x, variant, eyebrow, heading, values) => `
    ${panel(x, 0, columnWidth, panelHeight, {variant})}
    ${text(x + 20, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 20, 58, heading, {variant: 'heading'})}
    ${values.map((value, index) => {
      const canPropose = proposable.includes(value);
      const y = bodyTop + index * rowHeight - 14;
      const chipHtml = chip(x + 20, y, value, {variant: canPropose ? 'propose' : variant, width: 100, height: 26});
      const meaning = BLOCKER_MEANINGS[value] ?? '';
      const note = canPropose ? `${meaning}; an agent may propose` : meaning;
      return `${chipHtml}${text(x + 130, y + 17, note, {variant: 'note'})}`;
    }).join('')}`;
  return {
    uses: ['blockers.prefixes', 'blockers.human', 'blockers.proposable'],
    html: svg({
      width: WIDTH, height,
      title: `${needsPerson.join(', ')} wait for a person; ${clearsItself.join(', ')} clear when something else moves. Items labeled ${proposable.join(', ')} may receive a proposed answer from an agent.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}
        ${column(0, 'wait', 'Waits on you', 'You have to act', needsPerson)}
        ${column(rightX, 'auto', 'Waits on something else', 'Clears when that moves', clearsItself)}
        ${text(0, height - 6, 'The dashed label is the one an agent may answer with a pull request; the others wait until you act.', {variant: 'caption'})}`,
    }),
  };
}

const PHASE_MEANINGS = {
  survey: 'Read everything and report',
  respond: 'Answer review comments',
  propose: 'Propose answers to open questions',
  work: 'Start new items from the todo lists',
};

// One sweep run: the phases in order, and the budget they share.
function sweepRun(facts) {
  const phases = facts['sweep.phases'];
  const budget = facts['sweep.budget'];
  const boxWidth = 176;
  const gap = (WIDTH - boxWidth * phases.length) / Math.max(1, phases.length - 1);
  const boxTop = 32;
  const boxes = phases.map((phase, index) => {
    const x = index * (boxWidth + gap);
    const meaning = wrapLines(PHASE_MEANINGS[phase] ?? '', 20);
    const box = node(x, boxTop, boxWidth, {variant: index === 0 ? 'quiet' : 'accent', eyebrow: `Phase ${index + 1}`, title: phase, body: meaning, minHeight: 104});
    return {x, html: box.html, height: box.height};
  });
  const boxHeight = Math.max(...boxes.map(box => box.height));
  const arrows = boxes.slice(1).map((box, index) => arrow(boxes[index].x + boxWidth + 4, boxTop + boxHeight / 2, box.x - 6, boxTop + boxHeight / 2)).join('');
  const meterTop = boxTop + boxHeight + 52;
  const slots = budget.items_per_run;
  const slotWidth = 56;
  const meter = Array.from({length: slots}, (_, index) => `<rect class="fig-slot" x="${index * (slotWidth + 8)}" y="${meterTop}" width="${slotWidth}" height="22" rx="5"></rect>`).join('');
  const height = meterTop + 78;
  return {
    uses: ['sweep.phases', 'sweep.budget'],
    html: svg({
      width: WIDTH, height,
      title: `A run moves through ${phases.join(', then ')}, sharing one budget of ${slots} items per run.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}
        ${text(0, 16, 'Every run, in this order', {variant: 'eyebrow'})}
        ${boxes.map(box => box.html).join('')}${arrows}
        ${text(0, meterTop - 14, `One budget, currently ${slots} items per run, spent in phase order`, {variant: 'eyebrow'})}
        ${meter}
        ${text(0, meterTop + 46, `At most ${budget.max_items_per_initiative} from any one initiative; the run stops at ${budget.max_open_prs} open pull requests.`, {variant: 'caption'})}
        ${text(0, meterTop + 66, 'Every result is a pull request. Nothing is merged by a run.', {variant: 'caption'})}`,
    }),
  };
}

// One increment, from branch to merge, and what the merge does.
function reviewLoop(facts) {
  const respond = facts['skills.respond-to-review'].name;
  const merge = facts['skills.merge-prs'].name;
  const steps = [
    {variant: 'accent', eyebrow: 'Agent', title: 'Pull request', body: ['sweep/<slug>/<item>', 'Writes only inside', 'its initiative and', 'declared outputs.']},
    {variant: 'quiet', eyebrow: 'CI', title: 'Scope check', body: ['Fails if the diff', 'reaches outside.', 'The branch preview', 'is built.']},
    {variant: 'person', eyebrow: 'You', title: 'Review', body: ['Read the diff or the', 'preview. Comment,', 'or merge.']},
    {variant: 'go', eyebrow: 'Merge', title: 'Item completed', body: ['Removed from the', 'list. Dependents', 'unblocked. Log', 'entry written.']},
  ];
  const boxWidth = 188;
  const gap = (WIDTH - boxWidth * steps.length) / (steps.length - 1);
  let maxHeight = 0;
  const drawn = steps.map((step, index) => {
    const x = index * (boxWidth + gap);
    const box = node(x, 0, boxWidth, {...step, minHeight: 128});
    maxHeight = Math.max(maxHeight, box.height);
    return {x, html: box.html};
  });
  const arrows = drawn.slice(1).map((box, index) => arrow(drawn[index].x + boxWidth + 4, maxHeight / 2, box.x - 6, maxHeight / 2)).join('');
  const loopY = maxHeight + 34;
  const reviewX = drawn[2].x + boxWidth / 2;
  const agentX = drawn[0].x + boxWidth / 2;
  const loop = `${curve(`M ${reviewX} ${maxHeight + 2} C ${reviewX} ${loopY + 4}, ${agentX} ${loopY + 4}, ${agentX} ${maxHeight + 4}`, {variant: 'person'})}
    ${text((reviewX + agentX) / 2, loopY + 20, `comments go back to the agent: the next sweep, or ${respond}`, {variant: 'edge', anchor: 'middle'})}`;
  const mergeNote = text(WIDTH, loopY + 20, `${merge} merges a green batch`, {variant: 'edge', anchor: 'end'});
  const height = loopY + 34;
  return {
    uses: ['skills.respond-to-review', 'skills.merge-prs'],
    html: svg({
      width: WIDTH, height,
      title: `An agent opens a scoped pull request, CI checks its write scope, you review it, and the merge completes the item. Comments go back to the agent through ${respond}; ${merge} merges what is green.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}${drawn.map(box => box.html).join('')}${arrows}${loop}${mergeNote}`,
    }),
  };
}

const ENVIRONMENT_HEADINGS = {test: 'Test', prod: 'Production'};
const KIND_ENVIRONMENTS = {
  'ChatGPT Site': ['a separate test Site, private by default', 'the production Site, from committed files'],
  Demo: ['the branch preview GitHub Pages publishes', 'demos/ on main, live when the branch merges'],
};

// The two environments every deployment has, split by who may write them.
function deploymentEnvironments(facts) {
  const environments = facts['deployments.environments'];
  const kinds = facts['deployments.kinds'];
  const [testName, prodName] = environments;
  const lanes = [
    {name: testName, variant: 'auto', eyebrow: 'Written by any agent, any time', lines: ['Refreshed whenever you want a look', 'Overwritten as often as needed', 'Keeps no history'], skill: facts['skills.deploy-test'].name},
    {name: prodName, variant: 'wait', eyebrow: 'Written only when a person asks', lines: ['Released from committed files only', 'Refuses an uncommitted source', 'Records the commit and a release entry'], skill: facts['skills.release-initiative'].name},
  ];
  const laneWidth = 330;
  const rightX = WIDTH - laneWidth;
  const bodyTop = 84;
  const lineHeight = 24;
  const skillTop = bodyTop + lanes[0].lines.length * lineHeight + 2;
  const laneHeight = skillTop + CHIP_HEIGHT + 18;
  const lane = (x, {name, variant, eyebrow, lines: values, skill}) => `
    ${panel(x, 0, laneWidth, laneHeight, {variant})}
    ${text(x + 20, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 20, 56, ENVIRONMENT_HEADINGS[name] ?? name, {variant: 'heading'})}
    ${bulletLines(x + 20, bodyTop + 6, values, variant === 'wait' ? 'person' : 'agent', lineHeight)}
    ${chip(x + 20, skillTop, skill, {variant: variant === 'wait' ? 'wait' : 'phase'})}`;
  const tableTop = laneHeight + 40;
  const rowHeight = 28;
  const table = `${text(0, tableTop - 12, 'What each environment is, by kind', {variant: 'eyebrow'})}
    ${kinds.map((kind, index) => {
      const y = tableTop + index * rowHeight + 18;
      const [testText, prodText] = KIND_ENVIRONMENTS[kind] ?? ['', ''];
      return `${text(0, y, kind, {variant: 'heading-small'})}${text(130, y, testText)}${text(rightX, y, prodText)}`;
    }).join('')}`;
  const height = tableTop + kinds.length * rowHeight + 20;
  return {
    uses: ['deployments.environments', 'deployments.kinds', 'skills.deploy-test', 'skills.release-initiative'],
    html: svg({
      width: WIDTH, height,
      title: `Every deployment has a ${testName} environment any agent may overwrite and a ${prodName} environment only a person releases. Both exist for every kind: ${kinds.join(' and ')}.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}
        ${lane(0, lanes[0])}
        ${lane(rightX, lanes[1])}
        ${arrow(laneWidth + 12, laneHeight / 2, rightX - 12, laneHeight / 2, {variant: 'person'})}
        ${text(WIDTH / 2, laneHeight / 2 - 26, 'you ask for', {variant: 'edge', anchor: 'middle'})}
        ${text(WIDTH / 2, laneHeight / 2 - 12, 'a release', {variant: 'edge', anchor: 'middle'})}
        ${table}`,
    }),
  };
}

// What a fork carries away, and what it leaves behind.
function forkBoundary(facts) {
  const protectedPaths = facts['sweep.protected_paths'];
  const carry = [
    'AGENTS.md, the working instructions',
    'scripts/initiatives.mjs and its tests',
    'The sweep prompt and sweep.json',
    'The skills under .claude/skills/',
    'The four workflows under .github/',
    'The build script and shared libraries',
  ];
  const leave = [
    'Published decks',
    'Standalone demos',
    'Existing initiatives and their histories',
    'This guide, until you regenerate it',
  ];
  const columnWidth = 384;
  const rightX = WIDTH - columnWidth;
  const bodyTop = 84;
  const paths = chipRows(0, 0, columnWidth - 40, protectedPaths, {variant: 'path'});
  const panelHeight = bodyTop + carry.length * 24 + paths.height + 44;
  const height = panelHeight + 30;
  const column = (x, variant, eyebrow, heading, values, footer) => `
    ${panel(x, 0, columnWidth, panelHeight, {variant})}
    ${text(x + 20, 30, eyebrow, {variant: 'eyebrow'})}
    ${text(x + 20, 58, heading, {variant: 'heading'})}
    ${bulletLines(x + 20, bodyTop + 6, values, variant, 24)}
    ${footer}`;
  const pathChips = `${text(20, panelHeight - paths.height - 24, 'Protected paths a sweep may never write', {variant: 'eyebrow'})}
    ${chipRows(20, panelHeight - paths.height - 16, columnWidth - 40, protectedPaths, {variant: 'path'}).html}`;
  return {
    uses: ['sweep.protected_paths'],
    html: svg({
      width: WIDTH, height,
      title: `A fork carries the process files and leaves this repository's own content behind. The protected paths are ${protectedPaths.join(', ')}.`,
      className: 'figure-svg--wide',
      body: `${ARROW_DEFS}
        ${column(0, 'carry', 'Take it', 'The process', carry, pathChips)}
        ${column(rightX, 'leave', 'Leave it', 'This repository’s content', leave, '')}
        ${text(0, height - 6, 'The initiatives folder can start empty. The first skill you run creates the first one.', {variant: 'caption'})}`,
    }),
  };
}

export const FIGURES = {
  'repo-map': repoMap,
  'initiative-products': initiativeProducts,
  'initiative-birth': initiativeBirth,
  'record-growth': recordGrowth,
  'plan-critique': planCritique,
  'lifecycle-flow': lifecycleFlow,
  'division-of-labor': divisionOfLabour,
  'blocker-triage': blockerTriage,
  'sweep-run': sweepRun,
  'review-loop': reviewLoop,
  'deployment-environments': deploymentEnvironments,
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
// figure reads correctly on a white page and on a slide.
export const FIGURE_CSS = `
.figure { margin: 28px 0; }
.figure-svg { display: block; width: 100%; height: auto; max-width: 800px; margin: 0 auto; overflow: visible; font-family: inherit; }
.figure-svg--wide { max-width: 100%; }
.fig-chip rect { fill: var(--fig-fill); stroke: var(--fig-line); stroke-width: 1; }
.fig-chip text { fill: var(--fig-ink); font-size: 13.5px; font-weight: 700; }
.fig-chip--stage rect, .fig-chip--phase rect { fill: var(--fig-accent); stroke: var(--fig-accent); }
.fig-chip--stage text, .fig-chip--phase text { fill: #fff; font-size: 14px; }
.fig-chip--quiet rect { fill: var(--fig-surface); stroke: var(--fig-muted); stroke-dasharray: 4 3; }
.fig-chip--quiet text { fill: var(--fig-muted); font-size: 14px; }
.fig-chip--wait rect, .fig-chip--propose rect { fill: var(--fig-warn-soft); stroke: var(--fig-warn); }
.fig-chip--wait text, .fig-chip--propose text { fill: var(--fig-warn-ink); font-size: 12.5px; }
.fig-chip--propose rect { stroke-dasharray: 5 3; stroke-width: 1.5; }
.fig-chip--auto rect, .fig-chip--go rect { fill: var(--fig-go-soft); stroke: var(--fig-go); }
.fig-chip--auto text, .fig-chip--go text { fill: var(--fig-go-ink); font-size: 12.5px; }
.fig-chip--path rect { fill: var(--fig-surface); stroke: var(--fig-line); }
.fig-chip--path text, .fig-chip--doc text { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-weight: 600; }
.fig-chip--doc rect { fill: var(--fig-doc); stroke: none; }
.fig-chip--doc text { fill: var(--fig-doc-ink); font-size: 11px; }
.fig-panel rect { fill: var(--fig-fill); stroke: var(--fig-line); stroke-width: 1; }
.fig-panel--surface rect { fill: var(--fig-surface); }
.fig-panel--quiet rect { fill: var(--fig-fill); stroke: var(--fig-line); }
.fig-panel--area rect { fill: var(--fig-surface); stroke: var(--fig-line); }
.fig-panel--accent rect, .fig-panel--agent rect, .fig-panel--auto rect { fill: var(--fig-accent-soft); stroke: var(--fig-accent); }
.fig-panel--person rect, .fig-panel--wait rect { fill: var(--fig-warn-soft); stroke: var(--fig-warn); }
.fig-panel--go rect, .fig-panel--carry rect { fill: var(--fig-go-soft); stroke: var(--fig-go); }
.fig-panel--leave rect { fill: var(--fig-surface); stroke: var(--fig-line); stroke-dasharray: 5 4; }
.fig-text { fill: var(--fig-ink); font-size: 14px; }
.fig-text--mono { fill: var(--fig-ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 600; }
.fig-text--eyebrow { fill: var(--fig-muted); font-size: 11px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.fig-text--heading { fill: var(--fig-ink); font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
.fig-text--heading-small { fill: var(--fig-ink); font-size: 14px; font-weight: 800; }
.fig-text--head { fill: var(--fig-accent-ink); font-size: 13px; font-weight: 800; }
.fig-text--muted-head { fill: var(--fig-muted); font-size: 13px; font-weight: 700; }
.fig-text--caption { fill: var(--fig-muted); font-size: 12.5px; }
.fig-text--note { fill: var(--fig-muted); font-size: 12.5px; }
.fig-text--edge { fill: var(--fig-muted); font-size: 12px; font-weight: 700; letter-spacing: .03em; }
.fig-doc rect { fill: var(--fig-doc); stroke: none; }
.fig-doc text { fill: var(--fig-doc-ink); font-size: 10.5px; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.fig-cell--on { fill: var(--fig-accent); opacity: .85; }
.fig-cell--rest { fill: var(--fig-accent); opacity: .28; }
.fig-dash { stroke: var(--fig-line); stroke-width: 1.5; stroke-dasharray: 4 4; }
.fig-bracket { stroke: var(--fig-muted); stroke-width: 1.5; }
.fig-arrow { stroke: var(--fig-muted); stroke-width: 1.8; }
.fig-arrow--person { stroke: var(--fig-warn); }
.fig-arrow--agent { stroke: var(--fig-accent); }
.fig-arrow--go { stroke: var(--fig-go); }
.fig-arrow-head { fill: var(--fig-muted); }
.fig-dot { fill: var(--fig-muted); }
.fig-dot--person, .fig-dot--wait, .fig-dot--carry { fill: var(--fig-warn); }
.fig-dot--agent, .fig-dot--auto { fill: var(--fig-accent); }
.fig-dot--carry { fill: var(--fig-go); }
.fig-dot--go { fill: var(--fig-go); }
.fig-slot { fill: var(--fig-accent-soft); stroke: var(--fig-accent); stroke-width: 1.2; }
`;
