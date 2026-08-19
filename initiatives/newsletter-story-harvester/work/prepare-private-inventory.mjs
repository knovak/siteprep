#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writePrivateInventory } from './src/private-inventory.mjs';

const [output] = process.argv.slice(2);
if (!output) {
  console.error('usage: prepare-private-inventory.mjs <private-output.json> < inventory.json');
  process.exit(2);
}

try {
  const inventory = JSON.parse(readFileSync(0, 'utf8'));
  const path = resolve(output);
  writePrivateInventory(path, inventory);
  console.log(JSON.stringify({ output: path, sources: inventory.sources.map(entry => entry.key), mode: '0600' }, null, 2));
} catch (error) {
  console.error(`private inventory: ${error.message}`);
  process.exit(1);
}
