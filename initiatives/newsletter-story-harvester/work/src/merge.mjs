// The merge path - one implementation, two callers.
//
// §7.1's argument is that import is not a new mechanism: importing a store is
// merging records, which is what a harvest already does when it meets a story
// it has seen before. So this file is the whole of both, and the only
// difference between the callers is `mode`.
//
// The properties this has to have are `plan.md` §3's, and they are properties
// rather than features: the same records go in twice and nothing duplicates,
// and two sources carrying one article arrive as one record with both sources
// kept.

import { idFor, makeRecord, sameIdentity, uniqueTags } from './identity.mjs';
import { indexStore } from './store.mjs';

/**
 * @typedef {object} MergeReport
 * @property {number} added       new records
 * @property {number} matched     case 1 - already present, existing wins
 * @property {number} merged      case 2 - absorbed into a record with the same url_key
 * @property {number} conflicted  same id, plainly different record: skipped (§7.1)
 * @property {number} refused     a verdict arriving on a harvest (`story-record.md` §5)
 * @property {string[]} conflicts ids of the conflicted records, so it is inspectable
 */

/**
 * Merge records into a store. Never deletes: a story absent from the incoming
 * set means nothing at all, because a subset export is a normal thing to be
 * handed (§7.1).
 *
 * @param {object} store
 * @param {object[]} incoming  partial or complete records
 * @param {object} [options]
 * @param {'harvest'|'import'} [options.mode]
 * @param {string} [options.now]  ISO timestamp, so a test can hold time still
 */
export function mergeRecords(store, incoming, { mode = 'harvest', now } = {}) {
  const report = { added: 0, matched: 0, merged: 0, conflicted: 0, refused: 0, conflicts: [] };
  const index = indexStore(store);

  for (const raw of incoming) {
    const record = makeRecord({ ...raw }, { now });

    // `story-record.md` §5: a harvester never writes a verdict. Enforced here
    // rather than trusted, because the failure is invisible - a pre-judged
    // record quietly shrinks the backlog O7 counts.
    if (mode === 'harvest' && record.verdict) {
      record.verdict = null;
      record.verdict_at = null;
      report.refused += 1;
    }

    const existing = index.byId.get(record.id);
    if (existing) {
      // A hit through `merged_from` is the absorbed side of an earlier merge
      // arriving again. Its identity is *supposed* to differ from the record
      // that absorbed it, so only a direct hit can be a collision.
      const directHit = existing.id === record.id;
      if (directHit && !sameIdentity(existing, record)) {
        report.conflicted += 1;
        report.conflicts.push(record.id);
        continue;
      }
      absorb(existing, record, { merging: false });
      report.matched += 1;
      continue;
    }

    const twin = record.url_key ? (index.byUrlKey.get(record.url_key) || [])[0] : null;
    if (twin) {
      absorb(twin, record, { merging: true });
      index.byId.set(record.id, twin);
      report.merged += 1;
      continue;
    }

    store.stories.push(record);
    index.byId.set(record.id, record);
    if (record.url_key) {
      if (!index.byUrlKey.has(record.url_key)) index.byUrlKey.set(record.url_key, []);
      index.byUrlKey.get(record.url_key).push(record);
    }
    report.added += 1;
  }

  refreshFacets(store);
  return report;
}

/**
 * Fold `incoming` into `existing`, which survives.
 *
 * First-write-wins on everything the reader sees, which is what makes a
 * re-harvest a no-op: `harvested_at` does not move, and text and title stay as
 * they were. `plan.md` §5.5 leans on exactly this - a harvest into an empty
 * store followed by an import of the old one is `--refresh`, because the new
 * text was written first and the old verdicts arrive without displacing it.
 */
