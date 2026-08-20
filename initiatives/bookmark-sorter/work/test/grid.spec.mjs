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
    session: null,
    actions: [],
    requests: [],
  };
  await page.route('https://pile.test/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    backend.requests.push({method: request.method(), path: url.pathname});
    if (request.method() === 'GET' && url.pathname === '/') {
      return route.fulfill({contentType: 'text/html', body: renderPilePage()});
    }
    if (request.method() === 'GET' && url.pathname === '/api/collections') {
      return route.fulfill({json: {
        active_collection_id: 'pile', can_edit_templates: false,
        collections: [{id: 'pile', name: 'My bookmarks', kind: 'personal', item_count: backend.items.length}],
        templates: [{id: 'starter', name: 'Starter pile', kind: 'demo-template', item_count: 12}],
      }});
    }
    if (request.method() === 'GET' && (url.pathname === '/api/items' || url.pathname === '/api/selection')) {
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 200);
      const backlog = backend.items.filter(item => !item.verdict).length;
      return route.fulfill({json: {collection_id: 'pile', collection_total: backend.items.length, collection_backlog: backlog, total: backend.items.length, backlog, captures: {total: backend.items.length, metadata_images: 3334, screenshot_images: 0, gaps: 6666, queued: 6666, duplicate_distribution: [12, 7, 4]}, items: backend.items.slice(offset, offset + limit)}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/selections') {
      return route.fulfill({json: {selections: []}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/proposals') {
      return route.fulfill({json: {proposals: []}});
    }
    const body = request.postDataJSON();
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
  await expectLayout(page, {width: 820, height: 1100, visible: 9, cards: 12, columns: 3, rows: 3});
  await expectLayout(page, {width: 390, height: 844, visible: 1, cards: 3, columns: 1, rows: 1});
  await expect.poll(() => page.locator('#grid').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(600);
  await expect.poll(() => page.locator('.footer-line').evaluate(element => element.getBoundingClientRect().bottom)).toBeGreaterThan(820);
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
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-panel')).toBeHidden();

  await expect(page.locator('[data-item-id="item-1"] .tag').first()).toHaveAttribute('title', 'All tags:\nfolder:Reading/topic-0\nsrc:browser-export');
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
