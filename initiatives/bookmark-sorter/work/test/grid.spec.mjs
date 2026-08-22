import {expect, test} from '@playwright/test';

import {renderPilePage} from '../src/pile-page.mjs';

function sampleItems(count = 10_000) {
  return Array.from({length: count}, (_, index) => ({
    id: `item-${index + 1}`,
    url: `https://example${index % 37}.com/read/${index + 1}`,
    title: `Bookmark ${index + 1}: a useful article with enough title context`,
    note: index % 3 ? null : 'A short saved note that remains readable in the blind review grid.',
    tags: [`folder:Reading/topic-${index % 12}`, 'src:browser-export'],
    verdict: null,
    verdict_at: null,
    capture: index % 3 ? {state: 'pass1-gap', image_ref: null} : {state: 'pass1-ready', image_ref: `capture-${index}`},
    capture_url: index % 3 ? null : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XIVz0gAAAABJRU5ErkJggg==',
  }));
}

async function installPile(page) {
  const backend = {
    items: sampleItems(),
    collection: {id: 'pile', name: 'My bookmarks', kind: 'personal'},
    collections: [],
    session: null,
    actions: [],
    requests: [],
    proposalRevision: 0,
    selectionDelays: new Map(),
  };
  backend.collections.push(backend.collection);
  await page.route('https://pile.test/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const requestCollectionId = request.headers()['x-bookmark-collection-id'] || '';
    backend.requests.push({method: request.method(), path: url.pathname, collectionId: requestCollectionId});
    if (request.method() === 'GET' && url.pathname === '/') {
      return route.fulfill({contentType: 'text/html', body: renderPilePage()});
    }
    if (request.method() === 'GET' && url.pathname === '/api/collections') {
      return route.fulfill({json: {
        active_collection_id: 'pile', can_edit_templates: false,
        collections: backend.collections.map(collection => ({
          ...collection, item_count: collection.id === 'pile' ? backend.items.length : 0,
        })),
        templates: [{id: 'starter', name: 'Starter pile', kind: 'demo-template', item_count: 12}],
      }});
    }
    if (request.method() === 'GET' && (url.pathname === '/api/items' || url.pathname === '/api/selection')) {
      const collectionId = request.headers()['x-bookmark-collection-id'] || 'pile';
      const selectionDelay = backend.selectionDelays.get(collectionId) || 0;
      if (selectionDelay) await new Promise(resolve => setTimeout(resolve, selectionDelay));
      const collectionItems = collectionId === 'pile' ? backend.items : [];
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 200);
      const backlog = collectionItems.filter(item => !item.verdict).length;
      return route.fulfill({json: {collection_id: collectionId, collection_total: collectionItems.length, collection_backlog: backlog, total: collectionItems.length, backlog, captures: {total: collectionItems.length, metadata_images: collectionId === 'pile' ? 3334 : 0, screenshot_images: 0, gaps: collectionId === 'pile' ? 6666 : 0, queued: collectionId === 'pile' ? 6666 : 0, duplicate_distribution: collectionId === 'pile' ? [12, 7, 4] : []}, items: collectionItems.slice(offset, offset + limit)}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/selections') {
      return route.fulfill({json: {selections: []}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/proposals') {
      const source = requestCollectionId === 'other' ? 'other-source' : 'browser-export';
      return route.fulfill({json: {proposals: [
        {id: `src:${source}`, kind: 'src', name: source, expression: `src:${source}`, count: backend.proposalRevision + 1},
        {id: 'tag:topic:later', kind: 'tag', name: 'topic:later', expression: 'tag-key:topic%3Alater', count: 2},
        {id: 'folder:Reading/topic-0', kind: 'folder', name: 'Reading/topic-0', expression: 'folder-key:Reading%2Ftopic-0', count: 834},
        {id: 'site:example0.com', kind: 'site', name: 'example0.com', expression: 'site:example0.com', count: 271},
        {id: 'image:none', kind: 'image', name: 'none', expression: 'image:none', count: 6666},
        {id: 'verdict:archive', kind: 'verdict', name: 'archive', expression: 'verdict:archive', count: 0},
        {id: 'verdict:junk', kind: 'verdict', name: 'junk', expression: 'verdict:junk', count: 0},
        {id: 'verdict:keep', kind: 'verdict', name: 'keep', expression: 'verdict:keep', count: 0},
        {id: 'verdict:needs-time', kind: 'verdict', name: 'needs-time', expression: 'verdict:needs-time', count: 0},
        {id: 'verdict:untriaged', kind: 'verdict', name: 'untriaged', expression: 'verdict:untriaged', count: 10_000},
      ]}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/import') {
      backend.proposalRevision += 1;
      return route.fulfill({status: 201, json: {parsed: 1, added: 1, merged: 0, total: 1}});
    }
    const body = request.postDataJSON();
    if (request.method() === 'POST' && url.pathname === '/api/collections' && body.action === 'rename') {
      backend.collection = {...backend.collection, name: body.name.trim()};
      backend.collections[0] = backend.collection;
      return route.fulfill({json: {collection: {...backend.collection, item_count: backend.items.length}}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/collections' && body.action === 'create') {
      const collection = {id: 'collection-new', name: body.name.trim(), kind: 'private'};
      backend.collections.push(collection);
      return route.fulfill({status: 201, json: {collection: {...collection, item_count: 0}}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/session') {
      if (body.action === 'start') {
        backend.session = {
          id: 'session-1', collection_id: 'pile', started_at: new Date(Date.now() - 60_000).toISOString(),
          ended_at: null, items_judged: 0, elapsed_ms: null,
        };
        return route.fulfill({status: 201, json: backend.session});
      }
      backend.session = {...backend.session, ended_at: new Date().toISOString(), elapsed_ms: 60_000};
      return route.fulfill({json: backend.session});
    }
    if (request.method() === 'POST' && url.pathname === '/api/verdict') {
      const changes = [];
      for (const id of body.item_ids) {
        const item = backend.items.find(candidate => candidate.id === id);
        if (item && item.verdict !== body.verdict) {
          changes.push({item_id: id, verdict: item.verdict, verdict_at: item.verdict_at});
          Object.assign(item, {verdict: body.verdict, verdict_at: new Date().toISOString()});
        }
      }
      backend.actions.push(changes);
      backend.session.items_judged += changes.length;
      return route.fulfill({json: {
        changes: changes.map(change => ({item_id: change.item_id, verdict: body.verdict, verdict_at: new Date().toISOString()})),
        backlog: backend.items.filter(item => !item.verdict).length,
        session: backend.session,
      }});
    }
    if (request.method() === 'POST' && url.pathname === '/api/undo') {
      const changes = backend.actions.pop() || [];
      for (const change of changes) Object.assign(backend.items.find(item => item.id === change.item_id), {verdict: change.verdict, verdict_at: change.verdict_at});
      backend.session.items_judged = Math.max(0, backend.session.items_judged - changes.length);
      return route.fulfill({json: {changes, backlog: backend.items.filter(item => !item.verdict).length, session: backend.session}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/captures/gaps') {
      return route.fulfill({json: {enabled: false, processed: 0, status: {total: backend.items.length, metadata_images: 3334, screenshot_images: 0, gaps: 6666, queued: 6666, duplicate_distribution: [12, 7, 4]}}});
    }
    return route.fulfill({status: 404, json: {error: 'Not found'}});
  });
  return backend;
}

async function expectLayout(page, {width, height, visible, cards, columns, rows}) {
  await page.setViewportSize({width, height});
  await expect.poll(() => page.evaluate(() => ({
    visible: window.__pileState.visible,
    cards: document.querySelectorAll('.bookmark-card').length,
    shown: document.querySelectorAll('.bookmark-card:not([hidden])').length,
    columns: getComputedStyle(document.querySelector('#grid')).gridTemplateColumns.split(' ').length,
    rows: getComputedStyle(document.querySelector('#grid')).gridTemplateRows.split(' ').length,
  }))).toEqual({visible, cards, shown: visible, columns, rows});
}

test('10,000 items keep a bounded DOM at each responsive layout', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('#count')).toHaveText('10,000');

  await expectLayout(page, {width: 1600, height: 900, visible: 16, cards: 24, columns: 8, rows: 2});
  await expectLayout(page, {width: 1000, height: 900, visible: 12, cards: 16, columns: 4, rows: 3});
  await expect(page.getByLabel('Page layout')).toBeDisabled();
  await expectLayout(page, {width: 820, height: 1100, visible: 9, cards: 12, columns: 3, rows: 3});
  await expectLayout(page, {width: 390, height: 844, visible: 1, cards: 3, columns: 1, rows: 1});
  await expect.poll(() => page.locator('#grid').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(550);
  await expect.poll(() => page.locator('.footer-line').evaluate(element => element.getBoundingClientRect().bottom)).toBeGreaterThan(820);
});

test('page layout dropdown redraws the wide grid immediately', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');

  const picker = page.getByLabel('Page layout');
  await expect(picker).toBeEnabled();
  await expect(picker).toHaveValue('2x8');
  await expectLayout(page, {width: 1600, height: 900, visible: 16, cards: 24, columns: 8, rows: 2});

  for (const expected of [
    {value: '3x3', visible: 9, cards: 12, columns: 3, rows: 3},
    {value: '2x6', visible: 12, cards: 18, columns: 6, rows: 2},
    {value: '3x12', visible: 36, cards: 48, columns: 12, rows: 3},
    {value: '2x8', visible: 16, cards: 24, columns: 8, rows: 2},
  ]) {
    await picker.selectOption(expected.value);
    await expectLayout(page, {width: 1600, height: 900, ...expected});
  }
  await expect(page.locator('#status')).toHaveText('Showing 2 rows × 8 columns (16 bookmarks per page).');
});

test('keyboard verdicts, marked groups, atomic undo, and sitting rate work without navigation', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  let navigations = 0;
  page.on('request', request => { if (request.isNavigationRequest()) navigations += 1; });
  await page.goto('https://pile.test/');
  await expect(page.locator('#grid')).toBeFocused();
  const originalCard = await page.locator('[data-item-id="item-1"]').elementHandle();

  await page.keyboard.press('k');
  await expect(page.locator('#backlog')).toHaveText('9,999');
  await expect(page.locator('[data-item-id="item-1"]')).toHaveAttribute('data-verdict', 'keeper');
  expect(await originalCard.evaluate(card => card.isConnected)).toBe(true);
  await expect(page.locator('[data-item-id="item-2"]')).toHaveClass(/focused/);

  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#mark-count')).toHaveText('2 marked');
  await page.keyboard.press('j');
  await expect(page.locator('#backlog')).toHaveText('9,997');
  await expect(page.locator('#mark-count')).toHaveText('0 marked');
  await expect(page.locator('[data-item-id="item-2"]')).toHaveAttribute('data-verdict', 'junk');
  await expect(page.locator('[data-item-id="item-3"]')).toHaveAttribute('data-verdict', 'junk');

  await page.keyboard.press('u');
  await expect(page.locator('#status')).toHaveText('Undid the last action as one step.');
  await expect(page.locator('#backlog')).toHaveText('9,999');
  await expect(page.locator('[data-item-id="item-2"]')).toHaveAttribute('data-verdict', '');
  await expect(page.locator('[data-item-id="item-3"]')).toHaveAttribute('data-verdict', '');
  await expect.poll(() => page.locator('#rate').textContent()).not.toBe('—');

  expect(backend.actions).toHaveLength(1);
  expect(backend.session.items_judged).toBe(1);
  expect(navigations).toBe(1);
  expect(page.url()).toBe('https://pile.test/');
});

test('stored captures render locally while the capture-gap control stays disabled', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('.capture img')).toHaveCount(8);
  expect(backend.requests.some(request => request.path.startsWith('/read/'))).toBe(false);
  expect(backend.requests.filter(request => request.path === '/api/captures/gaps')).toHaveLength(0);
  await expect(page.locator('#capture-gaps')).toBeDisabled();
  expect(backend.requests.filter(request => request.path === '/api/captures/gaps')).toHaveLength(0);
});

test('bookmark titles link out and the copy control copies the saved URL', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: async value => { window.__copiedBookmarkUrl = value; }},
    });
  });
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');

  const firstCard = page.locator('[data-item-id="item-1"]');
  const titleLink = firstCard.locator('h2 a');
  await expect(titleLink).toHaveAttribute('href', 'https://example0.com/read/1');
  await expect(titleLink).toHaveAttribute('target', '_blank');
  await expect(titleLink).toHaveAttribute('rel', 'noopener noreferrer');

  await firstCard.locator('.copy-url').click();
  await expect(page.locator('#status')).toHaveText('Copied URL for Bookmark 1: a useful article with enough title context.');
  await expect.poll(() => page.evaluate(() => window.__copiedBookmarkUrl)).toBe('https://example0.com/read/1');
});

