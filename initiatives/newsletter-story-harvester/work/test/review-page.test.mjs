import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, test} from 'node:test';
import {chromium} from '@playwright/test';

import {reviewPageHtml} from '../src/review-page.mjs';

const fixturePath = new URL('../fixtures/store-fixture.json', import.meta.url).pathname;
const store = JSON.parse(readFileSync(fixturePath, 'utf8'));
const output = join(mkdtempSync(join(tmpdir(), 'newsletter-review-')), 'review.html');
writeFileSync(output, reviewPageHtml(store), 'utf8');

let browser;
before(async () => { browser = await chromium.launch({headless: true}); });
after(async () => { await browser.close(); });

async function openPage() {
  const page = await browser.newPage();
  const externalRequests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  await page.goto(`file://${output}`);
  return {page, externalRequests};
}

test('the generated file is self-contained and has no store write path', () => {
  const html = reviewPageHtml(store);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/i);
  assert.doesNotMatch(html, /\bfetch\s*\(|XMLHttpRequest|showSaveFilePicker|writeFile/i);
  assert.match(html, /The store is never written by this page/);
});

test('it opens offline with the complete fixture and always-visible backlog', async () => {
  const {page, externalRequests} = await openPage();
  assert.equal(await page.locator('.story').count(), 74);
  await assert.doesNotReject(() => page.locator('#backlog').waitFor({state: 'visible'}));
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  assert.deepEqual(externalRequests, []);
  await page.close();
});

test('collapsed metadata expands to text and a safe link', async () => {
  const {page} = await openPage();
  const first = page.locator('.story').first();
  assert.equal(await first.getAttribute('open'), null);
  await first.locator('summary').click();
  await assert.doesNotReject(() => first.locator('.story-text').waitFor({state: 'visible'}));
  assert.ok((await first.locator('.title').textContent()).length > 0);
  await page.close();
});

test('source sort and tag filter change the visible set', async () => {
  const {page} = await openPage();
  await page.locator('#sort').selectOption('source');
  const sources = await page.locator('.story').evaluateAll(nodes => nodes.map(node => node.dataset.source));
  assert.deepEqual(sources, [...sources].sort());
  await page.locator('#filter').selectOption('theme:energy-notes');
  const tags = await page.locator('.story').evaluateAll(nodes => nodes.map(node => JSON.parse(node.dataset.tags)));
  assert.ok(tags.length > 0 && tags.every(values => values.includes('theme:energy-notes')));
  await page.close();
});

test('verdict-rest touches only visible unjudged stories and undo restores the sweep', async () => {
  const {page} = await openPage();
  await page.locator('#filter').selectOption('theme:energy-notes');
  const visibleUnjudged = await page.locator('.story[data-verdict=""]').count();
  await page.locator('#sweep-verdict').selectOption('kept');
  await page.locator('#verdict-rest').click();
  assert.equal(await page.locator('#backlog').textContent(), `${73 - visibleUnjudged} unjudged of 74`);
  assert.equal(await page.locator('.story[data-verdict=""]').count(), 0);
  await page.locator('#filter').selectOption('');
  assert.equal(await page.locator('.story[data-verdict=""]').count(), 73 - visibleUnjudged);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  await page.close();
});

test('an individual verdict changes backlog and one undo reverses it', async () => {
  const {page} = await openPage();
  const unjudged = page.locator('.story[data-verdict=""]').first();
  await unjudged.locator('summary').click();
  await unjudged.locator('button[data-verdict="emphasised"]').click();
  assert.equal(await page.locator('#backlog').textContent(), '72 unjudged of 74');
  await page.locator('#undo').click();
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  await page.close();
});

test('an unrecognised verdict displays and round-trips in the export', async () => {
  const {page} = await openPage();
  const unknown = page.locator('.story[data-verdict="to-be-shared"]');
  assert.equal(await unknown.count(), 1);
  assert.equal(await unknown.locator('.verdict').textContent(), 'to-be-shared');
  const exported = await page.evaluate(() => window.reviewPage.getExport());
  assert.ok(exported.verdicts.some(entry => entry.verdict === 'to-be-shared'));
  assert.equal(exported.store_id, 'fixture-store-v1');
  await page.close();
});

test('the export button downloads the verdict-file shape', async () => {
  const {page} = await openPage();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let text = '';
  for await (const chunk of stream) text += chunk;
  const exported = JSON.parse(text);
  assert.deepEqual(Object.keys(exported), ['store_id', 'exported_at', 'verdicts', 'tags']);
  assert.equal(exported.store_id, 'fixture-store-v1');
  await page.close();
});
