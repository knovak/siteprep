const { test, expect } = require('@playwright/test');
const path = require('node:path');

const deck = '/decks/ecuador';
const url = `${deck}/sections/galapagos-packages/overview.html`;
const holding = `${deck}/sections/galapagos-packages/overview-reject.html`;
const notes = `${deck}/galapagos-research-notes.html`;
const rows = '#package-comparison-rows > tr';
const script = path.join(__dirname, '../../decks/ecuador/assets/package-table.js');

test('the comparison keeps all source records and their availability and review qualifications', async ({ page }) => {
  await page.goto(url);
  const source = await page.locator('.package-list > li[id^="package-"]').evaluateAll((items) => items.map((item) => {
    const text = (selector) => {
      const paragraph = item.querySelector(selector).cloneNode(true);
      const label = paragraph.querySelector(':scope > strong');
      if (label && /:\s*$/.test(label.textContent)) label.remove();
      return paragraph.textContent.replace(/\s+/g, ' ').trim();
    };
    return {
      id: item.id,
      price: text('.package-price'),
      availability: text('.package-availability'),
      party: text('.party-availability'),
      provider: text('.provider-reviews'),
      vessel: text('.ship-reviews'),
    };
  }));
  expect(source.length).toBeGreaterThan(0);
  await expect(page.locator(rows)).toHaveCount(source.length);
  expect(await page.locator(rows).evaluateAll((elements) => elements.map((element) => element.dataset.packageId)))
    .toEqual(source.map((item) => item.id));
  for (const item of source) {
    const row = page.locator(`${rows}[data-package-id="${item.id}"]`);
    await expect(row.locator('th a')).toHaveAttribute('href', `#${item.id}`);
    for (const field of ['price', 'availability', 'party', 'provider', 'vessel']) {
      await expect(row.locator(`.comparison-${field}`)).toHaveText(item[field]);
    }
  }
  await expect(page.locator('.comparison-table thead button')).toHaveCount(8);
  await expect(page.locator('footer.site-footer')).toHaveCount(1);
});

