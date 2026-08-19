import {parseBookmarkHtml} from './bookmark-html.mjs';
import {normaliseUrl} from './url-key.mjs';
import {normaliseTitle} from './selections.mjs';

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

export async function ingestBookmarkHtml({
  store,
  collectionId,
  html,
  source,
  ingestedAt,
  capture = null,
  scheduleCapture = task => task(),
}) {
  if (!await store?.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source)) throw new Error('Source must be a tag-safe slug');

  const ingested = new Date(ingestedAt);
  if (Number.isNaN(ingested.valueOf())) throw new Error('ingestedAt must be a date');
  const ingestedIso = ingested.toISOString();
  const baseTags = [`src:${source}`, `in:${ingestedIso.slice(0, 10)}`];
  const parsed = parseBookmarkHtml(html);

  const candidates = parsed.map(candidate => ({
    url: candidate.url,
    url_key: normaliseUrl(candidate.url),
    title: candidate.title || candidate.url,
    title_key: normaliseTitle(candidate.title || candidate.url),
    note: candidate.note,
    added_at: isoFromBookmarkDate(candidate.add_date),
    ingested_at: ingestedIso,
    tags: candidate.folder_path
      ? [...baseTags, `folder:${candidate.folder_path}`]
      : baseTags,
  }));

  if (typeof store.ingestCandidates === 'function') {
    const result = await store.ingestCandidates(collectionId, candidates);
    if (typeof store.applyKnownCaptureErrors === 'function') {
      await store.applyKnownCaptureErrors(collectionId, candidates.map(candidate => candidate.url_key));
    }
    if (capture) await scheduleCapture(() => capture.captureMany(collectionId, candidates));
    return {parsed: parsed.length, ...result};
  }

  let added = 0;
  let merged = 0;

  for (const candidate of candidates) {
    const existing = await store.findItem(collectionId, candidate.url_key);

    if (!existing) {
      const item = await store.insertItem({
        collection_id: collectionId,
        url: candidate.url,
        url_key: candidate.url_key,
        title: candidate.title,
        title_key: candidate.title_key,
        note: candidate.note,
        added_at: candidate.added_at,
        ingested_at: ingestedIso,
        verdict: null,
        verdict_at: null,
      });
      await store.addTags(item.id, candidate.tags);
      added += 1;
      continue;
    }

    await store.updateItem(existing.id, {
      added_at: earlier(existing.added_at, candidate.added_at),
      note: existing.note || candidate.note || null,
      title_key: existing.title_key || candidate.title_key,
    });
    await store.addTags(existing.id, candidate.tags);
    merged += 1;
  }

  const total = typeof store.countItems === 'function'
    ? await store.countItems(collectionId)
    : (await store.listItems(collectionId)).length;
  if (typeof store.applyKnownCaptureErrors === 'function') {
    await store.applyKnownCaptureErrors(collectionId, candidates.map(candidate => candidate.url_key));
  }
  if (capture) await scheduleCapture(() => capture.captureMany(collectionId, candidates));
  return {parsed: parsed.length, added, merged, total};
}
