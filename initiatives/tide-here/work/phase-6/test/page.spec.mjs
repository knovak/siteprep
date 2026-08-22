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
  await expect(page.getByText('No location permission needed', { exact: true })).toHaveCount(0);
  await expect(page.getByText('What is the coast doing here?', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Tide Here checks the coast before it shows a prediction station/i)).toHaveCount(0);
  const outputOrder = await page.evaluate(() => {
    const result = document.querySelector('#result');
    const localTools = document.querySelector('.local-tools');
    return Boolean(result.compareDocumentPosition(localTools) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(outputOrder).toBe(true);
  await expect(page.getByRole('button', { name: /Show local history/ })).toBeVisible();
  await expect(page.getByText(/What leaves this device:/i)).toBeVisible();
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

test('the page reflows without clipping from a small phone through a wide desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One browser project covers the viewport matrix.');
  const windows = [
    { width: 320, height: 568, columns: 1 },
    { width: 430, height: 932, columns: 1 },
    { width: 768, height: 1024, columns: 2 },
    { width: 1024, height: 768, columns: 5 },
    { width: 1600, height: 900, columns: 5 }
  ];
  for (const window of windows) {
    await page.setViewportSize({ width: window.width, height: window.height });
    await page.goto(pagePath);
    await expect(page.locator('#result')).toBeVisible();
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.day-card')];
      return {
        clipped: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        columns: getComputedStyle(document.querySelector('#day-cards')).gridTemplateColumns.split(' ').length,
        cardWidths: cards.map(card => card.getBoundingClientRect().width),
        cardHeights: cards.map(card => card.getBoundingClientRect().height)
      };
    });
    expect(layout.clipped, `${window.width}px viewport clips horizontally`).toBe(false);
    expect(layout.columns).toBe(window.columns);
    expect(layout.cardWidths.every(width => width > 0 && width <= window.width)).toBe(true);
    if (window.width === 430) expect(layout.cardHeights[2]).toBeLessThan(layout.cardHeights[0]);
  }
});

test('the validation page has no serious accessibility findings', async ({ page }) => {
  await page.goto(pagePath);
  await expect(page.locator('#result')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});

test('local history is visible, downloadable, clearable, and never transmitted', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => requests.push(`${request.url()} ${request.postData() || ''}`));
  await page.goto(pagePath);
  await expect(page.getByText(/submitted place or coordinates go directly to the configured Nominatim geocoder/i)).toBeVisible();
  await expect(page.getByText(/history stays in this browser until you clear it/i)).toBeVisible();

  const marker = 'Harbor Secret 90817';
  await page.locator('#place').fill(marker);
  await page.getByRole('button', { name: 'Show five days' }).click();
  await expect(page.locator('#entered-name')).toHaveText(marker);
  await page.getByRole('button', { name: /Show local history \(2\)/ }).click();
  await expect(page.locator('#history-panel')).toBeFocused();
  await expect(page.locator('.history-entry')).toHaveCount(2);
  await expect(page.locator('.history-entry').first()).toContainText(marker);
  await expect(page.locator('.history-entry').first().getByText('Complete response')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('tide-here-history.json');
  const stream = await download.createReadStream();
  let downloaded = '';
  for await (const chunk of stream) downloaded += chunk;
  expect(JSON.parse(downloaded).at(-1).response.input.display).toBe(marker);

  const keysBeforeClear = await page.evaluate(() => Object.keys(localStorage));
  expect(keysBeforeClear).toContain('tide-here.history.v1');
  expect(keysBeforeClear).toContain('tide-here.station-catalogue.v2');
  expect(keysBeforeClear.some((key) => key.startsWith('tide-here.forecast.v1.'))).toBe(true);
  await page.getByRole('button', { name: 'Clear local history' }).click();
  await expect(page.getByText(/history cleared.*caches were left alone/i)).toBeVisible();
  await expect(page.getByText('No local forecast history yet.')).toBeVisible();
  const keysAfterClear = await page.evaluate(() => Object.keys(localStorage));
  expect(keysAfterClear).not.toContain('tide-here.history.v1');
  expect(keysAfterClear).toContain('tide-here.station-catalogue.v2');
  expect(keysAfterClear.some((key) => key.startsWith('tide-here.forecast.v1.'))).toBe(true);

  const requestCount = requests.length;
  await page.waitForTimeout(300);
  expect(requests).toHaveLength(requestCount);
  expect(requests.some((request) => request.includes(marker))).toBe(false);
});
