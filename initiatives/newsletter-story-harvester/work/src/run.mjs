// One harvest, end to end, over spec.md §2's message-source seam.
//
// The seam is deliberately two calls wide: `search(entry, range)` returns
// message metadata, then `read(message)` returns the body. The run verifies the
// actual From address between them, so Gmail's plus-tag over-match never causes
// the wrong publication's content to be fetched or recorded (§4, §5.1).

import { loadStore, saveStore } from './store.mjs';
import { extractIssue, summariseRun } from './extract.mjs';
import { mergeRecords, recordRun } from './merge.mjs';
import { uniqueTags } from './identity.mjs';
import { actualFromMatchesEntry, matchersFor } from './fixture-source.mjs';
import { contractFor } from './contracts.mjs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Run and atomically persist one harvest. Nothing is written if the run fails. */
export async function runHarvestToPath({ storePath, ...options }) {
  if (!storePath) throw new Error('harvest: storePath is required');
  const store = loadStore(storePath);
  const result = await runHarvest({ ...options, store });
  saveStore(storePath, store);
  return result;
}

/**
 * Run one explicit half-open date range into a store object.
 *
 * `tagger` is the judgement seam for §10.1. It sees records, never mailbox
 * bodies, and returns ordinary tags; a theme proposed here is not privileged
 * over one a later pass or a person writes.
 */
export async function runHarvest({ inventory, range, source, model, store, tagger, now, harvester } = {}) {
  const entries = validateInventory(inventory);
  const requestedRange = resolveRange(range);
  if (!source || typeof source.search !== 'function' || typeof source.read !== 'function') {
    throw new Error('harvest: source must implement search(entry, range) and read(message)');
  }
  if (typeof model !== 'function') throw new Error('harvest: model is required');
  if (!store || !Array.isArray(store.stories) || !Array.isArray(store.runs)) {
    throw new Error('harvest: a hydrated store is required');
  }

  const proposeTags = typeof tagger === 'function' ? tagger : async () => [];
  const at = now || new Date().toISOString();
  const issueReports = [];
  const sourceDocs = [];
  const issuesPerSource = Object.fromEntries(entries.map((entry) => [entry.key, 0]));
  const resolvedBySource = {};
  const attributed = new Map();
  let unattributed = 0;
  const merged = emptyMergeReport();

  // Validate the complete inventory before the first read. Discovering an
  // unknown contract after earlier entries have already fetched bodies would
  // be a partial run even though runHarvestToPath correctly writes nothing.
  for (const entry of entries) {
    contractFor(entry.shape);
    matchersFor(entry);
    rangeForEntry(requestedRange, entry);
  }

  for (const entry of entries) {
    const entryRange = rangeForEntry(requestedRange, entry);
    resolvedBySource[entry.key] = entryRange;
    const messages = await source.search(entry, entryRange);

    for (const message of messages) {
      if (!message?.id || !DATE.test(message.issue_date || '')) {
        throw new Error(`harvest: ${entry.key} returned a message without an id or YYYY-MM-DD issue_date`);
      }
      if (message.shape_override) contractFor(message.shape_override);
      if (!actualFromMatchesEntry(message, entry)) {
        unattributed += 1;
        continue;
      }
      const earlier = attributed.get(message.id);
      if (earlier && earlier !== entry.key) {
        throw new Error(`harvest: message ${message.id} belongs to both ${earlier} and ${entry.key}`);
      }
      if (earlier) continue;
      attributed.set(message.id, entry.key);

      const html = await source.read(message);
      const issue = {
        id: message.id,
        html,
        source: entry.key,
        issue_date: message.issue_date,
        shape: entry.shape,
        unwrap: entry.unwrap || undefined
      };
      const overrideShape = message.shape_override || entry.overrides?.[message.id] || undefined;
      const extracted = await extractIssue(issue, {
        overrideShape,
        model,
        harvester: harvester || 'harvest-newsletters',
        now: at
      });

      for (const record of extracted.records) {
        const proposed = await proposeTags({
          record: structuredClone(record),
          issue: { id: issue.id, source: issue.source, issue_date: issue.issue_date, shape: extracted.report.extracted_shape },
          inventory: { key: entry.key, name: entry.name }
        });
        if (!Array.isArray(proposed)) throw new Error(`harvest: tagger must return an array for ${record.id}`);
        record.tags = uniqueTags([...record.tags, ...proposed]);
      }

      accumulateMerge(merged, mergeRecords(store, extracted.records, { mode: 'harvest', now: at }));
      issueReports.push(extracted.report);
      issuesPerSource[entry.key] += 1;
      sourceDocs.push({
        source_doc: message.id,
        source: entry.key,
        issue_date: message.issue_date,
        shape: extracted.report.extracted_shape,
        stories: extracted.records.length,
        flagged: extracted.report.flagged
      });
    }
  }

  const extraction = summariseRun(issueReports);
  store.vocabularies.shape = [...new Set([
    ...(store.vocabularies.shape || []),
    ...entries.map((entry) => entry.shape),
    ...issueReports.map((report) => report.extracted_shape)
  ])].sort();

  const report = {
    issues: issueReports.length,
    issues_per_source: issuesPerSource,
    source_docs: sourceDocs,
    stories_extracted: extraction.stories,
    extraction_refused: extraction.refused,
    extraction_refused_by_reason: extraction.refused_by_reason,
    loud: extraction.loud,
    flagged: extraction.flagged,
    overridden: extraction.overridden,
    unattributed,
    added: merged.added,
    matched: merged.matched,
    merged: merged.merged,
    conflicted: merged.conflicted,
    conflicts: merged.conflicts,
    verdicts_refused: merged.refused
  };
  const resolvedRange = {
    after: requestedRange.after,
    before: requestedRange.before,
    sources: resolvedBySource
  };
  const inventoryRecord = {
    id: inventory.id || null,
    sources: entries.map((entry) => entry.key)
  };
  const run = recordRun(store, {
    kind: 'harvest',
    report,
    at,
    range: resolvedRange,
    inventory: inventoryRecord
  });

  return { store, run, report };
}

export function resolveRange(range) {
  if (!range?.after || !range?.before) {
    throw new Error('harvest: an explicit range with after and before is required');
  }
  if (!DATE.test(range.after) || !DATE.test(range.before)) {
    throw new Error('harvest: after and before must be local dates in YYYY-MM-DD form');
  }
  if (range.after >= range.before) throw new Error('harvest: after must be before before');
  return { after: range.after, before: range.before };
}

function validateInventory(inventory) {
  const entries = inventory?.sources;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('harvest: inventory.sources must be a non-empty array');
  }
  const keys = new Set();
  for (const entry of entries) {
    if (!entry?.key || !entry.name || !entry.shape) throw new Error('harvest: every inventory source needs key, name and shape');
    if (keys.has(entry.key)) throw new Error(`harvest: duplicate inventory key ${entry.key}`);
    keys.add(entry.key);
  }
  return entries;
}

function rangeForEntry(range, entry) {
  if (entry.since && !DATE.test(entry.since)) throw new Error(`harvest: ${entry.key}.since is not YYYY-MM-DD`);
  const after = entry.since && entry.since > range.after ? entry.since : range.after;
  return { after, before: range.before };
}

function emptyMergeReport() {
  return { added: 0, matched: 0, merged: 0, conflicted: 0, refused: 0, conflicts: [] };
}

function accumulateMerge(total, report) {
  for (const key of ['added', 'matched', 'merged', 'conflicted', 'refused']) total[key] += report[key] || 0;
  total.conflicts.push(...(report.conflicts || []));
}
