const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const deck = '/decks/eclipse-2027';
const notes = readFileSync(path.join(__dirname, '../..', 'decks/eclipse-2027/research-notes.md'), 'utf8');
const headings = [...notes.matchAll(/^## (.+)$/gm)].map((match) => match[1]);

test('both package pages open the rendered research notes and provide return navigation', async ({ page }) => {
  for (const source of ['overview.html', 'overview-reject.html']) {
    await page.goto(`${deck}/sections/package-options/${source}`);
    await page.getByRole('link', { name: /^research and upkeep notes$/i }).click();
    await expect(page).toHaveURL(new RegExp(`${deck}/research-notes\\.html$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eclipse 2027 package research and upkeep');
    await expect(page.locator('main h2')).toHaveText(headings);
    await expect(page.locator('main ol > li')).toHaveCount(5);
    await expect(page.locator('main')).toContainText('No ongoing research automation was requested or created.');
    await expect(page.getByRole('link', { name: 'NASA geographic path table' })).toHaveAttribute(
      'href', 'https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Aug02Tpath.html');
    await expect(page.locator('footer.site-footer')).toHaveCount(1);
    const back = source === 'overview.html' ? 'Back to Package options' : 'Rejected and unverified options';
    await page.getByRole('link', { name: back, exact: true }).click();
    await expect(page).toHaveURL(`${page.url().split(deck)[0]}${deck}/sections/package-options/${source}`);
  }
});

test('research notes remain within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${deck}/research-notes.html`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
