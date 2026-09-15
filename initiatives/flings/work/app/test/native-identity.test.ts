import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { handle, type Bindings } from '../lib/http.ts';
import { RecoveryRestoreStore } from '../lib/recovery-restore.ts';
import { seed } from '../lib/fixtures.ts';
const origin = 'https://native-flings.example.invalid';
const secret = 'fictional-native-test-secret-at-least-32-characters';
const entries = [
  { email: 'one@example.invalid', name: 'Organizer One' },
  { email: 'two@example.invalid', name: 'Organizer Two' },
];
let mf: Miniflare, db: D1Database;
const identity = (n = 1) => ({
  'oai-authenticated-user-id': `site-person-${n}`,
  'oai-authenticated-user-email': `${n === 1 ? 'one' : 'two'}@example.invalid`,
});
const env = (): Bindings => ({
  DB: db,
  FLINGS_SECRET: secret,
  FLINGS_MODE: 'chatgpt',
  FLINGS_ORIGIN: origin,
  FLINGS_ORGANIZERS: JSON.stringify(entries),
});
async function request(
  path: string,
  method = 'GET',
  input?: unknown,
  headers: Record<string, string> = identity(),
  overrides: Partial<Bindings> = {},
  host = origin,
) {
  return handle(
    new Request(host + '/api/flings/' + path, {
      method,
      headers: { Origin: host, 'Content-Type': 'application/json', ...headers },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }),
    { ...env(), ...overrides },
  );
}
async function open(n = 1) {
  const response = await request(
    'native/open',
    'POST',
    {},
    { ...identity(n), 'x-flings-native': '1' },
  );
  assert.equal(response.status, 200, await response.clone().text());
  const workspace = await request(
    'workspace/organizer',
    'GET',
    undefined,
    identity(n),
  );
  assert.equal(workspace.status, 200);
  const data = (await workspace.json()) as {
    organizer: string;
    csrf: string;
    flings: unknown[];
  };
  return {
    data,
    headers: {
      ...identity(n),
      'x-flings-organizer': data.organizer,
      'x-flings-csrf': data.csrf,
    },
  };
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  const dir = new URL('../drizzle/', import.meta.url);
  for (const name of (await readdir(dir))
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(new URL(name, dir), 'utf8');
    await db.batch(
      sql
        .split('--> statement-breakpoint')
        .filter((x) => x.trim())
        .map((x) => db.prepare(x)),
    );
  }
  await seed(new RecoveryRestoreStore(db, secret));
});
after(async () => {
  await mf?.dispose();
});

