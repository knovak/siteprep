import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, test} from 'node:test';
import {chromium} from '@playwright/test';

import {reviewPageHtml} from '../src/review-page.mjs';
import {applyTaggingPass} from '../../../../.claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs';

const fixturePath = new URL('../fixtures/store-fixture.json', import.meta.url).pathname;
const cliPath = new URL('../publish-page.mjs', import.meta.url).pathname;
const base = JSON.parse(readFileSync(fixturePath, 'utf8'));
const taggingProposal = JSON.parse(readFileSync(new URL('../fixtures/tagging-proposal.json', import.meta.url), 'utf8'));

// A judged store, derived rather than committed: a second 74-story fixture would
// drift from the first, and the point here is the selection, not the content.
// The cycle gives every state a turn, including the unjudged one - the store a
// real sitting leaves behind is never fully judged.
const VERDICT_CYCLE = ['kept', 'emphasised', 'dropped', null];
function judged(store = base) {
  const copy = structuredClone(store);
  copy.stories.forEach((story, index) => {
    story.verdict = VERDICT_CYCLE[index % VERDICT_CYCLE.length];
    story.verdict_at = story.verdict === null ? null : '2026-08-19T12:00:00.000Z';
  });
  return copy;
}

const PUBLISH = {title: 'Newsletter stories', include: ['kept', 'emphasised'], judgeable: false};
const store = judged();
const expectedPublished = store.stories.filter(story => PUBLISH.include.includes(story.verdict));
const html = reviewPageHtml(store, PUBLISH);

const directory = mkdtempSync(join(tmpdir(), 'newsletter-publish-'));
const output = join(directory, 'published.html');
writeFileSync(output, html, 'utf8');

let browser;
before(async () => { browser = await chromium.launch({headless: true}); });
after(async () => { await browser.close(); });

async function openPublished(file = output) {
  const page = await browser.newPage();
  const externalRequests = [];
  const errors = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`file://${file}`);
  return {page, externalRequests, errors};
}

