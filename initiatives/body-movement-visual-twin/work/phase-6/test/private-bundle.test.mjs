import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const phase6 = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(phase6, 'site');

execFileSync(process.execPath, [resolve(phase6, 'scripts/build-site.mjs')]);

async function filesBelow(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await filesBelow(resolve(directory, entry.name), `${path}/`));
    else result.push(path);
  }
  return result.sort();
}

test('the deployment bundle is complete, noindex, and self-contained', async () => {
  const files = await filesBelow(site);
  for (const expected of [
    'data/collection.json', 'data/movement-clips.json', 'data/muscles.json', 'data/rig-core.json',
    'index.html', 'lib/collection.mjs', 'lib/review-report.mjs', 'lib/rig-math.mjs',
    'lib/viewer-state.mjs', 'lib/visual-twin-controls.mjs', 'styles.css', 'viewer.mjs'
  ]) assert.ok(files.includes(expected), `missing ${expected}`);
  assert.equal(files.filter((file) => file.startsWith('records/')).length, 13);
  const index = await readFile(resolve(site, 'index.html'), 'utf8');
  const viewer = await readFile(resolve(site, 'viewer.mjs'), 'utf8');
  const collection = JSON.parse(await readFile(resolve(site, 'data/collection.json'), 'utf8'));
  assert.match(index, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(viewer, /\.\.\/phase-/);
  assert.equal(collection.records.length, 13);
  assert.ok(collection.records.every((entry) => /^\.\/records\/[a-z0-9-]+\.json$/.test(entry.record)));
});
