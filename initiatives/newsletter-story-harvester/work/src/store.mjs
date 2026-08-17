// The store - one JSON file (§7), written atomically, one generation kept.
//
// §7's three rules are the whole of this file. The store is the only durable
// thing in the design, so a crash mid-write must leave the previous one intact
// and readable, and a bad run must be recoverable without a backup.

import { readFileSync, writeFileSync, renameSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const STORE_VERSION = 1;

/** An empty store, which is also the shape every reader may assume (§7). */
export function emptyStore() {
  return {
    version: STORE_VERSION,
    store_id: null,
    stories: [],
    runs: [],
    vocabularies: { shape: [], verdict: [] },
    harvesters: [],
    sources: []
  };
}

export function loadStore(path) {
  if (!existsSync(path)) return emptyStore();
  return hydrate(JSON.parse(readFileSync(path, 'utf8')));
}

/** A store read from anywhere - a file, an export, another machine. */
export function hydrate(raw) {
  const store = { ...emptyStore(), ...raw };
  store.vocabularies = { ...emptyStore().vocabularies, ...(raw.vocabularies || {}) };
  return store;
}

/**
 * Write the store, atomically, keeping one generation.
 *
 * The order is: copy the current file to `.prev`, write the new one beside it,
 * rename over the top. Rename is the atomic step, so a crash at any point
 * leaves either the old file or the new one - never half of either.
 *
 * `onBeforeRename` exists for the §4.1 crash test and for nothing else: the
 * only honest way to assert "a crash mid-write leaves the previous store
 * intact" is to arrange the crash at the one moment where it could not be.
 */
export function saveStore(path, store, { onBeforeRename } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  const previous = `${path}.prev`;

  if (existsSync(path)) copyFileSync(path, previous);
  writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  if (onBeforeRename) onBeforeRename(temporary);
  renameSync(temporary, path);
  return path;
}

/** The generation §7 keeps. Undefined rather than throwing when there is none. */
export function loadPrevious(path) {
  const previous = `${path}.prev`;
  return existsSync(previous) ? hydrate(JSON.parse(readFileSync(previous, 'utf8'))) : undefined;
}

/** An id index over `stories`, including the ids absorbed by a merge (§3). */
export function indexStore(store) {
  const byId = new Map();
  const byUrlKey = new Map();
  for (const story of store.stories) {
    byId.set(story.id, story);
    // A re-harvest of an absorbed story re-derives its old id. Resolving that
    // id to the surviving record is what makes a merge idempotent rather than
    // a source of duplicates on the next run.
    for (const absorbed of story.merged_from || []) byId.set(absorbed, story);
    if (story.url_key) {
      if (!byUrlKey.has(story.url_key)) byUrlKey.set(story.url_key, []);
      byUrlKey.get(story.url_key).push(story);
    }
  }
  return { byId, byUrlKey };
}

/**
 * Export is a copy, and a subset export has the same shape as the whole thing
 * (§7.1) - so nothing downstream needs to know which it was handed.
 */
export function exportStore(store, { filter } = {}) {
  const stories = filter ? store.stories.filter(filter) : store.stories;
  return { ...structuredClone(store), stories: structuredClone(stories) };
}
