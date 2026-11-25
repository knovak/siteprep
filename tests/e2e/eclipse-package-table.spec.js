const { test, expect } = require('@playwright/test');

const url = '/decks/eclipse-2027/sections/package-options/overview.html';
const rows = '#package-comparison-rows > tr';

test('eclipse comparison preserves every package price, country and availability qualification', async ({ page }) => {
  await page.goto(url);
  const count = await page.locator('main .package-list > li[id^="package-"]').count();
  expect(count).toBeGreaterThan(0);
  await expect(page.locator(rows)).toHaveCount(count);
  const contents = await page.evaluate(() => {
    let country = '';
    const source = [];
    document.querySelectorAll('main h2, main .package-list > li[id^="package-"]').forEach((element) => {
      if (element.matches('h2')) { country = element.textContent.trim(); return; }
      const text = (selector, label) => element.querySelector(selector).textContent
        .replace(/\s+/g, ' ').trim().replace(label, '');
      source.push({ id: element.id, country,
        price: element.querySelector('.package-meta').textContent.split('Price:')[1].replace(/\s+/g, ' ').trim(),
        availability: text('.package-availability', /^Availability:\s*/),
        party: text('.party-availability', /^Four people, two rooms:\s*/) });
    });
    const summary = Array.from(document.querySelectorAll('#package-comparison-rows > tr'), (row) => ({
      id: row.dataset.packageId, country: row.cells[1].textContent,
      price: row.cells[2].textContent,
      availability: row.cells[3].textContent, party: row.cells[4].textContent,
    }));
    return { source, summary };
  });
  expect(contents.summary).toEqual(contents.source);
  await expect(page.locator('#comparison-count')).toHaveText(`${count} packages`);
  expect(contents.source.every((item) => item.availability && item.party)).toBe(true);
  await expect(page.locator(`${rows}[data-package-id="package-683"] .comparison-reviews`)).toContainText('personalized planning');
  await expect(page.locator(`${rows}[data-package-id="package-880"] .review-rank`)).toHaveText('Low');
  await expect(page.locator(`${rows}[data-package-id="package-519"] .review-rank`)).toHaveText('High');
  expect(await page.locator('#package-comparison').evaluate((heading) =>
    Boolean(heading.compareDocumentPosition(document.getElementById('maps')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});

test('all seven headings sort in both directions, including numeric fares and evidence rank', async ({ page }) => {
  await page.goto(url);
  const expectations = [
    ['country', 'Algeria', 'Tunisia'],
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
    await expect(page.locator('.comparison-table th[aria-sort="none"]')).toHaveCount(6);
  }
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  for (const column of ['name', 'availability', 'party', 'reviews']) {
    const button = page.locator(`[data-sort="${column}"]`);
    const selector = column === 'name' ? 'th a' : `.comparison-${column}`;
    await button.click();
    const ascending = await page.locator(`${rows} ${selector}`).allTextContents();
    expect(ascending).toEqual([...ascending].sort(collator.compare));
    await button.press('Enter');
    const descending = await page.locator(`${rows} ${selector}`).allTextContents();
    expect(descending).toEqual([...ascending].reverse());
  }
  await expect(page.locator('#comparison-sort-status')).toHaveText('Sorted by reviews, descending.');
  await page.locator('[data-sort="price"]').click();
  const fares = await page.locator(`${rows} .comparison-price`).allTextContents();
  const fare = (text) => {
    const match = text.match(/(US\$|€|£|USD|EUR|GBP)\s*([\d,]+(?:\.\d+)?)/);
    return match ? [({ 'US$': 'USD', '€': 'EUR', '£': 'GBP' })[match[1]] || match[1], Number(match[2].replaceAll(',', ''))] : null;
  };
  const compareFare = (a, b, direction = 1) => {
    const left = fare(a), right = fare(b);
    if (!left || !right) return left === right ? 0 : left ? -1 : 1;
    return direction * (collator.compare(left[0], right[0]) || left[1] - right[1]);
  };
  expect(fares).toEqual([...fares].sort(compareFare));
  await page.locator('[data-sort="price"]').click();
  expect(await page.locator(`${rows} .comparison-price`).allTextContents()).toEqual([...fares].sort((a, b) => compareFare(a, b, -1)));
});

test('checkbox filters combine countries and USD bands while preserving sorting', async ({ page }) => {
  await page.goto(url);
  const total = await page.locator(rows).count();
  const country = page.locator('[data-filter="country"]');
  const price = page.locator('[data-filter="price"]');
  const clear = page.getByRole('button', { name: 'Clear all column filters' });
  const box = (name) => page.getByRole('checkbox', { name, exact: true });
  const matches = page.locator(rows + '[data-package-id]');
  await expect(clear).toBeDisabled();
  await country.press('Enter');
  await box('Morocco').check();
  await box('Spain').check();
  await expect(country).toHaveText('2 selected');
  await box('Spain').press('Escape');
  await expect(country).toBeFocused();
  await expect(matches.locator('.comparison-country')).toContainText(['Spain', 'Morocco']);

  await price.click();
  await expect(page.getByRole('group', { name: 'Price', exact: true }).locator('label')).toHaveText([
    'Under US$5,000', 'US$5,000–US$10,000', 'Over US$10,000',
  ]);
  await box('US$5,000–US$10,000').check();
  // Both €4,799 and £4,499 cross US$5,000 after conversion.
  await expect(matches.locator('.comparison-price')).toContainText(['€4,799', '£4,499']);
  await expect(matches.filter({ hasText: 'Joe Capobianco' })).toHaveCount(0);
  await box('Under US$5,000').check();
  await expect(matches.filter({ hasText: 'Joe Capobianco' })).toHaveCount(1);
  // Keep the open, multi-selected menu in the downloadable browser report.
  const screenshotDir = process.env.CI ? 'playwright-report/screenshots' : 'screenshots';
  await page.screenshot({ path: screenshotDir + '/package-price-checkboxes.png' });
  expect((await matches.locator('.comparison-country').allTextContents())
    .every((value) => ['Morocco', 'Spain'].includes(value))).toBe(true);
  await page.locator('[data-sort="name"]').click();
  await expect(price).toHaveText('2 selected');

  await country.click();
  await box('Spain').uncheck();
  await page.locator('[data-filter="rank"]').click();
  await box('High').check();
  await price.click();
  await box('Under US$5,000').uncheck();
  await expect(page.locator('.comparison-empty')).toBeVisible();
  await expect(page.locator('#comparison-count')).toHaveText(`0 of ${total} packages`);
  await clear.click();
  await expect(matches).toHaveCount(total);
  await expect(country).toHaveText('All countries');
  await expect(clear).toBeDisabled();
  await expect(page.locator('[data-sort="name"]').locator('..')).toHaveAttribute('aria-sort', 'ascending');

  await page.locator('[data-filter="party"]').click();
  await box('Operator-reported fit (not held)').check();
  expect(await matches.evaluateAll((elements) => elements.map((row) => row.dataset.packageId).sort()))
    .toEqual(['package-240', 'package-973']);
  await box('Operator-reported fit (not held)').uncheck();
  await expect(matches).toHaveCount(total);
  await expect(clear).toBeDisabled();
});

test('a future source refresh updates prices, review phrases, ranks and removed packages automatically', async ({ page }) => {
  let expectedCount;
  await page.route(`**${url}`, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    expectedCount = (original.match(/<li id="package-/g) || []).length - 1;
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
  await expect(page.locator(rows)).toHaveCount(expectedCount);
  await expect(page.locator('#comparison-count')).toHaveText(`${expectedCount} packages`);
  await expect(page.locator(`${rows}[data-package-id="package-691"]`)).toHaveCount(0);
  const changed = page.locator(`${rows}[data-package-id="package-592"]`);
  await expect(changed.locator('.comparison-price')).toHaveText('€2,500; €750 deposit');
  await expect(changed.locator('.comparison-reviews')).toContainText('100 reviews');
  await expect(changed.locator('.review-rank')).toHaveText('High');
});

test('availability edits and missing room evidence propagate without inventing inventory', async ({ page }) => {
  await page.route(`**${url}`, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const updated = original.replace(/<li id="package-691"[\s\S]*?<\/li>/, (item) => item
      .replace(/<p class="package-availability">[\s\S]*?<\/p>/,
        '<p class="package-availability"><strong>Availability:</strong> Two seats only.</p>')
      .replace(/<p class="party-availability">[\s\S]*?<\/p>/, ''));
    await route.fulfill({ response, body: updated });
  });
  await page.goto(url);
  const row = page.locator(`${rows}[data-package-id="package-691"]`);
  await expect(row.locator('.comparison-availability')).toHaveText('Two seats only.');
  await expect(row.locator('.comparison-party')).toHaveText('Two rooms not confirmed');
  await page.getByRole('link', { name: 'Rejected and unverified options', exact: true }).click();
  await expect(page).toHaveURL(/overview-reject.html$/);
  await page.getByRole('link', { name: 'Back to Package options', exact: true }).click();
  await expect(page).toHaveURL(/overview.html$/);
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
