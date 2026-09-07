import { selectMovement } from './select-movement.mjs';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagePath = '/initiatives/body-movement-visual-twin/work/phase-3/index.html';

test('140 records switch clips and context after one acknowledgement per page session', async ({ page }) => {
  await page.goto(pagePath);

  const selector = page.locator('#movement-select');
  await expect(selector.locator('option')).toHaveCount(140);
  await expect(page.getByRole('heading', { name: /small seated pelvic/i })).toBeVisible();
  await expect(page.locator('#phase-cue')).toContainText(/lumbar spine.*flexion/i);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.locator('#stage')).toHaveAttribute('data-movement', 'seated-pelvic-clock-exploration');

  await page.getByRole('button', { name: /enable playback/i }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await page.locator('#timeline').fill('450');
  await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.4500');

  await selectMovement(page, 'supported-seated-side-reach');
  await expect(page.getByRole('heading', { name: 'Supported seated side reach' })).toBeVisible();
  await expect(page.locator('#phase-cue')).toContainText(/scapula.*left.*upward rotation/i);
  await expect(page.getByText(/folded blanket firm chair/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'What is Iyengar Yoga?' })).toHaveAttribute('href', /iyengaryoga\.org\.uk/);
  await expect(page.locator('#stage')).toHaveAttribute('data-clip', 'supported-seated-side-reach');
  await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.0000');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /playback enabled for this session/i })).toBeDisabled();

  await selectMovement(page, 'pause-before-standing');
  await expect(page.getByRole('heading', { name: /pause before standing/i })).toBeVisible();
  await expect(page.getByText(/hands-on guidance is part of the source practice/i)).toBeVisible();
  await expect(page.locator('#phase-cue')).toContainText(/neck base/i);
  await expect(page.getByRole('link', { name: 'Learning the Alexander Technique' })).toHaveAttribute('href', /alexandertechnique\.co\.uk/);
  await expect(page.locator('#record-incomplete')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
});

test('sixty yoga and sixty Feldenkrais studies are selectable', async ({ page }) => {
  await page.goto(pagePath);
  const selector = page.locator('#movement-select');
  await expect(selector.locator('optgroup[label="Yoga"] option')).toHaveCount(60);
  await expect(selector.locator('optgroup[label="Feldenkrais"] option')).toHaveCount(60);
  await selectMovement(page, 'warrior-two-study');
  await expect(page.locator('#stage')).toHaveAttribute('data-clip', 'warrior-two-study');
  await expect(page.locator('#phase-cue')).toContainText(/hip.*left.*abduction/i);
  await selectMovement(page, 'shoulder-clock-study');
  await expect(page.locator('#stage')).toHaveAttribute('data-clip', 'shoulder-clock-study');
  await expect(page.locator('#phase-cue')).toContainText(/scapula.*left/i);
});

test('the initial anatomical muscle view loads once and preserves the camera across records and layers', async ({ page }) => {
  const muscleRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/phase-2/data/muscles.json')) muscleRequests.push(request.url());
  });
  await page.goto(pagePath);
  await expect.poll(() => muscleRequests.length).toBe(1);
  await expect(page.locator('#stage')).toHaveAttribute('data-muscles-loaded', 'true');
  await expect(page.locator('#layer')).toHaveValue('2');
  await selectMovement(page, 'supported-seated-side-reach');
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  const camera = await page.locator('#stage').getAttribute('data-camera');
  await page.locator('#layer').selectOption('5');
  await page.locator('#layer').selectOption('4');
  expect(muscleRequests).toHaveLength(1);
  await expect(page.locator('#stage')).toHaveAttribute('data-camera', camera);
  await expect(page.locator('#reference-label')).toBeVisible();
});

test('visual-twin controls name surface changes and preserve the fitted-reference boundary', async ({ page }) => {
  await page.goto(pagePath);
  await expect(page.locator('#stage')).toHaveAttribute('data-ready', 'true');
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
  await page.locator('#layer').selectOption('5');
  await expect(page.locator('#reference-label')).toBeVisible();
  await expect(page.getByText(/not.*scan of you/i)).toBeVisible();
});

