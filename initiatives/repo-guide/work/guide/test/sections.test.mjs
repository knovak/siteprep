import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {compileSections, loadSections, parseSection, SectionValidationError} from '../build/sections.mjs';

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
  assert.match(sections[0].slideText, /^Stages:/);
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
