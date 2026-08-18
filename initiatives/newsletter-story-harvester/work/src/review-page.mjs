const DEFAULT_VERDICTS = ['dropped', 'kept', 'emphasised'];

function embeddedJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

export function reviewPageHtml(store, {title = 'Newsletter story review'} = {}) {
  if (!store || !Array.isArray(store.stories) || !store.store_id) {
    throw new Error('review page: a store with store_id and stories is required');
  }
  const verdicts = [...new Set([
    ...DEFAULT_VERDICTS,
    ...(store.vocabularies?.verdict || []),
    ...store.stories.map(story => story.verdict).filter(Boolean),
  ])];
  const payload = {...structuredClone(store), vocabularies: {...store.vocabularies, verdict: verdicts}};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font: 16px/1.45 Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #f4f6fb; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, select { font: inherit; }
    button { cursor: pointer; }
    .top { position: sticky; top: 0; z-index: 5; padding: 18px max(20px, calc((100vw - 1120px) / 2)); background: rgba(244,246,251,.96); border-bottom: 1px solid #dce2ef; backdrop-filter: blur(12px); }
    .headline { display: flex; align-items: baseline; justify-content: space-between; gap: 20px; }
    h1 { margin: 0; color: #193b8f; font-size: clamp(1.55rem, 3vw, 2.25rem); }
    .backlog { font-weight: 750; color: #8b2f17; white-space: nowrap; }
    .toolbar { display: grid; grid-template-columns: repeat(4, minmax(145px, 1fr)) auto; gap: 10px; margin-top: 14px; }
    label { display: grid; gap: 4px; color: #4a566f; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    select, .tool-button { min-height: 42px; border: 1px solid #c9d2e4; border-radius: 10px; background: white; color: #172033; padding: 8px 10px; }
    .tool-button { align-self: end; font-weight: 700; }
    .tool-button.primary { color: white; border-color: #2149a4; background: #2149a4; }
    main { width: min(1120px, calc(100% - 40px)); margin: 28px auto 80px; display: grid; gap: 14px; }
    .empty { padding: 40px; text-align: center; color: #667085; background: white; border-radius: 14px; }
    .story { border: 1px solid #dbe2ef; border-radius: 14px; background: white; box-shadow: 0 8px 25px rgba(33, 51, 89, .06); overflow: hidden; }
    .story[open] { border-color: #9eb3e3; }
    summary { list-style: none; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; padding: 16px 18px; cursor: pointer; }
    summary::-webkit-details-marker { display: none; }
    .title { font-size: 1.05rem; font-weight: 760; color: #17264a; }
    .meta { margin-top: 4px; color: #657087; font-size: .85rem; }
    .verdict { align-self: center; border-radius: 999px; padding: 5px 9px; background: #eef2fa; color: #4f5e7a; font-size: .78rem; font-weight: 800; }
    .verdict.unjudged { background: #fff3df; color: #8b4d00; }
    .body { border-top: 1px solid #e7ebf3; padding: 18px; }
    .story-text { margin: 0 0 12px; white-space: pre-wrap; }
    .summary-note { color: #73510d; font-size: .85rem; }
    .story-link { color: #1745a1; font-weight: 650; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0; }
    .tag { padding: 3px 8px; border-radius: 999px; background: #edf2ff; color: #334d87; font-size: .78rem; }
    .verdict-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .verdict-buttons button { border: 1px solid #c9d2e4; border-radius: 9px; padding: 7px 10px; background: #fff; }
    .verdict-buttons button[aria-pressed="true"] { color: white; background: #2149a4; border-color: #2149a4; }
    footer { width: min(1120px, calc(100% - 40px)); margin: -55px auto 30px; color: #758096; font-size: .8rem; }
    @media (max-width: 850px) { .toolbar { grid-template-columns: 1fr 1fr; } .headline { align-items: flex-start; flex-direction: column; gap: 4px; } }
    @media (max-width: 520px) { .toolbar { grid-template-columns: 1fr; } main { width: min(100% - 20px, 1120px); } summary { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="top">
    <div class="headline">
      <h1>${escapeHtml(title)}</h1>
      <div class="backlog" id="backlog" aria-live="polite"></div>
    </div>
    <div class="toolbar">
      <label>Sort
        <select id="sort">
          <option value="story-date">Story date</option>
          <option value="issue-date">Issue date</option>
          <option value="source">Source</option>
          <option value="unjudged">Unjudged first</option>
        </select>
      </label>
      <label>Filter by tag
        <select id="filter"><option value="">All tags</option></select>
      </label>
      <label>Verdict for visible rest
        <select id="sweep-verdict"></select>
      </label>
      <button class="tool-button" id="verdict-rest">Judge visible unjudged</button>
      <button class="tool-button" id="undo" disabled>Undo</button>
      <button class="tool-button primary" id="export">Export verdicts</button>
    </div>
  </header>
  <main id="stories"></main>
  <footer>Self-contained review for store <strong>${escapeHtml(store.store_id)}</strong>. The store is never written by this page.</footer>
  <script id="store-data" type="application/json">${embeddedJson(payload)}</script>
  <script>
  (() => {
    'use strict';
    const store = JSON.parse(document.getElementById('store-data').textContent);
    const stories = store.stories.map((story) => Object.assign({}, story, { tags: Array.from(story.tags || []) }));
    const verdicts = Array.from(new Set(store.vocabularies.verdict || []));
    const state = { filter: '', sort: 'story-date', undo: [] };
    const root = document.getElementById('stories');
    const backlog = document.getElementById('backlog');
    const filter = document.getElementById('filter');
    const sort = document.getElementById('sort');
    const sweepVerdict = document.getElementById('sweep-verdict');
    const undo = document.getElementById('undo');

    function dateOf(story) { return story.story_date || story.issue_date || ''; }
    function visible(story) { return !state.filter || story.tags.includes(state.filter); }
    function sortedVisible() {
      const rows = stories.filter(visible);
      const byText = (a, b) => String(a).localeCompare(String(b));
      rows.sort((a, b) => {
        if (state.sort === 'source') return byText(a.source, b.source) || byText(dateOf(b), dateOf(a));
        if (state.sort === 'issue-date') return byText(b.issue_date, a.issue_date) || byText(a.title, b.title);
        if (state.sort === 'unjudged') return Number(a.verdict !== null) - Number(b.verdict !== null) || byText(dateOf(b), dateOf(a));
        return byText(dateOf(b), dateOf(a)) || byText(a.title, b.title);
      });
      return rows;
    }

    function setVerdicts(targets, verdict) {
      const at = new Date().toISOString();
      const changes = targets.map((story) => ({ id: story.id, verdict: story.verdict, verdict_at: story.verdict_at }));
      if (!changes.length) return;
      for (const story of targets) { story.verdict = verdict; story.verdict_at = at; }
      state.undo.push(changes);
      render();
    }

    function undoLast() {
      const changes = state.undo.pop();
      if (!changes) return;
      const byId = new Map(stories.map(story => [story.id, story]));
      for (const change of changes) Object.assign(byId.get(change.id), { verdict: change.verdict, verdict_at: change.verdict_at });
      render();
    }

    function getExport() {
      return {
        store_id: store.store_id,
        exported_at: new Date().toISOString(),
        verdicts: stories.filter(story => story.verdict !== null).map(story => ({ id: story.id, verdict: story.verdict, verdict_at: story.verdict_at })),
        tags: []
      };
    }

    function downloadExport() {
      const blob = new Blob([JSON.stringify(getExport(), null, 2) + '\\n'], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'newsletter-verdicts-' + store.store_id + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function text(tag, className, value) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      node.textContent = value;
      return node;
    }

    function storyCard(story) {
      const details = document.createElement('details');
      details.className = 'story';
      details.dataset.id = story.id;
      details.dataset.source = story.source || '';
      details.dataset.tags = JSON.stringify(story.tags);
      details.dataset.verdict = story.verdict || '';
      const summary = document.createElement('summary');
      const heading = document.createElement('div');
      heading.append(text('div', 'title', story.title || '(untitled)'));
      heading.append(text('div', 'meta', (story.source || 'unknown source') + ' · ' + dateOf(story)));
      summary.append(heading);
      summary.append(text('span', 'verdict' + (story.verdict === null ? ' unjudged' : ''), story.verdict || 'unjudged'));
      details.append(summary);
      const body = document.createElement('div'); body.className = 'body';
      body.append(text('p', 'story-text', story.text || '(No text)'));
      if (story.text_is_summary) body.append(text('p', 'summary-note', 'This text is a harvester summary.'));
      if (/^https?:\\/\\//i.test(story.url || '')) {
        const link = text('a', 'story-link', 'Open story'); link.href = story.url; link.target = '_blank'; link.rel = 'noreferrer'; body.append(link);
      }
      const tags = document.createElement('div'); tags.className = 'tags';
      for (const tag of story.tags) tags.append(text('span', 'tag', tag));
      body.append(tags);
      const controls = document.createElement('div'); controls.className = 'verdict-buttons'; controls.setAttribute('aria-label', 'Verdict');
      for (const verdict of verdicts) {
        const button = text('button', '', verdict);
        button.type = 'button'; button.dataset.verdict = verdict; button.setAttribute('aria-pressed', String(story.verdict === verdict));
        button.addEventListener('click', () => setVerdicts([story], verdict)); controls.append(button);
      }
      body.append(controls); details.append(body); return details;
    }

    function render() {
      root.replaceChildren(...sortedVisible().map(storyCard));
      if (!root.children.length) root.append(text('div', 'empty', 'No stories match this tag.'));
      const remaining = stories.filter(story => story.verdict === null).length;
      backlog.textContent = remaining + ' unjudged of ' + stories.length;
      undo.disabled = state.undo.length === 0;
    }

    for (const tag of Array.from(new Set(stories.flatMap(story => story.tags))).sort()) {
      const option = document.createElement('option'); option.value = tag; option.textContent = tag; filter.append(option);
    }
    for (const verdict of verdicts) {
      const option = document.createElement('option'); option.value = verdict; option.textContent = verdict; sweepVerdict.append(option);
    }
    filter.addEventListener('change', () => { state.filter = filter.value; render(); });
    sort.addEventListener('change', () => { state.sort = sort.value; render(); });
    document.getElementById('verdict-rest').addEventListener('click', () => setVerdicts(stories.filter(story => visible(story) && story.verdict === null), sweepVerdict.value));
    undo.addEventListener('click', undoLast);
    document.getElementById('export').addEventListener('click', downloadExport);
    window.reviewPage = { getExport, undo: undoLast, verdictRest: verdict => setVerdicts(stories.filter(story => visible(story) && story.verdict === null), verdict) };
    render();
  })();
  </script>
</body>
</html>\n`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}
