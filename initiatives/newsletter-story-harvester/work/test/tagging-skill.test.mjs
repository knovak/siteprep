import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

import {
  applyTaggingPass,
  prepareTaggingBrief,
  undoTaggingPass,
} from '../../../../.claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/store-fixture.json', import.meta.url), 'utf8'));
const proposal = JSON.parse(readFileSync(new URL('../fixtures/tagging-proposal.json', import.meta.url), 'utf8'));

function withoutMutableTagState(story) {
  const clone = structuredClone(story);
  delete clone.tags;
  return clone;
}

test('the prepared brief exposes content for judgment but no mailbox provenance or links', () => {
  const brief = prepareTaggingBrief(fixture);
  assert.equal(brief.store_id, fixture.store_id);
  assert.equal(brief.stories.length, fixture.stories.length);
  assert.deepEqual(Object.keys(brief.stories[0]), ['id', 'title', 'text', 'source', 'issue_date', 'story_date', 'tags']);
  assert.doesNotMatch(JSON.stringify(brief), /source_doc|source_anchor|url_key|harvester/);
});

test('a tagging pass is additive and writes only tags, clusters, and its run record', () => {
  const {store, report} = applyTaggingPass(fixture, proposal);
  assert.deepEqual(report, {
    pass_id: proposal.pass_id,
    stories_tagged: 12,
    tags_added: 16,
    clusters_added: 1,
  });
  assert.equal(store.clusters['about:permitting-reform'].paraphrase, proposal.clusters[0].paraphrase);
  assert.equal(store.clusters['about:permitting-reform'].pass_id, proposal.pass_id);
  assert.deepEqual(
    store.stories.map(withoutMutableTagState),
    fixture.stories.map(withoutMutableTagState),
  );
  assert.equal(store.stories.find(story => story.id === 'u1-ad708cd385a8323e').verdict, null);
  const run = store.runs.at(-1);
  assert.equal(run.kind, 'tagging');
  assert.equal(run.added_tags.length, 12);
  assert.equal(run.added_clusters[0], 'about:permitting-reform');
});

test('a second equivalent pass keeps existing tags and cluster metadata intact', () => {
  const first = applyTaggingPass(fixture, proposal).store;
  const secondProposal = {...proposal, pass_id: 'tag-2026-08-19-fixture-rerun', created_at: '2026-08-19T19:00:00.000Z'};
  const {store, report} = applyTaggingPass(first, secondProposal);
  assert.equal(report.tags_added, 0);
  assert.equal(report.clusters_added, 0);
  assert.equal(store.clusters['about:permitting-reform'].pass_id, proposal.pass_id);
});

test('undo removes the pass as a set and restores the previous tags and clusters exactly', () => {
  const applied = applyTaggingPass(fixture, proposal).store;
  const {store, report} = undoTaggingPass(applied, proposal.pass_id, {at: '2026-08-19T20:00:00.000Z'});
  assert.equal(report.tags_removed, 16);
  assert.equal(report.clusters_removed, 1);
  assert.deepEqual(store.stories.map(story => story.tags), fixture.stories.map(story => story.tags));
  assert.deepEqual(store.clusters, {});
  assert.equal(store.runs.at(-1).kind, 'tagging-undo');
  assert.equal(store.runs.find(run => run.pass_id === proposal.pass_id).undone_at, '2026-08-19T20:00:00.000Z');
});

test('undo refuses to erase tag changes made after the pass', () => {
  const applied = applyTaggingPass(fixture, proposal).store;
  applied.stories[0].tags.push('typed-later');
  assert.throws(() => undoTaggingPass(applied, proposal.pass_id), /refusing an inexact undo/);
});

test('proposal validation refuses protected ambiguity before changing the input', () => {
  const wideStore = structuredClone(fixture);
  wideStore.stories.find(story => story.id === 'u1-35d05ba574a25c0e').story_date = '2026-03-01';
  const original = structuredClone(wideStore);
  const tooWide = structuredClone(proposal);
  tooWide.pass_id = 'tag-2026-08-19-too-wide';
  tooWide.clusters[0].story_ids = ['u1-02359c5422b725ec', 'u1-35d05ba574a25c0e'];
  assert.throws(() => applyTaggingPass(wideStore, tooWide), /more than fourteen days/);
  assert.deepEqual(wideStore, original);

  const wrongStore = {...proposal, pass_id: 'tag-2026-08-19-wrong-store', store_id: 'somewhere-else'};
  assert.throws(() => applyTaggingPass(fixture, wrongStore), /does not match/);
});
