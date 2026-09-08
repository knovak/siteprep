import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const url = new URL('../dist/index.html', import.meta.url).href;
const sample = {format:'bookmark-sorter/v1', items:Array.from({length:40}, (_,i) => ({url:`https://example.org/bookmark/${i}`,title:`${i%2 ? 'Ocean' : 'Art'} reference ${i}`,tags:[i%2 ? 'topic:ocean' : 'topic:art'],added_at:'2026-09-07T12:00:00Z'}))};

async function boot(page, context) {
  const requests = [], errors = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => route.abort());
  await context.setOffline(true);
  await page.goto(url);
  await expect(page.locator('#local-state')).toContainText('SQLite / WASM');
  await expect(page.locator('#collection-select')).toHaveValue('personal');
  return {requests, errors};
}
async function importFile(page, data = sample) {
  await page.locator('#importer > summary').click();
  await page.locator('#bookmark-file').setInputFiles({name:'sample.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.locator('#import-form button[type=submit]').click();
  await expect(page.locator('#import-status')).toContainText('40');
  if (await page.locator('#importer').getAttribute('open') !== null) await page.locator('#importer > summary').click();
  await expect(page.locator('.bookmark-card:visible')).toHaveCount(16);
}

test('direct file: import, page, verdict, undo, select, tag, JSON export and reload entirely offline', async ({page,context}) => {
  const {requests,errors} = await boot(page,context);
  await importFile(page);
  const first = await page.locator('.bookmark-card').first().getAttribute('data-item-id');
  await page.locator('#next-page').click();
  await expect(page.locator('.bookmark-card').first()).not.toHaveAttribute('data-item-id',first);
  await page.locator('#previous-page').click();
  await expect(page.locator('.bookmark-card').first()).toHaveAttribute('data-item-id',first);
  await page.locator('button[data-verdict=keeper]').click();
  await expect(page.locator('#status')).toContainText('applied');
  await page.locator('#undo').click();
  await expect(page.locator('#status')).toContainText('Undid');
  await page.locator('#selector > summary').click();
  await page.locator('#selection-expression').fill('topic:art');
  await page.locator('#open-selection').click();
  await expect.poll(() => page.evaluate(() => window.__pileState.total)).toBe(20);
  await page.locator('#tag-input').fill('reviewed');
  await page.locator('#tag-selection').click();
  await expect(page.locator('#status')).toContainText('20');
  await page.locator('#exporter > summary').click();
  await page.locator('#export-scope').selectOption('selection');
  const pending = page.waitForEvent('download');
  await page.locator('#export-form button[type=submit]').click();
  const download = await pending;
  const exported = JSON.parse(await readFile(await download.path(),'utf8'));
  expect(exported.items).toHaveLength(20);
  expect(exported.items.every(item => item.tags.includes('reviewed'))).toBe(true);
  await page.reload(); await expect(page.locator('#count')).toHaveText('40');
  const state = await page.evaluate(async () => {
    const result = await window.bookmarkLocalRequest('/api/selection?expression=reviewed');
    return result.json();
  });
  expect(state.total).toBe(20); expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('full backup and local picture survive restore; sample uses a separate collection', async ({page,context}) => {
  const {requests,errors} = await boot(page,context);
  await page.locator('#admin-menu > summary').click();
  await page.locator('#local-sample').click();
  await expect(page.locator('#count')).toHaveText('18');
  await page.locator('#admin-menu > summary').click();
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.local-picture').first().click();
  await (await chooser).setFiles({name:'picture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  await expect(page.locator('#status')).toHaveText('Picture saved on this device.');
  await expect(page.locator('.capture img')).toHaveCount(1);
  await page.locator('#admin-menu > summary').click();
  const pending = page.waitForEvent('download'); await page.locator('#local-backup').click();
  const path = await (await pending).path();
  await page.locator('#admin-menu > summary').click();
  await page.locator('#exporter > summary').click();
  page.once('dialog',dialog => dialog.accept()); await page.locator('#erase-collection').click();
  await expect(page.locator('#count')).toHaveText('0');
  await page.locator('#admin-menu > summary').click();
  page.once('dialog',dialog => dialog.accept());
  await page.locator('#local-restore').setInputFiles(path);
  await page.waitForLoadState();
  await expect(page.locator('#collection-select option')).toHaveCount(2);
  await page.locator('#collection-select').selectOption({label:'WASM sample bookmarks · 18'});
  await expect(page.locator('#count')).toHaveText('18');
  await expect(page.locator('.capture img')).toHaveCount(1);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('phone layout, HTML import and all-clear verdict filters', async ({page,context}) => {
  await page.setViewportSize({width:430,height:932});
  const {requests,errors} = await boot(page,context);
  await page.locator('#importer > summary').click();
  await page.locator('#bookmark-file').setInputFiles({name:'bookmarks.html',mimeType:'text/html',buffer:Buffer.from('<DL><DT><H3>Art</H3><DL><DT><A HREF="https://example.org/one">Art archive</A></DL></DL>')});
  await page.locator('#import-form button[type=submit]').click();
  await expect(page.locator('#count')).toHaveText('1');
  await page.locator('#importer > summary').click();
  await expect(page.locator('.bookmark-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#selector > summary').click();
  for (const checkbox of await page.locator('#verdict-filters input').all()) await checkbox.uncheck();
  await expect.poll(() => page.evaluate(() => window.__pileState.total)).toBe(0);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('legacy HTML imports every bookmark while non-web addresses stay inert after reload and JSON import', async ({page,context}) => {
  const {requests,errors} = await boot(page,context);
  await page.locator('#importer > summary').click();
  await page.locator('#bookmark-file').setInputFiles({name:'bookmarks 2010.html',mimeType:'text/html',buffer:await readFile(new URL('fixtures/legacy-bookmarks.html',import.meta.url))});
  await page.locator('#import-form button[type=submit]').click();
  await expect(page.locator('#import-status')).toHaveText('Imported 8 new; merged 0.');
  await expect(page.locator('#count')).toHaveText('8');
  await page.locator('#importer > summary').click();
  async function checkCards() {
    await expect(page.locator('.bookmark-card')).toHaveCount(8);
    await expect(page.locator('.bookmark-card h2 a')).toHaveCount(2);
    expect(await page.locator('.bookmark-card a').evaluateAll(links => links.every(link => /^https?:$/.test(new URL(link.href).protocol)))).toBe(true);
    for (const title of ['Saved bookmarklet','Local document','Email contact','Saved data URL','Browser folder','Browser page']) {
      const heading = page.getByRole('heading',{name:title,exact:true});
      await expect(heading).toBeVisible();
      await expect(heading.locator('a')).toHaveCount(0);
      await heading.click();
    }
    expect(await page.evaluate(() => window.__bookmarkExecuted)).toBeUndefined();
    expect(context.pages()).toHaveLength(1);
  }
  await checkCards();
  await page.reload();
  await expect(page.locator('#count')).toHaveText('8');
  await checkCards();
  await page.locator('#exporter > summary').click();
  const pending = page.waitForEvent('download');
  await page.locator('#export-form button[type=submit]').click();
  const path = await (await pending).path();
  const exported = JSON.parse(await readFile(path,'utf8'));
  expect(exported.items).toHaveLength(8);
  await page.locator('#importer > summary').click();
  await page.locator('#bookmark-file').setInputFiles({name:'round-trip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  await page.locator('#import-form button[type=submit]').click();
  await expect(page.locator('#import-status')).toHaveText('Imported 0 new; merged 8.');
  await page.locator('#importer > summary').click();
  await checkCards();
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('a second real browser tab cannot overwrite the first tab', async ({page,context}) => {
  await boot(page,context);
  const second = await context.newPage(); await second.goto(url);
  await expect(second.locator('#local-state')).toContainText('SQLite / WASM');
  await page.evaluate(async () => window.bookmarkLocalRequest('/api/collections',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'rename',collection_id:'personal',name:'First window'})}));
  const conflict = await second.evaluate(async () => (await window.bookmarkLocalRequest('/api/collections',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'rename',collection_id:'personal',name:'Second window'})})).json());
  expect(conflict.error).toContain('Another window');
  await second.reload(); await expect(second.locator('#collection-select')).toContainText('First window');
});

test('WASM disabled or storage denied produces a visible startup failure', async ({browser}) => {
  for (const disabled of ['WebAssembly','indexedDB']) {
    const context = await browser.newContext();
    await context.addInitScript(key => Object.defineProperty(window,key,{value:undefined}),disabled);
    const page = await context.newPage(); await page.goto(url);
    await expect(page.locator('#local-state')).toContainText('Could not open local bookmarks');
    expect(await page.evaluate(() => window.bookmarkRuntime)).toBeUndefined();
    await context.close();
  }
});
