import {fetchResource, webUrl} from './network.mjs';

export function metadataFromHtml(text, url) {
  // The detached document is never inserted into the page. Scripts never run.
  const template = document.createElement('template'); template.innerHTML = text;
  const doc = template.content;
  const meta = name => [...doc.querySelectorAll('meta')].find(m => (m.getAttribute('property') || m.getAttribute('name') || '').toLowerCase() === name)?.getAttribute('content') || '';
  let image;
  try { image = webUrl(meta('og:image') || meta('twitter:image'), url); } catch { /* No usable image. */ }
  // An empty image field must not turn into the page URL.
  if (!meta('og:image') && !meta('twitter:image')) image = null;
  return {title: (meta('og:title') || doc.querySelector('title')?.textContent || '').slice(0, 1000), description: (meta('og:description') || meta('description')).slice(0, 4000), image, url};
}

export async function previewMetadata(url, {mode = 'direct', signal} = {}) {
  url = webUrl(url);
  if (mode === 'direct') {
    const response = await fetchResource(url, {signal, maxBytes: 3*1024*1024});
    if (response.type.startsWith('image/')) return {title: '', description: '', image: response.url, url: response.url};
    if (!['text/html','application/xhtml+xml',''].includes(response.type)) throw new Error('This URL does not return a web page or picture.');
    return metadataFromHtml(response.text(), response.url);
  }
  const target = new URL(url);
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(target.hostname) || !target.hostname.includes('.') || target.hostname.endsWith('.local')) throw new Error('Use Direct website for local addresses.');
  const endpoint = new URL('https://api.microlink.io/');
  endpoint.searchParams.set('url', url);
  if (mode === 'screenshot') endpoint.searchParams.set('screenshot', 'true');
  const result = (await fetchResource(endpoint, {signal, timeout: 60000})).json();
  if (result.status !== 'success' || !result.data) throw new Error('Microlink could not produce a preview for this website.');
  return {title: String(result.data.title || '').slice(0,1000), description: String(result.data.description || '').slice(0,4000),
    image: mode === 'screenshot' ? result.data.screenshot?.url : result.data.image?.url,
    url: result.data.url || url};
}

export async function imageDataUrl(url, {signal} = {}) {
  const resource = await fetchResource(webUrl(url), {signal});
  if (!resource.type.startsWith('image/')) throw new Error('The picture URL did not return an image.');
  // Decode and rasterize to bound dimensions and accept common web image formats.
  const blobUrl = URL.createObjectURL(new Blob([resource.bytes], {type: resource.type}));
  try {
    const image = new Image(); image.src = blobUrl; await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('The picture dimensions are too large.');
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth*scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(blobUrl); }
}

export async function capturePreview(runtime, collectionId, item, options) {
  const metadata = await previewMetadata(item.url, options);
  let dataUrl = null, warning = '';
  if (metadata.image) {
    try { dataUrl = await imageDataUrl(metadata.image, options); }
    catch (error) { if (error.name === 'AbortError') throw error; warning = 'Text saved; the picture could not be downloaded. ' + error.message; }
  } else warning = 'Text saved; this website did not provide a picture.';
  if (options.signal?.aborted) throw new DOMException('Cancelled','AbortError');
  await runtime.savePreview(collectionId, item.url_key, {...metadata, dataUrl, mode: options.mode});
  return warning || 'Preview saved on this device.';
}
