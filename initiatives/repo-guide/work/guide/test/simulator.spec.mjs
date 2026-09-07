import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {expect, test} from '@playwright/test';

const outputPath = process.env.GUIDE_SIMULATOR_PATH;
const repositoryRoot = process.env.GUIDE_REPO_ROOT;

test.beforeAll(() => {
  if (!outputPath || !repositoryRoot) throw new Error('GUIDE_SIMULATOR_PATH and GUIDE_REPO_ROOT are required');
});

async function stepCount(page) {
  return page.evaluate(() => window.simulatorState.count);
}

test('simulator opens offline, walks the whole lifecycle, and comes back', async ({page}) => {
  const consoleErrors = [];
  const failedRequests = [];
  const networkRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('request', request => { if (/^https?:/i.test(request.url())) networkRequests.push(request.url()); });
  await page.goto(pathToFileURL(outputPath).href);

  const count = await stepCount(page);
  expect(count).toBeGreaterThanOrEqual(12);

  await expect(page.locator('#progress')).toHaveText(`1 / ${count}`);
  await expect(page.locator('#back')).toBeDisabled();
  await page.evaluate(() => document.querySelector('#back').click());
  await expect(page.locator('#progress')).toHaveText(`1 / ${count}`);

  // Every stage the vocabulary names is reached by stepping forward.
  const vocabulary = await page.evaluate(() => window.simulatorState.vocabulary);
  const seenStages = new Set();
  for (let step = 1; step <= count; step += 1) {
    seenStages.add(await page.locator('body').getAttribute('data-stage'));
    if (step === count) break;
    await page.locator('#step').click();
    await page.evaluate(() => window.simulatorState.settle());
    await expect(page.locator('#progress')).toHaveText(`${step + 1} / ${count}`);
  }
  expect([...seenStages].sort()).toEqual([...vocabulary.stages].sort());

  await expect(page.locator('#step')).toBeDisabled();
  await expect(page.locator('#next-label')).toHaveText(/complete/i);
  await page.evaluate(() => document.querySelector('#step').click());
  await expect(page.locator('#progress')).toHaveText(`${count} / ${count}`);

  for (let step = count - 1; step >= 1; step -= 1) {
    await page.locator('#back').click();
    await expect(page.locator('#progress')).toHaveText(`${step} / ${count}`);
  }

  const shownStages = await page.locator('#stage-track [data-stage]').evaluateAll(nodes => nodes.map(node => node.dataset.stage));
  expect(shownStages).toEqual(vocabulary.stages);

  const sha = await page.locator('body').getAttribute('data-source-sha');
  expect(sha).toMatch(/^[a-f0-9]{7,40}$/);
  const sources = await page.locator('a[data-source-path]').evaluateAll(links => links.map(link => ({path: link.dataset.sourcePath, href: link.href})));
  expect(sources).toHaveLength(2);
  for (const source of sources) {
    expect(existsSync(resolve(repositoryRoot, source.path))).toBe(true);
    expect(source.href).toContain(`/blob/${sha}/`);
  }
  const html = readFileSync(outputPath, 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+stylesheet|\bfetch\s*\(/i);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(networkRequests).toEqual([]);
});

test('the stage stands out on exactly the steps where it moved, in both directions', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  const count = await stepCount(page);

  // Walk forward recording the stage and whether the badge was flagged, then
  // walk back and demand the same answers: the highlight is a property of the
  // step, not of the direction you arrived from.
  const badge = page.locator('#current-stage');
  const forward = [];
  for (let step = 1; step <= count; step += 1) {
    forward.push({
      stage: await badge.textContent(),
      changed: await badge.getAttribute('data-changed'),
      track: await page.locator('#stage-track .stage.current').getAttribute('data-changed'),
    });
    if (step === count) break;
    await page.locator('#step').click();
    await page.evaluate(() => window.simulatorState.settle());
  }

  // The first step is where the walk-through starts, so nothing has moved yet.
  expect(forward[0].changed).toBeNull();
  for (let step = 1; step < count; step += 1) {
    const moved = forward[step].stage !== forward[step - 1].stage;
    expect(forward[step].changed).toBe(moved ? 'true' : null);
    expect(forward[step].track).toBe(moved ? 'true' : null);
  }

  // Moving backwards through the lifecycle is a supported move and gets the
  // same treatment as advancing; a run that never moved back would pass the
  // rule above trivially.
  expect(forward.some((entry, index) => index > 0
    && entry.changed === 'true'
    && forward.slice(0, index).some(earlier => earlier.stage === entry.stage))).toBe(true);

  for (let step = count - 1; step >= 1; step -= 1) {
    await page.locator('#back').click();
    await page.evaluate(() => window.simulatorState.settle());
    expect(await badge.getAttribute('data-changed')).toBe(forward[step - 1].changed);
  }

  // Orange is reserved for a stage that just moved; active sweep phases use
  // blue and completed phases use green.
  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('objectives-merged')));
  await page.evaluate(() => window.simulatorState.settle());
  const orange = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--orange').trim());
  expect(orange).toBe('#ef6a3a');
  // The badge transitions into the colour, so poll rather than reading the
  // frame the click happened on.
  await expect
    .poll(() => badge.evaluate(node => getComputedStyle(node).backgroundColor))
    .toBe('rgb(239, 106, 58)');
});

