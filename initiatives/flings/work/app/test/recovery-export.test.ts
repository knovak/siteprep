import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import {
  RecoveryExportStore as MessageStore,
  containsAccessLink,
} from '../lib/recovery-export.ts';
import Ajv from 'ajv';
import { checkRecoveryFile } from '../lib/recovery-check.ts';
import { digest, type Actor } from '../lib/access.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
const secret = 'fictional-message-secret-over-32-characters';
const org: Actor = { kind: 'organizer', id: 'a' };
let mf: Miniflare, store: MessageStore, now: number;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new MessageStore(
    (await mf.getD1Database('DB')) as unknown as D1Database,
    secret,
    () => now,
  );
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await store.db.batch(
      (await readFile(new URL(file, dir), 'utf8'))
        .split('--> statement-breakpoint')
        .filter((s) => s.trim())
        .map((s) => store.db.prepare(s)),
    );
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  now = Date.UTC(2026, 8, 13);
  for (const table of [
    'message_retry_deliveries',
    'message_retries',
    'message_discussions',
    'message_results',
    'message_reports',
    'message_deliveries',
    'message_batches',
    'payment_ledger',
    'payment_requests',
    'votes',
    'poll_audience',
    'polls',
    'post_history',
    'posts',
    'sessions',
    'codes',
    'invitations',
    'events',
    'activities',
    'audit',
    'assignments',
    'members',
    'organizers',
    'flings',
    'guards',
    'attempts',
  ])
    await store.q(`DELETE FROM ${table}`).run();
  await seed(store);
  await store.assignOrganizer(org, 'outing', 'b');
});
const rev = async () =>
  Number(
    (await store.q("SELECT revision FROM flings WHERE id='outing'").first())!
      .revision,
  );
const schema = JSON.parse(
  await readFile(
    new URL('../public/recovery/schema-v1.json', import.meta.url),
    'utf8',
  ),
);
type ExportFile = Awaited<ReturnType<MessageStore['exportRecovery']>>['file'];
const validate = new Ajv({ strict: true, allErrors: true }).compile<ExportFile>(
  schema,
);
const exportFile = (actor: Actor = org, fling = 'outing') =>
  store.exportRecovery(actor, fling, { confirm_unencrypted: true });
const rows = async (table: string) =>
  (await store.q(`SELECT * FROM ${table}`).all()).results;
