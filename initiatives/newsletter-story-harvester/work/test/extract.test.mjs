// Phase 2's exit - one row per row of `test-plan.md` §4.2.
//
// Table-driven, as §4.2 says: one fixture issue, one recorded reply, one
// expected record set. The recorded replies are deliberately *not* idealised -
// they carry the chrome, an invented blurb, a duplicate and an impossible link
// index - because a fixture that agrees with the pipeline tests the recording
// rather than the pipeline.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractIssue, summariseRun } from '../src/extract.mjs';
import { recordedModel, stubModel } from '../src/model.mjs';
import { appearsIn, readDocument } from '../src/html.mjs';

const ISSUES = new URL('../fixtures/issues/', import.meta.url).pathname;
const RESPONSES = new URL('../fixtures/responses/', import.meta.url).pathname;
const model = recordedModel(RESPONSES);
const NOW = '2026-01-13T09:00:00Z';

const html = (id) => readFileSync(`${ISSUES}${id}.html`, 'utf8');

function issueFor(id, shape, extra = {}) {
  return {
    id,
    html: html(id),
    source: `src-${id}`,
    issue_date: '2026-01-12',
    shape,
    ...extra
  };
}

const run = (id, shape, options = {}) =>
  extractIssue(issueFor(id, shape), { model, now: NOW, ...options });

// --------------------------------------------------------------- the yields

test('link-list yields one story per story link, and none from the chrome', async () => {
  const { records, report } = await run('link-list-typical', 'link-list');

  assert.equal(records.length, 40);
  assert.equal(report.band.inside, true);

  const urls = records.map((r) => r.url || '').join(' ');
  assert.doesNotMatch(urls, /ridgeline/, 'a sponsor link became a story');
  assert.doesNotMatch(urls, /unsubscribe|preferences|mailto/, 'a footer link became a story');
  assert.equal(report.refused_by_reason.chrome, 2);
});

test('a section heading is not a story, including the one that is a link', async () => {
  const { records, report } = await run('link-list-headings', 'link-list');

  assert.equal(records.length, 13);
  assert.equal(report.refused_by_reason['section heading'], 1);
  assert.ok(!records.some((r) => r.title === 'Climate'), 'a section heading became a story');
});

test('an item with three paragraphs is one story, not three', async () => {
  const { records } = await run('annotated-digest-typical', 'annotated-digest');

  assert.equal(records.length, 8);
  const long = records.find((r) => r.title === 'What the storage build actually displaced');
  assert.match(long.text, /counterfactual analysis/);
  assert.match(long.text, /raised emissions slightly for six months/);
  assert.equal(records.filter((r) => r.url === long.url).length, 1);
});

test('long-form yields exactly one story, and no citation becomes one', async () => {
  const { records, report } = await run('long-form-citations', 'long-form');
  const document = readDocument(html('long-form-citations'), { docId: 'long-form-citations' });

  assert.equal(records.length, 1);
  assert.equal(report.links_in_document > 25, true, 'the fixture should be citation-dense');
  assert.equal(records[0].url, 'https://slowboring.example.com/p/the-shortage-is-permits');
  assert.equal(records[0].source_anchor, 'document');
  assert.ok(!document.links
    .filter((l) => l.href.includes('citations.example.org'))
    .some((l) => records.some((r) => r.url === l.href)), 'a citation became a story');
});

test('a long-form column with no URL of its own is still a story', async () => {
  const reply = JSON.stringify([{ link_index: null, title: 'Email-only column', text: 'A summary.' }]);
  const { records } = await extractIssue(
    issueFor('long-form-citations', 'long-form'),
    { model: stubModel(reply), now: NOW }
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].url, null);
  assert.equal(records[0].source_anchor, 'document');
  assert.match(records[0].id, /^a1-/, 'a story with no URL takes the anchor identity');
});

// ------------------------------------------------------------ the record

test('text_is_summary is true on long-form and false on the verbatim shapes', async () => {
  const column = await run('long-form-citations', 'long-form');
  const list = await run('link-list-typical', 'link-list');
  const digest = await run('annotated-digest-typical', 'annotated-digest');

  assert.equal(column.records[0].text_is_summary, true);
  assert.ok(list.records.every((r) => r.text_is_summary === false));
  assert.ok(digest.records.every((r) => r.text_is_summary === false));
});

test('extraction never invents text on a verbatim shape', async () => {
  for (const [id, shape] of [['link-list-typical', 'link-list'], ['annotated-digest-typical', 'annotated-digest']]) {
    const { records } = await run(id, shape);
    const document = readDocument(html(id), { docId: id });
    for (const record of records) {
      assert.ok(appearsIn(document, record.text), `invented text in ${id}: ${record.title}`);
    }
  }
});