test('help explains controls and selection syntax, and tags expose their complete list', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');

  await page.locator('#help-toggle').click();
  await expect(page.locator('#help-panel')).toBeVisible();
  await expect(page.locator('#help-panel')).toContainText('Sweep untriaged');
  await expect(page.locator('#help-panel')).toContainText('site:example.com');
  await expect(page.locator('#help-panel')).toContainText('title:court-drama*');
  await expect(page.locator('#help-panel')).toContainText('src:safari');
  await expect(page.locator('#help-panel')).toContainText('folder:Favorites*');
  await expect(page.locator('#help-panel')).toContainText('in:2026-08-19');
  await expect(page.locator('#help-panel')).toContainText('can be used as a suffix to match any trailing characters');
  await expect(page.locator('#help-panel')).toContainText('exact folder names');
  await expect(page.locator('#help-panel')).toContainText('verdict:untriaged');
  await expect(page.locator('#help-panel')).toContainText('image:present');
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-panel')).toBeHidden();

  const firstTag = page.locator('[data-item-id="item-1"] .tag').first();
  await firstTag.hover();
  const popover = page.locator('#tag-popover');
  await expect(popover).toBeVisible();
  await expect(popover).toHaveText('All tags:\nfolder:Reading/topic-0\nsrc:browser-export');
  await popover.hover();
  await page.waitForTimeout(250);
  await expect(popover).toBeVisible();
  await expect.poll(() => popover.evaluate(element => getComputedStyle(element).userSelect)).toBe('text');
  await expect.poll(() => popover.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(12);
  const selected = await popover.evaluate(element => {
    const selection = getSelection();
    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.addRange(range);
    return selection.toString();
  });
  expect(selected).toContain('src:browser-export');
});

