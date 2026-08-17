// test-plan.md §4.1, the two identity rows. `story-record.md` §3 case 1.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idFor, makeRecord, sameIdentity } from '../src/identity.mjs';

const withUrl = {
  url_key: 'https://www.publisher.example/story-a',
  source: 'morning-memo',
  issue_date: '2026-08-12',
  source_doc: 'issue:morning-memo/2026-08-12',
  source_anchor: 'links/3'
};

const withoutUrl = {
  url_key: null,
  source: 'long-form-weekly',
  issue_date: '2026-08-12',
  source_doc: 'issue:long-form-weekly/2026-08-12',
  source_anchor: 'whole-issue'
};

test('identity with a URL is stable across two computations', () => {
  assert.equal(idFor(withUrl), idFor({ ...withUrl }));
  assert.match(idFor(withUrl), /^u1-[0-9a-f]{16}$/);
});

test('identity with a URL is (source, issue_date, url_key) and nothing else', () => {
  const base = idFor(withUrl);
  // The things that must not move it: a re-extraction with different words, a
  // different anchor because the issue was re-flowed, a later harvest.
  assert.equal(idFor({ ...withUrl, title: 'Another title', text: 'Other words' }), base);
  assert.equal(idFor({ ...withUrl, source_anchor: 'links/9' }), base);
  // The three that must.
  assert.notEqual(idFor({ ...withUrl, source: 'weekly-roundup' }), base);
  assert.notEqual(idFor({ ...withUrl, issue_date: '2026-08-13' }), base);
  assert.notEqual(idFor({ ...withUrl, url_key: 'https://www.publisher.example/story-b' }), base);
});

test('identity without a URL is (source_doc, source_anchor), and is what long-form uses', () => {
  const base = idFor(withoutUrl);
  assert.match(base, /^a1-[0-9a-f]{16}$/);
  assert.equal(idFor({ ...withoutUrl, issue_date: '2026-09-01' }), base);
  assert.notEqual(idFor({ ...withoutUrl, source_anchor: 'section-2' }), base);
});

test('the id says which rule produced it', () => {
  // `plan.md` §3: a change to identity after records exist does not migrate.
  // The prefix is what makes such a change visible in the data.
  assert.ok(idFor(withUrl).startsWith('u1-'));
  assert.ok(idFor(withoutUrl).startsWith('a1-'));
});

test('sameIdentity compares the inputs, not the digest', () => {
  assert.ok(sameIdentity(withUrl, { ...withUrl, title: 'x' }));
  assert.ok(!sameIdentity(withUrl, withoutUrl));
  assert.ok(!sameIdentity(withUrl, { ...withUrl, source: 'other' }));
});

test('a new record is complete, unjudged, and stamped once', () => {
  const record = makeRecord({ ...withUrl, title: 'A story' }, { now: '2026-08-17T00:00:00.000Z' });
  assert.equal(record.verdict, null, 'a harvester writes no verdict');
  assert.equal(record.harvested_at, '2026-08-17T00:00:00.000Z');
  assert.deepEqual(record.merged_from, []);
  assert.equal(record.id, idFor(withUrl));
});
