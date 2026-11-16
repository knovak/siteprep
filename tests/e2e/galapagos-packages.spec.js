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

test('Delfina follows the same stock-qualified rule and all nine dated price records remain in holding', async ({ page }) => {
  const delfinaIds = ['385', '701', '689', '702', '703', '704', '705', '706', '707'];
  const starts = ['2027-04-16', '2027-04-23', '2027-05-07', '2027-05-14', '2027-05-21', '2027-05-28', '2027-06-04', '2027-06-11', '2027-06-18'];
  const selector = delfinaIds.map((id) => `li#package-${id}`).join(', ');

  await page.goto(url);
  await expect(page.locator('article .card-header')).toContainText('April 15–June 20, 2027');
  await expect(page.locator(selector)).toHaveCount(0);
  await expect(page.locator('a[href="overview-reject.html#delfina-sailings"]').first()).toBeAttached();
  await expect(page.locator(rows)).toHaveCount(33);
  await expect(page.locator('body')).toContainText('Charlie and Cheryl Schaff');

  await page.goto(holding);
  const list = page.locator(selector);
  await expect(list).toHaveCount(9);
  const found = await list.evaluateAll((items) => items.map((item) => ({
    id: item.id,
    start: item.querySelector('.package-dates')?.dataset.start,
    title: item.querySelector(':scope > strong')?.textContent,
    price: item.querySelector('.package-price')?.textContent,
    stock: item.querySelector('.package-availability')?.textContent,
    party: item.querySelector('.party-availability')?.textContent,
    numeric: item.querySelector('.package-price')?.dataset.usd,
  })));
  expect(found.map((item) => item.id)).toEqual(delfinaIds.map((id) => `package-${id}`));
  expect(found.map((item) => item.start)).toEqual(starts);
  for (const record of found) {
    expect(record.title).toContain('Delfina');
    expect(record.price).toMatch(/Category 04.*Category 05/);
    expect(record.price).toContain('internal air');
    expect(record.stock.toLowerCase()).toContain('unverified');
    expect(record.party.toLowerCase()).toContain('unverified');
    expect(record.numeric).toBeUndefined();
  }
  await expect(page.locator('#delfina-sailings')).toContainText('Delfina');
  const all = await page.locator('li[id^="package-"]').evaluateAll((items) => items.map((item) => item.id));
  expect(new Set(all).size).toBe(all.length);
  await expect(page.locator('.comparison-table')).toHaveCount(0);

  await page.goto('/decks/ecuador/sections/galapagos-islands/overview.html');
  await expect(page.locator('#el-nino-effects')).toContainText('El Niño');
  await expect(page.locator('body')).toContainText('Charlie and Cheryl Schaff');
});

test('June refresh has six source-qualified departures with unverified two-cabin status', async ({ page }) => {
  await page.goto(url);
  const cases = [
    ['710', '2027-06-01', '13400'],
    ['711', '2027-06-03', '4893'],
    ['713', '2027-06-08', '4665'],
    ['714', '2027-06-10', '5150'],
    ['715', '2027-06-09', '5385'],
    ['716', '2027-06-17', '5616'],
  ];
  for (const [id, date, price] of cases) {
    const detail = page.locator(`li#package-${id}`);
    await expect(detail).toHaveCount(1);
    await expect(detail.locator('.package-dates')).toHaveAttribute('data-start', date);
    await expect(detail.locator('.package-price')).toHaveAttribute('data-usd', price);
    await expect(detail.locator('.package-availability')).toContainText('November 16, 2026');
    await expect(detail.locator('.package-availability a[href*="galapagosdanatours.com"]').first()).toHaveAttribute('href', /galapagosdanatours.com/);
    await expect(detail.locator('.party-availability')).toContainText('unverified');
    await expect(page.locator(`${rows}[data-package-id="package-${id}"]`)).toHaveCount(1);
  }
  const mainIds = await page.locator('li[id^="package-"]').evaluateAll((items) => items.map((item) => item.id));
  expect(new Set(mainIds).size).toBe(mainIds.length);
  await expect(page.locator('footer.site-footer')).toHaveCount(1);
});
