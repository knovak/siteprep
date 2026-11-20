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

/** The sky overhead and its limit, from the second readout line. */
function parseSky(text) {
  const m = text.match(/zenith sky ([\d.]+) mag\/arcsec²(?: \(Bortle (\d)\))?, naked-eye limit (-?[\d.]+)/);
  return m ? { mu: Number(m[1]), bortle: m[2] ? Number(m[2]) : 1, limit: Number(m[3]) } : null;
}
const sky = async (page) => {
  await redrawn(page);
  return parseSky(await page.locator('#readout-sub').textContent());
};

/** Set a slider or number box to a value and fire the events a person's change fires. */
async function setValue(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** Open the beta and wait for its first picture. Collects errors and requests.
 *  `hash` is the part of the address after the page, starting with "#". */
async function openBeta(page, hash = '') {
  const problems = { errors: [], requests: [] };
  page.on('pageerror', (error) => problems.errors.push(String(error)));
  page.on('request', (request) => {
    if (!request.url().startsWith('blob:') && !request.url().split('#')[0].endsWith(BETA)) problems.requests.push(request.url());
  });
  await page.goto(BETA + hash);
  await settled(page);
  return problems;
}

/** Choose a preset by part of its name and wait for the picture. */
async function choosePreset(page, namePart) {
  const value = await page.locator('#preset option').evaluateAll(
    (list, part) => (list.find((o) => o.textContent.includes(part)) || {}).value, namePart);
  expect(value, `a preset named like "${namePart}"`).toBeTruthy();
  await page.locator('#preset').selectOption(value);
  await settled(page);
  return value;
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

/**
 * Wait for the page to have re-evaluated and redrawn after a change. A change
 * to a control asks for an evaluation on the next animation frame, and the
 * readout is written in that frame; two frames on, it is current. A change
 * that rebuilds the constellation shows "computing…" until it is done.
 */
async function redrawn(page) {
  await page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await settled(page);
}

/** The readout's numbers, once the page has redrawn. */
const readout = async (page) => {
  await redrawn(page);
  return parseReadout(await page.locator('#readout').textContent());
};

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
    await page.locator('#sky').focus();
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

  // ---- unit 2: constellation and brightness settings, presets, links ----

  test('latitude takes tenths of a degree from the box beside the slider', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#lat-num').fill('37.2');
    await page.locator('#lat-num').press('Enter');
    await expect(page.locator('#lat-label')).toHaveText('37.2°N');
    await expect(page.locator('#readout-sub')).toContainText('lat 37.2°');
    await expect(page.locator('#lat')).toHaveValue('37');
    // the slider still moves in whole degrees, and the box follows it
    await page.locator('#lat').fill('-34');
    await expect(page.locator('#lat-num')).toHaveValue('-34');
    await expect(page.locator('#lat-label')).toHaveText('34°S');
    // text that is not a number puts the latitude back
    await page.locator('#lat-num').fill('');
    await page.locator('#lat-num').press('Enter');
    await expect(page.locator('#lat-num')).toHaveValue('-34');
    expect(problems.errors).toEqual([]);
  });

  test('the sdross0 presets set that project\'s constellation and its two brightness models', async ({ page }) => {
    const problems = await openBeta(page);
    await choosePreset(page, 'sdross0 default, no mitigation');
    await expect(page.locator('#nsats-label')).toHaveText('500,000');
    await expect(page.locator('#sso-label')).toContainText('100% SSO');
    await expect(page.locator('#shells')).toHaveValue('filed-sso');
    await expect(page.locator('#planes')).toHaveValue('filed');
    await expect(page.locator('#planespread-label')).toHaveText('±10°');
    await expect(page.locator('#scatter-label')).toHaveText('0.0 mag');
    await expect(page.locator('#phaselaw')).toHaveValue('lambert');
    await expect(page.locator('#eyemodel')).toHaveValue('schaefer');
    await expect(page.locator('#ambient')).toHaveValue('1');
    await expect(page.locator('#bright-label')).toContainText('+0.8');
    await expect(page.locator('#lat-label')).toHaveText('37.2°N');
    await expect(page.locator('#compass')).toHaveText('facing 315°');
    await expect(page.locator('#readout-sub')).toContainText('80 min after sunset');
    const none = await readout(page);
    // sdross0 reports about 36,000 for this evening; see beta/test/paired.test.js
    expect(none.visible).toBeGreaterThan(25000);
    expect(none.visible).toBeLessThan(45000);

    await choosePreset(page, 'sdross0 default, optimistic mitigation');
    await expect(page.locator('#phaselaw')).toHaveValue('mini');
    await expect(page.locator('#bright-label')).toContainText('+6.2');
    const optimistic = await readout(page);
    expect(optimistic.above).toBe(none.above);
    expect(optimistic.visible).toBeLessThan(none.visible / 10);

    await choosePreset(page, 'sdross0 optimistic mitigation - 37.2 N, 92 minutes after sunset, December 21');
    const december = await readout(page);
    expect(december.visible).toBeGreaterThan(8000);
    expect(december.visible).toBeGreaterThan(optimistic.visible * 5);

    // The phase law and the layout are controls of their own.
    await page.locator('#phaselaw').selectOption('lambert');
    await expect.poll(async () => (await readout(page)).visible).not.toBe(december.visible);
    await page.locator('#planes').selectOption('spread');
    await settled(page);
    await expect(page.locator('#preset')).toHaveValue('');
    expect(problems.errors).toEqual([]);
    expect(problems.requests).toEqual([]);
  });

  test('a copied link reopens the same settings', async ({ page, context }) => {
    const problems = await openBeta(page);
    const value = await choosePreset(page, 'sdross0 default, optimistic mitigation');
    await page.locator('#settings-link').click();
    await expect(page.locator('#settings-status')).toContainText('page address now holds these settings');
    const link = page.url();
    expect(link).toContain('#');
    expect(link).toContain('constellation.phase_law=mini');
    const first = await page.locator('#readout').textContent();

    const second = await context.newPage();
    const secondErrors = [];
    second.on('pageerror', (error) => secondErrors.push(String(error)));
    await second.goto(link);
    await settled(second);
    await expect(second.locator('#readout')).toHaveText(first);
    await expect(second.locator('#preset')).toHaveValue(value);
    await expect(second.locator('#settings-status')).toContainText('Loaded from the link');
    await expect(second.locator('#compass')).toHaveText('facing 315°');
    expect(secondErrors).toEqual([]);

    // The opening view needs nothing after the page name.
    await second.close();
    expect(problems.errors).toEqual([]);
  });

  test('a link with a mistake changes nothing and says why', async ({ page }) => {
    const plain = await openBeta(page);
    const opening = await page.locator('#readout').textContent();
    expect(plain.errors).toEqual([]);

    const other = await page.context().newPage();
    const errors = [];
    other.on('pageerror', (error) => errors.push(String(error)));
    await other.goto(`${BETA}#observer.latitude=north&display.facing=90`);
    await settled(other);
    await expect(other.locator('#settings-status')).toContainText('observer.latitude: expected a number');
    await expect(other.locator('#readout')).toHaveText(opening);
    await expect(other.locator('#compass')).toHaveText('facing 0°');
    expect(errors).toEqual([]);
    await other.close();
  });

  // ---- unit 3: the twilight sky, ambient light, the naked-eye threshold ----

  test('half an hour after sunset the sky is still bright, and the readout says how bright', async ({ page }) => {
    const problems = await openBeta(page);
    // The opening view is 30 minutes after sunset with the Sun about 5.6
    // degrees down. The measured sky there shows a handful of stars. Before
    // the twilight table was corrected this view counted 67.
    const opening = await readout(page);
    expect(opening.stars).toBeLessThan(10);
    expect(opening.visible).toBeGreaterThan(100);
    const bright = await sky(page);
    expect(bright.mu).toBeGreaterThan(11);
    expect(bright.mu).toBeLessThan(14);
    expect(bright.limit).toBeLessThan(2);

    // Ninety minutes on, the sky is dark and the limit is the observer's own.
    await page.locator('#jump-dusk60').click();
    await expect(page.locator('#readout-sub')).toContainText('60 min after sunset');
    const later = await sky(page);
    expect(later.mu).toBeGreaterThan(bright.mu + 4);
    expect(later.limit).toBeGreaterThan(4);
    expect((await readout(page)).stars).toBeGreaterThan(100);
    expect(problems.errors).toEqual([]);
  });

  test('ambient light brightens the sky and hides stars and satellites', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#jump-midnight').click();
    await expect(page.locator('#time-label')).toHaveText('00:00');
    await page.locator('#starlim').fill('65');
    const dark = { counts: await readout(page), sky: await sky(page) };
    await expect.poll(async () => (await sky(page)).limit).toBe(6.5);
    expect(dark.sky.bortle).toBe(1);

    let last = { counts: await readout(page), sky: await sky(page) };
    for (const [bortle, name] of [[5, 'suburban'], [8, 'city']]) {
      await page.locator('#ambient').fill(String(bortle));
      await expect(page.locator('#ambient-label')).toHaveText(`Bortle ${bortle} — ${name}`);
      await expect(page.locator('#readout-sub')).toContainText(`(Bortle ${bortle})`);
      const now = { counts: await readout(page), sky: await sky(page) };
      expect(now.sky.mu).toBeLessThan(last.sky.mu);
      expect(now.sky.limit).toBeLessThan(last.sky.limit);
      expect(now.counts.stars).toBeLessThan(last.counts.stars);
      expect(now.counts.above).toBe(last.counts.above);
      last = now;
    }
    // a city sky: the scale's own limit is 4.1 to 4.5
    expect(last.sky.limit).toBeGreaterThan(4);
    expect(last.sky.limit).toBeLessThan(4.6);

    await page.locator('#ambient').fill('1');
    await expect(page.locator('#readout-sub')).not.toContainText('Bortle');
    await expect.poll(async () => (await readout(page)).stars).toBe(dark.counts.stars);
    expect(problems.errors).toEqual([]);
  });

  test('the naked-eye threshold is a choice, and the Schaefer formula is stricter in twilight', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#jump-dusk60').click();
    await expect(page.locator('#readout-sub')).toContainText('60 min after sunset');
    const table = { counts: await readout(page), sky: await sky(page) };

    await page.locator('aside details.grp summary', { hasText: 'Advanced' }).click();
    await page.locator('#eyemodel').selectOption('schaefer');
    await expect.poll(async () => (await sky(page)).limit).toBeLessThan(table.sky.limit - 0.3);
    const strict = { counts: await readout(page), sky: await sky(page) };
    expect(strict.sky.mu).toBe(table.sky.mu);
    expect(strict.counts.stars).toBeLessThan(table.counts.stars);
    expect(strict.counts.visible).toBeLessThanOrEqual(table.counts.visible);

    await page.locator('#eyemodel').selectOption('table');
    await expect.poll(async () => (await readout(page)).stars).toBe(table.counts.stars);
    expect(problems.errors).toEqual([]);
  });

  // ---- unit 4: the Moon, moonlight, and SBDC light against the Moon ----

  test('the light line compares SBDC light with a full Moon and with a natural night sky', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('#jump-dusk60').click();
    await expect(page.locator('#readout-sub')).toContainText('60 min after sunset');
    const line = page.locator('#readout-light');
    await expect(line).toContainText('SBDC light');
    await expect(line).toContainText('a full Moon');
    await expect(line).toContainText('a moonless natural night sky');
    // no Moon is set, so the line does not mention one
    await expect(line).not.toContainText('lit');
    await expect(page.locator('#moon')).toHaveValue('off');
    const text = await line.textContent();
    // a few hundred thousand unmitigated satellites: a fraction of a full Moon, written 1/n
    expect(text).toMatch(/1\/[\d,.]+ of a full Moon/);
    expect(problems.errors).toEqual([]);
    expect(problems.requests).toEqual([]);
  });

  test('a full Moon brightens the sky and hides stars; a new Moon is below the horizon at night', async ({ page }) => {
    const problems = await openBeta(page);
    // midnight in June at 40 N: the Sun is 26 degrees down and the sky is dark
    await page.locator('#jump-midnight').click();
    await expect(page.locator('#time-label')).toHaveText('00:00');
    await page.locator('#starlim').fill('65');
    await expect.poll(async () => (await sky(page)).limit).toBe(6.5);
    const dark = { counts: await readout(page), sky: await sky(page) };

    await page.locator('#moon').selectOption('phase');
    await expect(page.locator('#moonage')).toBeVisible();
    await expect(page.locator('#moonage-label')).toContainText('full');
    await expect(page.locator('#moon-label')).toContainText('% lit');
    await expect(page.locator('#moon-label')).toContainText('up');
    await expect.poll(async () => (await sky(page)).mu).toBeLessThan(dark.sky.mu - 2);
    const lit = { counts: await readout(page), sky: await sky(page) };
    expect(lit.counts.stars).toBeLessThan(dark.counts.stars);
    expect(lit.counts.above).toBe(dark.counts.above);
    await expect(page.locator('#readout-light')).toContainText(/of this Moon.s light/);

    // a new Moon is with the Sun: down at night, and the sky is dark again
    await setValue(page, '#moonage', 0);
    await expect(page.locator('#moonage-label')).toContainText('new');
    await expect(page.locator('#moon-label')).toContainText('below the horizon');
    await expect.poll(async () => (await readout(page)).stars).toBe(dark.counts.stars);
    await expect(page.locator('#readout-light')).not.toContainText(/this Moon.s light/);

    await page.locator('#moon').selectOption('off');
    await expect(page.locator('#moonage')).toBeHidden();
    await expect(page.locator('#moon-label')).toHaveText('');
    expect(problems.errors).toEqual([]);
  });

  test('the Moon of a date depends on the year', async ({ page }) => {
    const problems = await openBeta(page);
    // 24 November 2026 is a full Moon; 24 November 2027 is ten days after one
    await setValue(page, '#date', 328);
    await setValue(page, '#time', 22 * 60);
    await page.locator('#moon').selectOption('date');
    await expect(page.locator('#year')).toBeVisible();
    await expect(page.locator('#year')).toHaveValue('2026');
    await expect(page.locator('#moon-label')).toContainText(/(99|100)% lit/);
    await page.locator('#year').fill('2027');
    await page.locator('#year').press('Enter');
    await expect(page.locator('#moon-label')).not.toContainText(/(99|100)% lit/);
    await expect(page.locator('#moon-label')).toContainText('% lit');
    // a year outside the range is brought into it
    await page.locator('#year').fill('1500');
    await page.locator('#year').press('Enter');
    await expect(page.locator('#year')).toHaveValue('1900');
    expect(problems.errors).toEqual([]);
  });

  test('Moon settings travel in a link', async ({ page, context }) => {
    const problems = await openBeta(page);
    await page.locator('#jump-dusk60').click();
    await page.locator('#moon').selectOption('phase');
    await setValue(page, '#moonage', 110);
    await expect(page.locator('#moonage-label')).toContainText('11.0');
    await page.locator('#settings-link').click();
    const link = page.url();
    expect(link).toContain('display.moon=phase');
    expect(link).toContain('display.moon_age_days=11.0');
    const first = await page.locator('#readout-light').textContent();

    const second = await context.newPage();
    const errors = [];
    second.on('pageerror', (error) => errors.push(String(error)));
    await second.goto(link);
    await settled(second);
    await expect(second.locator('#moon')).toHaveValue('phase');
    await expect(second.locator('#moonage-label')).toContainText('11.0');
    await expect(second.locator('#readout-light')).toHaveText(first);
    expect(errors).toEqual([]);
    await second.close();
    expect(problems.errors).toEqual([]);
  });

  test('turning the view while the constellation is rebuilt raises no error', async ({ page }) => {
    // The picture is drawn from an evaluation and the constellation it was
    // made from. After a rebuild there is a moment when the new constellation
    // exists and its evaluation does not; a redraw in that moment used to
    // pair the new constellation with the old evaluation and fail.
    const problems = await openBeta(page);
    await page.evaluate(async () => {
      const slider = document.getElementById('nsats');
      const key = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      for (const position of [30, 74, 20, 60]) {
        slider.value = String(position);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        // keep turning the view through the rebuild and the frames after it
        for (let i = 0; i < 60; i++) {
          key();
          await new Promise((resolve) => setTimeout(resolve, 2));
        }
      }
    });
    await settled(page);
    await expect(page.locator('#errbar')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });

  // ---- unit 5: the perspective view, aiming, and the hours of a night and a year ----

  test('the perspective view is aimed like the panorama, and its settings travel in a link', async ({ page, context }) => {
    const problems = await openBeta(page);
    await choosePreset(page, 'sdross0 default, no mitigation');
    const panorama = await readout(page);
    await page.locator('#viewmode').selectOption('perspective');
    await expect(page.locator('#compass')).toBeVisible();
    await expect(page.locator('#compass')).toHaveText('facing 315°');
    const camera = await readout(page);
    // the same sky, a different picture of it
    expect(camera.visible).toBe(panorama.visible);
    expect(camera.visibleInView).not.toBeNull();
    expect(camera.visibleInView).toBeGreaterThan(0);
    expect(camera.visibleInView).toBeLessThanOrEqual(camera.visible);
    // it turns with the keyboard like the panorama
    await page.locator('#sky').focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#compass')).toHaveText('facing 285°');

    await page.locator('#settings-link').click();
    const link = page.url();
    expect(link).toContain('display.view=perspective');
    const second = await context.newPage();
    const errors = [];
    second.on('pageerror', (error) => errors.push(String(error)));
    await second.goto(link);
    await settled(second);
    await expect(second.locator('#viewmode')).toHaveValue('perspective');
    await expect(second.locator('#compass')).toHaveText('facing 285°');
    expect(errors).toEqual([]);
    await second.close();

    // the all-sky view has no aim: no compass, and no aim button
    await page.locator('#viewmode').selectOption('fisheye');
    await expect(page.locator('#compass')).toBeHidden();
    await expect(page.locator('#aim')).toBeDisabled();
    expect(problems.errors).toEqual([]);
  });

  test('aiming at the densest sky turns the view toward the most visible SBDCs', async ({ page }) => {
    const problems = await openBeta(page);
    await choosePreset(page, 'sdross0 default, no mitigation');
    // turn away from the ring first: east, where the sky is nearly empty
    await page.locator('#sky').focus();
    for (let i = 0; i < 27; i++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('#compass')).toHaveText('facing 90°');
    const away = await readout(page);
    await page.locator('#aim').click();
    await expect(page.locator('#compass')).not.toHaveText('facing 90°');
    const aimed = await readout(page);
    expect(aimed.visible).toBe(away.visible);
    expect(aimed.visibleInView).toBeGreaterThan(away.visibleInView * 3);
    expect(aimed.visibleInView).toBeGreaterThan(aimed.visible / 4);
    expect(problems.errors).toEqual([]);
  });

  test('the Night and year panel reports hours for a night, and a click on its chart sets the time', async ({ page }) => {
    const problems = await openBeta(page);
    await page.locator('aside details.grp summary', { hasText: 'Night & year' }).click();
    const cell = (key, column) => page.locator(`#night-table tr[data-key="${key}"] td`).nth(column);
    await expect(cell('night', 1)).toHaveText('—');

    await page.locator('#night-run').click();
    await expect(page.locator('#night-status')).toContainText('this night: computed for 40°N, Jun 21');
    // 40 N on the June solstice: about nine hours of night
    await expect(cell('night', 1)).toHaveText(/^(8\.[5-9]|9\.[0-5]) h$/);
    for (const key of ['atLeast100', 'outnumberStars', 'exceedsSky']) {
      await expect(cell(key, 1)).toHaveText(/^\d+\.\d h$/);
      await expect(cell(key, 2)).toHaveText('—');
    }
    const hours = async (key) => parseFloat(await cell(key, 1).textContent());
    expect(await hours('atLeast100')).toBeLessThanOrEqual(await hours('night'));
    expect(await hours('atLeast100')).toBeGreaterThan(0);

    // a click in the middle of the chart is the middle of the night
    const box = await page.locator('#night-chart').boundingBox();
    await page.locator('#night-chart').click({ position: { x: box.width / 2, y: box.height / 2 } });
    await expect(page.locator('#time-label')).toHaveText(/^(23:[3-5]\d|00:[0-2]\d)$/);
    await page.locator('#night-time').press('End');
    await expect(page.locator('#date-label')).toHaveText('Jun 22');
    await expect(page.locator('#night-time')).toHaveAttribute('aria-valuetext', /Jun 22 11:55/);
    await page.locator('#night-time').press('Home');
    await expect(page.locator('#date-label')).toHaveText('Jun 21');
    await expect(page.locator('#night-grp')).not.toHaveClass(/stale/);

    // the latitude is: the result is kept, dimmed, and says why
    await page.locator('aside details.grp summary', { hasText: 'Observer' }).scrollIntoViewIfNeeded();
    await setValue(page, '#lat-num', 55);
    await expect(page.locator('#night-grp')).toHaveClass(/stale/);
    await expect(page.locator('#night-status')).toContainText('settings have changed');
    await page.locator('#night-run').click();
    await expect(page.locator('#night-status')).toContainText('this night: computed for 55°N, Jun 21');
    await expect(page.locator('#night-grp')).not.toHaveClass(/stale/);
    expect(problems.errors).toEqual([]);
    expect(problems.requests).toEqual([]);
  });

  test('the Night and year panel reports hours for a year', async ({ page }) => {
    const problems = await openBeta(page);
    // the smallest constellation, so that the year is quick to compute
    await setValue(page, '#nsats', 0);
    await settled(page);
    await page.locator('aside details.grp summary', { hasText: 'Night & year' }).click();
    await page.locator('#year-run').click();
    await expect(page.locator('#night-status')).toContainText('a year: computed for 40°N', { timeout: 60000 });
    const cell = (key) => page.locator(`#night-table tr[data-key="${key}"] td`).nth(2);
    // nights at 40 N add up to a little under half the year's 8,760 hours
    const night = parseFloat((await cell('night').textContent()).replace(/,/g, ''));
    expect(night).toBeGreaterThan(4100);
    expect(night).toBeLessThan(4500);
    for (const key of ['atLeast100', 'outnumberStars', 'exceedsSky']) {
      const value = parseFloat((await cell(key).textContent()).replace(/,/g, ''));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(night);
    }
    expect(problems.errors).toEqual([]);
  });

  test('on a phone the page is the width of the screen', async ({ page }) => {
    // The readout lines do not wrap on a narrow screen. Once the strip that
    // holds them sat in the page's flow, the longest line set the width of
    // the whole page: 1,452 px on a 390 px phone, which the phone shrank to
    // fit, leaving the controls too small to use.
    await page.setViewportSize({ width: 390, height: 844 });
    const problems = await openBeta(page);
    const widths = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      controls: document.querySelector('aside').getBoundingClientRect().right,
      strip: document.getElementById('readout-strip').getBoundingClientRect().width,
      // the credit is below the sky, where it cannot cover the compass points
      creditTop: document.getElementById('attribution').getBoundingClientRect().top,
      skyBottom: document.getElementById('sky-area').getBoundingClientRect().bottom,
    }));
    expect(widths.page).toBeLessThanOrEqual(390);
    expect(widths.controls).toBeLessThanOrEqual(390);
    expect(widths.strip).toBeLessThanOrEqual(390);
    expect(widths.creditTop).toBeGreaterThanOrEqual(widths.skyBottom);
    expect(problems.errors).toEqual([]);
  });

  test('assumptions use native keyboard activation and restore focus', async ({ page }) => {
    await openBeta(page);
    const button = page.locator('#open-assumptions');
    const initial = await page.locator('#play-ff').textContent();
    await button.press('Space');
    await expect(page.locator('dialog:modal')).toBeVisible();
    await expect(page.locator('#close-assumptions')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#assump .sheet')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#close-assumptions')).toBeFocused();
    await page.locator('#sky').evaluate(el => el.focus());
    await expect(page.locator('#sky')).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    await expect(page.locator('#play-ff')).toHaveText(initial);
  });

  test('results retain their starting latitude after an edit during the year', async ({ page }) => {
    const problems = await openBeta(page);
    await setValue(page, '#nsats', 0);
    await settled(page);
    await page.locator('#night-grp summary').click();
    await page.evaluate(() => new Promise(resolve => {
      const status = document.querySelector('#night-status');
      const observer = new MutationObserver(() => {
        if (!status.textContent.includes('/24')) return;
        observer.disconnect();
        const box = document.querySelector('#lat-num');
        box.value = '15'; box.dispatchEvent(new Event('input', { bubbles: true }));
        box.dispatchEvent(new Event('change', { bubbles: true }));
        resolve();
      });
      observer.observe(status, { childList: true });
      document.querySelector('#year-run').click();
    }));
    await expect(page.locator('#night-status')).toHaveText(/a year: computed for 40°N.*settings have changed/, { timeout: 60000 });
    const previous = await page.locator('[data-key="night"] td').nth(2).textContent();
    await page.locator('#year-run').click();
    await page.locator('#analysis-stop').click();
    await expect(page.locator('#night-status')).toContainText('cancelled');
    await expect(page.locator('[data-key="night"] td').nth(2)).toHaveText(previous);
    const annualHours = () => page.locator('#night-table tbody tr td:last-child').allTextContents();
    const captured = await annualHours();
    await setValue(page, '#lat-num', 40);
    await settled(page);
    await page.locator('#year-run').click();
    await expect(page.locator('#analysis-stop')).toBeHidden({ timeout: 60000 });
    expect(await annualHours()).toEqual(captured);
    await expect(page.locator('#night-status')).not.toContainText('settings have changed');
    expect(problems).toEqual({ errors: [], requests: [] });
  });

  for (const [width, zoom] of [[320, 1], [390, 1], [640, 2]]) {
    test(`mobile answers wrap in both languages at ${width}px and ${zoom * 100}%`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await openBeta(page);
      await page.evaluate(scale => { document.body.style.zoom = scale; }, zoom);
      for (const language of ['en', 'fr']) {
        if (language === 'fr') await page.locator('#lang-toggle').click();
        await expect(page.locator('#headline')).toContainText(language === 'en' ? '546 across the sky' : '546 dans tout le ciel');
        await page.locator('#readout-details').evaluate(el => { el.open = true; });
        const dimensions = await page.evaluate(() => [document.documentElement, ...document.querySelectorAll('#headline,#readout,#readout-sub,#readout-light')]
          .map(el => [el.scrollWidth, el.clientWidth, getComputedStyle(el).textOverflow]));
        for (const [content, frame, overflow] of dimensions) {
          expect(content).toBeLessThanOrEqual(frame + 1);
          expect(overflow).not.toBe('ellipsis');
        }
      }
    });
  }

  test('the picture and chart count compact groups once in both languages', async ({ page }) => {
    const problems = await openBeta(page);
    const content = 'observer:\n  time: "20:15"\nconstellation:\n  satellites: 10000\n  launch_trains: 0\n  clustering: true\n  satellites_per_cluster: 100\n  cluster_diameter_km: 0.2\nadvanced:\n  cluster_membership_variation: 0\n  cluster_diameter_variation: 0\n';
    await page.locator('#settings-file').setInputFiles({ name: 'compact.yaml', mimeType: 'text/plain', buffer: Buffer.from(content) });
    await expect(page.locator('#readout')).toContainText('VISIBLE objects 3 (300 satellites within)');
    await page.locator('#night-grp summary').click();
    await page.locator('#night-run').click();
    await expect(page.locator('#night-time')).toBeEnabled();
    await setValue(page, '#night-time', 495);
    await expect(page.locator('#night-selection')).toHaveText(/20:15 · 3 visible objects \(300 satellites within\) · 44 visible stars/);
    await page.locator('#lang-toggle').click();
    await expect(page.locator('#night-selection')).toHaveText(/3 objets visibles \(300 satellites inclus\) · 44 étoiles visibles/);
    await expect(page.locator('#readout')).toContainText('300 satellites inclus');
    expect(problems).toEqual({ errors: [], requests: [] });
  });

  test('PNG embeds the same settings as the downloadable YAML', async ({ page }) => {
    const fs = require('node:fs/promises');
    await openBeta(page);
    const download = async selector => {
      const [file] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]);
      return { name: file.suggestedFilename(), data: await fs.readFile(await file.path()) };
    };
    const png = await download('#snapshot');
    const yaml = await download('#settings-export');
    const match = png.name.match(/^sbdc-sky_([\da-f]{12})_([\da-f]{8})\.png$/);
    expect(match).toBeTruthy();
    expect(yaml.name).toContain(`_${match[2]}.yaml`);
    const chunks = [];
    for (let offset = 8; offset < png.data.length;) {
      const size = png.data.readUInt32BE(offset);
      chunks.push([png.data.toString('ascii', offset + 4, offset + 8), png.data.toString('utf8', offset + 8, offset + 8 + size)]);
      offset += size + 12;
    }
    expect(chunks.at(-1)[0]).toBe('IEND');
    expect(chunks.at(-2)[0]).toBe('iTXt');
    expect(chunks.at(-2)[1]).toContain(`build ${match[1]} · settings ${match[2]}`);
    expect(chunks.at(-2)[1]).toContain(yaml.data.toString('utf8').replace(/^# Exported .*\n/m, '').trim());
  });

  test('every preset loads and draws', async ({ page }) => {
    const problems = await openBeta(page);
    const options = await page.locator('#preset option').evaluateAll((list) =>
      list.filter((o) => o.value !== '').map((o) => ({ value: o.value, name: o.textContent })));
    expect(options.length).toBeGreaterThanOrEqual(6);
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
