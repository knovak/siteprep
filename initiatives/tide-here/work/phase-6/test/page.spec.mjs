import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagePath = '/initiatives/tide-here/work/phase-6/index.html?fixture=1';

test('a forecast keeps tides visible and folds coast and astronomy details', async ({ page }, testInfo) => {
  await page.goto(pagePath);
  await expect(page.locator('#result')).toBeVisible();
  const coastDetails = page.locator('.identity-card');
  await expect(coastDetails).not.toHaveAttribute('open', '');
  await expect(coastDetails.locator('summary')).toContainText('SEATTLE');
  await expect(page.getByText('You entered', { exact: true })).toBeHidden();
  await coastDetails.locator('summary').click();
  await expect(page.getByText('You entered', { exact: true })).toBeVisible();
  await expect(page.locator('#entered-name')).toHaveText('Seattle');
  await expect(page.locator('#resolved-name')).toContainText('Seattle, Washington');
  await expect(page.locator('#coast-name')).toContainText('SEATTLE');
  await expect(page.locator('#station-name')).toContainText('SEATTLE');
  await expect(page.locator('#zone-name')).toHaveText('America/Los_Angeles');
  await expect(page.locator('.day-card')).toHaveCount(5);
  await expect(page.locator('.day-card').first().getByText('Tides', { exact: true })).toHaveCount(0);
  await expect(page.locator('.day-card').first().locator('.event-group li')).toHaveCount(4);
  await expect(page.locator('.day-card').first().locator('.event-group li.past')).toHaveCount(1);
  await expect(page.locator('.day-card').first().locator('.event-group li.future')).toHaveCount(3);
  await expect(page.locator('.day-card').first().locator('.event-group li.past .tide-label')).toHaveCSS('font-weight', '400');
  await expect(page.locator('.day-card').first().locator('.event-group li.future .tide-label').first()).toHaveCSS('font-weight', '800');
  const astronomyDetails = page.locator('.astronomy-details');
  await expect(astronomyDetails).toHaveCount(5);
  await expect(astronomyDetails.locator('[open]')).toHaveCount(0);
  await expect(astronomyDetails.first().locator('summary')).toContainText(/Sun and moon · Moonrise \d{1,2}:\d{2} [AP]M/);
  await expect(astronomyDetails.first().getByText('Sunrise', { exact: true })).toBeHidden();
  await astronomyDetails.first().locator('summary').click();
  await expect(astronomyDetails.first().getByText('Sunrise', { exact: true })).toBeVisible();
  await expect(page.getByText(/informational and are not for navigation or safety decisions/i)).toBeVisible();
  await expect(page.locator('#source-copy')).toContainText(/heights in metres relative to MLLW/i);
  await expect(page.getByText('No location permission needed', { exact: true })).toHaveCount(0);
  await expect(page.getByText('What is the coast doing here?', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Tide Here checks the coast before it shows a prediction station/i)).toHaveCount(0);
  const outputOrder = await page.evaluate(() => {
    const safety = document.querySelector('.safety-line');
    const source = document.querySelector('.source-details');
    const alternatives = document.querySelector('#chooser');
    const debug = document.querySelector('.debug-record');
    return {
      safetyBeforeSource: Boolean(safety.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING),
      sourceBeforeAlternatives: Boolean(source.compareDocumentPosition(alternatives) & Node.DOCUMENT_POSITION_FOLLOWING),
      alternativesBeforeDebug: Boolean(alternatives.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING)
    };
  });
  expect(outputOrder).toEqual({ safetyBeforeSource: true, sourceBeforeAlternatives: true, alternativesBeforeDebug: true });
  const sourceDetails = page.locator('.source-details');
  const alternativeCoasts = page.locator('#chooser');
  const debugRecord = page.locator('.debug-record');
  await expect(sourceDetails).not.toHaveAttribute('open', '');
  await expect(alternativeCoasts).toBeHidden();
  await expect(debugRecord).not.toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: /Show local history/ })).toBeHidden();
  await expect(page.getByText(/What leaves this device:/i)).toBeHidden();
  await debugRecord.locator('summary').click();
  await expect(page.getByRole('button', { name: /Show local history/ })).toBeVisible();
  await expect(page.getByText(/What leaves this device:/i)).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    const heights = await page.locator('.day-card').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
  }
});

