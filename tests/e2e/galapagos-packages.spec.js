const { test, expect } = require('@playwright/test');
const path = require('node:path');

const deck = '/decks/ecuador';
const url = `${deck}/sections/galapagos-packages/overview.html`;
const holding = `${deck}/sections/galapagos-packages/overview-reject.html`;
const notes = `${deck}/galapagos-research-notes.html`;
const rows = '#package-comparison-rows > tr';
const script = path.join(__dirname, '../../decks/ecuador/assets/package-table.js');
const filtersScript = path.join(__dirname, '../../shared/package_table_filters.js');

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
  await page.addScriptTag({ path: filtersScript });
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

test('guest, duration, USD price and room-evidence filters compose without breaking sorting', async ({ page }) => {
  await page.goto(url);
  const total = await page.locator(rows).count();
  const byShip = page.locator('[data-filter="ship"]');
  const byDays = page.locator('[data-filter="dates"]');
  const byPrice = page.locator('[data-filter="price"]');
  const byRooms = page.locator('[data-filter="party"]');
  const clear = page.getByRole('button', { name: 'Clear all column filters' });

  await expect(byShip.locator('option')).toContainText([
    'All guest capacities', '16 guests', '20 guests', '20 or 36 guests (vessel unassigned)',
    '32 guests', '40 guests',
  ]);
  await expect(byDays.locator('option')).toContainText([
    'All trip lengths', '5 days', '6 days', '8 days', '10 days',
  ]);
  const roomChoices = await byRooms.locator('option').allTextContents();
  expect(roomChoices).toContain('Two-cabin quote (not held)');
  await expect(clear).toBeDisabled();
  await byShip.selectOption('16 guests');
  await byDays.selectOption('5 days');
  const subset = page.locator(rows + '[data-package-id]');
  expect(await subset.count()).toBeGreaterThan(0);
  expect(await subset.count()).toBeLessThan(total);
  for (const item of await subset.all()) {
    await expect(item.locator('.comparison-ship')).toContainText('16 guests');
    await expect(item.locator('.comparison-dates')).toContainText('5 days / 4 nights');
  }
  await byPrice.selectOption('USD:under');
  expect(await subset.count()).toBeGreaterThan(0);
  for (const id of await subset.evaluateAll((elements) => elements.map((row) => row.dataset.packageId))) {
    const numeric = await page.locator('#' + id + ' .package-price').getAttribute('data-usd');
    expect(Number(numeric)).toBeLessThan(5000);
  }
  await byRooms.selectOption('Two cabins not verified');
  const expected = await subset.count();
  await page.locator('[data-sort="price"]').click();
  await expect(subset).toHaveCount(expected);
  await expect(page.locator('[data-sort="price"]').locator('..')).toHaveAttribute('aria-sort', 'ascending');

  await byShip.selectOption('32 guests');
  await expect(page.locator('.comparison-empty')).toBeVisible();
  await expect(page.locator('#comparison-count')).toContainText(`0 of ${total} packages`);
  await clear.click();
  await expect(clear).toBeDisabled();
  await expect(page.locator(rows)).toHaveCount(total);
  await expect(page.locator('#comparison-count')).toContainText(`${total} packages.`);
  await expect(page.locator('[data-sort="price"]').locator('..')).toHaveAttribute('aria-sort', 'ascending');
  await byRooms.selectOption('Two-cabin quote (not held)');
  await expect(page.locator(rows)).toHaveCount(7);
  expect(await subset.evaluateAll((elements) => elements.map((row) => row.dataset.packageId).sort()))
    .toEqual(['package-138', 'package-404', 'package-461', 'package-582', 'package-607', 'package-872', 'package-976']);
  await byRooms.selectOption('Named cabins listed (not held)');
  await expect(page.locator(rows)).toHaveCount(1);
  await expect(page.locator(rows)).toHaveAttribute('data-package-id', 'package-706');
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

test('Delfina date-specific booking lead is distinct from actual two-cabin proof; other eight are user-reported full', async ({ page }) => {
  const ids = ['385', '701', '689', '702', '703', '704', '705', '707'];
  const starts = ['2027-04-16', '2027-04-23', '2027-05-07', '2027-05-14', '2027-05-21', '2027-05-28', '2027-06-04', '2027-06-18'];
  await page.goto(url);
  await expect(page.locator('article .card-header')).toContainText('April 15–June 20, 2027');
  const june = page.locator('#package-706');
  await expect(june).toHaveCount(1);
  await expect(june.locator('.package-dates')).toHaveAttribute('data-start', '2027-06-11');
  await expect(june.locator('.package-price')).toHaveAttribute('data-usd', '15570');
  await expect(june.locator('.package-availability')).toContainText('reported November 16, 2026');
  await expect(june.locator('a[href*="DAGALADA-270611"]').first()).toHaveAttribute('href', /DAGALADA-270611/);
  await expect(june.locator('.party-availability')).toContainText('unverified');
  await expect(june.locator('.party-availability')).toContainText('301 (port) and 302 (starboard)');
  await expect(page.locator('[data-package-id="package-706"]')).toHaveCount(1);
  await expect(page.locator('#cabin-audit')).toContainText('Two-cabin availability evidence');
  await expect(page.locator('body')).toContainText('Charlie and Cheryl Schaff');
  for (const id of ids) await expect(page.locator(`li#package-${id}`)).toHaveCount(0);

  await page.goto(holding);
  await expect(page.locator('#delfina-sailings')).toContainText('eight user-reported full');
  await expect(page.locator('li#package-706')).toHaveCount(0);
  const found = await page.locator(ids.map(id => `li#package-${id}`).join(', ')).evaluateAll(items => items.map(item => ({
    id: item.id,
    start: item.querySelector('.package-dates')?.dataset.start,
    title: item.querySelector(':scope > strong')?.textContent,
    price: item.querySelector('.package-price')?.textContent,
    stock: item.querySelector('.package-availability')?.textContent,
    party: item.querySelector('.party-availability')?.textContent,
    numeric: item.querySelector('.package-price')?.dataset.usd,
  })));
  expect(found.map(it => it.id)).toEqual(ids.map(id => `package-${id}`));
  expect(found.map(it => it.start)).toEqual(starts);
  for (const it of found) {
    expect(it.title).toContain('Delfina');
    expect(it.price).toMatch(/Category 04.*Category 05/);
    expect(it.price).toContain('internal air');
    expect(it.stock).toContain('Reported full by the user');
    expect(it.stock).toContain('independent operator status unverified');
    expect(it.party).toContain('independently unverified');
    expect(it.numeric).toBeUndefined();
  }
  await expect(page.locator('a[href="overview.html#package-706"]').first()).toBeAttached();
  const all = await page.locator('li[id^="package-"]').evaluateAll(items => items.map(it => it.id));
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

test('new research distinguishes extension-inclusive USD prices from split-currency fares', async ({ page }) => {
  await page.goto(url);
  await expect(page.locator('.package-list > li').filter({ has: page.locator('strong', { hasText: /^O\.A\.T\. —/ }) })).toHaveCount(20);
  for (const [id, price] of [['564', '10898'], ['154', '10298'], ['848', '10398'], ['156', '9698']]) {
    await expect(page.locator(`#package-${id} .package-price`)).toHaveAttribute('data-usd', price);
  }
  for (const id of ['661', '396', '778', '838']) {
    const price = page.locator(`#package-${id} .package-price`);
    await expect(price).toContainText('US$880');
    expect(await price.getAttribute('data-usd')).toBeNull();
  }
  await expect(page.locator('#package-976 .package-dates')).toContainText('Sun Jun 20');
});
