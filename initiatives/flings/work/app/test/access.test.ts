import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AccessStore, DAY, digest } from '../lib/access.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
import type { Actor } from '../lib/access.ts';

const secret = 'fictional-test-secret-with-at-least-32-characters';
const org: Actor = { kind: 'organizer', id: 'a' };
const orgB: Actor = { kind: 'organizer', id: 'b' };
const profile = {
  name: 'Alex Updated',
  email: 'alex@example.invalid',
  phone: '+12025550123',
  preference: 'both',
};
let mf: Miniflare, store: AccessStore, now: number;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("test"); } }',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  const db = await mf.getD1Database('DB');
  store = new AccessStore(db as unknown as D1Database, secret, () => now);
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
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  now = Date.UTC(2026, 8, 10);
  for (const table of [
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
});
async function member(
  fling = 'outing',
  id = 'alex-outing',
  actor: Actor = org,
) {
  const link = await store.issue(actor, fling, id);
  const session = await store.exchange(fling, link.code);
  return {
    link,
    session,
    actor: {
      kind: 'member',
      digest: await digest(session.token),
      member: id,
    } as Actor,
  };
}
async function rows(sql: string, ...args: unknown[]) {
  return (await store.q(sql, ...args).all()).results;
}
async function rejects(action: Promise<unknown>) {
  await assert.rejects(action);
}

