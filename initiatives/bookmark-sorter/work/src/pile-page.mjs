export function renderPilePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bookmark pile</title>
  <style>
    :root { color-scheme: light; font: 16px/1.5 system-ui, sans-serif; background: #f4f6fb; color: #182033; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(960px, calc(100% - 32px)); margin: 32px auto 80px; }
    header { margin-bottom: 24px; }
    h1 { margin: 0; font-size: clamp(2rem, 7vw, 4rem); letter-spacing: -.04em; }
    header p { color: #596174; max-width: 62ch; }
    .panel, .item { background: white; border: 1px solid #dfe3ec; border-radius: 18px; box-shadow: 0 8px 26px #1d2a4410; }
    .panel { padding: 22px; margin-bottom: 20px; }
    form { display: grid; grid-template-columns: 1fr minmax(180px, .4fr) auto; gap: 12px; align-items: end; }
    label { display: grid; gap: 6px; font-weight: 650; }
    input, button { min-height: 44px; border-radius: 10px; border: 1px solid #b9c1d2; padding: 9px 12px; font: inherit; }
    button { border-color: #2046c8; background: #2046c8; color: white; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .55; cursor: wait; }
    .summary { display: flex; gap: 14px; align-items: baseline; }
    #count { font-size: 2rem; font-weight: 800; }
    #status { color: #596174; min-height: 1.5em; }
    #items { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .item { padding: 18px 20px; }
    .item h2 { margin: 0 0 4px; font-size: 1.05rem; }
    .item a { color: #2046c8; overflow-wrap: anywhere; }
    .note { margin: 10px 0 0; color: #454e61; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .tag { background: #edf1ff; color: #24449a; border-radius: 999px; padding: 3px 8px; font-size: .78rem; }
    @media (max-width: 720px) { form { grid-template-columns: 1fr; } main { margin-top: 20px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Your bookmark pile</h1>
      <p>Import a Netscape bookmark HTML export. This first surface shows that every item landed before visual triage begins.</p>
    </header>
    <section class="panel" aria-labelledby="import-title">
      <h2 id="import-title">Import bookmarks</h2>
      <form id="import-form">
        <label>Bookmark HTML<input id="bookmark-file" name="file" type="file" accept=".html,text/html" required></label>
        <label>Source tag<input id="source" name="source" value="browser-export" pattern="[a-z0-9][a-z0-9-]*" required></label>
        <button type="submit">Import file</button>
      </form>
      <p id="status" role="status" aria-live="polite"></p>
    </section>
    <section class="panel summary" aria-label="Pile summary"><span id="count">0</span><span>bookmarks landed</span></section>
    <ol id="items" aria-label="Imported bookmarks"></ol>
  </main>
  <script>
    const form = document.querySelector('#import-form');
    const button = form.querySelector('button');
    const status = document.querySelector('#status');
    const count = document.querySelector('#count');
    const list = document.querySelector('#items');

    function addText(parent, className, text) {
      const element = document.createElement('p');
      if (className) element.className = className;
      element.textContent = text;
      parent.append(element);
    }

    function renderItem(item) {
      const row = document.createElement('li');
      row.className = 'item';
      const title = document.createElement('h2');
      title.textContent = item.title;
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.url;
      link.rel = 'noreferrer';
      row.append(title, link);
      if (item.note) addText(row, 'note', item.note);
      const tags = document.createElement('div');
      tags.className = 'tags';
      for (const value of item.tags || []) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = value;
        tags.append(tag);
      }
      row.append(tags);
      return row;
    }

    async function loadItems() {
      const response = await fetch('/api/items?limit=200');
      if (!response.ok) throw new Error('Could not load the pile');
      const data = await response.json();
      count.textContent = data.total.toLocaleString();
      list.replaceChildren(...data.items.map(renderItem));
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      button.disabled = true;
      status.textContent = 'Importing…';
      try {
        const response = await fetch('/api/import', {method: 'POST', body: new FormData(form)});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Import failed');
        status.textContent = \`Imported \${data.added.toLocaleString()} new; merged \${data.merged.toLocaleString()}.\`;
        await loadItems();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    loadItems().catch(error => { status.textContent = error.message; });
  </script>
</body>
</html>`;
}
