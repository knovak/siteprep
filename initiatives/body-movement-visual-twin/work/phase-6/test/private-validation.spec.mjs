import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the private bundle runs the complete movement and correction path', async ({ page, context }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByLabel('Choose a movement').locator('option')).toHaveCount(13);
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
