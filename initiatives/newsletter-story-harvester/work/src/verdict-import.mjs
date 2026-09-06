import {createHash} from 'node:crypto';

import {indexStore} from './store.mjs';
import {recordRun} from './merge.mjs';

function canonicalFile(file) {
  const verdicts = (Array.isArray(file.verdicts) ? file.verdicts : []).map(entry => ({
    id: entry?.id,
    verdict: entry?.verdict,
    verdict_at: entry?.verdict_at,
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const tags = (Array.isArray(file.tags) ? file.tags : []).map(entry => ({
    id: entry?.id,
    add: [...(Array.isArray(entry?.add) ? entry.add : [])].sort(),
    remove: [...(Array.isArray(entry?.remove) ? entry.remove : [])].sort(),
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {store_id: file.store_id, exported_at: file.exported_at ?? null, verdicts, tags};
}

function fileHash(file) {
  return createHash('sha256').update(JSON.stringify(canonicalFile(file))).digest('hex');
}

function isoTimestamp(value) {
  const timestamp = new Date(value);
  if (!value || Number.isNaN(timestamp.valueOf())) return null;
  return timestamp.toISOString();
}

function priorReport(run) {
  const keys = ['added', 'matched', 'merged', 'conflicted', 'updated', 'conflicts', 'file_hash'];
  return Object.fromEntries(keys.map(key => [key, structuredClone(run[key])]));
}

function conflict(report, id) {
  report.conflicted += 1;
  report.conflicts.push(String(id ?? '(missing id)'));
}

/**
 * Import the small §9 verdict file into the durable store.
 *
 * Only `verdicts` and `tags` are read. Everything else in the input is inert,
 * so a page cannot smuggle story text, additions, or deletions into the store.
 */
export function importVerdictFile(store, file, {now = new Date().toISOString()} = {}) {
  if (!store?.store_id) throw new Error('Store has no store_id; refusing an addressed verdict file');
  if (!file || typeof file !== 'object' || Array.isArray(file)) throw new TypeError('Verdict file must be a JSON object');
  if (file.store_id !== store.store_id) {
    throw new Error(`Verdict file store_id ${JSON.stringify(file.store_id)} does not match store_id ${JSON.stringify(store.store_id)}`);
  }
  if (!Array.isArray(file.verdicts) || !Array.isArray(file.tags)) {
    throw new TypeError('Verdict file must contain verdicts and tags arrays');
  }

  const hash = fileHash(file);
  const previous = (store.runs || []).find(run => run.kind === 'verdict-import' && run.file_hash === hash);
  if (previous) return {...priorReport(previous), duplicate: true};

  const report = {
    added: 0,
    matched: 0,
    merged: 0,
    conflicted: 0,
    updated: 0,
    conflicts: [],
    file_hash: hash,
  };
  const index = indexStore(store);

  for (const entry of file.verdicts) {
    const story = entry && typeof entry === 'object' ? index.byId.get(entry.id) : null;
    const verdictAt = isoTimestamp(entry?.verdict_at);
    if (!story || (entry.verdict !== null && (typeof entry.verdict !== 'string' || !entry.verdict.trim())) || !verdictAt) {
      conflict(report, entry?.id);
      continue;
    }
    report.matched += 1;

    const existingAt = isoTimestamp(story.verdict_at);
    if (existingAt === verdictAt && story.verdict !== entry.verdict) {
      conflict(report, entry.id);
      continue;
    }
    if (!existingAt || verdictAt > existingAt) {
      story.verdict = entry.verdict;
      story.verdict_at = verdictAt;
      report.updated += 1;
    }
    store.vocabularies.verdict = [...new Set([
      ...(store.vocabularies.verdict || []),
      ...entry.verdict === null ? [] : [entry.verdict],
    ])].sort();
  }

  for (const entry of file.tags) {
    const story = entry && typeof entry === 'object' ? index.byId.get(entry.id) : null;
    const add = Array.isArray(entry?.add) ? entry.add : null;
    const remove = Array.isArray(entry?.remove) ? entry.remove : null;
    const valid = story && add && remove
      && add.every(tag => typeof tag === 'string' && tag)
      && remove.every(tag => typeof tag === 'string' && tag)
      && !add.some(tag => remove.includes(tag));
    if (!valid) {
      conflict(report, entry?.id);
      continue;
    }
    report.matched += 1;
    const before = JSON.stringify(story.tags);
    const tags = new Set(story.tags || []);
    for (const tag of remove) tags.delete(tag);
    for (const tag of add) tags.add(tag);
    story.tags = [...tags].sort();
    if (JSON.stringify(story.tags) !== before) report.updated += 1;
  }

  report.conflicts = [...new Set(report.conflicts)];
  recordRun(store, {
    kind: 'verdict-import',
    report,
    at: now,
    note: `Imported verdict file exported at ${file.exported_at || 'unknown time'}`,
  });
  return {...report, duplicate: false};
}
