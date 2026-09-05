import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, test} from 'node:test';
import {chromium} from '@playwright/test';

import {reviewPageHtml} from '../src/review-page.mjs';
import {gmailSearchString} from '../src/gmail-source.mjs';
import {importVerdictFile} from '../src/verdict-import.mjs';
import {applyTaggingPass} from '../../../../.claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs';

const fixturePath = new URL('../fixtures/store-fixture.json', import.meta.url).pathname;
const store = JSON.parse(readFileSync(fixturePath, 'utf8'));
const inventory = JSON.parse(readFileSync(new URL('../fixtures/inventory-fixture.json', import.meta.url), 'utf8'));
const sources = inventory.sources.map(source => ({name: source.name, slug: source.slug, search: gmailSearchString(source)}));
const themedStory = store.stories.find(story => story.verdict === null);
themedStory.tags = [...themedStory.tags, 'theme:clean-energy'];
const taggingProposal = JSON.parse(readFileSync(new URL('../fixtures/tagging-proposal.json', import.meta.url), 'utf8'));
const output = join(mkdtempSync(join(tmpdir(), 'newsletter-review-')), 'review.html');
writeFileSync(output, reviewPageHtml(store, {sources}), 'utf8');

let browser;
before(async () => { browser = await chromium.launch({headless: true}); });
after(async () => { await browser.close(); });

async function openPage() {
  const page = await browser.newPage();
  const externalRequests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  await page.goto(`file://${output}`);
  return {page, externalRequests};
}

test('the generated file is self-contained and has no store write path', () => {
  const html = reviewPageHtml(store);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/i);
  assert.doesNotMatch(html, /\bfetch\s*\(|XMLHttpRequest|showSaveFilePicker|writeFile/i);
  assert.match(html, /The store is never written by this page/);
});

test('it opens offline with the complete fixture and always-visible backlog', async () => {
  const {page, externalRequests} = await openPage();
  const ids = [];
  do {
    ids.push(...await page.locator('.story').evaluateAll(nodes => nodes.map(node => node.dataset.id)));
    if (await page.locator('#next').isDisabled()) break;
    await page.locator('#next').click();
  } while (true);
  assert.equal(ids.length, 74);
  assert.equal(new Set(ids).size, 74);
  await assert.doesNotReject(() => page.locator('#backlog').waitFor({state: 'visible'}));
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  assert.deepEqual(externalRequests, []);
  await page.close();
});

test('stories start expanded and the title is the only story link', async () => {
  const {page} = await openPage();
  const first = page.locator('.story').first();
  assert.equal(await first.getAttribute('open'), '');
  await assert.doesNotReject(() => first.locator('.story-text').waitFor({state: 'visible'}));
  const title = first.locator('summary .title.story-link');
  assert.ok((await title.textContent()).length > 0);
  const id = await first.getAttribute('data-id');
  const story = store.stories.find(candidate => candidate.id === id);
  assert.equal(await title.getAttribute('href'), story.url);
  assert.equal(await first.getByText('Open story', {exact: true}).count(), 0);
  await page.close();
});

test('source sort and tag filter change the visible set', async () => {
  const {page} = await openPage();
  await page.locator('#sort').selectOption('source');
  const sources = await page.locator('.story').evaluateAll(nodes => nodes.map(node => node.dataset.source));
  assert.deepEqual(sources, [...sources].sort());
  await page.locator('#filter').selectOption('theme:clean-energy');
  const tags = await page.locator('.story').evaluateAll(nodes => nodes.map(node => JSON.parse(node.dataset.tags)));
  assert.ok(tags.length > 0 && tags.every(values => values.includes('theme:clean-energy')));
  assert.equal(await page.locator('#filter option:checked').textContent(), 'Theme: clean energy');
  await page.close();
});

test('Help lists source names, slugs, and configured Gmail searches', async () => {
  const {page} = await openPage();
  await page.locator('#help').click();
  const dialog = page.locator('#help-dialog');
  await assert.doesNotReject(() => dialog.waitFor({state: 'visible'}));
  assert.equal(await dialog.locator('dt').count(), 3);
  assert.match(await dialog.textContent(), /Energy Notes Fixture \(energy-notes\)/);
  assert.match(await dialog.textContent(), /from:notes@energy\.test/);
  await page.locator('#help-close').click();
  await page.close();
});

test('verdict-rest touches only visible unjudged stories and undo restores the sweep', async () => {
  const {page} = await openPage();
  await page.locator('#filter').selectOption('theme:clean-energy');
  const visibleUnjudged = await page.locator('.story[data-verdict=""]').count();
  await page.locator('#sweep-verdict').selectOption('kept');
  await page.locator('#verdict-rest').click();
  assert.equal(await page.locator('#backlog').textContent(), `${73 - visibleUnjudged} unjudged of 74`);
  assert.equal(await page.locator('.story[data-verdict=""]').count(), 0);
  await page.locator('#filter').selectOption('');
  assert.equal((await page.evaluate(() => window.reviewPage.getExport())).verdicts.length, 1 + visibleUnjudged);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  await page.close();
});

