import {expect, test} from '@playwright/test';
import {D1BookmarkStore} from '../src/d1-store.mjs';
import {createPileApp} from '../src/worker.mjs';
import {sqliteStoreDatabase} from './sqlite-d1.mjs';

async function install(page) {
  const {database, d1} = await sqliteStoreDatabase();
  const store = new D1BookmarkStore(d1, {ownerId: 'tester', ownerEmail: 'krnovak@gmail.com'});
  await store.ensurePersonalCollection({id: 'pile'});
  await store.ensureCollection({id: 'other', name: 'Other', kind: 'private'});
  for (let n = 0; n < 90; n++) database.prepare(`INSERT INTO items
    (id, collection_id, url, url_key, title, ingested_at) VALUES (?, 'pile', ?, ?, ?, '2026-09-07')`)
    .run(`item-${String(n).padStart(3, '0')}`, `https://example.test/${n}`, `https://example.test/${n}`, `Bookmark ${n}`);
  const app = createPileApp({storeFactory: () => store, identityFromRequest: () => ({id: 'tester', email: 'krnovak@gmail.com'}),
    personalCollectionIdFactory: () => 'pile', captureFactory: () => null});
  const controls = {requests: [], completed: [], before: null, after: null, database};
  await page.route('https://pagination.test/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const record = {url, method: request.method()};
    controls.requests.push(record);
    if (controls.before && await controls.before(route, record)) return;
    const response = await app.fetch(new Request(request.url(), {method: request.method(), headers: request.headers(),
      body: request.postDataBuffer() || undefined}));
    if (controls.after) await controls.after(record);
    await route.fulfill({status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer())});
    controls.completed.push(record);
  });
  await page.setViewportSize({width: 1800, height: 1000});
  await page.goto('https://pagination.test/');
  await expect(page.locator('#count')).toHaveText('90');
  await page.locator('#page-layout').selectOption('3x12');
  await expect(page.locator('.bookmark-card:visible')).toHaveCount(36);
  await expect.poll(() => controls.completed.some(row => row.url.searchParams.get('after')?.includes('item-035'))).toBe(true);
  return controls;
}

const first = page => page.locator('.bookmark-card:visible').first();
const prefetchAfter = (controls, id) => expect.poll(() => controls.completed.some(row => row.url.searchParams.get('after')?.includes(id))).toBe(true);

test('3x12 sweep consumes the prefetched page without a duplicate page/count request', async ({page}) => {
  const controls = await install(page);
  const start = controls.requests.length;
  await page.locator('#sweep-rest').click();
  await expect(first(page)).toHaveAttribute('data-item-id', 'item-036');
  await expect(page.locator('#backlog')).toHaveText('54');
  const during = controls.requests.slice(start);
  expect(during.filter(row => row.url.pathname === '/api/verdict')).toHaveLength(1);
  expect(during.filter(row => row.url.searchParams.get('after')?.includes('item-035'))).toHaveLength(0);
  expect(during.filter(row => row.url.searchParams.has('counts_only') || row.url.searchParams.get('limit') === '1')).toHaveLength(0);
  await prefetchAfter(controls, 'item-071');
  expect(controls.requests.filter(row => row.url.searchParams.get('after')?.includes('item-071'))).toHaveLength(1);
  await page.close(); controls.database.close();
});

test('untriaged sweeps cover all 90 items exactly once, including the last partial page and Undo', async ({page}) => {
  const controls = await install(page);
  await page.locator('#selector > summary').click();
  await page.getByLabel('Selection expression').fill('verdict:untriaged');
  await page.getByRole('button', {name: 'Open selection', exact: true}).click();
  await expect(page.locator('#selection-summary')).toContainText('verdict:untriaged');
  for (const [id, remaining] of [['item-036', 54], ['item-072', 18]]) {
    await page.locator('#sweep-rest').click();
    await expect(first(page)).toHaveAttribute('data-item-id', id);
    await expect(page.locator('#selection-summary')).toContainText(`${remaining} selected`);
    await expect(page.locator('#position')).toContainText('1–');
  }
  await page.locator('#sweep-rest').click();
  await expect(page.locator('.bookmark-card')).toHaveCount(0);
  await expect(page.locator('#backlog')).toHaveText('0');
  const counts = controls.database.prepare('SELECT json_array_length(json_extract(payload_json, \'$.changes\')) AS count FROM triage_actions ORDER BY created_at, id').all();
  expect(counts.map(row => row.count).sort((a, b) => a - b)).toEqual([18, 36, 36]);
  await page.locator('#grid').focus();
  await page.keyboard.press('u');
  await expect(page.locator('#backlog')).toHaveText('18');
  await expect(page.locator('.bookmark-card:visible')).toHaveCount(18);
  await page.close(); controls.database.close();
});

test('a failed sweep keeps the current page, prevents duplicate submissions, and recovers on retry', async ({page}) => {
  const controls = await install(page);
  let release, arrived;
  const held = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { arrived = resolve; });
  controls.before = async (route, row) => {
    if (row.url.pathname !== '/api/verdict') return false;
    arrived(); await held;
    await route.fulfill({status: 500, json: {error: 'Temporary test failure'}}); return true;
  };
  await page.locator('#sweep-rest').click(); await ready;
  await expect(page.locator('#sweep-rest')).toBeDisabled();
  await expect(first(page)).toHaveAttribute('data-item-id', 'item-000');
  release();
  await expect(page.locator('#status')).toContainText('Temporary test failure');
  await expect(page.locator('#sweep-rest')).toBeEnabled();
  expect(controls.database.prepare('SELECT COUNT(*) AS count FROM items WHERE verdict IS NOT NULL').get().count).toBe(0);
  controls.before = null;
  await page.locator('#sweep-rest').click();
  await expect(first(page)).toHaveAttribute('data-item-id', 'item-036');
  await page.close(); controls.database.close();
});

test('a delayed prefetch cannot replace a different collection or filter', async ({page}) => {
  const controls = await install(page);
  let release, arrived;
  const held = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { arrived = resolve; });
  controls.after = async row => {
    if (!row.url.searchParams.get('after')?.includes('item-071')) return;
    arrived(); await held;
  };
  await page.locator('#next-page').click(); await ready;
  await page.getByLabel('Current collection').selectOption('other');
  await expect(page.locator('#count')).toHaveText('0');
  release();
  await expect(page.locator('.bookmark-card')).toHaveCount(0);
  controls.after = null;
  await page.getByLabel('Current collection').selectOption('pile');
  await expect(first(page)).toHaveAttribute('data-item-id', 'item-000');
  await page.close(); controls.database.close();
});
