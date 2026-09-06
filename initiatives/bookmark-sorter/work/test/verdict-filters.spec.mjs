import {expect, test} from '@playwright/test';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {createPileApp} from '../src/worker.mjs';

async function installApp(page) {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'pile', name: 'My bookmarks', kind: 'personal'});
  store.createCollection({id: 'other', name: 'Other collection', kind: 'private'});
  for (const [index, verdict] of ['keeper', 'needs-more-time', 'junk', 'archive', null].entries()) {
    const item = store.insertItem({
      id: `item-${index}`, collection_id: 'pile', url: `https://example.test/${index}`,
      url_key: `https://example.test/${index}`, title: 'Shared title', verdict,
      ingested_at: '2026-09-06T00:00:00Z', note: null, added_at: null, verdict_at: null,
    });
    store.addTags(item.id, ['src:sample', 'folder:Reading', index % 2 ? 'topic:beta' : 'topic:alpha', ...(index === 2 ? ['junk-only', 'err:404'] : [])]);
  }
  const app = createPileApp({
    storeFactory: () => store,
    identityFromRequest: () => ({id: 'test-user', email: 'krnovak@gmail.com'}),
    personalCollectionIdFactory: () => 'pile',
  });
  const delayed = {hold: null};
  await page.route('https://filters.test/**', async route => {
    const request = route.request();
    const response = await app.fetch(new Request(request.url(), {
      method: request.method(), headers: request.headers(), body: request.postDataBuffer() || undefined,
    }));
    if (delayed.hold) await delayed.hold(new URL(request.url()));
    await route.fulfill({status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer())});
  });
  await page.goto('https://filters.test/');
  await expect(page.locator('#count')).toHaveText('5');
  await page.locator('#selector > summary').click();
  return {store, delayed};
}

const checkbox = (page, value) => page.locator(`#verdict-filters input[value="${value}"]`);
const selected = (page, count) => expect(page.locator('#selection-summary')).toContainText(`· ${count} selected ·`);

test('verdict filters scope typed, proposed, saved, and recent selections and their tag/export actions', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const {store} = await installApp(page);
  await expect(page.locator('#verdict-filters input:checked')).toHaveCount(5);
  await selected(page, 5);
  await page.getByLabel('Selection expression').fill('topic:alpha or topic:beta');
  await page.getByRole('button', {name: 'Open selection', exact: true}).click();
  await expect(page.locator('#previous-selections')).toContainText('topic:alpha or topic:beta');
  await page.locator('[data-item-id="item-2"] .mark').click();
  for (const value of ['junk', 'archive', 'untriaged']) await checkbox(page, value).uncheck();
  await selected(page, 2);
  await expect(page.locator('#mark-count')).toHaveText('0 marked');
  await expect(checkbox(page, 'untriaged')).toBeFocused();
  await expect(page.getByLabel('Selection expression')).toHaveValue('topic:alpha or topic:beta');
  await expect(page.locator('#selection-summary')).toContainText('(verdict:keep or verdict:needs-time) and (topic:alpha or topic:beta)');
  await expect(page.locator('#proposals option[value="src:sample"]')).toHaveText('sample (2)');
  await expect(page.locator('#proposals option[value="tag:junk-only"]')).toHaveCount(0);
  await expect(page.locator('#proposals optgroup[label="errors"]')).toHaveCount(0);

  await page.getByLabel('Tags to add').fill('filtered');
  await page.getByRole('button', {name: 'Tag items', exact: true}).click();
  await expect(page.locator('#status')).toContainText('2');
  expect(store.listAllItems('pile').filter(item => item.tags.includes('filtered')).map(item => item.id)).toEqual(['item-0', 'item-1']);
  await page.getByLabel('Saved selection name').fill('Keep or later');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => store.listSelections('pile').length).toBe(1);
  expect(store.listSelections('pile')[0].expression).toBe('(verdict:keep or verdict:needs-time) and (topic:alpha or topic:beta)');

  await page.getByLabel('Automatic proposals').selectOption('tag:topic:alpha');
  await page.getByRole('button', {name: 'Open proposal', exact: true}).click();
  await selected(page, 1);
  await expect(page.getByLabel('Selection expression')).toHaveValue('topic:alpha');
  await expect(page.locator('#previous-selections')).toContainText('(verdict:keep or verdict:needs-time) and (topic:alpha)');
  await checkbox(page, 'keep').uncheck();
  await selected(page, 0);
  await expect(page.locator('#proposals option[value="tag:topic:alpha"]')).toHaveCount(0);
  await expect(page.getByLabel('Automatic proposals')).toHaveValue('');
  await expect(page.locator('#proposals option[value="site:example.test"]')).toHaveText('example.test (1)');
  await page.getByLabel('Saved selections').selectOption(store.listSelections('pile')[0].id);
  await page.getByRole('button', {name: 'Open saved', exact: true}).click();
  await selected(page, 1);
  await page.getByLabel('Previous selections').selectOption('topic:alpha or topic:beta');
  await page.getByRole('button', {name: 'Open previous', exact: true}).click();
  await selected(page, 1);

  await page.locator('#exporter > summary').click();
  await page.getByLabel('Export scope').selectOption('selection');
  const exportDownload = page.waitForEvent('download');
  await page.locator('#export-file').click();
  const expression = new URL((await exportDownload).url()).searchParams.get('expression');
  expect(expression).toBe('(verdict:needs-time) and (topic:alpha or topic:beta)');

  await page.getByLabel('Current collection').selectOption('other');
  await selected(page, 0);
  await page.getByLabel('Current collection').selectOption('pile');
  await selected(page, 1);
  await page.locator('#selector > summary').click();
  await expect(page.getByLabel('Selection expression')).toHaveValue('');
  await checkbox(page, 'needs-time').uncheck();
  await selected(page, 0);
  await expect(page.locator('#proposals option')).toHaveCount(1);
  for (const value of ['keep', 'junk', 'archive', 'needs-time', 'untriaged']) await checkbox(page, value).check();
  await selected(page, 5);
  await expect(page.locator('#selection-summary')).toContainText('All items');
});

test('rapid checkbox changes ignore older grid and proposal responses', async ({page}) => {
  const {delayed} = await installApp(page);
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const held = [];
  delayed.hold = async url => {
    if (['/api/proposals', '/api/selection'].includes(url.pathname) && url.searchParams.get('expression')?.includes('verdict:keep')) {
      held.push(url.pathname);
      await barrier;
    }
  };
  await checkbox(page, 'junk').uncheck();
  await expect.poll(() => held.length).toBe(2);
  await checkbox(page, 'keep').uncheck();
  await selected(page, 3);
  await expect(page.locator('#proposals option[value="src:sample"]')).toHaveText('sample (3)');
  const oldResponses = Promise.all(held.map(path => page.waitForResponse(response => new URL(response.url()).pathname === path)));
  release();
  await oldResponses;
  await expect(page.locator('#proposals option[value="src:sample"]')).toHaveText('sample (3)');
  await selected(page, 3);
  await expect(page.locator('[data-item-id="item-0"]')).toHaveCount(0);
});

test('verdict checkboxes remain visible and keyboard-operable on a narrow phone', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await installApp(page);
  for (const value of ['keep', 'junk', 'archive', 'needs-time', 'untriaged']) {
    const box = checkbox(page, value);
    await expect(box).toBeInViewport();
    await box.focus();
    await page.keyboard.press('Space');
    await expect(box).not.toBeChecked();
  }
  await selected(page, 0);
  await expect(page.locator('#proposals option')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#verdict-filters input:checked')).toHaveCount(5);
  await selected(page, 5);
});