test('collection rename uses an inline form and supports save or keyboard cancel', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await page.getByRole('button', {name: 'Rename'}).click();
  await expect(page.locator('#rename-form')).toBeVisible();
  await expect(page.getByLabel('Collection name')).toHaveValue('My bookmarks');
  await expect(page.getByLabel('Collection name')).toBeFocused();
  await page.getByLabel('Collection name').press('Escape');
  await expect(page.locator('#rename-form')).toBeHidden();
  await expect(page.getByRole('button', {name: 'Rename'})).toBeFocused();

  await page.getByRole('button', {name: 'Rename'}).click();
  await page.getByLabel('Collection name').fill('Reviewed bookmarks');
  await page.getByLabel('Collection name').press('Enter');
  await expect(page.locator('#status')).toHaveText('Collection renamed.');
  await expect(page.locator('#rename-form')).toBeHidden();
  await expect(page.getByLabel('Current collection')).toContainText('Reviewed bookmarks');
  await expect(page.getByRole('button', {name: 'Rename'})).toBeFocused();
  expect(backend.collection.name).toBe('Reviewed bookmarks');
});

test('New creates a named empty collection without a browser prompt', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await page.getByRole('button', {name: 'New'}).click();
  await expect(page.locator('#rename-form')).toBeVisible();
  await expect(page.getByLabel('Collection name')).toHaveValue('');
  await page.getByLabel('Collection name').fill('Research queue');
  await page.getByLabel('Collection name').press('Enter');

  await expect(page.locator('#status')).toHaveText('Empty collection created.');
  await expect(page.getByLabel('Current collection')).toHaveValue('collection-new');
  await expect(page.locator('#count')).toHaveText('0');
  expect(backend.collections.at(-1)).toEqual({id: 'collection-new', name: 'Research queue', kind: 'private'});
});

