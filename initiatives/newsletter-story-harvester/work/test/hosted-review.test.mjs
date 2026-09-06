import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {chromium, expect} from '@playwright/test';
import {createReviewWorker} from '../src/review-worker.mjs';
import {reviewPageHtml} from '../src/review-page.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/store-fixture.json', import.meta.url), 'utf8'));

test('hosted buttons, Undo, reloads, second browser, errors and conflicts use the database', async t => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_needy_virginia_dare.sql', import.meta.url), 'utf8'));
  const DB = {prepare(sql) { const stmt = sqlite.prepare(sql); return {bind(...values) {return {
    async run() {return stmt.run(...values);}, async first() {return stmt.get(...values) ?? null;},
  };}};}};
  const worker = createReviewWorker({seed: fixture, html: reviewPageHtml(fixture, {persistence: true})});
  const server = createServer(async (req, res) => {
    try {
      const buffers = []; for await (const chunk of req) buffers.push(chunk);
      const response = await worker.fetch(new Request('http://' + req.headers.host + req.url, {
        method: req.method, headers: {...req.headers, 'oai-authenticated-user-id': 'fixture-owner'},
        body: req.method === 'GET' ? undefined : Buffer.concat(buffers),
      }), {DB});
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) {res.writeHead(500); res.end(e.message);}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless: true});
  t.after(async () => {await browser.close(); await new Promise(resolve => server.close(resolve)); sqlite.close();});
  const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  const card = page.locator('.story[data-verdict=""]').first();
  const id = await card.getAttribute('data-id');
  const selected = page.locator('.story[data-id="' + id + '"]');
  assert.equal(await selected.getByRole('button', {name: 'Drop', exact: true}).count(), 1);
  await selected.getByRole('button', {name: 'Emphasize', exact: true}).click();
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  await expect(selected.locator('[data-verdict="emphasised"]')).toHaveAttribute('aria-pressed', 'true');
  assert.equal(await selected.locator('[aria-pressed="true"]').evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
  const stored = JSON.parse(sqlite.prepare('SELECT judgments FROM review_state').get().judgments);
  assert.equal(stored[id].verdict, 'emphasised');
  await page.locator('#undo').click();
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  await page.reload();
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  await expect(selected).toHaveAttribute('data-verdict', '');
  assert.ok((await page.evaluate(() => window.reviewPage.getExport())).verdicts.some(item => item.id === id && item.verdict === null && item.verdict_at));
  await selected.getByRole('button', {name: 'Keep', exact: true}).click();
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.locator('#save-status')).toHaveText('All judgments saved');
  const otherCard = other.locator('.story[data-id="' + id + '"]');
  await expect(otherCard.locator('[data-verdict="kept"]')).toHaveAttribute('aria-pressed', 'true');
  await selected.getByRole('button', {name: 'Drop', exact: true}).click();
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  await otherCard.getByRole('button', {name: 'Emphasize', exact: true}).click();
  await expect(other.locator('#save-status')).toContainText('Newer judgments loaded');
  await expect(otherCard).toHaveAttribute('data-verdict', 'dropped');
  await page.route('**/api/verdicts?*', route => route.abort());
  await selected.getByRole('button', {name: 'Keep', exact: true}).click();
  await expect(page.locator('#save-status')).toContainText('Save not confirmed');
  await expect(selected.getByRole('button', {name: 'Keep', exact: true})).toBeDisabled();
  await page.unroute('**/api/verdicts?*');
  await page.locator('#retry-save').click();
  await expect(page.locator('#save-status')).toHaveText('All judgments saved');
  await expect(selected).toHaveAttribute('data-verdict', 'dropped');
  await page.locator('#help').click();
  await expect(page.locator('#help-dialog')).toContainText('Load new stories');
  await expect(page.locator('#help-dialog')).toContainText('tag-newsletter-stories');
  await expect(page.locator('#help-dialog')).toContainText('Each judgment and Undo saves automatically');
  assert.deepEqual(errors, []);
});
