import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import {
  checkRecoveryFile,
  RecoveryCheckStore,
} from '../lib/recovery-check.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
const example = JSON.parse(
  await readFile(
    new URL('../public/recovery/example-v1.json', import.meta.url),
    'utf8',
  ),
);
const sample = () => structuredClone(example);
const recount = (f: typeof example) => {
  for (const k of Object.keys(f.records)) f.counts[k] = f.records[k].length;
  return f;
};
void test('edited event/profile and instruction-like prose pass unchanged; nothing is repaired or executed', () => {
  const f = sample();
  f.records.events[0].title = 'Dinner moved';
  f.records.members[0].name = 'Updated name';
  f.migration_notes =
    "<script>throw new Error('never run')</script>; DROP TABLE members;";
  const before = JSON.stringify(f),
    result = checkRecoveryFile(f);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.summary?.total, 46);
  assert.equal(JSON.stringify(f), before);
});
const cases: [string, (f: typeof example) => void, string][] = [
  ['version', (f) => (f.schema_version = 99), '/schema_version'],
  [
    'unknown credential field',
    (f) => (f.records.members[0].digest = 'do-not-echo'),
    '/records/members/0',
  ],
  [
    'duplicate ID',
    (f) => (f.records.members[1].id = f.records.members[0].id),
    '/records/members/1',
  ],
  [
    'duplicate relation',
    (f) => f.records.assignments.push(f.records.assignments[0]),
    '/records/assignments/2',
  ],
  [
    'broken parent',
    (f) => (f.records.events[0].activity = 'absent'),
    '/records/events/0/activity',
  ],
  [
    'cross gathering',
    (f) => (f.records.members[0].fling = 'other'),
    '/records/members/0/fling',
  ],
  [
    'wrong type',
    (f) => (f.records.members[0].revision = '0'),
    '/records/members/0/revision',
  ],
  [
    'unsafe integer',
    (f) => (f.records.members[0].revision = 9007199254740992),
    '/records/members/0/revision',
  ],
  [
    'calendar overflow',
    (f) => (f.records.events[0].starts = '2026-02-30T12:00:00.000Z'),
    '/records/events/0/starts',
  ],
  [
    'time zone',
    (f) => (f.records.events[0].zone = 'Imaginary/Town'),
    '/records/events/0/zone',
  ],
  [
    'wrong role',
    (f) => (f.records.posts[0].actor_kind = 'administrator'),
    '/records/posts/0/actor_kind',
  ],
  [
    'missing actor',
    (f) => (f.records.posts[0].actor = 'absent'),
    '/records/posts/0/actor',
  ],
  [
    'invalid poll',
    (f) => (f.records.polls[0].options = ['Same', 'Same']),
    '/records/polls/0/options',
  ],
  [
    'vote option',
    (f) => (f.records.votes[0].choices = [99]),
    '/records/votes/0/choices',
  ],
  [
    'future generation',
    (f) => (f.records.votes[0].generation = 999),
    '/records/votes/0',
  ],
  [
    'currency',
    (f) => (f.records.payment_requests[0].currency = 'NOTACURRENCY'),
    '/records/payment_requests/0/currency',
  ],
  [
    'over confirmation',
    (f) =>
      (f.records.payment_ledger.find(
        (r: { kind: string }) => r.kind === 'confirm',
      ).amount = 1001),
    '/records/payment_ledger',
  ],
  [
    'negative report',
    (f) =>
      (f.records.payment_ledger.find(
        (r: { kind: string }) => r.kind === 'report',
      ).amount = -1),
    '/records/payment_ledger',
  ],
  [
    'refund without payment',
    (f) => {
      const r = f.records.payment_ledger.find(
        (r: { kind: string }) => r.kind === 'confirm',
      );
      r.kind = 'refund';
      r.report = null;
    },
    '/records/payment_requests/0/amount',
  ],
  ['wrong count', (f) => (f.counts.events = 900), '/counts/events'],
  [
    'manifest mismatch',
    (f) => (f.records.message_batches[0].manifest.deliveries[0].id = 'absent'),
    '/manifest/deliveries/0',
  ],
  [
    'missing retry',
    (f) => (f.records.message_retry_deliveries[0].attempt = 3),
    '/records/message_retry_deliveries/0',
  ],
  [
    'unsafe URL',
    (f) => (f.records.events[0].location_url = 'javascript:alert(1)'),
    '/records/events/0/location_url',
  ],
];
for (const [name, mutate, path] of cases)
  void test('reject ' + name, () => {
    const f = sample();
    mutate(f);
    if (name !== 'wrong count') recount(f);
    const result = checkRecoveryFile(f);
    assert.equal(result.valid, false);
    assert.equal(result.summary, null);
    assert.ok(
      result.issues.some((i) => i.path.includes(path)),
      JSON.stringify(result),
    );
  });
