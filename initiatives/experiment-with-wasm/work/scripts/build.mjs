import {build} from 'esbuild';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {renderPilePage} from '../src/pile-page.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundle = await build({absWorkingDir: root, entryPoints: ['src/browser.mjs'], bundle: true, write: false, minify: true, format: 'iife', platform: 'browser', target: ['chrome110', 'safari16.4', 'firefox115'], loader: {'.wasm': 'binary', '.sql': 'text'}});
let html = renderPilePage({isAdmin: true});
// The final script is the existing interface, which starts only after WASM and storage.
const last = html.lastIndexOf('<script>');
html = html.slice(0, last) + '<script>' + bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script') + '</script>\n' + html.slice(last).replace('<script>', '<script>\nwindow.bookmarkReady.then(() => {').replace('</script>', "}).catch(() => {});\n</script>");
html = html.replace('<meta name="viewport"', `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob: https: http:; connect-src https: http:; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">\n  <meta name="description" content="Sort your bookmarks locally with SQLite WebAssembly. No backend server or network required.">\n  <meta name="viewport"`);
await mkdir(root + '/dist', {recursive: true});
const license = await readFile(root + '/node_modules/sql.js/LICENSE', 'utf8');
html = html.replace('</head>', '<!--\nBundled sql.js license\n' + license.replaceAll('--', '- -') + '\n-->\n</head>');
await writeFile(root + '/dist/index.html', html);
await writeFile(root + '/dist/SQLJS-LICENSE.txt', await readFile(root + '/node_modules/sql.js/LICENSE'));
const wasm = await readFile(root + '/node_modules/sql.js/dist/sql-wasm-browser.wasm');
if (!WebAssembly.validate(wasm)) throw new Error('Invalid WebAssembly module');
const manifest = {format: 'wasm-bookmark-sorter-build/v1', html_bytes: Buffer.byteLength(html), html_sha256: createHash('sha256').update(html).digest('hex'), wasm_bytes: wasm.length, wasm_sha256: createHash('sha256').update(wasm).digest('hex'), sql_js_version: JSON.parse(await readFile(root + '/node_modules/sql.js/package.json', 'utf8')).version};
await writeFile(root + '/dist/build.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built standalone HTML (${manifest.html_bytes.toLocaleString()} bytes) with embedded WASM (${wasm.length.toLocaleString()} bytes).`);
