import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

import {generateDeck, MAX_SLIDE_WORDS, slideLayout, validateSlides} from '../build/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

function syntheticSlides(count, overrides = {}) {
  return Array.from({length: count}, (_, index) => ({
    section_id: `section-${index}`,
    title: `Claim ${index}`,
    body: 'A separately written slide body.',
    page_text: 'The page uses different language and carries the longer explanation.',
    ...overrides,
  }));
}

test('deck generation writes seventeen ordered slides and their section mapping', async () => {
  const outputPath = join(mkdtempSync(join(tmpdir(), 'repo-guide-deck-')), 'deck.html');
  const report = await generateDeck({
    root,
    outputPath,
    now: '2026-08-18T20:00:00.000Z',
    sha: 'abcdef123456',
    repositoryUrl: 'https://github.com/knovak/siteprep',
  });
  const html = readFileSync(outputPath, 'utf8');

  assert.equal(report.slides, 17);
  assert.deepEqual(report.slides_per_section, {
    repository: 2,
    lifecycle: 3,
    supplies: 2,
    sweep: 2,
    'person-required': 1,
    decks: 1,
    demos: 1,
    deployments: 2,
    portability: 2,
    sources: 1,
  });
  assert.equal([...html.matchAll(/<article class="slide/g)].length, 17);
  assert.deepEqual([...html.matchAll(/data-section-id="([^"]+)"/g)].map(match => match[1]), [
    'repository', 'repository', 'lifecycle', 'lifecycle', 'lifecycle', 'supplies', 'supplies',
    'sweep', 'sweep', 'person-required', 'decks', 'demos', 'deployments', 'deployments',
    'portability', 'portability', 'sources',
  ]);
  assert.match(html, /data-source-sha="abcdef123456"/);
  assert.equal([...html.matchAll(/<span>Ken Novak<\/span>/g)].length, 17);
  assert.match(html, /#frame:has\(\.title-slide:not\(\[hidden\]\)\) #controls/);
  assert.doesNotMatch(html, /[ \t]+$/m);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet|\bfetch\s*\(/i);
  assert.doesNotMatch(html, /\{\{/);

  // Slides are not all the same shape any more: a diagram slide, a data slide,
  // and a plain statement slide each get their own layout.
  const layouts = [...html.matchAll(/data-layout="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(layouts)].sort(), ['data', 'figure', 'statement']);
  assert.ok(html.includes('<svg class="figure-svg'), 'the deck carries generated figures');
});

test('a slide takes its layout from what it actually carries', () => {
  assert.equal(slideLayout('## A claim\n\nJust words.'), 'statement');
  assert.equal(slideLayout('## A claim\n\n@fact sweep.budget as table'), 'data');
  assert.equal(slideLayout('## A claim\n\n@figure sweep-run'), 'figure');
  assert.equal(slideLayout('## A claim\n\n@fact sweep.budget as table\n@figure sweep-run'), 'figure');
});

test('a block directive does not spend the slide copy budget', () => {
  const body = ['Nine words of actual copy on this slide here.', '@fact sweep.rules as list'].join('\n');
  assert.doesNotThrow(() => validateSlides(syntheticSlides(10, {body})));
});

test('rendered slide count is enforced at both boundaries', () => {
  assert.equal(validateSlides(syntheticSlides(10)).length, 10);
  assert.equal(validateSlides(syntheticSlides(20)).length, 20);
  assert.throws(() => validateSlides(syntheticSlides(9)), /10-20 rendered slides; found 9/);
  assert.throws(() => validateSlides(syntheticSlides(21)), /10-20 rendered slides; found 21/);
});

test('one-idea limit and truncation guard reject invalid slide copy', () => {
  const tooLong = Array(MAX_SLIDE_WORDS + 1).fill('word').join(' ');
  assert.throws(() => validateSlides(syntheticSlides(10, {body: tooLong})), /words; limit is/);
  assert.throws(() => validateSlides(syntheticSlides(10, {
    body: 'The page uses different language',
    page_text: 'The page uses different language and carries the longer explanation.',
  })), /truncates the section page text/);
});
