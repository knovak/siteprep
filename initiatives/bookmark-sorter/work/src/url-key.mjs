const TRACKING_KEYS = new Set(['fbclid', 'gclid']);

function googleRedirectTarget(url) {
  const hostname = url.hostname.toLowerCase();
  if (url.pathname !== '/url' || (hostname !== 'google.com' && !hostname.endsWith('.google.com'))) {
    return null;
  }

  const target = url.searchParams.get('q') || url.searchParams.get('url');
  if (!target) return null;
  try {
    const parsed = new URL(target);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

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

/** Replace a Google /url redirect with its HTTP(S) destination before storage. */
export function simplifyStoredUrl(value) {
  const original = new URL(value);
  const target = googleRedirectTarget(original);
  return target ? normaliseUrl(target.toString()) : String(value);
}
