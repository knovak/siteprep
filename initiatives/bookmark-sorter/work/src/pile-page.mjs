export function renderPilePage({isAdmin = false} = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bookmark triage</title>
  <script>
    // Apply the local preference before paint; unavailable storage falls back to Day.
    try {
      document.documentElement.dataset.theme = localStorage.getItem('bookmark-sorter-theme') === 'night' ? 'night' : 'day';
    } catch { document.documentElement.dataset.theme = 'day'; }
  </script>
  <style>
    :root {
      color-scheme: light;
      font: 15px/1.35 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink); background: var(--canvas); --columns: 8; --rows: 2;
      --canvas: #faf3e8; --surface: #fffdf7; --subtle: #f2ebdf;
      --ink: #173138; --muted: #506a70; --line: #d6c8b7; --control-line: #a69581;
      --primary: #005965; --primary-edge: #00444d; --on-primary: #ffffff;
      --link: #005965; --focus: #007580; --selected: #54736e; --selected-bg: #e2efea;
      --tag-bg: #cfe5df; --tag-ink: #244f51;
      --green: #28733f; --red: #a53a31; --blue: #48648d; --amber: #88600e; --purple: #704791;
      --success-bg: #e3f0e5; --shadow: #1731380a; --popover-shadow: #17313826;
    }
    :root[data-theme="night"] {
      color-scheme: dark;
      --canvas: #171f28; --surface: #222d39; --subtle: #283543;
      --ink: #edf2f7; --muted: #b9c7d5; --line: #4b5d70; --control-line: #708397;
      --primary: #287887; --primary-edge: #1d6472; --on-primary: #ffffff;
      --link: #83d5dc; --focus: #67c9d0; --selected: #b9c7d5; --selected-bg: #2c3c49;
      --tag-bg: #304c53; --tag-ink: #c6e7e4;
      --green: #86c99d; --red: #f09d95; --blue: #a5bde7; --amber: #e4c47d; --purple: #c9aae5;
      --success-bg: #294b3b; --shadow: #00000018; --popover-shadow: #00000066;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body { margin: 0; overflow: hidden; }
    button, input, select { font: inherit; }
    input, select { color: var(--ink); }
    input::placeholder { color: var(--muted); opacity: 1; }
    :is(button, input, select, summary):focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    button { cursor: pointer; }
    main { height: 100dvh; display: grid; grid-template-rows: auto auto auto auto minmax(0, 1fr) auto; gap: 8px; padding: 12px; }
    header { grid-row: 1; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .header-tools { display: flex; align-items: center; gap: 12px; }
    .layout-picker { display: flex; grid-template-columns: none; align-items: center; gap: 7px; white-space: nowrap; }
    .layout-picker select { min-height: 34px; border: 1px solid var(--control-line); border-radius: 9px; padding: 5px 28px 5px 9px; color: var(--ink); background: var(--surface); font-weight: 600; }
    .layout-picker select:disabled { opacity: .6; cursor: not-allowed; }
    #theme-mode, #help-toggle { min-height: 34px; border: 1px solid var(--control-line); border-radius: 9px; padding: 6px 10px; color: var(--ink); background: var(--surface); font-weight: 600; }
    .brand { min-width: 0; }
    h1 { margin: 0; color: var(--ink); font-size: clamp(1.45rem, 3vw, 2.4rem); line-height: 1; letter-spacing: -.035em; font-weight: 650; }
    .brand p { margin: 4px 0 0; color: var(--muted); font-size: .82rem; }
    .stats { display: flex; gap: 18px; align-items: baseline; white-space: nowrap; }
    .stat strong { display: block; color: var(--ink); font-size: 1.4rem; line-height: 1; font-variant-numeric: tabular-nums; }
    .stat span { color: var(--muted); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
    .collection-bar { grid-row: 2; display: flex; align-items: center; gap: 7px; min-width: 0; overflow-x: auto; padding: 8px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
    .collection-bar select, .collection-bar input, .collection-bar button { flex: 0 0 auto; min-height: 36px; border: 1px solid var(--control-line); border-radius: 8px; padding: 6px 9px; color: var(--ink); background: var(--surface); font-weight: 600; }
    #collection-select { min-width: min(280px, 42vw); }
    .rename-form { display: flex; align-items: center; gap: 7px; padding: 0; }
    #collection-name { min-width: min(240px, 38vw); }
    .rename-form button[type="submit"] { border-color: var(--primary); color: var(--on-primary); background: var(--primary); }
    .collection-bar .danger { border-color: var(--red); color: var(--red); }
    .collection-bar .spacer { flex: 1 0 12px; }
    .collection-kind { flex: 0 0 auto; color: var(--muted); font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; }
    .admin-menu { position: relative; flex: 0 0 auto; border: 0; background: transparent; }
    .admin-menu > summary { min-height: 36px; list-style: none; border: 1px solid var(--control-line); border-radius: 8px; padding: 7px 28px 7px 10px; color: var(--ink); background: var(--surface); cursor: pointer; font-weight: 600; }
    .admin-menu > summary::-webkit-details-marker { display: none; }
    .admin-menu > summary::after { position: absolute; top: 11px; right: 10px; content: '▾'; }
    .admin-menu[open] > summary::after { content: '▴'; }
    .admin-menu-content { position: fixed; z-index: 25; top: 132px; right: 12px; width: min(460px, calc(100vw - 24px)); max-height: calc(100dvh - 148px); overflow: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; border: 1px solid var(--control-line); border-radius: 12px; padding: 10px; background: var(--surface); box-shadow: 0 16px 48px var(--ink)38; }
    .admin-menu-content > button { min-height: 38px; border: 1px solid var(--control-line); border-radius: 8px; padding: 7px 9px; color: var(--ink); background: var(--surface); font-weight: 600; }
    .admin-menu-content .admin-capture { border-color: var(--purple); color: var(--purple); }
    .admin-menu-content button:disabled { opacity: .45; cursor: not-allowed; }
    .admin-user-form { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) 110px auto; gap: 7px; align-items: end; border-top: 1px solid var(--line); padding: 9px 0 0; }
    .admin-user-form.remove { grid-template-columns: minmax(0, 1fr) auto; }
    .admin-user-form.template { grid-template-columns: minmax(0, 1fr) auto; }
    .admin-user-form input, .admin-user-form select, .admin-user-form button { min-width: 0; min-height: 38px; border: 1px solid var(--control-line); border-radius: 8px; padding: 7px 9px; background: var(--surface); }
    .admin-user-form button { border-color: var(--primary); color: var(--on-primary); background: var(--primary); font-weight: 600; }
    .collection-bar .admin-user-form button.danger { border-color: #a53a31; color: var(--on-primary); background: #a53a31; }
    #display-users { grid-column: 1 / -1; }
    #authorized-users { grid-column: 1 / -1; margin: 0; padding: 8px 8px 8px 28px; border-radius: 8px; color: var(--muted); background: var(--subtle); font-size: .82rem; }
    .sitting-report { grid-column: 1 / -1; border-radius: 8px; padding: 9px; color: var(--muted); background: var(--subtle); }
    .sitting-report dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 10px; margin: 0 0 8px; font-size: .8rem; }
    .sitting-report dt { font-weight: 600; }
    .sitting-report dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
    .sitting-report ol { max-height: 160px; overflow: auto; margin: 8px 0; padding-left: 24px; font-size: .76rem; }
    .sitting-report button { min-height: 34px; border: 1px solid var(--primary); border-radius: 8px; padding: 6px 9px; color: var(--on-primary); background: var(--primary); font-weight: 600; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
    .file-tools { grid-row: 3; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: start; }
    .file-tools:has(#importer[open]) { grid-template-columns: minmax(0, 1fr) max-content max-content; }
    .file-tools:has(#selector[open]) { grid-template-columns: max-content minmax(0, 1fr) max-content; }
    .file-tools:has(#exporter[open]) { grid-template-columns: max-content max-content minmax(0, 1fr); }
    .file-tools > details { min-width: 0; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
    .file-tools > details > summary { overflow: hidden; padding: 8px 12px; color: var(--ink); cursor: pointer; font-weight: 600; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
    .file-tools > details[open] > summary { border-bottom: 1px solid var(--line); text-align: left; }
    .file-tools form { display: grid; grid-template-columns: 1fr minmax(160px, .35fr) auto; gap: 10px; align-items: end; padding: 10px 12px 12px; }
    label { display: grid; gap: 4px; color: var(--muted); font-size: .74rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    input, .file-tools form select, .file-tools form button { min-height: 40px; border: 1px solid var(--control-line); border-radius: 9px; padding: 8px 10px; background: var(--surface); }
    .file-tools form button { border-color: var(--primary); color: var(--on-primary); background: var(--primary); font-weight: 600; }
    .file-tools form .danger { border-color: #a53a31; background: #a53a31; }
    #import-form { grid-template-columns: minmax(360px, 1.4fr) minmax(160px, .35fr) auto; }
    .import-file-picker { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(150px, .65fr); gap: 8px; align-items: end; }
    .drop-zone { min-height: 40px; display: grid; place-content: center; border: 2px dashed var(--control-line); border-radius: 9px; padding: 5px 10px; color: var(--ink); background: var(--subtle); cursor: pointer; text-align: center; }
    .drop-zone strong { font-size: .78rem; }
    .drop-zone span { color: var(--muted); font-size: .68rem; }
    .drop-zone[data-drag-active="true"] { border-color: var(--primary); color: var(--primary-edge); background: var(--selected-bg); box-shadow: inset 0 0 0 1px var(--primary); }
    .drop-zone:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    #export-form { grid-template-columns: minmax(180px, .8fr) minmax(220px, 1fr) auto auto; }
    .file-field { display: grid; gap: 4px; }
    .portable-copy { align-self: center; margin: 0; color: var(--muted); font-size: .76rem; }
    .template-tools { display: grid; grid-template-columns: minmax(180px, 1fr) auto; gap: 8px; align-items: end; border-top: 1px solid var(--line); padding: 10px 12px 12px; }
    .template-tools select, .template-tools button { min-width: 0; min-height: 40px; border: 1px solid var(--control-line); border-radius: 9px; padding: 8px 10px; color: var(--ink); background: var(--surface); font-weight: 600; }
    .template-tools button { border-color: var(--primary); color: var(--on-primary); background: var(--primary); }
    .tool-status { min-height: 1.25em; margin: 0; padding: 0 12px 10px; color: var(--muted); font-size: .78rem; }
    .tool-status.error { color: var(--red); font-weight: 700; }
    .selection-panel { display: grid; grid-template-columns: minmax(220px, 2fr) auto minmax(150px, 1fr) auto; gap: 7px; align-items: center; padding: 10px 12px 12px; }
    .selection-panel input, .selection-panel select, .selection-panel button { min-width: 0; min-height: 36px; border: 1px solid var(--control-line); border-radius: 8px; padding: 6px 9px; background: var(--surface); }
    .selection-panel button { color: var(--ink); font-weight: 600; }
    .selection-panel button:disabled { opacity: .45; cursor: not-allowed; }
    .selection-panel .primary { border-color: var(--primary); color: var(--on-primary); background: var(--primary); }
    .selection-panel .choice-action { color: var(--ink); background: var(--surface); }
    .selection-panel .choice-action[data-selection-ready="true"] { border-color: var(--primary); color: var(--on-primary); background: var(--primary); }
    .tag-control { min-width: 0; display: flex; align-items: stretch; }
    .selection-panel .tag-control #tag-selection { flex: 1 1 auto; border-color: var(--control-line); border-radius: 8px 0 0 8px; color: var(--ink); background: var(--surface); }
    .selection-panel .tag-control #tag-selection[data-tag-ready="true"] { border-color: var(--primary); color: var(--on-primary); background: var(--primary); }
    .tag-mode-picker { position: relative; flex: 0 0 38px; min-height: 36px; display: grid; place-items: center; border: 1px solid var(--control-line); border-left-color: var(--control-line); border-radius: 0 8px 8px 0; color: var(--ink); background: var(--surface); cursor: pointer; }
    .tag-mode-picker[data-tag-ready="true"] { border-color: var(--primary); border-left-color: var(--primary-edge); color: var(--on-primary); background: var(--primary); }
    .tag-mode-picker select { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; opacity: 0; border: 0; padding: 0; cursor: pointer; }
    .tag-mode-picker:has(select:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
    .tag-mode-picker span { pointer-events: none; font-size: 1.05rem; }
    #selection-summary { grid-column: 3 / 5; overflow: hidden; color: var(--muted); font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }
    .page-controls { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .toolbar { grid-row: 4; display: flex; align-items: center; gap: 7px; min-width: 0; overflow-x: auto; padding-bottom: 1px; }
    .toolbar button { flex: 0 0 auto; min-height: 38px; border: 1px solid var(--line); border-radius: 9px; padding: 7px 10px; color: var(--ink); background: var(--surface); font-weight: 600; }
    .toolbar button[data-verdict="keeper"] { border-color: var(--green); color: var(--green); }
    .toolbar button[data-verdict="junk"] { border-color: var(--red); color: var(--red); }
    .toolbar button[data-verdict="archive"] { border-color: var(--blue); color: var(--blue); }
    .toolbar button[data-verdict="needs-more-time"] { border-color: var(--amber); color: var(--amber); }
    .toolbar button:disabled { opacity: .45; cursor: not-allowed; }
    form button:disabled { opacity: .5; cursor: wait; }
    #capture-pass-one, #capture-gaps { border-color: var(--purple); color: var(--purple); }
    #sweep-verdict { flex: 0 0 auto; min-height: 38px; border: 1px solid var(--control-line); border-radius: 9px; padding: 7px 30px 7px 9px; color: var(--ink); background: var(--surface); font-weight: 600; }
    .sweep-control { flex: 0 0 auto; display: flex; align-items: stretch; }
    .toolbar #sweep-rest { border-color: var(--primary); border-radius: 9px 0 0 9px; color: var(--on-primary); background: var(--primary); }
    .sweep-mode-picker { position: relative; width: 40px; min-height: 38px; display: grid; place-items: center; border: 1px solid var(--primary); border-left-color: var(--primary-edge); border-radius: 0 9px 9px 0; color: var(--on-primary); background: var(--primary); cursor: pointer; }
    .sweep-mode-picker select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .sweep-mode-picker:has(select:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
    .sweep-mode-picker span { pointer-events: none; font-size: 1.05rem; }
    .toolbar .spacer { flex: 1 0 12px; }
    #mark-count { flex: 0 0 auto; color: var(--muted); font-size: .78rem; }
    #grid { grid-row: 5; min-height: 0; display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); gap: 8px; overflow: hidden; outline: none; }
    .bookmark-card { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; border: 2px solid var(--line); border-radius: 13px; padding: 11px; color: var(--ink); background: var(--surface); box-shadow: 0 5px 18px var(--shadow); }
    .bookmark-card.focused { border-color: var(--focus); outline: 2px solid var(--focus); outline-offset: -4px; }
    .bookmark-card.marked { border-color: var(--selected); background: var(--selected-bg); }
    .bookmark-card::before { content: ''; position: absolute; z-index: 1; inset: 0 0 auto; height: 4px; background: var(--verdict-stripe, transparent); pointer-events: none; }
    .bookmark-card[data-verdict="keeper"] { --verdict-stripe: var(--green); }
    .bookmark-card[data-verdict="junk"] { --verdict-stripe: var(--red); }
    .bookmark-card[data-verdict="archive"] { --verdict-stripe: var(--blue); }
    .bookmark-card[data-verdict="needs-more-time"] { --verdict-stripe: var(--amber); }
    .capture { min-height: 42%; overflow: hidden; margin: -11px -11px 8px; display: grid; place-items: center; color: var(--muted); background: var(--subtle); font-size: .68rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .capture img { width: 100%; height: 100%; display: block; object-fit: cover; }
    :root[data-grid-rows="3"] .capture { flex: 0 0 30%; min-height: 0; }
    :root[data-grid-rows="3"] .bookmark-card h2 { min-height: 2.34em; -webkit-line-clamp: 2; }
    :root[data-grid-rows="3"] .note { -webkit-line-clamp: 1; }
    :root[data-grid-rows="3"][data-grid-columns="12"] .capture { flex-basis: 18%; }
    :root[data-grid-rows="3"][data-grid-columns="12"] .bookmark-card { padding: 8px; }
    :root[data-grid-rows="3"][data-grid-columns="12"] .capture { margin: -8px -8px 5px; }
    :root[data-grid-rows="3"][data-grid-columns="12"] .bookmark-card h2 { flex: 1 1 auto; min-height: 0; margin-block: 5px 3px; font-size: .82rem; -webkit-line-clamp: unset; }
    :root[data-grid-rows="3"][data-grid-columns="12"] .note { display: none; }
    :root[data-grid-rows="3"][data-grid-columns="12"] .tags { margin-top: 0; padding-top: 4px; }
    .site { overflow: hidden; color: var(--muted); font-size: .67rem; font-weight: 600; letter-spacing: .06em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
    .bookmark-card h2 { display: -webkit-box; overflow: hidden; margin: 7px 0 5px; color: var(--ink); font-size: .92rem; font-weight: 600; line-height: 1.17; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }
    .bookmark-card h2 a { color: inherit; text-decoration: none; }
    .bookmark-card h2 a:hover { text-decoration: underline; text-underline-offset: .15em; }
    .bookmark-card h2 a:focus-visible { border-radius: 3px; outline: 2px solid var(--focus); outline-offset: 2px; }
    .note { display: -webkit-box; overflow: hidden; margin: 0; color: var(--muted); font-size: .75rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .tags { display: flex; gap: 4px; overflow: hidden; margin-top: auto; padding-top: 8px; }
    .tag { flex: 0 0 auto; max-width: 9.5em; overflow: hidden; border-radius: 999px; padding: 2px 6px; color: var(--tag-ink); background: var(--tag-bg); cursor: help; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
    .tag:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    .tag-popover { position: fixed; z-index: 30; width: max-content; max-width: min(360px, calc(100vw - 16px)); max-height: min(300px, calc(100dvh - 16px)); overflow: auto; border: 1px solid var(--control-line); border-radius: 9px; padding: 8px 10px; color: var(--ink); background: var(--surface); box-shadow: 0 10px 32px var(--ink)38; cursor: text; font-size: .84rem; line-height: 1.45; user-select: text; white-space: pre-wrap; }
    .verdict-label { margin-top: 6px; color: var(--muted); font-size: .66rem; font-weight: 600; text-transform: uppercase; }
    .mark { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; border: 1px solid var(--control-line); border-radius: 50%; padding: 0; color: var(--ink); background: var(--surface); font-weight: 700; }
    .mark[aria-pressed="true"] { border-color: var(--primary); color: var(--on-primary); background: var(--primary); }
    .copy-url { position: absolute; top: 7px; left: 7px; width: 28px; height: 28px; border: 1px solid var(--control-line); border-radius: 50%; padding: 0; color: var(--ink); background: var(--surface); }
    .copy-url:hover, .copy-url:focus-visible { border-color: var(--focus); color: var(--primary); }
    .copy-url[data-copied="true"] { border-color: var(--green); color: var(--green); background: var(--success-bg); }
    .copy-icon::before, .copy-icon::after { position: absolute; width: 8px; height: 9px; border: 1.5px solid currentColor; border-radius: 2px; content: ''; }
    .copy-icon::before { top: 7px; left: 8px; }
    .copy-icon::after { top: 10px; left: 11px; background: var(--surface); }
    .copy-url[data-copied="true"] .copy-icon::after { background: var(--success-bg); }
    .empty { grid-column: 1 / -1; align-self: center; justify-self: center; max-width: 32rem; color: var(--muted); text-align: center; }
    .footer-line { grid-row: 6; display: flex; justify-content: space-between; gap: 14px; color: var(--muted); font-size: .76rem; }
    #status { min-height: 1.2em; margin: 0; }
    #position { white-space: nowrap; font-variant-numeric: tabular-nums; }
    kbd { border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; background: var(--surface); font: .68rem ui-monospace, monospace; }
    .help-panel { position: fixed; z-index: 20; top: 74px; right: 12px; width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 90px); overflow: auto; border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; background: var(--surface); box-shadow: 0 18px 60px var(--ink)40; }
    .help-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .help-heading h2 { margin: 0; color: var(--ink); font-size: 1.15rem; }
    #help-close { border: 1px solid var(--control-line); border-radius: 8px; padding: 5px 9px; color: var(--ink); background: var(--surface); }
    .help-panel h3 { margin: 16px 0 6px; color: var(--ink); font-size: .88rem; }
    .help-panel p, .help-panel li { color: var(--muted); font-size: .83rem; }
    .help-panel ul { margin: 6px 0; padding-left: 20px; }
    .help-panel code { border-radius: 4px; padding: 1px 4px; color: var(--tag-ink); background: var(--tag-bg); font-size: .78rem; }
    .help-documentation { margin: 16px 0 0; }
    .help-documentation a { color: var(--link); font-weight: 600; text-underline-offset: 3px; }
    @media (max-width: 1100px) { :root { --columns: 4; --rows: 3; } .layout-picker { display: none; } .bookmark-card h2 { font-size: .98rem; } }
    @media (max-width: 1100px) and (orientation: portrait) { :root { --columns: 3; --rows: 3; } }
    @media (max-width: 640px) {
      :root { --columns: 1; --rows: 1; }
      main { padding: 9px; gap: 4px; }
      .brand p, .stat.total, .toolbar .shortcut { display: none; }
      header { min-width: 0; gap: 8px; }
      .brand { flex: 1 0 106px; }
      .header-tools { min-width: 0; flex: 0 1 auto; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
      .stats { gap: 10px; }
      .stat strong { font-size: 1.15rem; }
      .collection-bar { gap: 4px; padding: 3px; border-radius: 9px; }
      .collection-bar select, .collection-bar input, .collection-bar button { min-height: 32px; padding: 4px 7px; }
      .collection-kind, .collection-bar .spacer { display: none; }
      .file-tools { gap: 4px; }
      .file-tools > details > summary { padding-inline: 8px; }
      .selection-panel { display: flex; overflow-x: auto; }
      .selection-panel > * { flex: 0 0 min(72vw, 240px); }
      .selection-panel button { flex-basis: auto; }
      .page-controls { display: flex; }
      .file-tools form, #import-form, #export-form { grid-template-columns: 1fr; }
      .import-file-picker { grid-template-columns: 1fr; }
      .template-tools { grid-template-columns: minmax(150px, 1fr) auto; overflow-x: auto; }
      .admin-menu-content { top: 118px; max-height: calc(100dvh - 130px); }
      .admin-user-form { grid-template-columns: minmax(0, 1fr) 92px; }
      .admin-user-form button { grid-column: 1 / -1; }
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
        <label class="layout-picker"><span>Page layout</span><select id="page-layout" aria-label="Page layout"><option value="3x3">3 × 3</option><option value="2x6">2 × 6</option><option value="2x8" selected>2 × 8</option><option value="3x12">3 × 12</option></select></label>
        <select id="theme-mode" aria-label="Color mode" title="Choose Day or Night colors"><option value="day">Day</option><option value="night">Night</option></select>
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
        <li><strong>+</strong> marks cards; then Keep, Junk, Archive, or Needs-time applies that verdict to the marked set. With no marks, the verdict applies to the focused card.</li>
        <li><strong>Undo</strong> or <kbd>U</kbd> reverses the last verdict or tagging action in the active sitting.</li>
        <li><strong>Sweep untriaged</strong> applies the chosen sweep verdict only to untriaged cards on the visible page, then advances one page. Use its arrow to choose <strong>Sweep all selected</strong>, which applies the verdict to the entire open selection after showing a confirmation count.</li>
        <li><strong>Previous / Next</strong> changes pages without changing verdicts.</li>
        <li><strong>Day / Night</strong> changes the colors without changing your layout or bookmarks. Day uses Cream and teal; Night uses Dark slate. This browser remembers your choice. Marked cards have an outline (light grey at night); teal shows the focused card.</li>
        <li><strong>Page layout</strong> immediately changes the number of rows and columns in a wide window. Compact windows continue to fit fewer, larger cards.</li>
        <li><strong>Tag items</strong> adds the entered tags to marked cards, or to the entire open selection when nothing is marked. Use its arrow to choose <strong>Untag items</strong> and remove the entered tags from the same set.</li>
        <li><strong>Import</strong> accepts bookmark HTML or Sorter JSON through Choose File or the neighboring drop target. Dropping selects the file; Import file starts the write.</li>
        <li><strong>Open proposal / saved / previous</strong> uses a neutral background until its chooser has a target, then a filled teal background with white text.</li>
        <li><strong>Export</strong> downloads either the current collection or the open selection as importable JSON, including tags and verdicts.</li>
        ${isAdmin ? '<li><strong>Admin</strong> contains sitting controls, demo-template creation, the authorized-user list editor, and metadata capture. Show sitting displays the durable sitting record and offers a JSON export. It appears only for users listed as administrators.</li><li><strong>Capture gaps</strong> under Admin is currently unavailable because fallback screenshot capture is not enabled.</li>' : ''}
        <li>Click a title to open its URL in a new tab; use the overlapping-squares icon to copy the URL.</li>
      </ul>
      <h3>Selection expressions</h3>
      <p>Open matching items by typing an expression, then choosing <strong>Open selection</strong>. Titles, folder paths, tags, and source names use lowercase search keys: punctuation, symbols, and spaces become a single dash. A tag's prefix colon remains, so <code>Topic:Modern Art</code> becomes <code>topic:modern-art</code>. A trailing <code>*</code> matches the beginning of a normalized value; surrounding a value with <code>*</code> matches it anywhere.</p>
      <ul>
        <li><code>site:example.com</code> — items from one site.</li>
        <li><code>title:*court-drama*</code> — normalized titles containing that text; use <code>title:court-drama*</code> to match only the beginning.</li>
        <li><code>src:safari-export</code> — items whose normalized Source tag is <code>safari-export</code>.</li>
        <li><code>folder:*modern-art*</code> — items whose normalized bookmark folder path contains that text.</li>
        <li><code>topic:*modern-art*</code> — items whose normalized tag value contains that text; ordinary tags need no extra <code>tag:</code> prefix.</li>
        <li><code>in:2026-08-19</code> — items imported on that date.</li>
        <li><code>verdict:keep</code>, <code>verdict:junk</code>, <code>verdict:archive</code>, <code>verdict:needs-time</code>, or <code>verdict:untriaged</code> — current verdict.</li>
        <li><code>image:present</code>, <code>image:failed</code>, or <code>image:none</code> — stored picture status.</li>
        <li><code>collection:&lt;id&gt;</code> — collection scope; the interface adds the current collection automatically.</li>
        <li>Combine terms with <code>and</code>, <code>or</code>, <code>not</code>, and parentheses.</li>
      </ul>
      <p class="help-documentation"><a href="https://knovak.github.io/siteprep/initiatives/bookmark-sorter/README.html" target="_blank" rel="noopener noreferrer">Full documentation</a></p>
    </aside>
    <aside id="tag-popover" class="tag-popover" role="note" aria-label="All tags" hidden></aside>
    <section class="collection-bar" aria-label="Collections">
      <select id="collection-select" aria-label="Current collection"></select>
      <span id="collection-kind" class="collection-kind"></span>
      <button id="rename-collection" type="button">Rename</button>
      <button id="new-collection" type="button">New</button>
      <form id="rename-form" class="rename-form" hidden>
        <label class="visually-hidden" for="collection-name">Collection name</label>
        <input id="collection-name" name="name" autocomplete="off" maxlength="120" required>
        <button type="submit">Save</button>
        <button id="cancel-rename" type="button">Cancel</button>
      </form>
      <button id="fresh-copy" type="button" hidden>Fresh copy</button>
      <button id="delete-copy" class="danger" type="button" hidden>Delete copy</button>
      <span class="spacer"></span>
      ${isAdmin ? `<details id="admin-menu" class="admin-menu">
        <summary>Admin</summary>
        <div class="admin-menu-content">
          <button id="session" type="button">End sitting</button>
          <button id="show-sitting" type="button" aria-expanded="false" aria-controls="sitting-report">Show sitting</button>
          <section id="sitting-report" class="sitting-report" aria-label="Current sitting data" hidden>
            <dl id="sitting-summary"></dl>
            <ol id="sitting-actions"></ol>
            <button id="export-sitting" type="button">Export sitting data</button>
          </section>
          <form id="add-user-form" class="admin-user-form">
            <label>Email<input id="add-user-email" name="email" type="email" autocomplete="email" required></label>
            <label>Type<select id="add-user-type" name="type"><option value="user">User</option><option value="admin">Admin</option></select></label>
            <button type="submit">Add user</button>
          </form>
          <form id="remove-user-form" class="admin-user-form remove">
            <label>Email<input id="remove-user-email" name="email" type="email" autocomplete="email" required></label>
            <button class="danger" type="submit">Remove user</button>
          </form>
          <button id="display-users" type="button">Display users</button>
          <ul id="authorized-users" aria-label="Authorized users" hidden></ul>
          <form id="create-template-form" class="admin-user-form template">
            <label>Template name<input id="create-template-name" name="name" autocomplete="off" maxlength="120" required></label>
            <button type="submit">Create template</button>
          </form>
          <button id="capture-pass-one" class="admin-capture" type="button" disabled title="Capture metadata for bookmarks imported before image storage was enabled">Capture metadata</button>
          <button id="capture-gaps" class="admin-capture" type="button" disabled title="Fallback screenshot capture is not enabled">Capture gaps</button>
        </div>
      </details>` : ''}
    </section>
    <section class="file-tools" aria-label="Import, select, and export">
      <details id="importer">
        <summary>Import</summary>
        <form id="import-form">
          <div class="import-file-picker">
            <label>Bookmark HTML or Sorter JSON<input id="bookmark-file" name="file" type="file" accept=".html,.json,text/html,application/json" required></label>
            <div id="import-drop-zone" class="drop-zone" role="button" tabindex="0" aria-controls="bookmark-file">
              <strong>Drop a file here</strong>
              <span id="import-drop-copy" aria-live="polite">HTML or Sorter JSON</span>
            </div>
          </div>
          <label>Source tag (HTML only)<input id="source" name="source" value="browser-export" pattern="[a-z0-9][a-z0-9-]*" required></label>
          <button type="submit">Import file</button>
        </form>
        <p id="import-status" class="tool-status" role="status" aria-live="polite"></p>
        <div class="template-tools">
          <label>Demo templates<select id="template-select" aria-label="Demo templates"><option value="">Demo templates</option></select></label>
          <button id="copy-template" type="button">Load a copy</button>
        </div>
      </details>
      <details id="selector">
        <summary>Select and tag</summary>
        <section class="selection-panel" aria-label="Selection tools">
          <input id="selection-expression" aria-label="Selection expression" placeholder="folder:reading/* and not topic:rust">
          <button id="open-selection" class="primary" type="button">Open selection</button>
          <input id="selection-name" aria-label="Saved selection name" placeholder="Selection name">
          <button id="save-selection" type="button">Save</button>
          <select id="proposals" aria-label="Automatic proposals"><option value="">Automatic proposals</option></select>
          <button id="open-proposal" class="choice-action" data-selection-ready="false" type="button">Open proposal</button>
          <input id="tag-input" aria-label="Tags to add" placeholder="tag-one, tag-two">
          <div class="tag-control">
            <button id="tag-selection" data-tag-ready="false" type="button">Tag items</button>
            <label class="tag-mode-picker" data-tag-ready="false" title="Choose tag action">
              <span aria-hidden="true">▾</span>
              <select id="tag-mode" aria-label="Tag mode">
                <option value="apply">Tag items</option>
                <option value="remove">Untag items</option>
              </select>
            </label>
          </div>
          <select id="saved-selections" aria-label="Saved selections"><option value="">Saved selections</option></select>
          <button id="open-saved" class="choice-action" data-selection-ready="false" type="button">Open saved</button>
          <select id="previous-selections" aria-label="Previous selections"><option value="">Previous selections</option></select>
          <button id="open-previous" class="choice-action" data-selection-ready="false" type="button">Open previous</button>
          <span id="selection-summary">All items</span>
        </section>
      </details>
      <details id="exporter">
        <summary>Export</summary>
        <form id="export-form">
          <div class="file-field"><label for="export-scope">Export scope</label><select id="export-scope" name="scope"><option value="collection">Current collection</option><option value="selection">Current selection</option></select></div>
          <p class="portable-copy">Bookmark Sorter JSON includes URLs, notes, tags, and verdicts, and can be imported here again.</p>
          <button id="export-file" type="submit">Export file</button>
          <button id="erase-collection" class="danger" type="button">Erase current collection</button>
        </form>
      </details>
    </section>
    <section class="toolbar" aria-label="Triage actions">
      <button type="button" data-verdict="keeper"><span class="shortcut"><kbd>K</kbd> </span>Keep</button>
      <button type="button" data-verdict="junk"><span class="shortcut"><kbd>J</kbd> </span>Junk</button>
      <button type="button" data-verdict="archive"><span class="shortcut"><kbd>A</kbd> </span>Archive</button>
      <button type="button" data-verdict="needs-more-time"><span class="shortcut"><kbd>N</kbd> </span>Needs-time</button>
      <button id="undo" type="button"><span class="shortcut"><kbd>U</kbd> </span>Undo</button>
      <span class="spacer"></span>
      <span id="mark-count">0 marked</span>
      <select id="sweep-verdict" aria-label="Sweep verdict">
        <option value="junk">Junk</option><option value="keeper">Keep</option><option value="archive">Archive</option><option value="needs-more-time">Needs-time</option>
      </select>
      <div class="sweep-control">
        <button id="sweep-rest" type="button">Sweep untriaged</button>
        <label class="sweep-mode-picker" title="Choose sweep scope">
          <span aria-hidden="true">▾</span>
          <select id="sweep-mode" aria-label="Sweep mode">
            <option value="untriaged">Sweep untriaged</option>
            <option value="selection">Sweep all selected</option>
          </select>
        </label>
      </div>
      <div class="page-controls" aria-label="Page through the current selection">
        <button id="previous-page" type="button">Previous</button><button id="next-page" type="button">Next</button>
      </div>
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
      form: document.querySelector('#import-form'), importer: document.querySelector('#importer'), selector: document.querySelector('#selector'), exportForm: document.querySelector('#export-form'), exporter: document.querySelector('#exporter'), exportScope: document.querySelector('#export-scope'), exportFile: document.querySelector('#export-file'), eraseCollection: document.querySelector('#erase-collection'), grid: document.querySelector('#grid'),
      count: document.querySelector('#count'), backlog: document.querySelector('#backlog'), rate: document.querySelector('#rate'),
      status: document.querySelector('#status'), position: document.querySelector('#position'), markCount: document.querySelector('#mark-count'),
      session: document.querySelector('#session'), showSitting: document.querySelector('#show-sitting'), sittingReport: document.querySelector('#sitting-report'), sittingSummary: document.querySelector('#sitting-summary'), sittingActions: document.querySelector('#sitting-actions'), exportSitting: document.querySelector('#export-sitting'), undo: document.querySelector('#undo'), capturePassOne: document.querySelector('#capture-pass-one'), captureGaps: document.querySelector('#capture-gaps'),
      expression: document.querySelector('#selection-expression'), openSelection: document.querySelector('#open-selection'),
      selectionName: document.querySelector('#selection-name'), saveSelection: document.querySelector('#save-selection'),
      savedSelections: document.querySelector('#saved-selections'), openSaved: document.querySelector('#open-saved'),
      previousSelections: document.querySelector('#previous-selections'), openPrevious: document.querySelector('#open-previous'),
      proposals: document.querySelector('#proposals'), openProposal: document.querySelector('#open-proposal'),
      tagInput: document.querySelector('#tag-input'), tagSelection: document.querySelector('#tag-selection'), tagMode: document.querySelector('#tag-mode'), tagModePicker: document.querySelector('.tag-mode-picker'),
      sweepVerdict: document.querySelector('#sweep-verdict'), sweepRest: document.querySelector('#sweep-rest'), sweepMode: document.querySelector('#sweep-mode'),
      selectionSummary: document.querySelector('#selection-summary'),
      collectionSelect: document.querySelector('#collection-select'), collectionKind: document.querySelector('#collection-kind'),
      renameCollection: document.querySelector('#rename-collection'), newCollection: document.querySelector('#new-collection'), renameForm: document.querySelector('#rename-form'),
      collectionName: document.querySelector('#collection-name'), cancelRename: document.querySelector('#cancel-rename'), freshCopy: document.querySelector('#fresh-copy'),
      deleteCopy: document.querySelector('#delete-copy'), templateSelect: document.querySelector('#template-select'),
      copyTemplate: document.querySelector('#copy-template'),
      adminMenu: document.querySelector('#admin-menu'), addUserForm: document.querySelector('#add-user-form'), addUserEmail: document.querySelector('#add-user-email'), addUserType: document.querySelector('#add-user-type'),
      removeUserForm: document.querySelector('#remove-user-form'), removeUserEmail: document.querySelector('#remove-user-email'), displayUsers: document.querySelector('#display-users'), authorizedUsers: document.querySelector('#authorized-users'),
      createTemplateForm: document.querySelector('#create-template-form'), createTemplateName: document.querySelector('#create-template-name'),
      helpToggle: document.querySelector('#help-toggle'), helpPanel: document.querySelector('#help-panel'), helpClose: document.querySelector('#help-close'), tagPopover: document.querySelector('#tag-popover'),
      themeMode: document.querySelector('#theme-mode'),
      pageLayout: document.querySelector('#page-layout'),
      previousPage: document.querySelector('#previous-page'), nextPage: document.querySelector('#next-page'),
      importStatus: document.querySelector('#import-status'), bookmarkFile: document.querySelector('#bookmark-file'), importDropZone: document.querySelector('#import-drop-zone'), importDropCopy: document.querySelector('#import-drop-copy'),
    };
    elements.themeMode.value = document.documentElement.dataset.theme;
    elements.themeMode.addEventListener('change', () => {
      document.documentElement.dataset.theme = elements.themeMode.value;
      try { localStorage.setItem('bookmark-sorter-theme', elements.themeMode.value); } catch { /* The mode still works for this page. */ }
    });
    const state = {collectionId: '', collections: [], templates: [], canEditTemplates: false, collectionEditing: '', collectionTotal: 0, total: 0, backlog: 0, selectionBacklog: 0, expression: '', captures: null, captureInProgress: false, offset: 0, items: [], visible: 16, buffer: 8, columns: 8, focused: 0, marked: new Set(), session: null, sittingReport: null, loading: false, windowRequest: 0, resizeTimer: null, saved: [], proposals: [], history: [], selectionToolsRequest: 0, tagPopoverAnchor: null, tagPopoverTimer: null, tagPopoverSelecting: false};

    async function api(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (state.collectionId) headers.set('x-bookmark-collection-id', state.collectionId);
      const response = await fetch(path, {...options, headers});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    }
    const pageLayouts = {'3x3': {columns: 3, rows: 3}, '2x6': {columns: 6, rows: 2}, '2x8': {columns: 8, rows: 2}, '3x12': {columns: 12, rows: 3}};
    function layout() {
      if (innerWidth <= 640) return {columns: 1, rows: 1, buffer: 2};
      if (innerWidth <= 1100) { const columns = innerWidth >= innerHeight ? 4 : 3; return {columns, rows: 3, buffer: columns}; }
      const selected = pageLayouts[elements.pageLayout.value] || pageLayouts['2x8'];
      return {...selected, buffer: selected.columns};
    }
    function setLayoutDimensions() {
      const next = layout();
      elements.pageLayout.disabled = innerWidth <= 1100;
      elements.pageLayout.title = elements.pageLayout.disabled ? 'Page layout choices are available in wide windows.' : '';
      state.columns = next.columns; state.visible = next.columns * next.rows; state.buffer = next.buffer;
      document.documentElement.dataset.gridRows = String(next.rows);
      document.documentElement.dataset.gridColumns = String(next.columns);
      document.documentElement.style.setProperty('--columns', next.columns); document.documentElement.style.setProperty('--rows', next.rows);
      return next;
    }
    async function redrawLayout() {
      const current = state.offset + state.focused;
      const previous = {columns: state.columns, visible: state.visible, buffer: state.buffer};
      const next = setLayoutDimensions();
      if (previous.columns === next.columns && previous.visible === next.columns * next.rows && previous.buffer === next.buffer) return;
      if (state.items.length) renderGrid();
      if (!state.collectionId) return;
      await loadWindow(Math.floor(current / state.visible) * state.visible);
      setFocus(current - state.offset);
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
      if (elements.session) elements.session.textContent = state.session?.ended_at ? 'Start sitting' : 'End sitting';
      elements.selectionSummary.textContent = (state.expression ? state.expression : 'All items') + ' · ' + state.total.toLocaleString() + ' selected · ' + state.selectionBacklog.toLocaleString() + ' untriaged';
      elements.exportScope.options[0].textContent = 'Current collection (' + state.collectionTotal.toLocaleString() + ')';
      elements.exportScope.options[1].textContent = 'Current selection (' + state.total.toLocaleString() + ')';
      elements.exportFile.disabled = !state.collectionId;
      elements.eraseCollection.disabled = !state.collectionId || !state.collectionTotal;
      elements.previousPage.disabled = state.loading || state.offset <= 0;
      elements.nextPage.disabled = state.loading || !state.total || state.offset + state.visible >= state.total;
      if (elements.capturePassOne) elements.capturePassOne.disabled = state.loading || state.captureInProgress || !state.captures;
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
    function verdictText(verdict) { return ({keeper: 'Keep', junk: 'Junk', archive: 'Archive', 'needs-more-time': 'Needs-time'})[verdict] || 'Untriaged'; }
    function addText(parent, tagName, className, text) {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      element.textContent = text;
      parent.append(element);
      return element;
    }
    function cancelTagPopoverHide() {
      clearTimeout(state.tagPopoverTimer);
      state.tagPopoverTimer = null;
    }
    function hideTagPopover(delay = 180) {
      cancelTagPopoverHide();
      const close = () => {
        if (state.tagPopoverSelecting) return;
        elements.tagPopover.hidden = true;
        state.tagPopoverAnchor = null;
      };
      if (delay) state.tagPopoverTimer = setTimeout(close, delay);
      else close();
    }
    function showTagPopover(anchor, allTags) {
      cancelTagPopoverHide();
      state.tagPopoverAnchor = anchor;
      elements.tagPopover.textContent = allTags.length ? 'All tags:\\n' + allTags.join('\\n') : 'No tags';
      elements.tagPopover.hidden = false;
      requestAnimationFrame(() => {
        if (elements.tagPopover.hidden || state.tagPopoverAnchor !== anchor) return;
        const margin = 8;
        const anchorRect = anchor.getBoundingClientRect();
        const popoverRect = elements.tagPopover.getBoundingClientRect();
        const left = Math.max(margin, Math.min(anchorRect.left, innerWidth - popoverRect.width - margin));
        let top = anchorRect.top - popoverRect.height - 6;
        if (top < margin) top = Math.min(innerHeight - popoverRect.height - margin, anchorRect.bottom + 6);
        elements.tagPopover.style.left = left + 'px';
        elements.tagPopover.style.top = Math.max(margin, top) + 'px';
      });
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
      for (const value of allTags.slice(0, 3)) {
        const tag = addText(tags, 'span', 'tag', value);
        tag.tabIndex = 0;
        tag.setAttribute('aria-label', value + '. All tags: ' + allTags.join(', '));
        tag.addEventListener('pointerenter', () => showTagPopover(tag, allTags));
        tag.addEventListener('pointerleave', () => hideTagPopover());
        tag.addEventListener('focus', () => showTagPopover(tag, allTags));
        tag.addEventListener('blur', () => hideTagPopover());
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
      hideTagPopover(0);
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
      const requestId = ++state.windowRequest;
      const collectionId = state.collectionId;
      state.loading = true;
      try {
        const path = '/api/selection?limit=' + (state.visible + state.buffer) + '&offset=' + Math.max(0, offset) + '&expression=' + encodeURIComponent(state.expression);
        const data = await api(path);
        if (requestId !== state.windowRequest || collectionId !== state.collectionId) return;
        state.collectionTotal = data.collection_total; state.total = data.total; state.backlog = data.collection_backlog; state.selectionBacklog = data.backlog; state.captures = data.captures; state.offset = Math.max(0, Math.min(offset, Math.max(0, data.total - 1)));
        state.items = data.items; state.focused = 0; renderGrid();
        if (state.collectionTotal) { elements.importer.open = false; await startSession(); elements.grid.focus({preventScroll: true}); }
      } finally {
        if (requestId === state.windowRequest) { state.loading = false; updateProgress(); }
      }
    }

    async function openExpression(expression) {
      state.expression = String(expression || '').trim();
      elements.expression.value = state.expression;
      state.offset = 0; state.focused = 0; clearMarks();
      await loadWindow(0);
      if (state.expression) {
        await api('/api/selection-history', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({expression: state.expression})});
        const history = await api('/api/selection-history');
        state.history = history.selections;
        fillHistorySelect();
      }
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

    function fillProposalSelect(rows) {
      elements.proposals.replaceChildren(new Option('Automatic proposals', ''));
      for (const kind of ['src', 'tag', 'verdict', 'error', 'folder', 'site', 'image', 'title']) {
        const matches = rows.filter(row => row.kind === kind);
        if (!matches.length) continue;
        const group = document.createElement('optgroup');
        group.label = kind === 'error' ? 'errors' : kind;
        for (const row of matches) group.append(new Option(
          row.name + ' (' + row.count.toLocaleString() + ')', row.id,
        ));
        elements.proposals.append(group);
      }
    }

    function fillHistorySelect() {
      elements.previousSelections.replaceChildren(new Option('Previous selections', ''));
      for (const row of state.history) elements.previousSelections.append(new Option(row.expression, row.expression));
    }

    function updateSelectionActionStates() {
      for (const [select, button] of [
        [elements.proposals, elements.openProposal],
        [elements.savedSelections, elements.openSaved],
        [elements.previousSelections, elements.openPrevious],
      ]) button.dataset.selectionReady = String(Boolean(select.value));
    }

    function updateImportFileLabel() {
      const file = elements.bookmarkFile.files?.[0];
      elements.importDropCopy.textContent = file ? file.name + ' ready to import' : 'HTML or Sorter JSON';
    }

    function useDroppedImportFile(file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      elements.bookmarkFile.files = transfer.files;
      updateImportFileLabel();
    }

    function currentCollection() {
      return state.collections.find(collection => collection.id === state.collectionId) || null;
    }

    function setCollectionEditing(mode = '') {
      const collection = currentCollection();
      const open = mode === 'new' || (mode === 'rename' && collection);
      state.collectionEditing = open ? mode : '';
      elements.renameForm.hidden = !open;
      elements.renameCollection.hidden = open;
      elements.newCollection.hidden = open;
      elements.collectionSelect.disabled = open;
      if (open) {
        elements.collectionName.value = mode === 'rename' ? collection.name : '';
        elements.collectionName.placeholder = mode === 'new' ? 'New collection name' : '';
        elements.collectionName.focus();
        if (mode === 'rename') elements.collectionName.select();
      } else {
        elements.collectionName.value = '';
        elements.collectionName.placeholder = '';
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
      elements.copyTemplate.disabled = !state.templates.length;
      elements.renameCollection.disabled = !collection;
      setCollectionEditing();
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
      state.sittingReport = null;
      if (elements.sittingReport) {
        elements.sittingReport.hidden = true;
        elements.showSitting.textContent = 'Show sitting';
        elements.showSitting.setAttribute('aria-expanded', 'false');
      }
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
      state.sittingReport = null;
      state.expression = '';
      clearMarks();
      await Promise.all([loadWindow(0), loadSelectionTools()]);
      return result;
    }

    async function loadSelectionTools() {
      const requestId = ++state.selectionToolsRequest;
      const collectionId = state.collectionId;
      const [saved, proposals, history] = await Promise.all([api('/api/selections'), api('/api/proposals'), api('/api/selection-history')]);
      if (requestId !== state.selectionToolsRequest || collectionId !== state.collectionId) return;
      state.saved = saved.selections; state.proposals = proposals.proposals; state.history = history.selections;
      fillSelect(elements.savedSelections, state.saved, 'Saved selections');
      fillProposalSelect(state.proposals);
      fillHistorySelect();
      updateSelectionActionStates();
    }

    async function saveCurrentSelection() {
      const name = elements.selectionName.value.trim();
      const saved = await api('/api/selections', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name, expression: state.expression})});
      elements.status.textContent = 'Saved selection “' + saved.name + '”.';
      elements.selectionName.value = '';
      await loadSelectionTools();
      elements.savedSelections.value = saved.id;
      updateSelectionActionStates();
    }

    async function changeTagsOnCurrentSelection() {
      await startSession();
      const tags = elements.tagInput.value.split(/[\\s,]+/).filter(Boolean);
      const mode = elements.tagMode.value === 'remove' ? 'remove' : 'apply';
      const body = {session_id: state.session.id, tags, expression: state.expression, mode};
      if (state.marked.size) body.item_ids = [...state.marked];
      const data = await api('/api/tag', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
      const verb = mode === 'remove' ? 'Removed tags from ' : 'Added tags to ';
      elements.status.textContent = verb + data.changes.length.toLocaleString() + ' item' + (data.changes.length === 1 ? '' : 's') + ' as one action.';
      elements.tagInput.value = ''; updateTagActionState(); clearMarks(); await loadWindow(state.offset); await loadSelectionTools();
    }

    function updateTagActionState() {
      const ready = Boolean(elements.tagInput.value.trim());
      elements.tagSelection.dataset.tagReady = String(ready);
      elements.tagModePicker.dataset.tagReady = String(ready);
    }

    function updateTagMode() {
      const removing = elements.tagMode.value === 'remove';
      elements.tagSelection.textContent = removing ? 'Untag items' : 'Tag items';
      elements.tagSelection.title = removing
        ? 'Remove the entered tags from marked items or the current selection'
        : 'Add the entered tags to marked items or the current selection';
      elements.tagInput.setAttribute('aria-label', removing ? 'Tags to remove' : 'Tags to add');
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

    async function sweepEntireSelection(confirmed = false) {
      await startSession();
      const response = await fetch('/api/selection/verdict', {method: 'POST', headers: {'content-type': 'application/json', 'x-bookmark-collection-id': state.collectionId}, body: JSON.stringify({
        session_id: state.session.id, expression: state.expression, verdict: elements.sweepVerdict.value, visible: false, confirmed,
      })});
      const data = await response.json();
      if (response.status === 409 && data.confirmation_required) {
        if (confirm('Apply ' + verdictText(elements.sweepVerdict.value) + ' to all ' + data.count.toLocaleString() + ' items in the current selection?')) return sweepEntireSelection(true);
        elements.status.textContent = 'Entire-selection action cancelled.'; return;
      }
      if (!response.ok) throw new Error(data.error || 'Request failed');
      patchChanges(data.changes); state.session = data.session; state.backlog = data.backlog;
      elements.status.textContent = 'Applied the verdict to all ' + data.changes.length.toLocaleString() + ' item' + (data.changes.length === 1 ? '' : 's') + ' in the current selection.';
      await refreshSelectionCounts();
    }

    function updateSweepMode() {
      const allSelected = elements.sweepMode.value === 'selection';
      elements.sweepRest.textContent = allSelected ? 'Sweep all selected' : 'Sweep untriaged';
      elements.sweepRest.title = allSelected
        ? 'Apply the chosen verdict to every item in the current selection'
        : 'Apply the chosen verdict to untriaged items on this page';
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
      if (data.kind === 'tag-apply' || data.kind === 'tag-remove') await loadWindow(state.offset);
      else { patchChanges(data.changes); await refreshSelectionCounts(); }
    }
    async function toggleSession() {
      if (!state.collectionTotal) return;
      if (!state.session || state.session.ended_at) { state.session = null; await startSession(); elements.status.textContent = 'New sitting started.'; }
      else { state.session = await api('/api/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'finish', session_id: state.session.id})}); elements.status.textContent = 'Sitting saved: ' + state.session.items_judged.toLocaleString() + ' judged.'; }
      if (elements.sittingReport && !elements.sittingReport.hidden) await loadSitting();
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
      state.captureInProgress = true;
      updateProgress();
      let processed = 0;
      try {
        for (const retry of [false, true]) {
          while (true) {
            elements.status.textContent = 'Capturing metadata… ' + processed.toLocaleString() + (retry ? ' checked or retried.' : ' checked.');
            const data = await api('/api/captures/pass-one?limit=20' + (retry ? '&retry=1' : ''), {method: 'POST'});
            state.captures = data.status;
            processed += data.processed;
            updateProgress();
            if (!data.processed) break;
          }
        }
        const coverage = state.captures.metadata_coverage === null ? '—' : (state.captures.metadata_coverage * 100).toFixed(1) + '%';
        const duplicates = state.captures.duplicate_distribution.filter(count => count > 1);
        elements.status.textContent = 'Metadata capture caught up after ' + processed.toLocaleString() + ' check' + (processed === 1 ? '' : 's')
          + '. Coverage: ' + state.captures.distinguishable_metadata.toLocaleString() + '/' + state.captures.total.toLocaleString() + ' (' + coverage + ')'
          + '; duplicate image groups: ' + (duplicates.length ? duplicates.join(', ') : 'none') + '.';
        await loadWindow(state.offset);
      } catch (error) { elements.status.textContent = error.message; }
      finally { state.captureInProgress = false; updateProgress(); }
    }
    function renderAuthorizedUsers(users) {
      elements.authorizedUsers.replaceChildren(...users.map(user => {
        const item = document.createElement('li');
        item.textContent = user.email + ' — ' + user.type;
        return item;
      }));
      if (!users.length) addText(elements.authorizedUsers, 'li', '', 'No authorized users.');
      elements.authorizedUsers.hidden = false;
    }
    async function loadAuthorizedUsers() {
      const data = await api('/api/authorized-users');
      renderAuthorizedUsers(data.users);
      return data.users;
    }
    function sittingElapsed(session) {
      if (!session) return 0;
      return session.ended_at
        ? Number(session.elapsed_ms || 0)
        : Math.max(0, Date.now() - new Date(session.started_at).valueOf());
    }
    function sittingDuration(milliseconds) {
      const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainder = seconds % 60;
      return (hours ? hours + ':' + String(minutes).padStart(2, '0') : String(minutes)) + ':' + String(remainder).padStart(2, '0');
    }
    function renderSitting(report) {
      state.sittingReport = report;
      elements.sittingSummary.replaceChildren();
      elements.sittingActions.replaceChildren();
      if (!report.session) {
        addText(elements.sittingSummary, 'dt', '', 'Sitting');
        addText(elements.sittingSummary, 'dd', '', 'No sitting has been saved for this collection.');
        elements.exportSitting.disabled = true;
        return;
      }
      const session = report.session;
      const activeActions = report.actions.filter(action => !action.undone_at);
      const fields = [
        ['Status', session.ended_at ? 'Ended' : 'In progress'],
        ['Started', new Date(session.started_at).toLocaleString()],
        ['Ended', session.ended_at ? new Date(session.ended_at).toLocaleString() : '—'],
        ['Elapsed', sittingDuration(sittingElapsed(session))],
        ['Items judged', Number(session.items_judged || 0).toLocaleString()],
        ['Actions', activeActions.length.toLocaleString() + (activeActions.length === report.actions.length ? '' : ' active; ' + report.actions.length.toLocaleString() + ' recorded')],
      ];
      for (const [label, value] of fields) {
        addText(elements.sittingSummary, 'dt', '', label);
        addText(elements.sittingSummary, 'dd', '', value);
      }
      for (const action of report.actions) {
        const changes = Array.isArray(action.payload?.changes) ? action.payload.changes.length : 0;
        const kind = action.action_kind === 'tag-apply'
          ? 'Tagged ' + changes.toLocaleString()
          : action.action_kind === 'tag-remove'
            ? 'Untagged ' + changes.toLocaleString()
            : verdictText(action.payload?.verdict) + ' for ' + changes.toLocaleString();
        addText(elements.sittingActions, 'li', '', new Date(action.created_at).toLocaleString() + ' — ' + kind + (action.undone_at ? ' (undone)' : ''));
      }
      if (!report.actions.length) addText(elements.sittingActions, 'li', '', 'No actions recorded yet.');
      elements.exportSitting.disabled = false;
    }
    async function loadSitting() {
      const report = await api('/api/session');
      if (report.session && !report.session.ended_at) state.session = report.session;
      renderSitting(report);
      updateProgress();
      return report;
    }
    function exportSitting() {
      if (!state.sittingReport?.session) return;
      const collection = currentCollection();
      const payload = {
        format: 'bookmark-sorter/sitting-v1',
        exported_at: new Date().toISOString(),
        collection: collection ? {id: collection.id, name: collection.name} : {id: state.collectionId},
        ...state.sittingReport,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2) + '\\n'], {type: 'application/json'});
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href; link.download = 'bookmark-sorter-sitting.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 0);
      elements.status.textContent = 'Exported the displayed sitting data.';
    }
    function collectionExportFilename(name) {
      const part = String(name || 'collection').normalize('NFKC').trim()
        .replace(/[^\\p{L}\\p{N}._-]+/gu, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100) || 'collection';
      return 'bookmark-sorter-' + part + '.json';
    }
    elements.form.addEventListener('submit', async event => {
      event.preventDefault(); const button = elements.form.querySelector('button'); button.disabled = true; elements.status.textContent = 'Importing…'; elements.importStatus.classList.remove('error'); elements.importStatus.textContent = 'Importing…';
      try {
        const data = await api('/api/import', {method: 'POST', body: new FormData(elements.form)});
        elements.status.textContent = 'Imported ' + data.added.toLocaleString() + ' new; merged ' + data.merged.toLocaleString() + '.';
        elements.importStatus.textContent = elements.status.textContent;
        await loadCollections(state.collectionId);
        await Promise.all([loadWindow(0), loadSelectionTools()]);
      } catch (error) { elements.status.textContent = error.message; elements.importStatus.classList.add('error'); elements.importStatus.textContent = 'Import failed: ' + error.message; } finally { button.disabled = false; }
    });
    elements.bookmarkFile.addEventListener('change', updateImportFileLabel);
    elements.importDropZone.addEventListener('click', () => elements.bookmarkFile.click());
    elements.importDropZone.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); elements.bookmarkFile.click();
    });
    for (const eventName of ['dragenter', 'dragover']) elements.importDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      elements.importDropZone.dataset.dragActive = 'true';
    });
    elements.importDropZone.addEventListener('dragleave', event => {
      if (!elements.importDropZone.contains(event.relatedTarget)) delete elements.importDropZone.dataset.dragActive;
    });
    elements.importDropZone.addEventListener('drop', event => {
      event.preventDefault(); delete elements.importDropZone.dataset.dragActive;
      const file = event.dataTransfer?.files?.[0];
      if (file) useDroppedImportFile(file);
    });
    elements.exportForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!state.collectionId) return;
      const selectionOnly = elements.exportScope.value === 'selection';
      const exportUrl = new URL('/api/export', location.origin);
      exportUrl.searchParams.set('collection_id', state.collectionId);
      if (selectionOnly && state.expression) exportUrl.searchParams.set('expression', state.expression);
      const link = document.createElement('a');
      link.href = exportUrl.href; link.download = collectionExportFilename(currentCollection()?.name);
      document.body.append(link); link.click(); link.remove();
      const count = selectionOnly ? state.total : state.collectionTotal;
      elements.status.textContent = 'Exporting ' + count.toLocaleString() + ' bookmark' + (count === 1 ? '' : 's') + ' from the current ' + (selectionOnly ? 'selection' : 'collection') + '.';
    });
    elements.eraseCollection.addEventListener('click', () => {
      const collection = currentCollection();
      if (!collection || !confirm('Erase all ' + state.collectionTotal.toLocaleString() + ' bookmarks in “' + collection.name + '”? This keeps the collection but cannot be undone.')) return;
      collectionAction('erase', {collection_id: collection.id})
        .then(result => { elements.status.textContent = 'Erased ' + result.erased_items.toLocaleString() + ' bookmarks from “' + collection.name + '”.'; })
        .catch(error => { elements.status.textContent = error.message; });
    });
    elements.collectionSelect.addEventListener('change', () => openCollection(elements.collectionSelect.value).catch(error => { elements.status.textContent = error.message; }));
    elements.templateSelect.addEventListener('change', () => { elements.copyTemplate.disabled = !elements.templateSelect.value; });
    elements.copyTemplate.addEventListener('click', () => {
      const templateId = elements.templateSelect.value || state.templates[0]?.id;
      if (!templateId) return;
      collectionAction('copy-template', {template_id: templateId}).then(() => { elements.status.textContent = 'Private demo copy created.'; }).catch(error => { elements.status.textContent = error.message; });
    });
    elements.freshCopy.addEventListener('click', () => collectionAction('fresh-copy', {collection_id: state.collectionId}).then(() => { elements.status.textContent = 'Fresh private copy created; the earlier copy is unchanged.'; }).catch(error => { elements.status.textContent = error.message; }));
    elements.renameCollection.addEventListener('click', () => setCollectionEditing('rename'));
    elements.newCollection.addEventListener('click', () => setCollectionEditing('new'));
    elements.renameForm.addEventListener('submit', event => {
      event.preventDefault();
      const collection = currentCollection();
      const mode = state.collectionEditing;
      const name = elements.collectionName.value.trim();
      if (mode === 'rename' && !collection) return setCollectionEditing();
      if (!name) { elements.status.textContent = 'Collection name is required.'; elements.collectionName.focus(); return; }
      if (mode === 'rename' && name === collection.name) { elements.status.textContent = 'Collection name unchanged.'; setCollectionEditing(); return; }
      const button = elements.renameForm.querySelector('button[type="submit"]');
      button.disabled = true;
      const action = mode === 'new' ? 'create' : 'rename';
      const payload = mode === 'new' ? {name} : {collection_id: collection.id, name};
      collectionAction(action, payload)
        .then(() => { elements.status.textContent = mode === 'new' ? 'Empty collection created.' : 'Collection renamed.'; (mode === 'new' ? elements.newCollection : elements.renameCollection).focus(); })
        .catch(error => { elements.status.textContent = error.message; elements.collectionName.focus(); })
        .finally(() => { button.disabled = false; });
    });
    elements.cancelRename.addEventListener('click', () => { const mode = state.collectionEditing; setCollectionEditing(); (mode === 'new' ? elements.newCollection : elements.renameCollection).focus(); });
    elements.collectionName.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); const mode = state.collectionEditing; setCollectionEditing(); (mode === 'new' ? elements.newCollection : elements.renameCollection).focus(); }
    });
    elements.deleteCopy.addEventListener('click', () => {
      const collection = currentCollection();
      if (collection && confirm('Delete “' + collection.name + '”? Its shared captures will remain available to other collections.')) collectionAction('delete-copy', {collection_id: collection.id}).then(() => { elements.status.textContent = 'Demo copy deleted; shared captures were kept.'; }).catch(error => { elements.status.textContent = error.message; });
    });
    elements.createTemplateForm?.addEventListener('submit', event => {
      event.preventDefault();
      const name = elements.createTemplateName.value.trim();
      if (!name) return;
      const button = elements.createTemplateForm.querySelector('button');
      button.disabled = true;
      collectionAction('create-template', {name})
        .then(() => { elements.createTemplateForm.reset(); elements.status.textContent = 'Demo template “' + name + '” created and selected.'; })
        .catch(error => { elements.status.textContent = error.message; elements.createTemplateName.focus(); })
        .finally(() => { button.disabled = false; });
    });
    elements.openSelection.addEventListener('click', () => openExpression(elements.expression.value).catch(error => { elements.status.textContent = error.message; }));
    elements.expression.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); elements.openSelection.click(); } });
    elements.saveSelection.addEventListener('click', () => saveCurrentSelection().catch(error => { elements.status.textContent = error.message; }));
    elements.openSaved.addEventListener('click', () => {
      const selected = state.saved.find(row => row.id === elements.savedSelections.value);
      if (selected) openExpression(selected.expression).catch(error => { elements.status.textContent = error.message; });
    });
    elements.openPrevious.addEventListener('click', () => {
      if (elements.previousSelections.value) openExpression(elements.previousSelections.value).catch(error => { elements.status.textContent = error.message; });
    });
    elements.openProposal.addEventListener('click', () => {
      const selected = state.proposals.find(row => row.id === elements.proposals.value);
      if (selected) openExpression(selected.expression).catch(error => { elements.status.textContent = error.message; });
    });
    for (const select of [elements.proposals, elements.savedSelections, elements.previousSelections]) select.addEventListener('change', updateSelectionActionStates);
    elements.tagInput.addEventListener('input', updateTagActionState);
    elements.tagSelection.addEventListener('click', () => changeTagsOnCurrentSelection().catch(error => { elements.status.textContent = error.message; }));
    elements.tagMode.addEventListener('change', updateTagMode);
    elements.sweepMode.addEventListener('change', updateSweepMode);
    elements.sweepRest.addEventListener('click', () => {
      const action = elements.sweepMode.value === 'selection' ? sweepEntireSelection : sweepCurrentPage;
      action().catch(error => { elements.status.textContent = error.message; });
    });
    elements.previousPage.addEventListener('click', () => pageWindow(-1).catch(error => { elements.status.textContent = error.message; }));
    elements.nextPage.addEventListener('click', () => pageWindow(1).catch(error => { elements.status.textContent = error.message; }));
    elements.pageLayout.addEventListener('change', () => {
      redrawLayout().then(() => {
        const selected = pageLayouts[elements.pageLayout.value] || pageLayouts['2x8'];
        elements.status.textContent = 'Showing ' + selected.rows + ' rows × ' + selected.columns + ' columns (' + (selected.rows * selected.columns) + ' bookmarks per page).';
      }).catch(error => { elements.status.textContent = error.message; });
    });
    function setHelp(open) {
      elements.helpPanel.hidden = !open;
      elements.helpToggle.setAttribute('aria-expanded', String(open));
      (open ? elements.helpClose : elements.helpToggle).focus();
    }
    elements.helpToggle.addEventListener('click', () => setHelp(elements.helpPanel.hidden));
    elements.helpClose.addEventListener('click', () => setHelp(false));
    elements.tagPopover.addEventListener('pointerenter', cancelTagPopoverHide);
    elements.tagPopover.addEventListener('pointerleave', () => hideTagPopover());
    elements.tagPopover.addEventListener('pointerdown', () => { state.tagPopoverSelecting = true; cancelTagPopoverHide(); });
    document.addEventListener('pointerup', () => {
      if (!state.tagPopoverSelecting) return;
      state.tagPopoverSelecting = false;
      if (!elements.tagPopover.matches(':hover') && !state.tagPopoverAnchor?.matches(':hover, :focus')) hideTagPopover();
    });
    document.querySelectorAll('[data-verdict]').forEach(button => button.addEventListener('click', () => applyVerdict(button.dataset.verdict).catch(error => { elements.status.textContent = error.message; })));
    elements.undo.addEventListener('click', () => undo().catch(error => { elements.status.textContent = error.message; }));
    elements.session?.addEventListener('click', () => toggleSession().catch(error => { elements.status.textContent = error.message; }));
    elements.showSitting?.addEventListener('click', () => {
      if (!elements.sittingReport.hidden) {
        elements.sittingReport.hidden = true;
        elements.showSitting.textContent = 'Show sitting';
        elements.showSitting.setAttribute('aria-expanded', 'false');
        return;
      }
      loadSitting().then(() => {
        elements.sittingReport.hidden = false;
        elements.showSitting.textContent = 'Hide sitting';
        elements.showSitting.setAttribute('aria-expanded', 'true');
        positionAdminMenu();
      }).catch(error => { elements.status.textContent = error.message; });
    });
    elements.exportSitting?.addEventListener('click', exportSitting);
    elements.capturePassOne?.addEventListener('click', () => capturePassOne());
    elements.captureGaps?.addEventListener('click', () => captureGaps());
    elements.displayUsers?.addEventListener('click', () => loadAuthorizedUsers().catch(error => { elements.status.textContent = error.message; }));
    elements.addUserForm?.addEventListener('submit', event => {
      event.preventDefault();
      api('/api/authorized-users', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'add', email: elements.addUserEmail.value, type: elements.addUserType.value})})
        .then(async data => { elements.addUserForm.reset(); await loadAuthorizedUsers(); elements.status.textContent = 'Added ' + data.user.email + ' as ' + data.user.type + '.'; })
        .catch(error => { elements.status.textContent = error.message; });
    });
    elements.removeUserForm?.addEventListener('submit', event => {
      event.preventDefault();
      api('/api/authorized-users', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'remove', email: elements.removeUserEmail.value, type: 'user'})})
        .then(async data => { elements.removeUserForm.reset(); await loadAuthorizedUsers(); elements.status.textContent = 'Removed ' + data.user.email + '.'; })
        .catch(error => { elements.status.textContent = error.message; });
    });
    for (const panel of [elements.importer, elements.selector, elements.exporter]) {
      panel.addEventListener('toggle', () => {
        if (!panel.open) return;
        for (const other of [elements.importer, elements.selector, elements.exporter]) if (other !== panel) other.open = false;
      });
    }
    function positionAdminMenu() {
      if (!elements.adminMenu?.open) return;
      const summary = elements.adminMenu.querySelector('summary');
      const panel = elements.adminMenu.querySelector('.admin-menu-content');
      const summaryBottom = Math.ceil(summary.getBoundingClientRect().bottom);
      panel.style.top = (summaryBottom + 6) + 'px';
      panel.style.maxHeight = Math.max(120, innerHeight - summaryBottom - 18) + 'px';
    }
    elements.adminMenu?.addEventListener('toggle', positionAdminMenu);
    addEventListener('resize', positionAdminMenu);
    updateSweepMode();
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
        redrawLayout().catch(error => { elements.status.textContent = error.message; });
      }, 120);
    });
    setLayoutDimensions();
    setInterval(updateProgress, 500); window.__pileState = state;
    loadCollections().then(() => Promise.all([loadWindow(0), loadSelectionTools()])).catch(error => { elements.status.textContent = error.message; });
  </script>
</body>
</html>`;
}
