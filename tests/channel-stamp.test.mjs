/**
 * The channel stamp: the label the build adds to the entry page of each copy
 * of a demo that has a beta.
 *
 * Run with `node --test tests/channel-stamp.test.mjs`, or via
 * `scripts/build_tests.sh` as part of `npm run build`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import {
  stampHtml, stripStamp, readStamp, stampText, STAMP_START, STAMP_END
} from '../scripts/channel_stamp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'channel_stamp.mjs');
const PAGE = '<!doctype html>\n<html><head><title>Demo</title></head>\n'
  + '<body>\n<div id="attribution">Credit</div>\n<script>boot();</script>\n</body>\n</html>\n';

test('the label names the channel and the date it last changed', () => {
  assert.equal(stampText('beta', '2026-11-11'), 'Beta · changed 2026-11-11');
  assert.equal(stampText('released', '2026-07-20'), 'Released · changed 2026-07-20');
});

test('an unknown date leaves the channel alone rather than inventing one', () => {
  assert.equal(stampText('beta', null), 'Beta');
  const stamped = stampHtml(PAGE, { channel: 'beta' }).toString('utf8');
  assert.match(stamped, />Beta<\/span>/);
  assert.doesNotMatch(stamped, /data-changed/);
});

test('removing the stamp gives back the page byte for byte', () => {
  for (const options of [
    { channel: 'beta', changed: '2026-11-11', anchor: '#attribution' },
    { channel: 'released', changed: '2026-07-20' },
    { channel: 'beta' }
  ]) {
    const stamped = stampHtml(PAGE, options);
    assert.notEqual(stamped.toString('utf8'), PAGE);
    assert.equal(stripStamp(stamped).toString('utf8'), PAGE);
  }
});

test('bytes outside the stamp are untouched, whatever the encoding', () => {
  // Not valid UTF-8: a page in another encoding must still round-trip.
  const page = Buffer.concat([
    Buffer.from('<html><body>caf', 'latin1'), Buffer.from([0xe9, 0xff]),
    Buffer.from('</body></html>', 'latin1')
  ]);
  const stamped = stampHtml(page, { channel: 'beta', changed: '2026-11-11' });
  assert.ok(stripStamp(stamped).equals(page));
});

test('the stamp goes immediately before the last </body>, after every script', () => {
  const stamped = stampHtml(PAGE, { channel: 'beta', changed: '2026-11-11' }).toString('utf8');
  assert.ok(stamped.indexOf(STAMP_START) > stamped.indexOf('<script>boot();</script>'));
  assert.ok(stamped.endsWith(`${STAMP_END}\n</body>\n</html>\n`));

  // A page that mentions </body> inside a script is stamped at the real one.
  const tricky = '<html><body><script>var s="</body>";</script></BODY></html>';
  const out = stampHtml(tricky, { channel: 'released' }).toString('utf8');
  assert.ok(out.endsWith(`${STAMP_END}\n</BODY></html>`));
  assert.equal(stripStamp(out).toString('utf8'), tricky);
});

test('the stamp loads nothing and is plain ASCII', () => {
  const stamped = stampHtml(PAGE, { channel: 'beta', changed: '2026-11-11', anchor: '#attribution' })
    .toString('utf8');
  const block = stamped.slice(stamped.indexOf(STAMP_START), stamped.indexOf(STAMP_END));
  assert.doesNotMatch(block, /\bsrc=|\bhref=|https?:|fetch\(|import /);
  assert.ok(/^[\x00-\x7f]*$/.test(block), 'the block is ASCII, so the page encoding cannot garble it');
});

test('an anchor moves the label into that element; without one it stays fixed', () => {
  const anchored = stampHtml(PAGE, { channel: 'beta', anchor: '#attribution' }).toString('utf8');
  assert.match(anchored, /querySelector\("#attribution"\)/);

  const fixed = stampHtml(PAGE, { channel: 'beta' }).toString('utf8');
  assert.doesNotMatch(fixed.slice(fixed.indexOf(STAMP_START)), /<script>/);
  assert.match(fixed, /position:fixed/);
  assert.match(fixed, /pointer-events:none/);
});

test('an anchor that is more than one id or class is refused', () => {
  for (const anchor of ['div', '#a b', '#a");alert(1);("', 'body > *']) {
    assert.throws(() => stampHtml(PAGE, { channel: 'beta', anchor }), /stamp anchor/);
  }
});

test('a page is stamped once, and only with a known channel and a real date', () => {
  const stamped = stampHtml(PAGE, { channel: 'beta' });
  assert.throws(() => stampHtml(stamped, { channel: 'released' }), /already has a channel stamp/);
  assert.throws(() => stampHtml(PAGE, { channel: 'test' }), /unknown channel/);
  assert.throws(() => stampHtml(PAGE, { channel: 'beta', changed: 'yesterday' }), /YYYY-MM-DD/);
  assert.throws(() => stampHtml('<p>no body tag</p>', { channel: 'beta' }), /no <\/body>/);
});

test('a page without a stamp reads as unstamped and strips to itself', () => {
  assert.equal(readStamp(PAGE), null);
  assert.equal(stripStamp(PAGE).toString('utf8'), PAGE);
});

test('the command line applies, reads and strips', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'channel-stamp-')), 'index.html');
  writeFileSync(file, PAGE);

  execFileSync('node', [SCRIPT, 'apply', file, 'beta', '--changed', '2026-11-11', '--anchor', '#attribution']);
  assert.deepEqual(readStamp(readFileSync(file)), { channel: 'beta', changed: '2026-11-11' });
  assert.equal(execFileSync('node', [SCRIPT, 'read', file], { encoding: 'utf8' }), 'beta\t2026-11-11\n');
  assert.equal(execFileSync('node', [SCRIPT, 'strip', file], { encoding: 'utf8' }), PAGE);

  // Stamping twice is an error, not a second label.
  assert.throws(() => execFileSync('node', [SCRIPT, 'apply', file, 'beta'], { stdio: 'pipe' }));
});
