import test from 'node:test';
import assert from 'node:assert/strict';
import {lstatSync, mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';

import {writePrivateInventory} from '../src/private-inventory.mjs';

const WORK = new URL('../', import.meta.url).pathname;

test('the live handoff exposes a body only to the model turn and persists only safe extraction output', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'newsletter-real-harvest-'));
  const inventoryPath = join(directory, 'inventory.json');
  const storePath = join(directory, 'store.json');
  const reviewPath = join(directory, 'review.html');
  const inventory = {
    id: 'private-test',
    sources: [{
      key: 'column',
      slug: 'column',
      name: 'Column',
      match: [{type: 'from', value: 'writer@example.test'}],
      shape: 'long-form',
      lookback_days: 14,
    }],
  };
  writePrivateInventory(inventoryPath, inventory);

  const email = {
    id: 'message-1',
    payload: {
      mime_type: 'text/html',
      body: {content: '<article><h1>A real column</h1><p>MAILBOX-ONLY-SECRET argument.</p><a href="https://publisher.test/column">Read it</a></article>'},
    },
  };
  const extraction = await extractPrivately({
    entry: inventory.sources[0],
    message: {id: email.id, from: 'Writer <writer@example.test>', issue_date: '2026-08-18', shape_override: null},
    email,
    harvested_at: '2026-08-19T00:35:00.000Z',
  }, [{link_index: 0, title: 'A real column', text: 'A safe summary of the column.', story_date: '2026-08-18'}]);

  assert.match(extraction.modelContext.issue_text, /MAILBOX-ONLY-SECRET/);
  assert.equal(extraction.safe.records.length, 1);
  assert.doesNotMatch(JSON.stringify(extraction.safe), /MAILBOX-ONLY-SECRET|payload|body/);

  const finalizer = spawn(process.execPath, [
    join(WORK, 'finalize-private-harvest.mjs'),
    inventoryPath,
    storePath,
    reviewPath,
    '2026-08-05',
    '2026-08-19',
  ], {stdio: ['pipe', 'pipe', 'pipe']});
  finalizer.stdin.write(`${JSON.stringify(extraction.safe)}\n`);
  finalizer.stdin.end(`${JSON.stringify({type: 'finish', expected_issues: 1, unattributed: 0, searches: 1, reads: 1, harvested_at: '2026-08-19T00:35:00.000Z'})}\n`);
  const completed = await collect(finalizer);
  assert.equal(completed.code, 0, completed.stderr);

  assert.equal(lstatSync(storePath).mode & 0o777, 0o600);
  assert.equal(lstatSync(reviewPath).mode & 0o777, 0o600);
  assert.doesNotMatch(readFileSync(storePath, 'utf8'), /MAILBOX-ONLY-SECRET/);
  assert.doesNotMatch(readFileSync(reviewPath, 'utf8'), /MAILBOX-ONLY-SECRET/);
  assert.match(readFileSync(reviewPath, 'utf8'), /A safe summary of the column/);

  const overwrite = spawnSync(process.execPath, [
    join(WORK, 'finalize-private-harvest.mjs'), inventoryPath, storePath, reviewPath, '2026-08-05', '2026-08-19',
  ], {encoding: 'utf8'});
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /refuses to replace/);
});

async function extractPrivately(input, findings) {
  const child = spawn(process.execPath, [join(WORK, 'private-extract-message.mjs')], {stdio: ['pipe', 'pipe', 'pipe']});
  const lines = createInterface({input: child.stdout, crlfDelay: Infinity});
  const seen = [];
  child.stdin.write(`${JSON.stringify(input)}\n`);
  for await (const line of lines) {
    seen.push(JSON.parse(line));
    if (seen.length === 1) child.stdin.end(`${JSON.stringify(findings)}\n`);
  }
  const [code] = await new Promise(resolve => child.once('close', (...values) => resolve(values)));
  assert.equal(code, 0);
  assert.equal(seen.length, 2);
  return {modelContext: seen[0], safe: seen[1]};
}

async function collect(child) {
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  const code = await new Promise(resolve => child.once('close', resolve));
  return {code, stdout, stderr};
}