void test('database constraints enforce fling parents and unique assignments/invitations', async () => {
  await rejects(store.q("INSERT INTO assignments VALUES('outing','a')").run());
  await rejects(
    store
      .q(
        "INSERT INTO invitations VALUES('alex-outing','ceremony','wedding','invited')",
      )
      .run(),
  );
  await rejects(
    store
      .q(
        "INSERT INTO invitations VALUES('alex-outing','movie','outing','invited')",
      )
      .run(),
  );
  await rejects(
    store
      .q(
        "INSERT INTO events(id,fling,activity,title,starts,zone,summary,details) VALUES('bad','wedding','movie','Bad','x','x','x','x')",
      )
      .run(),
  );
});
void test('D1 batch rolls back earlier writes on SQL failure AND rejected ordinary precondition', async () => {
  const before = await rows('SELECT * FROM members ORDER BY id');
  await rejects(
    store.batch(
      org,
      'outing',
      [
        store.q(
          "UPDATE members SET name='should roll back' WHERE id='alex-outing'",
        ),
        store.q("INSERT INTO assignments VALUES('outing','a')"),
      ],
      true,
    ),
  );
  assert.deepEqual(await rows('SELECT * FROM members ORDER BY id'), before);
  await rejects(
    store.batch(
      org,
      'outing',
      [
        store.q(
          "UPDATE members SET name='also rolls back' WHERE id='alex-outing'",
        ),
        store.guard(
          'failed-revision',
          "EXISTS(SELECT 1 FROM members WHERE id='alex-outing' AND revision=99)",
        ),
      ],
      true,
    ),
  );
  assert.deepEqual(await rows('SELECT * FROM members ORDER BY id'), before);
  assert.deepEqual(await rows('SELECT * FROM guards'), []);
});
void test('competing organizer removals preserve exactly one organizer and one audit event', async () => {
  const result = await Promise.allSettled([
    store.removeOrganizer(org, 'wedding', 'b'),
    store.removeOrganizer(orgB, 'wedding', 'a'),
  ]);
  assert.equal(result.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(
    (await rows("SELECT * FROM assignments WHERE fling='wedding'")).length,
    1,
  );
  assert.equal(
    (await rows("SELECT * FROM audit WHERE action='remove-organizer'")).length,
    1,
  );
  const remaining = (
    await rows("SELECT organizer FROM assignments WHERE fling='wedding'")
  )[0] as { organizer: string };
  await rejects(
    store.removeOrganizer(
      { kind: 'organizer', id: remaining.organizer },
      'wedding',
      remaining.organizer,
    ),
  );
  // Reopening a local fixture must not resurrect removed authority.
  await seed(store);
  assert.equal(
    (await rows("SELECT * FROM assignments WHERE fling='wedding'")).length,
    1,
  );
});
void test('organizer authority is per fling, independent of matching contacts and ordinary membership', async () => {
  await rejects(store.issue(org, 'concerts', 'casey-concerts'));
  const c = await member('concerts', 'casey-concerts', {
    kind: 'organizer',
    id: 'c',
  });
  await rejects(store.issue(c.actor, 'outing', 'alex-outing'));
  await rejects(store.projection(c.actor, 'outing', 'alex-outing'));
  await rejects(store.createMember(org, 'concerts', profile));
  await store.assignOrganizer(org, 'outing', 'b');
  await store.removeOrganizer(orgB, 'outing', 'a');
  await rejects(store.updateProfile(org, 'outing', 'alex-outing', profile, 0));
  assert.equal(
    (await store.projection(orgB, 'outing', 'alex-outing')).profile.name,
    'Alex Morgan',
  );
});
void test('codes have 256 random bits, reuse for 14 days, overlap for 35 and purge ciphertext on read', async () => {
  const first = await store.issue(org, 'outing', 'alex-outing');
  assert.match(first.code, /^[\w-]{43}$/);
  assert.equal(first.expires - now, 35 * DAY);
  assert.equal(first.sendUntil - now, 14 * DAY);
  assert.equal(
    (await store.issue(org, 'outing', 'alex-outing')).code,
    first.code,
  );
  now += 14 * DAY;
  await store.projection(org, 'outing', 'alex-outing');
  assert.equal(
    (await rows('SELECT ciphertext FROM codes WHERE id=?', first.id))[0]
      .ciphertext,
    null,
  );
  const [a, b] = await Promise.all([
    store.issue(org, 'outing', 'alex-outing'),
    store.issue(org, 'outing', 'alex-outing'),
  ]);
  assert.equal(a.code, b.code);
  assert.notEqual(first.code, a.code);
  assert.equal((await rows('SELECT * FROM codes')).length, 2);
  await store.exchange('outing', first.code);
  const stored =
    JSON.stringify(await rows('SELECT * FROM codes')) +
    JSON.stringify(await rows('SELECT * FROM audit'));
  assert.ok(!stored.includes(first.code) && !stored.includes(a.code));
  now += 21 * DAY;
  await rejects(store.exchange('outing', first.code));
  await store.exchange('outing', a.code);
});
void test('first use is immutable; day-34 exchange creates independent session valid to day 69', async () => {
  const link = await store.issue(org, 'outing', 'alex-outing');
  now += 34 * DAY;
  const session = await store.exchange('outing', link.code);
  const actor: Actor = {
    kind: 'member',
    member: 'alex-outing',
    digest: await digest(session.token),
  };
  assert.equal(session.expires, now + 35 * DAY);
  const firstUse = (
    await rows('SELECT first_used FROM codes WHERE id=?', link.id)
  )[0].first_used;
  now += DAY / 2;
  await store.exchange('outing', link.code);
  assert.equal(
    (await rows('SELECT first_used FROM codes WHERE id=?', link.id))[0]
      .first_used,
    firstUse,
  );
  now += DAY;
  await rejects(store.exchange('outing', link.code));
  await store.projection(actor, 'outing', 'alex-outing');
  now = session.expires - 1;
  await store.projection(actor, 'outing', 'alex-outing');
  now++;
  await rejects(store.projection(actor, 'outing', 'alex-outing'));
});
void test('single revocation kills only its sessions; emergency replacement kills all old generations', async () => {
  const a = await member();
  now += 14 * DAY;
  const b = await member();
  await store.revoke(org, 'outing', 'alex-outing', a.link.id);
  await rejects(store.projection(a.actor, 'outing', 'alex-outing'));
  await store.projection(b.actor, 'outing', 'alex-outing');
  await rejects(store.exchange('outing', a.link.code));
  const next = await store.issue(org, 'outing', 'alex-outing', true);
  await rejects(store.exchange('outing', b.link.code));
  await rejects(store.projection(b.actor, 'outing', 'alex-outing'));
  await store.exchange('outing', next.code);
  assert.ok(
    (await rows('SELECT * FROM codes WHERE revoked IS NOT NULL')).every(
      (x) => x.ciphertext === null,
    ),
  );
});
void test('revocation versus protected write respects both commit orderings and rejects stale authority', async () => {
  const a = await member();
  await store.projection(a.actor, 'outing', 'alex-outing'); // a stale preflight read
  await store.revoke(org, 'outing', 'alex-outing', a.link.id);
  const before = await rows('SELECT * FROM members');
  const audit = await rows('SELECT * FROM audit');
  await rejects(
    store.updateProfile(a.actor, 'outing', 'alex-outing', profile, 0),
  );
  assert.deepEqual(await rows('SELECT * FROM members'), before);
  assert.deepEqual(await rows('SELECT * FROM audit'), audit);
  const b = await member('wedding', 'jordan-wedding');
  await store.updateProfile(b.actor, 'wedding', 'jordan-wedding', profile, 0);
  await store.removeMember(org, 'wedding', 'jordan-wedding');
  assert.equal(
    (await rows("SELECT name FROM members WHERE id='jordan-wedding'"))[0].name,
    profile.name,
  );
  await rejects(
    store.updateProfile(
      b.actor,
      'wedding',
      'jordan-wedding',
      { ...profile, name: 'Too late' },
      1,
    ),
  );
});
void test('generation change raced with profile write and exchange yields only serializable outcomes', async () => {
  const a = await member();
  const result = await Promise.allSettled([
    store.updateProfile(a.actor, 'outing', 'alex-outing', profile, 0),
    store.issue(org, 'outing', 'alex-outing', true),
  ]);
  assert.equal(result[1].status, 'fulfilled');
  const row = (await rows("SELECT * FROM members WHERE id='alex-outing'"))[0];
  assert.equal(row.generation, 1);
  assert.ok(row.name === 'Alex Morgan' || row.name === profile.name);
  assert.equal(
    (await rows("SELECT * FROM audit WHERE action='edit-profile'")).length,
    row.name === profile.name ? 1 : 0,
  );
  await rejects(store.projection(a.actor, 'outing', 'alex-outing'));
  const b = await member('wedding', 'jordan-wedding');
  const race = await Promise.allSettled([
    store.exchange('wedding', b.link.code),
    store.removeMember(org, 'wedding', 'jordan-wedding'),
  ]);
  assert.equal(race[1].status, 'fulfilled');
  if (race[0].status === 'fulfilled')
    await rejects(
      store.currentMember('wedding', await digest(race[0].value.token)),
    );
  await rejects(store.exchange('wedding', b.link.code));
});
void test('profiles stay independent, allow visible omissions and closed corrections, reject stale revisions', async () => {
  const a = await member();
  const changed = await store.updateProfile(
    a.actor,
    'outing',
    'alex-outing',
    { ...profile, phone: '' },
    0,
  );
  assert.equal(changed.profile.complete, false);
  assert.equal(
    (
      await store.projection(
        { kind: 'organizer', id: 'c' },
        'concerts',
        'alex-concerts',
      )
    ).profile.name,
    'Alex Morgan',
  );
  await rejects(
    store.updateProfile(a.actor, 'outing', 'alex-outing', profile, 0),
  );
  await store.q("UPDATE flings SET state='closed' WHERE id='outing'").run();
  assert.equal(
    (await store.updateProfile(a.actor, 'outing', 'alex-outing', profile, 1))
      .profile.complete,
    true,
  );
  await rejects(store.issue(org, 'outing', 'alex-outing'));
  await rejects(store.createMember(org, 'outing', profile));
  await rejects(
    store.updateProfile(a.actor, 'outing', 'another-outing', profile, 0),
  );
  await rejects(
    store.updateProfile(
      a.actor,
      'outing',
      'alex-outing',
      { ...profile, phone: '555' },
      2,
    ),
  );
  const pending = await store.projection(org, 'wedding', 'lee-wedding');
  assert.equal(pending.profile.complete, false);
  assert.deepEqual(pending.activities, []);
});
void test('member and read-only preview share invitation-state projections with no hidden fields', async () => {
  const a = await member('wedding', 'jordan-wedding');
  const actual = await store.projection(a.actor, 'wedding', 'jordan-wedding');
  const preview: Actor = { kind: 'preview', id: 'a', member: 'jordan-wedding' };
  assert.deepEqual(
    {
      ...(await store.projection(preview, 'wedding', 'jordan-wedding')),
      preview: false,
    },
    actual,
  );
  const json = JSON.stringify(actual);
  for (const forbidden of [
    'DRAFT',
    'CANCELLED SECRET',
    '34 Fictional',
    '56 Sample',
    'PRIVATE CEREMONY',
    'lee-wedding',
    'digest',
    'ciphertext',
  ])
    assert.ok(!json.includes(forbidden), forbidden);
  assert.ok(json.includes('12 Example Lane'));
  assert.equal(actual.activities.length, 4);
  for (const operation of [
    store.updateProfile(preview, 'wedding', 'jordan-wedding', profile, 0),
    store.issue(preview, 'wedding', 'jordan-wedding'),
    store.removeMember(preview, 'wedding', 'jordan-wedding'),
  ])
    await rejects(operation);
  await rejects(store.projection(preview, 'wedding', 'lee-wedding'));
});

const origin = 'http://localhost:5187';
function request(
  path: string,
  method = 'GET',
  data?: unknown,
  headers: Record<string, string> = {},
  host = origin,
) {
  return new Request(host + '/api/flings/' + path, {
    method,
    headers: {
      Origin: host,
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function api(req: Request, extra: Record<string, string> = {}) {
  return handle(req, {
    DB: store.db,
    FLINGS_SECRET: secret,
    FLINGS_MODE: 'local',
    FLINGS_ORIGIN: origin,
    ...extra,
  });
}
async function httpMember(fling = 'outing', id = 'alex-outing') {
  const link = await store.issue(org, fling, id);
  const res = await api(
    request(
      fling + '/exchange',
      'POST',
      { code: link.code },
      { 'x-flings-exchange': '1' },
    ),
  );
  assert.equal(res.status, 200);
  return {
    link,
    cookie: res.headers.get('set-cookie')!.split(';')[0],
    ...((await res.json()) as { csrf: string; member: string }),
  };
}
void test('HTTP binds cookie to fling AND expected member; no shared-cache reuse or forged organizer headers', async () => {
  const a = await httpMember();
  const r = await api(
    request('outing/member/alex-outing', 'GET', undefined, {
      Cookie: a.cookie,
    }),
  );
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control')!, /no-store/);
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(
    (
      await api(
        request('wedding/member/jordan-wedding', 'GET', undefined, {
          Cookie: a.cookie,
        }),
      )
    ).status,
    409,
  );
  const other = await httpMember('outing', 'another-outing');
  assert.equal(
    (
      await api(
        request(
          'outing/member/alex-outing',
          'PUT',
          { ...profile, revision: 0 },
          { Cookie: other.cookie, 'x-flings-csrf': other.csrf },
        ),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await api(
        request(
          'outing/organizer/alex-outing/issue',
          'POST',
          {},
          { 'x-organizer-id': 'a' },
        ),
      )
    ).status,
    401,
  );
  assert.equal(
    (await rows("SELECT name FROM members WHERE id='alex-outing'"))[0].name,
    'Alex Morgan',
  );
});
void test('HTTP requires origin and session CSRF; rejects preview mutations even with organizer cookie', async () => {
  const a = await httpMember();
  const path = 'outing/member/alex-outing',
    data = { ...profile, revision: 0 };
  assert.equal(
    (await api(request(path, 'PUT', data, { Cookie: a.cookie }))).status,
    403,
  );
  assert.equal(
    (
      await api(
        request(path, 'PUT', data, {
          Cookie: a.cookie,
          'x-flings-csrf': a.csrf,
          Origin: 'https://elsewhere.invalid',
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        request(path, 'PUT', data, {
          Cookie: a.cookie,
          'x-flings-csrf': a.csrf,
        }),
      )
    ).status,
    200,
  );
  const organizer = await api(
    request(
      'local/organizer',
      'POST',
      { organizer: 'a' },
      { 'x-flings-local': '1' },
    ),
  );
  const oc = organizer.headers.get('set-cookie')!.split(';')[0];
  const csrf = ((await organizer.json()) as { csrf: string }).csrf;
  const pr = await api(
    request(
      'outing/organizer/alex-outing/preview',
      'POST',
      {},
      { Cookie: oc, 'x-flings-csrf': csrf },
    ),
  );
  assert.equal(pr.status, 200);
  const url = ((await pr.json()) as { url: string }).url;
  const token = url.split('#preview=')[1];
  const previewHeaders = {
    Authorization: 'Bearer ' + token,
    Cookie: oc,
    'x-flings-csrf': csrf,
  };
  assert.equal(
    (await api(request(path, 'GET', undefined, previewHeaders))).status,
    200,
  );
  assert.equal(
    (await api(request(path, 'PUT', { ...data, revision: 1 }, previewHeaders)))
      .status,
    403,
  );
  const removed = await api(
    request(
      'wedding/organizer/assignments/remove',
      'POST',
      { organizer: 'b', confirm: true },
      { Cookie: oc, 'x-flings-csrf': csrf },
    ),
  );
  assert.equal(removed.status, 200);
  assert.equal(
    (await rows("SELECT * FROM assignments WHERE fling='wedding'")).length,
    1,
  );
});
void test('HTTPS session flags are secure; hosted organizer mode fails closed; malformed links generic and limited', async () => {
  const link = await store.issue(org, 'outing', 'alex-outing');
  const host = 'https://flings.example.invalid';
  const res = await api(
    request(
      'outing/exchange',
      'POST',
      { code: link.code },
      { 'x-flings-exchange': '1', 'cf-connecting-ip': '192.0.2.1' },
      host,
    ),
    { FLINGS_MODE: 'hosted', FLINGS_ORIGIN: host },
  );
  assert.equal(res.status, 200);
  assert.match(
    res.headers.get('set-cookie')!,
    /HttpOnly; SameSite=Strict; Max-Age=3024000; Secure/,
  );
  assert.equal(
    (
      await api(
        request(
          'local/organizer',
          'POST',
          { organizer: 'a' },
          { 'x-flings-local': '1' },
          host,
        ),
        { FLINGS_MODE: 'hosted', FLINGS_ORIGIN: host },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        request('outing/organizer/alex-outing/issue', 'POST', {}, {}, host),
        { FLINGS_MODE: 'hosted', FLINGS_ORIGIN: host },
      )
    ).status,
    503,
  );
  const invalid = await api(
    request(
      'outing/exchange',
      'POST',
      { code: 'wrong' },
      { 'x-flings-exchange': '1' },
    ),
  );
  const unknown = await api(
    request(
      'outing/exchange',
      'POST',
      { code: 'a'.repeat(43) },
      { 'x-flings-exchange': '1' },
    ),
  );
  assert.equal(invalid.status, 401);
  assert.equal(await invalid.text(), await unknown.text());
  for (let i = 0; i < 18; i++)
    await api(
      request(
        'outing/exchange',
        'POST',
        { code: 'wrong' },
        { 'x-flings-exchange': '1' },
      ),
    );
  assert.equal(
    (
      await api(
        request(
          'outing/exchange',
          'POST',
          { code: 'wrong' },
          { 'x-flings-exchange': '1' },
        ),
      )
    ).status,
    429,
  );
});

void test('HTTP bounds input and rejects non-object forms without leaking database errors', async () => {
  assert.equal(
    (
      await api(
        request('local/organizer', 'POST', 'x'.repeat(17000), {
          'x-flings-local': '1',
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await api(
        request('local/organizer', 'POST', [], { 'x-flings-local': '1' }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        request(
          'local/organizer',
          'POST',
          {},
          { 'Content-Type': 'text/plain', 'x-flings-local': '1' },
        ),
      )
    ).status,
    415,
  );
});

void test('day 0, 14 and 28 codes have exact independent boundaries and audits retain profile revisions', async () => {
  const start = now;
  const a = await store.issue(org, 'outing', 'alex-outing');
  now = start + 14 * DAY - 1;
  assert.equal((await store.issue(org, 'outing', 'alex-outing')).code, a.code);
  now++;
  const b = await store.issue(org, 'outing', 'alex-outing');
  now = start + 28 * DAY;
  const c = await store.issue(org, 'outing', 'alex-outing');
  for (const link of [a, b, c]) await store.exchange('outing', link.code);
  now = start + 35 * DAY - 1;
  await store.exchange('outing', a.code);
  now++;
  await rejects(store.exchange('outing', a.code));
  now++;
  await rejects(store.exchange('outing', a.code));
  for (const link of [b, c]) await store.exchange('outing', link.code);
  const made = await store.createMember(org, 'outing', {
    ...profile,
    preference: 'text',
    phone: '',
  });
  assert.equal(
    (await store.projection(org, 'outing', made.id)).profile.complete,
    false,
  );
  await store.updateProfile(org, 'outing', made.id, profile, 0);
  assert.deepEqual(
    (
      await rows(
        'SELECT revision FROM audit WHERE object=? ORDER BY at,action',
        made.id,
      )
    )
      .map((x) => Number(x.revision))
      .sort((a, b) => a - b),
    [0, 1],
  );
});
