import {sha256Hex} from './capture-images.mjs';

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_HTML_BYTES = 2 * 1024 * 1024;
const DEFAULT_DUPLICATE_THRESHOLD = 30;
const DERIVATIVE_SPEC = Object.freeze({maxWidth: 600, maxHeight: 360, format: 'image/webp', quality: 0.82});

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function attributes(tag) {
  const result = new Map();
  const matcher = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(matcher)) {
    result.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return result;
}

function resolveUrl(value, pageUrl) {
  if (!value) return null;
  try { return new URL(value, pageUrl).href; } catch { return null; }
}

export function parsePageMetadata(html, pageUrl) {
  const staticHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  const metadata = {
    page_title: null,
    description: null,
    favicon_url: null,
    image_url: null,
    image_candidate: null,
  };
  const title = staticHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  if (title) metadata.page_title = decodeHtml(title.replace(/<[^>]+>/g, '').trim()) || null;

  const images = new Map();
  for (const match of staticHtml.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.get('property') || attrs.get('name') || '').toLowerCase();
    const content = attrs.get('content')?.trim();
    if (!content) continue;
    if (key === 'og:image' || key === 'twitter:image' || key === 'twitter:image:src') images.set(key, content);
    if (!metadata.description && (key === 'description' || key === 'og:description')) metadata.description = content;
  }

  const ogImage = images.get('og:image');
  const twitterImage = images.get('twitter:image') || images.get('twitter:image:src');
  if (ogImage || twitterImage) {
    metadata.image_candidate = ogImage ? 'og:image' : 'twitter:image';
    metadata.image_url = resolveUrl(ogImage || twitterImage, pageUrl);
  }

  for (const match of staticHtml.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const rel = (attrs.get('rel') || '').toLowerCase().split(/\s+/);
    if (rel.some(value => value === 'icon' || value === 'shortcut') && attrs.get('href')) {
      metadata.favicon_url = resolveUrl(attrs.get('href'), pageUrl);
      break;
    }
  }
  if (!metadata.favicon_url) metadata.favicon_url = resolveUrl('/favicon.ico', pageUrl);
  return metadata;
}

function anonymousRequest(signal, accept) {
  return {
    method: 'GET',
    redirect: 'follow',
    credentials: 'omit',
    signal,
    headers: {
      accept,
      'user-agent': 'BookmarkSorterCapture/1.0 (+anonymous metadata fetch)',
    },
  };
}

