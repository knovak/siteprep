// Identity - `story-record.md` §3 case 1, and the record shape of §1.
//
// This is the phase where a mistake is permanent (`plan.md` §3): every stored
// id was derived from the rule in force when it was written, and a change to
// the rule does not migrate. Hence the `u1-`/`a1-` prefixes below. They cost
// four characters and they make a change of rule *visible* in the data rather
// than something a later reader has to infer from a duplicate.

import { createHash } from 'node:crypto';

/** The fields of `story-record.md` §1, with the defaults a new record takes. */
export const RECORD_FIELDS = [
  'id', 'url', 'url_key', 'title', 'text', 'text_is_summary', 'source', 'harvester',
  'issue_date', 'story_date', 'shape', 'source_doc', 'source_anchor', 'tags',
  'verdict', 'verdict_at', 'harvested_at', 'merged_from'
];

/**
 * The identity of a story, per `story-record.md` §3 case 1.
 *
 * Two cases, and which one applies is decided by whether the story has a URL -
 * not by its shape. A long-form column that does have its own URL is keyed on
 * it like anything else; a link-list entry whose link would not parse falls
 * back, which is the case the anchor exists for.
 */
export function identityOf(record) {
  if (record.url_key) {
    return {
      scheme: 'url',
      parts: { source: record.source, issue_date: record.issue_date, url_key: record.url_key }
    };
  }
  return {
    scheme: 'anchor',
    parts: { source_doc: record.source_doc, source_anchor: record.source_anchor }
  };
}

/** The derived id. Never random: a re-harvest must arrive at the same one. */
export function idFor(record) {
  const identity = identityOf(record);
  const prefix = identity.scheme === 'url' ? 'u1' : 'a1';
  const digest = createHash('sha256')
    .update(JSON.stringify(Object.values(identity.parts).map((v) => v ?? '')))
    .digest('hex')
    .slice(0, 16);
  return `${prefix}-${digest}`;
}

/**
 * Two records claim the same id, but were they derived from the same thing?
 *
 * §7.1's last row: an id collision on plainly different records means one
 * side's rules differ from ours, which is a bug worth seeing. Comparing the
 * identity *inputs* is how that is detected, and it is only possible because
 * the record carries them all.
 */
export function sameIdentity(a, b) {
  const ia = identityOf(a);
  const ib = identityOf(b);
  if (ia.scheme !== ib.scheme) return false;
  return Object.keys(ia.parts).every((k) => (ia.parts[k] ?? null) === (ib.parts[k] ?? null));
}

/**
 * Fill a partial record out to `story-record.md` §1, deriving what is derived.
 *
 * `harvested_at` is set here and never moved afterwards - the whole of O3 in
 * one line. `verdict` defaults to null because a harvester never writes one
 * (`story-record.md` §5); the merge path enforces that rather than trusting it.
 */
export function makeRecord(partial, { now } = {}) {
  const record = {
    id: null,
    url: null,
    url_key: null,
    title: '',
    text: '',
    text_is_summary: false,
    source: null,
    harvester: null,
    issue_date: null,
    story_date: null,
    shape: null,
    source_doc: null,
    source_anchor: null,
    tags: [],
    verdict: null,
    verdict_at: null,
    harvested_at: now || new Date().toISOString(),
    merged_from: [],
    ...partial
  };
  record.tags = uniqueTags(record.tags);
  record.merged_from = [...new Set(record.merged_from)];
  record.id = record.id || idFor(record);
  return record;
}

/** Tags are a set of free strings (`story-record.md` §1.1). Order is display. */
export function uniqueTags(tags = []) {
  return [...new Set(tags.filter((t) => typeof t === 'string' && t.length))].sort();
}