test('a blurb that is not in the issue is refused rather than stored', async () => {
  const { records, report } = await run('link-list-typical', 'link-list');
  assert.equal(report.refused_by_reason['text not in the issue'], 1);
  assert.ok(!records.some((r) => /observers describe as pivotal/.test(r.text)));
});

test('two findings on one link are one story', async () => {
  const { report } = await run('link-list-typical', 'link-list');
  assert.equal(report.refused_by_reason['duplicate anchor'], 1);
  assert.equal(new Set(report.story_ids).size, report.story_ids.length);
});

test('a finding pointing at a link the issue does not have is refused', async () => {
  const { report } = await run('link-list-typical', 'link-list');
  assert.equal(report.refused_by_reason['no such link'], 1);
});

// ------------------------------------------------------------ §3.2's three

test('the declared shape may be overridden, and the record says what was extracted', async () => {
  const declared = await run('long-form-roundup', 'long-form');
  assert.equal(declared.records.length, 1);
  assert.equal(declared.records[0].shape, 'long-form');

  const { records, report } = await run('long-form-roundup', 'long-form', { overrideShape: 'link-list' });
  assert.equal(records.length, 12);
  assert.ok(records.every((r) => r.shape === 'link-list'), 'shape is what was extracted, not what was expected');
  assert.equal(report.declared_shape, 'long-form');
  assert.equal(report.extracted_shape, 'link-list');
  assert.equal(report.overridden, true);
});

test('a yield outside the band flags every story from that issue, and stores them all', async () => {
  const document = readDocument(html('link-list-typical'), { docId: 'link-list-typical' });
  const three = document.links.slice(4, 7).map((link) => ({
    link_index: link.index,
    title: link.text,
    text: link.text
  }));

  const { records, report } = await extractIssue(
    issueFor('link-list-typical', 'link-list'),
    { model: stubModel(JSON.stringify(three)), now: NOW }
  );

  assert.equal(records.length, 3, 'the stories are still written');
  assert.ok(records.every((r) => r.tags.includes('err:count')));
  assert.equal(report.flagged, true);
  assert.equal(report.band.direction, 'under');
});

test('a yield inside the band tags nothing', async () => {
  const { records, report } = await run('link-list-typical', 'link-list');
  assert.equal(report.flagged, false);
  assert.ok(records.every((r) => !r.tags.includes('err:count')));
});

test('a long-form issue yielding more than one story is reported first, and by name', async () => {
  const document = readDocument(html('long-form-citations'), { docId: 'long-form-citations' });
  const many = document.links.slice(1, 6).map((link) => ({
    link_index: link.index,
    title: link.text,
    text: 'A summary of a citation that should never have become a story.'
  }));

  const { report } = await extractIssue(
    issueFor('long-form-citations', 'long-form', { source: 'slow-boring' }),
    { model: stubModel(JSON.stringify(many)), now: NOW }
  );

  assert.ok(report.loud, 'the loud case was not raised');
  assert.equal(report.loud.source, 'slow-boring');
  assert.equal(report.loud.stories, 5);
  assert.match(report.loud.message, /declared long-form/);

  const other = await run('link-list-typical', 'link-list');
  const summary = summariseRun([other.report, report]);
  assert.equal(summary.loud.length, 1);
  assert.equal(summary.loud[0].issue_id, 'long-form-citations');
});

test('an issue that matched and yielded nothing is reported, not silent', async () => {
  const { records, report } = await run('empty-issue', 'link-list');
  assert.equal(records.length, 0);
  assert.equal(report.issue_id, 'empty-issue');
  assert.equal(report.flagged, true);
});

// ------------------------------------------------------------ §6, and O1

test('nothing of the mail survives extraction', async () => {
  const results = await Promise.all([
    run('link-list-typical', 'link-list'),
    run('annotated-digest-typical', 'annotated-digest'),
    run('long-form-citations', 'long-form')
  ]);

  for (const { records, report } of results) {
    const serialised = JSON.stringify({ records, report });
    assert.doesNotMatch(serialised, /<html|<body|<p>|<a |<img|href=/i, 'markup reached a record or a report');
    assert.doesNotMatch(serialised, /e=abc123|j=eyJ/, 'a recipient identifier reached a record');
  }
});

test('two runs over the same issue produce the same ids', async () => {
  const first = await run('link-list-typical', 'link-list');
  const second = await run('link-list-typical', 'link-list');
  assert.deepEqual(first.report.story_ids, second.report.story_ids);
});

test('a harvester writes no verdict', async () => {
  const { records } = await run('link-list-typical', 'link-list');
  assert.ok(records.every((r) => r.verdict === null && r.verdict_at === null));
  assert.ok(records.every((r) => r.harvester === 'harvest-newsletters'));
});