test('an ambiguous coast shows the closest forecast first and keeps alternatives collapsed below it', async ({ page }) => {
  await page.goto(`${pagePath}&state=coast-choice-required`);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#chooser')).toBeVisible();
  await expect(page.locator('#chooser')).not.toHaveAttribute('open', '');
  await expect(page.locator('#choice-map')).toBeHidden();
  await expect(page.locator('.day-card')).toHaveCount(5);
  await expect(page.locator('#coast-name')).toHaveText('Eagle Harbor, Bainbridge Island');
  await expect(page.locator('#state-panel')).toBeHidden();
  await page.locator('#chooser summary').click();
  await expect(page.locator('#choice-map')).toBeVisible();
  const candidates = page.locator('.candidate');
  expect(await candidates.count()).toBeGreaterThan(0);
  expect(await candidates.count()).toBeLessThanOrEqual(2);
  await expect(page.getByRole('button', { name: /Eagle Harbor/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Port Blakely/ }).click();
  await expect(page.locator('#coast-name')).toHaveText('Port Blakely');
  await expect(page.locator('.day-card')).toHaveCount(5);
  await expect(page.locator('#chooser')).not.toHaveAttribute('open', '');
  await expect(page.locator('.candidate').first()).toBeHidden();
  await page.locator('#chooser summary').click();
  await expect(page.getByRole('button', { name: /Eagle Harbor/ })).toBeVisible();
});

test('the seven blocking or partial states have their own readable page treatment', async ({ page }) => {
  const expected = new Map([
    ['invalid-input', /place name or decimal coordinates/i],
    ['place-not-found', /was not found/i],
    ['geocoder-unavailable', /place lookup is unavailable/i],
    ['coverage-unavailable', /configured official ports and validated FES2022 model points/i],
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
  expect(new Set(messages).size).toBe(7);
});

test('errors and choices receive keyboard focus and narrow pages do not clip', async ({ page }) => {
  await page.goto(`${pagePath}&state=invalid-input`);
  await expect(page.locator('#state-panel')).toBeFocused();
  await page.getByRole('button', { name: 'Edit the entry' }).click();
  await expect(page.locator('#place')).toBeFocused();
  await page.goto(`${pagePath}&state=coast-choice-required`);
  await page.locator('#chooser summary').focus();
  await expect(page.locator('#chooser summary')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
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
        cardHeights: cards.map(card => card.getBoundingClientRect().height),
        secondDayBottom: cards[1].getBoundingClientRect().bottom
      };
    });
    expect(layout.clipped, `${window.width}px viewport clips horizontally`).toBe(false);
    expect(layout.columns).toBe(window.columns);
    expect(layout.cardWidths.every(width => width > 0 && width <= window.width)).toBe(true);
    if (window.width === 430) expect(layout.secondDayBottom, 'the first two days fit in the phone viewport').toBeLessThanOrEqual(window.height);
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
  await expect(page.locator('#entered-name')).toHaveText('Seattle');
  await page.locator('.debug-record summary').click();
  await expect(page.getByText(/go directly to the configured Nominatim geocoder/i)).toBeVisible();
  await expect(page.getByText(/history stays in this browser until you clear it/i)).toBeVisible();

  const marker = 'Harbor Secret 90817';
  await page.locator('#place').fill(marker);
  await page.getByRole('button', { name: 'Show selection' }).click();
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

test('Show here requests browser location only after a click and uses the coordinate path', async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          calls += 1;
          success({ coords: { latitude: 47.6062, longitude: -122.3321 } });
        }
      }
    });
    Object.defineProperty(window, 'locationRequestCount', { get: () => calls });
  });
  await page.goto(pagePath);
  await expect(page.getByText(/asks your browser for location permission/i)).toBeVisible();
  expect(await page.evaluate(() => window.locationRequestCount)).toBe(0);
  await page.getByRole('button', { name: 'Show here' }).click();
  await expect(page.locator('#place')).toHaveValue('47.60620, -122.33210');
  await expect(page.locator('#entered-name')).toHaveText('47.60620, -122.33210');
  expect(await page.evaluate(() => window.locationRequestCount)).toBe(1);
});

