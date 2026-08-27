import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {expect, test} from '@playwright/test';

const outputPath = process.env.GUIDE_DESCRIPTION_PATH;
const repositoryRoot = process.env.GUIDE_REPO_ROOT;

test.beforeAll(() => {
  if (!outputPath || !repositoryRoot) throw new Error('GUIDE_DESCRIPTION_PATH and GUIDE_REPO_ROOT are required');
});

test('description opens offline with provenance, all sections, and resolvable sources', async ({page}) => {
  const consoleErrors = [];
  const failedRequests = [];
  const networkRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('request', request => { if (/^https?:/i.test(request.url())) networkRequests.push(request.url()); });
  await page.goto(pathToFileURL(outputPath).href);

  await expect(page.locator('main section')).toHaveCount(10);
  await expect(page.locator('main section').first()).toHaveAttribute('id', 'repository');
  await expect(page.locator('main section').last()).toHaveAttribute('id', 'sources');
  await expect(page.locator('[data-audience="forker"]')).toHaveCount(1);
  await expect(page.locator('[data-audience="contributor"]')).toHaveCount(2);
  await expect(page.locator('section .audience')).toHaveCount(10);

  const footer = page.locator('footer');
  const sha = await footer.getAttribute('data-source-sha');
  expect(sha).toMatch(/^[a-f0-9]{7,40}$/);
  await expect(footer).toHaveAttribute('data-generated-date', /^\d{4}-\d{2}-\d{2}$/);

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

test('structured facts render as structure, not as flattened prose', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);

  // Every rendered block is a real component, and none of them is a paragraph
  // of semicolon-joined values.
  const blocks = await page.locator('[data-fact-block]').evaluateAll(nodes => nodes.map(node => ({
    fact: node.dataset.factBlock,
    view: node.dataset.factView,
  })));
  expect(blocks.length).toBeGreaterThanOrEqual(5);
  expect(blocks.map(block => block.view)).not.toContain(undefined);

  // The budget is a table of named rows rather than a sentence.
  const budget = page.locator('[data-fact-block="sweep.budget"] .fact-table > div');
  await expect(budget.first()).toBeVisible();
  expect(await budget.count()).toBeGreaterThanOrEqual(3);

  // No paragraph anywhere flattens a structured value the old way.
  const flattened = await page.locator('main p').evaluateAll(nodes => nodes
    .map(node => node.textContent)
    .filter(text => /\b\w+: [^;]+;\s*\w+:/.test(text)));
  expect(flattened).toEqual([]);
});

test('figures are inline, self-contained, and described', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  const figures = page.locator('figure[data-figure]');
  expect(await figures.count()).toBeGreaterThanOrEqual(4);

  for (const svg of await page.locator('figure[data-figure] svg').all()) {
    await expect(svg).toHaveAttribute('role', 'img');
    const label = await svg.getAttribute('aria-label');
    expect(label && label.length).toBeGreaterThan(10);
  }

  // Arrowhead markers are namespaced per figure: duplicate ids on one page make
  // every arrow resolve to whichever marker rendered first.
  const markerIds = await page.locator('marker').evaluateAll(nodes => nodes.map(node => node.id));
  expect(new Set(markerIds).size).toBe(markerIds.length);
});

test('the description begins with the repository entry point', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  await expect(page.locator('main > *').first()).toHaveAttribute('id', 'repository');
});
