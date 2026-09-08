import {normaliseUrl} from './url-key.mjs';

function httpDestination(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return {url: url.href, url_key: normaliseUrl(url.href)};
  } catch {
    return null;
  }
}

export function redirectProposal(source, capture, destination = null) {
  const target = httpDestination(capture?.final_url);
  if (!target || target.url_key === source.url_key) return null;
  return {
    id: source.id,
    title: source.title,
    current_url: source.url,
    final_url: target.url,
    final_url_key: target.url_key,
    captured_at: capture.captured_at,
    mode: destination ? 'merge' : 'replace',
    destination: destination ? {
      id: destination.id,
      title: destination.title,
      url: destination.url,
    } : null,
  };
}

export function mergeRedirectItems(source, destination) {
  return {
    added_at: !destination.added_at ? source.added_at
      : !source.added_at ? destination.added_at
        : destination.added_at < source.added_at ? destination.added_at : source.added_at,
    note: destination.note || source.note || null,
    title_key: destination.title_key || source.title_key || '',
    verdict: destination.verdict || source.verdict || null,
    verdict_at: destination.verdict ? destination.verdict_at : source.verdict_at || null,
  };
}