test('location denial leaves the manual selection untouched', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition(_success, error) { error({ code: 1 }); } }
    });
  });
  await page.goto(pagePath);
  await expect(page.locator('#result')).toBeVisible();
  await page.locator('#place').fill('Halifax');
  await page.getByRole('button', { name: 'Show here' }).click();
  await expect(page.locator('#place')).toHaveValue('Halifax');
  await expect(page.locator('#state-panel')).toHaveAttribute('data-code', 'location-permission-denied');
  await expect(page.locator('#state-panel')).toContainText(/allow location for this Site/i);
});

test('Brisbane uses a stored Australian test port and keeps its fixture notice inside the location dropdown', async ({ page }) => {
  await page.route('**/forecast', async (route) => {
    const request = route.request().postDataJSON();
    expect(request.provider).toBe('australia-standard-ports');
    const station = {
      provider: request.provider,
      country: 'AU',
      id: request.station.id,
      name: 'Brisbane sample',
      kind: 'reference',
      datum: 'Chart datum (fixture label)',
      referenceStationId: null,
    };
    const days = request.rows.map((row) => ({
      date: row.date,
      tides: [2, 8, 14, 20].map((hour, index) => ({
        type: index % 2 === 0 ? 'low' : 'high',
        at: new Date(Date.parse(row.startUtc) + hour * 60 * 60 * 1000).toISOString(),
        height: index % 2 === 0 ? 0.45 : 1.62,
        unit: 'm',
      })),
      sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null,
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        input: request.context.input,
        place: request.context.place,
        coast: request.context.coast,
        station,
        timeZone: request.timeZone,
        days,
        sources: [{provider: request.provider, dataClass: 'test-fixture', official: false}],
        warnings: [{
          code: 'fixture-data',
          message: 'Synthetic Stage 3 fixture only; no Bureau or Australian Hydrographic Office predictions are included.',
        }],
      }),
    });
  });
  await page.goto(`${pagePath}&place=Brisbane`);
  await expect(page.locator('#fixture-note')).toContainText(/Australian fixture predictions still come from this Tide Here test service/i);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#coast-name')).toContainText('Brisbane');
  await expect(page.locator('#station-kind')).toContainText('Australian test port');
  await expect(page.locator('#zone-name')).toHaveText('Australia/Brisbane');
  await expect(page.locator('.day-card')).toHaveCount(5);
  await expect(page.locator('.event-group li')).toHaveCount(20);
  await expect(page.locator('#state-panel')).toBeHidden();
  await expect(page.locator('#warnings [data-code="fixture-data"]')).toHaveCount(0);
  const identity = page.locator('.identity-card');
  const fixtureNotice = page.locator('#fixture-location-notice');
  await expect(identity).not.toHaveAttribute('open', '');
  await expect(fixtureNotice).toBeHidden();
  await identity.locator('summary').click();
  await expect(fixtureNotice).toBeVisible();
  await expect(fixtureNotice).toHaveText('Australian test-port results use synthetic fixture data, not official tide predictions.');
  await expect(identity.locator('.identity-details #fixture-location-notice')).toHaveCount(1);
  await page.locator('.source-details summary').click();
  await expect(page.locator('#source-copy')).toContainText(/Australian test port synthetic fixture/i);
  await page.locator('.debug-record summary').click();
  await expect(page.getByText(/Australian tide-port requests and available FES2022 model lookups go to this Tide Here service/i)).toBeVisible();
});