test('Automatic proposals are grouped in the requested order without Same labels', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('#proposals optgroup')).toHaveCount(6);
  const labels = await page.locator('#proposals optgroup').evaluateAll(groups => groups.map(group => group.label));
  expect(labels).toEqual(['src', 'tag', 'folder', 'site', 'image', 'verdict']);
  await expect(page.locator('#proposals optgroup[label="verdict"] option')).toHaveCount(5);
  const verdictLabels = await page.locator('#proposals optgroup[label="verdict"] option').allTextContents();
  expect(verdictLabels).toEqual(['archive (0)', 'junk (0)', 'keep (0)', 'needs-time (0)', 'untriaged (10,000)']);
  await expect(page.locator('#proposals')).not.toContainText('Same ');
});

test('Automatic proposals refresh after choosing a collection and completing an import', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  backend.collections.push({id: 'other', name: 'Other collection', kind: 'private'});
  await page.goto('https://pile.test/');
  await expect(page.locator('#proposals option[value="src:browser-export"]')).toHaveText('browser-export (1)');

  await page.getByLabel('Current collection').selectOption('other');
  await expect(page.locator('#proposals option[value="src:other-source"]')).toHaveText('other-source (1)');
  expect(backend.requests.filter(request => request.path === '/api/proposals').at(-1).collectionId).toBe('other');

  await page.locator('#importer summary').click();
  await page.locator('#bookmark-file').setInputFiles({
    name: 'bookmarks.html', mimeType: 'text/html', buffer: Buffer.from('<!doctype html><title>Bookmarks</title>'),
  });
  await page.getByRole('button', {name: 'Import file'}).click();
  await expect(page.locator('#status')).toHaveText('Imported 1 new; merged 0.');
  await expect(page.locator('#proposals option[value="src:other-source"]')).toHaveText('other-source (2)');

  await page.getByLabel('Current collection').selectOption('pile');
  await expect(page.locator('#count')).toHaveText('10,000');
  backend.selectionDelays.set('other', 400);
  await page.getByLabel('Current collection').selectOption('other');
  await page.getByLabel('Current collection').selectOption('pile');
  await page.waitForTimeout(600);
  await expect(page.getByLabel('Current collection')).toHaveValue('pile');
  await expect(page.locator('#count')).toHaveText('10,000');
  await expect(page.locator('[data-item-id="item-1"]')).toContainText('src:browser-export');
});

