import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {test} from 'node:test';

import {createCapturePipeline} from '../src/capture-pipeline.mjs';
import {MemoryCaptureImages} from '../src/capture-images.mjs';
import {ingestBookmarkHtml} from '../src/ingest.mjs';
import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {normaliseUrl} from '../src/url-key.mjs';

function bookmarkHtml(urls) {
  return `<!doctype NETSCAPE-Bookmark-file-1><DL><p>${urls.map((url, index) => `<DT><A HREF="${url}">Link ${index + 1}</A>`).join('')}</DL><p>`;
}

async function fixtureServer() {
  const requests = [];
  const imageBytes = {
    og: new Uint8Array(120).fill(11),
    twitter: new Uint8Array(110).fill(22),
    common: new Uint8Array(100).fill(33),
  };
  const server = createServer(async (request, response) => {
    requests.push({url: request.url, cookie: request.headers.cookie, accept: request.headers.accept});
    if (request.url === '/og') {
      response.setHeader('content-type', 'text/html');
      response.end('<title>OG page</title><meta name="twitter:image" content="/image-twitter"><meta content="/image-og" property="og:image"><meta name="description" content="OG description"><link href="/icon.png" rel="icon">');
      return;
    }
    if (request.url === '/twitter') {
      response.setHeader('content-type', 'text/html');
      response.end('<title>Twitter page</title><meta content="/image-twitter" name="twitter:image">');
      return;
    }
    if (request.url === '/js-only') {
      response.setHeader('content-type', 'text/html');
      response.end('<title>JS only</title><script>document.head.insertAdjacentHTML("beforeend", "<meta property=og:image content=/image-og>")</script>');
      return;
    }
    if (request.url?.startsWith('/duplicate/')) {
      response.setHeader('content-type', 'text/html');
      response.end('<title>Duplicate</title><meta property="og:image" content="/image-common">');
      return;
    }
    if (request.url === '/none') {
      response.setHeader('content-type', 'text/html');
      response.end('<title>No image</title><meta name="description" content="Text only">');
      return;
    }
    if (request.url === '/parked') {
      response.setHeader('content-type', 'text/html');
      response.end('<title>This domain is parked</title><p>Buy this domain today.</p>');
      return;
    }
    if (request.url === '/slow') {
      await new Promise(resolve => setTimeout(resolve, 150));
      response.setHeader('content-type', 'text/html');
      response.end('<title>Late</title>');
      return;
    }
    if (request.url === '/404') {
      response.statusCode = 404;
      response.end('gone');
      return;
    }
    const kind = request.url === '/image-og' ? 'og' : request.url === '/image-twitter' ? 'twitter' : request.url === '/image-common' ? 'common' : null;
    if (kind) {
      response.setHeader('content-type', 'image/png');
      response.end(imageBytes[kind]);
      return;
    }
    response.statusCode = 404;
    response.end('missing');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    tlsUrl: `https://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

function derivative({bytes}) {
  return {
    bytes: bytes.slice(0, 12),
    contentType: 'image/webp',
    width: 600,
    height: 360,
  };
}

function storeWith(...collections) {
  const store = new MemoryBookmarkStore();
  for (const id of collections) store.createCollection({id, name: id, owner_id: null, kind: 'personal', created_at: '2026-08-18T00:00:00Z'});
  return store;
}

test('pass 1 follows the metadata ladder anonymously and stores only a fixed derivative', async t => {
  const fixture = await fixtureServer();
  t.after(fixture.close);
  const store = storeWith('pile');
  const images = new MemoryCaptureImages();
  const pipeline = createCapturePipeline({store, imageStore: images, transformImage: derivative, timeoutMs: 100, concurrency: 1});
  const urls = [`${fixture.baseUrl}/og`, `${fixture.baseUrl}/twitter`, `${fixture.baseUrl}/js-only`];
  await pipeline.captureMany('pile', urls.map(url => ({url, url_key: normaliseUrl(url)})));

  const og = await store.getCapture(normaliseUrl(urls[0]));
  const twitter = await store.getCapture(normaliseUrl(urls[1]));
  const jsOnly = await store.getCapture(normaliseUrl(urls[2]));
  assert.equal(og.image_candidate, 'og:image');
  assert.equal(og.page_title, 'OG page');
  assert.equal(og.description, 'OG description');
  assert.equal(og.favicon_url, `${fixture.baseUrl}/icon.png`);
  assert.equal(twitter.image_candidate, 'twitter:image');
  assert.equal(jsOnly.image_ref, null, 'a script-authored meta tag is not executed or parsed as static metadata');
  assert.equal(jsOnly.state, 'pass1-gap');
  assert.ok(fixture.requests.every(request => request.cookie === undefined));
  assert.equal(fixture.requests.filter(request => request.url === '/image-og').length, 1, 'og:image wins over twitter:image');
  const stored = images.objects.get(og.image_ref);
  assert.equal(stored.body.byteLength, 12);
  assert.equal(stored.width, 600);
  assert.equal(stored.height, 360);
  assert.equal(stored.derivative, true);
});

test('pass-1 retry bypasses the cache once and marks a second closed failure as attempted', async t => {
  const fixture = await fixtureServer();
  t.after(fixture.close);
  const store = storeWith('pile');
  const images = new MemoryCaptureImages();
  const candidates = [`${fixture.baseUrl}/og`, `${fixture.baseUrl}/twitter`].map((url, index) => {
    const candidate = {url, url_key: normaliseUrl(url)};
    store.insertItem({collection_id: 'pile', url, url_key: candidate.url_key, title: `Retry ${index + 1}`, note: null, added_at: null, ingested_at: '2026-08-20T00:00:00Z', verdict: null, verdict_at: null});
    store.upsertCapture({url_key: candidate.url_key, image_ref: null, source: 'none', captured_at: '2026-08-20T00:00:00Z', image_hash: null, state: 'pass1-gap', page_title: null, description: null, favicon_url: null, error_tag: null, image_candidate: 'og:image', content_type: null, width: null, height: null, byte_size: null});
    return candidate;
  });
  assert.equal(store.listRetryableCaptureItems('pile').length, 2);
  const pipeline = createCapturePipeline({
    store,
    imageStore: images,
    transformImage: input => input.bytes[0] === 22 ? Promise.reject(new Error('closed failure')) : derivative(input),
    timeoutMs: 100,
    concurrency: 1,
  });
  const result = await pipeline.captureMany('pile', candidates, {force: true, markRetried: true});
  assert.equal(result.processed, 2);
  assert.equal((await store.getCapture(candidates[0].url_key)).state, 'pass1-ready');
  assert.equal((await store.getCapture(candidates[1].url_key)).state, 'pass1-final-gap');
  assert.equal(store.listRetryableCaptureItems('pile').length, 0);
  assert.equal(result.status.retryable, 0);
});

test('capture failures become collection-local tags and cached errors attach on later ingestion', async t => {
  const fixture = await fixtureServer();
  t.after(fixture.close);
  const store = storeWith('alpha', 'beta');
  const images = new MemoryCaptureImages();
  const pipeline = createCapturePipeline({store, imageStore: images, transformImage: derivative, timeoutMs: 100, concurrency: 1});
  const urls = [`${fixture.baseUrl}/404`, `${fixture.baseUrl}/slow`, `${fixture.baseUrl}/parked`, `${fixture.tlsUrl}/tls`];
  const html = bookmarkHtml(urls);
  await ingestBookmarkHtml({store, collectionId: 'alpha', html, source: 'test', ingestedAt: '2026-08-18', capture: null});
  await ingestBookmarkHtml({store, collectionId: 'beta', html, source: 'test', ingestedAt: '2026-08-18', capture: null});

  await pipeline.captureMany('alpha', urls.map(url => ({url, url_key: normaliseUrl(url)})));
  const alphaTags = (await store.listItems('alpha')).flatMap(item => item.tags);
  const betaBefore = (await store.listItems('beta')).flatMap(item => item.tags);
  assert.ok(alphaTags.includes('err:404'));
  assert.ok(alphaTags.includes('err:timeout'));
  assert.ok(alphaTags.includes('err:parked'));
  assert.ok(alphaTags.includes('err:tls'));
  assert.ok(!betaBefore.some(tag => tag.startsWith('err:')), 'a global capture failure does not write across collections');

  await ingestBookmarkHtml({store, collectionId: 'beta', html, source: 'test', ingestedAt: '2026-08-18', capture: pipeline});
  const betaAfter = (await store.listItems('beta')).flatMap(item => item.tags);
  assert.ok(betaAfter.includes('err:404'));
  assert.ok(betaAfter.includes('err:timeout'));
  assert.ok(betaAfter.includes('err:parked'));
  assert.ok(betaAfter.includes('err:tls'));
  assert.equal(fixture.requests.filter(request => request.url === '/404').length, 1, 'cached failures are not fetched again');
});

test('duplicate and missing images queue pass 2, which stays inert until its explicit action', async t => {
  const fixture = await fixtureServer();
  t.after(fixture.close);
  const store = storeWith('pile');
  const images = new MemoryCaptureImages();
  let vendorCalls = 0;
  const candidates = [1, 2, 3].map(index => {
    const url = `${fixture.baseUrl}/duplicate/${index}`;
    return {url, url_key: normaliseUrl(url)};
  });
  candidates.push({url: `${fixture.baseUrl}/none`, url_key: normaliseUrl(`${fixture.baseUrl}/none`)});
  for (const [index, candidate] of candidates.entries()) {
    store.insertItem({collection_id: 'pile', url: candidate.url, url_key: candidate.url_key, title: `Candidate ${index + 1}`, note: null, added_at: null, ingested_at: '2026-08-18T00:00:00Z', verdict: null, verdict_at: null});
  }
  const disabled = createCapturePipeline({store, imageStore: images, transformImage: derivative, duplicateThreshold: 3, passTwoEnabled: false, vendorCapture: async () => { vendorCalls += 1; }});
  const result = await disabled.captureMany('pile', candidates);
  assert.deepEqual(result.status.duplicate_distribution, [3]);
  assert.equal(result.status.queued, 4);
  const queue = await store.listCaptureQueue({limit: 10});
  assert.equal(queue.filter(entry => entry.reason === 'duplicate-image').length, 3);
  assert.equal(queue.filter(entry => entry.reason === 'missing-image').length, 1);
  assert.ok((await store.listItems('pile')).filter(item => item.capture?.image_ref).every(item => item.capture.displayable === false), 'duplicate metadata images are retained in the cache but hidden from the grid');
  assert.equal(vendorCalls, 0, 'capture and ordinary requests never process the screenshot queue');
  const off = await disabled.processGaps({limit: 10});
  assert.equal(off.enabled, false);
  assert.equal(vendorCalls, 0, 'the off switch prevents even the explicit action from calling a vendor');

  const enabled = createCapturePipeline({
    store,
    imageStore: images,
    transformImage: derivative,
    duplicateThreshold: 3,
    passTwoEnabled: true,
    vendorCapture: async () => {
      vendorCalls += 1;
      return {bytes: new Uint8Array(80).fill(44 + vendorCalls), contentType: 'image/png'};
    },
  });
  assert.equal(vendorCalls, 0, 'enabling the configured processor is still not an automatic trigger');
  const processed = await enabled.processGaps({limit: 2});
  assert.equal(processed.processed, 2);
  assert.equal(vendorCalls, 2);
  assert.equal(processed.status.queued, 2);
  assert.equal((await store.getCapture(queue[0].url_key)).source, 'screenshot');
});

test('capture stats and the explicit gap action stay inside the active collection', async () => {
  const store = storeWith('alpha', 'beta');
  const images = new MemoryCaptureImages();
  for (const collectionId of ['alpha', 'beta']) {
    const urlKey = `https://${collectionId}.example/gap`;
    store.insertItem({collection_id: collectionId, url: urlKey, url_key: urlKey, title: collectionId, note: null, added_at: null, ingested_at: '2026-08-19T00:00:00Z', verdict: null, verdict_at: null});
    store.upsertCapture({url_key: urlKey, image_ref: null, source: 'none', captured_at: '2026-08-19T00:00:00Z', image_hash: null, state: 'pass1-gap', page_title: null, description: null, favicon_url: null, error_tag: null, image_candidate: null, content_type: null, width: null, height: null, byte_size: null});
  }
  store.refreshCaptureQueue({duplicateThreshold: 30, at: '2026-08-19T00:00:00Z'});
  const vendorUrls = [];
  const pipeline = createCapturePipeline({
    store,
    imageStore: images,
    transformImage: derivative,
    passTwoEnabled: true,
    vendorCapture: async ({url}) => {
      vendorUrls.push(url);
      return {bytes: new Uint8Array(80).fill(44), contentType: 'image/png'};
    },
  });
  assert.equal((await pipeline.status('alpha')).total, 1);
  assert.equal((await pipeline.status('alpha')).queued, 1);
  const processed = await pipeline.processGaps({limit: 10, collectionId: 'alpha'});
  assert.equal(processed.processed, 1);
  assert.deepEqual(vendorUrls, ['https://alpha.example/gap']);
  assert.equal((await pipeline.status('alpha')).queued, 0);
  assert.equal((await pipeline.status('beta')).queued, 1);
});
