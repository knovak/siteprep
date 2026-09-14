import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { RecoveryRestoreStore } from '../lib/recovery-restore.ts';
import { checkRecoveryFile } from '../lib/recovery-check.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
const example = JSON.parse(
  await readFile(
    new URL('../public/recovery/example-v1.json', import.meta.url),
    'utf8',
  ),
);
const sample = () => structuredClone(example);
const org = { kind: 'organizer' as const, id: 'a' },
  secret = 'restore-test-secret-at-least-32-characters';
let mf: Miniflare,
  store: RecoveryRestoreStore,
  now = Date.UTC(2026, 8, 14);
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new RecoveryRestoreStore(
    (await mf.getD1Database('DB')) as unknown as D1Database,
    secret,
    () => now,
  );
  const dir = new URL('../drizzle/', import.meta.url);
  for (const name of (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await store.db.batch(
      (await readFile(new URL(name, dir), 'utf8'))
        .split('--> statement-breakpoint')
        .filter((s) => s.trim())
        .map((s) => store.q(s)),
    );
  await seed(store);
  await store.assignOrganizer(org, 'outing', 'b');
});
after(async () => {
  await mf?.dispose();
});

void test('populated D1 migration preserves live deliveries and referenced reports', async () => {
  const runtime = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  try {
    const s = new RecoveryRestoreStore(
      (await runtime.getD1Database('DB')) as unknown as D1Database,
      secret,
      () => now,
    );
    const dir = new URL('../drizzle/', import.meta.url),
      names = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const migrate = async (name: string) =>
      s.db.batch(
        (await readFile(new URL(name, dir), 'utf8'))
          .split('--> statement-breakpoint')
          .filter((p) => p.trim())
          .map((p) => s.q(p)),
      );
    for (const name of names.filter((n) => n < '0009')) await migrate(name);
    await seed(s);
    const link = await s.issue(org, 'outing', 'alex-outing');
    await s.db.batch([
      s.q(
        "INSERT INTO message_batches(id,fling,owner,selection,context,audience_hash,manifest,payload_hash,send_until,created) VALUES('upgrade-batch','outing','a','{}','','','{}','',?,?)",
        now + 1000,
        now,
      ),
      s.q(
        "INSERT INTO message_deliveries(id,batch,fling,member,code,channel) VALUES('upgrade-delivery','upgrade-batch','outing','alex-outing',?,'email')",
        link.id,
      ),
      s.q(
        "INSERT INTO message_reports(id,batch,fling,sequence,fingerprint,reporter,reported_at) VALUES('upgrade-report','upgrade-batch','outing',1,'hash','a',?)",
        now,
      ),
      s.q(
        "INSERT INTO message_results(report,delivery,batch,fling,status,evidence) VALUES('upgrade-report','upgrade-delivery','upgrade-batch','outing','unknown','Fictional')",
      ),
    ]);
    const before = (await s.q('SELECT * FROM message_deliveries').all())
      .results;
    for (const name of names.filter((n) => n >= '0009')) await migrate(name);
    assert.deepEqual(
      (await s.q('SELECT * FROM message_deliveries').all()).results,
      before,
    );
    assert.equal(
      (await s
        .q('SELECT COUNT(*) n FROM message_results')
        .first<{ n: number }>())!.n,
      1,
    );
    assert.deepEqual((await s.q('PRAGMA foreign_key_check').all()).results, []);
  } finally {
    await runtime.dispose();
  }
});
async function prepare(
  fling = 'outing',
  file = sample(),
  target: string | null = null,
) {
  const input = {
    file,
    organizer_mapping: file.records.organizers.map((r: { id: string }) => ({
      source: r.id,
      target,
    })),
  };
  const preview = await store.recoveryPreview(org, fling, input);
  assert.ok(preview.plan, JSON.stringify(preview.check));
  return {
    ...input,
    ticket: preview.confirmation!.ticket,
    confirm_restore: true,
  };
}
async function snapshot() {
  const tables = (
    await store
      .q(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name",
      )
      .all()
  ).results;
  return JSON.stringify(
    await Promise.all(
      tables.map(async ({ name }) => [
        name,
        (await store.q(`SELECT * FROM ${String(name)} ORDER BY rowid`).all())
          .results,
      ]),
    ),
  );
}
async function remove(id: string) {
  const row = await store
    .q('SELECT title,revision FROM flings WHERE id=?', id)
    .first<{ title: string; revision: number }>();
  return store.deleteRecovery(org, id, { ...row, confirm_delete: true });
}
void test('edited restore remaps every relationship, retains history and importer access without touching existing gatherings', async () => {
  const file = sample();
  file.records.events[0].title = 'Edited dinner';
  file.records.members[0].name = 'Edited profile';
  const body = await prepare('outing', file, 'b'),
    original = JSON.stringify(body.file);
  const before = await store.exportRecovery(org, 'outing', {
    confirm_unencrypted: true,
  });
  const result = await store.restoreRecovery(org, 'outing', body);
  assert.notEqual(result.id, file.fling_id);
  assert.equal(JSON.stringify(body.file), original);
  assert.deepEqual(
    (await store.exportRecovery(org, 'outing', { confirm_unencrypted: true }))
      .file,
    before.file,
  );
  const assigned = (
    await store
      .q(
        'SELECT organizer FROM assignments WHERE fling=? ORDER BY organizer',
        result.id,
      )
      .all()
  ).results;
  assert.deepEqual(assigned, [{ organizer: 'a' }, { organizer: 'b' }]);
  const fresh = await store.exportRecovery(org, result.id, {
    confirm_unencrypted: true,
  });
  assert.equal(
    checkRecoveryFile(fresh.file).valid,
    true,
    JSON.stringify(checkRecoveryFile(fresh.file).issues),
  );
  assert.ok(fresh.file.records.events.some((r) => r.title === 'Edited dinner'));
  assert.ok(
    fresh.file.records.members.some((r) => r.name === 'Edited profile'),
  );
  const oldIds = new Set(
    Object.values(file.records).flatMap((rows) =>
      (rows as { id?: string }[]).flatMap((r) => (r.id ? [r.id] : [])),
    ),
  );
  for (const [table, rows] of Object.entries(fresh.file.records))
    if (table !== 'organizers')
      for (const r of rows)
        if (r.id) assert.ok(!oldIds.has(r.id as string), table);
  assert.deepEqual(
    (await store.q('PRAGMA foreign_key_check').all()).results,
    [],
  );
  for (const table of ['codes', 'sessions'])
    assert.equal(
      (await store
        .q(`SELECT COUNT(*) n FROM ${table} WHERE fling=?`, result.id)
        .first<{ n: number }>())!.n,
      0,
    );
  const historical = (
    await store
      .q(
        'SELECT id FROM organizers WHERE subject LIKE ?',
        'recovery:' + result.id + ':%',
      )
      .all()
  ).results;
  assert.equal(historical.length, file.records.organizers.length);
  for (const r of historical)
    await assert.rejects(store.assignOrganizer(org, result.id, String(r.id)));
  const discussion = await store.coordination(org, result.id);
  assert.ok(
    discussion.posts
      .filter((p) => p.notification)
      .every((p) => p.notification!.state.includes('Imported')),
  );
  const history = await store.history(org, result.id);
  assert.ok(
    history.batches.every(
      (b) =>
        b.imported_at === now &&
        b.state.includes('cancelled') &&
        b.outcome.includes('imported'),
    ),
  );
  const batch = history.batches[0];
  await assert.rejects(
    store.exportPrompt(org, result.id, { batch_id: batch.id }),
    /Imported/,
  );
  await assert.rejects(
    store.previewRetry(org, result.id, { batch_id: batch.id }),
    /Imported|account|Select|review|belong/i,
  );
  await assert.rejects(
    store.previewResults(org, result.id, {
      report: {
        batch_id: batch.id,
        revision: 1,
        results: [
          {
            delivery_id: batch.results.deliveries[0].id,
            status: 'unknown',
            evidence: '',
          },
        ],
      },
    }),
    /Imported/,
  );
  await remove(result.id);
});
void test('source secrets and all source rows stay unchanged even when expired', async () => {
  const body = await prepare();
  const link = await store.issue(org, 'outing', 'alex-outing');
  await store.q('UPDATE codes SET send_until=0 WHERE id=?', link.id).run();
  const before = (
    await store
      .q('SELECT * FROM codes WHERE fling=? ORDER BY id', 'outing')
      .all()
  ).results;
  const r = await store.restoreRecovery(org, 'outing', body);
  assert.deepEqual(
    (
      await store
        .q('SELECT * FROM codes WHERE fling=? ORDER BY id', 'outing')
        .all()
    ).results,
    before,
  );
  await remove(r.id);
});
void test('confirmation binds file, mappings, actor, context, roster and expiry; invalid confirmation writes nothing', async () => {
  const body = await prepare(),
    before = await snapshot();
  const changed = structuredClone(body);
  changed.file.records.flings[0].title = 'Changed after review';
  const corrupt = structuredClone(body);
  corrupt.file.records.events[0].activity = 'missing';
  const mapped = structuredClone(body);
  mapped.organizer_mapping[0].target = 'b';
  for (const input of [
    changed,
    corrupt,
    mapped,
    { ...body, ticket: body.ticket + 'x' },
    { ...body, confirm_restore: false },
    { ...body, replace_existing: true },
  ])
    await assert.rejects(store.restoreRecovery(org, 'outing', input));
  await assert.rejects(
    store.restoreRecovery({ kind: 'organizer', id: 'b' }, 'outing', body),
  );
  await assert.rejects(store.restoreRecovery(org, 'wedding', body));
  now += 11 * 60000;
  await assert.rejects(store.restoreRecovery(org, 'outing', body), /expired/);
  now -= 11 * 60000;
  assert.equal(await snapshot(), before);
});
void test('concurrent or repeated confirmations create exactly one gathering, including after deletion', async () => {
  const body = await prepare();
  const results = await Promise.allSettled([
    store.restoreRecovery(org, 'outing', body),
    store.restoreRecovery(org, 'outing', body),
  ]);
  const passed = results.filter((r) => r.status === 'fulfilled');
  assert.equal(passed.length, 1);
  const id = (passed[0] as PromiseFulfilledResult<{ id: string }>).value.id;
  await remove(id);
  await assert.rejects(
    store.restoreRecovery(org, 'outing', body),
    /already used/,
  );
});
void test('a mid-import database failure rolls back all rows, identities and the consumed ticket', async () => {
  const body = await prepare(),
    before = await snapshot(),
    q = store.q.bind(store);
  store.q = (...args) =>
    args[0].startsWith('INSERT INTO message_batches(')
      ? q("INSERT INTO guards(id,ok) VALUES('injected-failure',0)")
      : q(...args);
  try {
    await assert.rejects(
      store.restoreRecovery(org, 'outing', body),
      /No new gathering/,
    );
  } finally {
    store.q = q;
  }
  assert.equal(await snapshot(), before);
  const result = await store.restoreRecovery(org, 'outing', body);
  await remove(result.id);
});
void test('late co-organizer removal is checked inside the import transaction', async () => {
  const context = await store.createFling(org, { title: 'Late roster change' });
  await store.assignOrganizer(org, context.id, 'b');
  const body = await prepare(context.id, sample(), 'b'),
    original = store.db;
  let fired = false;
  store.db = new Proxy(original, {
    get(target, key) {
      if (key === 'batch')
        return async (stmts: D1PreparedStatement[]) => {
          if (!fired) {
            fired = true;
            await original
              .prepare('DELETE FROM assignments WHERE fling=? AND organizer=?')
              .bind(context.id, 'b')
              .run();
          }
          return original.batch(stmts);
        };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  try {
    await assert.rejects(
      store.restoreRecovery(org, context.id, body),
      /No new gathering/,
    );
  } finally {
    store.db = original;
  }
  assert.equal(
    (await store
      .q('SELECT COUNT(*) n FROM recovery_imports')
      .first<{ n: number }>())!.n,
    0,
  );
  await remove(context.id);
});
void test('deletion requires exact confirmation and current authority and rolls back a late failure', async () => {
  const restored = await store.restoreRecovery(org, 'outing', await prepare()),
    id = restored.id;
  const row = await store
    .q('SELECT title,revision FROM flings WHERE id=?', id)
    .first<Record<string, unknown>>();
  const input = { ...row, confirm_delete: true },
    before = await snapshot();
  for (const bad of [
    { ...input, title: 'wrong' },
    { ...input, revision: -1 },
    { ...input, confirm_delete: false },
  ])
    await assert.rejects(store.deleteRecovery(org, id, bad));
  await assert.rejects(
    store.deleteRecovery({ kind: 'organizer', id: 'c' }, id, input),
  );
  const q = store.q.bind(store);
  store.q = (...args) =>
    args[0] === 'DELETE FROM flings WHERE id=?'
      ? q("INSERT INTO guards(id,ok) VALUES('delete-fail',0)")
      : q(...args);
  try {
    await assert.rejects(
      store.deleteRecovery(org, id, input),
      /Nothing was deleted/,
    );
  } finally {
    store.q = q;
  }
  assert.equal(await snapshot(), before);
  await remove(id);
  assert.equal(
    await store.q('SELECT 1 FROM flings WHERE id=?', id).first(),
    null,
  );
  assert.equal(
    await store
      .q(
        'SELECT 1 FROM organizers WHERE subject LIKE ?',
        'recovery:' + id + ':%',
      )
      .first(),
    null,
  );
  assert.deepEqual(
    (await store.q('PRAGMA foreign_key_check').all()).results,
    [],
  );
});
void test('restored active membership needs explicit fresh link issuance and deletion invalidates it', async () => {
  const restored = await store.restoreRecovery(org, 'outing', await prepare()),
    id = restored.id;
  const member = await store
    .q("SELECT id FROM members WHERE fling=? AND state='active' LIMIT 1", id)
    .first<{ id: string }>();
  const link = await store.issue(org, id, member!.id);
  const session = await store.exchange(id, link.code);
  assert.equal(session.member, member!.id);
  await remove(id);
  await assert.rejects(store.exchange(id, link.code), /unavailable/);
});
void test('HTTP restore and deletion enforce origin, CSRF and expected organizer', async () => {
  now = Date.now();
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
  const call = (path: string, body: unknown, extra = {}) =>
    handle(
      new Request(origin + '/api/flings/' + path, {
        method: 'POST',
        headers: { ...headers, ...extra },
        body: JSON.stringify(body),
      }),
      env,
    );
  const body = await prepare();
  for (const extra of [
    { Origin: 'https://other.invalid' },
    { 'x-flings-csrf': '' },
    { 'x-flings-organizer': 'b' },
    { Cookie: '' },
  ])
    assert.ok(
      (await call('outing/organizer/recovery/restore', body, extra)).status >=
        400,
    );
  const r = await call('outing/organizer/recovery/restore', body);
  assert.equal(r.status, 201, await r.clone().text());
  assert.match(r.headers.get('cache-control')!, /no-store, private/);
  const { id } = (await r.json()) as { id: string };
  const row = await store
    .q('SELECT title,revision FROM flings WHERE id=?', id)
    .first<Record<string, unknown>>();
  assert.equal(
    (
      await call(
        id + '/organizer/recovery/delete',
        { ...row, confirm_delete: true },
        { 'x-flings-csrf': '' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(id + '/organizer/recovery/delete', {
        ...row,
        confirm_delete: true,
      })
    ).status,
    200,
  );
});
