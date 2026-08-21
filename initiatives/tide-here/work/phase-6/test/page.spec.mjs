import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagePath = '/initiatives/tide-here/work/phase-6/index.html?fixture=1';

test('a forecast shows three names, station and zone, and five equal day cards', async ({ page }, testInfo) => {
  await page.goto(pagePath);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.getByText('You entered', { exact: true })).toBeVisible();
  await expect(page.locator('#entered-name')).toHaveText('Seattle');
  await expect(page.locator('#resolved-name')).toContainText('Seattle, Washington');
  await expect(page.locator('#coast-name')).toContainText('SEATTLE');
  await expect(page.locator('#station-name')).toContainText('SEATTLE');
  await expect(page.locator('#zone-name')).toHaveText('America/Los_Angeles');
  await expect(page.locator('.day-card')).toHaveCount(5);
  await expect(page.locator('.day-card').first().getByText('Tides', { exact: true })).toBeVisible();
  await expect(page.locator('.day-card').first().getByText('Sun and moon', { exact: true })).toBeVisible();
  await expect(page.getByText(/informational and are not for navigation or safety decisions/i)).toBeVisible();
  await expect(page.locator('#source-copy')).toContainText(/heights in metres relative to MLLW/i);
  if (testInfo.project.name === 'desktop') {
    const heights = await page.locator('.day-card').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
  }
});

test('an ambiguous coast shows at most three choices and a map before any tide cards', async ({ page }) => {
  await page.goto(`${pagePath}&state=coast-choice-required`);
  await expect(page.locator('#chooser')).toBeVisible();
  await expect(page.locator('#choice-map')).toBeVisible();
  await expect(page.locator('.day-card')).toHaveCount(0);
  const candidates = page.locator('.candidate');
  expect(await candidates.count()).toBeGreaterThan(1);
  expect(await candidates.count()).toBeLessThanOrEqual(3);
  await expect(candidates.first()).toBeFocused();
  await candidates.first().click();
  await expect(page.locator('.day-card')).toHaveCount(5);
});

test('all eight states have their own readable page treatment', async ({ page }) => {
  const expected = new Map([
    ['invalid-input', /place name or decimal coordinates/i],
    ['place-not-found', /was not found/i],
    ['geocoder-unavailable', /place lookup is unavailable/i],
    ['coverage-unavailable', /U\.S\. and Canadian coasts/i],
    ['coast-choice-required', /choose the coast/i],
    ['tides-unavailable', /tide predictions are unavailable/i],
    ['astronomy-unavailable', /sun and moon calculations are unavailable/i],
    ['no-event', /does not rise or set/i]
  ]);
  const messages = [];
  for (const [code, message] of expected) {
    await page.goto(`${pagePath}&state=${code}`);
    const panel = page.locator('#state-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-code', code);
    await expect(panel).toContainText(message);
    messages.push(await panel.locator('#state-message').textContent());
  }
  expect(new Set(messages).size).toBe(8);
});

test('errors and choices receive keyboard focus and narrow pages do not clip', async ({ page }) => {
  await page.goto(`${pagePath}&state=invalid-input`);
  await expect(page.locator('#state-panel')).toBeFocused();
  await page.getByRole('button', { name: 'Edit the entry' }).click();
  await expect(page.locator('#place')).toBeFocused();
  await page.goto(`${pagePath}&state=coast-choice-required`);
  await expect(page.locator('.candidate').first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('the validation page has no serious accessibility findings', async ({ page }) => {
  await page.goto(pagePath);
  await expect(page.locator('#result')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
