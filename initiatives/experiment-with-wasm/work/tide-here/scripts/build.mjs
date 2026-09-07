import {build} from 'esbuild';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root = fileURLToPath(new URL('..', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(root+'/data/manifest.json'));
for (const [file, expected] of Object.entries(manifest.files)) {
  const bytes = await readFile(root+'/data/'+file);
  if (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256) throw new Error(`Bundled data checksum mismatch: ${file}`);
}
const base = {absWorkingDir: root, bundle: true, write: false, minify: true, format: 'iife', platform: 'browser', target: ['chrome110','safari16.4','firefox115'], legalComments: 'inline'};
const guest = (await build({...base, entryPoints: ['src/guest.mjs'], globalName: 'TideGuest'})).outputFiles[0].text;
const virtual = (name, contents) => ({name: 'embedded-'+name, setup(api) {
  api.onResolve({filter: new RegExp('^tide:'+name+'$')}, args => ({path: args.path, namespace: 'embedded'}));
  api.onLoad({filter: /.*/, namespace: 'embedded'}, () => ({contents, loader: 'text'}));
}});
const worker = (await build({...base, entryPoints: ['src/worker.mjs'], plugins: [virtual('guest', guest)]})).outputFiles[0].text;
const application = (await build({...base, entryPoints: ['src/browser.mjs'], plugins: [virtual('worker', worker)], loader: {'.gz':'binary'}})).outputFiles[0].text;
const licences = await readFile(root+'/vendor/THIRD-PARTY-LICENSES.txt','utf8');
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let html = await readFile(root+'/src/index.html','utf8');
html = html.replace('/* STYLES */', (await readFile(root+'/src/styles.css','utf8'))+'\n'+await readFile(root+'/src/offline.css','utf8'))
  .replace('/* LICENCES */', escape(licences)).replace('/* APPLICATION */', () => application.replace(/<\/script/gi,'<\\/script'));
await mkdir(root+'/dist',{recursive:true});
await writeFile(root+'/dist/index.html', html);
await writeFile(root+'/dist/build.json',JSON.stringify({schema:'tide-here/standalone-build/v1',htmlBytes:Buffer.byteLength(html),htmlSha256:sha(html),
  runtime:'QuickJS compiled to WebAssembly via quickjs-emscripten 0.32.0',predictor:'@neaps/tide-predictor 0.11.0',
  coastalPoints:manifest.harmonics.count,places:manifest.places.count,dataFiles:manifest.files},null,2)+'\n');
console.log(`Built Tide Here standalone HTML: ${(Buffer.byteLength(html)/1e6).toFixed(1)} MB; ${manifest.harmonics.count} coastal points; ${manifest.places.count} places.`);
