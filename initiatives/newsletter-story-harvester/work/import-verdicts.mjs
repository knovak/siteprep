#!/usr/bin/env node

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {loadStore, saveStore} from './src/store.mjs';
import {importVerdictFile} from './src/verdict-import.mjs';

const [, , storeArgument, verdictArgument] = process.argv;
if (!storeArgument || !verdictArgument) {
  process.stderr.write('usage: import-verdicts.mjs <store.json> <verdicts.json>\n');
  process.exit(2);
}

const storePath = resolve(storeArgument);
const verdictPath = resolve(verdictArgument);
const store = loadStore(storePath);
const verdictFile = JSON.parse(readFileSync(verdictPath, 'utf8'));
const report = importVerdictFile(store, verdictFile);
if (!report.duplicate) saveStore(storePath, store);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
