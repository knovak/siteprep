import { selectMovement } from '../../phase-3/test/select-movement.mjs';

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the private bundle runs the complete movement and correction path', async ({ page, context }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('#movement-select').locator('option')).toHaveCount(140);
  await selectMovement(page, 'supported-seated-side-reach');
  await expect(page.getByRole('heading', { name: 'Supported seated side reach' })).toBeVisible();
  await page.getByRole('button', { name: /enable playback/i }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('#stage')).toHaveAttribute('data-movement', 'supported-seated-side-reach');
  await page.locator('#stature').fill('195');
  await expect(page.locator('#profile-note')).toContainText(/fitted reference scale changed/i);
  await page.locator('#layer').selectOption('3');
  await expect(page.locator('#stage')).toHaveAttribute('data-muscles-loaded', 'true');
  await page.getByRole('button', { name: /flag claim:/i }).first().click();
  await page.locator('textarea[name="note"]').fill('Check this claim with the named reviewer.');
  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(page.locator('#report-status')).toContainText(/not retained/i);
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).record_changed).toBe(false);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4179')).toBe(true);
});

test('fallback content remains usable and has no serious accessibility findings', async ({ page }) => {
  await page.goto('/?noWebgl=1');
  await expect(page.getByRole('heading', { name: /cannot start the WebGL scene/i })).toBeVisible();
  await selectMovement(page, 'pause-before-standing');
  await expect(page.getByRole('heading', { name: /pause before standing/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});


test('all 140 records animate and retain session playback', async ({ page }) => {
  test.setTimeout(240000);
  const collection = await (await page.request.get('/data/collection.json')).json();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#stage[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: /enable playback/i }).click();
  const signatures = new Set();
  for (const study of collection.records) {
    await selectMovement(page, study.id);
    await expect(page.locator('#stage')).toHaveAttribute('data-clip', study.id);
    await expect(page.locator('#movement-selected-label')).toHaveText(study.label);
    await expect(page.locator('#record-incomplete')).toBeHidden();
    await expect(page.locator('#review-pill')).toHaveText('unreviewed');
    const initial = await page.locator('#model-canvas').evaluate((canvas) => canvas.toDataURL());
    await page.locator('#timeline').fill('350');
    const middle = await page.locator('#model-canvas').evaluate((canvas) => canvas.toDataURL());
    await page.locator('#timeline').fill('700');
    const moved = await page.locator('#model-canvas').evaluate((canvas) => canvas.toDataURL());
    // The original Alexander study holds its opening pause until 40%.
    expect(middle !== initial || moved !== initial, study.id).toBe(true);
    signatures.add(middle + moved);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  }
  expect(signatures.size).toBe(140);
  expect(errors).toEqual([]);
});
