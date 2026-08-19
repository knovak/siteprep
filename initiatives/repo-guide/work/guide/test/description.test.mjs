import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

import {generateDescription} from '../build/description.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

test('description generation writes nine ordered, attributed sections and metrics', async () => {
  const outputPath = join(mkdtempSync(join(tmpdir(), 'repo-guide-')), 'description.html');
  const report = await generateDescription({
    root,
    outputPath,
    now: '2026-08-18T20:00:00.000Z',
    sha: 'abcdef123456',
    repositoryUrl: 'https://github.com/knovak/siteprep',
  });
  const html = readFileSync(outputPath, 'utf8');

  assert.equal(report.sections, 9);
  assert.equal(report.metrics.length, 9);
  assert.ok(report.metrics.every(row => row.composed_words > 0));
  assert.ok(report.metrics.reduce((sum, row) => sum + row.resolved_tokens, 0) > 0);
  assert.deepEqual([...html.matchAll(/<section id="([^"]+)"/g)].map(match => match[1]), [
    'repository', 'lifecycle', 'supplies', 'sweep', 'person-required', 'decks', 'demos', 'portability', 'sources',
  ]);
  assert.match(html, /data-generated-date="2026-08-18"/);
  assert.match(html, /data-source-sha="abcdef123456"/);
  assert.doesNotMatch(html, /[ \t]+$/m);
  assert.doesNotMatch(html, /\{\{/);
});
