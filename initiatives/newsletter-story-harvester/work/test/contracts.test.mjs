// The contracts themselves, and the reply parser - `src/contracts.mjs`,
// `src/model.mjs`.
//
// These are the parts that decide rather than read, and they are unit-testable
// because `spec.md` §3's option D put the deciding outside the model.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRACTS, SHAPES, FULL_TEXT_CHARACTER_LIMIT, contractFor, chromeReason, anchorFor, bandVerdict, isLoudCase
} from '../src/contracts.mjs';
import { parseFindings, buildRequest, recordedModel } from '../src/model.mjs';
import { readDocument } from '../src/html.mjs';

test('the three shapes of the spec, and no others', () => {
  assert.deepEqual(SHAPES.sort(), ['annotated-digest', 'link-list', 'long-form']);
  assert.throws(() => contractFor('newsletter'), /no contract for shape/);
});

test('the bands are the ones §3.1 states', () => {
  assert.deepEqual(CONTRACTS['link-list'].band, { min: 10, max: 60 });
  assert.deepEqual(CONTRACTS['annotated-digest'].band, { min: 3, max: 15 });
  assert.deepEqual(CONTRACTS['long-form'].band, { min: 1, max: 1 });
});

test('every shape uses the same 3000-character full-text threshold', () => {
  assert.equal(FULL_TEXT_CHARACTER_LIMIT, 3000);
  assert.ok(SHAPES.every(shape => CONTRACTS[shape].summary_threshold === 3000));
  assert.equal(CONTRACTS['long-form'].default_text_is_summary, true);
  assert.equal(CONTRACTS['link-list'].default_text_is_summary, false);
  assert.equal(CONTRACTS['annotated-digest'].default_text_is_summary, false);
});

test('a yield outside the band is named, with its direction', () => {
  const contract = CONTRACTS['link-list'];
  assert.equal(bandVerdict(contract, 40).inside, true);
  assert.equal(bandVerdict(contract, 3).direction, 'under');
  assert.equal(bandVerdict(contract, 61).direction, 'over');
});

test('the loud case is long-form yielding more than one, and nothing else', () => {
  assert.equal(isLoudCase(CONTRACTS['long-form'], 4), true);
  assert.equal(isLoudCase(CONTRACTS['long-form'], 1), false);
  assert.equal(isLoudCase(CONTRACTS['link-list'], 400), false);
});

test('chrome is recognised by href, by text, and by the block it sits in', () => {
  assert.match(chromeReason({ href: 'https://x.example/unsubscribe?e=1', text: 'Leave' }), /subscription link/);
  assert.match(chromeReason({ href: 'https://x.example/p/1', text: 'Update your preferences' }), /text/);
  assert.equal(
    chromeReason({ href: 'https://x.example/p/1', text: 'Buy this', heading_path: ['Together with Ridgeline'] }),
    'sponsor block'
  );
  assert.equal(chromeReason({ href: 'https://x.example/p/1', text: 'A real story' }), null);
});

test('anchors are structural, and differ by contract', () => {
  const document = readDocument(
    '<body><h2>Energy</h2><p><a href="https://a.example/1">One</a></p></body>',
    { docId: 'doc-1' }
  );
  const link = document.links[0];
  assert.equal(anchorFor(CONTRACTS['link-list'], document, link), 'link:0');
  assert.equal(anchorFor(CONTRACTS['annotated-digest'], document, link), 'Energy#link:0');
  assert.equal(anchorFor(CONTRACTS['long-form'], document, null), 'document');
});

test('the request numbers the links the same way the document does', () => {
  const document = readDocument(
    '<body><p><a href="https://a.example/1">One</a> <a href="https://a.example/2">Two</a></p></body>',
    { docId: 'doc-1' }
  );
  const request = buildRequest(CONTRACTS['link-list'], document);
  assert.match(request, /0\. One -> https:\/\/a\.example\/1/);
  assert.match(request, /1\. Two -> https:\/\/a\.example\/2/);
  assert.match(request, /3000 characters/);
  assert.match(request, /text_is_summary/);
});

test('a reply that is nearly right is refused, not accepted', () => {
  assert.throws(() => parseFindings('not json', { shape: 'link-list' }), /not JSON/);
  assert.throws(() => parseFindings('{"stories":[]}', { shape: 'link-list' }), /not a list/);
  assert.throws(
    () => parseFindings('[{"link_index":0,"title":"a","text":"b","confidence":0.9}]', { shape: 'link-list' }),
    /unknown fields: confidence/
  );
  assert.throws(
    () => parseFindings('[{"link_index":"first","title":"a","text":"b"}]', { shape: 'link-list' }),
    /non-integer link_index/
  );
  assert.throws(
    () => parseFindings('[{"link_index":0,"title":"a","text":"b","text_is_summary":"false"}]', { shape: 'link-list' }),
    /non-boolean text_is_summary/
  );
});

test('a reply may arrive as a bare list or under findings', () => {
  const bare = parseFindings('[{"link_index":0,"title":"a","text":"b"}]', { shape: 'link-list' });
  const wrapped = parseFindings('{"findings":[{"link_index":0,"title":"a","text":"b"}]}', { shape: 'link-list' });
  assert.deepEqual(bare, wrapped);
  assert.equal(bare[0].story_date, null);
  assert.equal(bare[0].text_is_summary, false);
});

test('the long-form prompt and live-shaped recording agree on an array of one finding', async () => {
  assert.match(
    CONTRACTS['long-form'].request,
    /Return a JSON array containing exactly one finding:/
  );

  // This recording is the successful live eval content with its singular
  // object wrapped in the array the strict parser accepts. Keep the parse here
  // beside the prompt assertion so the request and its wire contract cannot
  // drift independently again.
  const model = recordedModel(new URL('../fixtures/responses/', import.meta.url).pathname);
  const raw = await model({ issue_id: 'long-form-citations', shape: 'long-form' });
  const findings = parseFindings(raw, { shape: 'long-form' });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].title, 'The shortage is permits, not money');
});

test('a missing recording is an error - the contract layer never calls a model', async () => {
  const model = recordedModel(new URL('../fixtures/responses/', import.meta.url).pathname);
  await assert.rejects(
    () => model({ issue_id: 'no-such-issue', shape: 'link-list' }),
    /never call a live model/
  );
});
