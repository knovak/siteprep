// Phase 3's exit: test-plan.md §4.3, the whole loop over a fixture mailbox.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyStore, loadStore } from '../src/store.mjs';
import { recordedModel } from '../src/model.mjs';
import { fixtureMessageSource } from '../src/fixture-source.mjs';
import { runHarvest, runHarvestToPath } from '../src/run.mjs';

const FIXTURES = new URL('../fixtures/', import.meta.url).pathname;
const RESPONSES = `${FIXTURES}responses/`;
const inventory = JSON.parse(readFileSync(`${FIXTURES}inventory-fixture.json`, 'utf8'));
const mailbox = JSON.parse(readFileSync(`${FIXTURES}mailbox-fixture.json`, 'utf8'));
const model = recordedModel(RESPONSES);
const NOW = '2026-08-18T09:00:00.000Z';
const FIRST_RANGE = { after: '2026-01-01', before: '2026-01-20' };
const OVERLAPPING_RANGE = { after: '2026-01-10', before: '2026-02-01' };

const themes = async ({ record }) => [`theme:${record.source}`];
const source = () => fixtureMessageSource(mailbox, { root: FIXTURES });

test('an explicit range is required, and is half-open', async () => {
  await assert.rejects(
    runHarvest({ inventory, source: source(), model, store: emptyStore() }),
    /explicit range/
  );
  const result = await runHarvest({
    inventory,
    range: { after: '2026-01-12', before: '2026-01-13' },
    source: source(),
    model,
    store: emptyStore(),
    now: NOW
  });
  assert.deepEqual(result.run.source_docs.map((doc) => doc.source_doc), ['link-list-typical']);
});

test('the whole inventory is validated before any message body is read', async () => {
  const badInventory = {
    ...inventory,
    sources: [...inventory.sources, {
      key: 'unknown-shape',
      name: 'Unknown Shape',
      match: [{ type: 'from', value: 'unknown@example.test' }],
      shape: 'looks-newsletterish'
    }]
  };
  const messageSource = source();
  await assert.rejects(
    runHarvest({ inventory: badInventory, range: FIRST_RANGE, source: messageSource, model, store: emptyStore() }),
    /no contract for shape/
  );
  assert.deepEqual(messageSource.reads, []);
});

test('a whole fixture run records every matched message, including the empty one', async () => {
  const messageSource = source();
  const path = join(mkdtempSync(join(tmpdir(), 'harvester-run-')), 'store.json');
  const result = await runHarvestToPath({
    storePath: path,
    inventory,
    range: FIRST_RANGE,
    source: messageSource,
    model,
    tagger: themes,
    now: NOW
  });
  const stored = loadStore(path);

  assert.equal(stored.stories.length, 49);
  assert.equal(stored.runs.length, 1, 'the run record was not persisted');
  assert.equal(result.run.added, 49);
  assert.equal(result.run.matched, 0);
  assert.equal(result.run.merged, 0);
  assert.equal(result.run.issues, 4);
  assert.deepEqual(result.run.issues_per_source, {
    'better-news': 2,
    'energy-notes': 1,
    'permit-column': 1
  });
  assert.deepEqual(result.run.inventory, {
    id: 'fixture-inventory-v1',
    sources: ['better-news', 'energy-notes', 'permit-column']
  });

  const empty = result.run.source_docs.find((doc) => doc.source_doc === 'empty-issue');
  assert.ok(empty, 'a matched message that yielded nothing disappeared');
  assert.equal(empty.stories, 0);
  assert.equal(empty.flagged, true);
  assert.ok(result.run.flagged.some((flag) => flag.issue_id === 'empty-issue'));

  assert.ok(stored.stories.every((story) => story.tags.includes(`theme:${story.source}`)));
  assert.ok(stored.stories.every((story) => story.verdict === null && story.verdict_at === null));
  assert.deepEqual(stored.vocabularies.shape, ['annotated-digest', 'link-list', 'long-form']);

  // Gmail's from: prefilter would return this plus-tag sibling. The actual
  // From check rejects it before `read`, so it gets no source_doc either.
  assert.ok(!messageSource.reads.includes('plus-tagged-other-publication'));
  assert.ok(!result.run.source_docs.some((doc) => doc.source_doc === 'plus-tagged-other-publication'));
  assert.ok(result.run.unattributed > 0);

  const serialised = JSON.stringify(stored.runs[0]);
  assert.doesNotMatch(serialised, /<html|<body|subject|digest\+other@/i, 'mail content reached the run record');
});

test('two runs over the same range produce the same set of ids', async () => {
  const first = await runHarvest({
    inventory, range: FIRST_RANGE, source: source(), model, store: emptyStore(), tagger: themes, now: NOW
  });
  const second = await runHarvest({
    inventory, range: FIRST_RANGE, source: source(), model, store: emptyStore(), tagger: themes, now: NOW
  });
  assert.deepEqual(
    first.store.stories.map((story) => story.id).sort(),
    second.store.stories.map((story) => story.id).sort()
  );
});

test('an overlapping second run adds only stories from the new issues', async () => {
  const store = emptyStore();
  await runHarvest({ inventory, range: FIRST_RANGE, source: source(), model, store, tagger: themes, now: NOW });
  const before = new Set(store.stories.map((story) => story.id));

  const second = await runHarvest({
    inventory,
    range: OVERLAPPING_RANGE,
    source: source(),
    model,
    store,
    tagger: themes,
    now: '2026-08-18T10:00:00.000Z'
  });

  assert.equal(second.run.added, 25, 'the roundup and headings issues contain 12 + 13 stories');
  assert.equal(second.run.matched, 49, 'overlapping issues should match their first-run records');
  assert.equal(store.stories.length, 74);
  assert.ok([...before].every((id) => store.stories.some((story) => story.id === id)));
  assert.deepEqual(
    second.run.overridden,
    [{ issue_id: 'long-form-roundup', declared: 'long-form', extracted: 'link-list' }]
  );
});

test('a source absent from the inventory is never fetched', async () => {
  const inventoryWithoutEnergy = {
    ...inventory,
    sources: inventory.sources.filter((entry) => entry.key !== 'energy-notes')
  };
  const messageSource = source();
  await runHarvest({
    inventory: inventoryWithoutEnergy,
    range: FIRST_RANGE,
    source: messageSource,
    model,
    store: emptyStore(),
    now: NOW
  });
  assert.ok(!messageSource.reads.includes('annotated-digest-typical'));
});
