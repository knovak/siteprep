// The SBDC Night-Sky Simulator beta, driven in a real browser.
//
// The beta's own Node suites (initiatives/sbdc-night-sky/beta/test/) cover the
// model, and the site build runs them before it publishes the beta. They do
// not load the page. This file does: it checks that the controls reach the
// model, which is where the faults fixed in the beta upgrade were (a custom
// shell list that was ignored, a compass label that named the wrong
// direction, a time label that named the wrong kind of time).
//
// Each upgrade unit adds its checks here, so one run of the Playwright suite
// covers the whole beta. See "Beta upgrade plan" in
// initiatives/sbdc-night-sky/plan.md.

const { test, expect } = require('@playwright/test');

const BETA = '/demos/SBDC%20Night%20Sky/beta/index.html';

test.use({ serviceWorkers: 'block' });

/** Numbers in the readout line under the sky. */
function parseReadout(text) {
  const number = (re) => {
    const m = text.match(re);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  };
  return {
    above: number(/SBDCs above horizon ([\d,]+)/),
    visible: number(/naked-eye VISIBLE ([\d,]+)/),
    visibleInView: number(/naked-eye VISIBLE [\d,]+ \(([\d,]+) in view\)/),
    stars: number(/visible stars ([\d,]+)/),
    starsInView: number(/visible stars [\d,]+ \(([\d,]+) in view\)/),
  };
}

/** Open the beta and wait for its first picture. Collects errors and requests. */
async function openBeta(page) {
  const problems = { errors: [], requests: [] };
  page.on('pageerror', (error) => problems.errors.push(String(error)));
  page.on('request', (request) => {
    if (!request.url().endsWith(BETA)) problems.requests.push(request.url());
  });
  await page.goto(BETA);
  await settled(page);
  return problems;
}

/** Wait until the simulator has finished computing and drawn a readout. */
async function settled(page) {
  await page.waitForFunction(() => {
    const busy = document.getElementById('busy');
    const readout = document.getElementById('readout');
    return busy && readout && getComputedStyle(busy).visibility === 'hidden' &&
      /SBDCs above horizon/.test(readout.textContent) && !document.getElementById('errbar');
  });
}

const readout = async (page) => parseReadout(await page.locator('#readout').textContent());

/** Choose a shell option and wait for the constellation it builds. */
async function chooseShells(page, value) {
  await page.locator('#shells').selectOption(value);
  await settled(page);
}

test.describe('SBDC beta', () => {
  test('opens offline with a readout, facing north, in solar time', async ({ page }) => {
    const problems = await openBeta(page);
    const first = await readout(page);
    expect(first.above).toBeGreaterThan(1000);
    expect(first.visible).toBeGreaterThan(0);

    // The opening view faces north. The label used to read 180 until the
    // first drag.
    await expect(page.locator('#compass')).toHaveText('facing 0°');
    // The time is local solar time, and the label and readout say so.
    await expect(page.locator('label[for="time"]')).toContainText('Solar time');
    await expect(page.locator('#readout-sub')).toContainText('solar time (30 min after sunset)');

    expect(problems.errors).toEqual([]);
    expect(problems.requests).toEqual([]);
  });

  test('custom shells typed after choosing Custom are used', async ({ page }) => {
    const problems = await openBeta(page);
    await chooseShells(page, 'low');
    const low = await readout(page);
    await chooseShells(page, 'spread');
    const spread = await readout(page);
    expect(spread.above).not.toBe(low.above);

    // Choose Custom first, with the box still empty: nothing changes yet.
    await page.locator('#shells').selectOption('custom');
    await expect(page.locator('#shells-custom-input')).toBeVisible();
    expect((await readout(page)).above).toBe(spread.above);

    // Type the same shells as the Low option. Before the fix this was ignored
    // until another option was chosen and Custom was chosen again.
    await page.locator('#shells-custom-input').fill('550:0.5, 650:0.5');
    await page.locator('#shells-custom-input').press('Enter');
    await settled(page);
    await expect.poll(async () => (await readout(page)).above).toBe(low.above);
    await expect(page.locator('#shells-custom-hint')).toHaveText('550 km 50% · 650 km 50%');

    // A second spec replaces the first.
    await page.locator('#shells-custom-input').fill('1800:1');
    await page.locator('#shells-custom-input').press('Enter');
    await settled(page);
    await expect.poll(async () => (await readout(page)).above).toBeGreaterThan(low.above);

    // Text that is not a shell list leaves the shells in use, and says so.
    const before = await readout(page);
    await page.locator('#shells-custom-input').fill('lots of satellites');
    await page.locator('#shells-custom-input').press('Enter');
    await expect(page.locator('#shells-custom-hint')).toContainText('unchanged');
    expect((await readout(page)).above).toBe(before.above);

    expect(problems.errors).toEqual([]);
  });

  test('the readout separates the whole sky from the part in view', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#jump-dusk60').click();
    await expect(page.locator('#readout-sub')).toContainText('60 min after sunset');
    const north = await readout(page);
    expect(north.visibleInView).not.toBeNull();
    expect(north.visibleInView).toBeLessThanOrEqual(north.visible);
    expect(north.starsInView).toBeLessThanOrEqual(north.stars);

    // Turning the view changes what is in it and leaves the sky totals alone.
    // The compass follows the keyboard as well as the pointer.
    await page.locator('#sky').hover();
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('#compass')).toHaveText('facing 90°');
    const east = await readout(page);
    expect(east.visible).toBe(north.visible);
    expect(east.stars).toBe(north.stars);
    expect(east.visibleInView).not.toBe(north.visibleInView);

    // The all-sky view shows the whole sky, so it gives one number.
    await page.locator('#viewmode').selectOption('fisheye');
    await expect(page.locator('#readout')).not.toContainText('in view');
    expect((await readout(page)).visible).toBe(north.visible);

    expect(problems.errors).toEqual([]);
  });

  test('the Satellites slider reaches 500,000', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#nsats').fill('85');
    await expect(page.locator('#nsats-label')).toHaveText('500,000');
    await page.locator('#nsats').fill('74');
    await expect(page.locator('#nsats-label')).toHaveText('300,000');
    expect(problems.errors).toEqual([]);
  });

  test('French labels follow the language switch', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#lang-toggle').click();
    await expect(page.locator('label[for="time"]')).toContainText('Heure solaire');
    await expect(page.locator('#compass')).toHaveText('cap 0°');
    await expect(page.locator('#readout-sub')).toContainText('heure solaire (30 min après le coucher)');
    await page.locator('#lang-toggle').click();
    await expect(page.locator('#compass')).toHaveText('facing 0°');
    expect(problems.errors).toEqual([]);
  });

  test('every preset loads and draws', async ({ page }) => {
    const problems = await openBeta(page);
    const options = await page.locator('#preset option').evaluateAll((list) =>
      list.filter((o) => o.value !== '').map((o) => ({ value: o.value, name: o.textContent })));
    expect(options.length).toBeGreaterThanOrEqual(3);
    for (const option of options) {
      await page.locator('#preset').selectOption(option.value);
      await settled(page);
      const now = await readout(page);
      expect(now.above, option.name).toBeGreaterThan(0);
      await expect(page.locator('#preset')).toHaveValue(option.value);
    }
    expect(problems.errors).toEqual([]);
    expect(problems.requests).toEqual([]);
  });
});
