#!/usr/bin/env node
// tag-bookmarks - assign vocabulary tags to a Bookmark Sorter export.
//
//   vocabulary  print the resolved dimensions and their tags
//   prepare     turn an export into a worksheet the model reads
//   apply       turn tag assignments into an importable bookmark-sorter/v1 file
//
// The reading and the writing are both here so that the file Bookmark Sorter
// imports is machine-written and validated: every tag is checked against the
// vocabulary, every item against the export it came from.

import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_VOCABULARY = join(SKILL_DIR, 'vocabularies', 'default.json');

const PORTABLE_FORMAT = 'bookmark-sorter/v1';
const WORKSHEET_FORMAT = 'bookmark-tags/worksheet/v1';
const ASSIGNMENTS_FORMAT = 'bookmark-tags/assignments/v1';
const VOCABULARY_FORMAT = 'bookmark-tags/vocabulary/v1';

const TRACKING_PARAMETERS = /^(utm_.*|fbclid|gclid)$/i;

class UsageError extends Error {}

// ---------------------------------------------------------------- arguments

const FLAGS = new Set(['include-untagged', 'no-implied', 'allow-unknown-tags', 'quiet', 'help']);
const VALUED = new Set(['vocabulary', 'dimensions', 'limit', 'offset', 'out', 'report']);

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      positional.push(...argv.slice(index + 1));
      break;
    }
    if (argument === '-o') {
      options.out = argv[++index];
      continue;
    }
    if (argument === '-h') {
      options.help = true;
      continue;
    }
    if (!argument.startsWith('--')) {
      positional.push(argument);
      continue;
    }
    const body = argument.slice(2);
    const equals = body.indexOf('=');
    const name = equals === -1 ? body : body.slice(0, equals);
    if (FLAGS.has(name)) {
      if (equals !== -1) throw new UsageError(`--${name} takes no value`);
      options[name] = true;
      continue;
    }
    if (!VALUED.has(name)) throw new UsageError(`Unknown option: ${argument}`);
    const value = equals === -1 ? argv[++index] : body.slice(equals + 1);
    if (value === undefined) throw new UsageError(`--${name} needs a value`);
    options[name] = value;
  }
  return {positional, options};
}

function wholeNumber(value, label) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new UsageError(`--${label} must be a whole number`);
  return parsed;
}

// --------------------------------------------------------------- vocabulary

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new UsageError(`Cannot read ${path}: ${error.message}`);
  }
}

function readJson(path) {
  const text = readText(path);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UsageError(`${path} is not valid JSON: ${error.message}`);
  }
}

// A plain-text vocabulary is the list a user can type: "dimension: topic"
// starts a dimension, every other non-blank line is one of its tags, and a
// line starting with # is a comment.
function parseTextVocabulary(text, path) {
  const dimensions = [];
  let current = null;
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const header = /^dimensions?\s*:\s*(.+)$/i.exec(line);
    if (header) {
      current = {name: header[1].trim(), tags: []};
      dimensions.push(current);
      continue;
    }
    if (!current) throw new UsageError(`${path}:${index + 1}: tag "${line}" appears before any "dimension:" line`);
    current.tags.push(line);
  }
  return {vocabulary: VOCABULARY_FORMAT, name: basename(path, extname(path)), dimensions};
}

function stringList(value, label) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  if (list.some(entry => typeof entry !== 'string')) throw new UsageError(`${label} must be a string or a list of strings`);
  return list.map(entry => entry.trim()).filter(Boolean);
}

