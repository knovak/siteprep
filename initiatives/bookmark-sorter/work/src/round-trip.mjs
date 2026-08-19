import {normaliseTitle, evaluateSelection} from './selections.mjs';
import {normaliseUrl} from './url-key.mjs';

export const PORTABLE_FORMAT = 'bookmark-sorter/v1';

const VERDICTS = new Set(['keeper', 'junk', 'archive', 'needs-more-time']);

function documentValue(value) {
  if (typeof value === 'string') return JSON.parse(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Portable bookmark document must be a JSON object');
  }
  return structuredClone(value);
}

function dateValue(value, field, {nullable = true} = {}) {
  if ((value === null || value === undefined || value === '') && nullable) return null;
  if (typeof value !== 'string' || Number.isNaN(new Date(value).valueOf())) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return value;
}

function urlRecord(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new TypeError(`items[${index}] must be an object`);
  }
  if (typeof item.url !== 'string' || !item.url) throw new TypeError(`items[${index}].url is required`);
  const parsed = new URL(item.url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError(`items[${index}].url must use HTTP or HTTPS`);
  return {item, url_key: normaliseUrl(item.url)};
}

function tagList(value, field) {
  if (!Array.isArray(value) || value.some(tag => typeof tag !== 'string' || !tag.trim())) {
    throw new TypeError(`${field} must be an array of non-empty strings`);
  }
  return [...new Set(value.map(tag => tag.trim()))].sort();
}

function portableItem(item) {
  return {
    url: item.url,
    title: item.title,
    note: item.note ?? null,
    added_at: item.added_at ?? null,
    tags: [...new Set(item.tags || [])].sort(),
    verdict: item.verdict ?? null,
    verdict_at: item.verdict_at ?? null,
  };
}

export async function exportSelection({store, collectionId, expression = '', exportedAt = new Date().toISOString()} = {}) {
  if (!await store?.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
  dateValue(exportedAt, 'exportedAt', {nullable: false});
  const items = evaluateSelection(await store.listAllItems(collectionId), expression, {collectionId});
  return {
    format: PORTABLE_FORMAT,
    exported_at: exportedAt,
    collection: collectionId,
    selection: String(expression || ''),
    items: items.map(portableItem),
  };
}

export function parseExportDocument(value, {importedAt = new Date().toISOString()} = {}) {
  const document = documentValue(value);
  if (document.format !== PORTABLE_FORMAT) throw new Error(`Unsupported bookmark format: ${document.format ?? '(missing)'}`);
  if ('proposal' in document) throw new Error('A proposals file must be reviewed, not imported as an export');
  if (!Array.isArray(document.items)) throw new TypeError('Portable bookmark document must contain an items array');
  const ingestedAt = dateValue(importedAt, 'importedAt', {nullable: false});
  const candidates = document.items.map((raw, index) => {
    const {item, url_key} = urlRecord(raw, index);
    const verdict = item.verdict ?? null;
    if (verdict !== null && !VERDICTS.has(verdict)) throw new Error(`items[${index}].verdict is unsupported: ${verdict}`);
    const verdictAt = dateValue(item.verdict_at, `items[${index}].verdict_at`);
    if (verdict !== null && verdictAt === null) throw new TypeError(`items[${index}].verdict_at is required with a verdict`);
    const title = typeof item.title === 'string' && item.title.trim() ? item.title : item.url;
    return {
      url: item.url,
      url_key,
      title,
      title_key: normaliseTitle(title),
      note: item.note === null || item.note === undefined ? null : String(item.note),
      added_at: dateValue(item.added_at, `items[${index}].added_at`),
      ingested_at: ingestedAt,
      tags: tagList(item.tags ?? [], `items[${index}].tags`),
      verdict,
      verdict_at: verdictAt,
    };
  });
  return {document, candidates};
}

export async function importExportDocument({store, collectionId, document, importedAt = new Date().toISOString()} = {}) {
  if (!await store?.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
  if (typeof store.ingestCandidates !== 'function') throw new TypeError('Store does not support portable imports');
  const parsed = parseExportDocument(document, {importedAt});
  const result = await store.ingestCandidates(collectionId, parsed.candidates);
  if (typeof store.applyKnownCaptureErrors === 'function') {
    await store.applyKnownCaptureErrors(collectionId, parsed.candidates.map(candidate => candidate.url_key));
  }
  return {parsed: parsed.candidates.length, ...result};
}

export async function readProposalDocument({store, collectionId, document} = {}) {
  if (!await store?.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
  const value = documentValue(document);
  if (value.format !== PORTABLE_FORMAT) throw new Error(`Unsupported bookmark format: ${value.format ?? '(missing)'}`);
  if (!value.proposal || typeof value.proposal !== 'object') throw new TypeError('Proposals file must contain a proposal block');
  if (typeof value.proposal.by !== 'string' || !value.proposal.by.trim()) throw new TypeError('proposal.by is required');
  dateValue(value.proposal.at, 'proposal.at', {nullable: false});
  if (!Array.isArray(value.items)) throw new TypeError('Proposals file must contain an items array');

  const items = await store.listAllItems(collectionId);
  const byUrl = new Map(items.map(item => [item.url_key, item]));
  const groups = new Map();
  const unmatched = [];
  for (const [index, raw] of value.items.entries()) {
    const {item, url_key} = urlRecord(raw, index);
    const tags = tagList(item.proposed_tags, `items[${index}].proposed_tags`);
    const match = byUrl.get(url_key);
    if (!match) {
      unmatched.push(item.url);
      continue;
    }
    for (const tag of tags) {
      if (!groups.has(tag)) groups.set(tag, new Map());
      groups.get(tag).set(match.id, match);
    }
  }
  return {
    format: PORTABLE_FORMAT,
    proposal: structuredClone(value.proposal),
    groups: [...groups.entries()]
      .map(([tag, members]) => ({
        tag,
        count: members.size,
        item_ids: [...members.keys()],
        already_tagged: [...members.values()].filter(item => item.tags.includes(tag)).length,
      }))
      .sort((left, right) => left.tag.localeCompare(right.tag)),
    unmatched_urls: [...new Set(unmatched)].sort(),
  };
}

export async function acceptProposedTag({store, collectionId, document, tag, sessionId, actionId, at = new Date().toISOString()} = {}) {
  const proposal = await readProposalDocument({store, collectionId, document});
  const group = proposal.groups.find(candidate => candidate.tag === tag);
  if (!group) throw new Error(`No matched items propose tag: ${tag}`);
  const result = await store.applyTags(collectionId, {
    itemIds: group.item_ids,
    tags: [tag],
    at,
    sessionId,
    actionId,
  });
  return {proposal: proposal.proposal, selection: group, result};
}
