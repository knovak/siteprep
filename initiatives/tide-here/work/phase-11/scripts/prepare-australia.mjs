import {readFile} from 'node:fs/promises';

import {importAustralianAnnualSource} from '../src/australia-importer.mjs';

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node prepare-australia.mjs <source.json>');
  process.exitCode = 2;
} else {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  console.log(JSON.stringify(importAustralianAnnualSource(source), null, 2));
}
