#!/usr/bin/env node

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const phase6 = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = resolve(phase6, '..');
const site = resolve(phase6, 'site');

const copies = [
  ['phase-3/index.html', 'index.html'],
  ['phase-3/styles.css', 'styles.css'],
  ['phase-3/data/movement-clips.json', 'data/movement-clips.json'],
  ['phase-2/data/rig-core.json', 'data/rig-core.json'],
  ['phase-2/data/muscles.json', 'data/muscles.json'],
  ['phase-1/fixtures/feldenkrais.json', 'records/feldenkrais.json'],
  ['phase-1/fixtures/yoga.json', 'records/yoga.json'],
  ['phase-1/fixtures/alexander.json', 'records/alexander.json'],
  ['phase-0/scripts/rig-math.mjs', 'lib/rig-math.mjs'],
  ['phase-2/src/viewer-state.mjs', 'lib/viewer-state.mjs'],
  ['phase-3/src/collection.mjs', 'lib/collection.mjs'],
  ['phase-4/src/visual-twin-controls.mjs', 'lib/visual-twin-controls.mjs'],
  ['phase-5/src/review-report.mjs', 'lib/review-report.mjs']
];

await rm(site, { recursive: true, force: true });
for (const [source, destination] of copies) {
  const target = resolve(site, destination);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(work, source), target);
}

const collection = JSON.parse(await readFile(resolve(work, 'phase-3/data/collection.json'), 'utf8'));
for (const entry of collection.records) entry.record = `./records/${entry.tradition}.json`;
await writeFile(resolve(site, 'data/collection.json'), `${JSON.stringify(collection, null, 2)}\n`);

const viewerSource = await readFile(resolve(work, 'phase-3/viewer.mjs'), 'utf8');
const replacements = new Map([
  ["../phase-0/scripts/rig-math.mjs", './lib/rig-math.mjs'],
  ["./src/collection.mjs", './lib/collection.mjs'],
  ["../phase-4/src/visual-twin-controls.mjs", './lib/visual-twin-controls.mjs'],
  ["../phase-5/src/review-report.mjs", './lib/review-report.mjs'],
  ["../phase-2/src/viewer-state.mjs", './lib/viewer-state.mjs'],
  ["../phase-2/data/rig-core.json", './data/rig-core.json'],
  ["../phase-2/data/muscles.json", './data/muscles.json']
]);
let viewer = viewerSource;
for (const [before, after] of replacements) {
  if (!viewer.includes(before)) throw new Error(`Expected Phase 3 reference is missing: ${before}`);
  viewer = viewer.replaceAll(before, after);
}
if (viewer.includes('../phase-')) throw new Error('The deployable viewer still reaches outside its static root.');
await writeFile(resolve(site, 'viewer.mjs'), viewer);

console.log(`Built private static bundle at ${site}`);