test('an individual verdict changes backlog and one undo reverses it', async () => {
  const {page} = await openPage();
  const unjudged = page.locator('.story[data-verdict=""]').first();
  await unjudged.locator('button[data-verdict="emphasised"]').click();
  assert.equal(await page.locator('#backlog').textContent(), '72 unjudged of 74');
  await page.locator('#undo').click();
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  await page.close();
});

test('a verdict exported by the page imports against the same story id', async () => {
  const {page} = await openPage();
  const card = page.locator('.story[data-verdict=""]').first();
  const id = await card.getAttribute('data-id');
  await card.locator('button[data-verdict="kept"]').click();
  const verdictFile = await page.evaluate(() => window.reviewPage.getExport());
  const imported = structuredClone(store);
  const report = importVerdictFile(imported, verdictFile, {now: '2026-08-18T18:00:00.000Z'});
  assert.equal(report.conflicted, 0);
  assert.equal(imported.stories.find(story => story.id === id).verdict, 'kept');
  await page.close();
});

test('an unrecognised verdict displays and round-trips in the export', async () => {
  const {page} = await openPage();
  const unknown = page.locator('.story[data-verdict="to-be-shared"]');
  while (!await unknown.count() && !await page.locator('#next').isDisabled()) await page.locator('#next').click();
  assert.equal(await unknown.count(), 1);
  assert.equal(await unknown.locator('.verdict').textContent(), 'to-be-shared');
  const exported = await page.evaluate(() => window.reviewPage.getExport());
  assert.ok(exported.verdicts.some(entry => entry.verdict === 'to-be-shared'));
  assert.equal(exported.store_id, 'fixture-store-v1');
  await page.close();
});

test('the export button downloads the verdict-file shape', async () => {
  const {page} = await openPage();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let text = '';
  for await (const chunk of stream) text += chunk;
  const exported = JSON.parse(text);
  assert.deepEqual(Object.keys(exported), ['store_id', 'exported_at', 'verdicts', 'tags']);
  assert.equal(exported.store_id, 'fixture-store-v1');
  await page.close();
});

test('a cluster renders once with its member provenance and judges every member together', async () => {
  const tagged = applyTaggingPass(store, taggingProposal).store;
  const clusteredOutput = join(mkdtempSync(join(tmpdir(), 'newsletter-cluster-')), 'review.html');
  writeFileSync(clusteredOutput, reviewPageHtml(tagged), 'utf8');
  const page = await browser.newPage();
  await page.goto(`file://${clusteredOutput}`);

  await page.locator('#filter').selectOption(taggingProposal.clusters[0].tag);
  assert.equal(await page.locator('.story.cluster').count(), 1);
  assert.equal(await page.locator('.story').count(), 1);
  const cluster = page.locator('.story.cluster');
  assert.equal(await cluster.getAttribute('open'), '');
  assert.equal(await cluster.locator('.cluster-member').count(), 4);
  assert.equal(await cluster.locator('.cluster-member .story-link').count(), 4);
  assert.equal(await cluster.locator('.cluster-member .meta').count(), 4);
  await cluster.locator('.cluster-controls button[data-verdict="kept"]').click();
  assert.equal(await page.locator('#backlog').textContent(), '69 unjudged of 74');
  const exported = await page.evaluate(() => window.reviewPage.getExport());
  const memberIds = new Set(taggingProposal.clusters[0].story_ids);
  assert.equal(exported.verdicts.filter(entry => memberIds.has(entry.id) && entry.verdict === 'kept').length, 4);
  await page.close();
});


test('all six layouts have the requested rows and columns and retain off-page verdicts', async () => {
  const {page} = await openPage();
  await page.setViewportSize({width: 1600, height: 1100});
  assert.deepEqual(await page.locator('#page-layout option').evaluateAll(nodes => nodes.map(node => node.value)), ['1x1', '1x2', '1x3', '1x4', '2x3', '2x4']);
  for (const [layout, rows, columns] of [['1x1',1,1],['1x2',1,2],['1x3',1,3],['1x4',1,4],['2x3',2,3],['2x4',2,4]]) {
    await page.locator('#page-layout').selectOption(layout);
    const boxes = await page.locator('.story').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return {x:r.x,y:r.y}; }));
    assert.equal(boxes.length, rows * columns);
    assert.equal(new Set(boxes.map(box => box.x)).size, columns);
    assert.equal(new Set(boxes.map(box => box.y)).size, rows);
  }
  const first = page.locator('.story[data-verdict=""]').first();
  const id = await first.getAttribute('data-id');
  await first.locator('button[data-verdict="kept"]').click();
  await page.locator('#next').click();
  assert.ok((await page.evaluate(() => window.reviewPage.getExport())).verdicts.some(story => story.id === id && story.verdict === 'kept'));
  await page.locator('#undo').click();
  assert.ok(!(await page.evaluate(() => window.reviewPage.getExport())).verdicts.some(story => story.id === id));
  await page.close();
});

