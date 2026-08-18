const TRACKING_KEYS = new Set(['fbclid', 'gclid']);

export function normaliseUrl(value) {
  const url = new URL(value);
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';

  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || TRACKING_KEYS.has(lower)) {
      url.searchParams.delete(key);
    }
  }

  let normalised = url.toString();
  if (url.pathname === '/' && !url.search) normalised = normalised.replace(/\/$/, '');
  return normalised;
}
