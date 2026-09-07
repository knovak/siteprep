// Tests for the tag-bookmarks script.
//
//   node --test .claude/skills/tag-bookmarks/test/tag-bookmarks.test.mjs
//
// They run the command the way the skill runs it, so a change that breaks the
// output file Bookmark Sorter imports fails here first.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, '..', 'scripts', 'tag-bookmarks.mjs');
const EXPORT = resolve(HERE, 'fixtures', 'export-sample.json');

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {encoding: 'utf8'});
}

function workspace() {
  return mkdtempSync(join(tmpdir(), 'tag-bookmarks-'));
}

function writeAssignments(directory, body) {
  const path = join(directory, 'assignments.json');
  writeFileSync(path, JSON.stringify(body, null, 2));
  return path;
}

test('vocabulary lists every default dimension', () => {
  const result = run('vocabulary');
  assert.equal(result.status, 0, result.stderr);
  const vocabulary = JSON.parse(result.stdout);
  assert.deepEqual(vocabulary.dimensions.map(dimension => dimension.name), ['topic', 'location', 'period', 'sourcetype']);
  assert.ok(vocabulary.dimensions[0].tags.includes('business_economics'));
});

test('vocabulary can be narrowed to chosen dimensions', () => {
  const result = run('vocabulary', '--dimensions', 'topic,period');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).dimensions.map(d => d.name), ['topic', 'period']);
});

test('an unknown dimension is refused by name', () => {
  const result = run('vocabulary', '--dimensions', 'topic,mood');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown dimension: mood/);
});

test('prepare emits one worksheet row per item with a stable ref', () => {
  const result = run('prepare', EXPORT);
  assert.equal(result.status, 0, result.stderr);
  const worksheet = JSON.parse(result.stdout);
  assert.equal(worksheet.format, 'bookmark-tags/worksheet/v1');
  assert.equal(worksheet.source.item_count, 6);
  assert.equal(worksheet.items.length, 6);
  assert.equal(worksheet.items[0].ref, 'b0001');
  assert.equal(worksheet.items[0].host, 'www.example-times.com');
  assert.deepEqual(worksheet.items[0].existing_tags, ['src:safari-export', 'folder:News']);
});

test('prepare slices a large export without renumbering refs', () => {
  const result = run('prepare', EXPORT, '--offset', '2', '--limit', '2');
  assert.equal(result.status, 0, result.stderr);
  const worksheet = JSON.parse(result.stdout);
  assert.deepEqual(worksheet.items.map(item => item.ref), ['b0003', 'b0004']);
});

test('apply writes an importable file and adds implied tags', () => {
  const directory = workspace();
  const prepared = JSON.parse(run('prepare', EXPORT).stdout);
  const assignments = writeAssignments(directory, {
    format: 'bookmark-tags/assignments/v1',
    source_fingerprint: prepared.source.fingerprint,
    items: [
      {ref: 'b0001', tags: ['climate', 'california', '2001-2019', 'major_publication']},
      {ref: 'b0002', tags: ['ai', 'blogger', 'post-2020']},
    ],
  });
  const output = join(directory, 'tagged.json');
  const result = run('apply', EXPORT, assignments, '-o', output);
  assert.equal(result.status, 0, result.stderr);

  const document = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(document.format, 'bookmark-sorter/v1');
  assert.equal(document.items.length, 2);
  assert.equal(document.tagged_by.skill, 'tag-bookmarks');
  assert.deepEqual(document.items[0].tags, ['2001-2019', 'california', 'climate', 'environment', 'major_publication', 'usa']);
  assert.deepEqual(document.items[1].tags, ['ai', 'blogger', 'post-2020', 'technology']);
  assert.equal(document.items[0].url, 'https://www.example-times.com/2024/03/11/california-drought-rules');
  assert.ok(!('verdict' in document.items[0]), 'the tagged file carries no verdict');
});

test('--no-implied writes only the tags that were assigned', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0001', tags: ['california']}]});
  const output = join(directory, 'tagged.json');
  assert.equal(run('apply', EXPORT, assignments, '-o', output, '--no-implied').status, 0);
  assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')).items[0].tags, ['california']);
});

test('a tag the bookmark already carries is not written again', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0005', tags: ['technology', 'corporation']}]});
  const output = join(directory, 'tagged.json');
  assert.equal(run('apply', EXPORT, assignments, '-o', output).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')).items[0].tags, ['corporation']);
});

