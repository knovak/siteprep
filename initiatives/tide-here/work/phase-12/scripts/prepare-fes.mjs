import {readFile, writeFile} from 'node:fs/promises';

import {prepareFesDataset} from '../src/fes-preparer.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a path`);
  return value;
}

function sourceModule(source) {
  return [
    '// Generated from the checksum-recorded FES2022b native-grid atlas.',
    '// Do not hand-edit; the extraction and preparation equality tests enforce provenance.',
    `export const fesSourceOfficial = Object.freeze(${JSON.stringify(source, null, 2)});`,
    '',
  ].join('\n');
}

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node prepare-fes.mjs <source-extract.json> [--output <prepared.json>] [--source-module <source.mjs>]');
  process.exitCode = 2;
} else {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const prepared = await prepareFesDataset(source);
  const outputPath = option('--output');
  const sourceModulePath = option('--source-module');
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(prepared, null, 2)}\n`);
  if (sourceModulePath) await writeFile(sourceModulePath, sourceModule(source));
  if (!outputPath && !sourceModulePath) console.log(JSON.stringify(prepared, null, 2));
}
