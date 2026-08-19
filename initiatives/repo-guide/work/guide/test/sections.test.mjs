import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {blockDirectives, compileSections, loadSections, parseSection, SectionValidationError} from '../build/sections.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');
const FACTS = {
  'lifecycle.stages': ['wish', 'shaped', 'specified'],
  'sweep.budget': {items_per_run: 4},
  'blockers.prefixes': ['human:', 'cost:'],
};

async function section(name) {
  const path = join(fixtures, name);
  return parseSection(await readFile(path, 'utf8'), path);
}

function diagnosticsFor(value) {
  try {
    compileSections([value], FACTS);
    return [];
  } catch (error) {
    assert.ok(error instanceof SectionValidationError);
    return error.diagnostics;
  }
}

test('frontmatter and page/slide text are read separately and ordered', async () => {
  const sections = await loadSections(join(fixtures, 'sections-ok'));
  assert.deepEqual(sections.map(item => item.id), ['lifecycle', 'budget', 'blockers']);
  assert.equal(sections[0].slide_title, 'The path');
  assert.match(sections[0].pageText, /live stages/);
  assert.match(sections[0].slideText, /^Stages, in order:/);
  assert.equal(sections[0].slideTexts.length, 2);
  assert.match(sections[0].slideTexts[1], /^## The record grows/);
});

test('slide text is required when slide is true', async () => {
  await assert.rejects(() => section('sections-slide-missing.md'), /missing-slide requires slide text/);
});

test('known tokens resolve totally in page and slide text', async () => {
  const result = compileSections(await loadSections(join(fixtures, 'sections-ok')), FACTS);
  assert.equal(result.diagnostics.length, 0);
  assert.ok(result.sections.every(item => !item.pageText.includes('{{') && !item.slideText.includes('{{')));
  assert.ok(result.sections.every(item => item.slideTexts.every(text => !text.includes('{{'))));
  assert.match(result.sections[1].pageText, /4 items/);
});

test('unknown token fails and names token and section', async () => {
  const diagnostics = diagnosticsFor(await section('sections-unknown-token.md'));
  assert.ok(diagnostics.some(item => item.rule === 'unknown-token' && item.section === 'unknown-token' && item.value === 'lifecycle.not_a_fact'));
});

test('uncited facts warn without preventing generation', async () => {
  const result = compileSections([await section('sections-uncited-fact.md')], FACTS);
  assert.deepEqual(result.diagnostics.filter(item => item.rule === 'uncited-fact').map(item => item.value), ['blockers.prefixes', 'sweep.budget']);
});

test('a structured value used inline fails, because that is what forced the copula frame', async () => {
  const diagnostics = diagnosticsFor(await section('sections-structured-inline.md'));
  assert.ok(diagnostics.some(item => item.rule === 'structured-inline'
    && item.section === 'structured-inline'
    && item.value === 'lifecycle.stages'));
});

test('a scalar reached through a structured fact is still allowed inline', () => {
  const value = parseSection([
    '---', 'id: scalar', 'title: Scalar', 'order: 10', 'slide: false', 'audience: both', '---',
    'One run handles {{sweep.budget.items_per_run}} items.',
  ].join('\n'), '<inline>');
  const result = compileSections([value], FACTS);
  assert.match(result.sections[0].pageText, /handles 4 items/);
  assert.ok(!result.diagnostics.some(item => item.level === 'error'));
});

test('a block cites its fact, so structure discharges the uncited rule', async () => {
  const value = await section('sections-uncited-fact.md');
  const result = compileSections([value], FACTS);
  assert.ok(!result.diagnostics.some(item => item.value === 'lifecycle.stages' && item.rule === 'uncited-fact'));
  assert.deepEqual(blockDirectives(value.pageText).map(directive => directive.target), ['lifecycle.stages']);
});

test('a block naming an unknown fact fails and names the directive', async () => {
  const diagnostics = diagnosticsFor(await section('sections-unknown-block.md'));
  assert.ok(diagnostics.some(item => item.rule === 'unresolvable-block' && item.value.includes('lifecycle.not_a_fact')));
});

test('a view that cannot render its value fails at compile rather than at render', async () => {
  const diagnostics = diagnosticsFor(await section('sections-wrong-view.md'));
  assert.ok(diagnostics.some(item => item.rule === 'unresolvable-block' && item.value.includes('table view')));
});

test('block directives are excluded from the literal checks and the word count', () => {
  const value = parseSection([
    '---', 'id: blocks', 'title: Blocks', 'order: 10', 'slide: false', 'audience: both', '---',
    'Four short words here.',
    '',
    '@fact lifecycle.stages as rail',
    '@fact sweep.budget as table',
    '@fact blockers.prefixes',
  ].join('\n'), '<inline>');
  const result = compileSections([value], FACTS);
  assert.deepEqual(result.diagnostics.filter(item => item.level === 'error'), []);
  const [metrics] = result.metrics;
  assert.equal(metrics.blocks, 3);
  assert.equal(metrics.composed_words, 4);
});

test('backticked stage and three-stage sequence fail while bare stage warns', async () => {
  const diagnostics = diagnosticsFor(await section('sections-literal-stage.md'));
  assert.ok(diagnostics.some(item => item.rule === 'literal-stage-code'));
  assert.ok(diagnostics.some(item => item.rule === 'literal-stage-list'));
  assert.ok(diagnostics.some(item => item.rule === 'literal-stage-bare' && item.level === 'warning'));
});

test('budget digit fails but a date containing it does not add a second error', async () => {
  const diagnostics = diagnosticsFor(await section('sections-literal-budget.md'));
  assert.equal(diagnostics.filter(item => item.rule === 'literal-budget').length, 1);
});

test('literal blocker prefix fails', async () => {
  const diagnostics = diagnosticsFor(await section('sections-literal-blocker.md'));
  assert.ok(diagnostics.some(item => item.rule === 'literal-blocker-prefix' && item.value === 'human:'));
});
