const { test, expect, devices } = require('@playwright/test');

const cairnsPage = '/decks/australia-october-2026/sections/cairns/overview.html';
const graphId = '#cairns-network-graph';
const blue = 'rgb(52, 152, 219)';
const gray = 'rgb(149, 165, 166)';

async function openGraph(page) {
  await page.goto(cairnsPage, { waitUntil: 'domcontentloaded' });
  await expect(page.locator(`${graphId} .traveltimeviz-link`).first()).toHaveAttribute('d', /^M/);
  // Let the actual deck's layout settle, then freeze it for precise pointer input.
  await page.waitForFunction(() => cairnsTravelViz._simulation.alpha() < 0.1);
  await page.evaluate(() => cairnsTravelViz._simulation.stop());
}

function route(page, from, to, time) {
  return page.locator(graphId).getByRole('button', { name: `${from} → ${to}: ${time}`, exact: true });
}

// SVG path bounding boxes contain empty space. Find a point on the actual line
// that is not covered by a node or a crossing route, and use real pointer input.
async function routePoint(line) {
  await line.scrollIntoViewIfNeeded();
  return line.evaluate(element => {
    const viewport = window.visualViewport;
    for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
      const point = element.getPointAtLength(element.getTotalLength() * fraction)
        .matrixTransform(element.getScreenCTM());
      // SVG geometry and hit testing use the layout viewport, while browser
      // input uses the visual viewport, which can pan separately on mobile.
      const x = point.x - (viewport?.offsetLeft ?? 0);
      const y = point.y - (viewport?.offsetTop ?? 0);
      if (x < 0 || y < 0 || x >= (viewport?.width ?? innerWidth) || y >= (viewport?.height ?? innerHeight)) continue;
      if (document.elementFromPoint(point.x, point.y) === element) return { x, y };
    }
    throw new Error(`No exposed point on ${element.getAttribute('aria-label')}`);
  });
}

async function clickRoute(page, line) {
  const point = await routePoint(line);
  await page.mouse.click(point.x, point.y);
}

async function expectHighlight(line, highlighted) {
  await expect(line).toHaveCSS('stroke', highlighted ? blue : gray);
  await expect.poll(() => line.evaluate(element => {
    const label = Array.from(element.closest('svg').querySelectorAll('.traveltimeviz-link-label'))
      .find(candidate => candidate.__data__ === element.__data__);
    return getComputedStyle(label).fill;
  })).toBe(highlighted ? blue : 'rgb(127, 140, 141)');
}

test('travel routes highlight their own curved labels and total any selected legs', async ({ page }) => {
  await openGraph(page);
  const total = page.locator(`${graphId} [role="status"]`);
  const ten = route(page, 'Herberton', '205 E Hill Road', '10m');
  const twenty = route(page, 'Herberton', 'Atherton', '20m');
  const thirty = route(page, 'Herberton', 'Yungaburra', '30m');
  const seventyFive = route(page, 'Herberton', 'Gordonvale', '1h15m');
  const reverse = route(page, '205 E Hill Road', 'Herberton', '10m');

  const labelOffset = await ten.evaluate(element => {
    const label = Array.from(element.closest('svg').querySelectorAll('.traveltimeviz-link-label'))
      .find(candidate => candidate.__data__ === element.__data__);
    const midpoint = element.getPointAtLength(element.getTotalLength() / 2);
    return Math.hypot(midpoint.x - Number(label.getAttribute('x')), midpoint.y - Number(label.getAttribute('y')));
  });
  expect(labelOffset).toBeLessThan(0.1);

  const point = await routePoint(ten);
  await page.mouse.move(point.x, point.y);
  await expectHighlight(ten, true);
  await expectHighlight(reverse, false);
  await expect(total).toHaveText('Selected travel time: 0m');
  await page.mouse.move(0, 0);
  await expectHighlight(ten, false);

  for (const [line, time] of [[ten, '10m'], [twenty, '30m'], [thirty, '1h'], [seventyFive, '2h15m']]) {
    await clickRoute(page, line);
    await page.mouse.move(0, 0);
    await expect(line).toHaveAttribute('aria-pressed', 'true');
    await expectHighlight(line, true);
    await expect(total).toHaveText(`Selected travel time: ${time}`);
  }
  await expectHighlight(ten, true);
  await expectHighlight(twenty, true);
  await expectHighlight(reverse, false);

  // Deselect while still hovering: both the stroke and time must clear now.
  await clickRoute(page, twenty);
  await expectHighlight(twenty, false);
  await expect(total).toHaveText('Selected travel time: 1h55m');
  await clickRoute(page, reverse);
  await expect(total).toHaveText('Selected travel time: 2h5m');
  await expectHighlight(ten, true);

  for (const [line, time] of [[ten, '1h55m'], [thirty, '1h25m'], [seventyFive, '10m'], [reverse, '0m']]) {
    await clickRoute(page, line);
    await expect(line).toHaveAttribute('aria-pressed', 'false');
    await expect(total).toHaveText(`Selected travel time: ${time}`);
  }
});

test('keyboard selection survives layout reset and stays isolated between graphs', async ({ page }) => {
  await openGraph(page);
  const line = route(page, 'Herberton', '205 E Hill Road', '10m');
  const total = page.locator(`${graphId} [role="status"]`);
  await line.focus();
  await expectHighlight(line, true);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expectHighlight(line, true);
  await expect(total).toHaveText('Selected travel time: 10m');
  await page.evaluate(() => cairnsTravelViz.resetNetwork());
  await expect(total).toHaveText('Selected travel time: 10m');
  await expectHighlight(line, true);

  await page.evaluate(() => {
    const second = document.createElement('div');
    second.id = 'second-network';
    document.querySelector('#cairns-network-graph').after(second);
    window.secondTravelViz = new TravelTimeViz(cairnsTravelLocations, cairnsTravelRoutes);
    secondTravelViz.renderNetwork('#second-network');
  });
  await expect(page.locator('#second-network [role="status"]')).toHaveText('Selected travel time: 0m');
  await expect(total).toHaveText('Selected travel time: 10m');
  await line.focus();
  await page.keyboard.press('Space');
  await expectHighlight(line, false);
  await expect(total).toHaveText('Selected travel time: 0m');

  await page.keyboard.press('Enter');
  await expect(total).toHaveText('Selected travel time: 10m');
  await page.evaluate(() => {
    cairnsTravelViz.destroy();
    cairnsTravelViz.renderNetwork('#cairns-network-graph');
  });
  await expect(total).toHaveText('Selected travel time: 0m');
  await expect(line).toHaveAttribute('aria-pressed', 'false');
});

test('touch taps select and remove a route without requiring hover', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices['Pixel 5'], baseURL });
  const page = await context.newPage();
  try {
    await openGraph(page);
    const line = route(page, 'Herberton', '205 E Hill Road', '10m');
    const total = page.locator(`${graphId} [role="status"]`);
    for (const [pressed, time] of [[true, '10m'], [false, '0m']]) {
      const point = await routePoint(line);
      await page.touchscreen.tap(point.x, point.y);
      await expect(line).toHaveAttribute('aria-pressed', String(pressed));
      await expectHighlight(line, pressed);
      await expect(total).toHaveText(`Selected travel time: ${time}`);
    }
  } finally {
    await context.close();
  }
});
