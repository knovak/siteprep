import assert from 'node:assert/strict';
import {chmodSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {buildPrivateSite} from '../build-private-site.mjs';
import {reviewPageHtml} from '../src/review-page.mjs';
import {gmailSearchString} from '../src/gmail-source.mjs';
const store = JSON.parse(readFileSync(new URL('../fixtures/store-fixture.json', import.meta.url)));
const inventory = JSON.parse(readFileSync(new URL('../fixtures/inventory-fixture.json', import.meta.url)));
function inputs() {
  const dir = mkdtempSync(join(tmpdir(), 'newsletter-private-build-'));
  writeFileSync(join(dir, 'store.json'), JSON.stringify(store), {mode:0o600});
  writeFileSync(join(dir, 'inventory.json'), JSON.stringify(inventory), {mode:0o600});
  return dir;
}
test('private Site build emits exactly the renderer output with owner-only permissions', () => {
  const dir = inputs();
  const file = buildPrivateSite(dir);
  const sources = inventory.sources.map(source => ({name:source.name,slug:source.slug,search:gmailSearchString(source)}));
  assert.equal(readFileSync(file, 'utf8'), reviewPageHtml(store, {sources, persistence: true}));
  const seedPath = join(dir, 'site', 'seed.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  assert.equal(seed.store_id, store.store_id);
  assert.equal(seed.stories.length, store.stories.length);
  assert.deepEqual(Object.keys(seed.stories[0]), ['id', 'verdict', 'verdict_at']);
  assert.equal(statSync(seedPath).mode & 0o777, 0o600);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  chmodSync(file, 0o644);
  buildPrivateSite(dir);
  assert.equal(statSync(file).mode & 0o777, 0o600);
});
test('missing or readable private input fails instead of substituting fixture content', () => {
  assert.throws(() => buildPrivateSite(mkdtempSync(join(tmpdir(), 'newsletter-empty-'))));
  const dir = inputs();
  chmodSync(join(dir, 'store.json'), 0o644);
  assert.throws(() => buildPrivateSite(dir), /owner-only/);
});
test('private Site build refuses a symlinked output directory', () => {
  const dir = inputs();
  symlinkSync(mkdtempSync(join(tmpdir(), 'newsletter-outside-')), join(dir, 'site'));
  assert.throws(() => buildPrivateSite(dir), /real directory/);
});
