#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMovementSet } from '../src/validate-movement.mjs';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = resolve(phaseDirectory, 'fixtures');
const manifest = JSON.parse(await readFile(resolve(phaseDirectory, '../phase-0/assets/original/reference-rig.json'), 'utf8'));
const fixtureNames = (await readdir(fixtureDirectory)).filter((name) => name.endsWith('.json')).sort();
const fixtures = await Promise.all(fixtureNames.map(async (name) => JSON.parse(await readFile(resolve(fixtureDirectory, name), 'utf8'))));
const result = validateMovementSet(fixtures, manifest);

if (!result.ok) {
  process.stderr.write(`${result.errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${fixtures.length} movement fixtures: ${fixtureNames.join(', ')}\n`);
}
