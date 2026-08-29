import {readFile} from 'node:fs/promises';

import {prepareFesDataset} from '../src/fes-preparer.mjs';

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node prepare-fes.mjs <source-extract.json>');
  process.exitCode = 2;
} else {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  console.log(JSON.stringify(await prepareFesDataset(source), null, 2));
}
