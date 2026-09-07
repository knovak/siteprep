const TRACKING_KEYS = new Set(['fbclid', 'gclid']);

/**
 * Google serves its redirect and AMP viewer paths from every country domain,
 * not only google.com, so the host test accepts a `google` label followed by a
 * one-label suffix (google.com, google.de) or a `co`/`com` two-label suffix
 * (google.co.uk, google.com.au). Anything further to the right, as in
 * google.com.example.net, is a different site and does not match.
 */
function isGoogleHost(hostname) {
  const labels = hostname.split('.');
  if (labels.length < 2) return false;
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return false;
  if (labels[labels.length - 2] === 'google') return true;
  const second = labels[labels.length - 2];
  return labels.length > 2 && (second === 'co' || second === 'com') && labels[labels.length - 3] === 'google';
}

function httpUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function googleRedirectTarget(url) {
  if (url.pathname !== '/url' || !isGoogleHost(url.hostname.toLowerCase())) return null;
  const target = url.searchParams.get('q') || url.searchParams.get('url');
  return target ? httpUrl(target) : null;
}

/**
 * A Google AMP viewer link carries its destination in the path rather than in a
 * query parameter: `/amp/s/<destination>` for HTTPS and `/amp/<destination>` for
 * HTTP, with the destination's own query percent-encoded into that path. The
 * viewer's own parameters (amp_js_v, usqp) are not the destination's and are
 * dropped with the rest of the viewer URL.
 */
function googleAmpTarget(url) {
  if (!isGoogleHost(url.hostname.toLowerCase())) return null;
  const match = /^\/amp\/(s\/)?(.+)$/.exec(url.pathname);
  if (!match) return null;

  const [, secure, encoded] = match;
  let destination;
  try {
    destination = decodeURIComponent(encoded);
  } catch {
    destination = encoded;
  }
  return httpUrl(destination) || httpUrl(`${secure ? 'https' : 'http'}://${destination}`);
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

/**
 * Replace a Google redirect or AMP viewer link with its HTTP(S) destination
 * before storage. A wrapper may itself wrap another one, so unwrapping repeats
 * until it reaches a destination Google does not own, under a fixed bound.
 */
export function simplifyStoredUrl(value) {
  let current = new URL(value);
  let unwrapped = false;

  for (let depth = 0; depth < 5; depth += 1) {
    const target = googleRedirectTarget(current) || googleAmpTarget(current);
    if (!target) break;
    current = target;
    unwrapped = true;
  }

  return unwrapped ? normaliseUrl(current.toString()) : String(value);
}