function absorb(existing, incoming, { merging }) {
  existing.tags = uniqueTags([...existing.tags, ...incoming.tags]);

  const verdict = resolveVerdict(existing, incoming);
  existing.verdict = verdict.verdict;
  existing.verdict_at = verdict.verdict_at;

  // A field the first write left empty is not a decision to keep it empty.
  for (const field of ['story_date', 'source_anchor', 'shape', 'harvester', 'text', 'title', 'url']) {
    if ((existing[field] === null || existing[field] === '' || existing[field] === undefined) && incoming[field]) {
      existing[field] = incoming[field];
    }
  }

  if (!merging) return;

  // Case 2 (`story-record.md` §3). One record, every source kept, the earliest
  // issue_date kept, the absorbed id in merged_from.
  //
  // Sources are kept as `source:` tags, which §1.1 already names as a thing
  // tags are for - not as a new field, since a second source field would be
  // one more thing every reader of the store has to be taught.
  existing.tags = uniqueTags([
    ...existing.tags,
    `source:${existing.source}`,
    `source:${incoming.source}`
  ]);

  if (incoming.issue_date && (!existing.issue_date || incoming.issue_date < existing.issue_date)) {
    existing.issue_date = incoming.issue_date;
    existing.source = incoming.source;
    existing.source_doc = incoming.source_doc;
    existing.source_anchor = incoming.source_anchor;
  }

  // The id is *not* re-derived from the fields above. It was assigned at first
  // write and things point at it - a verdict file, a merged_from entry
  // elsewhere. Re-deriving it here would silently break those, and the
  // property that matters is preserved anyway: both sides' derived ids resolve
  // to this record, one directly and one through merged_from.
  existing.merged_from = [...new Set([
    ...existing.merged_from,
    incoming.id,
    ...incoming.merged_from
  ])].filter((id) => id !== existing.id);
}

/**
 * §7.1: later `verdict_at` wins, and a null verdict never displaces a real one
 * in either direction. A judged story is the expensive thing in this system;
 * losing one to a re-import would be the worst bug the store could have.
 */
function resolveVerdict(existing, incoming) {
  if (!incoming.verdict) return { verdict: existing.verdict, verdict_at: existing.verdict_at };
  if (!existing.verdict) return { verdict: incoming.verdict, verdict_at: incoming.verdict_at };
  const later = (incoming.verdict_at || '') > (existing.verdict_at || '');
  return later
    ? { verdict: incoming.verdict, verdict_at: incoming.verdict_at }
    : { verdict: existing.verdict, verdict_at: existing.verdict_at };
}

/**
 * Import a whole store (§7.1). The same merge, with the incoming file's
 * vocabularies unioned in - §11 requires an unrecognised value to load and
 * round-trip, so an import can never arrive with something unreadable.
 *
 * A differing `store_id` is deliberately *not* refused here. §9 refuses a
 * verdict file from another store because a verdict file addresses records by
 * id and nothing else; a store carries the identity inputs with it and merges
 * on them, which is exactly what makes another machine's export mergeable.
 */
export function importStore(store, incomingStore, { now } = {}) {
  for (const key of Object.keys(incomingStore.vocabularies || {})) {
    store.vocabularies[key] = [...new Set([
      ...(store.vocabularies[key] || []),
      ...(incomingStore.vocabularies[key] || [])
    ])].sort();
  }
  return mergeRecords(store, incomingStore.stories || [], { mode: 'import', now });
}

/** The §5.2 run record: every pass over the store leaves one, import included. */
export function recordRun(store, { kind, report, at, range, inventory, note } = {}) {
  const run = {
    kind,
    at: at || new Date().toISOString(),
    range: range || null,
    inventory: inventory || null,
    note: note || null,
    ...report
  };
  store.runs.push(run);
  return run;
}

/** `sources` and `harvesters` are names seen in the data, for display (§7). */
function refreshFacets(store) {
  store.sources = [...new Set(store.stories.map((s) => s.source).filter(Boolean))].sort();
  store.harvesters = [...new Set(store.stories.map((s) => s.harvester).filter(Boolean))].sort();
}

/** Re-derive an id, for a caller holding a partial record. */
export const deriveId = idFor;