test('Export downloads either the collection or the current selection as importable JSON', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await page.locator('#exporter summary').click();
  await expect(page.locator('#export-scope option').first()).toHaveText('Current collection (10,000)');
  await page.getByLabel('Selection expression').fill('site:example0.com');
  await page.getByRole('button', {name: 'Open selection'}).click();
  await page.getByLabel('Export scope').selectOption('selection');
  const selectionDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export file'}).click();
  const selectionFile = await selectionDownload;
  expect(selectionFile.suggestedFilename()).toBe('bookmark-sorter-export.json');
  const selectionUrl = new URL(selectionFile.url());
  expect(selectionUrl.pathname).toBe('/api/export');
  expect(selectionUrl.searchParams.get('collection_id')).toBe('pile');
  expect(selectionUrl.searchParams.get('expression')).toBe('site:example0.com');
  await expect(page.locator('#status')).toContainText('current selection');

  await page.getByLabel('Export scope').selectOption('collection');
  const collectionDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export file'}).click();
  const collectionFile = await collectionDownload;
  expect(collectionFile.suggestedFilename()).toBe('bookmark-sorter-export.json');
  const collectionUrl = new URL(collectionFile.url());
  expect(collectionUrl.pathname).toBe('/api/export');
  expect(collectionUrl.searchParams.get('collection_id')).toBe('pile');
  expect(collectionUrl.searchParams.has('expression')).toBe(false);
  await expect(page.locator('#status')).toContainText('current collection');
  await expect(page.locator('#bookmark-file')).toHaveAttribute('accept', /\.json/);
});

test('sweep changes only visible untriaged cards, advances, and paging is read-only', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  backend.items[0].verdict = 'keeper';
  await page.goto('https://pile.test/');

  await page.locator('#sweep-rest').click();
  await expect(page.locator('#position')).toContainText('17–32 of 10,000');
  expect(backend.items[0].verdict).toBe('keeper');
  expect(backend.items.slice(1, 16).every(item => item.verdict === 'junk')).toBe(true);
  expect(backend.items[16].verdict).toBe(null);
  const judgedAfterSweep = backend.items.filter(item => item.verdict).length;

  await page.locator('#previous-page').click();
  await expect(page.locator('#position')).toContainText('1–16 of 10,000');
  await page.locator('#next-page').click();
  await expect(page.locator('#position')).toContainText('17–32 of 10,000');
  expect(backend.items.filter(item => item.verdict).length).toBe(judgedAfterSweep);
});
