import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('cautions gate playback and controls preserve the frame and camera', async ({ page }) => {
  const muscleRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/muscles.json')) muscleRequests.push(request.url());
  });
  await page.goto('/initiatives/body-movement-visual-twin/work/phase-2/index.html');

  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.getByText('Educational visualization')).toBeVisible();
  await expect(page.getByText(/not diagnosis, treatment/i)).toBeVisible();
  expect(muscleRequests).toHaveLength(0);

  await page.getByRole('button', { name: /enable playback/i }).click();
  await page.locator('#timeline').fill('460');
  await page.getByRole('button', { name: 'Side' }).click();
  const before = await page.locator('#stage').evaluate((element) => ({ time: element.dataset.time, camera: element.dataset.camera }));
  await page.locator('#layer').fill('2');
  await expect(page.locator('#muscle-loading')).toBeVisible();
  await expect.poll(() => muscleRequests.length).toBe(1);
  await expect(page.locator('#stage')).toHaveAttribute('data-muscles-loaded', 'true');
  await expect(page.locator('#reference-label')).toBeVisible();
  const after = await page.locator('#stage').evaluate((element) => ({ time: element.dataset.time, camera: element.dataset.camera }));
  expect(after).toEqual(before);

  await page.locator('#pin-layer').selectOption('skeleton');
  await page.locator('#isolate-joint').selectOption('scapula-left');
  await expect(page.locator('#stage')).toHaveAttribute('data-pinned', 'skeleton');
  await expect(page.locator('#stage')).toHaveAttribute('data-isolated-joint', 'scapula-left');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => Number(await page.locator('#stage').getAttribute('data-time'))).toBeGreaterThan(.46);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('the separate flag report does not imply a record edit', async ({ page }) => {
  await page.goto('/initiatives/body-movement-visual-twin/work/phase-2/index.html');
  await page.getByRole('button', { name: /flag a claim/i }).click();
  await expect(page.getByText(/does not edit the movement record/i)).toBeVisible();
  await page.locator('textarea[name="note"]').fill('Confirm the left scapula wording.');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  expect((await download).suggestedFilename()).toMatch(/^movement-review-flag-/);
});

test('the useful record remains when WebGL is unavailable', async ({ page }) => {
  await page.goto('/initiatives/body-movement-visual-twin/work/phase-2/index.html?noWebgl=1');
  await expect(page.getByRole('heading', { name: /cannot start the WebGL scene/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /small shoulder/i })).toBeVisible();
  await expect(page.getByText(/project-authored description/i)).toBeVisible();
});

test('the page has no serious accessibility findings or horizontal overflow', async ({ page }) => {
  await page.goto('/initiatives/body-movement-visual-twin/work/phase-2/index.html');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
