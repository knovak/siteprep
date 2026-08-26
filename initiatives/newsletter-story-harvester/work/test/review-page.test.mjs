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
  assert.equal(await page.locator('.story').count(), 74);
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
  assert.equal(await page.locator('.story[data-verdict=""]').count(), 73 - visibleUnjudged);
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

  assert.equal(await page.locator('.story.cluster').count(), 1);
  assert.equal(await page.locator('.story').count(), 71);
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
