import assert from 'node:assert/strict';
import test from 'node:test';
import {commitHarvestState, makeHarvestPreview, measureTagInventory, newHarvestState} from '../lib/harvest.mjs';

const at = '2026-09-02T01:00:00.000Z';

test('direct and browser-saved intake remain explicit about body, rights, capture, and tags', async () => {
  const preview = await makeHarvestPreview('browser-saved', {
    url: 'https://Example.com/report#section',
    title: 'Heat resilience report',
    rightsState: 'metadata-only',
    captureState: 'metadata-only',
    tags: [' Heat ', 'community'],
    savedFrom: 'browser',
  }, {createdAt: at});
  assert.equal(preview.operations.sources[0].url, 'https://example.com/report');
  assert.equal(preview.operations.sources[0].bodyState, 'metadata-only');
  assert.equal(preview.operations.sources[0].origin.route, 'browser-saved');
  assert.deepEqual(preview.operations.sources[0].tags.map(({key}) => key), ['community', 'heat']);
  assert.equal(preview.counts.sources, 1);
  assert.equal(preview.counts.tags, 2);
});

test('Bookmark Sorter tags import while its verdict remains an external judgement', async () => {
  const preview = await makeHarvestPreview('bookmark-sorter', {
    format: 'bookmark-sorter/v1', exported_at: at, collection: 'reading', selection: 'topic:heat',
    items: [{url: 'https://example.org/a', title: 'A', note: 'Owner note', tags: ['topic:heat', 'err:image'], verdict: 'keeper', verdict_at: at}],
  }, {createdAt: at});
  const source = preview.operations.sources[0];
  assert.deepEqual(source.externalJudgement, {system: 'bookmark-sorter', verdict: 'keeper', at});
  assert.equal(source.captureState, 'missing');
  assert.equal(source.rightsState, 'metadata-only');
  assert.equal(source.bodyState, 'metadata-note');
  assert.equal(source.origin.payload.note, 'Owner note');
  assert.equal(source.origin.export.collection, 'reading');
});

test('Newsletter Story Harvester imports native ids, honest body rights, and dependency proposals', async () => {
  const preview = await makeHarvestPreview('newsletter-story-harvester', {
    version: 1, store_id: 'store:fixture', runs: [{id: 'run:one', status: 'complete', completed_at: at}],
    stories: [{id: 'story:one', title: 'Cooling access', url: null, text: 'Fixture summary', text_is_summary: true, tags: ['cooling'], verdict: 'to-be-shared', verdict_at: at, merged_from: ['story:duplicate']}],
  }, {createdAt: at});
  const source = preview.operations.sources[0];
  assert.equal(source.canonicalKey, 'newsletter-story-harvester:story:one');
  assert.equal(source.rightsState, 'unknown');
  assert.equal(source.bodyState, 'summary');
  assert.equal(preview.counts.dependencyProposals, 1);
  assert.equal(preview.counts.nativeActivities, 1);
  assert.equal(preview.operations.activities[0].nativeId, 'run:one');
  assert.equal(source.origin.payload.shape, undefined);
  assert.ok(preview.findings.some(({code, severity}) => code === 'harvest.body.rights_unknown' && severity === 'warning'));
});

test('preview commit creates immutable versions, activity, receipt, and idempotent reimport', async () => {
  const first = await makeHarvestPreview('direct', {url: 'https://example.com/one', title: 'One', rightsState: 'cleared', captureState: 'complete', body: 'Original', tags: ['heat']}, {createdAt: at});
  const committed = await commitHarvestState(newHarvestState(), first, {actorId: 'actor:one'});
  assert.equal(committed.state.sources.length, 1);
  assert.equal(committed.state.versions.length, 1);
  assert.equal(committed.state.activities[0].type, 'harvest-commit');
  const duplicate = await commitHarvestState(committed.state, first, {actorId: 'actor:one'});
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.state.versions.length, 1);
  const changed = await makeHarvestPreview('direct', {url: 'https://example.com/one', title: 'One revised', rightsState: 'cleared', captureState: 'complete', body: 'Revised', tags: ['heat', 'resilience']}, {createdAt: '2026-09-02T02:00:00.000Z'});
  const revised = await commitHarvestState(committed.state, changed, {actorId: 'actor:one'});
  assert.equal(revised.state.sources.length, 1);
  assert.equal(revised.state.versions.length, 2);
  assert.equal(revised.receipt.updated, 1);
});

test('tag inventory measures status, activity, type, stage, and distinct source use', async () => {
  const preview = await makeHarvestPreview('bookmark-sorter', {
    format: 'bookmark-sorter/v1', items: [
      {url: 'https://example.com/one', title: 'One', tags: ['heat']},
      {url: 'https://example.com/two', title: 'Two', tags: ['heat', 'cooling']},
    ],
  }, {createdAt: at});
  const committed = await commitHarvestState(newHarvestState(), preview);
  committed.state.tags.push({sourceId: committed.state.sources[0].id, label: 'Candidate', key: 'candidate', status: 'proposed', type: 'model', stage: 'tag', createdAt: at, archivedAt: at});
  const inventory = measureTagInventory(committed.state);
  assert.deepEqual(inventory.find(({key}) => key === 'heat'), {tag: 'heat', key: 'heat', status: 'accepted', type: 'external', stage: 'harvest', active: 2, archived: 0, sources: 2});
  assert.equal(inventory.find(({key}) => key === 'candidate').archived, 1);
});

test('restricted bodies and unsupported native documents are refused before commit', async () => {
  const restricted = await makeHarvestPreview('direct', {url: 'https://example.com/restricted', title: 'Restricted', body: 'Do not retain', rightsState: 'restricted', captureState: 'restricted'}, {createdAt: at});
  assert.ok(restricted.findings.some(({code, severity}) => code === 'harvest.body.restricted' && severity === 'error'));
  await assert.rejects(() => makeHarvestPreview('bookmark-sorter', {format: 'future/v2', items: []}, {createdAt: at}), /bookmark-sorter\/v1/u);
});

test('native reimport hash is stable across preview times and preserves accepted content', async () => {
  const payload = {format: 'bookmark-sorter/v1', collection: 'origin-only', items: [{id: 'bookmark:one', url: 'https://example.com/stable', title: 'Stable', note: 'Human note', tags: ['bare-tag']}]};
  const first = await makeHarvestPreview('bookmark-sorter', payload, {createdAt: at});
  const later = await makeHarvestPreview('bookmark-sorter', payload, {createdAt: '2026-09-03T00:00:00.000Z'});
  assert.equal(first.contentHash, later.contentHash);
  const committed = await commitHarvestState(newHarvestState(), first);
  const duplicate = await commitHarvestState(committed.state, later);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.state.versions.length, 1);
  assert.equal(duplicate.state.versions[0].content.body, 'Human note');
});