test('controls stay fixed, the title condenses, and the color key explains state', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);

  await expect(page.locator('header')).not.toContainText('Every stage, start to finish');
  const controls = page.locator('.controls');
  expect(await controls.evaluate(node => getComputedStyle(node).position)).toBe('fixed');
  const openingTitleSize = await page.locator('header h1').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  const targetsBefore = await Promise.all(['#back', '#step', '#play'].map(selector => page.locator(selector).boundingBox()));

  await page.locator('#step').click();
  await page.evaluate(() => window.simulatorState.settle());
  await expect.poll(() => page.locator('header h1').evaluate(node => parseFloat(getComputedStyle(node).fontSize)))
    .toBeLessThan(openingTitleSize);
  const targetsAfter = await Promise.all(['#back', '#step', '#play'].map(selector => page.locator(selector).boundingBox()));
  for (let index = 0; index < targetsBefore.length; index += 1) {
    expect(Math.abs(targetsBefore[index].x - targetsAfter[index].x)).toBeLessThan(1);
    expect(Math.abs(targetsBefore[index].y - targetsAfter[index].y)).toBeLessThan(1);
  }

  const key = page.locator('.color-key');
  await expect(key).toContainText('Work items');
  await expect(key).toContainText('ready');
  await expect(key).toContainText('Sweep phases');
  await expect(key).toContainText('not running');
  await expect(key).toContainText('finished this sweep');
  await expect(key).toContainText('stage just moved');

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('blocker-named'), {animate: false}));
  const activePhase = page.locator('#phase-row .phase.active');
  await expect(activePhase).toHaveCount(1);
  expect(await activePhase.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(30, 75, 184)');

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('answer-recorded'), {animate: false}));
  const phaseCount = await page.evaluate(() => JSON.parse(document.querySelector('#simulator-data').textContent).vocabulary.phases.length);
  await expect(page.locator('#phase-row .phase.waiting')).toHaveCount(phaseCount);
  await expect(page.locator('#phase-row .phase.complete')).toHaveCount(0);
  await expect(page.locator('#meter .slot[data-spent="true"]')).toHaveCount(0);

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('increment-one-branch'), {animate: false}));
  await expect(page.locator('#phase-row .phase.active')).toHaveText('work');
});

test('an item that survives a step is the same element, and a finished one leaves', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);

  // Tag the live nodes, step, and see which tags survived. A rebuilt list would
  // lose every tag — which is exactly what the first version did.
  const survived = await page.evaluate(async () => {
    const container = document.querySelector('#items');
    const find = () => [...container.children].filter(node => node.dataset.exiting !== 'true');
    window.simulatorState.show(window.simulatorState.indexOf('objectives-merged'), {animate: false});
    const before = find().map(node => node.dataset.key);
    for (const node of find()) node.dataset.probe = node.dataset.key;
    window.simulatorState.show(window.simulatorState.indexOf('blocker-named'), {animate: false});
    const after = find();
    return {
      before,
      after: after.map(node => node.dataset.key),
      probed: after.filter(node => node.dataset.probe === node.dataset.key).map(node => node.dataset.key),
    };
  });
  expect(survived.before).toContain('interaction');
  expect(survived.after).toContain('interaction');
  expect(survived.probed).toContain('interaction');

  // The blocked item recoloured in place rather than being replaced.
  await expect(page.locator('#items [data-key="interaction"]')).toHaveAttribute('data-item-state', 'blocked');

  // A merge removes an item: the key disappears from the list.
  const cascade = await page.evaluate(async () => {
    const container = document.querySelector('#items');
    const keys = () => [...container.children].filter(node => node.dataset.exiting !== 'true').map(node => node.dataset.key);
    window.simulatorState.show(window.simulatorState.indexOf('answer-recorded'), {animate: false});
    const before = keys();
    window.simulatorState.show(window.simulatorState.indexOf('spec-merged'), {animate: false});
    return {before, after: keys()};
  });
  expect(cascade.before).toContain('spec');
  expect(cascade.after).not.toContain('spec');
  expect(cascade.after).toContain('plan');
});