test('an item can be addressed by url as well as by ref', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {
    items: [{url: 'https://example.net/untitled-page?utm_source=news#top', tags: ['media']}],
  });
  const output = join(directory, 'tagged.json');
  assert.equal(run('apply', EXPORT, assignments, '-o', output).status, 0);
  const document = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(document.items[0].url, 'https://example.net/untitled-page');
});

test('a tag outside the vocabulary fails the run', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0001', tags: ['gardening']}]});
  const result = run('apply', EXPORT, assignments, '-o', join(directory, 'tagged.json'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /"gardening" is not in the vocabulary default/);
});

test('a tag from a dimension left out of the run says so', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0001', tags: ['blogger']}]});
  const result = run('apply', EXPORT, assignments, '--dimensions', 'topic', '-o', join(directory, 'tagged.json'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /belongs to the dimension sourcetype, which is not in this run/);
});

test('--allow-unknown-tags keeps the tag and warns', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0001', tags: ['gardening']}]});
  const output = join(directory, 'tagged.json');
  const result = run('apply', EXPORT, assignments, '-o', output, '--allow-unknown-tags');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Warning: .*gardening/);
  assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')).items[0].tags, ['gardening']);
});

test('assignments written for another export are refused', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {
    source_fingerprint: '0000000000000000',
    items: [{ref: 'b0001', tags: ['media']}],
  });
  const result = run('apply', EXPORT, assignments, '-o', join(directory, 'tagged.json'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /does not match/);
});

test('a ref that is not in the export is refused', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0099', tags: ['media']}]});
  const result = run('apply', EXPORT, assignments, '-o', join(directory, 'tagged.json'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /ref b0099 is not in/);
});

test('several assignment files are merged, and a report can be written', () => {
  const directory = workspace();
  const first = join(directory, 'batch-1.json');
  const second = join(directory, 'batch-2.json');
  writeFileSync(first, JSON.stringify({items: [{ref: 'b0001', tags: ['climate']}]}));
  writeFileSync(second, JSON.stringify({items: [{ref: 'b0001', tags: ['politics']}, {ref: 'b0003', tags: ['health']}]}));
  const output = join(directory, 'tagged.json');
  const report = join(directory, 'report.md');
  const result = run('apply', EXPORT, first, second, '-o', output, '--report', report);
  assert.equal(result.status, 0, result.stderr);
  const document = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(document.items.length, 2);
  assert.deepEqual(document.items[0].tags, ['climate', 'environment', 'politics']);
  assert.match(readFileSync(report, 'utf8'), /# tag-bookmarks report/);
});

test('--include-untagged keeps every item in the output', () => {
  const directory = workspace();
  const assignments = writeAssignments(directory, {items: [{ref: 'b0001', tags: ['media']}]});
  const output = join(directory, 'tagged.json');
  assert.equal(run('apply', EXPORT, assignments, '-o', output, '--include-untagged').status, 0);
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).items.length, 6);
});

test('a text vocabulary file is accepted', () => {
  const directory = workspace();
  const path = join(directory, 'my-tags.txt');
  writeFileSync(path, '# my list\ndimension: mood\ncheerful\nbleak\n\ndimension: length\nshort\nlong\n');
  const listed = run('vocabulary', '--vocabulary', path);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).dimensions.map(d => d.name), ['mood', 'length']);

  const assignments = writeAssignments(directory, {items: [{ref: 'b0001', tags: ['bleak', 'long']}]});
  const output = join(directory, 'tagged.json');
  assert.equal(run('apply', EXPORT, assignments, '--vocabulary', path, '-o', output).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')).items[0].tags, ['bleak', 'long']);
});

test('a vocabulary that repeats a tag across dimensions is refused', () => {
  const directory = workspace();
  const path = join(directory, 'clash.txt');
  writeFileSync(path, 'dimension: one\nalpha\ndimension: two\nalpha\n');
  const result = run('vocabulary', '--vocabulary', path);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /a tag belongs to one dimension/);
});

test('a file that is not a Bookmark Sorter export is refused', () => {
  const directory = workspace();
  const path = join(directory, 'not-an-export.json');
  writeFileSync(path, JSON.stringify({items: []}));
  const result = run('prepare', path);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /is not a bookmark-sorter\/v1 file/);
});
