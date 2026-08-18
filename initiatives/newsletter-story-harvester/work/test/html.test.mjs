// The structural half of extraction - `src/html.mjs`.
//
// Everything a record's identity depends on is computed here, so these are the
// tests that stop a re-harvest landing on a different id for the same story.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDocument, normaliseText, decodeEntities, appearsIn } from '../src/html.mjs';

const ISSUES = new URL('../fixtures/issues/', import.meta.url).pathname;
const issue = (name) => readFileSync(join(ISSUES, `${name}.html`), 'utf8');
const doc = (name) => readDocument(issue(name), { docId: name });

test('entities newsletters actually use are decoded', () => {
  assert.equal(decodeEntities('a &amp; b &nbsp;&mdash; c&#39;s &#x2019;'), "a & b  — c's ’");
});

test('the comparison form folds typography but not words', () => {
  assert.equal(normaliseText('  “Curly”  —  it’s   here '), '"Curly" - it\'s here');
  assert.notEqual(normaliseText('a story'), normaliseText('a  different story'));
});

test('links keep their document position, and the position is stable', () => {
  const first = doc('link-list-typical');
  const second = doc('link-list-typical');
  assert.deepEqual(first.links.map((l) => l.index), second.links.map((l) => l.index));
  assert.deepEqual(first.links.map((l) => l.href), second.links.map((l) => l.href));
});

test('a link carries the heading path it sits under', () => {
  const digest = doc('link-list-typical');
  const solar = digest.links.find((l) => l.text === 'Spain runs a quarter on solar');
  assert.deepEqual(solar.heading_path, ['The Week in Better News - 12 January 2026', 'Energy']);
});

test('a heading closes every heading at its own level or deeper', () => {
  const digest = doc('link-list-typical');
  const health = digest.links.find((l) => l.text === 'Guinea worm cases fall to nine');
  assert.deepEqual(health.heading_path, ['The Week in Better News - 12 January 2026', 'Health']);
});

test('a link inside a heading is marked as such', () => {
  const headings = doc('link-list-headings');
  const sectionLink = headings.links.find((l) => l.text === 'Climate');
  assert.equal(sectionLink.in_heading, true);
  const story = headings.links.find((l) => l.text === 'Emissions peak confirmed');
  assert.equal(story.in_heading, false);
});

test('the whole issue is available as text, for the never-invented check', () => {
  const column = doc('long-form-citations');
  assert.ok(appearsIn(column, 'the shortage everyone is describing is a shortage of permits'));
  assert.equal(appearsIn(column, 'a sentence the column does not contain'), false);
});

test('a document it cannot read is an error, never a guess', () => {
  assert.throws(() => readDocument('<p><a href="#">a<a href="#">b</a></a></p>', { docId: 'x' }), /nested <a>/);
  assert.throws(() => readDocument('', { docId: 'x' }), /empty document/);
  assert.throws(() => readDocument('<p>hi</p>'), /doc id/);
});

test('script, style and comments are not text', () => {
  const d = readDocument(
    '<body><script>var a = "story";</script><style>p{}</style><!-- story --><p>real</p></body>',
    { docId: 'x' }
  );
  assert.equal(d.plain_text, 'real');
});
