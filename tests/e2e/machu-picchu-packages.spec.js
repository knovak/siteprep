const { test, expect } = require('@playwright/test');
const inventory = require('../../decks/peru/sections/machu-picchu-packages/packages.json');

const section = '/decks/peru/sections/machu-picchu-packages';
const active = inventory.packages;
const dates = active.flatMap((item) => item.departures.map((departure) => departure.start));

test('the comparison exposes each dated departure and its source itinerary', async ({ page }) => {
  await page.goto(section + '/overview.html');
  const rows = page.locator('#package-comparison tbody tr[data-start]');
  await expect(rows).toHaveCount(dates.length);
  const rendered = await rows.evaluateAll((items) => items.map((row) => ({
    style: row.dataset.style, start: row.dataset.start,
    target: row.querySelector('a[href^="#"]')?.hash,
  })));
  expect(rendered.map((row) => row.start).sort()).toEqual([...dates].sort());
  const unresolved = await page.evaluate((targets) => targets.filter((target) =>
    !target || !document.getElementById(target.slice(1))), rendered.map((row) => row.target));
  expect(unresolved).toEqual([]);
  for (const style of new Set(rendered.map((row) => row.style))) {
    const starts = rendered.filter((row) => row.style === style).map((row) => row.start);
    expect(starts).toEqual([...starts].sort());
  }
  await expect(page.locator('footer.site-footer')).toHaveCount(1);
});

test('date sorting covers every style and dropdowns work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(section + '/overview.html');
  const datesButton = page.locator('#package-comparison button[data-sort="start"]');
  await datesButton.click();
  const visibleDates = () => page.locator('#package-comparison tbody tr[data-start]:visible')
    .evaluateAll((rows) => rows.map((row) => row.dataset.start));
  expect(await visibleDates()).toEqual([...dates].sort());
  await datesButton.click();
  expect(await visibleDates()).toEqual([...dates].sort().reverse());
  const style = active[0].style;
  await page.locator('select[data-filter="style"]').selectOption({ label: style });
  const expected = active.filter((item) => item.style === style)
    .reduce((count, item) => count + item.departures.length, 0);
  expect(await visibleDates()).toHaveLength(expected);
  await page.getByRole('button', { name: 'Clear all column filters' }).click();
  expect(await visibleDates()).toHaveLength(dates.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('the research and holding pages link back and keep rejected IDs separate', async ({ page }) => {
  const activeIds = new Set(active.map((item) => item.id));
  const holdingIds = inventory.holding.map((item) => item.id);
  expect(new Set(holdingIds).size).toBe(holdingIds.length);
  expect(holdingIds.filter((id) => activeIds.has(id))).toEqual([]);
  await page.goto(section + '/overview-reject.html');
  for (const item of inventory.holding) await expect(page.locator('main')).toContainText(item.name);
  await expect(page.locator('.map-container')).toHaveCount(0);
  await page.getByRole('link', { name: 'Research notes', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Machu Picchu');
  await expect(page.locator('a[href*="machu-picchu-packages/overview.html"]').first()).toBeVisible();
  await expect(page.locator('footer.site-footer')).toHaveCount(1);
});
