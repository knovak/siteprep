import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

import {importVerdictFile} from '../src/verdict-import.mjs';

const fixture = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
const freshStore = () => fixture('store-fixture.json');

test('good verdicts and tag edits land on existing stories only', () => {
  const store = freshStore();
  const originalCount = store.stories.length;
  const report = importVerdictFile(store, fixture('verdicts-good.json'), {now: '2026-08-18T12:05:00.000Z'});

  assert.equal(report.added, 0);
  assert.equal(report.matched, 3);
  assert.equal(report.merged, 0);
  assert.equal(report.conflicted, 0);
  assert.equal(report.updated, 3);
  assert.equal(report.duplicate, false);
  assert.equal(store.stories.length, originalCount);

  const kept = store.stories.find(story => story.id === 'u1-e24c46cc4a50e555');
  assert.equal(kept.verdict, 'kept');
  assert.ok(kept.tags.includes('theme:selected'));
  assert.ok(!kept.tags.includes('theme:better-news'));
});

test('the same verdict file is a complete no-op the second time', () => {
  const store = freshStore();
  const file = fixture('verdicts-good.json');
  const first = importVerdictFile(store, file, {now: '2026-08-18T12:05:00.000Z'});
  const afterFirst = JSON.stringify(store);
  const second = importVerdictFile(store, file, {now: '2026-08-18T12:06:00.000Z'});

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.file_hash, first.file_hash);
  assert.equal(JSON.stringify(store), afterFirst, 'a duplicate must not append another run record');
});

test('story content, additions, and deletions in a verdict file are inert', () => {
  const store = freshStore();
  const target = store.stories[1];
  const originalTitle = target.title;
  const originalCount = store.stories.length;
  importVerdictFile(store, {
    store_id: store.store_id,
    exported_at: '2026-08-18T13:00:00.000Z',
    verdicts: [{
      id: target.id,
      verdict: 'kept',
      verdict_at: '2026-08-18T13:00:00.000Z',
      title: 'A title the page is not allowed to write',
      text: 'Untrusted text',
    }],
    tags: [],
    stories: [{id: 'invented', title: 'Must not be created'}],
    delete: [store.stories[2].id],
  });

  assert.equal(store.stories.length, originalCount);
  assert.equal(target.title, originalTitle);
  assert.equal(target.verdict, 'kept');
  assert.ok(!store.stories.some(story => story.id === 'invented'));
});

test('two sittings imported out of order resolve by verdict_at', () => {
  const store = freshStore();
  const id = store.stories[2].id;
  const sitting = (verdict, verdictAt, exportedAt) => ({
    store_id: store.store_id,
    exported_at: exportedAt,
    verdicts: [{id, verdict, verdict_at: verdictAt}],
    tags: [],
  });

  const later = importVerdictFile(store, sitting('kept', '2026-08-18T15:00:00.000Z', '2026-08-18T15:01:00.000Z'));
  const earlier = importVerdictFile(store, sitting('dropped', '2026-08-18T14:00:00.000Z', '2026-08-18T15:02:00.000Z'));
  assert.equal(later.updated, 1);
  assert.equal(earlier.updated, 0);
  assert.equal(store.stories.find(story => story.id === id).verdict, 'kept');
});

test('an unknown verdict is stored and added to the open vocabulary', () => {
  const store = freshStore();
  const file = fixture('verdicts-unknown-verdict.json');
  importVerdictFile(store, file);
  const story = store.stories.find(candidate => candidate.id === file.verdicts[0].id);
  assert.equal(story.verdict, 'archive');
  assert.ok(store.vocabularies.verdict.includes('archive'));
});

test('a mismatched store is refused before mutation and names both ids', () => {
  const store = freshStore();
  const before = JSON.stringify(store);
  assert.throws(
    () => importVerdictFile(store, fixture('verdicts-wrong-store.json')),
    /another-store-v1.*fixture-store-v1/,
  );
  assert.equal(JSON.stringify(store), before);
});

test('unknown ids and ambiguous equal-time verdicts are reported, not invented', () => {
  const store = freshStore();
  const target = store.stories[0];
  const before = target.verdict;
  const report = importVerdictFile(store, {
    store_id: store.store_id,
    exported_at: '2026-08-18T16:00:00.000Z',
    verdicts: [
      {id: 'missing-story', verdict: 'kept', verdict_at: '2026-08-18T16:00:00.000Z'},
      {id: target.id, verdict: 'dropped', verdict_at: target.verdict_at},
    ],
    tags: [],
  });
  assert.equal(report.conflicted, 2);
  assert.deepEqual(report.conflicts.sort(), ['missing-story', target.id].sort());
  assert.equal(target.verdict, before);
});

test('each nonduplicate import records the §7.1 merge counters and fingerprint', () => {
  const store = freshStore();
  const report = importVerdictFile(store, fixture('verdicts-good.json'), {now: '2026-08-18T17:00:00.000Z'});
  const run = store.runs.at(-1);
  assert.equal(run.kind, 'verdict-import');
  for (const field of ['added', 'matched', 'merged', 'conflicted']) assert.equal(run[field], report[field]);
  assert.match(run.file_hash, /^[a-f0-9]{64}$/);
});
