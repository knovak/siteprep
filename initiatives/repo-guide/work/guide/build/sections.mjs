import {readFile, readdir} from 'node:fs/promises';
import {basename, join} from 'node:path';

import {inspectBlock, isScalar, parseBlockDirective} from './blocks.mjs';

const TOKEN = /\{\{([a-z0-9_.-]+)\}\}/gi;
const AUDIENCES = new Set(['both', 'forker', 'contributor']);

function scalar(value, field, path) {
  const trimmed = value.trim();
  if (field === 'order') {
    if (!/^\d+$/.test(trimmed)) throw new Error(`${path}: order must be an integer`);
    return Number(trimmed);
  }
  if (field === 'slide') {
    if (!['true', 'false'].includes(trimmed)) throw new Error(`${path}: slide must be true or false`);
    return trimmed === 'true';
  }
  if (!trimmed || /^['"[{&*!]/.test(trimmed)) throw new Error(`${path}: unsupported ${field} value`);
  return trimmed;
}

function parseFrontmatter(text, path) {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  if (lines[0] !== '---') throw new Error(`${path}: frontmatter must begin on line one`);
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new Error(`${path}: missing frontmatter closing delimiter`);
  const values = {};
  const allowed = new Set(['id', 'title', 'order', 'slide', 'slide_title', 'audience']);
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue;
    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!match || !allowed.has(match[1])) throw new Error(`${path}: unsupported frontmatter line: ${line}`);
    if (Object.hasOwn(values, match[1])) throw new Error(`${path}: duplicate ${match[1]}`);
    values[match[1]] = scalar(match[2], match[1], path);
  }
  for (const field of ['id', 'title', 'order', 'slide', 'audience']) {
    if (!Object.hasOwn(values, field)) throw new Error(`${path}: missing ${field}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.id)) throw new Error(`${path}: id must be kebab-case`);
  if (!AUDIENCES.has(values.audience)) throw new Error(`${path}: unsupported audience ${values.audience}`);
  return {frontmatter: values, bodyLines: lines.slice(end + 1)};
}

export function parseSection(text, path = '<section>') {
  const {frontmatter, bodyLines} = parseFrontmatter(text, path);
  const split = bodyLines.findIndex(line => line === '---');
  const pageText = bodyLines.slice(0, split === -1 ? bodyLines.length : split).join('\n').trim();
  const slideLines = split === -1 ? [] : bodyLines.slice(split + 1);
  const slideTexts = [];
  let currentSlide = [];
  for (const line of slideLines) {
    if (line === '---') {
      const value = currentSlide.join('\n').trim();
      if (!value) throw new Error(`${path}: section ${frontmatter.id} has an empty slide`);
      slideTexts.push(value);
      currentSlide = [];
      continue;
    }
    currentSlide.push(line);
  }
  const finalSlide = currentSlide.join('\n').trim();
  if (finalSlide) slideTexts.push(finalSlide);
  const slideText = slideTexts.join('\n\n---\n\n');
  if (!pageText) throw new Error(`${path}: section ${frontmatter.id} has no page text`);
  if (frontmatter.slide && !slideText) throw new Error(`${path}: section ${frontmatter.id} requires slide text`);
  return {
    ...frontmatter,
    slide_title: frontmatter.slide_title ?? frontmatter.title,
    pageText,
    slideText,
    slideTexts,
    path,
  };
}

export async function loadSections(directory) {
  const names = (await readdir(directory)).filter(name => name.endsWith('.md')).sort();
  const sections = await Promise.all(names.map(async name => parseSection(await readFile(join(directory, name), 'utf8'), join(directory, name))));
  const ids = new Set();
  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`${section.path}: duplicate section id ${section.id}`);
    ids.add(section.id);
  }
  return sections.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function factValue(facts, token) {
  const base = Object.keys(facts)
    .filter(key => token === key || token.startsWith(`${key}.`))
    .sort((a, b) => b.length - a.length)[0];
  if (!base) return null;
  let value = facts[base];
  for (const part of token.slice(base.length).split('.').filter(Boolean)) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return null;
    value = value[part];
  }
  return {base, value};
}

// Only a scalar may be inlined. A structured value flattened into a sentence is
// what forced every fact-bearing sentence into the same "the X are A; B; C"
// frame; it renders as a block instead, so the prose around it can be written
// like prose.
function display(value) {
  return String(value);
}

export function blockDirectives(text) {
  const directives = [];
  for (const line of text.replaceAll('\r\n', '\n').split('\n')) {
    const directive = parseBlockDirective(line.trim());
    if (directive) directives.push(directive);
  }
  return directives;
}

function maskBlockLines(text) {
  return text
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map(line => (parseBlockDirective(line.trim()) ? '' : line))
    .join('\n');
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function literalDiagnostics(section, facts, text) {
  const diagnostics = [];
  const masked = text.replace(TOKEN, match => ' '.repeat(match.length));
  const stages = Array.isArray(facts['lifecycle.stages']) ? facts['lifecycle.stages'] : [];
  const prefixes = Array.isArray(facts['blockers.prefixes']) ? facts['blockers.prefixes'] : [];
  const budget = facts['sweep.budget'] && typeof facts['sweep.budget'] === 'object' ? facts['sweep.budget'] : {};

  for (const stage of stages) {
    const quoted = new RegExp('`' + escaped(stage) + '`', 'gi');
    if (quoted.test(masked)) diagnostics.push({level: 'error', rule: 'literal-stage-code', section: section.id, value: stage});
  }

  if (stages.length >= 3) {
    const word = `(?:${stages.map(escaped).join('|')})`;
    const sequence = new RegExp(`\\b${word}\\b(?:\\s*(?:,|→|->|and|or)\\s*\\b${word}\\b){2,}`, 'gi');
    for (const match of masked.matchAll(sequence)) {
      diagnostics.push({level: 'error', rule: 'literal-stage-list', section: section.id, value: match[0]});
    }
  }

  for (const stage of stages) {
    const bare = new RegExp(`\\b${escaped(stage)}\\b`, 'gi');
    if (bare.test(masked)) diagnostics.push({level: 'warning', rule: 'literal-stage-bare', section: section.id, value: stage});
  }

  for (const prefix of prefixes) {
    const notation = prefix.endsWith(':') ? prefix : `${prefix}:`;
    const written = new RegExp(`\\b${escaped(notation)}`, 'g');
    if (written.test(masked)) diagnostics.push({level: 'error', rule: 'literal-blocker-prefix', section: section.id, value: notation});
  }

  for (const value of Object.values(budget).filter(candidate => Number.isInteger(candidate))) {
    const number = new RegExp(`(?<![\\d-])${value}(?![\\d-])`, 'g');
    if (number.test(masked)) diagnostics.push({level: 'error', rule: 'literal-budget', section: section.id, value: String(value)});
  }
  return diagnostics;
}

function renderSource(section, source, facts, citedFacts, diagnostics) {
  for (const directive of blockDirectives(source)) {
    let inspected;
    try {
      inspected = inspectBlock(directive, facts);
    } catch (error) {
      diagnostics.push({level: 'error', rule: 'unresolvable-block', section: section.id, value: `${directive.line.trim()} — ${error.message}`});
      continue;
    }
    for (const key of inspected.cites) citedFacts.add(key);
  }

  const rendered = source.replace(TOKEN, (whole, token) => {
    const resolved = factValue(facts, token);
    if (!resolved) {
      diagnostics.push({level: 'error', rule: 'unknown-token', section: section.id, value: token});
      return whole;
    }
    if (!isScalar(resolved.value)) {
      diagnostics.push({level: 'error', rule: 'structured-inline', section: section.id, value: token});
      return whole;
    }
    citedFacts.add(resolved.base);
    return display(resolved.value);
  });
  diagnostics.push(...literalDiagnostics(section, facts, maskBlockLines(source)));
  return rendered;
}

export class SectionValidationError extends Error {
  constructor(diagnostics) {
    super(diagnostics.map(item => `${item.section}: ${item.rule} (${item.value})`).join('\n'));
    this.name = 'SectionValidationError';
    this.diagnostics = diagnostics;
  }
}

export function compileSections(sections, facts) {
  const diagnostics = [];
  const citedFacts = new Set();
  const rendered = sections.map(section => {
    const slideTexts = section.slideTexts.map(source => renderSource(section, source, facts, citedFacts, diagnostics));
    return {
      ...section,
      pageText: renderSource(section, section.pageText, facts, citedFacts, diagnostics),
      slideText: slideTexts.join('\n\n---\n\n'),
      slideTexts,
    };
  });
  const metrics = sections.map(section => {
    const source = `${section.pageText}\n${section.slideTexts.join('\n')}`;
    const tokens = [...source.matchAll(TOKEN)].map(match => match[1]);
    const composed = maskBlockLines(source).replace(TOKEN, ' ');
    const composedWords = composed.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? [];
    return {
      section: section.id,
      composed_words: composedWords.length,
      resolved_tokens: tokens.length,
      blocks: blockDirectives(source).length,
    };
  });

  for (const key of Object.keys(facts).sort()) {
    if (!citedFacts.has(key)) diagnostics.push({level: 'warning', rule: 'uncited-fact', section: '<all>', value: key});
  }
  const errors = diagnostics.filter(item => item.level === 'error');
  if (errors.length > 0) throw new SectionValidationError(diagnostics);
  if (rendered.some(section => section.pageText.includes('{{') || section.slideTexts.some(text => text.includes('{{')))) {
    throw new Error('Token substitution was incomplete');
  }
  return {sections: rendered, diagnostics, citedFacts: [...citedFacts].sort(), metrics};
}

export function sectionLabel(section) {
  return `${basename(section.path)} (${section.id})`;
}
