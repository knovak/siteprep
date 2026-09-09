import {build} from 'esbuild';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync, gzipSync} from 'node:zlib';
import {importAustralianAnnualSource} from '../../../../tide-here/work/phase-11/src/australia-importer.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const australianSource = await readFile(new URL('../../../../tide-here/work/phase-11/data/bom-annual-2026.source.json.gz', import.meta.url));
const australia = importAustralianAnnualSource(JSON.parse(gunzipSync(australianSource)));
const manifest = JSON.parse(await readFile(root+'/data/manifest.json'));
const australianFile = 'australia-bom-2026.json.gz';
const australianJson = Buffer.from(JSON.stringify(australia));
// zlib versions can encode identical data differently. Refresh explicitly;
// normal builds embed the checked-in bytes, just like the other two datasets.
if (process.argv.includes('--refresh-australia')) {
  const bytes = gzipSync(australianJson, {level: 9});
  await writeFile(root+'/data/'+australianFile, bytes);
  manifest.files[australianFile] = {bytes: bytes.length, sha256: sha(bytes)};
  await writeFile(root+'/data/manifest.json', JSON.stringify(manifest,null,2)+'\n');
}
if (!manifest.files[australianFile]) throw new Error('Record the Bureau data with node scripts/build.mjs --refresh-australia.');
for (const [file, expected] of Object.entries(manifest.files)) {
  const bytes = await readFile(root+'/data/'+file);
  if (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256) throw new Error(`Bundled data checksum mismatch: ${file}`);
}
const australianBytes = await readFile(root+'/data/'+australianFile);
if (!gunzipSync(australianBytes).equals(australianJson)) throw new Error('Bundled Bureau data differs from the hosted source. Review the source update and run node scripts/build.mjs --refresh-australia.');
const base = {absWorkingDir: root, bundle: true, write: false, minify: true, format: 'iife', platform: 'browser', target: ['chrome110','safari16.4','firefox115'], legalComments: 'inline'};
const guest = (await build({...base, entryPoints: ['src/guest.mjs'], globalName: 'TideGuest'})).outputFiles[0].text;
const virtual = (name, contents) => ({name: 'embedded-'+name, setup(api) {
  api.onResolve({filter: new RegExp('^tide:'+name+'$')}, args => ({path: args.path, namespace: 'embedded-'+name}));
  api.onLoad({filter: /.*/, namespace: 'embedded-'+name}, () => ({contents, loader: 'text'}));
}});
const worker = (await build({...base, entryPoints: ['src/worker.mjs'], plugins: [virtual('guest', guest)]})).outputFiles[0].text;
const application = (await build({...base, entryPoints: ['src/browser.mjs'], plugins: [virtual('worker', worker), virtual('australia', australianBytes.toString('base64'))], loader: {'.gz':'binary'}})).outputFiles[0].text;
const licences = await readFile(root+'/vendor/THIRD-PARTY-LICENSES.txt','utf8');
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let html = await readFile(root+'/src/index.html','utf8');
html = html.replace('/* STYLES */', (await readFile(root+'/src/styles.css','utf8'))+'\n'+await readFile(root+'/src/offline.css','utf8'))
  .replace('/* LICENCES */', escape(licences)).replace('/* APPLICATION */', () => application.replace(/<\/script/gi,'<\\/script'));
await mkdir(root+'/dist',{recursive:true});
await writeFile(root+'/dist/index.html', html);
await writeFile(root+'/dist/build.json',JSON.stringify({schema:'tide-here/standalone-build/v1',htmlBytes:Buffer.byteLength(html),htmlSha256:sha(html),
  runtime:'QuickJS compiled to WebAssembly via quickjs-emscripten 0.32.0',predictor:'@neaps/tide-predictor 0.11.0',
  coastalPoints:manifest.harmonics.count,places:manifest.places.count,dataFiles:manifest.files,
  australia:{version:australia.dataset.version,year:australia.dataset.year,stations:australia.stations.length,events:australia.events.length,sourceSha256:sha(australianSource),embeddedSha256:sha(australianBytes)}},null,2)+'\n');
console.log(`Built Tide Here standalone HTML: ${(Buffer.byteLength(html)/1e6).toFixed(1)} MB; ${manifest.harmonics.count} coastal points; ${manifest.places.count} places.`);
