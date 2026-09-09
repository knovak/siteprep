import {capturePreview, imageDataUrl} from './online-bookmarks.mjs';
import {fetchResource, webUrl} from './network.mjs';
import initSqlJs from 'sql.js/dist/sql-wasm-browser.js';
import wasm from 'sql.js/dist/sql-wasm-browser.wasm';
import schema from '../schema.sql';
import {openPersistence} from './persistence.mjs';
import {createRuntime, MAX_DATABASE_BYTES} from './runtime.mjs';

const banner = document.querySelector('#local-state');
const download = (bytes, name, type) => {
  const href = URL.createObjectURL(new Blob([bytes], {type}));
  const link = document.createElement('a'); link.href = href; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30000);
};
window.bookmarkDownload = download;
window.bookmarkReady = (async () => {
  if (!globalThis.WebAssembly) throw new Error('WebAssembly is unavailable in this browser.');
  const SQL = await initSqlJs({wasmBinary: wasm});
  const persistence = await openPersistence();
  const runtime = await createRuntime({SQL, schema, persistence, onSaved: () => { banner.textContent = 'Saved on this device · SQLite / WASM'; }});
  window.bookmarkLocalRequest = runtime.request;
  window.bookmarkRuntime = runtime;
  window.bookmarkCapturePreview = (collection, item, options) => capturePreview(runtime, collection, item, options);
  window.bookmarkPictureUrl = async (collection, item, url, signal) => runtime.attachImage(collection, item.url_key, await imageDataUrl(url, {signal}));
  window.bookmarkFetchExport = async (url, signal) => {
    const resource = await fetchResource(webUrl(url), {signal, maxBytes: 20*1024*1024});
    const json = resource.type.includes('json') || new URL(resource.url).pathname.endsWith('.json') || resource.text().trimStart().startsWith('{');
    return new File([resource.bytes], json ? 'online-bookmarks.json' : 'online-bookmarks.html', {type: json ? 'application/json' : 'text/html'});
  };
  window.bookmarkAttachImage = async (collection, item, file) => {
    if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP picture smaller than 5 MB.');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
    });
    // Decode before saving, so arbitrary bytes with a forged MIME type are rejected.
    const image = new Image(); image.src = dataUrl; await image.decode();
    await runtime.attachImage(collection, item.url_key, dataUrl);
  };
  banner.textContent = 'On this device · SQLite / WASM';
  document.querySelector('#local-backup').onclick = async () => {
    try { download(await runtime.backup(), 'bookmark-sorter-wasm.sqlite', 'application/vnd.sqlite3'); }
    catch (error) { banner.textContent = error.message; }
  };
  document.querySelector('#local-restore').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > MAX_DATABASE_BYTES) throw new Error('Choose a backup smaller than 100 MB.');
      if (!confirm('Replace all collections on this device with this database backup? Download a backup first if you want to keep the current data.')) return;
      await runtime.restore(new Uint8Array(await file.arrayBuffer()));
      location.reload();
    } catch (error) { banner.textContent = 'Restore failed: ' + error.message; }
    finally { event.target.value = ''; }
  };
  document.querySelector('#local-sample').onclick = async event => {
    event.target.disabled = true;
    try {
      const response = await runtime.request('/api/collections', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'create', name: 'WASM sample bookmarks'})});
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      const names = ['WebAssembly', 'SQLite', 'National parks', 'Modern art', 'Ocean research', 'Browser documentation', 'World maps', 'Open libraries', 'Walking routes', 'Tide research', 'Architecture', 'Photography', 'Design systems', 'Conservation', 'Space science', 'Natural history', 'Travel notes', 'Learning resources'];
      const document = {format: 'bookmark-sorter/v1', items: names.map((title, i) => ({url: 'https://example.org/sample/' + (i + 1), title, tags: [i % 2 ? 'topic:research' : 'topic:reference', 'src:sample'], note: 'Sample bookmark for trying the local sorter.', added_at: '2026-09-07T12:00:00Z'}))};
      const imported = await runtime.request('/api/import-json', {method: 'POST', headers: {'content-type': 'application/json', 'x-bookmark-collection-id': result.collection.id}, body: JSON.stringify(document)});
      if (!imported.ok) throw new Error((await imported.json()).error);
      await window.bookmarkRefresh(result.collection.id);
      banner.textContent = 'Sample collection added · Your other collections are unchanged';
    } catch (error) { banner.textContent = error.message; }
    finally { event.target.disabled = false; }
  };
  return runtime;
})();
window.bookmarkReady.catch(error => {
  banner.textContent = 'Could not open local bookmarks: ' + error.message;
  banner.setAttribute('role', 'alert');
  document.querySelector('#status').textContent = 'Your saved data has not been overwritten. Enable browser storage and WebAssembly, then reload.';
});
