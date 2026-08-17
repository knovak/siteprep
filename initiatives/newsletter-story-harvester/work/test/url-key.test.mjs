// test-plan.md §4.1, the two url_key rows: the unwrap table and normalisation.
//
// Table-driven from `fixtures/redirectors.json`, so adding a sender is a
// fixture entry rather than a test - which is the point of `story-record.md`
// §4 being a table in the first place.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildUrlKey, normalise } from '../src/url-key.mjs';

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/redirectors.json', import.meta.url)), 'utf8')
);

test('every shape in redirectors.json yields the publisher URL', () => {
  for (const c of fixtures.cases.filter((c) => c.unwrappable)) {
    const result = buildUrlKey(c.url, { unwrap: c.unwrap || undefined });
    assert.equal(result.url_key, c.expect_key, c.name);
    assert.deepEqual(result.tags, [], `${c.name}: nothing to mark`);
  }
});

test('a link that cannot be unwrapped is kept and marked', () => {
  for (const c of fixtures.cases.filter((c) => !c.unwrappable)) {
    const result = buildUrlKey(c.url, { unwrap: c.unwrap || undefined });
    assert.equal(result.unwrapped, false, c.name);
    assert.equal(result.url_key, c.expect_key, c.name);
    assert.deepEqual(result.tags, c.expect_tags, c.name);
  }
});

test('an unwrappable redirector keeps no query string, in url or url_key', () => {
  // Phase 0's condition 3. Substack's `j` names the subscriber and Mailchimp's
  // `e` is the recipient; either would reach §12's published page through the
  // record. This is the assertion that stops that, and it is deliberately
  // stronger than "strip the utm_* family".
  for (const c of fixtures.cases.filter((c) => !c.unwrappable)) {
    const result = buildUrlKey(c.url, { unwrap: c.unwrap || undefined });
    assert.ok(!result.url.includes('?'), `${c.name}: url carries a query`);
    assert.ok(!result.url_key.includes('?'), `${c.name}: url_key carries a query`);
    assert.ok(!/SYNTHETIC/.test(result.url + result.url_key), `${c.name}: token survived`);
  }
});

test('normalisation collapses what it should and nothing else', () => {
  for (const c of fixtures.normalisation) {
    const a = normalise(new URL(c.a));
    const b = normalise(new URL(c.b));
    assert.equal(a === b, c.same, `${c.name}: ${a} vs ${b}`);
  }
});

test('the single HEAD follow resolves what the table cannot', () => {
  // story-record.md §4 step 2, off unless the caller passes it - which is why
  // the test supplies the follow rather than the module owning one.
  const opaque = fixtures.cases.find((c) => !c.unwrappable);
  const result = buildUrlKey(opaque.url, {
    unwrap: opaque.unwrap,
    followOnce: () => 'https://www.publisher.example/followed'
  });
  assert.equal(result.url_key, 'https://www.publisher.example/followed');
  assert.equal(result.unwrapped, true);
  assert.deepEqual(result.tags, []);
});

test('a link that is not a URL at all is kept and marked, never dropped', () => {
  const result = buildUrlKey('mailto:someone@example.test');
  assert.equal(result.url, 'mailto:someone@example.test');
  assert.equal(result.url_key, null);
  assert.deepEqual(result.tags, ['err:unwrap']);
});
