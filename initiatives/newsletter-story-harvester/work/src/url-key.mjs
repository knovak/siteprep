// url_key - the key everything else hangs off.
//
// `story-record.md` §4 is the specification: unwrap known redirectors, then
// optionally follow one redirect, then normalise. The order matters and the
// reason is stated there - matching before unwrapping makes the cross-source
// merge fail *silently*, so the reader judges the same article three times and
// nothing in the store says why.
//
// Everything here is a total function of its input except `followOnce`, which
// is injected. That is deliberate: the unit layer of `test-plan.md` §2 covers
// this file, and a network call in it would put the most-tested part of the
// pipeline behind a timeout.

/** Query parameters stripped from every URL, whoever sent it. */
const TRACKING_PARAMS = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^mc_(cid|eid)$/i, /^_hs(enc|mi)$/i];

/**
 * The redirector table (`story-record.md` §4 step 1).
 *
 * A rule is per-sender and returns the publisher URL, or null when the target
 * is not in the URL at all. Null is not a failure - it is the case step 2
 * exists for, and the case phase 0 found Substack's ordinary links to be in.
 *
 * Ordered: the first rule whose `match` accepts the URL wins.
 */
export const REDIRECTORS = [
  {
    // Substack encodes the target in a base64url JSON payload on /redirect/2/.
    // Its *ordinary* links are the other shape, /redirect/<uuid>?j=<token>,
    // where the uuid is opaque and the token identifies the subscriber.
    name: 'substack',
    match: (u) => u.hostname === 'substack.com' && u.pathname.startsWith('/redirect/'),
    unwrap: (u) => {
      const parts = u.pathname.split('/').filter(Boolean); // ['redirect', '2', payload]
      if (parts[1] !== '2' || !parts[2]) return null;
      const decoded = decodeBase64UrlJson(parts[2]);
      return typeof decoded?.e === 'string' ? decoded.e : null;
    },
    // Everything after the path identifies the recipient. See `keepQuery` below.
    keepQuery: false
  },
  {
    // Mailchimp's click tracker carries the campaign and the recipient (`e`)
    // and nothing about the destination.
    name: 'mailchimp',
    match: (u) => u.hostname.endsWith('.list-manage.com') && u.pathname.startsWith('/track/click'),
    unwrap: () => null,
    keepQuery: false
  },
  {
    // The common shape: the target sits percent-encoded in a query parameter.
    name: 'query-param',
    match: (u) => TARGET_PARAMS.some((p) => u.searchParams.has(p)),
    unwrap: (u) => {
      const raw = TARGET_PARAMS.map((p) => u.searchParams.get(p)).find(Boolean);
      return raw && /^https?:\/\//i.test(raw) ? raw : null;
    },
    keepQuery: false
  },
  {
    // The target base64url-encoded into a path segment, as several senders do.
    name: 'base64-path',
    match: (u) => u.pathname.split('/').some(looksBase64Url),
    unwrap: (u) => {
      for (const segment of u.pathname.split('/').filter(looksBase64Url)) {
        const text = decodeBase64Url(segment);
        if (text && /^https?:\/\//i.test(text)) return text;
        const parsed = text && safeJson(text);
        if (typeof parsed?.e === 'string') return parsed.e;
        if (typeof parsed?.url === 'string') return parsed.url;
      }
      return null;
    },
    keepQuery: false
  }
];

const TARGET_PARAMS = ['url', 'u', 'target', 'redirect', 'destination'];

/**
 * Build `url` and `url_key` from a link as it appeared in an issue.
 *
 * @param {string} rawUrl
 * @param {object} [options]
 * @param {string} [options.unwrap]      inventory entry's rule name (§4); when
 *                                       given, only that rule is tried
 * @param {(url: string) => (string|null)} [options.followOnce]
 *                                       `story-record.md` §4 step 2, the single
 *                                       HEAD follow. Off unless supplied
 * @returns {{url: string, url_key: string|null, unwrapped: boolean,
 *            redirector: string|null, tags: string[]}}
 */
export function buildUrlKey(rawUrl, options = {}) {
  const parsed = safeUrl(rawUrl);
  // Not a URL we can reason about. Keep it - `story-record.md` §4's last rule
  // is that a link we cannot resolve is still a story - and say so.
  if (!parsed) {
    return { url: rawUrl, url_key: null, unwrapped: false, redirector: null, tags: ['err:unwrap'] };
  }

  const rule = pickRule(parsed, options.unwrap);
  if (!rule) {
    return { url: normalise(parsed), url_key: normalise(parsed), unwrapped: false, redirector: null, tags: [] };
  }

  const byTable = rule.unwrap(parsed);
  if (byTable) {
    const target = safeUrl(byTable);
    if (target) {
      return { url: normalise(target), url_key: normalise(target), unwrapped: true, redirector: rule.name, tags: [] };
    }
  }

  // Step 2, and only if the caller switched it on.
  if (options.followOnce) {
    const followed = safeUrl(options.followOnce(parsed.href));
    if (followed) {
      return { url: normalise(followed), url_key: normalise(followed), unwrapped: true, redirector: rule.name, tags: [] };
    }
  }

  // Unwrappable. Kept and marked, per `story-record.md` §4 - but *without its
  // query string*, which is the one place this deviates from "kept as-is".
  //
  // Phase 0 found what these query strings hold: Substack's `j` is a signed
  // blob naming the subscriber, and Mailchimp's `e` is the recipient. Either
  // would travel into `url_key`, into the store, and out through the published
  // page of §12 - which §6 says is safe precisely because nothing of the mail
  // was kept. A link that may not resolve is a smaller loss than a recipient
  // identifier on a public page, and step 2 is what recovers the link for a
  // sender where that matters.
  const stripped = rule.keepQuery === false ? withoutQuery(parsed) : parsed;
  const key = normalise(stripped);
  return { url: key, url_key: key, unwrapped: false, redirector: rule.name, tags: ['err:unwrap'] };
}

function pickRule(parsed, named) {
  if (named) return REDIRECTORS.find((r) => r.name === named) || null;
  return REDIRECTORS.find((r) => r.match(parsed)) || null;
}

/**
 * `story-record.md` §4 step 3. Lowercase scheme and host, drop the fragment,
 * strip the tracking parameters, drop a trailing slash on an empty path.
 *
 * **Nothing else is rewritten.** A differing query string is a differing URL,
 * because query strings carry meaning often enough that being clever loses
 * pages - which is why this does not sort, dedupe or drop unknown parameters.
 */
export function normalise(url) {
  const u = new URL(url.href ?? url);
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  if (isDefaultPort(u)) u.port = '';

  for (const name of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((p) => p.test(name))) u.searchParams.delete(name);
  }
  // An empty query is no query, so two links that differed only by a tracking
  // parameter collapse to one key rather than to `?` and ``.
  if ([...u.searchParams.keys()].length === 0) u.search = '';

  let out = u.toString();
  if (u.pathname === '/' && !u.search) out = out.replace(/\/$/, '');
  return out;
}

function withoutQuery(u) {
  const copy = new URL(u.href);
  copy.search = '';
  copy.hash = '';
  return copy;
}

function isDefaultPort(u) {
  return (u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443');
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksBase64Url(segment) {
  return segment.length >= 16 && /^[A-Za-z0-9_-]+=*$/.test(segment);
}

function decodeBase64Url(segment) {
  try {
    return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function decodeBase64UrlJson(segment) {
  const text = decodeBase64Url(segment);
  return text ? safeJson(text) : null;
}
