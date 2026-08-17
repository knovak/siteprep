// test-plan.md §4.1, the two store rows: atomic write, one generation kept.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyStore, loadStore, saveStore, loadPrevious, exportStore } from '../src/store.mjs';

function scratch() {
  return join(mkdtempSync(join(tmpdir(), 'harvester-store-')), 'store.json');
}

test('a crash mid-write leaves the previous store intact and readable', () => {
  const path = scratch();
  const first = emptyStore();
  first.stories.push({ id: 'u1-aaaa', title: 'The one that must survive', merged_from: [] });
  saveStore(path, first);

  const second = emptyStore();
  second.stories.push({ id: 'u1-bbbb', title: 'The one that never lands', merged_from: [] });
  assert.throws(() => {
    saveStore(path, second, {
      onBeforeRename: () => {
        throw new Error('power cut');
      }
    });
  }, /power cut/);

  const recovered = loadStore(path);
  assert.equal(recovered.stories.length, 1);
  assert.equal(recovered.stories[0].title, 'The one that must survive');
  // And the file itself is valid JSON, not a truncated write.
  assert.doesNotThrow(() => JSON.parse(readFileSync(path, 'utf8')));
});

test('after a write, the previous version is recoverable', () => {
  const path = scratch();
  const first = emptyStore();
  first.stories.push({ id: 'u1-aaaa', title: 'Generation one', merged_from: [] });
  saveStore(path, first);

  const second = emptyStore();
  second.stories.push({ id: 'u1-aaaa', title: 'Generation two', merged_from: [] });
  saveStore(path, second);

  assert.equal(loadStore(path).stories[0].title, 'Generation two');
  assert.equal(loadPrevious(path).stories[0].title, 'Generation one');
});

test('a missing store reads as an empty one, not as an error', () => {
  const store = loadStore(scratch());
  assert.deepEqual(store.stories, []);
  assert.equal(loadPrevious(scratch()), undefined);
});

test('a store written by an older reader still loads with every field present', () => {
  // §11: an unrecognised value must load and round-trip. The same has to be
  // true of a *missing* section, or the fallback of decisions.md - another
  // surface reading this file - is a promise the loader breaks.
  const path = scratch();
  writeFileSync(path, JSON.stringify({ stories: [{ id: 'u1-aaaa', merged_from: [] }] }), 'utf8');
  const store = loadStore(path);
  assert.deepEqual(store.runs, []);
  assert.deepEqual(store.vocabularies, { shape: [], verdict: [] });
});

test('a subset export has the same shape as the whole store', () => {
  const store = emptyStore();
  store.stories.push(
    { id: 'u1-aaaa', verdict: null, merged_from: [] },
    { id: 'u1-bbbb', verdict: 'kept', merged_from: [] }
  );
  const subset = exportStore(store, { filter: (s) => s.verdict === null });
  assert.deepEqual(Object.keys(subset).sort(), Object.keys(store).sort());
  assert.equal(subset.stories.length, 1);
  // A copy, not a view: editing the export must not reach back into the store.
  subset.stories[0].verdict = 'dropped';
  assert.equal(store.stories[0].verdict, null);
});

test('the store file is plain, indented JSON a person can read and diff', () => {
  const path = scratch();
  saveStore(path, emptyStore());
  const text = readFileSync(path, 'utf8');
  assert.ok(text.includes('\n  "stories"'), '§7 chose one JSON file for exactly this');
  assert.ok(text.endsWith('\n'));
  assert.ok(existsSync(path));
});