test('licensed Brisbane results identify the Bureau source and need no fixture notice', async ({ page }) => {
  await page.route('**/forecast', async (route) => {
    const request = route.request().postDataJSON();
    const station = {
      provider: request.provider,
      country: 'AU',
      id: request.station.id,
      name: 'Brisbane Bar',
      kind: 'reference',
      datum: 'Lowest Astronomical Tide (LAT)',
      referenceStationId: null,
    };
    const days = request.rows.map((row) => ({
      date: row.date,
      tides: [2, 8, 14, 20].map((hour, index) => ({
        type: index % 2 === 0 ? 'low' : 'high',
        at: new Date(Date.parse(row.startUtc) + hour * 60 * 60 * 1000).toISOString(),
        height: index % 2 === 0 ? 0.45 : 1.62,
        unit: 'm',
      })),
      sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null,
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        input: request.context.input,
        place: request.context.place,
        coast: request.context.coast,
        station,
        timeZone: request.timeZone,
        days,
        sources: [{
          provider: request.provider,
          dataClass: 'licensed-source',
          official: true,
          attribution: '© Commonwealth of Australia 2025, Bureau of Meteorology.',
          disclaimer: 'The Bureau makes no representation and gives no warranty for this modified product.',
          sourceUrl: 'https://www.bom.gov.au/ntc/IDO59001/IDO59001_2026_QLD_TP003.pdf',
        }],
        warnings: [],
      }),
    });
  });
  await page.goto(`${pagePath}&place=Brisbane`);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#coast-name')).toContainText('Brisbane Bar');
  await expect(page.locator('#station-kind')).toContainText('Bureau of Meteorology');
  await expect(page.locator('#fixture-location-notice')).toBeHidden();
  await expect(page.locator('#state-panel')).toBeHidden();
  await page.locator('.source-details summary').click();
  await expect(page.locator('#source-attribution')).toContainText(/Commonwealth of Australia.*Bureau of Meteorology/);
  await expect(page.locator('#source-disclaimer')).toContainText(/no representation and gives no warranty/i);
  await expect(page.locator('#source-link')).toHaveAttribute('href', /IDO59001_2026_QLD_TP003[.]pdf/);
});

test('a declined official coast can render an attributed approximate FES2022 result', async ({page}) => {
  const station = {
    provider: 'fes2022', country: 'IE', id: 'fes2022-galway', name: 'FES2022 near Galway',
    kind: 'model-point', latitude: 53.27, longitude: -9.05, timeZone: 'Europe/Dublin',
    datum: 'FES2022 mean sea level harmonic datum', referenceStationId: null,
  };
  await page.route('**/resolve', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({provider: 'fes2022', latitude: 53.27, longitude: -9.05});
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({provider: 'fes2022', station, coast: {name: station.name, distanceKm: 0}}),
    });
  });
  await page.route('**/forecast', async route => {
    const request = route.request().postDataJSON();
    expect(request.provider).toBe('fes2022');
    expect(request.station).toMatchObject({latitude: 53.27, longitude: -9.05});
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        input: request.context.input,
        place: request.context.place,
        coast: request.context.coast,
        station,
        timeZone: station.timeZone,
        days: request.rows.map(row => ({
          date: row.date,
          tides: [{type: 'high', at: new Date(Date.parse(row.startUtc) + 6 * 60 * 60 * 1000).toISOString(), height: 1.2, unit: 'm'}],
          sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null,
        })),
        sources: [{
          provider: 'fes2022', dataClass: 'licensed-source', official: false, approximate: true,
          attribution: 'FES2022 funded by CNES and produced by LEGOS, NOVELTIS and CLS; transformed by Tide Here.',
          disclaimer: 'Interpolated and transformed model output; not for navigation.',
          sourceUrl: 'https://doi.org/10.24400/527896/A01-2024.004',
          licenceUrl: 'https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf',
        }],
        warnings: [{code: 'approximate-fallback', message: 'Approximate model; weather and storm surge are not included.'}],
      }),
    });
  });
  await page.goto(`${pagePath}&place=53.27,-9.05`);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#station-kind')).toContainText('FES2022 approximate model');
  await expect(page.locator('#state-panel')).toHaveAttribute('data-code', 'approximate-fallback');
  await page.locator('.source-details summary').click();
  await expect(page.locator('#source-attribution')).toContainText(/CNES.*LEGOS.*NOVELTIS.*CLS/);
  await expect(page.locator('#source-link')).toHaveAttribute('href', /doi[.]org\/10[.]24400/);
  await expect(page.locator('#licence-link')).toHaveAttribute('href', /License_Aviso[.]pdf/);
});
