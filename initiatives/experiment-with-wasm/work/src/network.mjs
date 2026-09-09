// Browser transport shared by the two single-file bundles. No application server.
export function webUrl(value, base) {
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS URL without a username or password.');
  return url.href;
}

export async function fetchResource(url, {signal, timeout = 15000, maxBytes = 5 * 1024 * 1024, fetchImpl = globalThis.fetch} = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, {once: true});
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetchImpl(webUrl(url), {signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'});
    if (!response.ok) {
      const error = new Error(response.status === 429 ? 'The service has reached its request limit. Try later.' : `The server returned HTTP ${response.status}.`);
      error.status = response.status; throw error;
    }
    if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('The download is too large.');
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read(); if (done) break;
        size += value.length;
        if (size > maxBytes) { await reader.cancel(); throw new Error('The download is too large.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return {bytes, url: response.url || url, type: (response.headers.get('content-type') || '').split(';')[0],
      text: () => new TextDecoder().decode(bytes), json: () => JSON.parse(new TextDecoder().decode(bytes))};
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (controller.signal.aborted) throw new Error('The request timed out. Try again.');
    if (error instanceof TypeError) throw new Error('The website could not be read. It may block browser access (CORS), or the connection may be unavailable.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export function createWebCache(storage, key, limit = 40) {
  let entries = {};
  try { entries = JSON.parse(storage?.getItem(key) || '{}'); if (!entries || Array.isArray(entries) || typeof entries !== 'object') entries = {}; } catch { /* Cache is optional. */ }
  return {
    async get(id, ttl, loader, {refresh = false} = {}) {
      const cached = Object.hasOwn(entries, id) ? entries[id] : null;
      if (!refresh && cached && Number.isFinite(cached.at) && Date.now() - cached.at < ttl) return {...cached, cached: true};
      try {
        const value = await loader(), entry = {value, at: Date.now()};
        entries[id] = entry;
        entries = Object.fromEntries(Object.entries(entries).sort((a,b) => b[1].at-a[1].at).slice(0, limit));
        try { storage?.setItem(key, JSON.stringify(entries)); } catch { /* Retain an in-memory cache when storage is full. */ }
        return {...entry, cached: false};
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        if (cached) return {...cached, cached: true, stale: true, warning: error.message};
        throw error;
      }
    },
    clear() { entries = {}; try { storage?.removeItem(key); } catch { /* Optional storage. */ } }
  };
}
