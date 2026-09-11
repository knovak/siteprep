import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { DAY, digest } from '../lib/access.ts';
import { JourneyStore } from '../lib/journeys.ts';
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
let mf: Miniflare, store: JourneyStore, now: number;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("test"); } }',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  const db = await mf.getD1Database('DB');
  store = new JourneyStore(db as unknown as D1Database, secret, () => now);
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

void test('organizer workspace lists only assignments and denies other roles', async () => {
  assert.deepEqual(
    (await store.assigned(org))
      .map((x) => String(x.id))
      .sort((a, b) => a.localeCompare(b)),
    ['outing', 'wedding'],
  );
  const { actor } = await member('concerts', 'casey-concerts', {
    kind: 'organizer',
    id: 'c',
  });
  await rejects(store.assigned(actor));
  await rejects(store.overview(org, 'concerts'));
  await rejects(
    store.overview(
      { kind: 'preview', id: 'a', member: 'alex-outing' },
      'outing',
    ),
  );
});
void test('invite, respond, decline, reaccept and withdraw preserve independent projections', async () => {
  for (const [fling, id, activity, organizer] of [
    ['outing', 'another-outing', 'movie', 'a'],
    ['wedding', 'jordan-wedding', 'ceremony', 'a'],
    ['concerts', 'casey-concerts', 'autumn', 'c'],
  ]) {
    const o: Actor = { kind: 'organizer', id: organizer };
    const { actor } = await member(fling, id, o);
    let revision = 0;
    for (const state of ['accepted', 'declined', 'accepted']) {
      await store.respond(actor, fling, id, {
        activity,
        state,
        revision: revision++,
      });
      const view = await store.projection(actor, fling, id);
      assert.equal(
        !!view.activities.find((a) => a.id === activity)?.details,
        state === 'accepted',
      );
      const preview = await store.projection(
        { kind: 'preview', id: organizer, member: id },
        fling,
        id,
      );
      assert.deepEqual(preview.activities, view.activities);
    }
    await store.invite(o, fling, {
      member: id,
      activity,
      state: 'invited',
      revision: revision++,
    });
    assert.equal(
      (await store.projection(actor, fling, id)).activities.find(
        (a) => a.id === activity,
      )?.invitation,
      'accepted',
    );
    await store.invite(o, fling, {
      member: id,
      activity,
      state: 'withdrawn',
      revision: revision++,
    });
    assert.ok(
      !(await store.projection(actor, fling, id)).activities.find(
        (a) => a.id === activity,
      ),
    );
    await rejects(
      store.respond(actor, fling, id, {
        activity,
        state: 'accepted',
        revision,
      }),
    );
    await store.invite(o, fling, {
      member: id,
      activity,
      state: 'invited',
      revision: revision++,
    });
    assert.equal(
      (await store.projection(actor, fling, id)).activities.find(
        (a) => a.id === activity,
      )?.details,
      null,
    );
  }
});
void test('closed and stale writes fail atomically; reopening preserves history and permits profiles', async () => {
  const { actor } = await member('wedding', 'jordan-wedding');
  await store.setState(org, 'wedding', {
    state: 'closed',
    revision: 0,
    confirm: true,
  });
  const before = await rows(
    'SELECT * FROM invitations ORDER BY member,activity',
  );
  const auditBefore = await rows('SELECT * FROM audit ORDER BY id');
  for (const revision of [0, 1]) {
    await rejects(
      store.respond(actor, 'wedding', 'jordan-wedding', {
        activity: 'ceremony',
        state: 'accepted',
        revision,
      }),
    );
    await rejects(
      store.invite(org, 'wedding', {
        member: 'lee-wedding',
        activity: 'ceremony',
        state: 'invited',
        revision,
      }),
    );
  }
  assert.deepEqual(
    await rows('SELECT * FROM invitations ORDER BY member,activity'),
    before,
  );
  assert.deepEqual(await rows('SELECT * FROM audit ORDER BY id'), auditBefore);
  await store.updateProfile(
    actor,
    'wedding',
    'jordan-wedding',
    { ...profile, name: 'Jordan corrected' },
    0,
  );
  await rejects(
    store.setState(org, 'wedding', {
      state: 'open',
      revision: 0,
      confirm: true,
    }),
  );
  await store.setState(org, 'wedding', {
    state: 'open',
    revision: 1,
    confirm: true,
  });
  assert.deepEqual(
    await rows('SELECT * FROM invitations ORDER BY member,activity'),
    before,
  );
  await store.respond(actor, 'wedding', 'jordan-wedding', {
    activity: 'ceremony',
    state: 'accepted',
    revision: 2,
  });
});
void test('concurrent responses serialize; child and authority failures leave no state or audit writes', async () => {
  const { actor } = await member('wedding', 'jordan-wedding');
  const race = await Promise.allSettled(
    ['accepted', 'declined'].map((state) =>
      store.respond(actor, 'wedding', 'jordan-wedding', {
        activity: 'ceremony',
        state,
        revision: 0,
      }),
    ),
  );
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  const before = await rows('SELECT * FROM audit ORDER BY id');
  for (const input of [
    { member: 'alex-outing', activity: 'ceremony' },
    { member: 'jordan-wedding', activity: 'movie' },
    { member: 'jordan-wedding', activity: 'draft' },
    { member: 'jordan-wedding', activity: 'cancelled' },
  ])
    await rejects(
      store.invite(org, 'wedding', { ...input, state: 'invited', revision: 1 }),
    );
  await rejects(
    store.respond(
      { kind: 'preview', id: 'a', member: 'jordan-wedding' },
      'wedding',
      'jordan-wedding',
      { activity: 'ceremony', state: 'accepted', revision: 1 },
    ),
  );
  await store.removeOrganizer(orgB, 'wedding', 'a');
  await rejects(
    store.invite(org, 'wedding', {
      member: 'lee-wedding',
      activity: 'ceremony',
      state: 'invited',
      revision: 1,
    }),
  );
  assert.equal(
    (await rows('SELECT * FROM audit ORDER BY id')).length,
    before.length + 1,
  );
  assert.deepEqual(await rows('SELECT * FROM guards'), []);
});
void test('HTTP workspace, invitation, closure and member responses enforce actor and forgery checks', async () => {
  const organizer = await api(
    request(
      'local/organizer',
      'POST',
      { organizer: 'a' },
      { 'x-flings-local': '1' },
    ),
  );
  const cookie = organizer.headers.get('set-cookie')!.split(';')[0];
  const { csrf } = (await organizer.json()) as { csrf: string };
  const headers = {
    Cookie: cookie,
    'x-flings-csrf': csrf,
    'x-flings-organizer': 'a',
  };
  assert.equal(
    (await api(request('workspace/organizer', 'GET', undefined, headers)))
      .status,
    200,
  );
  assert.equal(
    (await api(request('concerts/organizer', 'GET', undefined, headers)))
      .status,
    409,
  );
  assert.equal(
    (
      await api(
        request('wedding/organizer', 'GET', undefined, {
          ...headers,
          'x-flings-organizer': 'b',
        }),
      )
    ).status,
    409,
  );
  const invitation = {
    member: 'lee-wedding',
    activity: 'ceremony',
    state: 'invited',
    revision: 0,
  };
  assert.equal(
    (
      await api(
        request('wedding/organizer/invitation', 'POST', invitation, {
          Cookie: cookie,
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        request('wedding/organizer/invitation', 'POST', invitation, headers),
      )
    ).status,
    200,
  );
  const m = await httpMember('wedding', 'jordan-wedding');
  const mh = { Cookie: m.cookie, 'x-flings-csrf': m.csrf };
  assert.equal(
    (
      await api(
        request(
          'wedding/member/jordan-wedding/respond',
          'POST',
          { activity: 'ceremony', state: 'accepted', revision: 1 },
          mh,
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api(
        request(
          'wedding/organizer/state',
          'POST',
          { state: 'closed', revision: 2, confirm: true },
          headers,
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api(
        request(
          'wedding/member/jordan-wedding/respond',
          'POST',
          { activity: 'ceremony', state: 'declined', revision: 2 },
          mh,
        ),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await api(
        request(
          'wedding/organizer',
          'GET',
          undefined,
          headers,
          'https://flings.example',
        ),
        {
          FLINGS_MODE: 'hosted',
        },
      )
    ).status,
    503,
  );
});

void test('new fling creation assigns only its creator and rejects non-organizers atomically', async () => {
  const created = await store.createFling(org, {
    title: 'Independent test gathering',
  });
  assert.deepEqual(
    await rows('SELECT * FROM assignments WHERE fling=?', created.id),
    [{ fling: created.id, organizer: 'a' }],
  );
  await rejects(store.overview(orgB, created.id));
  const before = await rows('SELECT * FROM flings ORDER BY id');
  await rejects(
    store.createFling(
      { kind: 'organizer', id: 'missing' },
      { title: 'No assignment' },
    ),
  );
  await rejects(
    store.createFling((await member()).actor, { title: 'No authority' }),
  );
  assert.deepEqual(await rows('SELECT * FROM flings ORDER BY id'), before);
});
void test('activity editing, draft hiding, cancellation and ordering share actual member projections', async () => {
  const { actor } = await member();
  const save = async (kind: string, input: Record<string, unknown>) => {
    const overview = await store.overview(org, 'outing');
    return store.author(org, 'outing', kind, {
      ...input,
      revision: (overview.fling as { revision: number }).revision,
    });
  };
  const a = await save('activity', {
    title: 'Second activity',
    summary: 'Public summary',
    details: 'Private meeting',
    state: 'draft',
  });
  await store
    .q(
      "INSERT INTO invitations VALUES(?,?,?,'accepted')",
      'alex-outing',
      a.id,
      'outing',
    )
    .run();
  assert.equal(
    (await store.projection(actor, 'outing', 'alex-outing')).activities.length,
    1,
  );
  await save('activity', {
    id: a.id,
    title: 'Second activity',
    summary: 'Public summary',
    details: 'Private meeting',
    state: 'published',
  });
  await save('order', { ids: [a.id, 'movie'] });
  const projection = await store.projection(actor, 'outing', 'alex-outing');
  assert.deepEqual(
    projection.activities.map((a) => a.id),
    [a.id, 'movie'],
  );
  assert.equal(projection.activities[0].details, 'Private meeting');
  await save('activity', {
    id: a.id,
    title: 'Second activity',
    summary: 'Public summary',
    details: 'Private meeting',
    state: 'cancelled',
  });
  const cancelled = (await store.projection(actor, 'outing', 'alex-outing'))
    .activities[0];
  assert.equal(cancelled.state, 'cancelled');
  assert.equal(cancelled.details, null);
});
void test('authoring rejects cross-fling, stale, closed, member and preview writes without partial state', async () => {
  const { actor } = await member();
  const before = await rows('SELECT * FROM activities ORDER BY id');
  const auditBefore = await rows('SELECT * FROM audit ORDER BY id');
  const input = {
    id: 'ceremony',
    title: 'Wrong parent',
    summary: '',
    details: '',
    state: 'published',
    revision: 0,
  };
  for (const a of [
    org,
    orgB,
    actor,
    { kind: 'preview', id: 'a', member: 'alex-outing' } as Actor,
  ])
    await rejects(store.author(a, 'outing', 'activity', input));
  await rejects(
    store.author(org, 'outing', 'order', {
      ids: ['movie', 'ceremony'],
      revision: 0,
    }),
  );
  await rejects(
    store.author(org, 'outing', 'order', {
      ids: ['movie', 'movie'],
      revision: 0,
    }),
  );
  assert.deepEqual(await rows('SELECT * FROM activities ORDER BY id'), before);
  assert.deepEqual(await rows('SELECT * FROM audit ORDER BY id'), auditBefore);
  const result = await Promise.allSettled(
    ['One', 'Two'].map((title) =>
      store.author(org, 'outing', 'title', { title, revision: 0 }),
    ),
  );
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  await store.setState(org, 'outing', {
    state: 'closed',
    revision: 1,
    confirm: true,
  });
  const closed = await rows('SELECT * FROM flings ORDER BY id');
  await rejects(
    store.author(org, 'outing', 'title', { title: 'Closed edit', revision: 2 }),
  );
  assert.deepEqual(await rows('SELECT * FROM flings ORDER BY id'), closed);
});
void test('events reject gaps and ambiguous inputs, preserve chosen instant and zone, and update visible details', async () => {
  const { actor } = await member();
  const input = {
    activity: 'movie',
    title: 'Late movie',
    summary: 'Evening',
    details: 'Private location',
    zone: 'America/Los_Angeles',
    local: '2026-11-01T01:30',
    revision: 0,
  };
  const before = await rows('SELECT * FROM events ORDER BY id');
  const auditBefore = await rows('SELECT * FROM audit ORDER BY id');
  for (const extra of [
    {},
    { local: '2026-03-08T02:30' },
    { local: '2026-02-30T12:00' },
    { zone: 'invalid' },
    { starts: '2026-11-01T11:30:00.000Z' },
    { activity: 'ceremony', starts: '2026-11-01T09:30:00.000Z' },
  ])
    await rejects(store.author(org, 'outing', 'event', { ...input, ...extra }));
  assert.deepEqual(await rows('SELECT * FROM events ORDER BY id'), before);
  const saved = await store.author(org, 'outing', 'event', {
    ...input,
    starts: '2026-11-01T09:30:00.000Z',
  });
  let event = (
    await store.projection(actor, 'outing', 'alex-outing')
  ).events.find((e) => e.id === saved.id)!;
  assert.equal(event.starts, '2026-11-01T09:30:00.000Z');
  assert.equal(event.zone, input.zone);
  await store.author(org, 'outing', 'event', {
    ...input,
    id: saved.id,
    local: '2026-11-02T19:00',
    revision: 1,
    details: 'New private location',
  });
  event = (await store.projection(actor, 'outing', 'alex-outing')).events.find(
    (e) => e.id === saved.id,
  )!;
  assert.equal(event.starts, '2026-11-03T03:00:00.000Z');
  assert.equal(event.details, 'New private location');
  const invited = (
    await store.projection(org, 'outing', 'another-outing')
  ).events.find((e) => e.id === saved.id)!;
  assert.equal(invited.details, null);
  const added = (await rows('SELECT * FROM audit ORDER BY id')).filter(
    (a) => !auditBefore.some((b) => b.id === a.id),
  );
  assert.deepEqual(
    added.map((a) => a.action),
    ['save-event', 'save-event'],
  );
});

void test('fling settings validate zones and revisions without changing existing event instants', async () => {
  const before = await rows('SELECT * FROM events ORDER BY id');
  const settings = {
    title: 'Weekend',
    description: 'For all members',
    default_zone: 'Australia/Brisbane',
    revision: 0,
  };
  await store.author(org, 'wedding', 'settings', settings);
  assert.deepEqual(await rows('SELECT * FROM events ORDER BY id'), before);
  const projection = await store.projection(
    (await member('wedding', 'jordan-wedding')).actor,
    'wedding',
    'jordan-wedding',
  );
  assert.equal(
    (projection.fling as Record<string, unknown>).description,
    settings.description,
  );
  assert.equal(
    (projection.fling as Record<string, unknown>).default_zone,
    settings.default_zone,
  );
  const audit = await rows('SELECT * FROM audit ORDER BY id');
  await rejects(
    store.author(org, 'wedding', 'settings', {
      ...settings,
      default_zone: 'Invalid/Zone',
      revision: 1,
    }),
  );
  await rejects(store.author(org, 'wedding', 'settings', settings));
  await rejects(
    store.author({ kind: 'organizer', id: 'c' }, 'wedding', 'settings', {
      ...settings,
      revision: 1,
    }),
  );
  assert.deepEqual(await rows('SELECT * FROM audit ORDER BY id'), audit);
});
void test('event ranges reject gap, ambiguous, backwards and unsafe link input without partial writes', async () => {
  const event = {
    activity: 'movie',
    title: 'Screening',
    summary: 'Welcome',
    details: 'Participant details',
    local: '2026-11-01T00:30',
    end_local: '2026-11-01T01:30',
    zone: 'America/Los_Angeles',
    ends: '2026-11-01T09:30:00.000Z',
    invitation_location: 'Downtown',
    location_name: 'Fictional cinema',
    location_address: '123 Fictional Lane',
    location_url: 'https://example.invalid/venue',
    revision: 0,
  };
  for (const override of [
    { ends: '' },
    { ends: '2026-11-01T10:30:00.000Z' },
    { local: '2026-03-08T00:30', end_local: '2026-03-08T02:30', ends: '' },
    { local: '2026-11-01T02:30' },
    { location_url: 'javascript:alert(1)' },
    { location_url: 'https://user:password@example.invalid' },
    { location_url: '//example.invalid' },
    { end_local: '', ends: '2026-11-01T09:30:00.000Z' },
  ]) {
    const before = await rows('SELECT * FROM events ORDER BY id'),
      audit = await rows('SELECT * FROM audit ORDER BY id');
    await rejects(
      store.author(org, 'outing', 'event', { ...event, ...override }),
    );
    assert.deepEqual(await rows('SELECT * FROM events ORDER BY id'), before);
    assert.deepEqual(await rows('SELECT * FROM audit ORDER BY id'), audit);
  }
  const saved = await store.author(org, 'outing', 'event', event);
  const first = (await rows('SELECT * FROM events WHERE id=?', saved.id))[0];
  assert.equal(first.starts, '2026-11-01T07:30:00.000Z');
  assert.equal(first.ends, '2026-11-01T09:30:00.000Z');
  assert.equal(first.changed_at, now);
  now += 60000;
  await store.author(org, 'outing', 'event', {
    ...event,
    id: saved.id,
    end_local: '',
    ends: '',
    revision: 1,
  });
  const changed = (await rows('SELECT * FROM events WHERE id=?', saved.id))[0];
  assert.equal(changed.ends, null);
  assert.equal(changed.changed_at, now);
  assert.equal(changed.location_url, event.location_url);
  assert.deepEqual(await rows('SELECT * FROM guards'), []);
});
void test('private event locations follow accepted member and preview projections in every invitation state', async () => {
  const { actor } = await member();
  const event = {
    activity: 'movie',
    title: 'Private venue event',
    summary: 'Welcome',
    details: 'Participant details',
    local: '2026-12-01T18:00',
    end_local: '2026-12-01T20:00',
    zone: 'Australia/Brisbane',
    invitation_location: 'Public neighborhood',
    location_name: 'SECRET-NAME',
    location_address: 'SECRET-ADDRESS',
    location_url: 'https://example.invalid/SECRET-LINK',
    revision: 0,
  };
  const saved = await store.author(org, 'outing', 'event', event);
  const preview: Actor = { kind: 'preview', id: 'a', member: 'alex-outing' };
  for (const state of ['invited', 'accepted', 'declined', 'withdrawn']) {
    await store
      .q(
        "UPDATE invitations SET state=? WHERE member='alex-outing' AND activity='movie'",
        state,
      )
      .run();
    const memberView = await store.projection(actor, 'outing', 'alex-outing');
    const previewView = await store.projection(
      preview,
      'outing',
      'alex-outing',
    );
    assert.deepEqual(memberView.events, previewView.events);
    const item = memberView.events.find((e) => e.id === saved.id);
    if (state === 'withdrawn') assert.equal(item, undefined);
    else {
      assert.equal(item!.invitation_location, event.invitation_location);
      assert.equal(item!.ends, '2026-12-01T10:00:00.000Z');
      for (const field of ['location_name', 'location_address', 'location_url'])
        assert.equal(
          item![field],
          state === 'accepted' ? event[field as keyof typeof event] : null,
        );
    }
    if (state !== 'accepted')
      assert.equal(JSON.stringify(memberView).includes('SECRET-'), false);
  }
  await store
    .q(
      "UPDATE invitations SET state='accepted' WHERE member='alex-outing' AND activity='movie'",
    )
    .run();
  await store
    .q("UPDATE activities SET state='cancelled' WHERE id='movie'")
    .run();
  assert.equal(
    JSON.stringify(
      await store.projection(actor, 'outing', 'alex-outing'),
    ).includes('SECRET-'),
    false,
  );
  const audit = await rows('SELECT * FROM audit ORDER BY id');
  await rejects(
    store.author(actor, 'outing', 'event', { ...event, revision: 1 }),
  );
  await rejects(
    store.author(preview, 'outing', 'event', { ...event, revision: 1 }),
  );
  await rejects(
    store.author(org, 'wedding', 'event', {
      ...event,
      id: saved.id,
      revision: 0,
    }),
  );
  assert.deepEqual(await rows('SELECT * FROM audit ORDER BY id'), audit);
});
