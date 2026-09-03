import {expect, test} from '@playwright/test';

test('required viewport renders the same semantic scene without overflow', async ({page}, testInfo) => {
  await page.goto('/app/');
  await expect(page).toHaveTitle(/Educational Global Maps/u);
  await expect(page.locator('#map')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#revision')).toContainText('dataset:owid-population-2023@2024-07-15');
  await expect(page.locator('#values tr')).toHaveCount(6);
  await expect(page.locator('#pause-inspection')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-layout', testInfo.project.name === 'display-4k' ? 'display-4k' : testInfo.project.name);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-motion', 'reduced');
});

test('projection switch preserves pinned scene facts and refuses an incompatible raster', async ({page}) => {
  await page.goto('/app/');
  const revision = await page.locator('#revision').textContent();
  const encoding = await page.locator('#encoding').textContent();
  await page.locator('#projection').selectOption('airocean');
  await expect(page.locator('#current-projection')).toHaveText('Airocean');
  await expect(page.locator('#revision')).toHaveText(revision);
  await expect(page.locator('#encoding')).toHaveText(encoding);
  await page.locator('#projection').selectOption('equal-earth');
  await page.locator('#reference-raster').check();
  await page.locator('#projection').selectOption('airocean');
  await expect(page.locator('#refusal')).toBeVisible();
  await expect(page.locator('#refusal')).toContainText('supports Equal Earth');
  await expect(page.locator('#current-projection')).toHaveText('Equal Earth');
});

test('point selection and fixed cartogram keep exact, accessible evidence', async ({page}) => {
  await page.goto('/app/');
  await page.locator('#dataset').selectOption('dataset:learning-centres');
  await expect(page.locator('#values tr')).toHaveCount(5);
  await expect(page.locator('#current-projection')).toHaveText('Equal Earth');
  await page.locator('#dataset').selectOption('dataset:population');
  await page.getByLabel('Learner movement').uncheck();
  await page.getByLabel('Temporary learning centres').uncheck();
  await page.locator('#projection').selectOption('population-cartogram');
  await expect(page.locator('#cartogram-note')).toBeVisible();
  await expect(page.locator('#cartogram-note')).toContainText('UN World Population Prospects 2024, 2023');
  await page.getByRole('button', {name: 'Brazil'}).click();
  await expect(page.locator('#selected-label')).toHaveText('Brazil');
  await expect(page.locator('#selected-value')).toHaveText('211,998,573');
});
