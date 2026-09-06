const DEFAULT_VERDICTS = ['dropped', 'kept', 'emphasised'];

const hostedJudgmentsScript = `
    const endpoint = '/api/verdicts?store_id=' + encodeURIComponent(store.store_id);
    function saveStatus(message, error = false) {
      const status = document.getElementById('save-status');
      status.textContent = message; status.dataset.error = String(error);
      document.getElementById('retry-save').hidden = !error || ready;
    }
    function applySaved(data) {
      if (data.store_id !== store.store_id || !Number.isSafeInteger(data.revision) || !data.judgments) throw new Error('Invalid saved state');
      revision = data.revision;
      for (const story of stories) {
        const judgment = data.judgments[story.id];
        if (!judgment) throw new Error('Missing judgment');
        story.verdict = judgment.verdict; story.verdict_at = judgment.verdict_at;
        if (story.verdict && !verdicts.includes(story.verdict)) verdicts.push(story.verdict);
      }
      ready = true;
    }
    async function loadJudgments() {
      if (saving) return;
      saving = true; ready = false; render(); saveStatus('Loading saved judgments…');
      try {
        const response = await fetch(endpoint, {cache: 'no-store'});
        if (!response.ok) throw new Error('Load failed');
        applySaved(await response.json()); state.undo = [];
        saveStatus('All judgments saved');
      } catch {
        ready = false; saveStatus('Could not load saved judgments. Use Reload judgments to try again.', true);
      } finally { saving = false; render(); }
    }
    async function persistChanges(changes, onSaved) {
      if (!ready || saving || !changes.length) return;
      saving = true; render(); saveStatus('Saving judgments…');
      try {
        const response = await fetch(endpoint, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision, changes})});
        const data = await response.json();
        if (response.status === 409 && data.judgments) {
          applySaved(data); state.undo = [];
          saveStatus('Newer judgments loaded from another tab. Please choose again.', true);
        } else {
          if (!response.ok) throw new Error('Save failed');
          applySaved(data); onSaved(); saveStatus('All judgments saved');
        }
      } catch {
        ready = false;
        saveStatus('Save not confirmed. Use Reload judgments to check the database before trying again.', true);
      } finally { saving = false; render(); }
    }
    function setVerdicts(targets, verdict) {
      const changes = targets.map(story => ({id: story.id, verdict: story.verdict, verdict_at: story.verdict_at}));
      return persistChanges(targets.map(story => ({id: story.id, verdict})), () => state.undo.push(changes));
    }
    function undoLast() {
      const changes = state.undo.at(-1);
      if (!changes) return;
      return persistChanges(changes.map(({id, verdict}) => ({id, verdict})), () => state.undo.pop());
    }
    window.addEventListener('beforeunload', event => { if (saving) { event.preventDefault(); event.returnValue = ''; } });
`;

/**
 * What a published story may carry. This is an allow-list rather than a list of
 * fields to delete, so a field added to the record later cannot reach a
 * published page until someone names it here. `source_doc` and `source_anchor`
 * are the two that must never travel (spec.md 12, 6) - an allow-list is what
 * stops a third one arriving unnoticed.
 */
const PUBLISHED_STORY_FIELDS = [
  'id', 'url', 'title', 'text', 'text_is_summary',
  'source', 'issue_date', 'story_date', 'tags', 'verdict'
];

function embeddedJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

function publishedStory(story) {
  const published = {};
  for (const field of PUBLISHED_STORY_FIELDS) {
    if (field in story) published[field] = structuredClone(story[field]);
  }
  if (!Array.isArray(published.tags)) published.tags = [];
  return published;
}

function publishedClusters(store, selected) {
  const kept = new Set(selected.map(story => story.id));
  const clusters = {};
  for (const [tag, cluster] of Object.entries(store.clusters || {})) {
    const members = (cluster.members || []).filter(id => kept.has(id));
    if (members.length < 2) continue;
    clusters[tag] = {tag: cluster.tag, paraphrase: cluster.paraphrase, members};
  }
  return clusters;
}

function reviewSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((source) => ({
    name: String(source?.name || '').trim(),
    slug: String(source?.slug || '').trim(),
    search: String(source?.search || '').trim()
  })).filter((source) => source.name && source.slug && source.search);
}

/**
 * @param store                the durable store
 * @param options.title        page heading
 * @param options.include      verdicts to render; null renders every story
 * @param options.judgeable    false removes every control that can judge, and
 *                             withholds provenance. The two ride together on
 *                             purpose: a page nobody can judge on is a page
 *                             meant to leave this machine, so publishing cannot
 *                             be half-done by forgetting a second flag.
 * @param options.persistence  true uses the authenticated hosted judgment API
 * @param options.sources      safe source help: name, slug, Gmail search string
 */
export function reviewPageHtml(store, {
  title = 'Newsletter story review',
  include = null,
  judgeable = true,
  sources = [],
  persistence = false
} = {}) {
  if (!store || !Array.isArray(store.stories) || !store.store_id) {
    throw new Error('review page: a store with store_id and stories is required');
  }
  const selected = include
    ? store.stories.filter(story => include.includes(story.verdict))
    : store.stories;
  const verdicts = [...new Set([
    ...DEFAULT_VERDICTS,
    ...(store.vocabularies?.verdict || []),
    ...selected.map(story => story.verdict).filter(Boolean),
  ])];
  const payload = judgeable
    ? {
        ...structuredClone(store),
        stories: structuredClone(selected),
        review_sources: reviewSources(sources),
        vocabularies: {...store.vocabularies, verdict: verdicts}
      }
    : {
        // No `runs`: a run record accounts for issues by `source_doc`, which is
        // the same provenance the stories drop.
        store_id: store.store_id,
        stories: selected.map(publishedStory),
        clusters: publishedClusters(store, selected),
        vocabularies: {verdict: verdicts}
      };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <script>
    try { document.documentElement.dataset.theme = localStorage.getItem('newsletter-review-theme') === 'night' ? 'night' : 'day'; } catch { document.documentElement.dataset.theme = 'day'; }
  </script>
  <style>
    :root { color-scheme: light; font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; --canvas: #faf3e8; --surface: #fffdf7; --subtle: #f2ebdf; --ink: #173138; --muted: #506a70; --line: #d6c8b7; --control-line: #a69581; --control: #f0e9dd; --primary: #d3e8e1; --primary-edge: #acc9bf; --link: #005965; --focus: #007580; --selected: #54736e; --green: #e1eee4; --green-ink: #235f35; --red: #f8e1dc; --red-ink: #8e3029; --purple: #eee4f6; --purple-ink: #613d7d; --amber: #f6ecd5; --amber-ink: #72500d; --tag: #cfe5df; --tag-ink: #244f51; background: var(--canvas); color: var(--ink); }
    :root[data-theme="night"] { color-scheme: dark; --canvas: #171f28; --surface: #222d39; --subtle: #283543; --ink: #edf2f7; --muted: #b9c7d5; --line: #4b5d70; --control-line: #708397; --control: #2c3947; --primary: #355158; --primary-edge: #658087; --link: #83d5dc; --focus: #67c9d0; --selected: #b9c7d5; --green: #2d4944; --green-ink: #b3ddc1; --red: #513b42; --red-ink: #ffd0ca; --purple: #473e58; --purple-ink: #dec5f5; --amber: #504733; --amber-ink: #f3dcaa; --tag: #304c53; --tag-ink: #c6e7e4; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, select { font: inherit; font-size: 14px; color: var(--ink); border: 1px solid var(--control-line); border-radius: 12px; background: var(--control); min-height: 34px; padding: 5px 11px; }
    button { cursor: pointer; font-weight: 400; }
    button:hover:not(:disabled) { box-shadow: inset 0 0 0 100px #80808012; }
    button:disabled { opacity: .5; cursor: default; }
    :focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
    .top, main, .pagination, footer { width: min(1800px, calc(100% - 48px)); margin-inline: auto; }
    .top { padding-block: 22px 18px; position: sticky; top: 0; z-index: 5; background: var(--canvas); }
    .headline { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    h1 { margin: 0; font-size: clamp(1.4rem, 2.2vw, 1.8rem); font-weight: 600; letter-spacing: -.025em; }
    .headline-tools { display: flex; align-items: center; gap: 18px; }
    .backlog { color: var(--muted); font-size: 14px; }
    .theme-control { display: flex; align-items: center; gap: 8px; }
    .toolbar { display: flex; align-items: end; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    label { display: grid; gap: 5px; color: var(--muted); font-size: 13px; }
    select { background: var(--surface); max-width: 240px; }
    .tool-button.primary { background: var(--primary); border-color: var(--primary-edge); }
    #help { margin-left: auto; }
    main { display: grid; grid-template-columns: repeat(var(--columns, 3), minmax(0, 1fr)); grid-auto-rows: clamp(350px, calc((100dvh - 250px) / var(--rows, 2)), 900px); gap: 16px; }
    .empty { grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--muted); border: 1px solid var(--line); border-radius: 18px; background: var(--surface); }
    .story { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 18px; background: var(--surface); overflow: hidden; min-width: 0; }
    .story::details-content { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .story:not([open])::details-content { display: none; }
    summary { list-style: none; display: flex; flex-wrap: wrap; align-items: start; gap: 8px; padding: 16px 18px 12px; cursor: pointer; flex: none; }
    summary > div { flex: 1 1 170px; min-width: 0; }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '−'; color: var(--muted); }
    .story:not([open]) summary::after { content: '+'; }
    .title { font-size: 18px; line-height: 1.35; font-weight: 600; overflow-wrap: anywhere; }
    .story-link { color: var(--link); text-decoration-thickness: .06em; text-underline-offset: .15em; }
    .meta { margin-top: 6px; color: var(--muted); font-size: 13px; }
    .verdict { border-radius: 999px; padding: 3px 8px; background: var(--subtle); color: var(--muted); font-size: 12px; }
    .verdict.unjudged { background: var(--amber); color: var(--amber-ink); }
    .body { border-top: 1px solid var(--line); padding: 16px 18px; flex: 1; min-height: 0; overflow: auto; scrollbar-color: var(--control-line) transparent; }
    .story-text { margin: 0 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .cluster-paraphrase { margin: 0 0 16px; }
    .cluster-members { display: grid; gap: 12px; }
    .cluster-member { padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--subtle); }
    .cluster-member h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .cluster-member .story-text { margin-top: 10px; }
    .summary-note { color: var(--amber-ink); font-size: 14px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 0; }
    .tag { padding: 3px 8px; border-radius: 999px; background: var(--tag); color: var(--tag-ink); font-size: 12px; }
    .verdict-buttons { display: flex; flex-wrap: wrap; gap: 7px; }
    .card-controls { padding: 12px 18px; border-top: 1px solid var(--line); background: var(--surface); flex: none; }
    .verdict-buttons button { border: 2px solid transparent; padding: 4px 10px; }
    button[data-verdict="kept"] { background: var(--green); color: var(--green-ink); }
    button[data-verdict="dropped"] { background: var(--red); color: var(--red-ink); }
    button[data-verdict="emphasised"] { background: var(--purple); color: var(--purple-ink); }
    .verdict-buttons button[aria-pressed="true"] { border-color: var(--selected); outline: 2px solid var(--selected); outline-offset: 1px; }
    .verdict-buttons button[aria-pressed="true"]::before { content: '✓ '; }
    dialog { width: min(720px, calc(100% - 32px)); border: 1px solid var(--line); border-radius: 18px; padding: 0; color: var(--ink); background: var(--surface); }
    dialog::backdrop { background: #10182088; }
    .help-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
    .help-head h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .help-reading { padding: 0 20px; }
    .help-reading h3 { margin-bottom: 8px; }
    .help-reading blockquote { margin: 12px 0; padding: 12px 16px; border-left: 3px solid var(--focus); background: var(--subtle); }
    .save-status { margin-top: 12px; font-size: 14px; color: var(--muted); }
    .save-status[data-error="true"] { color: var(--red-ink); }
    [hidden] { display: none !important; }
    .source-help { display: grid; gap: 12px; padding: 20px; margin: 0; }
    .source-help div { padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--subtle); }
    .source-help dt { font-weight: 600; }
    .source-help dd { margin: 4px 0 0; }
    .source-help code { white-space: pre-wrap; overflow-wrap: anywhere; }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 14px; padding-block: 18px 12px; }
    #page-status { color: var(--muted); font-size: 14px; text-align: center; }
    footer { padding-bottom: 18px; color: var(--muted); font-size: 12px; text-align: center; }
    @media (max-width: 639px) { .top, main, .pagination, footer { width: calc(100% - 24px); } .headline-tools { width: 100%; justify-content: space-between; } .toolbar { gap: 8px; } .toolbar label { flex: 1 1 40%; } select { width: 100%; max-width: none; } #help { margin-left: 0; } main { grid-auto-rows: max(440px, calc(100dvh - 340px)); } #page-status { font-size: 12px; } }
    @media (pointer: coarse) { button, select { min-height: 44px; } }
  </style>
</head>
<body>
  <header class="top">
    <div class="headline">
      <h1>${escapeHtml(title)}</h1>
      <div class="headline-tools">
        ${judgeable ? '<div class="backlog" id="backlog" aria-live="polite"></div>' : ''}
        <label class="theme-control">Display <select id="theme"><option value="day">Day</option><option value="night">Night</option></select></label>
      </div>
    </div>
    <div class="toolbar${judgeable ? '' : ' reading'}">
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
      <label>Page Layout
        <select id="page-layout" aria-describedby="layout-note">
          <option value="1x1">1x1</option><option value="1x2">1x2</option><option value="1x3">1x3</option><option value="1x4">1x4</option><option value="2x3" selected>2x3</option><option value="2x4">2x4</option>
        </select>
      </label>
      ${judgeable ? `<label>Verdict for visible rest
        <select id="sweep-verdict"></select>
      </label>
      <button class="tool-button" id="verdict-rest">Judge visible unjudged</button>
      <button class="tool-button" id="undo" disabled>Undo</button>
      <button class="tool-button" id="help">Help</button>
      <button class="tool-button primary" id="export">Export verdicts</button>` : ''}
    </div>
    ${judgeable && persistence ? '<div class="save-status" id="save-status" role="status" aria-live="polite">Loading saved judgments…</div><button id="retry-save" type="button" hidden>Reload judgments</button>' : ''}
  </header>
  ${judgeable ? `<dialog id="help-dialog" aria-labelledby="help-title">
    <div class="help-head">
      <h2 id="help-title">Help</h2>
      <button class="help-close" id="help-close" type="button">Close</button>
    </div>
    <div class="help-reading"><h3>Review stories</h3><p>Page Layout uses rows × columns. Smaller screens show fewer columns; phones show one card per page. Use Previous and Next to read the rest. Scroll inside a card for its full text; click its heading area to collapse or expand it.</p><p>Judge visible unjudged applies only to matching stories on the current page. A cluster’s verdict buttons apply to all its members. Undo reverses the last verdict action, even after changing pages.</p><p>Drop, Keep, and Emphasize set a story’s judgment. An outline and check mark identify the current choice, including judgments from an earlier session.</p><p>${persistence ? 'Each judgment and Undo saves automatically to the database. Wait for “All judgments saved” before closing. If saving fails, use Reload judgments to check the saved state before trying again. Export verdicts is an optional backup or a way to bring saved judgments into the local story store.' : 'This downloaded review file works offline. Export verdicts before closing or reloading, then import that file into the local story store. Automatic database saving is available on the hosted review site.'}</p><p>Day and Night and your chosen layout are remembered on this browser when storage is available.</p>
    <h3>Load new stories</h3>
    <p>Ask an LLM assistant with access to this repository and your connected Gmail account to harvest the newsletters. Specify which sources to use and the dates to include; the source names and Gmail searches below identify the current sources.</p>
    <blockquote>Load new Newsletter Story Harvester stories from the sources listed in Help for [start date] through [end date]. Follow the private harvest workflow in initiatives/newsletter-story-harvester/work/README.md. Merge into the existing private store, preserving its store ID, story IDs, and judgments. Refresh the existing private test site.</blockquote>
    <p>Replace the bracketed dates before sending. Loading uses the repository’s Gmail extraction and merge workflow; there is no dedicated loading skill yet. The <code>tag-newsletter-stories</code> skill optionally adds themes and groups stories about the same event after loading. The <code>deploy-test</code> skill refreshes this test site so the new stories appear. Refresh this page after the assistant finishes.</p>
    <p>Re-harvesting should add or merge stories, not replace your collection. Database judgments survive a site refresh when the store and story IDs stay the same. If you need those judgments in the local store for tagging, offline review, or publishing, export and import them first.</p>
    <h3>Newsletter sources</h3></div>
    <dl class="source-help" id="source-help"></dl>
  </dialog>` : ''}
  <main id="stories" aria-label="Stories"></main>
  <nav class="pagination" aria-label="Story pages"><button id="previous" type="button">Previous</button><span id="page-status" role="status"></span><button id="next" type="button">Next</button></nav>
  <footer><span id="layout-note">Layouts are rows × columns; cards adapt to your screen.</span> ${judgeable
    ? (persistence ? 'Judgments save automatically to the database. Export is optional.' : `Self-contained review for store <strong>${escapeHtml(store.store_id)}</strong>. The store is never written by this page. Export verdicts before closing.`)
    : 'Self-contained page. Nothing here names the message a story arrived in.'}</footer>
  <script id="store-data" type="application/json">${embeddedJson(payload)}</script>
  <script>
  (() => {
    'use strict';
    const store = JSON.parse(document.getElementById('store-data').textContent);
    const stories = store.stories.map((story) => Object.assign({}, story, { tags: Array.from(story.tags || []) }));
    const byId = new Map(stories.map(story => [story.id, story]));
    const clusters = Object.values(store.clusters || {});
    const reviewSources = Array.from(store.review_sources || []);
    const sourcesBySlug = new Map(reviewSources.map(source => [source.slug, source]));
    const verdicts = Array.from(new Set(store.vocabularies.verdict || []));
    const verdictLabels = {dropped: 'Drop', kept: 'Keep', emphasised: 'Emphasize'};
    function actionLabel(verdict) { return verdictLabels[verdict] || 'Mark ' + verdict; }
    function saved(key) { try { return localStorage.getItem('newsletter-review-' + key); } catch { return null; } }
    function remember(key, value) { try { localStorage.setItem('newsletter-review-' + key, value); } catch { /* Preferences are optional. */ } }
    const layouts = ['1x1', '1x2', '1x3', '1x4', '2x3', '2x4'];
    const state = { filter: '', sort: 'story-date', undo: [], page: 0, layout: layouts.includes(saved('layout')) ? saved('layout') : '2x3' };
    let pageRows = [];
    ${judgeable && persistence ? 'let revision = null; let saving = false; let ready = false;' : ''}
    const cardState = new Map();
    const root = document.getElementById('stories');
    const filter = document.getElementById('filter');
    const sort = document.getElementById('sort');
    const layout = document.getElementById('page-layout');
    const theme = document.getElementById('theme');
    const previous = document.getElementById('previous');
    const next = document.getElementById('next');
    layout.value = state.layout;
    theme.value = document.documentElement.dataset.theme;
    function dimensions() {
      const [rows, columns] = state.layout.split('x').map(Number);
      return innerWidth < 640 ? [1, 1] : [rows, Math.min(columns, innerWidth < 1000 ? 2 : columns)];
    }
    function pageUnjudged() { return pageRows.flatMap(row => row.members).filter(story => visible(story) && story.verdict === null); }
    function rememberCards() {
      for (const card of root.children) if (card.dataset.id) cardState.set(card.dataset.id, {open: card.open, scroll: card.querySelector('.body').scrollTop});
    }
    function restoreCards() {
      for (const card of root.children) {
        const remembered = cardState.get(card.dataset.id);
        if (remembered) { card.open = remembered.open; card.querySelector('.body').scrollTop = remembered.scroll; }
      }
    }
    ${judgeable ? `
    const backlog = document.getElementById('backlog');
    const sweepVerdict = document.getElementById('sweep-verdict');
    const undo = document.getElementById('undo');
    ` : ''}

    function dateOf(story) { return story.story_date || story.issue_date || ''; }
    function sourceLabel(slug) { return sourcesBySlug.get(slug)?.name || slug || 'unknown source'; }
    function tagLabel(tag) {
      const [prefix, ...rest] = String(tag).split(':');
      const slug = rest.join(':');
      const value = slug.replaceAll('-', ' ');
      if (prefix === 'theme') return 'Theme: ' + value;
      if (prefix === 'source') return 'Source: ' + sourceLabel(slug);
      return tag;
    }
    function visible(story) { return !state.filter || story.tags.includes(state.filter); }
    function rows() {
      const claimed = new Set();
      const result = [];
      for (const cluster of [...clusters].sort((a, b) => String(a.tag).localeCompare(String(b.tag)))) {
        const members = (cluster.members || []).map(id => byId.get(id)).filter(Boolean);
        if (members.length < 2 || members.some(story => claimed.has(story.id))) continue;
        for (const story of members) claimed.add(story.id);
        result.push({kind: 'cluster', cluster, members});
      }
      for (const story of stories) if (!claimed.has(story.id)) result.push({kind: 'story', story, members: [story]});
      return result;
    }
    function rowDate(row) { return row.members.map(dateOf).sort().at(-1) || ''; }
    function rowSource(row) { return [...new Set(row.members.map(story => story.source || ''))].sort().join(', '); }
    function rowTitle(row) { return row.kind === 'cluster' ? row.cluster.tag : row.story.title; }
    function rowVisible(row) { return row.members.some(visible); }
    function sortedVisible() {
      const visibleRows = rows().filter(rowVisible);
      const byText = (a, b) => String(a).localeCompare(String(b));
      visibleRows.sort((a, b) => {
        if (state.sort === 'source') return byText(rowSource(a), rowSource(b)) || byText(rowDate(b), rowDate(a));
        if (state.sort === 'issue-date') return byText(rowDate(b), rowDate(a)) || byText(rowTitle(a), rowTitle(b));
        if (state.sort === 'unjudged') return Number(a.members.every(story => story.verdict !== null)) - Number(b.members.every(story => story.verdict !== null)) || byText(rowDate(b), rowDate(a));
        return byText(rowDate(b), rowDate(a)) || byText(rowTitle(a), rowTitle(b));
      });
      return visibleRows;
    }

    ${judgeable ? `
    ${persistence ? hostedJudgmentsScript : `
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

    `}
    function getExport() {
      return {
        store_id: store.store_id,
        exported_at: new Date().toISOString(),
        verdicts: stories.filter(story => story.verdict !== null${persistence ? ' || story.verdict_at' : ''}).map(story => ({ id: story.id, verdict: story.verdict, verdict_at: story.verdict_at })),
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
    ` : ''}

    function text(tag, className, value) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      node.textContent = value;
      return node;
    }

    function storyTitle(story, className = 'title', fallbackTag = 'div') {
      const label = story.title || '(untitled)';
      if (!/^https?:\\/\\//i.test(story.url || '')) return text(fallbackTag, className, label);
      const link = text('a', (className + ' story-link').trim(), label);
      link.href = story.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.addEventListener('click', event => event.stopPropagation());
      return link;
    }

    function storyCard(story) {
      const details = document.createElement('details');
      details.className = 'story';
      details.open = true;
      details.dataset.id = story.id;
      details.dataset.source = story.source || '';
      details.dataset.tags = JSON.stringify(story.tags);
      details.dataset.verdict = story.verdict || '';
      const summary = document.createElement('summary');
      const heading = document.createElement('div');
      heading.append(storyTitle(story));
      heading.append(text('div', 'meta', sourceLabel(story.source) + ' · ' + dateOf(story)));
      summary.append(heading);
      summary.append(text('span', 'verdict' + (story.verdict === null ? ' unjudged' : ''), story.verdict || 'unjudged'));
      details.append(summary);
      const body = document.createElement('div'); body.className = 'body'; body.tabIndex = 0;
      body.append(text('p', 'story-text', story.text || '(No text)'));
      if (story.text_is_summary) body.append(text('p', 'summary-note', 'This text is a harvester summary.'));
      const tags = document.createElement('div'); tags.className = 'tags';
      for (const tag of story.tags) tags.append(text('span', 'tag', tagLabel(tag)));
      body.append(tags);
      details.append(body);
      ${judgeable ? "details.append(verdictControls([story], 'verdict-buttons card-controls'));" : ''}
      return details;
    }

    ${judgeable ? `
    function verdictControls(targets, className = 'verdict-buttons') {
      const controls = document.createElement('div'); controls.className = className; controls.setAttribute('aria-label', 'Verdict');
      for (const verdict of verdicts) {
        const button = text('button', '', actionLabel(verdict));
        ${persistence ? 'button.disabled = !ready || saving;' : ''}
        button.type = 'button'; button.dataset.verdict = verdict;
        button.setAttribute('aria-pressed', String(targets.every(story => story.verdict === verdict)));
        button.addEventListener('click', () => setVerdicts(targets, verdict)); controls.append(button);
      }
      return controls;
    }
    ` : ''}

    function clusterMember(story) {
      const member = document.createElement('article'); member.className = 'cluster-member'; member.dataset.id = story.id;
      const heading = document.createElement('h3'); heading.append(storyTitle(story, '', 'span')); member.append(heading);
      member.append(text('div', 'meta', sourceLabel(story.source) + ' · ' + dateOf(story)));
      member.append(text('p', 'story-text', story.text || '(No text)'));
      ${judgeable ? 'member.append(verdictControls([story]));' : ''}
      return member;
    }

    function clusterCard(row) {
      const {cluster, members} = row;
      const details = document.createElement('details'); details.className = 'story cluster'; details.open = true; details.dataset.id = cluster.tag;
      details.dataset.source = rowSource(row);
      details.dataset.tags = JSON.stringify(Array.from(new Set(members.flatMap(story => story.tags))));
      const sharedVerdict = verdicts.find(verdict => members.every(story => story.verdict === verdict)) || '';
      details.dataset.verdict = sharedVerdict;
      const summary = document.createElement('summary');
      const heading = document.createElement('div');
      heading.append(text('div', 'title', cluster.tag.replace(/^about:/, '').replaceAll('-', ' ')));
      heading.append(text('div', 'meta', members.length + ' stories · ' + rowDate(row)));
      summary.append(heading);
      summary.append(text('span', 'verdict' + (sharedVerdict${judgeable ? '' : ' || true'} ? '' : ' unjudged'), sharedVerdict || ${judgeable ? "'mixed or unjudged'" : "'mixed'"}));
      details.append(summary);
      const body = document.createElement('div'); body.className = 'body'; body.tabIndex = 0;
      body.append(text('p', 'cluster-paraphrase', cluster.paraphrase));
      const memberList = document.createElement('div'); memberList.className = 'cluster-members';
      for (const story of members) memberList.append(clusterMember(story));
      body.append(memberList);
      details.append(body);
      ${judgeable ? "details.append(verdictControls(members, 'verdict-buttons card-controls cluster-controls'));" : ''}
      return details;
    }

    function render() {
      const active = document.activeElement;
      const focusId = active?.closest('.story')?.dataset.id;
      const focusVerdict = active?.dataset.verdict;
      const focusMember = active?.closest('.cluster-member')?.dataset.id;
      rememberCards();
      const [rows, columns] = dimensions();
      const capacity = rows * columns;
      const allRows = sortedVisible();
      const pages = Math.max(1, Math.ceil(allRows.length / capacity));
      state.page = Math.min(state.page, pages - 1);
      pageRows = allRows.slice(state.page * capacity, (state.page + 1) * capacity);
      root.style.setProperty('--columns', columns);
      root.style.setProperty('--rows', rows);
      root.replaceChildren(...pageRows.map(row => row.kind === 'cluster' ? clusterCard(row) : storyCard(row.story)));
      restoreCards();
      if (focusId && focusVerdict) {
        const card = Array.from(root.children).find(card => card.dataset.id === focusId);
        const container = focusMember && card ? Array.from(card.querySelectorAll('.cluster-member')).find(member => member.dataset.id === focusMember) : card;
        const button = container && Array.from(container.querySelectorAll('button')).find(button => button.dataset.verdict === focusVerdict);
        if (button) button.focus({preventScroll: true});
      }
      previous.disabled = state.page === 0;
      next.disabled = state.page >= pages - 1;
      document.getElementById('page-status').textContent = allRows.length ? 'Page ' + (state.page + 1) + ' of ' + pages + ' · ' + (state.page * capacity + 1) + '–' + Math.min((state.page + 1) * capacity, allRows.length) + ' of ' + allRows.length + ' cards' : '0 cards';
      if (!root.children.length) root.append(text('div', 'empty', 'No stories match this tag.'));
      ${judgeable ? `
      const remaining = stories.filter(story => story.verdict === null).length;
      backlog.textContent = remaining + ' unjudged of ' + stories.length;
      undo.disabled = state.undo.length === 0${persistence ? ' || !ready || saving' : ''};
      document.getElementById('verdict-rest').disabled = pageUnjudged().length === 0${persistence ? ' || !ready || saving' : ''};
      ${persistence ? "document.getElementById('export').disabled = !ready || saving;" : ''}
      ` : ''}
    }

    for (const tag of Array.from(new Set(stories.flatMap(story => story.tags))).sort()) {
      const option = document.createElement('option'); option.value = tag; option.textContent = tagLabel(tag); filter.append(option);
    }
    ${judgeable ? `
    for (const verdict of verdicts) {
      const option = document.createElement('option'); option.value = verdict; option.textContent = actionLabel(verdict); sweepVerdict.append(option);
    }
    ` : ''}
    filter.addEventListener('change', () => { state.filter = filter.value; state.page = 0; render(); });
    sort.addEventListener('change', () => { state.sort = sort.value; state.page = 0; render(); });
    previous.addEventListener('click', () => { state.page--; render(); });
    next.addEventListener('click', () => { state.page++; render(); });
    layout.addEventListener('change', () => { state.layout = layout.value; state.page = 0; remember('layout', state.layout); render(); });
    theme.addEventListener('change', () => { document.documentElement.dataset.theme = theme.value; remember('theme', theme.value); });
    let lastDimensions = dimensions().join('x');
    window.addEventListener('resize', () => { const current = dimensions().join('x'); if (current !== lastDimensions) { lastDimensions = current; state.page = 0; render(); } });
    ${judgeable ? `
    document.getElementById('verdict-rest').addEventListener('click', () => setVerdicts(pageUnjudged(), sweepVerdict.value));
    undo.addEventListener('click', undoLast);
    const helpDialog = document.getElementById('help-dialog');
    const sourceHelp = document.getElementById('source-help');
    for (const source of reviewSources) {
      const row = document.createElement('div');
      const term = text('dt', '', source.name + ' (' + source.slug + ')');
      const detail = document.createElement('dd');
      detail.append(text('code', '', source.search));
      row.append(term, detail);
      sourceHelp.append(row);
    }
    if (!reviewSources.length) sourceHelp.append(text('div', '', 'No sources were supplied to this review page.'));
    document.getElementById('help').addEventListener('click', () => helpDialog.showModal());
    document.getElementById('help-close').addEventListener('click', () => helpDialog.close());
    document.getElementById('export').addEventListener('click', downloadExport);
    window.reviewPage = { getExport, undo: undoLast, verdictRest: verdict => setVerdicts(pageUnjudged(), verdict) };
    ` : ''}
    render();
    ${judgeable && persistence ? "document.getElementById('retry-save').addEventListener('click', loadJudgments); loadJudgments();" : ''}
  })();
  </script>
</body>
</html>\n`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}