void test('native enrollment is explicit, origin-bound, allowlisted and never accepts fictional impersonation', async () => {
  for (const [headers, overrides, host] of [
    [{}, {}, origin],
    [
      {
        ...identity(),
        'oai-authenticated-user-email': 'outsider@example.invalid',
      },
      {},
      origin,
    ],
    [identity(), { FLINGS_ORGANIZERS: 'broken' }, origin],
    [
      identity(),
      { FLINGS_ORGANIZERS: JSON.stringify([entries[0], entries[0]]) },
      origin,
    ],
    [identity(), {}, 'https://wrong.example.invalid'],
    [
      identity(),
      { FLINGS_ORIGIN: 'http://native-flings.example.invalid' },
      'http://native-flings.example.invalid',
    ],
  ] as [Record<string, string>, Partial<Bindings>, string][]) {
    assert.notEqual(
      (
        await request(
          'native/open',
          'POST',
          {},
          { ...headers, 'x-flings-native': '1' },
          overrides,
          host,
        )
      ).status,
      200,
    );
  }
  assert.equal(
    (await request('native/open', 'POST', {}, identity())).status,
    403,
  );
  assert.equal(
    (
      await request(
        'native/open',
        'POST',
        {},
        {
          ...identity(),
          'x-flings-native': '1',
          Origin: 'https://foreign.invalid',
        },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'local/organizer',
        'POST',
        { organizer: 'a' },
        { ...identity(), 'x-flings-local': '1' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'local/open',
        'POST',
        { example: 'outing' },
        { ...identity(), 'x-flings-local': '1' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM organizers WHERE subject LIKE 'chatgpt:%'",
        )
        .first<{ count: number }>()
    )?.count,
    0,
  );
});
void test('two native identities enroll once without inheriting fictional assignments', async () => {
  const [a, b, duplicate] = await Promise.all([open(1), open(2), open(1)]);
  assert.equal(a.data.organizer, duplicate.data.organizer);
  assert.notEqual(a.data.organizer, b.data.organizer);
  assert.deepEqual(a.data.flings, []);
  assert.deepEqual(b.data.flings, []);
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM organizers WHERE subject LIKE 'chatgpt:%'",
        )
        .first<{ count: number }>()
    )?.count,
    2,
  );
  assert.equal(
    (await request('outing/organizer', 'GET', undefined, a.headers)).status,
    409,
  );
});
void test('email reuse cannot replace a pinned identity; allowlist removal denies existing accounts', async () => {
  assert.equal(
    (
      await request(
        'native/open',
        'POST',
        {},
        {
          ...identity(),
          'oai-authenticated-user-id': 'replacement-person',
          'x-flings-native': '1',
        },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'native/open',
        'POST',
        {},
        {
          ...identity(2),
          'oai-authenticated-user-id': 'site-person-1',
          'x-flings-native': '1',
        },
      )
    ).status,
    403,
  );
  const a = await open();
  assert.equal(
    (
      await request('workspace/organizer', 'GET', undefined, a.headers, {
        FLINGS_ORGANIZERS: JSON.stringify([entries[1]]),
      })
    ).status,
    403,
  );
});
void test('native writes require current account, origin and account-bound CSRF', async () => {
  const a = await open(),
    b = await open(2);
  assert.equal(
    (
      await request(
        'workspace/organizer',
        'POST',
        { title: 'Blocked' },
        identity(),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'workspace/organizer',
        'POST',
        { title: 'Blocked' },
        { ...b.headers, 'x-flings-csrf': a.data.csrf },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'workspace/organizer',
        'POST',
        { title: 'Blocked' },
        { ...a.headers, ...identity(2) },
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        'workspace/organizer',
        'POST',
        { title: 'Blocked' },
        { ...a.headers, Origin: 'https://foreign.invalid' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'workspace/organizer',
        'POST',
        { title: 'Blocked' },
        a.headers,
        { FLINGS_ORGANIZERS: JSON.stringify([...entries].reverse()) },
      )
    ).status,
    403,
  );
  const created = await request(
    'workspace/organizer',
    'POST',
    { title: 'Native fictional gathering' },
    a.headers,
  );
  assert.equal(created.status, 201);
  const { id } = (await created.json()) as { id: string };
  assert.equal(
    (await request(id + '/organizer', 'GET', undefined, b.headers)).status,
    409,
  );
  assert.equal(
    (await request(id + '/organizer', 'GET', undefined, a.headers)).status,
    200,
  );
});
void test('native previews bind to identity and assignment; members still need a capability', async () => {
  const a = await open();
  const store = new RecoveryRestoreStore(db, secret);
  await db
    .prepare('INSERT INTO assignments(fling,organizer) VALUES(?,?)')
    .bind('outing', a.data.organizer)
    .run();
  const response = await request(
    'outing/organizer/alex-outing/preview',
    'POST',
    {},
    a.headers,
  );
  assert.equal(response.status, 200, await response.clone().text());
  const { url } = (await response.json()) as { url: string };
  const previewHeaders = {
    ...identity(),
    Authorization: 'Bearer ' + url.split('#preview=')[1],
  };
  assert.equal(
    (
      await request(
        'outing/member/alex-outing',
        'GET',
        undefined,
        previewHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request('outing/member/alex-outing', 'GET', undefined, {
        ...previewHeaders,
        ...identity(2),
      })
    ).status,
    403,
  );
  assert.equal(
    (await request('outing/member/alex-outing', 'GET', undefined, identity()))
      .status,
    409,
  );
  assert.equal(
    (await request('outing/member/alex-outing', 'PUT', {}, previewHeaders))
      .status,
    403,
  );
  const issued = await store.issue(
    { kind: 'organizer', id: a.data.organizer },
    'outing',
    'alex-outing',
  );
  const exchange = await request(
    'outing/exchange',
    'POST',
    { code: issued.code },
    { 'x-flings-exchange': '1', 'cf-connecting-ip': '192.0.2.10' },
  );
  assert.equal(exchange.status, 200);
  assert.match(
    exchange.headers.get('set-cookie') || '',
    /HttpOnly; SameSite=Strict;.*Secure/,
  );
  await db
    .prepare('DELETE FROM assignments WHERE fling=? AND organizer=?')
    .bind('outing', a.data.organizer)
    .run();
  assert.equal(
    (
      await request(
        'outing/member/alex-outing',
        'GET',
        undefined,
        previewHeaders,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request('outing/organizer', 'GET', undefined, a.headers)).status,
    409,
  );
});
void test('native status discloses only the current viewer and no enrollment list', async () => {
  const response = await request('native/status');
  assert.deepEqual(await response.json(), {
    native: true,
    rehearsal: false,
    signedIn: true,
    email: entries[0].email,
  });
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.match(response.headers.get('vary') || '', /oai-authenticated-user-id/);
  const anonymous = await request('native/status', 'GET', undefined, {});
  assert.deepEqual(await anonymous.json(), {
    native: true,
    rehearsal: false,
    signedIn: false,
    email: '',
  });
});
