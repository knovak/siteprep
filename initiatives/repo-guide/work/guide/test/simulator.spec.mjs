import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {expect, test} from '@playwright/test';

const outputPath = process.env.GUIDE_SIMULATOR_PATH;
const repositoryRoot = process.env.GUIDE_REPO_ROOT;

test.beforeAll(() => {
  if (!outputPath || !repositoryRoot) throw new Error('GUIDE_SIMULATOR_PATH and GUIDE_REPO_ROOT are required');
});

test('simulator opens offline, steps end to end, and returns to its start', async ({page}) => {
  const consoleErrors = [];
  const failedRequests = [];
  const networkRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('request', request => { if (/^https?:/i.test(request.url())) networkRequests.push(request.url()); });
  await page.goto(pathToFileURL(outputPath).href);

  await expect(page.locator('#progress')).toHaveText('1 / 6');
  await expect(page.locator('#back')).toBeDisabled();
  await page.evaluate(() => document.querySelector('#back').click());
  await expect(page.locator('#progress')).toHaveText('1 / 6');
  for (let step = 2; step <= 6; step += 1) {
    await page.locator('#step').click();
    await expect(page.locator('#progress')).toHaveText(`${step} / 6`);
  }
  await expect(page.locator('#step')).toBeDisabled();
  await page.evaluate(() => document.querySelector('#step').click());
  await expect(page.locator('#progress')).toHaveText('6 / 6');
  await expect(page.locator('[data-cascade="true"]')).toBeVisible();
  for (let step = 5; step >= 1; step -= 1) {
    await page.locator('#back').click();
    await expect(page.locator('#progress')).toHaveText(`${step} / 6`);
  }

  const vocabulary = await page.evaluate(() => window.simulatorState.vocabulary);
  const shownStages = await page.locator('[data-stage]').evaluateAll(nodes => nodes.map(node => node.dataset.stage));
  expect(shownStages.every(stage => vocabulary.stages.includes(stage))).toBe(true);
  await page.evaluate(() => window.simulatorState.show(3));
  await expect(page.locator('[data-item-state="passed"]')).toBeVisible();
  const phases = await page.locator('[data-phase]').evaluateAll(nodes => nodes.map(node => node.dataset.phase));
  expect(phases).toEqual(vocabulary.phases);

  const sha = await page.locator('body').getAttribute('data-source-sha');
  expect(sha).toMatch(/^[a-f0-9]{7,40}$/);
  const sources = await page.locator('a[data-source-path]').evaluateAll(links => links.map(link => ({path: link.dataset.sourcePath, href: link.href})));
  expect(sources).toHaveLength(2);
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

test('Play follows the same sequence and can be interrupted', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => window.simulatorState.current())).toBeGreaterThanOrEqual(1);
  await page.locator('#play').click();
  const pausedAt = await page.evaluate(() => window.simulatorState.current());
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.simulatorState.current())).toBe(pausedAt);
  await page.locator('#play').click();
  await expect(page.locator('#progress')).toHaveText('6 / 6', {timeout: 5000});
  expect(await page.evaluate(() => window.simulatorState.visited())).toEqual([0, 1, 2, 3, 4, 5]);
});