test('page sweep excludes off-page stories and preserves existing judgments', async () => {
  const {page} = await openPage();
  await page.locator('#page-layout').selectOption('1x2');
  const ids = await page.locator('.story[data-verdict=""]').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  const before = await page.evaluate(() => window.reviewPage.getExport());
  await page.locator('#sweep-verdict').selectOption('kept');
  await page.locator('#verdict-rest').click();
  const after = await page.evaluate(() => window.reviewPage.getExport());
  assert.deepEqual(after.verdicts.filter(story => !before.verdicts.some(old => old.id === story.id)).map(story => story.id).sort(), ids.sort());
  for (const old of before.verdicts) assert.deepEqual(after.verdicts.find(story => story.id === old.id), old);
  await page.locator('#next').click();
  assert.ok(await page.locator('.story[data-verdict=""]').count() > 0);
  await page.close();
});

test('Day and Night persist with layout, while selected Night outlines remain visible', async () => {
  const {page} = await openPage();
  await page.locator('#theme').selectOption('night');
  await page.locator('#page-layout').selectOption('1x2');
  await page.locator('.story[data-verdict=""]').first().locator('button[data-verdict="kept"]').click();
  const appearance = await page.locator('button[aria-pressed="true"]').first().evaluate(button => ({border:getComputedStyle(button).borderColor, width:getComputedStyle(button).borderWidth, background:getComputedStyle(document.documentElement).backgroundColor}));
  assert.equal(appearance.border, 'rgb(185, 199, 213)');
  assert.equal(appearance.width, '2px');
  assert.equal(appearance.background, 'rgb(23, 31, 40)');
  await page.reload();
  assert.equal(await page.locator('#theme').inputValue(), 'night');
  assert.equal(await page.locator('#page-layout').inputValue(), '1x2');
  assert.equal(await page.locator('#backlog').textContent(), '73 unjudged of 74');
  await page.locator('#theme').selectOption('day');
  assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(250, 243, 232)');
  await page.close();
});

test('phone layout has one card without horizontal overflow and keeps chosen layout', async () => {
  const {page} = await openPage();
  await page.locator('#page-layout').selectOption('2x4');
  await page.setViewportSize({width:390, height:844});
  await page.waitForFunction(() => document.querySelectorAll('.story').length === 1);
  assert.equal(await page.locator('.story').count(), 1);
  assert.equal(await page.locator('#page-layout').inputValue(), '2x4');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#next').click();
  await page.locator('#filter').selectOption('theme:clean-energy');
  assert.equal(await page.locator('#previous').isDisabled(), true);
  await page.setViewportSize({width:1600, height:1100});
  await page.locator('#filter').selectOption('');
  assert.equal(await page.locator('.story').count(), 8);
  await page.close();
});

test('blocked preference storage does not prevent reading or judging', async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }}); });
  await page.goto(`file://${output}`);
  await page.locator('#theme').selectOption('night');
  await page.locator('#page-layout').selectOption('1x1');
  await page.locator('.story[data-verdict=""]').first().locator('button[data-verdict="kept"]').click();
  assert.equal(await page.locator('#backlog').textContent(), '72 unjudged of 74');
  assert.deepEqual(errors, []);
  await page.close();
});

test('long text scrolls inside cards with verdict controls visible', async () => {
  const longStore = structuredClone(store);
  longStore.stories.forEach(story => { story.text = 'A long story. '.repeat(2000); });
  const file = join(mkdtempSync(join(tmpdir(), 'newsletter-long-')), 'review.html');
  writeFileSync(file, reviewPageHtml(longStore));
  const page = await browser.newPage({viewport:{width:1600,height:1100}});
  await page.goto(`file://${file}`);
  const card = page.locator('.story').first();
  const geometry = await card.evaluate(node => { const body = node.querySelector('.body'); const controls = node.querySelector('.card-controls'); return {scroll:body.scrollHeight > body.clientHeight, bodyBottom:body.getBoundingClientRect().bottom, controlsTop:controls.getBoundingClientRect().top, controlsBottom:controls.getBoundingClientRect().bottom, cardBottom:node.getBoundingClientRect().bottom}; });
  assert.ok(geometry.scroll);
  assert.ok(geometry.bodyBottom <= geometry.controlsTop + 1);
  assert.ok(geometry.controlsBottom <= geometry.cardBottom);
  await card.locator('.body').evaluate(body => {body.scrollTop = 160;});
  await card.locator('button[data-verdict="kept"]').click();
  assert.equal(await card.locator('.body').evaluate(body => body.scrollTop), 160);
  await page.close();
});
