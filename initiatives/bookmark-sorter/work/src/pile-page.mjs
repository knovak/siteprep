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
    button, input { font: inherit; }
    button { cursor: pointer; }
    main { height: 100dvh; display: grid; grid-template-rows: auto auto auto minmax(0, 1fr) auto; gap: 10px; padding: 12px; }
    header { grid-row: 1; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { min-width: 0; }
    h1 { margin: 0; color: #142a58; font-size: clamp(1.45rem, 3vw, 2.4rem); line-height: 1; letter-spacing: -.045em; }
    .brand p { margin: 4px 0 0; color: #687188; font-size: .82rem; }
    .stats { display: flex; gap: 18px; align-items: baseline; white-space: nowrap; }
    .stat strong { display: block; color: #142a58; font-size: 1.4rem; line-height: 1; font-variant-numeric: tabular-nums; }
    .stat span { color: #687188; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
    details { grid-row: 2; border: 1px solid #d8deea; border-radius: 12px; background: white; }
    summary { padding: 8px 12px; color: #29406e; font-weight: 750; cursor: pointer; }
    form { display: grid; grid-template-columns: 1fr minmax(160px, .35fr) auto; gap: 10px; align-items: end; padding: 0 12px 12px; }
    label { display: grid; gap: 4px; color: #4d5870; font-size: .74rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    input, form button { min-height: 40px; border: 1px solid #b9c2d3; border-radius: 9px; padding: 8px 10px; background: white; }
    form button { border-color: #234fc4; color: white; background: #234fc4; font-weight: 760; }
    .toolbar { grid-row: 3; display: flex; align-items: center; gap: 7px; min-width: 0; overflow-x: auto; padding-bottom: 1px; }
    .toolbar button { flex: 0 0 auto; min-height: 38px; border: 1px solid #c6cedd; border-radius: 9px; padding: 7px 10px; color: #2c374e; background: white; font-weight: 720; }
    .toolbar button[data-verdict="keeper"] { border-color: #73b58b; color: #155d31; }
    .toolbar button[data-verdict="junk"] { border-color: #e08b83; color: #8f2820; }
    .toolbar button[data-verdict="archive"] { border-color: #90a5c9; color: #36527e; }
    .toolbar button[data-verdict="needs-more-time"] { border-color: #d5a653; color: #795310; }
    .toolbar button:disabled, form button:disabled { opacity: .5; cursor: wait; }
    .toolbar .spacer { flex: 1 0 12px; }
    #mark-count { flex: 0 0 auto; color: #687188; font-size: .78rem; }
    #grid { grid-row: 4; min-height: 0; display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); gap: 8px; overflow: hidden; outline: none; }
    .bookmark-card { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; border: 2px solid transparent; border-radius: 13px; padding: 11px; color: #263149; background: #fff; box-shadow: 0 5px 18px #1b294410; }
    .bookmark-card.focused { border-color: #315fd2; box-shadow: 0 0 0 2px #b9c9f3, 0 8px 22px #1b294420; }
    .bookmark-card.marked { background: #fff9e8; }
    .bookmark-card[data-verdict="keeper"] { box-shadow: inset 0 4px #38a667, 0 5px 18px #1b294410; }
    .bookmark-card[data-verdict="junk"] { opacity: .66; box-shadow: inset 0 4px #d65c50, 0 5px 18px #1b294410; }
    .bookmark-card[data-verdict="archive"] { box-shadow: inset 0 4px #7089b3, 0 5px 18px #1b294410; }
    .bookmark-card[data-verdict="needs-more-time"] { box-shadow: inset 0 4px #d3a23f, 0 5px 18px #1b294410; }
    .site { overflow: hidden; color: #6a7387; font-size: .67rem; font-weight: 750; letter-spacing: .06em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
    .bookmark-card h2 { display: -webkit-box; overflow: hidden; margin: 7px 0 5px; color: #172b55; font-size: .92rem; line-height: 1.17; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .note { display: -webkit-box; overflow: hidden; margin: 0; color: #5b6477; font-size: .75rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .tags { display: flex; gap: 4px; overflow: hidden; margin-top: auto; padding-top: 8px; }
    .tag { flex: 0 0 auto; max-width: 9.5em; overflow: hidden; border-radius: 999px; padding: 2px 6px; color: #36538f; background: #edf2ff; font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }
    .verdict-label { margin-top: 6px; color: #697287; font-size: .66rem; font-weight: 760; text-transform: uppercase; }
    .mark { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; border: 1px solid #b7c0d0; border-radius: 50%; padding: 0; color: #4f5d76; background: #fff; font-weight: 900; }
    .mark[aria-pressed="true"] { border-color: #d39422; color: white; background: #d39422; }
    .empty { grid-column: 1 / -1; align-self: center; justify-self: center; max-width: 32rem; color: #697287; text-align: center; }
    .footer-line { grid-row: 5; display: flex; justify-content: space-between; gap: 14px; color: #657087; font-size: .76rem; }
    #status { min-height: 1.2em; margin: 0; }
    #position { white-space: nowrap; font-variant-numeric: tabular-nums; }
    kbd { border: 1px solid #c8cfdb; border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; background: #fff; font: .68rem ui-monospace, monospace; }
    @media (max-width: 1100px) { :root { --columns: 4; --rows: 3; } .bookmark-card h2 { font-size: .98rem; } }
    @media (max-width: 1100px) and (orientation: portrait) { :root { --columns: 3; --rows: 3; } }
    @media (max-width: 640px) {
      :root { --columns: 1; --rows: 1; }
      main { padding: 9px; gap: 8px; }
      .brand p, .stat.total, .toolbar .shortcut { display: none; }
      .stats { gap: 10px; }
      .stat strong { font-size: 1.15rem; }
      details:not([open]) { display: none; }
      form { grid-template-columns: 1fr; }
      .toolbar button { min-height: 42px; padding-inline: 12px; }
      .bookmark-card { padding: 18px; }
      .bookmark-card h2 { max-width: 90%; font-size: 1.45rem; -webkit-line-clamp: 4; }
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
      <div class="brand"><h1>Blind bookmark triage</h1><p>Judge the pile before pictures arrive.</p></div>
      <div class="stats" aria-label="Triage progress">
        <div class="stat total"><strong id="count">0</strong><span>Total</span></div>
        <div class="stat"><strong id="backlog">0</strong><span>Untriaged</span></div>
        <div class="stat"><strong id="rate">—</strong><span>Per min</span></div>
      </div>
    </header>
    <details id="importer" open>
      <summary>Import a browser bookmark file</summary>
      <form id="import-form">
        <label>Bookmark HTML<input id="bookmark-file" name="file" type="file" accept=".html,text/html" required></label>
        <label>Source tag<input id="source" name="source" value="browser-export" pattern="[a-z0-9][a-z0-9-]*" required></label>
        <button type="submit">Import file</button>
      </form>
    </details>
    <section class="toolbar" aria-label="Triage actions">
      <button type="button" data-verdict="keeper"><span class="shortcut"><kbd>K</kbd> </span>Keep</button>
      <button type="button" data-verdict="junk"><span class="shortcut"><kbd>J</kbd> </span>Junk</button>
      <button type="button" data-verdict="archive"><span class="shortcut"><kbd>A</kbd> </span>Archive</button>
      <button type="button" data-verdict="needs-more-time"><span class="shortcut"><kbd>N</kbd> </span>Needs time</button>
      <button id="undo" type="button"><span class="shortcut"><kbd>U</kbd> </span>Undo</button>
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
      session: document.querySelector('#session'), undo: document.querySelector('#undo'),
    };
    const state = {total: 0, backlog: 0, offset: 0, items: [], visible: 16, buffer: 8, columns: 8, focused: 0, marked: new Set(), session: null, loading: false, resizeTimer: null};

    async function api(path, options = {}) {
      const response = await fetch(path, options);
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
      elements.count.textContent = state.total.toLocaleString();
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
    }
    async function startSession() {
      if (!state.total || (state.session && !state.session.ended_at)) return;
      state.session = await api('/api/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'})});
      updateProgress();
    }
    function host(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'saved link'; } }
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
      addText(card, 'span', 'site', host(item.url));
      addText(card, 'h2', '', item.title);
      if (item.note) addText(card, 'p', 'note', item.note);
      const tags = document.createElement('div');
      tags.className = 'tags';
      for (const value of (item.tags || []).slice(0, 3)) addText(tags, 'span', 'tag', value);
      card.append(tags);
      addText(card, 'span', 'verdict-label', verdictText(item.verdict));
      const mark = document.createElement('button');
      mark.type = 'button'; mark.className = 'mark'; mark.textContent = state.marked.has(item.id) ? '✓' : '+';
      mark.setAttribute('aria-label', 'Mark ' + item.title); mark.setAttribute('aria-pressed', String(state.marked.has(item.id)));
      mark.addEventListener('click', event => { event.stopPropagation(); toggleMark(index); });
      card.append(mark);
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
        const data = await api('/api/items?limit=' + (state.visible + state.buffer) + '&offset=' + Math.max(0, offset));
        state.total = data.total; state.backlog = data.backlog; state.offset = Math.max(0, Math.min(offset, Math.max(0, data.total - 1)));
        state.items = data.items; state.focused = 0; state.marked.clear(); renderGrid();
        if (state.total) { elements.importer.open = false; await startSession(); elements.grid.focus({preventScroll: true}); }
      } finally { state.loading = false; updateProgress(); }
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
      await moveFocus(1);
    }
    async function undo() {
      if (!state.session || state.session.ended_at) return;
      const data = await api('/api/undo', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({session_id: state.session.id})});
      patchChanges(data.changes); state.backlog = data.backlog; state.session = data.session;
      elements.status.textContent = data.changes.length ? 'Undid the last action as one step.' : 'Nothing to undo.'; updateProgress();
    }
    async function toggleSession() {
      if (!state.total) return;
      if (!state.session || state.session.ended_at) { state.session = null; await startSession(); elements.status.textContent = 'New sitting started.'; }
      else { state.session = await api('/api/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'finish', session_id: state.session.id})}); elements.status.textContent = 'Sitting saved: ' + state.session.items_judged.toLocaleString() + ' judged.'; }
      updateProgress();
    }
    elements.form.addEventListener('submit', async event => {
      event.preventDefault(); const button = elements.form.querySelector('button'); button.disabled = true; elements.status.textContent = 'Importing…';
      try {
        const response = await fetch('/api/import', {method: 'POST', body: new FormData(elements.form)}); const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Import failed');
        elements.status.textContent = 'Imported ' + data.added.toLocaleString() + ' new; merged ' + data.merged.toLocaleString() + '.'; await loadWindow(0);
      } catch (error) { elements.status.textContent = error.message; } finally { button.disabled = false; }
    });
    document.querySelectorAll('[data-verdict]').forEach(button => button.addEventListener('click', () => applyVerdict(button.dataset.verdict).catch(error => { elements.status.textContent = error.message; })));
    elements.undo.addEventListener('click', () => undo().catch(error => { elements.status.textContent = error.message; }));
    elements.session.addEventListener('click', () => toggleSession().catch(error => { elements.status.textContent = error.message; }));
    document.addEventListener('keydown', event => {
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
    loadWindow(0).catch(error => { elements.status.textContent = error.message; });
  </script>
</body>
</html>`;
}
