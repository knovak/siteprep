// test-plan.md §4.1, the merge rows - which is most of them, because this is
// the phase whose test is more interesting than its code (`plan.md` §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { emptyStore, exportStore, indexStore } from '../src/store.mjs';
import { mergeRecords, importStore, recordRun } from '../src/merge.mjs';
import { buildUrlKey } from '../src/url-key.mjs';
import { makeRecord } from '../src/identity.mjs';

const overlap = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/overlap.json', import.meta.url)), 'utf8')
);

const NOW = '2026-08-17T00:00:00.000Z';
const LATER = '2026-08-18T00:00:00.000Z';

/**
 * A fixture record, with its url_key built the way a harvest would build it.
 * Overrides apply to the *spec*, so overriding `url_raw` really does change
 * the link rather than leaving a key derived from the fixture's own.
 */
function fixtureRecord(spec, overrides = {}) {
  const { url_raw, unwrap, ...rest } = { ...spec, ...overrides };
  const link = buildUrlKey(url_raw, { unwrap: unwrap || undefined });
  return {
    ...rest,
    url: link.url,
    url_key: link.url_key,
    tags: [...(rest.tags || []), ...link.tags]
  };
}

function storeWith(...records) {
  const store = emptyStore();
  mergeRecords(store, records, { now: NOW });
  return store;
}

test('the same records imported twice change nothing the second time', () => {
  const store = storeWith(fixtureRecord(overlap.a));
  const before = JSON.stringify(store.stories);

  const report = mergeRecords(store, [fixtureRecord(overlap.a)], { now: LATER });

  assert.equal(report.added, 0);
  assert.equal(report.matched, 1);
  assert.equal(store.stories.length, 1);
  assert.equal(JSON.stringify(store.stories), before, 'harvested_at moved, or text changed');
});

test('a re-harvest never moves harvested_at and never touches a verdict', () => {
  const store = storeWith(fixtureRecord(overlap.a));
  store.stories[0].verdict = 'kept';
  store.stories[0].verdict_at = NOW;

  mergeRecords(store, [fixtureRecord(overlap.a, { title: 'Re-titled by a better extractor' })], { now: LATER });

  assert.equal(store.stories[0].harvested_at, NOW);
  assert.equal(store.stories[0].verdict, 'kept');
  assert.equal(store.stories[0].title, overlap.a.title, 'first write wins on what the reader sees');
});

test('two sources carrying one article become one record, both sources kept', () => {
  const store = storeWith(fixtureRecord(overlap.a));
  const report = mergeRecords(store, [fixtureRecord(overlap.b)], { now: NOW });

  assert.equal(report.merged, 1);
  assert.equal(store.stories.length, 1, 'the reader should spend one decision, not two');

  const [story] = store.stories;
  assert.equal(story.issue_date, overlap.b.issue_date, 'the earliest issue_date is kept');
  assert.equal(story.source, overlap.b.source, 'and the source that goes with it');
  assert.ok(story.tags.includes(`source:${overlap.a.source}`));
  assert.ok(story.tags.includes(`source:${overlap.b.source}`));
  assert.deepEqual(
    story.tags.filter((t) => t.startsWith('theme:')).sort(),
    ['theme:energy', 'theme:policy'],
    'tags union, which is what makes this need no resolution rule'
  );
  assert.equal(story.merged_from.length, 1);
});

test('the merge happens because the two links unwrap to the same URL', () => {
  // The point of story-record.md §4: matching before unwrapping makes this
  // fail silently. Guard the premise, so a broken unwrap table shows up here
  // as a merge that did not happen rather than as a mystery.
  const a = fixtureRecord(overlap.a);
  const b = fixtureRecord(overlap.b);
  assert.notEqual(overlap.a.url_raw, overlap.b.url_raw);
  assert.equal(a.url_key, b.url_key);
  assert.equal(a.url_key, 'https://www.publisher.example/the-shared-article');
});

test('every merge is recoverable from merged_from alone', () => {
  const store = storeWith(fixtureRecord(overlap.a));
  const absorbedId = makeRecord(fixtureRecord(overlap.b), { now: NOW }).id;
  mergeRecords(store, [fixtureRecord(overlap.b)], { now: NOW });

  const [story] = store.stories;
  assert.ok(story.merged_from.includes(absorbedId));
  assert.ok(!story.merged_from.includes(story.id), 'a record never absorbs itself');

  // And the absorbed id still resolves, which is what makes the merge
  // idempotent: the next harvest of the same issue re-derives that id.
  assert.equal(indexStore(store).byId.get(absorbedId).id, story.id);
  const report = mergeRecords(store, [fixtureRecord(overlap.b)], { now: LATER });
  assert.equal(report.added, 0);
  assert.equal(store.stories.length, 1);
});

test('a subset import leaves the records absent from it untouched', () => {
  const store = storeWith(
    fixtureRecord(overlap.a),
    fixtureRecord(overlap.b, { url_raw: 'https://www.publisher.example/unrelated', unwrap: null })
  );
  assert.equal(store.stories.length, 2);

  const subset = exportStore(store, { filter: (s) => s.source === overlap.a.source });
  subset.stories[0].tags = [...subset.stories[0].tags, 'read-later'];

  importStore(store, subset, { now: LATER });

  assert.equal(store.stories.length, 2, 'import never deletes - there is no sync');
  assert.ok(store.stories[0].tags.includes('read-later'));
});

