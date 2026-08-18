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

  await expect(page.locator('main section')).toHaveCount(9);
  await expect(page.locator('main section').first()).toHaveAttribute('id', 'repository');
  await expect(page.locator('main section').last()).toHaveAttribute('id', 'sources');
  await expect(page.locator('[data-audience="forker"]')).toHaveCount(1);
  await expect(page.locator('[data-audience="contributor"]')).toHaveCount(2);
  await expect(page.locator('section .audience')).toHaveCount(9);

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