test('the educational boundary precedes the viewport-height animation and labels the timeline Movement', async ({ page }) => {
  await page.goto(pagePath);
  const positions = await page.evaluate(() => ({
    boundaryBottom: document.querySelector('#caution-panel').getBoundingClientRect().bottom,
    viewerTop: document.querySelector('#viewer').getBoundingClientRect().top,
    stageHeight: document.querySelector('.stage-card').getBoundingClientRect().height,
    viewportHeight: window.innerHeight
  }));
  expect(positions.boundaryBottom).toBeLessThanOrEqual(positions.viewerTop);
  expect(Math.abs(positions.stageHeight - positions.viewportHeight)).toBeLessThanOrEqual(2);
  await expect(page.getByRole('heading', { name: 'Movement', exact: true })).toBeVisible();
  await expect(page.getByText('Review the display boundary.')).toHaveCount(0);
});

test('Front, Side, and Back select named views with distinct renderings', async ({ page }) => {
  await page.goto(pagePath);
  await expect(page.locator('#stage')).toHaveAttribute('data-camera-view', 'front');
  await expect(page.locator('[data-camera="front"]')).toHaveAttribute('aria-pressed', 'true');
  const frontImage = await page.locator('#model-canvas').screenshot();

  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await expect(page.locator('#stage')).toHaveAttribute('data-camera-view', 'side');
  await expect(page.locator('#view-label')).toContainText('Side view');
  await expect(page.locator('[data-camera="side"]')).toHaveAttribute('aria-pressed', 'true');
  const sideImage = await page.locator('#model-canvas').screenshot();

  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#stage')).toHaveAttribute('data-camera-view', 'back');
  await expect(page.locator('#view-label')).toContainText('Back view');
  await expect(page.locator('[data-camera="back"]')).toHaveAttribute('aria-pressed', 'true');
  const backImage = await page.locator('#model-canvas').screenshot();
  expect(sideImage.equals(frontImage)).toBe(false);
  expect(backImage.equals(frontImage)).toBe(false);
});

test('yoga playback uses one fixed projection scale for the full clip', async ({ page }) => {
  await page.goto(pagePath);
  await selectMovement(page, 'warrior-two-study');
  const scale = await page.locator('#stage').getAttribute('data-projection-scale');
  for (const time of ['200', '500', '800', '1000']) {
    await page.locator('#timeline').fill(time);
    await expect(page.locator('#stage')).toHaveAttribute('data-projection-scale', scale);
  }
});

test('detailed anatomy changes with pose and isolation while layers preserve time, camera, and framing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pagePath);
  await expect(page.locator('#stage')).toHaveAttribute('data-ready', 'true');
  await selectMovement(page, 'standing-forward-fold-study');
  await page.locator('#layer').selectOption('5');
  const start = await page.locator('#model-canvas').screenshot();
  await page.locator('#timeline').fill('550');
  const bent = await page.locator('#model-canvas').screenshot();
  expect(start.equals(bent)).toBe(false);
  const scale = await page.locator('#stage').getAttribute('data-projection-scale');
  const camera = await page.locator('#stage').getAttribute('data-camera');
  await page.locator('#isolate-joint').selectOption('lumbar-spine');
  const isolated = await page.locator('#model-canvas').screenshot();
  expect(isolated.equals(bent)).toBe(false);
  await page.locator('#isolate-joint').selectOption('none');
  for (const layer of ['2', '3', '4', '5']) {
    await page.locator('#layer').selectOption(layer);
    await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.5500');
    await expect(page.locator('#stage')).toHaveAttribute('data-camera', camera);
    await expect(page.locator('#stage')).toHaveAttribute('data-projection-scale', scale);
  }
  await expect(page.locator('#review-pill')).toHaveText('unreviewed');
  expect(errors).toEqual([]);
});

