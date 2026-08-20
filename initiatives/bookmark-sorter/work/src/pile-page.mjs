export function renderPilePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bookmark triage</title>
  <style>
    :root { color-scheme: light; font: 15px/1.35 ui-sans-serif, system-ui, sans-serif; color: #172033; background: #eef1f7; --columns: 8; --rows: 2; }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body { margin: 0; overflow: hidden; }
    button, input, select { font: inherit; }
    button { cursor: pointer; }
    main { height: 100dvh; display: grid; grid-template-rows: auto auto auto auto auto minmax(0, 1fr) auto; gap: 8px; padding: 12px; }
    header { grid-row: 1; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .header-tools { display: flex; align-items: center; gap: 12px; }
    #help-toggle { min-height: 34px; border: 1px solid #9eabc2; border-radius: 9px; padding: 6px 10px; color: #29406e; background: white; font-weight: 760; }
    .brand { min-width: 0; }
    h1 { margin: 0; color: #142a58; font-size: clamp(1.45rem, 3vw, 2.4rem); line-height: 1; letter-spacing: -.045em; }
    .brand p { margin: 4px 0 0; color: #687188; font-size: .82rem; }
    .stats { display: flex; gap: 18px; align-items: baseline; white-space: nowrap; }
    .stat strong { display: block; color: #142a58; font-size: 1.4rem; line-height: 1; font-variant-numeric: tabular-nums; }
    .stat span { color: #687188; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
    .collection-bar { grid-row: 2; display: flex; align-items: center; gap: 7px; min-width: 0; overflow-x: auto; padding: 8px; border: 1px solid #d8deea; border-radius: 12px; background: white; }
    .collection-bar select, .collection-bar input, .collection-bar button { flex: 0 0 auto; min-height: 36px; border: 1px solid #b9c2d3; border-radius: 8px; padding: 6px 9px; color: #29406e; background: white; font-weight: 720; }
    #collection-select { min-width: min(280px, 42vw); }
    #template-select { min-width: min(220px, 35vw); }
    .rename-form { display: flex; align-items: center; gap: 7px; padding: 0; }
    #collection-name { min-width: min(240px, 38vw); }
    .rename-form button[type="submit"] { border-color: #234fc4; color: white; background: #234fc4; }
    .collection-bar .danger { border-color: #e08b83; color: #8f2820; }
    .collection-bar .spacer { flex: 1 0 12px; }
    .collection-kind { flex: 0 0 auto; color: #687188; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
    details { grid-row: 3; border: 1px solid #d8deea; border-radius: 12px; background: white; }
    summary { padding: 8px 12px; color: #29406e; font-weight: 750; cursor: pointer; }
    form { display: grid; grid-template-columns: 1fr minmax(160px, .35fr) auto; gap: 10px; align-items: end; padding: 0 12px 12px; }
    label { display: grid; gap: 4px; color: #4d5870; font-size: .74rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    input, form button { min-height: 40px; border: 1px solid #b9c2d3; border-radius: 9px; padding: 8px 10px; background: white; }
    form button { border-color: #234fc4; color: white; background: #234fc4; font-weight: 760; }
    .selection-panel { grid-row: 4; display: grid; grid-template-columns: minmax(220px, 2fr) auto minmax(150px, 1fr) auto minmax(150px, 1fr) auto; gap: 7px; align-items: center; padding: 9px; border: 1px solid #d8deea; border-radius: 12px; background: white; }
    .selection-panel input, .selection-panel select, .selection-panel button { min-width: 0; min-height: 36px; border: 1px solid #b9c2d3; border-radius: 8px; padding: 6px 9px; background: white; }
    .selection-panel button { color: #29406e; font-weight: 740; }
    .selection-panel button:disabled { opacity: .45; cursor: not-allowed; }
    .selection-panel .primary { border-color: #234fc4; color: white; background: #234fc4; }
    #selection-summary { grid-column: 1 / 5; color: #5f6b82; font-size: .76rem; white-space: nowrap; }
    #sweep-saved { grid-column: 5; }
    .page-controls { grid-column: 6; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .toolbar { grid-row: 5; display: flex; align-items: center; gap: 7px; min-width: 0; overflow-x: auto; padding-bottom: 1px; }
    .toolbar button { flex: 0 0 auto; min-height: 38px; border: 1px solid #c6cedd; border-radius: 9px; padding: 7px 10px; color: #2c374e; background: white; font-weight: 720; }
    .toolbar button[data-verdict="keeper"] { border-color: #73b58b; color: #155d31; }
    .toolbar button[data-verdict="junk"] { border-color: #e08b83; color: #8f2820; }
    .toolbar button[data-verdict="archive"] { border-color: #90a5c9; color: #36527e; }
    .toolbar button[data-verdict="needs-more-time"] { border-color: #d5a653; color: #795310; }
    .toolbar button:disabled { opacity: .45; cursor: not-allowed; }
    form button:disabled { opacity: .5; cursor: wait; }
    #capture-pass-one, #capture-gaps { border-color: #9a78c3; color: #60378b; }
    .toolbar .spacer { flex: 1 0 12px; }
    #mark-count { flex: 0 0 auto; color: #687188; font-size: .78rem; }
    #grid { grid-row: 6; min-height: 0; display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); gap: 8px; overflow: hidden; outline: none; }
    .bookmark-card { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; border: 2px solid transparent; border-radius: 13px; padding: 11px; color: #263149; background: #fff; box-shadow: 0 5px 18px #1b294410; }
    .bookmark-card.focused { border-color: #315fd2; box-shadow: 0 0 0 2px #b9c9f3, 0 8px 22px #1b294420; }
    .bookmark-card.marked { background: #fff9e8; }
    .bookmark-card[data-verdict="keeper"] { box-shadow: inset 0 4px #38a667, 0 5px 18px #1b294410; }
    .bookmark-card[data-verdict="junk"] { opacity: .66; box-shadow: inset 0 4px #d65c50, 0 5px 18px #1b294410; }
    .bookmark-card[data-verdict="archive"] { box-shadow: inset 0 4px #7089b3, 0 5px 18px #1b294410; }
    .bookmark-card[data-verdict="needs-more-time"] { box-shadow: inset 0 4px #d3a23f, 0 5px 18px #1b294410; }
    .capture { min-height: 42%; overflow: hidden; margin: -11px -11px 8px; display: grid; place-items: center; color: #748096; background: linear-gradient(135deg, #e8edf6, #f6f8fc); font-size: .68rem; font-weight: 760; letter-spacing: .06em; text-transform: uppercase; }
    .capture img { width: 100%; height: 100%; display: block; object-fit: cover; }
    .site { overflow: hidden; color: #6a7387; font-size: .67rem; font-weight: 750; letter-spacing: .06em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
    .bookmark-card h2 { display: -webkit-box; overflow: hidden; margin: 7px 0 5px; color: #172b55; font-size: .92rem; line-height: 1.17; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }
    .bookmark-card h2 a { color: inherit; text-decoration: none; }
    .bookmark-card h2 a:hover { text-decoration: underline; text-underline-offset: .15em; }
    .bookmark-card h2 a:focus-visible { border-radius: 3px; outline: 2px solid #315fd2; outline-offset: 2px; }
    .note { display: -webkit-box; overflow: hidden; margin: 0; color: #5b6477; font-size: .75rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .tags { display: flex; gap: 4px; overflow: hidden; margin-top: auto; padding-top: 8px; }
    .tag { flex: 0 0 auto; max-width: 9.5em; overflow: hidden; border-radius: 999px; padding: 2px 6px; color: #36538f; background: #edf2ff; font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }
    .verdict-label { margin-top: 6px; color: #697287; font-size: .66rem; font-weight: 760; text-transform: uppercase; }
    .mark { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; border: 1px solid #b7c0d0; border-radius: 50%; padding: 0; color: #4f5d76; background: #fff; font-weight: 900; }
    .mark[aria-pressed="true"] { border-color: #d39422; color: white; background: #d39422; }
    .copy-url { position: absolute; top: 7px; left: 7px; width: 28px; height: 28px; border: 1px solid #b7c0d0; border-radius: 50%; padding: 0; color: #4f5d76; background: #fff; }
    .copy-url:hover, .copy-url:focus-visible { border-color: #315fd2; color: #234fc4; }
    .copy-url[data-copied="true"] { border-color: #38a667; color: #18733d; background: #effaf3; }
    .copy-icon::before, .copy-icon::after { position: absolute; width: 8px; height: 9px; border: 1.5px solid currentColor; border-radius: 2px; content: ''; }
    .copy-icon::before { top: 7px; left: 8px; }
    .copy-icon::after { top: 10px; left: 11px; background: #fff; }
    .copy-url[data-copied="true"] .copy-icon::after { background: #effaf3; }
    .empty { grid-column: 1 / -1; align-self: center; justify-self: center; max-width: 32rem; color: #697287; text-align: center; }
    .footer-line { grid-row: 7; display: flex; justify-content: space-between; gap: 14px; color: #657087; font-size: .76rem; }
    #status { min-height: 1.2em; margin: 0; }
    #position { white-space: nowrap; font-variant-numeric: tabular-nums; }
    kbd { border: 1px solid #c8cfdb; border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; background: #fff; font: .68rem ui-monospace, monospace; }
    .help-panel { position: fixed; z-index: 20; top: 74px; right: 12px; width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 90px); overflow: auto; border: 1px solid #b8c3d7; border-radius: 14px; padding: 16px 18px; background: white; box-shadow: 0 18px 60px #172b5540; }
    .help-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .help-heading h2 { margin: 0; color: #142a58; font-size: 1.15rem; }
    #help-close { border: 1px solid #b9c2d3; border-radius: 8px; padding: 5px 9px; color: #29406e; background: white; }
    .help-panel h3 { margin: 16px 0 6px; color: #29406e; font-size: .88rem; }
    .help-panel p, .help-panel li { color: #4d5870; font-size: .83rem; }
    .help-panel ul { margin: 6px 0; padding-left: 20px; }
    .help-panel code { border-radius: 4px; padding: 1px 4px; color: #243c72; background: #edf2ff; font-size: .78rem; }
    @media (max-width: 1100px) { :root { --columns: 4; --rows: 3; } .bookmark-card h2 { font-size: .98rem; } }
    @media (max-width: 1100px) and (orientation: portrait) { :root { --columns: 3; --rows: 3; } }
    @media (max-width: 640px) {
      :root { --columns: 1; --rows: 1; }
      main { padding: 9px; gap: 4px; }
      .brand p, .stat.total, .toolbar .shortcut { display: none; }
      .header-tools { gap: 6px; }
      .stats { gap: 10px; }
      .stat strong { font-size: 1.15rem; }
      .collection-bar { gap: 4px; padding: 3px; border-radius: 9px; }
      .collection-bar select, .collection-bar input, .collection-bar button { min-height: 32px; padding: 4px 7px; }
      .collection-kind, .collection-bar .spacer { display: none; }
      details:not([open]) { display: none; }
      .selection-panel { display: flex; overflow-x: auto; }
      .selection-panel > * { flex: 0 0 min(72vw, 240px); }
      .selection-panel button { flex-basis: auto; }
      .page-controls { display: flex; }
      form { grid-template-columns: 1fr; }
      .toolbar button { min-height: 42px; padding-inline: 12px; }
      .bookmark-card { padding: 18px; }
      .capture { min-height: 44%; margin: -18px -18px 12px; }
      .bookmark-card h2 { max-width: 90%; font-size: 1.45rem; -webkit-line-clamp: 5; }
      .site { font-size: .76rem; }
      .note { font-size: .95rem; -webkit-line-clamp: 5; }
      .tag { font-size: .72rem; }
      .footer-line .keys { display: none; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand"><h1>Bookmark triage</h1><p>Metadata pictures arrive without blocking a verdict.</p></div>
      <div class="header-tools">
        <button id="help-toggle" type="button" aria-expanded="false" aria-controls="help-panel">Help</button>
        <div class="stats" aria-label="Triage progress">
          <div class="stat total"><strong id="count">0</strong><span>Total</span></div>
          <div class="stat"><strong id="backlog">0</strong><span>Untriaged</span></div>
          <div class="stat"><strong id="rate">—</strong><span>Per min</span></div>
        </div>
      </div>
    </header>
    <aside id="help-panel" class="help-panel" aria-labelledby="help-title" hidden>
      <div class="help-heading"><h2 id="help-title">Bookmark triage help</h2><button id="help-close" type="button">Close</button></div>
      <h3>Card and action buttons</h3>
      <ul>
        <li><strong>+</strong> marks cards; then Keep, Junk, Archive, or Needs time applies that verdict to the marked set. With no marks, the verdict applies to the focused card.</li>
        <li><strong>Undo</strong> or <kbd>U</kbd> reverses the last verdict or tagging action in the active sitting.</li>
        <li><strong>Sweep untriaged</strong> applies the chosen sweep verdict only to untriaged cards on the visible page, then advances one page.</li>
        <li><strong>Previous / Next</strong> changes pages without changing verdicts.</li>
        <li><strong>Tag selection</strong> adds the entered tags to marked cards, or to the entire open selection when nothing is marked.</li>
        <li><strong>Apply saved unopened…</strong> applies the chosen verdict to a saved selection after showing a confirmation count.</li>
        <li><strong>Capture gaps</strong> is unavailable until bookmark-image support is enabled.</li>
        <li>Click a title to open its URL in a new tab; use the overlapping-squares icon to copy the URL.</li>
      </ul>
      <h3>Selection expressions</h3>
      <p>Open matching items by typing an expression, then choosing <strong>Open selection</strong>.</p>
      <ul>
        <li><code>site:example.com</code> — items from one site.</li>
        <li><code>title:court-drama*</code> — normalized titles beginning with that text.</li>
        <li><code>src:safari</code>, <code>in:2026-08-19</code>, or <code>folder:Favorites*</code> — imported tags.</li>
        <li><code>verdict:keep</code>, <code>verdict:junk</code>, <code>verdict:archive</code>, <code>verdict:needs-time</code>, or <code>verdict:untriaged</code> — current verdict.</li>
        <li><code>collection:&lt;id&gt;</code> — collection scope; the interface adds the current collection automatically.</li>
        <li><code>folder-key:&lt;encoded-folder&gt;</code> — exact folder groups used by Automatic proposals.</li>
        <li>Combine terms with <code>and</code>, <code>or</code>, <code>not</code>, and parentheses. One trailing <code>*</code> performs prefix matching.</li>
      </ul>
    </aside>
    <section class="collection-bar" aria-label="Collections">
      <select id="collection-select" aria-label="Current collection"></select>
      <span id="collection-kind" class="collection-kind"></span>
      <button id="rename-collection" type="button">Rename</button>
      <form id="rename-form" class="rename-form" hidden>
        <label class="visually-hidden" for="collection-name">Collection name</label>
        <input id="collection-name" name="name" autocomplete="off" maxlength="120" required>
        <button type="submit">Save</button>
        <button id="cancel-rename" type="button">Cancel</button>
      </form>
      <button id="fresh-copy" type="button" hidden>Fresh copy</button>
      <button id="delete-copy" class="danger" type="button" hidden>Delete copy</button>
      <span class="spacer"></span>
      <select id="template-select" aria-label="Demo template"><option value="">Demo templates</option></select>
      <button id="copy-template" type="button">Take a copy</button>
      <button id="create-template" type="button" hidden>Create template</button>
    </section>
    <details id="importer" open>
      <summary>Import a browser bookmark file</summary>
      <form id="import-form">
        <label>Bookmark HTML<input id="bookmark-file" name="file" type="file" accept=".html,text/html" required></label>
        <label>Source tag<input id="source" name="source" value="browser-export" pattern="[a-z0-9][a-z0-9-]*" required></label>
        <button type="submit">Import file</button>
      </form>
    </details>
    <section class="selection-panel" aria-label="Selection tools">
      <input id="selection-expression" aria-label="Selection expression" placeholder="folder:reading/* and not topic:rust">
      <button id="open-selection" class="primary" type="button">Open selection</button>
      <input id="selection-name" aria-label="Saved selection name" placeholder="Selection name">
      <button id="save-selection" type="button">Save</button>
      <select id="saved-selections" aria-label="Saved selections"><option value="">Saved selections</option></select>
      <button id="open-saved" type="button">Open saved</button>
      <select id="proposals" aria-label="Automatic proposals"><option value="">Automatic proposals</option></select>
      <button id="open-proposal" type="button">Open proposal</button>
      <input id="tag-input" aria-label="Tags to apply" placeholder="tag-one, tag-two">
      <button id="tag-selection" type="button">Tag selection</button>
      <select id="sweep-verdict" aria-label="Sweep verdict">
        <option value="junk">Junk</option><option value="keeper">Keep</option><option value="archive">Archive</option><option value="needs-more-time">Needs time</option>
      </select>
      <button id="sweep-rest" class="primary" type="button">Sweep untriaged</button>
      <span id="selection-summary">All items</span>
      <button id="sweep-saved" type="button">Apply saved unopened…</button>
      <div class="page-controls" aria-label="Page through the current selection">
        <button id="previous-page" type="button">Previous</button><button id="next-page" type="button">Next</button>
      </div>
    </section>
    <section class="toolbar" aria-label="Triage actions">
      <button type="button" data-verdict="keeper"><span class="shortcut"><kbd>K</kbd> </span>Keep</button>
      <button type="button" data-verdict="junk"><span class="shortcut"><kbd>J</kbd> </span>Junk</button>
      <button type="button" data-verdict="archive"><span class="shortcut"><kbd>A</kbd> </span>Archive</button>
      <button type="button" data-verdict="needs-more-time"><span class="shortcut"><kbd>N</kbd> </span>Needs time</button>
      <button id="undo" type="button"><span class="shortcut"><kbd>U</kbd> </span>Undo</button>
      <button id="capture-pass-one" type="button" disabled title="Capture metadata for bookmarks imported before image storage was enabled">Capture metadata</button>
      <button id="capture-gaps" type="button" disabled title="Available when bookmark images are supported">Capture gaps</button>
      <span class="spacer"></span>
      <span id="mark-count">0 marked</span>
      <button id="session" type="button">End sitting</button>
    </section>
    <section id="grid" role="grid" tabindex="0" aria-label="Bookmarks to triage" aria-activedescendant=""></section>
    <div class="footer-line">
      <p id="status" role="status" aria-live="polite"></p>
      <span class="keys"><kbd>←↑→↓</kbd> focus · <kbd>Space</kbd> mark · <kbd>Enter</kbd> next</span>
      <span id="position">0–0 of 0 · 00:00</span>
    </div>
  </main>
  <script>
    const elements = {
      form: document.querySelector('#import-form'), importer: document.querySelector('#importer'), grid: document.querySelector('#grid'),
      count: document.querySelector('#count'), backlog: document.querySelector('#backlog'), rate: document.querySelector('#rate'),
      status: document.querySelector('#status'), position: document.querySelector('#position'), markCount: document.querySelector('#mark-count'),
      session: document.querySelector('#session'), undo: document.querySelector('#undo'), capturePassOne: document.querySelector('#capture-pass-one'), captureGaps: document.querySelector('#capture-gaps'),
      expression: document.querySelector('#selection-expression'), openSelection: document.querySelector('#open-selection'),
      selectionName: document.querySelector('#selection-name'), saveSelection: document.querySelector('#save-selection'),
      savedSelections: document.querySelector('#saved-selections'), openSaved: document.querySelector('#open-saved'),
      proposals: document.querySelector('#proposals'), openProposal: document.querySelector('#open-proposal'),
      tagInput: document.querySelector('#tag-input'), tagSelection: document.querySelector('#tag-selection'),
      sweepVerdict: document.querySelector('#sweep-verdict'), sweepRest: document.querySelector('#sweep-rest'),
      sweepSaved: document.querySelector('#sweep-saved'), selectionSummary: document.querySelector('#selection-summary'),
      collectionSelect: document.querySelector('#collection-select'), collectionKind: document.querySelector('#collection-kind'),
      renameCollection: document.querySelector('#rename-collection'), renameForm: document.querySelector('#rename-form'),
      collectionName: document.querySelector('#collection-name'), cancelRename: document.querySelector('#cancel-rename'), freshCopy: document.querySelector('#fresh-copy'),
      deleteCopy: document.querySelector('#delete-copy'), templateSelect: document.querySelector('#template-select'),
      copyTemplate: document.querySelector('#copy-template'), createTemplate: document.querySelector('#create-template'),
      helpToggle: document.querySelector('#help-toggle'), helpPanel: document.querySelector('#help-panel'), helpClose: document.querySelector('#help-close'),
      previousPage: document.querySelector('#previous-page'), nextPage: document.querySelector('#next-page'),
    };
    const state = {collectionId: '', collections: [], templates: [], canEditTemplates: false, collectionTotal: 0, total: 0, backlog: 0, selectionBacklog: 0, expression: '', captures: null, offset: 0, items: [], visible: 16, buffer: 8, columns: 8, focused: 0, marked: new Set(), session: null, loading: false, resizeTimer: null, saved: [], proposals: []};

    async function api(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (state.collectionId) headers.set('x-bookmark-collection-id', state.collectionId);
      const response = await fetch(path, {...options, headers});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    }
    function layout() {
      if (innerWidth <= 640) return {columns: 1, rows: 1, buffer: 2};
      if (innerWidth <= 1100) { const columns = innerWidth >= innerHeight ? 4 : 3; return {columns, rows: 3, buffer: columns}; }
      return {columns: 8, rows: 2, buffer: 8};
    }
    function updateProgress() {
      elements.count.textContent = state.collectionTotal.toLocaleString();
      elements.backlog.textContent = state.backlog.toLocaleString();
      const judged = Number(state.session?.items_judged || 0);
      const ended = state.session?.ended_at ? Number(state.session.elapsed_ms || 0) : Date.now() - new Date(state.session?.started_at || Date.now()).valueOf();
      elements.rate.textContent = judged && ended > 0 ? (judged / (ended / 60000)).toFixed(1) : '—';
      const seconds = Math.max(0, Math.floor(ended / 1000));
      const elapsed = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
      const first = state.total ? state.offset + 1 : 0;
      const last = Math.min(state.total, state.offset + state.visible);
      elements.position.textContent = first.toLocaleString() + '–' + last.toLocaleString() + ' of ' + state.total.toLocaleString() + ' · ' + elapsed;
      elements.markCount.textContent = state.marked.size.toLocaleString() + ' marked';
      elements.session.textContent = state.session?.ended_at ? 'Start sitting' : 'End sitting';
      elements.selectionSummary.textContent = (state.expression ? state.expression : 'All items') + ' · ' + state.total.toLocaleString() + ' selected · ' + state.selectionBacklog.toLocaleString() + ' untriaged';
      elements.previousPage.disabled = state.loading || state.offset <= 0;
      elements.nextPage.disabled = state.loading || !state.total || state.offset + state.visible >= state.total;
      elements.capturePassOne.disabled = state.loading || !state.captures || state.captures.total >= state.collectionTotal;
    }
    async function startSession() {
      if (!state.collectionTotal || (state.session && !state.session.ended_at)) return;
      state.session = await api('/api/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'})});
      updateProgress();
    }
    function host(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'saved link'; } }
    function externalUrl(url) {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
      } catch { return ''; }
    }
    function verdictText(verdict) { return ({keeper: 'Keeper', junk: 'Junk', archive: 'Archive', 'needs-more-time': 'Needs more time'})[verdict] || 'Untriaged'; }
    function addText(parent, tagName, className, text) {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      element.textContent = text;
      parent.append(element);
      return element;
    }
    function renderCard(item, index) {
      const card = document.createElement('article');
      card.id = 'item-' + item.id;
      card.className = 'bookmark-card';
      card.dataset.itemId = item.id;
      card.dataset.verdict = item.verdict || '';
      card.setAttribute('role', 'gridcell');
      card.setAttribute('aria-selected', String(state.marked.has(item.id)));
      const capture = document.createElement('div');
      capture.className = 'capture';
      if (item.capture_url) {
        const image = document.createElement('img');
        image.src = item.capture_url; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
        capture.append(image);
      } else addText(capture, 'span', '', item.capture?.state === 'pass1-error' ? 'Fetch failed' : 'No image');
      card.append(capture);
      addText(card, 'span', 'site', host(item.url));
      const heading = document.createElement('h2');
      const href = externalUrl(item.url);
      if (href) {
        const titleLink = document.createElement('a');
        titleLink.href = href; titleLink.target = '_blank'; titleLink.rel = 'noopener noreferrer'; titleLink.textContent = item.title;
        titleLink.addEventListener('click', event => event.stopPropagation());
        heading.append(titleLink);
      } else heading.textContent = item.title;
      card.append(heading);
      if (item.note) addText(card, 'p', 'note', item.note);
      const tags = document.createElement('div');
      tags.className = 'tags';
      const allTags = item.tags || [];
      const allTagsLabel = allTags.length ? 'All tags:\\n' + allTags.join('\\n') : 'No tags';
      for (const value of allTags.slice(0, 3)) {
        const tag = addText(tags, 'span', 'tag', value);
        tag.title = allTagsLabel;
        tag.setAttribute('aria-label', value + '. All tags: ' + allTags.join(', '));
      }
      card.append(tags);
      addText(card, 'span', 'verdict-label', verdictText(item.verdict));
      const mark = document.createElement('button');
      mark.type = 'button'; mark.className = 'mark'; mark.textContent = state.marked.has(item.id) ? '✓' : '+';
      mark.setAttribute('aria-label', 'Mark ' + item.title); mark.setAttribute('aria-pressed', String(state.marked.has(item.id)));
      mark.addEventListener('click', event => { event.stopPropagation(); toggleMark(index); });
      card.append(mark);
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'copy-url'; copy.title = 'Copy URL';
      copy.setAttribute('aria-label', 'Copy URL for ' + item.title);
      const copyIcon = document.createElement('span'); copyIcon.className = 'copy-icon'; copyIcon.setAttribute('aria-hidden', 'true');
      copy.append(copyIcon);
      copy.addEventListener('click', async event => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(item.url);
          copy.dataset.copied = 'true';
          elements.status.textContent = 'Copied URL for ' + item.title + '.';
          setTimeout(() => { delete copy.dataset.copied; }, 1200);
        } catch {
          elements.status.textContent = 'Could not copy this URL.';
        }
      });
      card.append(copy);
      card.addEventListener('click', () => { setFocus(index); elements.grid.focus({preventScroll: true}); });
      return card;
    }
    function setFocus(index) {
      state.focused = Math.max(0, Math.min(Math.min(state.visible, state.items.length) - 1, index));
      [...elements.grid.querySelectorAll('.bookmark-card')].forEach((card, cardIndex) => card.classList.toggle('focused', cardIndex === state.focused));
      const item = state.items[state.focused];
      elements.grid.setAttribute('aria-activedescendant', item ? 'item-' + item.id : '');
      updateProgress();
    }
    function renderGrid() {
      if (!state.items.length) {
        const holder = document.createElement('div');
        addText(holder, 'p', 'empty', 'Import a bookmark HTML file to begin blind triage.');
        elements.grid.replaceChildren(holder); elements.grid.removeAttribute('aria-activedescendant'); updateProgress(); return;
      }
      const cards = state.items.map((item, index) => { const card = renderCard(item, index); card.hidden = index >= state.visible; return card; });
      elements.grid.replaceChildren(...cards);
      setFocus(Math.min(state.focused, state.visible - 1, state.items.length - 1));
    }
    async function loadWindow(offset = state.offset) {
      if (state.loading) return;
      state.loading = true;
      try {
        const path = '/api/selection?limit=' + (state.visible + state.buffer) + '&offset=' + Math.max(0, offset) + '&expression=' + encodeURIComponent(state.expression);
        const data = await api(path);
        state.collectionTotal = data.collection_total; state.total = data.total; state.backlog = data.collection_backlog; state.selectionBacklog = data.backlog; state.captures = data.captures; state.offset = Math.max(0, Math.min(offset, Math.max(0, data.total - 1)));
        state.items = data.items; state.focused = 0; renderGrid();
        if (state.collectionTotal) { elements.importer.open = false; await startSession(); elements.grid.focus({preventScroll: true}); }
      } finally { state.loading = false; updateProgress(); }
    }

    async function openExpression(expression) {
      state.expression = String(expression || '').trim();
      elements.expression.value = state.expression;
      state.offset = 0; state.focused = 0; clearMarks();
      await loadWindow(0);
    }

    async function refreshSelectionCounts() {
      const data = await api('/api/selection?limit=1&offset=0&expression=' + encodeURIComponent(state.expression));
      state.collectionTotal = data.collection_total; state.total = data.total; state.backlog = data.collection_backlog; state.selectionBacklog = data.backlog; state.captures = data.captures;
      updateProgress();
    }

    async function pageWindow(delta) {
      if (!state.total || state.loading) return false;
      const lastOffset = Math.floor((state.total - 1) / state.visible) * state.visible;
      const nextOffset = Math.max(0, Math.min(lastOffset, state.offset + delta * state.visible));
      if (nextOffset === state.offset) return false;
      await loadWindow(nextOffset);
      return true;
    }

    function fillSelect(select, rows, label) {
      select.replaceChildren(new Option(label, ''));
      for (const row of rows) select.append(new Option(row.name + (row.count ? ' (' + row.count.toLocaleString() + ')' : ''), row.id));
    }

    function currentCollection() {
      return state.collections.find(collection => collection.id === state.collectionId) || null;
    }

    function setRenameEditing(editing) {
      const collection = currentCollection();
      const open = Boolean(editing && collection);
      elements.renameForm.hidden = !open;
      elements.renameCollection.hidden = open;
      elements.collectionSelect.disabled = open;
      if (open) {
        elements.collectionName.value = collection.name;
        elements.collectionName.focus();
        elements.collectionName.select();
      } else {
        elements.collectionName.value = '';
      }
    }

    function renderCollections() {
      const previous = state.collectionId;
      elements.collectionSelect.replaceChildren(...state.collections.map(collection => new Option(
        collection.name + ' · ' + Number(collection.item_count || 0).toLocaleString(), collection.id,
      )));
      elements.collectionSelect.value = previous;
      elements.templateSelect.replaceChildren(new Option('Demo templates', ''), ...state.templates.map(template => new Option(
        template.name + ' · ' + Number(template.item_count || 0).toLocaleString(), template.id,
      )));
      const collection = currentCollection();
      elements.collectionKind.textContent = collection ? collection.kind.replaceAll('-', ' ') : '';
      elements.freshCopy.hidden = collection?.kind !== 'demo-copy';
      elements.deleteCopy.hidden = collection?.kind !== 'demo-copy';
      elements.createTemplate.hidden = !state.canEditTemplates;
      elements.copyTemplate.disabled = !state.templates.length;
      elements.renameCollection.disabled = !collection;
      setRenameEditing(false);
    }

    async function loadCollections(preferredId = state.collectionId) {
      const data = await api('/api/collections');
      state.collections = data.collections;
      state.templates = data.templates;
      state.canEditTemplates = data.can_edit_templates;
      state.collectionId = state.collections.some(collection => collection.id === preferredId)
        ? preferredId
        : state.collections.some(collection => collection.id === data.active_collection_id)
          ? data.active_collection_id
          : state.collections[0]?.id || '';
      renderCollections();
    }

    async function openCollection(id) {
      if (!id || id === state.collectionId) return;
      state.collectionId = id;
      state.session = null;
      state.expression = '';
      state.offset = 0;
      state.focused = 0;
      clearMarks();
      renderCollections();
      await Promise.all([loadWindow(0), loadSelectionTools()]);
    }

    async function collectionAction(action, payload = {}) {
      const result = await api('/api/collections', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({action, ...payload}),
      });
      const deleted = action === 'delete-copy';
      await loadCollections(deleted ? '' : result.collection?.id || state.collectionId);
      state.session = null;
      state.expression = '';
      clearMarks();
      await Promise.all([loadWindow(0), loadSelectionTools()]);
      return result;
    }

    async function loadSelectionTools() {
      const [saved, proposals] = await Promise.all([api('/api/selections'), api('/api/proposals')]);
      state.saved = saved.selections; state.proposals = proposals.proposals;
      fillSelect(elements.savedSelections, state.saved, 'Saved selections');
      fillSelect(elements.proposals, state.proposals, 'Automatic proposals');
    }

    async function saveCurrentSelection() {
      const name = elements.selectionName.value.trim();
      const saved = await api('/api/selections', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name, expression: state.expression})});
      elements.status.textContent = 'Saved selection “' + saved.name + '”.';
      elements.selectionName.value = '';
      await loadSelectionTools();
      elements.savedSelections.value = saved.id;
    }

    async function tagCurrentSelection() {
      await startSession();
      const tags = elements.tagInput.value.split(/[\s,]+/).filter(Boolean);
      const body = {session_id: state.session.id, tags, expression: state.expression};
      if (state.marked.size) body.item_ids = [...state.marked];
      const data = await api('/api/tag', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
      elements.status.textContent = 'Added tags to ' + data.changes.length.toLocaleString() + ' item' + (data.changes.length === 1 ? '' : 's') + ' as one action.';
      elements.tagInput.value = ''; clearMarks(); await loadWindow(state.offset); await loadSelectionTools();
    }

    async function sweepCurrentPage() {
      const ids = state.items.slice(0, state.visible).filter(item => !item.verdict).map(item => item.id);
      if (!ids.length) {
        const advanced = await pageWindow(1);
        elements.status.textContent = advanced ? 'No untriaged items on that page; showing the next page.' : 'No untriaged items on the final page.';
        return;
      }
      await startSession();
      const data = await api('/api/verdict', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({
        session_id: state.session.id, item_ids: ids, verdict: elements.sweepVerdict.value,
      })});
      patchChanges(data.changes); state.session = data.session; state.backlog = data.backlog;
      clearMarks(); await refreshSelectionCounts();
      const advanced = await pageWindow(1);
      elements.status.textContent = verdictText(elements.sweepVerdict.value) + ' applied to ' + data.changes.length.toLocaleString() + ' untriaged item' + (data.changes.length === 1 ? '' : 's') + (advanced ? '; showing the next page.' : '; this is the final page.');
    }

    async function sweepSavedUnopened(confirmed = false) {
      const id = elements.savedSelections.value;
      if (!id) throw new Error('Choose a saved selection first');
      await startSession();
      const response = await fetch('/api/selection/verdict', {method: 'POST', headers: {'content-type': 'application/json', 'x-bookmark-collection-id': state.collectionId}, body: JSON.stringify({
        session_id: state.session.id, selection_id: id, verdict: elements.sweepVerdict.value, visible: false, confirmed,
      })});
      const data = await response.json();
      if (response.status === 409 && data.confirmation_required) {
        if (confirm('Apply ' + verdictText(elements.sweepVerdict.value) + ' to ' + data.count.toLocaleString() + ' items in this unopened selection?')) return sweepSavedUnopened(true);
        elements.status.textContent = 'Saved-selection sweep cancelled.'; return;
      }
      if (!response.ok) throw new Error(data.error || 'Request failed');
      patchChanges(data.changes); state.session = data.session; state.backlog = data.backlog;
      elements.status.textContent = 'Applied saved selection to ' + data.changes.length.toLocaleString() + ' item' + (data.changes.length === 1 ? '' : 's') + '.';
      await refreshSelectionCounts();
    }
    function toggleMark(index = state.focused) {
      const item = state.items[index];
      if (!item || index >= state.visible) return;
      if (state.marked.has(item.id)) state.marked.delete(item.id); else state.marked.add(item.id);
      const card = elements.grid.querySelector('[data-item-id="' + CSS.escape(item.id) + '"]');
      if (card) {
        const marked = state.marked.has(item.id); card.classList.toggle('marked', marked); card.setAttribute('aria-selected', String(marked));
        const button = card.querySelector('.mark'); button.textContent = marked ? '✓' : '+'; button.setAttribute('aria-pressed', String(marked));
      }
      updateProgress();
    }
    function clearMarks() {
      state.marked.clear();
      for (const card of elements.grid.querySelectorAll('.bookmark-card.marked')) {
        card.classList.remove('marked'); card.setAttribute('aria-selected', 'false');
        const button = card.querySelector('.mark'); button.textContent = '+'; button.setAttribute('aria-pressed', 'false');
      }
      updateProgress();
    }
    async function focusAbsolute(target) {
      const bounded = Math.max(0, Math.min(state.total - 1, target));
      if (bounded < state.offset || bounded >= state.offset + state.visible) await loadWindow(Math.floor(bounded / state.visible) * state.visible);
      setFocus(bounded - state.offset);
    }
    async function moveFocus(delta) { if (state.total) await focusAbsolute(state.offset + state.focused + delta); }
    function patchChanges(changes) {
      for (const change of changes) {
        const item = state.items.find(candidate => candidate.id === change.item_id);
        if (item) { item.verdict = change.verdict; item.verdict_at = change.verdict_at; }
        const card = elements.grid.querySelector('[data-item-id="' + CSS.escape(change.item_id) + '"]');
        if (card) { card.dataset.verdict = change.verdict || ''; card.querySelector('.verdict-label').textContent = verdictText(change.verdict); }
      }
    }
    async function applyVerdict(verdict) {
      if (!state.total) return;
      await startSession();
      const focused = state.items[state.focused];
      const usedMarkedSet = state.marked.size > 0;
      const ids = usedMarkedSet ? [...state.marked] : focused ? [focused.id] : [];
      if (!ids.length) return;
      const data = await api('/api/verdict', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: state.session.id, item_ids: ids, verdict})});
      patchChanges(data.changes); state.backlog = data.backlog; state.session = data.session;
      elements.status.textContent = verdictText(verdict) + ' applied to ' + data.changes.length.toLocaleString() + ' item' + (data.changes.length === 1 ? '' : 's') + '.';
      if (usedMarkedSet) clearMarks(); else updateProgress();
      await refreshSelectionCounts();
      await moveFocus(1);
    }
    async function undo() {
      if (!state.session || state.session.ended_at) return;
      const data = await api('/api/undo', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: state.session.id})});
      state.backlog = data.backlog; state.session = data.session;
      elements.status.textContent = data.changes.length ? 'Undid the last action as one step.' : 'Nothing to undo.';
      if (data.kind === 'tag-apply') await loadWindow(state.offset);
      else { patchChanges(data.changes); await refreshSelectionCounts(); }
    }
    async function toggleSession() {
      if (!state.collectionTotal) return;
      if (!state.session || state.session.ended_at) { state.session = null; await startSession(); elements.status.textContent = 'New sitting started.'; }
      else { state.session = await api('/api/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'finish', session_id: state.session.id})}); elements.status.textContent = 'Sitting saved: ' + state.session.items_judged.toLocaleString() + ' judged.'; }
      updateProgress();
    }
    async function captureGaps() {
      elements.captureGaps.disabled = true;
      elements.status.textContent = 'Checking capture gaps…';
      try {
        const data = await api('/api/captures/gaps', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({limit: 20})});
        state.captures = data.status;
        elements.status.textContent = data.enabled
          ? 'Captured ' + data.processed.toLocaleString() + ' gap' + (data.processed === 1 ? '' : 's') + '; ' + data.status.queued.toLocaleString() + ' remain.'
          : 'Pass 2 is off; ' + data.status.queued.toLocaleString() + ' metadata gap' + (data.status.queued === 1 ? '' : 's') + ' unchanged.';
        if (data.processed) await loadWindow(state.offset);
      } catch (error) { elements.status.textContent = error.message; }
      finally { elements.captureGaps.disabled = false; }
    }
    async function capturePassOne() {
      elements.capturePassOne.disabled = true;
      let processed = 0;
      try {
        while (true) {
          elements.status.textContent = 'Capturing metadata… ' + processed.toLocaleString() + ' checked.';
          const data = await api('/api/captures/pass-one?limit=20', {method: 'POST'});
          state.captures = data.status;
          processed += data.processed;
          updateProgress();
          if (!data.processed) break;
        }
        elements.status.textContent = 'Metadata capture caught up on ' + processed.toLocaleString() + ' bookmark' + (processed === 1 ? '' : 's') + '.';
        await loadWindow(state.offset);
      } catch (error) { elements.status.textContent = error.message; }
      finally { updateProgress(); }
    }
    elements.form.addEventListener('submit', async event => {
      event.preventDefault(); const button = elements.form.querySelector('button'); button.disabled = true; elements.status.textContent = 'Importing…';
      try {
        const data = await api('/api/import', {method: 'POST', body: new FormData(elements.form)});
        elements.status.textContent = 'Imported ' + data.added.toLocaleString() + ' new; merged ' + data.merged.toLocaleString() + '.'; await loadWindow(0);
      } catch (error) { elements.status.textContent = error.message; } finally { button.disabled = false; }
    });
    elements.collectionSelect.addEventListener('change', () => openCollection(elements.collectionSelect.value).catch(error => { elements.status.textContent = error.message; }));
    elements.templateSelect.addEventListener('change', () => { elements.copyTemplate.disabled = !elements.templateSelect.value; });
    elements.copyTemplate.addEventListener('click', () => {
      const templateId = elements.templateSelect.value || state.templates[0]?.id;
      if (!templateId) return;
      collectionAction('copy-template', {template_id: templateId}).then(() => { elements.status.textContent = 'Private demo copy created.'; }).catch(error => { elements.status.textContent = error.message; });
    });
    elements.freshCopy.addEventListener('click', () => collectionAction('fresh-copy', {collection_id: state.collectionId}).then(() => { elements.status.textContent = 'Fresh private copy created; the earlier copy is unchanged.'; }).catch(error => { elements.status.textContent = error.message; }));
    elements.renameCollection.addEventListener('click', () => setRenameEditing(true));
    elements.renameForm.addEventListener('submit', event => {
      event.preventDefault();
      const collection = currentCollection();
      const name = elements.collectionName.value.trim();
      if (!collection) return setRenameEditing(false);
      if (!name) { elements.status.textContent = 'Collection name is required.'; elements.collectionName.focus(); return; }
      if (name === collection.name) { elements.status.textContent = 'Collection name unchanged.'; setRenameEditing(false); return; }
      const button = elements.renameForm.querySelector('button[type="submit"]');
      button.disabled = true;
      collectionAction('rename', {collection_id: collection.id, name})
        .then(() => { elements.status.textContent = 'Collection renamed.'; elements.renameCollection.focus(); })
        .catch(error => { elements.status.textContent = error.message; elements.collectionName.focus(); })
        .finally(() => { button.disabled = false; });
    });
    elements.cancelRename.addEventListener('click', () => { setRenameEditing(false); elements.renameCollection.focus(); });
    elements.collectionName.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); setRenameEditing(false); elements.renameCollection.focus(); }
    });
    elements.deleteCopy.addEventListener('click', () => {
      const collection = currentCollection();
      if (collection && confirm('Delete “' + collection.name + '”? Its shared captures will remain available to other collections.')) collectionAction('delete-copy', {collection_id: collection.id}).then(() => { elements.status.textContent = 'Demo copy deleted; shared captures were kept.'; }).catch(error => { elements.status.textContent = error.message; });
    });
    elements.createTemplate.addEventListener('click', () => {
      const name = prompt('Template name', 'New demo');
      if (name?.trim()) collectionAction('create-template', {name}).then(() => { elements.status.textContent = 'Demo template created.'; }).catch(error => { elements.status.textContent = error.message; });
    });
    elements.openSelection.addEventListener('click', () => openExpression(elements.expression.value).catch(error => { elements.status.textContent = error.message; }));
    elements.expression.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); elements.openSelection.click(); } });
    elements.saveSelection.addEventListener('click', () => saveCurrentSelection().catch(error => { elements.status.textContent = error.message; }));
    elements.openSaved.addEventListener('click', () => {
      const selected = state.saved.find(row => row.id === elements.savedSelections.value);
      if (selected) openExpression(selected.expression).catch(error => { elements.status.textContent = error.message; });
    });
    elements.openProposal.addEventListener('click', () => {
      const selected = state.proposals.find(row => row.id === elements.proposals.value);
      if (selected) openExpression(selected.expression).catch(error => { elements.status.textContent = error.message; });
    });
    elements.tagSelection.addEventListener('click', () => tagCurrentSelection().catch(error => { elements.status.textContent = error.message; }));
    elements.sweepRest.addEventListener('click', () => sweepCurrentPage().catch(error => { elements.status.textContent = error.message; }));
    elements.sweepSaved.addEventListener('click', () => sweepSavedUnopened().catch(error => { elements.status.textContent = error.message; }));
    elements.previousPage.addEventListener('click', () => pageWindow(-1).catch(error => { elements.status.textContent = error.message; }));
    elements.nextPage.addEventListener('click', () => pageWindow(1).catch(error => { elements.status.textContent = error.message; }));
    function setHelp(open) {
      elements.helpPanel.hidden = !open;
      elements.helpToggle.setAttribute('aria-expanded', String(open));
      (open ? elements.helpClose : elements.helpToggle).focus();
    }
    elements.helpToggle.addEventListener('click', () => setHelp(elements.helpPanel.hidden));
    elements.helpClose.addEventListener('click', () => setHelp(false));
    document.querySelectorAll('[data-verdict]').forEach(button => button.addEventListener('click', () => applyVerdict(button.dataset.verdict).catch(error => { elements.status.textContent = error.message; })));
    elements.undo.addEventListener('click', () => undo().catch(error => { elements.status.textContent = error.message; }));
    elements.session.addEventListener('click', () => toggleSession().catch(error => { elements.status.textContent = error.message; }));
    elements.capturePassOne.addEventListener('click', () => capturePassOne());
    document.addEventListener('keydown', event => {
      if (!elements.helpPanel.hidden) { if (event.key === 'Escape') { event.preventDefault(); setHelp(false); } return; }
      if (event.target.matches('input, textarea, select')) return;
      const verdict = {k: 'keeper', j: 'junk', a: 'archive', n: 'needs-more-time'}[event.key.toLowerCase()];
      if (verdict) { event.preventDefault(); applyVerdict(verdict).catch(error => { elements.status.textContent = error.message; }); return; }
      if (event.key === ' ') { event.preventDefault(); toggleMark(); return; }
      if (event.key.toLowerCase() === 'u') { event.preventDefault(); undo().catch(error => { elements.status.textContent = error.message; }); return; }
      if (event.key === 'Enter') { event.preventDefault(); moveFocus(1); return; }
      const delta = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -state.columns, ArrowDown: state.columns}[event.key];
      if (delta) { event.preventDefault(); moveFocus(delta); }
    });
    let pointerStart = null;
    elements.grid.addEventListener('pointerdown', event => { pointerStart = {x: event.clientX, y: event.clientY}; });
    elements.grid.addEventListener('pointerup', event => {
      if (!pointerStart || innerWidth > 640) return;
      const dx = event.clientX - pointerStart.x; const dy = event.clientY - pointerStart.y; pointerStart = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) moveFocus(dx < 0 ? 1 : -1);
    });
    addEventListener('resize', () => {
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(() => {
        const current = state.offset + state.focused; const next = layout(); state.columns = next.columns; state.visible = next.columns * next.rows; state.buffer = next.buffer;
        document.documentElement.style.setProperty('--columns', next.columns); document.documentElement.style.setProperty('--rows', next.rows);
        loadWindow(Math.floor(current / state.visible) * state.visible).then(() => setFocus(current - state.offset));
      }, 120);
    });
    const initial = layout(); state.columns = initial.columns; state.visible = initial.columns * initial.rows; state.buffer = initial.buffer;
    document.documentElement.style.setProperty('--columns', initial.columns); document.documentElement.style.setProperty('--rows', initial.rows);
    setInterval(updateProgress, 500); window.__pileState = state;
    loadCollections().then(() => Promise.all([loadWindow(0), loadSelectionTools()])).catch(error => { elements.status.textContent = error.message; });
  </script>
</body>
</html>`;
}