function embeddedPayload(source) {
  const match = source.match(/<script id="store-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'the page embeds its data');
  return JSON.parse(match[1].replaceAll('\\u003c', '<').replaceAll('\\u003e', '>').replaceAll('\\u0026', '&'));
}

test('only kept and emphasised stories are published', async () => {
  assert.ok(expectedPublished.length > 0 && expectedPublished.length < store.stories.length);
  const payload = embeddedPayload(html);
  assert.deepEqual(
    payload.stories.map(story => story.id).sort(),
    expectedPublished.map(story => story.id).sort()
  );
  assert.deepEqual([...new Set(payload.stories.map(story => story.verdict))].sort(), ['emphasised', 'kept']);

  const {page, externalRequests, errors} = await openPublished();
  assert.equal(await page.locator('.story').count(), expectedPublished.length);
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  await page.close();
});

test('nothing dropped or unjudged reaches the page, by title as well as by id', async () => {
  const withheld = store.stories.filter(story => !PUBLISH.include.includes(story.verdict));
  assert.ok(withheld.length > 0);
  for (const story of withheld) {
    assert.ok(!html.includes(story.id), `withheld story ${story.id} leaked`);
  }
  const {page} = await openPublished();
  const titles = new Set(await page.locator('.title').allTextContents());
  for (const story of withheld) {
    // A title shared with a published story would be a false failure; only the
    // ones unique to the withheld set can be asserted absent.
    if (expectedPublished.some(other => other.title === story.title)) continue;
    assert.ok(!titles.has(story.title), `withheld title "${story.title}" leaked`);
  }
  await page.close();
});

test('the published file has no way to judge anything', async () => {
  for (const pattern of [/setVerdicts/, /verdictControls/, /downloadExport/, /getExport/, /window\.reviewPage/]) {
    assert.doesNotMatch(html, pattern, `${pattern} is judging machinery and must not ship`);
  }
  const {page} = await openPublished();
  for (const selector of ['#export', '#undo', '#verdict-rest', '#sweep-verdict', '#backlog', '.verdict-buttons']) {
    assert.equal(await page.locator(selector).count(), 0, `${selector} must not be present`);
  }
  assert.equal(await page.evaluate(() => typeof window.reviewPage), 'undefined');
  await page.close();
});

test('provenance does not travel, including inside the embedded data', () => {
  assert.doesNotMatch(html, /source_doc|source_anchor/);
  const payload = embeddedPayload(html);
  const serialised = JSON.stringify(payload);
  assert.doesNotMatch(serialised, /source_doc|source_anchor/);
  for (const story of payload.stories) {
    assert.ok(!('source_doc' in story) && !('source_anchor' in story));
  }
  // A run record accounts for issues by source_doc, so the runs block is the
  // same leak one level up.
  assert.equal(payload.runs, undefined);
  for (const source of store.stories.map(story => story.source_doc).filter(Boolean)) {
    assert.ok(!html.includes(source), `source document "${source}" leaked`);
  }
});

test('a published story carries only the allow-listed fields', () => {
  const allowed = new Set(['id', 'url', 'title', 'text', 'text_is_summary', 'source', 'issue_date', 'story_date', 'tags', 'verdict']);
  for (const story of embeddedPayload(html).stories) {
    for (const key of Object.keys(story)) {
      assert.ok(allowed.has(key), `unexpected published field "${key}"`);
    }
  }
});

test('it is the review renderer with two arguments changed, not a second renderer', async () => {
  // Same function, same module: publishing is an option, not a fork.
  assert.equal(typeof reviewPageHtml, 'function');
  assert.equal(reviewPageHtml(store, PUBLISH), html);

  // The review page over the same store still judges, so nothing was removed
  // from the renderer itself.
  const review = reviewPageHtml(store);
  assert.match(review, /id="export"/);
  assert.match(review, /id="backlog"/);

  // And a story renders the same way in both: same classes, same content.
  const sample = expectedPublished[0];
  const readCard = async (source) => {
    const file = join(directory, `card-${source === html ? 'published' : 'review'}.html`);
    writeFileSync(file, source, 'utf8');
    const page = await browser.newPage();
    await page.goto(`file://${file}`);
    const card = page.locator(`.story[data-id="${sample.id}"]`);
    await card.locator('summary').click();
    const shape = {
      title: await card.locator('.title').textContent(),
      meta: await card.locator('.meta').first().textContent(),
      text: await card.locator('.story-text').first().textContent(),
      tags: await card.locator('.tag').allTextContents(),
      link: await card.locator('.story-link').count()
    };
    await page.close();
    return shape;
  };
  assert.deepEqual(await readCard(html), await readCard(review));
});

test('a cluster publishes as one entry, with withheld members left out', async () => {
  const tagged = judged(applyTaggingPass(base, taggingProposal).store);
  const clusterTag = taggingProposal.clusters[0].tag;
  const memberIds = taggingProposal.clusters[0].story_ids;
  const publishedMembers = memberIds.filter(
    id => PUBLISH.include.includes(tagged.stories.find(story => story.id === id).verdict)
  );
  assert.ok(publishedMembers.length >= 2 && publishedMembers.length < memberIds.length);

  const file = join(directory, 'clustered.html');
  writeFileSync(file, reviewPageHtml(tagged, PUBLISH), 'utf8');
  const {page, errors} = await openPublished(file);
  const cluster = page.locator('.story.cluster');
  assert.equal(await cluster.count(), 1);
  await cluster.locator(':scope > summary').click();
  assert.equal(await cluster.locator('.cluster-member').count(), publishedMembers.length);
  assert.equal(await cluster.locator('.cluster-member .verdict-buttons').count(), 0);
  assert.ok((await cluster.locator('.cluster-paraphrase').textContent()).length > 0);
  assert.deepEqual(errors, []);
  await page.close();

  const payload = embeddedPayload(reviewPageHtml(tagged, PUBLISH));
  assert.deepEqual(Object.keys(payload.clusters), [clusterTag]);
  assert.deepEqual(payload.clusters[clusterTag].members.sort(), [...publishedMembers].sort());
  assert.deepEqual(Object.keys(payload.clusters[clusterTag]).sort(), ['members', 'paraphrase', 'tag']);
});

test('sorting and filtering survive publication, because a theme is how a page is read', async () => {
  const {page} = await openPublished();
  await page.locator('#sort').selectOption('source');
  const sources = await page.locator('.story').evaluateAll(nodes => nodes.map(node => node.dataset.source));
  assert.deepEqual(sources, [...sources].sort());
  const tag = 'theme:energy-notes';
  await page.locator('#filter').selectOption(tag);
  const tags = await page.locator('.story').evaluateAll(nodes => nodes.map(node => JSON.parse(node.dataset.tags)));
  assert.ok(tags.length > 0 && tags.every(values => values.includes(tag)));
  await page.close();
});

test('the CLI publishes the same file and reports what it withheld', () => {
  const storeFile = join(directory, 'store.json');
  const cliOutput = join(directory, 'cli.html');
  writeFileSync(storeFile, JSON.stringify(store), 'utf8');
  const report = execFileSync(process.execPath, [cliPath, storeFile, cliOutput], {encoding: 'utf8'});
  assert.equal(readFileSync(cliOutput, 'utf8'), html);
  assert.match(report, new RegExp(`published ${expectedPublished.length} of ${store.stories.length} stories`));
  assert.equal(statSync(cliOutput).mode & 0o777, 0o644);
});