void test('encoded access links in nested history and hostile key names are never echoed in errors', () => {
  for (const secret of [
    '#code=do-not-echo',
    '%2523code%253Ddo-not-echo',
    '\\u0023code=do-not-echo',
    '/preview/outing/private',
  ]) {
    const f = sample();
    f.records.message_batches[0].manifest.deliveries[0].suffix = secret;
    const result = checkRecoveryFile(f);
    assert.equal(result.valid, false);
    assert.ok(!JSON.stringify(result).includes('do-not-echo'));
  }
  const f = sample();
  f.records.members[0]['#code=do-not-echo'] = 'private';
  const r = checkRecoveryFile(f);
  assert.equal(r.valid, false);
  assert.ok(!JSON.stringify(r).includes('do-not-echo'));
});
void test('oversize, excessive record counts and deep malformed nesting fail with bounded errors', () => {
  const huge = sample();
  huge.migration_notes = 'x'.repeat(8 * 1024 * 1024);
  assert.equal(checkRecoveryFile(huge).valid, false);
  const many = sample();
  many.records.members = Array(10001).fill(many.records.members[0]);
  assert.match(checkRecoveryFile(recount(many)).issues[0].message, /10,000/);
  const errors = sample();
  errors.records.members = Array(200).fill({ bad: 'do-not-echo' });
  const r = checkRecoveryFile(recount(errors));
  assert.equal(r.issues.length, 100);
  assert.equal(r.truncated, true);
  const deep = JSON.parse('['.repeat(10000) + '0' + ']'.repeat(10000));
  assert.equal(checkRecoveryFile(deep).valid, false);
});
void test('schema walker covers every validation keyword in the committed format', async () => {
  const schema = JSON.parse(
    await readFile(
      new URL('../public/recovery/schema-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const allowed = new Set([
    '$schema',
    'title',
    'description',
    'type',
    'additionalProperties',
    'required',
    'properties',
    'definitions',
    'const',
    'pattern',
    'items',
    '$ref',
    'minItems',
    'maxItems',
    'minimum',
    'enum',
  ]);
  function visit(s: Record<string, unknown>) {
    for (const k of Object.keys(s))
      assert.ok(allowed.has(k), 'Implement new schema keyword: ' + k);
    for (const c of Object.values(s.properties ?? {}))
      visit(c as Record<string, unknown>);
    for (const c of Object.values(s.definitions ?? {}))
      visit(c as Record<string, unknown>);
    if (s.items) visit(s.items as Record<string, unknown>);
  }
  visit(schema);
});
let mf: Miniflare, store: RecoveryCheckStore;
const secret = 'fictional-recovery-secret-over-32-characters',
  org = { kind: 'organizer' as const, id: 'a' };
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new RecoveryCheckStore(
    (await mf.getD1Database('DB')) as unknown as D1Database,
    secret,
    () => Date.UTC(2026, 8, 14),
  );
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await store.db.batch(
      (await readFile(new URL(file, dir), 'utf8'))
        .split('--> statement-breakpoint')
        .filter((s) => s.trim())
        .map((s) => store.q(s)),
    );
  await seed(store);
});
after(async () => {
  await mf?.dispose();
});
async function snapshot() {
  const tables = (
    await store
      .q(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name",
      )
      .all()
  ).results;
  const all = [];
  for (const { name } of tables)
    all.push([
      name,
      (await store.q(`SELECT * FROM ${String(name)} ORDER BY rowid`).all())
        .results,
    ]);
  return JSON.stringify(all);
}
void test('actual D1 export validates and valid/invalid checks leave every table unchanged, including expired secrets', async () => {
  const { file } = await store.exportRecovery(org, 'outing', {
    confirm_unencrypted: true,
  });
  const link = await store.issue(org, 'outing', 'alex-outing');
  await store.q('UPDATE codes SET send_until=0 WHERE id=?', link.id).run();
  const before = await snapshot();
  const r = await store.checkRecovery(org, 'outing', file);
  assert.equal(r.valid, true, JSON.stringify(r.issues));
  assert.equal(
    (await store.checkRecovery(org, 'outing', { ...file, schema_version: 2 }))
      .valid,
    false,
  );
  assert.equal(await snapshot(), before);
});
void test('members, previews and unassigned organizers cannot check an upload', async () => {
  for (const actor of [
    { kind: 'member' as const, member: 'alex-outing', digest: 'none' },
    { kind: 'preview' as const, id: 'a', member: 'alex-outing' },
    { kind: 'organizer' as const, id: 'c' },
  ])
    await assert.rejects(
      store.checkRecovery(actor, 'outing', sample()),
      /Organizer access/,
    );
});
void test('assignment loss at the final read rejects the result', async () => {
  await store.assignOrganizer(org, 'outing', 'b');
  const q = store.q.bind(store);
  let reads = 0;
  store.q = (...args: Parameters<typeof store.q>) => {
    const statement = q(...args);
    if (args[0].startsWith('SELECT 1 FROM assignments') && ++reads === 2) {
      return {
        first: async () => {
          await q(
            "DELETE FROM assignments WHERE fling='outing' AND organizer='b'",
          ).run();
          return statement.first();
        },
      } as D1PreparedStatement;
    }
    return statement;
  };
  try {
    await assert.rejects(
      store.checkRecovery({ kind: 'organizer', id: 'b' }, 'outing', sample()),
      /Organizer access/,
    );
  } finally {
    store.q = q;
  }
});
void test('HTTP upload limit is separate from ordinary forms; authorization and no-store survive', async () => {
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
      body: '{"organizer":"a"}',
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
  const call = (
    body: string,
    extra = {},
    path = 'outing/organizer/recovery/check',
  ) =>
    handle(
      new Request(origin + '/api/flings/' + path, {
        method: 'POST',
        headers: { ...headers, ...extra },
        body,
      }),
      env,
    );
  const f = sample();
  f.migration_notes = 'A'.repeat(20000);
  const before = await snapshot();
  const r = await call(JSON.stringify(f));
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as { valid: boolean }).valid, true);
  assert.match(r.headers.get('cache-control')!, /no-store, private/);
  for (const extra of [
    { Origin: 'https://other.invalid' },
    { 'x-flings-csrf': '' },
    { 'x-flings-organizer': 'c' },
    { Cookie: '' },
  ])
    assert.ok((await call(JSON.stringify(f), extra)).status >= 400);
  assert.equal((await call('{broken')).status, 400);
  assert.equal((await call(' '.repeat(8 * 1024 * 1024) + '{}')).status, 413);
  assert.equal(
    (await call(JSON.stringify(f), {}, 'outing/organizer/recovery/export'))
      .status,
    413,
  );
  assert.equal(await snapshot(), before);
});