test('a null verdict never displaces a real one, in either direction', () => {
  const judged = storeWith(fixtureRecord(overlap.a));
  judged.stories[0].verdict = 'emphasised';
  judged.stories[0].verdict_at = NOW;

  // Unjudged incoming: the verdict survives.
  importStore(judged, { stories: [makeRecord(fixtureRecord(overlap.a), { now: NOW })] }, { now: LATER });
  assert.equal(judged.stories[0].verdict, 'emphasised');

  // Unjudged existing, judged incoming: the verdict arrives.
  const unjudged = storeWith(fixtureRecord(overlap.a));
  importStore(
    unjudged,
    { stories: [makeRecord(fixtureRecord(overlap.a, { verdict: 'dropped', verdict_at: NOW }), { now: NOW })] },
    { now: LATER }
  );
  assert.equal(unjudged.stories[0].verdict, 'dropped');
});

test('two sittings imported out of order resolve by verdict_at', () => {
  const store = storeWith(fixtureRecord(overlap.a));
  const sitting = (verdict, at) => ({
    stories: [makeRecord(fixtureRecord(overlap.a, { verdict, verdict_at: at }), { now: NOW })]
  });

  importStore(store, sitting('kept', LATER), { now: LATER });
  importStore(store, sitting('dropped', NOW), { now: LATER });

  assert.equal(store.stories[0].verdict, 'kept', 'the later sitting wins whichever order it arrived in');
  assert.equal(store.stories[0].verdict_at, LATER);
});

test('a harvest refuses a verdict, an import accepts one', () => {
  // story-record.md §5, and the drift test-plan.md §5 pins: an "obvious junk"
  // pre-drop would quietly shrink the backlog O7 counts.
  const harvested = emptyStore();
  const report = mergeRecords(
    harvested,
    [fixtureRecord(overlap.a, { verdict: 'dropped', verdict_at: NOW })],
    { now: NOW }
  );
  assert.equal(report.refused, 1);
  assert.equal(harvested.stories[0].verdict, null);

  const imported = emptyStore();
  importStore(
    imported,
    { stories: [makeRecord(fixtureRecord(overlap.a, { verdict: 'dropped', verdict_at: NOW }), { now: NOW })] },
    { now: NOW }
  );
  assert.equal(imported.stories[0].verdict, 'dropped');
});

test('an id collision on plainly different records is reported and skipped', () => {
  const store = storeWith(fixtureRecord(overlap.a));
  const forged = makeRecord(fixtureRecord(overlap.b), { now: NOW });
  forged.id = store.stories[0].id; // as an importer with different rules would produce

  const report = mergeRecords(store, [forged], { now: LATER });

  assert.equal(report.conflicted, 1);
  assert.deepEqual(report.conflicts, [store.stories[0].id]);
  assert.equal(store.stories.length, 1);
  assert.equal(store.stories[0].title, overlap.a.title, 'never overwritten');
});

test('an unrecognised verdict loads, merges and round-trips', () => {
  // §11: a reader that validates against the vocabulary closes an open one.
  const store = storeWith(fixtureRecord(overlap.a));
  importStore(
    store,
    {
      stories: [makeRecord(fixtureRecord(overlap.a, { verdict: 'to-be-shared', verdict_at: NOW }), { now: NOW })],
      vocabularies: { verdict: ['to-be-shared'], shape: ['photo-essay'] }
    },
    { now: LATER }
  );
  assert.equal(store.stories[0].verdict, 'to-be-shared');
  assert.deepEqual(store.vocabularies.verdict, ['to-be-shared']);
  assert.deepEqual(store.vocabularies.shape, ['photo-essay']);
});

test('a story with no url is kept by its anchor, and still merges with itself', () => {
  const longForm = {
    url: null,
    url_key: null,
    title: 'A column that is the story',
    text: 'A summary, written by a harvester.',
    text_is_summary: true,
    source: 'long-form-weekly',
    harvester: 'newsletter-story-harvester',
    issue_date: '2026-08-14',
    shape: 'long-form',
    source_doc: 'issue:long-form-weekly/2026-08-14',
    source_anchor: 'whole-issue'
  };
  const store = storeWith(longForm);
  const report = mergeRecords(store, [longForm], { now: LATER });
  assert.equal(report.matched, 1);
  assert.equal(store.stories.length, 1);
  assert.ok(store.stories[0].id.startsWith('a1-'));
});

test('a run leaves a record of itself, import included', () => {
  const store = emptyStore();
  const report = mergeRecords(store, [fixtureRecord(overlap.a)], { now: NOW });
  recordRun(store, { kind: 'harvest', report, at: NOW, range: { after: '2026-08-01', before: '2026-08-15' } });

  assert.equal(store.runs.length, 1);
  assert.equal(store.runs[0].added, 1);
  assert.equal(store.runs[0].kind, 'harvest');
  assert.deepEqual(store.runs[0].range, { after: '2026-08-01', before: '2026-08-15' });
  assert.deepEqual(store.sources, [overlap.a.source], 'facets follow the data');
});
