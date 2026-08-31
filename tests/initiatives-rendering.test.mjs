/**
 * Initiative Markdown rendering regressions.
 *
 * Run with `node --test tests/initiatives-rendering.test.mjs`, or via
 * `scripts/build_tests.sh` as part of `npm run build`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../scripts/initiatives.mjs';

test('keeps wrapped ordered-list items in one list', () => {
  const html = renderMarkdown(`1. First line
   continues with **detail**.
2. Second line
   continues too.`);

  assert.equal((html.match(/<ol>/g) || []).length, 1);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.match(html, /<li>First line continues with <strong>detail<\/strong>\.<\/li>/);
  assert.match(html, /<li>Second line continues too\.<\/li>/);
  assert.doesNotMatch(html, /<\/ol>\s*<p>/);
});

test('keeps wrapped unordered-list items in one list', () => {
  const html = renderMarkdown(`- A linked item
  continues on the next source line.
- Another item.`);

  assert.equal((html.match(/<ul>/g) || []).length, 1);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.match(html, /<li>A linked item continues on the next source line\.<\/li>/);
});

test('preserves nested lists instead of flattening them', () => {
  const html = renderMarkdown(`1. Parent item:
   - Nested one
   - Nested two
2. Next parent.`);

  assert.equal((html.match(/<ol>/g) || []).length, 1);
  assert.equal((html.match(/<ul>/g) || []).length, 1);
  assert.match(html, /<li>Parent item:\n<ul><li>Nested one<\/li><li>Nested two<\/li><\/ul><\/li>/);
  assert.match(html, /<li>Next parent\.<\/li>/);
});

test('renders standard angle-bracket URL autolinks', () => {
  const html = renderMarkdown('<https://example.com/path?one=1&two=2>');

  assert.equal(
    html,
    '<p><a href="https://example.com/path?one=1&amp;two=2">https://example.com/path?one=1&amp;two=2</a></p>'
  );
});

test('renders four-space indented code blocks as code', () => {
  const html = renderMarkdown(`Package shape:

    {
      "format": "example/v1"
    }

After the example.`);

  assert.equal(
    html,
    '<p>Package shape:</p>\n<pre><code>{\n  &quot;format&quot;: &quot;example/v1&quot;\n}</code></pre>\n<p>After the example.</p>'
  );
});
