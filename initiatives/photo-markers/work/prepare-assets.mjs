// Recreate local comparison assets from the npm lock and pinned font commit.
import { mkdir, copyFile, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('.', import.meta.url)));
const hash = b => createHash('sha256').update(b).digest('hex');
const fontCommit = 'ffebf8c1ee449e544955a7e813c54f9b73848eac';
await mkdir('assets/pyodide', { recursive: true });
for (const name of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  await copyFile(`node_modules/pyodide/${name}`, `assets/pyodide/${name}`);
}
const lock = JSON.parse(await readFile('assets/pyodide/pyodide-lock.json'));
const packages = new Set();
function include(name) { if (packages.has(name)) return; packages.add(name); for (const dep of lock.packages[name].depends) include(dep); }
include('pillow');
const sources = {};
async function download(url, path, expected) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (expected && hash(bytes) !== expected) throw new Error(`Hash mismatch: ${path}`);
  await writeFile(path, bytes); sources[path] = url;
}
for (const name of packages) {
  const p = lock.packages[name];
  await download(`https://cdn.jsdelivr.net/pyodide/v314.0.7/full/${p.file_name}`, `assets/pyodide/${p.file_name}`, p.sha256);
}
await cp('node_modules/@jsquash/jpeg', 'assets/jpeg', { recursive: true });
await copyFile('node_modules/exifr/dist/full.esm.mjs', 'assets/exifr.mjs');
await copyFile('node_modules/opentype.js/dist/opentype.mjs', 'assets/opentype.mjs');
await copyFile('node_modules/fflate/esm/browser.js', 'assets/fflate.mjs');
await download(`https://raw.githubusercontent.com/notofonts/noto-fonts/${fontCommit}/hinted/ttf/NotoSans/NotoSans-Bold.ttf`, 'assets/NotoSans-Bold.ttf', 'c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a');
await download(`https://raw.githubusercontent.com/notofonts/noto-fonts/${fontCommit}/LICENSE`, 'assets/Noto-LICENSE', '0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb');
const files = [];
async function inventory(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${f.name}`;
    if (f.isDirectory()) await inventory(path);
    else { const bytes = await readFile(path); files.push({ path, bytes: bytes.length, sha256: hash(bytes), source: sources[path] }); }
  }
}
await inventory('assets');
await writeFile('asset-manifest.json', JSON.stringify({ fontCommit, pyodide: '314.0.7', pillow: lock.packages.pillow.version, files }, null, 2) + '\n');
console.log(`Prepared ${files.length} local assets; Pillow ${lock.packages.pillow.version}`);
