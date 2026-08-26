#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {reviewPageHtml} from './src/review-page.mjs';
import {gmailSearchString} from './src/gmail-source.mjs';

const args = process.argv.slice(2);
const inventoryAt = args.indexOf('--inventory');
const inventoryArgument = inventoryAt === -1 ? null : args[inventoryAt + 1];
const positional = inventoryAt === -1 ? args : [...args.slice(0, inventoryAt), ...args.slice(inventoryAt + 2)];
const [storeArgument, outputArgument] = positional;
if (!storeArgument || !outputArgument || (inventoryAt !== -1 && !inventoryArgument)) {
  process.stderr.write('Usage: generate-review-page.mjs <store.json> <review.html> [--inventory <inventory.json>]\n');
  process.exitCode = 2;
} else {
  const storePath = resolve(storeArgument);
  const outputPath = resolve(outputArgument);
  const store = JSON.parse(readFileSync(storePath, 'utf8'));
  const inventory = inventoryArgument
    ? JSON.parse(readFileSync(resolve(inventoryArgument), 'utf8'))
    : null;
  const sources = (inventory?.sources || []).map((source) => ({
    name: source.name,
    slug: source.slug,
    search: gmailSearchString(source)
  }));
  writeFileSync(outputPath, reviewPageHtml(store, {sources}), 'utf8');
  process.stdout.write(`${outputPath}\n`);
}