test('claim reports download and copy exact paths without editing or retaining the record', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pagePath);
  await selectMovement(page, 'pause-before-standing');
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
  await selectMovement(page, 'supported-seated-side-reach');
  await expect(page.getByRole('heading', { name: 'Supported seated side reach' })).toBeVisible();
  await expect(page.getByText(/educational visualization only/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('the collection has no serious accessibility findings', async ({ page }) => {
  await page.goto(pagePath);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});

test('compact picker overlays controls, filters all 140 studies, and supports keyboard selection', async ({ page }) => {
  await page.goto(pagePath);
  await expect(page.locator('#movement-trigger')).toBeVisible();
  await page.locator('.collection-panel').scrollIntoViewIfNeeded();
  const height = await page.locator('.collection-panel').evaluate(element => element.getBoundingClientRect().height);
  expect(height).toBeLessThan(200);
  const nextTop = await page.locator('#layer').evaluate(element => element.getBoundingClientRect().top + window.scrollY);
  await page.locator('#movement-trigger').click();
  await expect(page.locator('#movement-result-count')).toHaveText('140 studies');
  expect(await page.locator('#layer').evaluate(element => element.getBoundingClientRect().top + window.scrollY)).toBe(nextTop);
  await page.locator('#movement-tradition').selectOption('yoga');
  await expect(page.locator('#movement-result-count')).toHaveText('60 studies');
  await page.locator('#movement-search').fill('Vṛkṣāsana');
  await expect(page.locator('.movement-option')).toHaveCount(1);
  await page.locator('#movement-search').press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#stage')).toHaveAttribute('data-movement', 'tree-pose-study');
  await expect(page.locator('#movement-menu')).toBeHidden();
  await expect(page.locator('#movement-trigger')).toBeFocused();
  await page.locator('#movement-trigger').click();
  await page.locator('#movement-search').fill('unknown movement');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.locator('#movement-tradition').selectOption('alexander');
  await expect(page.locator('#movement-result-count')).toHaveText('20 studies');
  await page.locator('#movement-region').selectOption('head');
  await expect(page.locator('.movement-option')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const menu = await page.locator('#movement-menu').boundingBox();
  expect(menu.y).toBeGreaterThanOrEqual(0);
  expect(menu.y + menu.height).toBeLessThanOrEqual(page.viewportSize().height);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#movement-menu')).toBeHidden();
});

test('display variations change motion while preserving time, camera, and canonical source claims', async ({ page }) => {
  await page.goto(pagePath);
  await selectMovement(page, 'shelf-reach-study');
  await page.locator('#timeline').fill('700');
  const initial = await page.locator('#model-canvas').screenshot();
  const camera = await page.locator('#stage').getAttribute('data-camera');
  const scale = await page.locator('#stage').getAttribute('data-projection-scale');
  await page.locator('#movement-variations-toggle').click();
  await page.locator('#movement-range').selectOption('smaller');
  await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.7000');
  await expect(page.locator('#stage')).toHaveAttribute('data-camera', camera);
  await expect(page.locator('#stage')).toHaveAttribute('data-projection-scale', scale);
  const smaller = await page.locator('#model-canvas').screenshot();
  expect(smaller.equals(initial)).toBe(false);
  await page.locator('#movement-side').selectOption('mirrored');
  await expect(page.locator('#movement-meta')).toContainText('mirrored');
  await expect(page.locator('#phase-cue')).toContainText('scapula (right)');
  expect((await page.locator('#model-canvas').screenshot()).equals(smaller)).toBe(false);
  await page.getByRole('button', { name: /flag claim: scapula-left/i }).first().click();
  await expect(page.locator('#flag-claim-path')).toHaveText('phases.1.joint_actions.0');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await selectMovement(page, 'head-turn-study');
  await expect(page.locator('#movement-range')).toHaveValue('standard');
  await expect(page.locator('#movement-side')).toHaveValue('original');
  await expect(page.locator('#stage')).toHaveAttribute('data-time', '0.0000');
});