function normaliseDimension(raw, index, path) {
  const label = `${path}: dimensions[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new UsageError(`${label} must be an object`);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) throw new UsageError(`${label} has no name`);
  if (!/^[a-z][a-z0-9_-]*$/i.test(name)) throw new UsageError(`${label}: dimension name "${name}" must be a word`);
  if (!Array.isArray(raw.tags) || raw.tags.length === 0) throw new UsageError(`${label} (${name}) has no tags`);
  const tags = [];
  for (const tag of raw.tags) {
    if (typeof tag !== 'string' || !tag.trim()) throw new UsageError(`${label} (${name}) has an empty tag`);
    const trimmed = tag.trim();
    if (tags.includes(trimmed)) throw new UsageError(`${label} (${name}) repeats the tag "${trimmed}"`);
    tags.push(trimmed);
  }
  const tagNotes = {};
  for (const [tag, note] of Object.entries(raw.tag_notes || {})) {
    if (!tags.includes(tag)) throw new UsageError(`${label} (${name}): tag_notes mentions "${tag}", which is not one of its tags`);
    tagNotes[tag] = String(note);
  }
  return {
    name,
    description: typeof raw.description === 'string' ? raw.description : '',
    notes: stringList(raw.notes, `${label}.notes`),
    tags,
    tag_notes: tagNotes,
    implies: raw.implies && typeof raw.implies === 'object' ? raw.implies : {},
  };
}

function buildImplications(dimensions, documentImplies, path) {
  const known = new Set(dimensions.flatMap(dimension => dimension.tags));
  const map = new Map();
  const add = (from, to, where) => {
    if (!known.has(from)) throw new UsageError(`${path}: ${where} implies from an unknown tag "${from}"`);
    for (const target of to) {
      if (!known.has(target)) throw new UsageError(`${path}: ${where} implies unknown tag "${target}"`);
      if (target === from) throw new UsageError(`${path}: ${where} implies "${from}" from itself`);
      if (!map.has(from)) map.set(from, []);
      if (!map.get(from).includes(target)) map.get(from).push(target);
    }
  };
  for (const dimension of dimensions) {
    for (const [from, to] of Object.entries(dimension.implies)) {
      add(from, stringList(to, `${dimension.name}.implies.${from}`), `dimension ${dimension.name}`);
    }
  }
  for (const [from, to] of Object.entries(documentImplies || {})) {
    add(from, stringList(to, `implies.${from}`), 'the document');
  }
  return map;
}

function loadVocabulary({path = DEFAULT_VOCABULARY, dimensions: wanted} = {}) {
  const resolved = resolve(path);
  const extension = extname(resolved).toLowerCase();
  const document = extension === '.json'
    ? readJson(resolved)
    : parseTextVocabulary(readText(resolved), resolved);
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new UsageError(`${resolved} must contain a vocabulary object`);
  }
  if (document.vocabulary && document.vocabulary !== VOCABULARY_FORMAT) {
    throw new UsageError(`${resolved}: unsupported vocabulary format ${document.vocabulary}`);
  }
  if (!Array.isArray(document.dimensions) || document.dimensions.length === 0) {
    throw new UsageError(`${resolved} has no dimensions`);
  }

  const all = document.dimensions.map((raw, index) => normaliseDimension(raw, index, resolved));
  const names = all.map(dimension => dimension.name);
  const repeated = names.find((name, index) => names.indexOf(name) !== index);
  if (repeated) throw new UsageError(`${resolved} declares the dimension "${repeated}" twice`);

  const owner = new Map();
  for (const dimension of all) {
    for (const tag of dimension.tags) {
      if (owner.has(tag)) {
        throw new UsageError(`${resolved}: the tag "${tag}" is in both ${owner.get(tag)} and ${dimension.name}; a tag belongs to one dimension`);
      }
      owner.set(tag, dimension.name);
    }
  }

  const implications = buildImplications(all, document.implies, resolved);

  let selected = all;
  if (wanted) {
    const requested = wanted.split(',').map(entry => entry.trim()).filter(Boolean);
    if (requested.length === 0) throw new UsageError('--dimensions needs at least one dimension name');
    const missing = requested.filter(name => !names.includes(name));
    if (missing.length) {
      throw new UsageError(`Unknown dimension${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. This vocabulary has: ${names.join(', ')}`);
    }
    selected = requested.map(name => all.find(dimension => dimension.name === name));
  }

  const inPlay = new Map();
  for (const dimension of selected) {
    for (const tag of dimension.tags) inPlay.set(tag, dimension.name);
  }

  return {
    path: resolved,
    name: document.name || basename(resolved, extension),
    description: document.description || '',
    notes: stringList(document.notes, 'notes'),
    dimensions: selected,
    allDimensionNames: names,
    tagDimension: inPlay,
    everyTagDimension: owner,
    implications,
  };
}

// Follow the implication map to its end, keeping only tags whose dimension is
// in play, so selecting fewer dimensions cannot smuggle a tag back in.
function closeOverImplications(tags, vocabulary) {
  const result = [];
  const seen = new Set();
  const queue = [...tags];
  const implied = new Set();
  while (queue.length) {
    const tag = queue.shift();
    if (seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    for (const target of vocabulary.implications.get(tag) || []) {
      if (seen.has(target) || !vocabulary.tagDimension.has(target)) continue;
      implied.add(target);
      queue.push(target);
    }
  }
  return {tags: result, implied: [...implied].filter(tag => !tags.includes(tag))};
}

// ------------------------------------------------------------------- export

function normaliseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return value.trim().toLowerCase();
  }
  url.hash = '';
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.test(name)) url.searchParams.delete(name);
  }
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) url.port = '';
  let text = url.toString();
  if (url.pathname === '/' && !url.search) text = text.replace(/\/$/, '');
  return text;
}

function hostOf(value) {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return '';
  }
}

function readExport(path) {
  const resolved = resolve(path);
  const document = readJson(resolved);
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new UsageError(`${resolved} must contain a JSON object`);
  }
  if (document.format !== PORTABLE_FORMAT) {
    throw new UsageError(`${resolved} is not a ${PORTABLE_FORMAT} file (format: ${document.format ?? 'missing'})`);
  }
  if (!Array.isArray(document.items)) throw new UsageError(`${resolved} has no items array`);

  const width = Math.max(4, String(document.items.length).length);
  const items = document.items.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new UsageError(`${resolved}: items[${index}] is not an object`);
    if (typeof raw.url !== 'string' || !raw.url.trim()) throw new UsageError(`${resolved}: items[${index}] has no url`);
    const url = raw.url.trim();
    return {
      ref: `b${String(index + 1).padStart(width, '0')}`,
      index,
      url,
      url_key: normaliseUrl(url),
      host: hostOf(url),
      title: typeof raw.title === 'string' ? raw.title : '',
      note: typeof raw.note === 'string' ? raw.note : null,
      added_at: typeof raw.added_at === 'string' ? raw.added_at : null,
      existing_tags: Array.isArray(raw.tags) ? raw.tags.filter(tag => typeof tag === 'string') : [],
    };
  });

  const duplicates = new Map();
  for (const item of items) {
    duplicates.set(item.url_key, (duplicates.get(item.url_key) || 0) + 1);
  }

  const fingerprint = createHash('sha256')
    .update(items.map(item => item.url_key).join('\n'))
    .digest('hex')
    .slice(0, 16);

  return {
    path: resolved,
    document,
    items,
    fingerprint,
    duplicateUrls: [...duplicates.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  };
}

// -------------------------------------------------------------------- output

function writeOut(path, text, {label = 'output'} = {}) {
  if (!path || path === '-') {
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
    return '(standard output)';
  }
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), {recursive: true});
  writeFileSync(resolved, text.endsWith('\n') ? text : `${text}\n`);
  process.stderr.write(`Wrote ${label}: ${resolved}\n`);
  return resolved;
}

function defaultOutputPath(sourcePath) {
  const extension = extname(sourcePath);
  const stem = basename(sourcePath, extension);
  return join(dirname(sourcePath), `${stem}-tagged.json`);
}

// ------------------------------------------------------------------ commands

function vocabularyView(vocabulary) {
  return {
    vocabulary: VOCABULARY_FORMAT,
    name: vocabulary.name,
    path: vocabulary.path,
    description: vocabulary.description,
    notes: vocabulary.notes,
    dimensions: vocabulary.dimensions.map(dimension => ({
      name: dimension.name,
      description: dimension.description,
      notes: dimension.notes,
      tags: dimension.tags,
      tag_notes: dimension.tag_notes,
    })),
    implications: Object.fromEntries(
      [...vocabulary.implications.entries()]
        .filter(([from]) => vocabulary.tagDimension.has(from))
        .map(([from, to]) => [from, to.filter(tag => vocabulary.tagDimension.has(tag))])
        .filter(([, to]) => to.length),
    ),
  };
}

function commandVocabulary(options) {
  const vocabulary = loadVocabulary({path: options.vocabulary || DEFAULT_VOCABULARY, dimensions: options.dimensions});
  writeOut(options.out, JSON.stringify(vocabularyView(vocabulary), null, 2), {label: 'vocabulary'});
}

function commandPrepare(positional, options) {
  const [sourcePath] = positional;
  if (!sourcePath) throw new UsageError('prepare needs the path of a Bookmark Sorter export');
  const source = readExport(sourcePath);
  const vocabulary = loadVocabulary({path: options.vocabulary || DEFAULT_VOCABULARY, dimensions: options.dimensions});

  const offset = wholeNumber(options.offset, 'offset') ?? 0;
  const limit = wholeNumber(options.limit, 'limit');
  const slice = source.items.slice(offset, limit === undefined ? undefined : offset + limit);

  const worksheet = {
    format: WORKSHEET_FORMAT,
    generated_at: new Date().toISOString(),
    source: {
      path: source.path,
      collection: source.document.collection ?? null,
      exported_at: source.document.exported_at ?? null,
      selection: source.document.selection ?? null,
      item_count: source.items.length,
      fingerprint: source.fingerprint,
    },
    slice: {offset, limit: limit ?? null, returned: slice.length},
    instructions: [
      'Read each item and assign the tags that fit, using only the tags listed under dimensions below.',
      'An item may take tags from every dimension and several tags from one dimension. Overlapping tags are intended.',
      'Assign nothing from a dimension rather than guessing when the item gives no evidence for it.',
      'Answer with an assignments file: {"format":"bookmark-tags/assignments/v1","source_fingerprint":"' + source.fingerprint + '","items":[{"ref":"...","tags":["..."]}]}.',
      'existing_tags shows what the bookmark already carries. Import adds tags and never removes them.',
    ],
    vocabulary: vocabularyView(vocabulary),
    items: slice.map(item => ({
      ref: item.ref,
      url: item.url,
      host: item.host,
      title: item.title,
      note: item.note,
      added_at: item.added_at,
      existing_tags: item.existing_tags,
    })),
  };

  writeOut(options.out, JSON.stringify(worksheet, null, 2), {label: 'worksheet'});
  if (!options.quiet) {
    process.stderr.write(
      `Prepared ${slice.length} of ${source.items.length} item(s) from ${source.path}; ` +
      `fingerprint ${source.fingerprint}; dimensions ${vocabulary.dimensions.map(d => d.name).join(', ')}\n`,
    );
    if (source.duplicateUrls.length) {
      process.stderr.write(`Note: ${source.duplicateUrls.length} URL(s) appear more than once in the export.\n`);
    }
  }
}

function readAssignments(path, source) {
  const resolved = resolve(path);
  const document = readJson(resolved);
  const isArray = Array.isArray(document);
  if (!isArray && (!document || typeof document !== 'object')) {
    throw new UsageError(`${resolved} must contain an assignments object or an array of items`);
  }
  if (!isArray && document.format && document.format !== ASSIGNMENTS_FORMAT) {
    throw new UsageError(`${resolved}: unsupported assignments format ${document.format}`);
  }
  const items = isArray ? document : document.items;
  if (!Array.isArray(items)) throw new UsageError(`${resolved} has no items array`);
  const fingerprint = isArray ? undefined : document.source_fingerprint;
  if (fingerprint !== undefined && fingerprint !== source.fingerprint) {
    throw new UsageError(
      `${resolved}: source_fingerprint ${fingerprint} does not match ${source.fingerprint} for ${source.path}. ` +
      'These assignments were written for a different export.',
    );
  }
  return {path: resolved, items, hasFingerprint: fingerprint !== undefined};
}

function commandApply(positional, options) {
  const [sourcePath, ...assignmentPaths] = positional;
  if (!sourcePath) throw new UsageError('apply needs the path of a Bookmark Sorter export');
  if (assignmentPaths.length === 0) throw new UsageError('apply needs at least one assignments file');

  const source = readExport(sourcePath);
  const vocabulary = loadVocabulary({path: options.vocabulary || DEFAULT_VOCABULARY, dimensions: options.dimensions});
  const byRef = new Map(source.items.map(item => [item.ref, item]));
  const byUrl = new Map();
  for (const item of source.items) {
    if (!byUrl.has(item.url_key)) byUrl.set(item.url_key, item);
  }

  const assigned = new Map();
  const warnings = [];
  let unknownTagCount = 0;
  let missingFingerprints = 0;

  for (const path of assignmentPaths) {
    const file = readAssignments(path, source);
    if (!file.hasFingerprint) missingFingerprints += 1;
    for (const [index, raw] of file.items.entries()) {
      const where = `${file.path}: items[${index}]`;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new UsageError(`${where} must be an object`);
      const ref = typeof raw.ref === 'string' ? raw.ref.trim() : '';
      const url = typeof raw.url === 'string' ? raw.url.trim() : '';
      if (!ref && !url) throw new UsageError(`${where} needs a ref or a url`);
      const item = ref ? byRef.get(ref) : byUrl.get(normaliseUrl(url));
      if (!item) {
        throw new UsageError(`${where}: ${ref ? `ref ${ref}` : `url ${url}`} is not in ${source.path}`);
      }
      if (!Array.isArray(raw.tags)) throw new UsageError(`${where} needs a tags array`);
      const tags = [];
      for (const value of raw.tags) {
        if (typeof value !== 'string' || !value.trim()) throw new UsageError(`${where} has an empty tag`);
        const tag = value.trim();
        if (!vocabulary.tagDimension.has(tag)) {
          const owner = vocabulary.everyTagDimension.get(tag);
          const reason = owner
            ? `"${tag}" belongs to the dimension ${owner}, which is not in this run`
            : `"${tag}" is not in the vocabulary ${vocabulary.name}`;
          if (!options['allow-unknown-tags']) throw new UsageError(`${where}: ${reason}`);
          unknownTagCount += 1;
          warnings.push(`${where}: ${reason} (kept because --allow-unknown-tags was given)`);
        }
        if (!tags.includes(tag)) tags.push(tag);
      }
      const current = assigned.get(item.ref) || [];
      assigned.set(item.ref, [...new Set([...current, ...tags])]);
    }
  }

  const perDimension = new Map(vocabulary.dimensions.map(dimension => [dimension.name, new Map()]));
  const otherTags = new Map();
  const outputItems = [];
  let impliedAdded = 0;
  let alreadyPresent = 0;
  let taggedItems = 0;

  for (const item of source.items) {
    const raw = assigned.get(item.ref) || [];
    const closed = options['no-implied'] ? {tags: raw, implied: []} : closeOverImplications(raw, vocabulary);
    impliedAdded += closed.implied.length;
    const fresh = closed.tags.filter(tag => !item.existing_tags.includes(tag));
    alreadyPresent += closed.tags.length - fresh.length;
    if (fresh.length) taggedItems += 1;
    for (const tag of fresh) {
      const dimension = vocabulary.tagDimension.get(tag);
      const counter = dimension ? perDimension.get(dimension) : otherTags;
      counter.set(tag, (counter.get(tag) || 0) + 1);
    }
    if (!fresh.length && !options['include-untagged']) continue;
    const output = {url: item.url};
    if (item.title) output.title = item.title;
    output.tags = fresh.slice().sort();
    outputItems.push(output);
  }

  const generatedAt = new Date().toISOString();
  const document = {
    format: PORTABLE_FORMAT,
    exported_at: generatedAt,
    collection: source.document.collection ?? null,
    tagged_by: {
      skill: 'tag-bookmarks',
      at: generatedAt,
      vocabulary: vocabulary.name,
      dimensions: vocabulary.dimensions.map(dimension => dimension.name),
      source_fingerprint: source.fingerprint,
      source_items: source.items.length,
    },
    items: outputItems,
  };

  const outputPath = options.out === undefined ? defaultOutputPath(source.path) : options.out;
  const written = writeOut(outputPath, JSON.stringify(document, null, 2), {label: 'tagged file'});

  const summary = {
    source: source.path,
    output: written,
    items_in_export: source.items.length,
    items_with_assignments: assigned.size,
    items_tagged: taggedItems,
    items_untagged: source.items.length - taggedItems,
    tags_written: outputItems.reduce((total, item) => total + item.tags.length, 0),
    tags_added_by_implication: impliedAdded,
    tags_already_on_the_bookmark: alreadyPresent,
    unknown_tags_kept: unknownTagCount,
    per_dimension: Object.fromEntries(
      [...perDimension.entries()].map(([name, counter]) => [
        name,
        Object.fromEntries([...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
      ]),
    ),
  };
  if (otherTags.size) {
    summary.per_dimension.other = Object.fromEntries([...otherTags.entries()].sort((a, b) => b[1] - a[1]));
  }

  if (options.report) {
    writeOut(options.report, renderReport(summary, source, assigned, vocabulary, warnings), {label: 'report'});
  }

  if (!options.quiet) {
    for (const warning of warnings) process.stderr.write(`Warning: ${warning}\n`);
    if (missingFingerprints) {
      process.stderr.write(`Warning: ${missingFingerprints} assignments file(s) carried no source_fingerprint, so they were not checked against the export.\n`);
    }
    if (source.duplicateUrls.length) {
      process.stderr.write(`Note: ${source.duplicateUrls.length} URL(s) appear more than once in the export; Bookmark Sorter merges them on import.\n`);
    }
    process.stderr.write(`${JSON.stringify(summary, null, 2)}\n`);
  }
}

function renderReport(summary, source, assigned, vocabulary, warnings) {
  const lines = [
    '# tag-bookmarks report',
    '',
    `- Source: \`${summary.source}\``,
    `- Output: \`${summary.output}\``,
    `- Vocabulary: ${vocabulary.name} (\`${vocabulary.path}\`)`,
    `- Dimensions: ${vocabulary.dimensions.map(dimension => dimension.name).join(', ')}`,
    '',
    '## Counts',
    '',
    '| Measure | Value |',
    '|---|---:|',
    `| Items in the export | ${summary.items_in_export} |`,
    `| Items given tags | ${summary.items_tagged} |`,
    `| Items left untagged | ${summary.items_untagged} |`,
    `| Tags written to the output file | ${summary.tags_written} |`,
    `| Tags added by implication | ${summary.tags_added_by_implication} |`,
    `| Tags the bookmark already carried | ${summary.tags_already_on_the_bookmark} |`,
    '',
  ];
  for (const [dimension, counts] of Object.entries(summary.per_dimension)) {
    lines.push(`## ${dimension}`, '', '| Tag | Items |', '|---|---:|');
    const entries = Object.entries(counts);
    if (entries.length === 0) lines.push('| (none assigned) | 0 |');
    for (const [tag, count] of entries) lines.push(`| ${tag} | ${count} |`);
    lines.push('');
  }
  const untagged = source.items.filter(item => !(assigned.get(item.ref) || []).length);
  if (untagged.length) {
    lines.push('## Items left untagged', '');
    for (const item of untagged.slice(0, 50)) lines.push(`- \`${item.ref}\` ${item.title || item.url}`);
    if (untagged.length > 50) lines.push(`- ... and ${untagged.length - 50} more`);
    lines.push('');
  }
  if (warnings.length) {
    lines.push('## Warnings', '');
    for (const warning of warnings) lines.push(`- ${warning}`);
    lines.push('');
  }
  lines.push('This report names bookmarks, so keep it with the export rather than in a repository.', '');
  return lines.join('\n');
}

