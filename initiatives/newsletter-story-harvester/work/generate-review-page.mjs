#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {reviewPageHtml} from './src/review-page.mjs';

const [storeArgument, outputArgument] = process.argv.slice(2);
if (!storeArgument || !outputArgument) {
  process.stderr.write('Usage: generate-review-page.mjs <store.json> <review.html>\n');
  process.exitCode = 2;
} else {
  const storePath = resolve(storeArgument);
  const outputPath = resolve(outputArgument);
  const store = JSON.parse(readFileSync(storePath, 'utf8'));
  writeFileSync(outputPath, reviewPageHtml(store), 'utf8');
  process.stdout.write(`${outputPath}\n`);
}
