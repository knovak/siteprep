import {readFile} from 'node:fs/promises';
import {gzipSync, gunzipSync} from 'node:zlib';

import {importAustralianAnnualSource} from '../src/australia-importer.mjs';

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node prepare-australia.mjs <source.json|source.json.gz> [--module]');
  process.exitCode = 2;
} else {
  const bytes = await readFile(sourcePath);
  const source = JSON.parse(sourcePath.endsWith('.gz') ? gunzipSync(bytes) : bytes);
  const prepared = importAustralianAnnualSource(source);
  if (process.argv.includes('--module')) {
    console.log('// Generated from the checksum-recorded Bureau annual tide tables.');
    console.log('// Do not hand-edit; the importer equality test enforces reproducibility.');
    console.log("import {importAustralianAnnualSource} from '../src/australia-importer.mjs';");
    console.log('');
    console.log('const compressedSourceBase64 = [');
    const compressed = sourcePath.endsWith('.gz') ? bytes : gzipSync(bytes, {level: 9});
    const base64 = compressed.toString('base64');
    for (let index = 0; index < base64.length; index += 120) {
      console.log(`  '${base64.slice(index, index + 120)}',`);
    }
    console.log("].join('');");
    console.log('let preparedPromise;');
    console.log('');
    console.log('async function readCompressedSource() {');
    console.log('  const bytes = Uint8Array.from(atob(compressedSourceBase64), character => character.charCodeAt(0));');
    console.log("  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));");
    console.log('  return JSON.parse(await new Response(stream).text());');
    console.log('}');
    console.log('');
    console.log('export function loadAustraliaPreparedOfficial() {');
    console.log('  preparedPromise ??= readCompressedSource().then(source => Object.freeze(importAustralianAnnualSource(source)));');
    console.log('  return preparedPromise;');
    console.log('}');
  } else {
    console.log(JSON.stringify(prepared, null, 2));
  }
}
