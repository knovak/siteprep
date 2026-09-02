import {expect, test} from '@playwright/test';

test('time and active layers expose their actual source periods', async ({page}) => {
  await page.goto('/app/');
  await expect(page.locator('#map')).toHaveAttribute('data-scene-time', '2023-06');
  await expect(page.locator('#map')).toHaveAttribute('data-temporal-layers', '4');
  await expect(page.locator('#actual-periods')).toContainText('Population field: 2023 · nearest');
  await expect(page.locator('#actual-periods')).toContainText('Education access index: 2022 → 2024 · linear-interpolation');
  await expect(page.locator('#actual-periods')).toContainText('Learner movement: 2023-05-15 · nearest');
  await page.locator('#scene-time').selectOption('2024');
  await expect(page.locator('#map')).toHaveAttribute('data-scene-time', '2024');
  await expect(page.locator('#actual-periods')).toContainText('Temporary learning centres: 2024 · coverage-filter');
});

test('compatible raster is visible and alternate projection refusal preserves the accepted scene', async ({page}) => {
  await page.goto('/app/');
  await page.getByLabel('Sea-temperature raster frame').check();
  await expect(page.locator('#map')).toHaveAttribute('data-temporal-layers', '5');
  await expect(page.locator('#actual-periods')).toContainText('Sea-temperature raster frame: 2023-06');
  await page.locator('#projection').selectOption('airocean');
  await expect(page.locator('#refusal')).toContainText('Sea-temperature raster frame cannot render on airocean');
  await expect(page.locator('#current-projection')).toHaveText('Equal Earth');
  await expect(page.locator('#scene-time')).toHaveValue('2023-06');
});

test('every animation has an immediate pause and reduced motion prevents automatic playback', async ({page}) => {
  await page.goto('/app/');
  await page.locator('#play-time').click();
  await expect(page.locator('#play-time')).toHaveText('Pause time');
  await expect(page.locator('#play-time')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#play-time').click();
  await expect(page.locator('#play-time')).toHaveText('Play time');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.reload();
  await page.locator('#play-time').click();
  await expect(page.locator('#refusal')).toContainText('disabled by the reduced-motion preference');
  await expect(page.locator('#play-time')).toHaveAttribute('aria-pressed', 'false');
});
