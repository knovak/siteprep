import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { RecoveryPreviewStore } from '../lib/recovery-preview.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
const example = JSON.parse(
  await readFile(
    new URL('../public/recovery/example-v1.json', import.meta.url),
    'utf8',
  ),
);
const sample = () => structuredClone(example);
const history = () =>
  example.records.organizers.map((r: { id: string }) => ({
    source: r.id,
    target: null,
  }));
const org = { kind: 'organizer' as const, id: 'a' },
  secret = 'restore-preview-test-secret-at-least-32-characters';
let mf: Miniflare, store: RecoveryPreviewStore;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new RecoveryPreviewStore(
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
  await store.assignOrganizer(org, 'outing', 'b');
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
void test('choices come from the current authorized gathering, not matching uploaded names or IDs', async () => {
  const current = await store.createFling(org, {
    title: 'Isolated preview context',
  });
  const result = await store.recoveryPreview(org, current.id, {
    file: sample(),
  });
  assert.equal(result.check.valid, true);
  assert.equal(result.plan, null);
  assert.deepEqual(result.accounts, [{ id: 'a', name: 'Casey' }]);
  assert.equal(result.importer?.id, 'a');
  assert.deepEqual(
    result.identities.map((r) => r.id),
    ['a', 'b'],
  );
  await assert.rejects(
    store.recoveryPreview(org, current.id, {
      file: sample(),
      organizer_mapping: [
        { source: 'a', target: 'a' },
        { source: 'b', target: 'b' },
      ],
    }),
    /listed account/,
  );
});
void test('all-history and many-to-one mappings retain the importer and keep attribution separate', async () => {
  const file = sample(),
    before = JSON.stringify(file);
  const result = await store.recoveryPreview(org, 'outing', {
    file,
    organizer_mapping: history(),
  });
  assert.deepEqual(
    result.plan?.organizers.map((r) => r.id),
    ['a'],
  );
  assert.ok(result.plan?.mappings.every((r) => r.account === null));
  const merged = await store.recoveryPreview(org, 'outing', {
    file,
    organizer_mapping: history().map((r: { source: string }) => ({
      source: r.source,
      target: 'b',
    })),
  });
  assert.deepEqual(
    merged.plan?.organizers.map((r) => r.id),
    ['a', 'b'],
  );
  assert.equal(merged.plan?.mappings.length, 2);
  assert.equal(merged.plan?.total, 46);
  assert.deepEqual(merged.plan?.counts, file.counts);
  assert.equal(
    merged.plan?.importedResults,
    file.records.message_results.length,
  );
  assert.equal(JSON.stringify(file), before);
});
void test('unassigned historical actors and prototype-like identities remain inert history', async () => {
  const file = sample();
  file.records.organizers.push({
    id: '__proto__',
    name: '<script>never executed</script>',
  });
  file.counts.organizers++;
  const choices = [...history(), { source: '__proto__', target: null }];
  const result = await store.recoveryPreview(org, 'outing', {
    file,
    organizer_mapping: choices,
  });
  assert.equal(result.plan?.mappings.at(-1)?.source, '__proto__');
  assert.equal(result.identities.at(-1)?.assigned, false);
  await assert.rejects(
    store.recoveryPreview(org, 'outing', {
      file,
      organizer_mapping: [...history(), { source: '__proto__', target: 'a' }],
    }),
    /listed account/,
  );
});
void test('missing, duplicate, extra, malformed and foreign mappings fail without echoing uploaded values', async () => {
  const bad = [
    null,
    [],
    [{ source: 'a', target: null }],
    [
      { source: 'a', target: null },
      { source: 'a', target: 'b' },
    ],
    [
      { source: 'a', target: 'c' },
      { source: 'b', target: null },
    ],
    [
      { source: 'do-not-echo', target: null },
      { source: 'b', target: null },
    ],
    [
      { source: 'a', target: false },
      { source: 'b', target: null },
    ],
    [
      { source: 'a', target: null, subject: 'do-not-echo' },
      { source: 'b', target: null },
    ],
    ['do-not-echo', { source: 'b', target: null }],
  ];
  const before = await snapshot();
  for (const choices of bad)
    await assert.rejects(
      store.recoveryPreview(org, 'outing', {
        file: sample(),
        organizer_mapping: choices,
      }),
      (e: Error) =>
        /listed account/.test(e.message) && !e.message.includes('do-not-echo'),
    );
  await assert.rejects(
    store.recoveryPreview(org, 'outing', {
      file: sample(),
      replace_existing: true,
    }),
    /from this form/,
  );
  assert.equal(await snapshot(), before);
});
void test('invalid or subsequently edited files return only bounded check errors, never identities or a plan', async () => {
  const file = sample();
  await store.recoveryPreview(org, 'outing', { file });
  file.records.events[0].activity = 'missing';
  const result = await store.recoveryPreview(org, 'outing', {
    file,
    organizer_mapping: history(),
  });
  assert.equal(result.check.valid, false);
  assert.equal(result.plan, null);
  assert.deepEqual(result.accounts, []);
  assert.deepEqual(result.identities, []);
  assert.equal(result.importer, null);
});
void test('valid and invalid previews leave every application table byte-equivalent, including expired secrets', async () => {
  const link = await store.issue(org, 'outing', 'alex-outing');
  await store.q('UPDATE codes SET send_until=0 WHERE id=?', link.id).run();
  const before = await snapshot();
  await store.recoveryPreview(org, 'outing', { file: sample() });
  await store.recoveryPreview(org, 'outing', {
    file: sample(),
    organizer_mapping: history(),
  });
  await store.recoveryPreview(org, 'outing', {
    file: { ...sample(), schema_version: 99 },
  });
  assert.equal(await snapshot(), before);
});
void test('members, previews and unassigned organizers cannot obtain organizer choices', async () => {
  for (const actor of [
    { kind: 'member' as const, member: 'alex-outing', digest: 'none' },
    { kind: 'preview' as const, id: 'a', member: 'alex-outing' },
    { kind: 'organizer' as const, id: 'c' },
  ])
    await assert.rejects(
      store.recoveryPreview(actor, 'outing', { file: sample() }),
      /Organizer access/,
    );
});
for (const mutation of ['remove-importer', 'remove-target', 'rename-target'])
  void test('final roster check rejects ' + mutation, async () => {
    const current = await store.createFling(org, { title: mutation });
    await store.assignOrganizer(org, current.id, 'b');
    const q = store.q.bind(store);
    let reads = 0;
    store.q = (...args: Parameters<typeof store.q>) => {
      const statement = q(...args);
      if (args[0].includes('SELECT o.id,o.name') && ++reads === 2)
        return {
          all: async () => {
            if (mutation === 'rename-target')
              await q(
                "UPDATE organizers SET name='Changed account' WHERE id='b'",
              ).run();
            else
              await q(
                'DELETE FROM assignments WHERE fling=? AND organizer=?',
                current.id,
                mutation === 'remove-importer' ? 'a' : 'b',
              ).run();
            return statement.all();
          },
        } as D1PreparedStatement;
      return statement;
    };
    try {
      await assert.rejects(
        store.recoveryPreview(org, current.id, {
          file: sample(),
          organizer_mapping: history().map((r: { source: string }) => ({
            source: r.source,
            target: 'b',
          })),
        }),
        /Organizer access|accounts changed/,
      );
    } finally {
      store.q = q;
      await q("UPDATE organizers SET name='Rowan' WHERE id='b'").run();
    }
  });
void test('HTTP preview enforces current organizer, CSRF, origin, 8 MiB and ordinary-form limits', async () => {
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
    path = 'outing/organizer/recovery/restore-preview',
  ) =>
    handle(
      new Request(origin + '/api/flings/' + path, {
        method: 'POST',
        headers: { ...headers, ...extra },
        body,
      }),
      env,
    );
  const file = sample();
  file.migration_notes = 'A'.repeat(20000);
  const before = await snapshot(),
    body = JSON.stringify({ file, organizer_mapping: history() });
  const r = await call(body);
  assert.equal(r.status, 200);
  assert.ok(((await r.json()) as { plan: unknown }).plan);
  assert.match(r.headers.get('cache-control')!, /no-store, private/);
  for (const extra of [
    { Origin: 'https://other.invalid' },
    { 'x-flings-csrf': '' },
    { 'x-flings-organizer': 'b' },
    { Cookie: '' },
  ])
    assert.ok((await call(body, extra)).status >= 400);
  assert.equal((await call('{broken')).status, 400);
  assert.equal((await call(' '.repeat(8 * 1024 * 1024) + '{}')).status, 413);
  assert.equal(
    (await call(body, {}, 'outing/organizer/recovery/export')).status,
    413,
  );
  assert.equal(await snapshot(), before);
});
