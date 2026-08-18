import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {expect, test} from '@playwright/test';

const outputPath = process.env.GUIDE_DECK_PATH;
const repositoryRoot = process.env.GUIDE_REPO_ROOT;

test.beforeAll(() => {
  if (!outputPath || !repositoryRoot) throw new Error('GUIDE_DECK_PATH and GUIDE_REPO_ROOT are required');
});

test('deck opens offline and supports complete keyboard navigation', async ({page}) => {
  const consoleErrors = [];
  const failedRequests = [];
  const networkRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('request', request => { if (/^https?:/i.test(request.url())) networkRequests.push(request.url()); });
  await page.goto(pathToFileURL(outputPath).href);

  const slides = page.locator('.slide');
  await expect(slides).toHaveCount(13);
  await expect(slides.nth(0)).toBeVisible();
  await expect(slides.nth(1)).toBeHidden();
  await expect(page.locator('#progress')).toHaveText('1 / 13');

  await page.keyboard.press('ArrowRight');
  await expect(slides.nth(1)).toBeVisible();
  await expect(page.locator('#progress')).toHaveText('2 / 13');
  await page.keyboard.press('End');
  await expect(slides.nth(12)).toBeVisible();
  await expect(page.locator('#progress')).toHaveText('13 / 13');
  await page.keyboard.press('Home');
  await expect(slides.nth(0)).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#progress')).toHaveText('1 / 13');
  await page.keyboard.press('PageDown');
  await expect(page.locator('#progress')).toHaveText('2 / 13');
  await page.keyboard.press('PageUp');
  await expect(page.locator('#progress')).toHaveText('1 / 13');

  const sha = await page.locator('body').getAttribute('data-source-sha');
  expect(sha).toMatch(/^[a-f0-9]{7,40}$/);
  const sources = await page.locator('a[data-source-path]').evaluateAll(links => links.map(link => ({
    path: link.dataset.sourcePath,
    href: link.href,
  })));
  expect(sources.length).toBeGreaterThanOrEqual(5);
  for (const source of sources) {
    expect(existsSync(resolve(repositoryRoot, source.path))).toBe(true);
    expect(source.href).toContain(`/blob/${sha}/`);
  }

  const html = readFileSync(outputPath, 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+stylesheet|\bfetch\s*\(/i);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(networkRequests).toEqual([]);
});
