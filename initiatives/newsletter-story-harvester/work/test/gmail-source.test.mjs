import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, lstatSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gmailMessageSource, gmailQueryFor, readableBody } from '../src/gmail-source.mjs';
import { loadPrivateInventory, validatePrivateInventory, writePrivateInventory } from '../src/private-inventory.mjs';
import { recordedModel } from '../src/model.mjs';
import { runHarvest } from '../src/run.mjs';
import { emptyStore } from '../src/store.mjs';

const FIXTURES = new URL('../fixtures/', import.meta.url).pathname;
const inventory = JSON.parse(readFileSync(`${FIXTURES}inventory-fixture.json`, 'utf8'));
const mailbox = JSON.parse(readFileSync(`${FIXTURES}mailbox-fixture.json`, 'utf8'));

test('Gmail query syntax preserves matcher union, intersection, and the half-open range', () => {
  assert.equal(gmailQueryFor(inventory.sources[0], { after: '2026-01-01', before: '2026-02-01' }), '{from:digest@better.test label:fixture-newsletters} after:2026/01/01 before:2026/02/01');
  assert.equal(gmailQueryFor({
    key: 'extra',
    match: { all: [{ type: 'from', value: 'daily actions' }, { type: 'subject', value: 'extra' }] },
  }, { after: '2026-07-22', before: '2026-08-19' }), 'from:"daily actions" subject:extra after:2026/07/22 before:2026/08/19');
});

test('Gmail search pages to an honest count and exposes only the message-source envelope', async () => {
  const calls = [];
  const pages = [
    { emails: [{ id: 'b', from_: 'B <b@example.test>', labels: ['Inbox'], subject: 'B', email_ts: '2026-08-18T23:30:00Z', snippet: 'must not cross the seam' }], next_page_token: 'next' },
    { emails: [{ id: 'a', from_: 'A <a@example.test>', labels: ['Archive'], subject: 'A', email_ts: '2026-08-17T09:00:00Z', snippet: 'must not cross the seam' }] },
  ];
  const source = gmailMessageSource({
    search_emails: async args => { calls.push(args); return { structuredContent: pages.shift() }; },
    read_email: async () => { throw new Error('not read'); },
  }, { pageSize: 1, timeZone: 'America/Los_Angeles' });
  const messages = await source.search({ key: 'a', match: { type: 'from', value: 'a@example.test' } }, { after: '2026-08-01', before: '2026-08-19' });
  assert.deepEqual(messages, [
    { id: 'a', from: 'A <a@example.test>', labels: ['Archive'], subject: 'A', issue_date: '2026-08-17', shape_override: null },
    { id: 'b', from: 'B <b@example.test>', labels: ['Inbox'], subject: 'B', issue_date: '2026-08-18', shape_override: null },
  ]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].max_results, 1);
  assert.equal(calls[1].next_page_token, 'next');
  assert.ok(messages.every(message => !('snippet' in message)));
});

test('Gmail read prefers inline HTML and has a link-preserving plain-text fallback', async () => {
  const html = '<article><a href="https://publisher.test/a">A</a></article>';
  const payload = { mime_type: 'multipart/alternative', parts: [
    { mime_type: 'text/plain', body: { content: 'A https://publisher.test/a' } },
    { mime_type: 'text/html', body: { content: html } },
  ] };
  assert.equal(readableBody(payload), html);
  assert.match(readableBody({ mime_type: 'text/plain', body: { content: 'A https://publisher.test/a' } }), /<a href="https:\/\/publisher\.test\/a">/);

  const source = gmailMessageSource({
    search_emails: async () => ({ emails: [] }),
    read_email: async ({ message_id, format }) => ({ structuredContent: { id: message_id, payload } }),
  });
  assert.equal(await source.read({ id: 'message-1' }), html);
  assert.deepEqual(source.operations, [{ operation: 'read', message_id: 'message-1' }]);
});

test('the Gmail adapter swaps into the fixture harvest without changing anything above the seam', async () => {
  const messages = mailbox.messages.filter(message => message.issue_date < '2026-01-20');
  const byId = new Map(messages.map(message => [message.id, message]));
  const calls = [];
  const connector = {
    search_emails: async args => {
      calls.push({ operation: 'search_emails', keys: Object.keys(args).sort() });
      return { emails: messages.map(message => ({
        id: message.id,
        from_: message.from,
        labels: message.labels,
        subject: message.subject,
        email_ts: `${message.issue_date}T12:00:00Z`,
      })) };
    },
    read_email: async args => {
      calls.push({ operation: 'read_email', keys: Object.keys(args).sort() });
      const message = byId.get(args.message_id);
      return { id: message.id, payload: { mime_type: 'text/html', body: { content: readFileSync(join(FIXTURES, message.body_file), 'utf8') } } };
    },
  };
  const source = gmailMessageSource(connector, { timeZone: 'UTC' });
  const result = await runHarvest({
    inventory,
    range: { after: '2026-01-01', before: '2026-01-20' },
    source,
    model: recordedModel(`${FIXTURES}responses/`),
    store: emptyStore(),
    now: '2026-08-18T09:00:00.000Z',
  });
  assert.deepEqual(result.run.issues_per_source, { 'better-news': 2, 'energy-notes': 1, 'permit-column': 1 });
  assert.equal(result.run.source_docs.length, 4);
  assert.ok(calls.every(call => ['search_emails', 'read_email'].includes(call.operation)));
  assert.ok(calls.filter(call => call.operation === 'read_email').every(call => call.keys.join(',') === 'format,message_id'));
});

test('private inventory writes atomically as mode 0600 and refuses broader or linked files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'newsletter-private-'));
  const path = join(directory, 'inventory.json');
  writePrivateInventory(path, inventory);
  assert.equal(lstatSync(path).mode & 0o777, 0o600);
  assert.deepEqual(loadPrivateInventory(path), inventory);
  chmodSync(path, 0o644);
  assert.throws(() => loadPrivateInventory(path), /must not be group- or world-readable/);
  chmodSync(path, 0o600);
  const linked = join(directory, 'linked.json');
  symlinkSync(path, linked);
  assert.throws(() => loadPrivateInventory(linked), /regular file/);
});

test('private inventory validation pins shapes, matcher groups, lookbacks, and unique keys', () => {
  assert.equal(validatePrivateInventory(inventory), inventory);
  assert.throws(() => validatePrivateInventory({ sources: [{ ...inventory.sources[0], lookback_days: 0 }] }), /positive integer/);
  assert.throws(() => validatePrivateInventory({ sources: [inventory.sources[0], inventory.sources[0]] }), /duplicate key/);
  assert.throws(() => validatePrivateInventory({ sources: [{ ...inventory.sources[0], shape: 'guess' }] }), /supported shape/);
});
