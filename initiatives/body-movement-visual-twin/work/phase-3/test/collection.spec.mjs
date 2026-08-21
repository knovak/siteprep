import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagePath = '/initiatives/body-movement-visual-twin/work/phase-3/index.html';

test('three records switch clips, instruction shapes, sources, and caution gates', async ({ page }) => {
  await page.goto(pagePath);

  const selector = page.getByLabel('Choose a movement');
  await expect(selector.locator('option')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: /small seated pelvic/i })).toBeVisible();
  await expect(page.locator('#phase-cue')).toContainText(/notice the contact with the chair/i);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.locator('#stage')).toHaveAttribute('data-movement', 'seated-pelvic-clock-exploration');

  await page.getByRole('button', { name: /enable playback/i }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await page.locator('#timeline').fill('450');
  await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.4500');

  await selector.selectOption('supported-seated-side-reach');
  await expect(page.getByRole('heading', { name: 'Supported seated side reach' })).toBeVisible();
  await expect(page.locator('#phase-cue')).toContainText(/raise the arm before beginning/i);
  await expect(page.getByText(/folded blanket firm chair/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'What is Iyengar Yoga?' })).toHaveAttribute('href', /iyengaryoga\.org\.uk/);
  await expect(page.locator('#stage')).toHaveAttribute('data-clip', 'supported-seated-side-reach');
  await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.0000');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();

  await selector.selectOption('pause-before-standing');
  await expect(page.getByRole('heading', { name: /pause before standing/i })).toBeVisible();
  await expect(page.getByText(/hands-on guidance is part of the source practice/i)).toBeVisible();
  await expect(page.locator('#phase-cue')).toContainText(/allow length and width/i);
  await expect(page.getByRole('link', { name: 'Learning the Alexander Technique' })).toHaveAttribute('href', /alexandertechnique\.co\.uk/);
  await expect(page.locator('#record-incomplete')).toBeHidden();
});

test('layer controls stay shared while muscles load lazily for the selected record', async ({ page }) => {
  const muscleRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/phase-2/data/muscles.json')) muscleRequests.push(request.url());
  });
  await page.goto(pagePath);
  await page.getByLabel('Choose a movement').selectOption('supported-seated-side-reach');
  await page.getByRole('button', { name: 'Side' }).click();
  const camera = await page.locator('#stage').getAttribute('data-camera');
  expect(muscleRequests).toHaveLength(0);

  await page.locator('#layer').fill('2');
  await expect(page.locator('#muscle-loading')).toBeVisible();
  await expect.poll(() => muscleRequests.length).toBe(1);
  await expect(page.locator('#stage')).toHaveAttribute('data-muscles-loaded', 'true');
  await expect(page.locator('#stage')).toHaveAttribute('data-camera', camera);
  await expect(page.locator('#reference-label')).toBeVisible();
});

test('visual-twin controls name surface changes and preserve the fitted-reference boundary', async ({ page }) => {
  await page.goto(pagePath);
  await page.locator('#stature').fill('195');
  await expect(page.locator('#stage')).toHaveAttribute('data-profile', /^195,/);
  await expect(page.locator('#profile-note')).toContainText(/overall visible stature and the fitted reference scale changed/i);
  await page.locator('#build').fill('70');
  await expect(page.locator('#profile-note')).toContainText(/surface outline width changed/i);
  await page.locator('#torso-to-limb').fill('-40');
  await expect(page.locator('#profile-note')).toContainText(/visible torso-to-limb proportion changed/i);
  await page.locator('#presentation').selectOption('angular');
  await expect(page.locator('#profile-note')).toContainText(/surface presentation only changed/i);
  await expect(page.locator('#profile-note')).toContainText(/Internal anatomy remains fitted reference geometry/i);
  await page.locator('#layer').fill('4');
  await expect(page.locator('#reference-label')).toBeVisible();
  await expect(page.getByText(/not a scan of you/i)).toBeVisible();
});

test('claim reports download and copy exact paths without editing or retaining the record', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pagePath);
  await page.getByLabel('Choose a movement').selectOption('pause-before-standing');
  const recordBefore = await (await page.request.get('/initiatives/body-movement-visual-twin/work/phase-1/fixtures/alexander.json')).text();
  await page.getByRole('button', { name: /flag claim: neck-base/i }).click();
  await expect(page.getByText(/does not edit the movement record/i)).toBeVisible();
  await page.getByLabel(/reviewer identifier/i).fill('Reviewer 42');
  await page.locator('textarea[name="note"]').fill('Confirm the inhibition wording with a practitioner.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream) contents += chunk;
  const report = JSON.parse(contents);
  expect(report.movement_id).toBe('pause-before-standing');
  expect(report.claim_path).toMatch(/^phases\.0\.joint_actions\.0$/);
  expect(report.reviewer).toBe('Reviewer 42');
  expect(report.record_changed).toBe(false);
  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(page.locator('#report-status')).toContainText(/not retained/i);
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).claim_path).toBe(report.claim_path);
  expect(await (await page.request.get('/initiatives/body-movement-visual-twin/work/phase-1/fixtures/alexander.json')).text()).toBe(recordBefore);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('attribution and safety claims expose their own exact flag controls', async ({ page }) => {
  await page.goto(pagePath);
  await page.getByRole('button', { name: /flag claim: about the feldenkrais method/i }).click();
  await expect(page.locator('#flag-claim-path')).toHaveText('source.claim_sources.0');
  await expect(page.getByLabel('Kind')).toHaveValue('attribution');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: /flag claim: stop if the seated movement/i }).first().click();
  await expect(page.locator('#flag-claim-path')).toHaveText('safety.cautions.0');
  await expect(page.getByLabel('Kind')).toHaveValue('safety');
});

test('records remain readable without WebGL and at narrow widths', async ({ page }) => {
  await page.goto(`${pagePath}?noWebgl=1`);
  await expect(page.getByRole('heading', { name: /cannot start the WebGL scene/i })).toBeVisible();
  await page.getByLabel('Choose a movement').selectOption('supported-seated-side-reach');
  await expect(page.getByRole('heading', { name: 'Supported seated side reach' })).toBeVisible();
  await expect(page.getByText(/educational visualization only/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('the collection has no serious accessibility findings', async ({ page }) => {
  await page.goto(pagePath);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
