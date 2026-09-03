import {expect, test} from '@playwright/test';

test('an unguided visitor can identify the evidence, change the view, and return to the catalogue', async ({page}) => {
  await page.goto('/app/');
  await page.locator('a[href="#scene-title"]').click();
  await expect(page.locator('#method-cue')).toContainText('Measure: Population by country; unit: people; period: 2023');
  await expect(page.locator('#citations')).toContainText('World Population Prospects');
  await expect(page.locator('#scene-caveat')).toContainText('not an authoritative boundary product');
  await page.locator('#scene-time').selectOption('2022');
  await expect(page.locator('#actual-periods')).toContainText('2022');
  await page.locator('#projection').selectOption('airocean');
  await expect(page.locator('#current-projection')).toHaveText('Airocean');
  await page.locator('#scene-library').focus();
  await expect(page.locator('#scene-library')).toBeFocused();
});

test('presentation mode keeps teaching evidence visible and authoring controls off the display', async ({page, context}, testInfo) => {
  await page.goto('/app/?presentation=1');
  await expect(page.locator('body')).toHaveAttribute('data-presentation', 'true');
  await expect(page.locator('.control-panel')).toBeHidden();
  await expect(page.locator('.carry-panel')).toBeHidden();
  await expect(page.locator('#map-title')).toBeVisible();
  await expect(page.locator('#legend-title')).toBeVisible();
  await expect(page.locator('#citation-title')).toBeVisible();
  await expect(page.locator('#method-cue')).toBeVisible();
  await page.locator('#start-session').click();
  const controller = await context.newPage();
  await controller.goto(await page.locator('#join-url').getAttribute('href'));
  await controller.locator('#controller-next-stop').click();
  await expect(page.locator('#scene-stop')).toContainText('2 of 2');
  await page.locator('#end-session').click();
  await expect(page.locator('#session-status')).toContainText('display remains usable');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === 'display-4k') {
    expect(await page.locator('#map-title').evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(40);
  }
});

test('keyboard and touch targets remain usable at the required viewports', async ({page}) => {
  await page.goto('/app/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  const controls = page.locator('button:visible, select:visible, .entry-actions a:visible');
  const sizes = await controls.evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return {width: box.width, height: box.height, label: node.textContent || node.getAttribute('aria-label')};
  }));
  expect(sizes.every(({width, height}) => width >= 44 && height >= 44)).toBe(true);
});