function failureTag(error) {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'err:timeout';
  const detail = `${error?.code || ''} ${error?.cause?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (/cert|tls|ssl|handshake|econnreset|eproto|wrong version|invalid protocol/.test(detail)) return 'err:tls';
  return 'err:fetch';
}

function statusTag(status) {
  if (status === 404 || status === 410) return `err:${status}`;
  return status >= 400 ? `err:http-${status}` : null;
}

function parked(html) {
  const sample = html.slice(0, 100_000);
  return /(?:domain (?:is )?for sale|buy this domain|this domain is parked|sedoparking|parkingcrew)/i.test(sample);
}

async function boundedBytes(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
  return bytes;
}

async function withTimeout(timeoutMs, operation) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Capture timed out', 'TimeoutError')), timeoutMs);
  try { return await operation(controller.signal); } finally { clearTimeout(timer); }
}

function captureRecord(urlKey, at, changes = {}) {
  return {
    url_key: urlKey,
    image_ref: null,
    source: 'none',
    captured_at: at,
    image_hash: null,
    state: 'pass1-gap',
    page_title: null,
    description: null,
    favicon_url: null,
    error_tag: null,
    image_candidate: null,
    content_type: null,
    width: null,
    height: null,
    byte_size: null,
    ...changes,
  };
}

export function createCapturePipeline({
  store,
  imageStore,
  transformImage,
  fetchFn = fetch,
  now = () => new Date(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxHtmlBytes = DEFAULT_MAX_HTML_BYTES,
  duplicateThreshold = DEFAULT_DUPLICATE_THRESHOLD,
  concurrency = 8,
  passTwoEnabled = false,
  vendorCapture = null,
} = {}) {
  if (!store) throw new TypeError('A bookmark store is required');
  if (!imageStore?.putDerivative || !imageStore?.get) throw new TypeError('A capture image store is required');

  async function saveFailure(collectionId, urlKey, tag, metadata = {}) {
    const record = captureRecord(urlKey, now().toISOString(), {
      ...metadata,
      error_tag: tag,
      state: 'pass1-error',
    });
    await store.upsertCapture(record);
    await store.applyCaptureError(collectionId, urlKey, tag);
    return record;
  }

  async function passOne(collectionId, {url, url_key: urlKey}, {force = false} = {}) {
    const cached = await store.getCapture(urlKey);
    if (cached && !force) {
      if (cached.error_tag) await store.applyCaptureError(collectionId, urlKey, cached.error_tag);
      return {...cached, cached: true};
    }

    let response;
    try {
      response = await withTimeout(timeoutMs, signal => fetchFn(url, anonymousRequest(signal, 'text/html,application/xhtml+xml;q=0.9')));
    } catch (error) {
      return saveFailure(collectionId, urlKey, failureTag(error));
    }
    if (!response.ok) return saveFailure(collectionId, urlKey, statusTag(response.status));

    let html;
    try {
      html = new TextDecoder().decode(await boundedBytes(response, maxHtmlBytes));
    } catch {
      return saveFailure(collectionId, urlKey, 'err:oversize');
    }
    const metadata = parsePageMetadata(html, response.url || url);
    if (parked(html)) return saveFailure(collectionId, urlKey, 'err:parked', metadata);
    if (!metadata.image_url) {
      const record = captureRecord(urlKey, now().toISOString(), metadata);
      await store.upsertCapture(record);
      return record;
    }

    let imageStage = 'fetch';
    try {
      const imageResponse = await withTimeout(timeoutMs, signal => fetchFn(metadata.image_url, anonymousRequest(signal, 'image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1')));
      if (!imageResponse.ok) throw new Error(`Image returned ${imageResponse.status}`);
      const original = await boundedBytes(imageResponse, 20 * 1024 * 1024);
      if (typeof transformImage !== 'function') throw new Error('No derivative transformer is configured');
      imageStage = 'transform';
      const derivative = await transformImage({
        bytes: original,
        contentType: imageResponse.headers.get('content-type') || 'application/octet-stream',
        sourceUrl: metadata.image_url,
        ...DERIVATIVE_SPEC,
      });
      if (!derivative?.bytes || !derivative?.contentType || !derivative?.width || !derivative?.height) {
        throw new Error('The derivative transformer returned an incomplete image');
      }
      if (derivative.width > DERIVATIVE_SPEC.maxWidth || derivative.height > DERIVATIVE_SPEC.maxHeight) {
        throw new Error('The derivative exceeds the fixed capture size');
      }
      const imageHash = await sha256Hex(derivative.bytes);
      imageStage = 'store';
      const imageRef = await imageStore.putDerivative({
        urlKey,
        bytes: derivative.bytes,
        contentType: derivative.contentType,
        width: derivative.width,
        height: derivative.height,
        imageHash,
      });
      const record = captureRecord(urlKey, now().toISOString(), {
        ...metadata,
        image_ref: imageRef,
        source: 'og',
        image_hash: imageHash,
        state: 'pass1-ready',
        content_type: derivative.contentType,
        width: derivative.width,
        height: derivative.height,
        byte_size: derivative.bytes.byteLength,
      });
      await store.upsertCapture(record);
      return record;
    } catch (error) {
      console.warn('Bookmark capture image stage failed', imageStage, error?.name || 'Error', error?.message || 'Unknown error');
      const record = captureRecord(urlKey, now().toISOString(), metadata);
      await store.upsertCapture(record);
      return record;
    }
  }

  async function captureMany(collectionId, candidates, {force = false, markRetried = false} = {}) {
    const unique = [...new Map(candidates.map(candidate => [candidate.url_key, candidate])).values()];
    const results = new Array(unique.length);
    let cursor = 0;
    async function worker() {
      while (cursor < unique.length) {
        const index = cursor++;
        results[index] = await passOne(collectionId, unique[index], {force});
      }
    }
    await Promise.all(Array.from({length: Math.min(concurrency, unique.length)}, worker));
    if (markRetried) {
      for (const [index, record] of results.entries()) {
        if (record?.image_ref || record?.state !== 'pass1-gap') continue;
        results[index] = await store.upsertCapture({...record, state: 'pass1-final-gap'});
      }
    }
    await store.refreshCaptureQueue({duplicateThreshold, at: now().toISOString()});
    return {processed: unique.length, captures: results, status: await store.captureStats(collectionId)};
  }

  async function processGaps({limit = 20, collectionId = null} = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    if (!passTwoEnabled) return {enabled: false, processed: 0, status: await store.captureStats(collectionId)};
    if (typeof vendorCapture !== 'function') throw new Error('Pass 2 is enabled without a server-side vendor adapter');
    let processed = 0;
    const entries = await store.listCaptureQueue({limit: safeLimit, collectionId});
    for (const entry of entries) {
      await store.markCaptureQueue(entry.url_key, {state: 'running', at: now().toISOString()});
      try {
        const original = await vendorCapture({url: entry.url_key, urlKey: entry.url_key});
        const derivative = await transformImage({...original, ...DERIVATIVE_SPEC});
        const imageHash = await sha256Hex(derivative.bytes);
        const imageRef = await imageStore.putDerivative({
          urlKey: entry.url_key,
          bytes: derivative.bytes,
          contentType: derivative.contentType,
          width: derivative.width,
          height: derivative.height,
          imageHash,
        });
        const current = await store.getCapture(entry.url_key);
        await store.upsertCapture({...current, image_ref: imageRef, source: 'screenshot', captured_at: now().toISOString(), image_hash: imageHash, state: 'screenshot-ready', content_type: derivative.contentType, width: derivative.width, height: derivative.height, byte_size: derivative.bytes.byteLength});
        await store.markCaptureQueue(entry.url_key, {state: 'complete', at: now().toISOString(), error: null});
        processed += 1;
      } catch (error) {
        await store.markCaptureQueue(entry.url_key, {state: 'failed', at: now().toISOString(), error: error.message});
      }
    }
    return {enabled: true, processed, status: await store.captureStats(collectionId)};
  }

  async function image(urlKey) {
    const capture = await store.getCapture(urlKey);
    if (!capture?.image_ref) return null;
    return imageStore.get(capture.image_ref);
  }

  return {
    captureMany,
    image,
    passOne,
    processGaps,
    status: collectionId => store.captureStats(collectionId),
    settings: {duplicateThreshold, passTwoEnabled, derivative: DERIVATIVE_SPEC},
  };
}

export {DEFAULT_DUPLICATE_THRESHOLD, DERIVATIVE_SPEC};
