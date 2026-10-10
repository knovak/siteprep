const { test, expect } = require('@playwright/test');

const url = '/decks/eclipse-2027/sections/package-options/overview.html';
const rows = '#package-comparison-rows > tr';

test('eclipse comparison represents every package without changing its price or country', async ({ page }) => {
  await page.goto(url);
  await expect(page.locator(rows)).toHaveCount(35);
  const contents = await page.evaluate(() => {
    let country = '';
    const source = [];
    document.querySelectorAll('main h2, main .package-list > li[id^="package-"]').forEach((element) => {
      if (element.matches('h2')) { country = element.textContent.trim(); return; }
      source.push({ id: element.id, country,
        price: element.querySelector('.package-meta').textContent.split('Price:')[1].trim() });
    });
    const summary = Array.from(document.querySelectorAll('#package-comparison-rows > tr'), (row) => ({
      id: row.dataset.packageId, country: row.cells[1].textContent,
      price: row.cells[2].textContent,
    }));
    return { source, summary };
  });
  expect(contents.summary).toEqual(contents.source);
  await expect(page.locator('#comparison-count')).toHaveText('35 packages');
  await expect(page.locator(`${rows}[data-package-id="package-683"] .comparison-reviews`)).toContainText('personalized planning');
  await expect(page.locator(`${rows}[data-package-id="package-880"] .review-rank`)).toHaveText('Low');
  await expect(page.locator(`${rows}[data-package-id="package-829"] .review-rank`)).toHaveText('High');
  expect(await page.locator('#package-comparison').evaluate((heading) =>
    Boolean(heading.compareDocumentPosition(document.getElementById('maps')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});

test('all five headings sort in both directions, including numeric fares and evidence rank', async ({ page }) => {
  await page.goto(url);
  const expectations = [
    ['name', 'Al Wadi Boutique Hotel', 'Zero Expeditions'],
    ['country', 'Algeria', 'Tunisia'],
    ['price', '€1,570', 'US$10,000'],
    ['rank', 'High', 'Low'],
  ];
  for (const [column, first, reversed] of expectations) {
    const button = page.locator(`[data-sort="${column}"]`);
    await button.click();
    await expect(button.locator('..')).toHaveAttribute('aria-sort', column === 'rank' ? 'descending' : 'ascending');
    await expect(page.locator(rows).first()).toContainText(first);
    await button.press('Enter');
    await expect(button.locator('..')).toHaveAttribute('aria-sort', column === 'rank' ? 'ascending' : 'descending');
    await expect(page.locator(rows).first()).toContainText(reversed);
    await expect(page.locator('.comparison-table th[aria-sort="none"]')).toHaveCount(4);
  }
  const reviewButton = page.locator('[data-sort="reviews"]');
  await reviewButton.click();
  const ascending = await page.locator(`${rows} .comparison-reviews`).allTextContents();
  expect(ascending).toEqual([...ascending].sort(new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare));
  await reviewButton.click();
  const descending = await page.locator(`${rows} .comparison-reviews`).allTextContents();
  expect(descending).toEqual([...ascending].reverse());
  await expect(page.locator('#comparison-sort-status')).toHaveText('Sorted by reviews, descending.');
});

test('a future source refresh updates prices, review phrases, ranks and removed packages automatically', async ({ page }) => {
  await page.route(`**${url}`, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const updated = original
      .replace(/<li id="package-691"[\s\S]*?<\/li>/, '')
      .replace('€2,290; €750 deposit', '€2,500; €750 deposit')
      .replace('English and Italian searches found no dependable independent review corpus for this photographer’s tours.',
        'Independent reviews praise photography instruction: 100 reviews.')
      .replace('The workshop background describes instruction, but is the operator’s own material.', '')
      .replace('Hotels are unnamed. Repeat the review search before committing; no positive rating is inferred from an absence of reviews.', '');
    await route.fulfill({ response, body: updated });
  });
  await page.goto(url);
  await expect(page.locator(rows)).toHaveCount(34);
  await expect(page.locator('#comparison-count')).toHaveText('34 packages');
  await expect(page.locator(`${rows}[data-package-id="package-691"]`)).toHaveCount(0);
  const changed = page.locator(`${rows}[data-package-id="package-592"]`);
  await expect(changed.locator('.comparison-price')).toHaveText('€2,500; €750 deposit');
  await expect(changed.locator('.comparison-reviews')).toContainText('100 reviews');
  await expect(changed.locator('.review-rank')).toHaveText('High');
});

test('jump links reopen collapsed comparison and package topics', async ({ page }) => {
  await page.goto(url);
  const heading = page.locator('#package-comparison');
  await expect(heading.locator('.topic-toggle')).toBeVisible();
  await heading.locator('.topic-toggle').click();
  await expect(page.locator('.comparison-table')).toBeHidden();
  await page.locator('.comparison-jump').click();
  await expect(page.locator('.comparison-table')).toBeVisible();
  await expect(page).toHaveURL(/#package-comparison$/);
  await page.locator('#spain .topic-toggle').click();
  await page.locator(`${rows}[data-package-id="package-691"] a`).click();
  await expect(page.locator('#package-691')).toBeVisible();
  await expect(page).toHaveURL(/#package-691$/);
});

test('mobile comparison scrolls horizontally without widening the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator('.comparison-jump').click();
  const dimensions = await page.locator('.comparison-scroll').evaluate((element) => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    container: element.clientWidth,
    table: element.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.table).toBeGreaterThan(dimensions.container);
  await page.locator('[data-sort="rank"]').click();
  await expect(page.locator(rows).first().locator('.review-rank')).toHaveText('High');
});