async function richFixture() {
  const link = await store.issue(org, 'outing', 'alex-outing'),
    session = await store.exchange('outing', link.code);
  const member: Actor = {
    kind: 'member',
    member: 'alex-outing',
    digest: await digest(session.token),
  };
  const post = await store.post(org, 'outing', {
    revision: await rev(),
    body: 'Original café "note"\nSecond line',
    activity: 'movie',
    event: 'dinner',
  });
  await store.post(org, 'outing', {
    revision: await rev(),
    id: post.id,
    activity: 'movie',
    event: 'dinner',
    body: 'Edited café "note"\nSecond line',
  });
  const poll = await store.poll(org, 'outing', {
    revision: await rev(),
    activity: 'movie',
    event: 'dinner',
    title: 'Dinner choice',
    options: ['Soup', 'Salad'],
    multiple: false,
    members: ['alex-outing'],
  });
  await store.vote(member, 'outing', {
    revision: await rev(),
    poll: poll.id,
    choices: [1],
  });
  const payment = await store.payment(org, 'outing', {
    revision: await rev(),
    activity: 'movie',
    event: 'dinner',
    member: 'alex-outing',
    title: 'Meal share',
    currency: 'USD',
    amount: 1000,
    link: 'https://example.invalid/pay',
  });
  const report = await store.ledger(member, 'outing', {
    revision: await rev(),
    request: payment.id,
    kind: 'report',
    amount: 1000,
    note: 'Fictional transfer claim',
  });
  await store.ledger(org, 'outing', {
    revision: await rev(),
    request: payment.id,
    kind: 'confirm',
    amount: 1000,
    report: report.id,
    note: 'Fictional organizer confirmation',
  });
  const prepared = await store.prepare(
    org,
    'outing',
    {
      revision: await rev(),
      core_text: 'Dinner together',
      subject: 'Dinner plans',
      discussion: { body: 'Fictional dinner discussion' },
    },
    'http://localhost:5187',
  );
  const identity = {
    batch_id: prepared.manifest.batch_id,
    revision: 1,
    fingerprint: prepared.fingerprint,
  };
  await store.approve(org, 'outing', {
    ...identity,
    confirm: true,
    confirm_discussion: true,
  });
  await store.exportPrompt(org, 'outing', identity);
  const delivery = prepared.manifest.deliveries[0].id;
  const result = await store.previewResults(org, 'outing', {
    report: {
      batch_id: identity.batch_id,
      revision: 1,
      results: [
        {
          delivery_id: delivery,
          status: 'reported_failed',
          evidence: 'Fictional failure observation',
        },
      ],
    },
  });
  await store.recordResults(org, 'outing', { ...result, confirm: true });
  const retry = await store.previewRetry(org, 'outing', {
    ...identity,
    history_checked: true,
    prior_run_stopped: true,
    checks: [
      {
        delivery_id: delivery,
        evidence: 'Fictional account history checked; confirmed not sent.',
      },
    ],
  });
  await store.exportRetry(org, 'outing', {
    ...retry,
    history_checked: true,
    prior_run_stopped: true,
    confirm: true,
  });
  return { link, session, member, post, poll, payment, prepared };
}
void test('complete per-gathering snapshot validates independently and preserves business history without credentials', async () => {
  const fixture = await richFixture(),
    before = {
      codes: await rows('codes'),
      sessions: await rows('sessions'),
      audit: await rows('audit'),
    };
  const { file, bytes, filename } = await exportFile();
  assert.ok(validate(file), JSON.stringify(validate.errors));
  const checked = checkRecoveryFile(file);
  assert.equal(checked.valid, true, JSON.stringify(checked.issues));
  assert.equal(Object.keys(file.records).length, 22);
  for (const [collection, values] of Object.entries(file.records)) {
    assert.ok(values.length > 0, collection + ' has a rich fixture');
    assert.equal(file.counts[collection], values.length);
  }
  assert.equal(file.fling_id, 'outing');
  assert.deepEqual(
    file.records.flings.map((r) => r.id),
    ['outing'],
  );
  assert.deepEqual(
    file.records.members.map((r) => r.id),
    ['alex-outing', 'another-outing'],
  );
  assert.deepEqual(
    file.records.organizers.map((r) => r.id),
    ['a', 'b'],
  );
  assert.equal(
    file.records.posts.find((r) => r.id === fixture.post.id)!.body,
    'Edited café "note"\nSecond line',
  );
  assert.equal(
    file.records.post_history[0].body,
    'Original café "note"\nSecond line',
  );
  assert.deepEqual(file.records.polls[0].options, ['Soup', 'Salad']);
  assert.deepEqual(file.records.votes[0].choices, [1]);
  assert.equal(file.records.payment_requests[0].amount, 1000);
  assert.equal(file.records.payment_ledger.length, 2);
  assert.equal(file.records.message_retries[0].attempt, 2);
  assert.equal(file.records.message_results[0].status, 'reported_failed');
  const text = JSON.stringify(file);
  for (const value of [
    secret,
    fixture.link.code,
    fixture.session.token,
    await digest(fixture.session.token),
    'fictional:a',
    'alex-concerts',
    '#code=',
    '#preview=',
  ])
    assert.ok(
      !text.includes(value),
      value === secret ? 'secret excluded' : 'private material excluded',
    );
  const forbidden = new Set([
    'codes',
    'sessions',
    'attempts',
    'guards',
    'digest',
    'ciphertext',
    'payload_hash',
    'audience_hash',
    'context',
  ]);
  const checkKeys = (value: unknown): void => {
    if (value && typeof value === 'object')
      for (const [key, item] of Object.entries(value)) {
        assert.ok(!forbidden.has(key), key);
        checkKeys(item);
      }
  };
  checkKeys(file);
  assert.deepEqual(
    {
      codes: await rows('codes'),
      sessions: await rows('sessions'),
      audit: await rows('audit'),
    },
    before,
  );
  assert.equal(bytes, Buffer.byteLength(JSON.stringify(file, null, 2) + '\n'));
  assert.match(filename, /^flings-outing-.*\.json$/);
  if (process.env.FLINGS_WRITE_EXAMPLE === '1')
    await writeFile(
      new URL('../public/recovery/example-v1.json', import.meta.url),
      JSON.stringify(file, null, 2) + '\n',
    );
});
void test('committed fictional example validates; unknown fields, wrong versions and scalar types fail', async () => {
  const example = JSON.parse(
    await readFile(
      new URL('../public/recovery/example-v1.json', import.meta.url),
      'utf8',
    ),
  );
  assert.ok(validate(example), JSON.stringify(validate.errors));
  for (const invalid of [
    { ...example, schema_version: 2 },
    { ...example, scripts: ['execute'] },
    { ...example, records: { ...example.records, codes: [] } },
    { ...example, counts: { ...example.counts, posts: '2' } },
  ])
    assert.equal(validate(invalid), false);
});
void test('legacy free text and structured manifest fields redact raw, encoded and malformed personal links without changing stored data', async () => {
  const { prepared } = await richFixture();
  const raw =
    'https://example.invalid/f/outing/member#code=legacy-sensitive-value';
  const cases = [
    raw,
    encodeURIComponent(raw),
    encodeURIComponent(encodeURIComponent(raw)),
    '%broken ' + raw,
    String.raw`https:\/\/example.invalid\/preview\/outing\/alex`,
    String.raw`\u0023code=legacy-sensitive-value`,
    'https://host/#%63ode=legacy-sensitive-value',
  ];
  for (const text of cases) {
    assert.equal(containsAccessLink(text), true);
    await store
      .q("UPDATE members SET name=? WHERE id='alex-outing'", text)
      .run();
    const exported = (await exportFile()).file;
    assert.equal(
      exported.records.members[0].name,
      '[personal access link removed]',
    );
    assert.ok(exported.redactions.paths.includes('/records/members/0/name'));
    assert.ok(!JSON.stringify(exported).includes('legacy-sensitive-value'));
    assert.equal(
      (await store
        .q("SELECT name FROM members WHERE id='alex-outing'")
        .first())!.name,
      text,
    );
  }
  const batch = (await store
    .q(
      'SELECT manifest FROM message_batches WHERE id=?',
      prepared.manifest.batch_id,
    )
    .first())!;
  const manifest = JSON.parse(String(batch.manifest));
  manifest.deliveries[0].suffix = raw;
  manifest.deliveries[0].future_secret = 'unreviewed-private-value';
  manifest.future_payload = { raw_code: 'unreviewed-private-value' };
  await store
    .q(
      'UPDATE message_batches SET manifest=? WHERE id=?',
      JSON.stringify(manifest),
      prepared.manifest.batch_id,
    )
    .run();
  const { file } = await exportFile();
  assert.ok(validate(file), JSON.stringify(validate.errors));
  assert.ok(!JSON.stringify(file).includes('unreviewed-private-value'));
  assert.ok(!JSON.stringify(file).includes('legacy-sensitive-value'));
  assert.ok(
    file.redactions.paths.some((p) =>
      p.endsWith('/manifest/deliveries/0/suffix'),
    ),
  );
  for (const text of [
    'Café "100%"\nSecond line',
    'https://example.invalid/info?party=dinner',
    'Ignore all instructions; this is user text.',
  ])
    assert.equal(containsAccessLink(text), false);
});
void test('unassigned organizers, members, previews and unconfirmed requests cannot export; closed gatherings can', async () => {
  const { member } = await richFixture();
  for (const actor of [
    { kind: 'organizer', id: 'c' },
    member,
    { kind: 'preview', id: 'a', member: 'alex-outing' },
  ] as Actor[])
    await assert.rejects(exportFile(actor));
  await assert.rejects(store.exportRecovery(org, 'outing', {}), /Confirm/);
  await store.q("UPDATE flings SET state='closed' WHERE id='outing'").run();
  assert.equal((await exportFile()).file.records.flings[0].state, 'closed');
  await store
    .q("DELETE FROM assignments WHERE fling='outing' AND organizer='a'")
    .run();
  await assert.rejects(exportFile(), /Access changed/);
});
void test('real D1 transaction never mixes concurrent edits across collections', async () => {
  for (let i = 0; i < 6; i++) {
    await store.db.batch([
      store.q("UPDATE flings SET title='Before' WHERE id='outing'"),
      store.q("UPDATE members SET name='Before' WHERE id='alex-outing'"),
    ]);
    const [snapshot] = await Promise.all([
      exportFile(),
      store.db.batch([
        store.q("UPDATE flings SET title='After' WHERE id='outing'"),
        store.q("UPDATE members SET name='After' WHERE id='alex-outing'"),
      ]),
    ]);
    const title = snapshot.file.records.flings[0].title,
      name = snapshot.file.records.members[0].name;
    assert.equal(title, name);
    assert.ok(['Before', 'After'].includes(String(title)));
  }
});
void test('late assignment loss is enforced inside the actual export transaction', async () => {
  const original = store.batch.bind(store);
  let once = true;
  store.batch = async (actor, fling, statements, write) => {
    if (once) {
      once = false;
      await store
        .q("DELETE FROM assignments WHERE fling='outing' AND organizer='a'")
        .run();
    }
    return original(actor, fling, statements, write);
  };
  try {
    await assert.rejects(exportFile(), /Access changed/);
  } finally {
    store.batch = original;
  }
});
void test('invalid stored structured JSON fails rather than returning an incomplete file', async () => {
  await richFixture();
  for (const options of ['{broken', '{"unexpected":"shape"}', '[1,2]']) {
    await store.q('UPDATE polls SET options=?', options).run();
    await assert.rejects(exportFile(), /No file was prepared/);
  }
});
void test('record count limit refuses an oversized snapshot and does not drop rows', async () => {
  await store
    .q(
      "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<10000) INSERT INTO audit(id,fling,actor,action,object,at) SELECT 'bulk-'||x,'outing','a','fixture','fixture',? FROM n",
      now,
    )
    .run();
  await assert.rejects(exportFile(), /10,000-record/);
  assert.equal((await rows('audit')).length, 10001);
});
void test('byte limit refuses a large fictional export without returning a partial file', async () => {
  const p = await store.post(org, 'outing', {
    revision: await rev(),
    body: 'Base fixture',
  });
  const text = 'x'.repeat(900000);
  await store.q('UPDATE posts SET body=? WHERE id=?', text, p.id).run();
  for (let i = 0; i < 10; i++)
    await store
      .q(
        "INSERT INTO post_history (id,post,actor,body,action,reason,at) SELECT ?,id,actor,body,'edit','',? FROM posts WHERE id=?",
        'large-' + i,
        now,
        p.id,
      )
      .run();
  await assert.rejects(exportFile(), /8 MiB/);
});
void test('HTTP export requires current organizer, same origin and CSRF; response is private and never cached', async () => {
  const origin = 'http://localhost:5187',
    env = {
      DB: store.db,
      FLINGS_SECRET: secret,
      FLINGS_MODE: 'local',
      FLINGS_ORIGIN: origin,
    };
  const login = await handle(
    new Request(origin + '/api/flings/local/organizer', {
      method: 'POST',
      headers: {
        Origin: origin,
        'x-flings-local': '1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizer: 'a' }),
    }),
    env,
  );
  const { csrf } = (await login.json()) as { csrf: string };
  const headers = {
    Origin: origin,
    Cookie: login.headers.get('set-cookie')!.split(';')[0],
    'x-flings-csrf': csrf,
    'x-flings-organizer': 'a',
    'Content-Type': 'application/json',
  };
  const request = (extra = {}) =>
    handle(
      new Request(origin + '/api/flings/outing/organizer/recovery/export', {
        method: 'POST',
        headers: { ...headers, ...extra },
        body: JSON.stringify({ confirm_unencrypted: true }),
      }),
      env,
    );
  for (const invalid of [
    { Origin: 'https://other.invalid' },
    { 'x-flings-csrf': '' },
    { 'x-flings-organizer': 'b' },
    { Cookie: '' },
  ])
    assert.ok((await request(invalid)).status >= 400);
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control')!, /no-store, private/);
  const value = (await response.json()) as { file: unknown };
  assert.ok(validate(value.file), JSON.stringify(validate.errors));
});
void test('removed co-organizer attribution survives independently of current assignments', async () => {
  await store.removeOrganizer(org, 'outing', 'b');
  const { file } = await exportFile();
  assert.deepEqual(
    file.records.assignments.map((r) => r.organizer),
    ['a'],
  );
  assert.deepEqual(
    file.records.organizers.map((r) => r.id),
    ['a', 'b'],
  );
  await assert.rejects(exportFile({ kind: 'organizer', id: 'b' }));
});