test('sorts use capacity, dates and comparable prices; missing evidence remains unknown', async ({ page }) => {
  await page.setContent(`
    <div id="package-comparison"></div>
    <ul class="package-list">
      <li id="package-528"><strong>Zulu <span class="item-id">{528}</span>:</strong>
        <p class="package-ship" data-pax="32"><strong>Ship:</strong> Zulu yacht; 32 guests</p>
        <p class="package-dates" data-start="2027-05-01"><strong>Dates:</strong> May 1–8, 2027</p>
        <p class="package-price" data-usd="10000"><strong>Price:</strong> USD 10,000 per person; airfare unknown</p>
        <p class="package-availability"><strong>Zulu stock statement</strong></p>
        <p class="party-availability"><strong>Two cabins:</strong> Zulu allocation requires confirmation</p>
        <p class="provider-reviews"><strong>Provider reviews:</strong> Zulu mixed evidence</p>
        <p class="ship-reviews"><strong>Vessel reviews:</strong> Zulu small sample</p>
      </li>
      <li id="package-311"><strong>Alpha <span class="item-id">{311}</span>:</strong>
        <p class="package-ship" data-pax="16"><strong>Ship:</strong> Alpha yacht; 16 guests</p>
        <p class="package-dates" data-start="2027-04-28"><strong>Dates:</strong> April 28–May 5, 2027</p>
        <p class="package-price" data-usd="9500"><strong>Price:</strong> USD 9,500 per person; flights included</p>
        <p class="package-availability"><strong>Availability:</strong> Alpha stock statement</p>
        <p class="party-availability"><strong>Two cabins:</strong> Alpha two cabins listed</p>
        <p class="provider-reviews"><strong>Provider reviews:</strong> Alpha old evidence</p>
        <p class="ship-reviews"><strong>Vessel reviews:</strong> Alpha sample unavailable</p>
      </li>
      <li id="package-872"><strong>Unknown <span class="item-id">{872}</span>:</strong>
        <p class="package-ship" data-pax="">Capacity unknown</p>
        <p class="package-dates" data-start="2027-02-30">Dates unknown</p>
        <p class="package-price" data-usd="unknown">Price unknown</p>
      </li>
    </ul>`);
  await page.addScriptTag({ path: script });
  const identities = () => page.locator(rows).evaluateAll((elements) => elements.map((element) => element.dataset.packageId));
  expect(await identities()).toEqual(['package-528', 'package-311', 'package-872']);
  for (const field of ['ship', 'dates', 'price']) {
    const button = page.locator(`[data-sort="${field}"]`);
    await button.click();
    expect(await identities()).toEqual(['package-311', 'package-528', 'package-872']);
    await expect(button.locator('..')).toHaveAttribute('aria-sort', 'ascending');
    await button.press('Enter');
    expect(await identities()).toEqual(['package-528', 'package-311', 'package-872']);
    await expect(button.locator('..')).toHaveAttribute('aria-sort', 'descending');
    await expect(page.locator('.comparison-table thead th[aria-sort="none"]')).toHaveCount(7);
  }
  const unknown = page.locator(`${rows}[data-package-id="package-872"]`);
  await expect(unknown.locator('.comparison-party')).toHaveText('Two private cabins not confirmed');
  await expect(unknown.locator('.comparison-availability')).toHaveText('General availability not verified');
  await expect(unknown.locator('.comparison-vessel')).toHaveText('Vessel review evidence not assessed');
  await expect(unknown.locator('.comparison-price')).toHaveText('Price unknown');
  await expect(page.locator(`${rows}[data-package-id="package-528"] .comparison-availability`))
    .toHaveText('Zulu stock statement');

  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  for (const field of ['name', 'availability', 'party', 'provider', 'vessel']) {
    const button = page.locator(`[data-sort="${field}"]`);
    await button.click();
    const ascending = await page.locator(`${rows} .comparison-${field}`).allTextContents();
    expect(ascending).toEqual([...ascending].sort(collator.compare));
    await button.press('Enter');
    expect(await page.locator(`${rows} .comparison-${field}`).allTextContents()).toEqual([...ascending].reverse());
  }
  expect(await page.locator('.package-list > li').evaluateAll((elements) => elements.map((element) => element.id)))
    .toEqual(['package-528', 'package-311', 'package-872']);
});

test('detail links open collapsed evidence and the comparison stays within a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('.topic-toggle').first()).toBeVisible();
  const item = page.locator('.package-list > li[id^="package-"]').first();
  const id = await item.getAttribute('id');
  const topicId = await item.evaluate((element) => element.closest('.topic-body')?.id);
  expect(topicId).toBeTruthy();
  await page.locator(`[aria-controls="${topicId}"]`).click();
  await expect(item).toBeHidden();
  await page.locator(`${rows}[data-package-id="${id}"] th a`).click();
  await expect(item).toBeVisible();
  const dimensions = await page.locator('.comparison-scroll').evaluate((element) => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    container: element.clientWidth,
    table: element.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.table).toBeGreaterThan(dimensions.container);
});

test('research notes and holding records are linked and receive one shared footer', async ({ page }) => {
  for (const source of [url, holding]) {
    await page.goto(source);
    await page.locator('a[href$="galapagos-research-notes.html"]').first().click();
    await expect(page).toHaveURL(new RegExp(`${notes.replaceAll('.', '\\.')}$`));
    await expect(page.locator('h1')).toContainText(/Galápagos|Galapagos/);
    await expect(page.locator('main h2').first()).toBeVisible();
    await expect(page.locator('footer.site-footer')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Back to Galápagos packages', exact: true }))
      .toHaveAttribute('href', './sections/galapagos-packages/overview.html');
    await expect(page.getByRole('link', { name: 'Rejected options and research holding', exact: true }))
      .toHaveAttribute('href', './sections/galapagos-packages/overview-reject.html');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.goto(holding);
  await expect(page.locator('.comparison-table, .map-container')).toHaveCount(0);
});
