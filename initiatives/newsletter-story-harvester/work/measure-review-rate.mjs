#!/usr/bin/env node
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';

import {reviewPageHtml} from './src/review-page.mjs';

const VERDICTS = ['kept', 'dropped', 'emphasised'];

function percentile(values, proportion) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * proportion) - 1)];
}

async function measurePass(browser, fileUrl, pass) {
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('requestfailed', request => errors.push(`request: ${request.url()} — ${request.failure()?.errorText || 'failed'}`));
  await page.goto(fileUrl);

  await page.locator('#sort').selectOption('unjudged');
  const clicks = store.stories.filter(story => story.verdict === null).length;
  const latencies = [];
  let startedAt = null;
  for (let index = 0; index < clicks; index += 1) {
    const card = page.locator('.story[data-verdict=""]').first();
    const before = performance.now();
    if (startedAt === null) startedAt = before;
    await card.locator(`button[data-verdict="${VERDICTS[index % VERDICTS.length]}"]`).click();
    await page.waitForFunction(
      remaining => document.getElementById('backlog').textContent.startsWith(remaining + ' unjudged of '),
      clicks - index - 1,
    );
    latencies.push(performance.now() - before);
  }

  const elapsedMs = performance.now() - startedAt;
  const backlog = await page.locator('#backlog').textContent();
  const result = {
    pass,
    clicks,
    elapsed_ms: Number(elapsedMs.toFixed(2)),
    clicks_per_second: Number((clicks / (elapsedMs / 1000)).toFixed(3)),
    latency_p50_ms: Number(percentile(latencies, 0.5).toFixed(2)),
    latency_p95_ms: Number(percentile(latencies, 0.95).toFixed(2)),
    reached_zero: backlog === `0 unjudged of ${store.stories.length}`,
    browser_errors: errors,
  };
  await page.close();
  return result;
}

const fixturePath = new URL('./fixtures/store-fixture.json', import.meta.url);
const store = JSON.parse(readFileSync(fixturePath, 'utf8'));
const output = join(mkdtempSync(join(tmpdir(), 'newsletter-review-rate-')), 'review.html');
writeFileSync(output, reviewPageHtml(store), 'utf8');

const browser = await chromium.launch({headless: true});
try {
  const passes = [];
  for (let pass = 1; pass <= 3; pass += 1) passes.push(await measurePass(browser, pathToFileURL(output).href, pass));
  const successful = passes.every(result => result.reached_zero && result.browser_errors.length === 0);
  process.stdout.write(`${JSON.stringify({
    protocol: 'newsletter-review-interaction/v1',
    measured_at: new Date().toISOString(),
    fixture_store_id: store.store_id,
    runtime: {node: process.version, platform: process.platform, architecture: process.arch, chromium: browser.version()},
    viewport: {width: 1280, height: 900},
    verdict_order: VERDICTS,
    passes,
    successful,
  }, null, 2)}\n`);
  if (!successful) process.exitCode = 1;
} finally {
  await browser.close();
}