test('the sweep step spends its allowance over time and can be interrupted', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  const spent = () => page.locator('#meter .slot[data-spent="true"]').count();

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('sweep-runs')));
  expect(await spent()).toBe(0);
  await expect.poll(spent, {timeout: 6000}).toBeGreaterThan(0);
  await expect.poll(spent, {timeout: 6000}).toBe(await page.locator('#meter .slot').count());
  await expect(page.locator('#items [data-item-state="passed"]')).toBeVisible();

  // Navigating away mid-choreography cancels its pending beats.
  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('sweep-runs')));
  await page.locator('#step').click();
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.simulatorState.current())).toBe(
    await page.evaluate(() => window.simulatorState.indexOf('answer-recorded'))
  );
});

test('the record accumulates and never empties out', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  const count = await stepCount(page);
  const documents = await page.evaluate(async total => {
    const seen = [];
    for (let index = 0; index < total; index += 1) {
      window.simulatorState.show(index, {animate: false});
      seen.push([...document.querySelectorAll('#documents .document')].map(node => node.textContent));
    }
    return seen;
  }, count);

  for (let index = 1; index < documents.length; index += 1) {
    for (const name of documents[index - 1]) expect(documents[index]).toContain(name);
  }
  expect(documents.at(-1).length).toBeGreaterThan(0);
});

test('the redesign keeps the lifecycle visible and identifies who acts', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  await expect(page).toHaveTitle('SitePrep Repo Guide: lifecycle simulator');
  expect(await page.locator('.lifecycle').evaluate(node => getComputedStyle(node).position)).toBe('sticky');
  await expect(page.locator('#stage-track [data-stage]')).toHaveCount(8);
  await expect(page.locator('#documents .document')).toContainText(['wish.md']);

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('wish-written'), {animate: false}));
  await expect(page.locator('body')).toHaveAttribute('data-actor', 'person');
  await expect(page.locator('#actor')).toHaveText(/person/i);
  expect(await page.locator('.story').evaluate(node => getComputedStyle(node).borderLeftColor)).toBe('rgb(199, 119, 0)');

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('research-choice'), {animate: false}));
  await expect(page.locator('body')).toHaveAttribute('data-actor', 'agent');
  await expect(page.locator('#fork')).toHaveAttribute('data-visible', 'true');
  await expect(page.locator('#fork-options')).toContainText('Research notes added');
  expect(await page.locator('.story').evaluate(node => getComputedStyle(node).borderLeftColor)).toBe('rgb(30, 75, 184)');
});

test('the digest changes and the pull-request trail is visible', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('blocker-named'), {animate: false}));
  await expect(page.locator('#digest')).toContainText('A line was added for you');
  await expect(page.locator('#digest .digest-line')).toHaveCount(1);

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('answer-recorded'), {animate: false}));
  await expect(page.locator('#digest')).toContainText('Your answer removed the line');
  await expect(page.locator('#digest .digest-line')).toHaveCount(0);

  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('increment-two-branch'), {animate: false}));
  await expect(page.locator('#flow-section h3')).toHaveText('Current work path');
  await expect(page.locator('.flow-help')).toContainText('can cross stages');
  await expect(page.locator('#flow')).toContainText('write-scope check');
  await expect(page.locator('#flow')).toContainText('branch preview');
  await expect(page.locator('#flow')).toContainText('ready pull request');
  await page.evaluate(() => window.simulatorState.show(window.simulatorState.indexOf('outputs-registered'), {animate: false}));
  await expect(page.locator('#flow')).toContainText('you merge');
  await expect(page.locator('#items .item')).toHaveCount(2);
});

test('Play advances by itself and can be paused and resumed', async ({page}) => {
  await page.goto(pathToFileURL(outputPath).href);
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => window.simulatorState.current()), {timeout: 15000}).toBeGreaterThanOrEqual(1);
  await page.locator('#play').click();
  expect(await page.evaluate(() => window.simulatorState.playing())).toBe(false);
  const pausedAt = await page.evaluate(() => window.simulatorState.current());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.simulatorState.current())).toBe(pausedAt);
  await page.locator('#play').click();
  expect(await page.evaluate(() => window.simulatorState.playing())).toBe(true);
  await page.locator('#play').click();

  const visited = await page.evaluate(() => window.simulatorState.visited());
  expect(visited).toEqual([...visited].sort((left, right) => left - right));
});
