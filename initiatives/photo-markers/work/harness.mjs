import * as exifr from './assets/exifr.mjs';
import { zipSync, unzipSync, strToU8 } from './assets/fflate.mjs';
import { fixtures } from './fixtures.mjs';
let worker, sequence = 0;
const pending = new Map();
export function stop() {
  worker?.terminate(); worker = null;
  for (const p of pending.values()) p.reject(new Error('Worker cancelled; frozen settings retained'));
  pending.clear();
}
function request(message, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Worker timeout')); stop(); }, timeout);
    pending.set(id, { resolve: x => { clearTimeout(timer); resolve(x); }, reject: e => { clearTimeout(timer); reject(e); } });
    worker.postMessage({ ...message, id });
  });
}
export async function start(route, timeout) {
  stop(); worker = new Worker('./worker.mjs', { type: 'module' });
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id); if (!p) return;
    pending.delete(data.id); if (data.error) p.reject(new Error(data.error)); else p.resolve(data);
  };
  worker.onerror = e => { const error = new Error(e.message); for (const p of pending.values()) p.reject(error); pending.clear(); worker?.terminate(); worker = null; };
  const began = performance.now();
  const reply = await request({ type: 'init', route }, timeout);
  return { ms: performance.now()-began, ...reply.result };
}
export async function verify(bytes, s) {
  const tags = await exifr.parse(bytes, { translateValues: false, reviveValues: false, sanitize: false, mergeOutput: true });
  for (const name of ['ModifyDate', 'DateTimeOriginal', 'CreateDate']) if (tags?.[name] !== s.local) throw new Error(`Metadata mismatch: ${name}: ${tags?.[name]}`);
  for (const name of ['OffsetTime', 'OffsetTimeOriginal', 'OffsetTimeDigitized']) if (tags?.[name] !== s.offset) throw new Error(`Metadata mismatch: ${name}: ${tags?.[name]}`);
  if (tags.Software !== 'Photo markers comparison') throw new Error('Software tag mismatch');
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
  try { if (bitmap.width !== s.size || bitmap.height !== s.size) throw new Error('Wrong dimensions'); }
  finally { bitmap.close(); }
  return tags;
}
async function digest(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join(''); }
export async function single(settings = fixtures[0]) {
  const began = performance.now();
  const { bytes, resources } = await request({ type: 'render', settings });
  const tags = await verify(bytes, settings);
  return { ms: performance.now()-began, bytes, tags, resources, sha256: await digest(bytes) };
}
export async function batch() {
  const began = performance.now(), files = {}, manifest = [];
  for (const fixture of fixtures) {
    const result = await single(fixture), filename = `marker-${fixture.id}.jpg`;
    files[filename] = result.bytes;
    manifest.push({ filename, sha256: result.sha256, settings: fixture, status: 'verified' });
    document.querySelector('[role=status]').textContent = `Verified ${manifest.length} of 10`;
  }
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  const zipped = zipSync(files, { level: 0 });
  const ms = performance.now()-began;
  const extracted = unzipSync(zipped);
  for (const row of manifest) if (await digest(extracted[row.filename]) !== row.sha256) throw new Error('ZIP altered JPEG bytes');
  return { ms, zipped, manifest };
}
export async function failureAndRetry(route) {
  const frozen = structuredClone(fixtures[9]);
  const active = request({ type: 'hang' }).then(() => false, () => true);
  stop(); const cancelled = await active;
  await start(route); const result = await single(frozen);
  let missingGlyphRejected = false;
  try { await single({ ...frozen, title: 'Missing 🦄' }); } catch (e) { missingGlyphRejected = /Missing font glyph/.test(e.message); }
  let corruptedRejected = false;
  const corrupt = result.bytes.slice();
  const text = new TextDecoder('latin1').decode(corrupt), at = text.indexOf(frozen.local);
  if (at < 0) throw new Error('Corruption fixture timestamp not found');
  corrupt[at] = 57;
  try { await verify(corrupt, frozen); } catch { corruptedRejected = true; }
  if (!cancelled || !missingGlyphRejected || !corruptedRejected) throw new Error('Failure probe did not fail closed');
  return { cancelled, retrySha256: result.sha256, timestamp: result.tags.DateTimeOriginal, missingGlyphRejected, corruptedRejected };
}
let downloadUrl;
export function offer(bytes, name) {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(new Blob([bytes]));
  const link = document.querySelector('#download'); link.href = downloadUrl; link.download = name; link.hidden = false;
}
window.comparison = { start, stop, single, batch, failureAndRetry, fixtures };
document.querySelector('#run').onclick = async () => {
  const status = document.querySelector('[role=status]'), button = document.querySelector('#run'); button.disabled = true;
  try {
    status.textContent = 'Preparing local runtime…';
    const cold = await start(document.querySelector('#route').value);
    status.textContent = `Ready in ${(cold.ms/1000).toFixed(2)} seconds. Generating ten markers…`;
    const result = await batch(); offer(result.zipped, 'photo-markers-comparison.zip');
    status.textContent = `Verified ten JPEGs and ZIP in ${(result.ms/1000).toFixed(2)} seconds. Download is ready.`;
  } catch (e) { status.textContent = `Failed: ${e.message}. Retry preserves the fixed fixture settings.`; }
  finally { button.disabled = false; }
};
document.querySelector('#cancel').onclick = () => { stop(); document.querySelector('[role=status]').textContent = 'Cancelled. Retry uses the same frozen fixtures.'; };
