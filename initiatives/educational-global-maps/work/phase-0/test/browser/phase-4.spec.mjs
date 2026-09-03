import {expect, test} from '@playwright/test';

test('prepared scenes carry educational framing and ordered presentation stops', async ({page}) => {
  await page.goto('/app/');
  await expect(page.locator('#scene-title')).toHaveText('Where do population patterns stand out?');
  await expect(page.locator('#scene-definition')).toContainText('recorded number of residents');
  await expect(page.locator('#scene-caveat')).toContainText('not an authoritative boundary product');
  await expect(page.locator('#scene-question')).toContainText('exact-value table');
  await expect(page.locator('#scene-stop')).toContainText('1 of 2 · Read the measure');
  await page.locator('#next-stop').click();
  await expect(page.locator('#scene-stop')).toContainText('2 of 2 · Compare France and Germany');
});

test('share remains pinned and upgrade creates a visibly new revision', async ({page}) => {
  await page.goto('/app/');
  const pinnedShare = await page.locator('#scene-share').textContent();
  await expect(page.locator('#scene-revision')).toHaveText('scene:population-question@1');
  await page.locator('#compare-upgrade').click();
  await expect(page.locator('#upgrade-status')).toContainText('dataset 2023 → 2024');
  await expect(page.locator('#scene-revision')).toHaveText('scene:population-question@2');
  await page.goto(pinnedShare);
  await expect(page.locator('#scene-revision')).toHaveText('scene:population-question@1');
  await expect(page.locator('#upgrade-status')).toHaveText('Pinned to the saved dataset revisions.');
});

test('portable preparation discloses a restricted live reference', async ({page}) => {
  await page.goto('/app/');
  await page.locator('#scene-library').selectOption('scene:learner-flow');
  await expect(page.locator('#actual-periods')).toContainText('Learner movement');
  await page.locator('#prepare-bundle').click();
  await expect(page.locator('#portable-status')).toContainText('permitted population bytes embedded');
  await expect(page.locator('#portable-status')).toContainText('classroom token required');
  await expect(page.locator('#portable-status')).toContainText('not redistributed');
});
