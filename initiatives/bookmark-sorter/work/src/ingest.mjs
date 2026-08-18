import {parseBookmarkHtml} from './bookmark-html.mjs';
import {normaliseUrl} from './url-key.mjs';

function isoFromBookmarkDate(value) {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function earlier(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

export function ingestBookmarkHtml({store, collectionId, html, source, ingestedAt}) {
  if (!store?.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source)) throw new Error('Source must be a tag-safe slug');

  const ingested = new Date(ingestedAt);
  if (Number.isNaN(ingested.valueOf())) throw new Error('ingestedAt must be a date');
  const ingestedIso = ingested.toISOString();
  const baseTags = [`src:${source}`, `in:${ingestedIso.slice(0, 10)}`];
  const parsed = parseBookmarkHtml(html);
  let added = 0;
  let merged = 0;

  for (const candidate of parsed) {
    const urlKey = normaliseUrl(candidate.url);
    const importTags = candidate.folder_path
      ? [...baseTags, `folder:${candidate.folder_path}`]
      : baseTags;
    const existing = store.findItem(collectionId, urlKey);

    if (!existing) {
      const item = store.insertItem({
        collection_id: collectionId,
        url: candidate.url,
        url_key: urlKey,
        title: candidate.title || candidate.url,
        note: candidate.note,
        added_at: isoFromBookmarkDate(candidate.add_date),
        ingested_at: ingestedIso,
        verdict: null,
        verdict_at: null,
      });
      store.addTags(item.id, importTags);
      added += 1;
      continue;
    }

    store.updateItem(existing.id, {
      added_at: earlier(existing.added_at, isoFromBookmarkDate(candidate.add_date)),
      note: existing.note || candidate.note || null,
    });
    store.addTags(existing.id, importTags);
    merged += 1;
  }

  return {parsed: parsed.length, added, merged, total: store.listItems(collectionId).length};
}
