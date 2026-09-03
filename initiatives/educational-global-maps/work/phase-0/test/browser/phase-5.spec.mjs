import {expect, test} from '@playwright/test';

test('display creates a 128-bit join secret, QR code, and controller URL', async ({page}) => {
  await page.goto('/app/');
  await page.locator('#start-session').click();
  await expect(page.locator('#session-status')).toContainText('same-browser fallback');
  const join = new URL(await page.locator('#join-url').getAttribute('href'));
  expect(join.searchParams.get('session')).toMatch(/^session:/u);
  expect(join.searchParams.get('secret')).toMatch(/^[0-9a-f]{32}$/u);
  await expect(page.locator('#join-qr')).toBeVisible();
  await expect(page.locator('#join-qr')).toHaveAttribute('src', /^data:image\/png;base64,/u);
});

test('detached controller changes time, projection, selection, camera, and stops through authoritative snapshots', async ({page, context}) => {
  await page.goto('/app/');
  await page.locator('#start-session').click();
  const join = await page.locator('#join-url').getAttribute('href');
  const controller = await context.newPage();
  await controller.goto(join);
  await expect(controller.locator('#controller-status')).toContainText('Connected');
  await expect(controller.locator('#controller-revision')).toContainText('revision 0');

  await controller.locator('#controller-time').selectOption('2022');
  await expect(page.locator('#scene-time')).toHaveValue('2022');
  await expect(controller.locator('#controller-revision')).toContainText('revision 1');

  await controller.locator('#controller-projection').selectOption('airocean');
  await expect(page.locator('#projection')).toHaveValue('airocean');
  await controller.locator('#controller-feature').selectOption({index: 2});
  await expect(page.locator('#selected-label')).toHaveText(await controller.locator('#controller-feature option').nth(2).textContent());
  await expect(controller.locator('#controller-revision')).toContainText('revision 3');
  await controller.locator('#controller-zoom-in').click();
  await expect(controller.locator('#controller-revision')).toContainText('revision 4');
  await controller.locator('#controller-next-stop').click();
  await expect(page.locator('#scene-stop')).toContainText('2 of 2');
});

test('ending a controller session leaves the display usable', async ({page, context}) => {
  await page.goto('/app/');
  await page.locator('#start-session').click();
  const controller = await context.newPage();
  await controller.goto(await page.locator('#join-url').getAttribute('href'));
  await expect(controller.locator('#controller-status')).toContainText('Connected');
  await page.locator('#end-session').click();
  await expect(page.locator('#session-status')).toContainText('display remains usable');
  await expect(page.locator('#projection')).toBeEnabled();
  await expect(controller.locator('#controller-status')).toContainText('ended');
});