const USAGE = `tag-bookmarks - assign vocabulary tags to a Bookmark Sorter export

Usage:
  tag-bookmarks.mjs vocabulary [--vocabulary <file>] [--dimensions <a,b>] [-o <file>]
  tag-bookmarks.mjs prepare <export.json> [--vocabulary <file>] [--dimensions <a,b>]
                            [--offset <n>] [--limit <n>] [-o <file>]
  tag-bookmarks.mjs apply <export.json> <assignments.json...> [--vocabulary <file>]
                          [--dimensions <a,b>] [-o <file>] [--report <file.md>]
                          [--include-untagged] [--no-implied] [--allow-unknown-tags]

Options:
  --vocabulary <file>   Vocabulary to use: a JSON file, or a text file of
                        "dimension: <name>" headers followed by one tag per
                        line. Default: vocabularies/default.json in the skill.
  --dimensions <a,b>    Use only these dimensions, in this order. Default: all.
  --offset, --limit     Prepare one slice of a large export. Refs stay stable.
  -o, --out <file>      Write here instead of the default ("-" is stdout).
                        prepare defaults to stdout; apply defaults to
                        <export>-tagged.json beside the export.
  --report <file.md>    Write a markdown summary of an apply run.
  --include-untagged    Keep items that received no new tags in the output.
  --no-implied          Do not add the vocabulary's implied tags.
  --allow-unknown-tags  Warn instead of failing on a tag outside the vocabulary.
  --quiet               Do not write the summary to standard error.
`;

function main(argv) {
  const {positional, options} = parseArgs(argv);
  const [command, ...rest] = positional;
  if (options.help || !command) {
    process.stdout.write(USAGE);
    return;
  }
  if (command === 'vocabulary') return commandVocabulary(options);
  if (command === 'prepare') return commandPrepare(rest, options);
  if (command === 'apply') return commandApply(rest, options);
  throw new UsageError(`Unknown command: ${command}`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  if (error instanceof UsageError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
  throw error;
}
