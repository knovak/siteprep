import { additionalStudies } from '../../phase-3/scripts/additional-studies.mjs';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the private bundle runs the complete movement and correction path', async ({ page, context }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByLabel('Choose a movement').locator('option')).toHaveCount(43);
  await page.getByLabel('Choose a movement').selectOption('supported-seated-side-reach');
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
  await page.getByLabel('Choose a movement').selectOption('pause-before-standing');
  await expect(page.getByRole('heading', { name: /pause before standing/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});


test('all thirty additions load their own records, animate, and retain session playback', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#stage[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: /enable playback/i }).click();
  const signatures = new Set();
  for (const study of additionalStudies) {
    await page.locator('#movement-select').selectOption(study.id);
    await expect(page.locator('#stage')).toHaveAttribute('data-clip', study.id);
    await expect(page.getByRole('heading', { name: study.title, exact: true })).toBeVisible();
    await expect(page.locator('#record-incomplete')).toBeHidden();
    await expect(page.locator('#review-pill')).toHaveText('unreviewed');
    const initial = await page.locator('#model-canvas').evaluate((canvas) => canvas.toDataURL());
    await page.locator('#timeline').fill('350');
    const moved = await page.locator('#model-canvas').evaluate((canvas) => canvas.toDataURL());
    expect(moved, study.id).not.toBe(initial);
    signatures.add(moved);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  }
  expect(signatures.size).toBe(30);
  expect(errors).toEqual([]);
});
