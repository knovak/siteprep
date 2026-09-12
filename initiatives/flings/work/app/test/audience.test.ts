import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AudienceStore } from '../lib/audience.ts';
import { digest, type Actor } from '../lib/access.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
const secret = 'fictional-audience-secret-over-32-characters';
const org: Actor = { kind: 'organizer', id: 'a' };
let mf: Miniflare, store: AudienceStore, now: number;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new AudienceStore(
    (await mf.getD1Database('DB')) as unknown as D1Database,
    secret,
    () => now,
  );
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter((x) => x.endsWith('.sql'))
    .sort())
    await store.db.batch(
      (await readFile(new URL(file, dir), 'utf8'))
        .split('--> statement-breakpoint')
        .filter((x) => x.trim())
        .map((x) => store.db.prepare(x)),
    );
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  now = Date.UTC(2026, 8, 12);
  for (const table of [
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
});
const rev = async () =>
  Number(
    (await store.q("SELECT revision FROM flings WHERE id='outing'").first())!
      .revision,
  );
const audience = async (input: Record<string, unknown> = {}) =>
  store.audience(org, 'outing', { revision: await rev(), ...input });
const ids = (result: Awaited<ReturnType<typeof audience>>) =>
  result.deliveries.map((d) => d.id).sort();
async function member(id = 'alex-outing') {
  const link = await store.issue(org, 'outing', id),
    session = await store.exchange('outing', link.code);
  return {
    actor: {
      kind: 'member',
      member: id,
      digest: await digest(session.token),
    } as Actor,
    session,
  };
}
const respond = async (actor: Actor, id: string, state: string) =>
  store.respond(actor, 'outing', id, {
    activity: 'movie',
    state,
    revision: await rev(),
  });
void test('three groups and channel restrictions respect preferences without substitution', async () => {
  assert.deepEqual(ids(await audience()), [
    'alex-outing:email',
    'alex-outing:text',
    'another-outing:email',
  ]);
  assert.deepEqual(
    ids(await audience({ group: 'accepted', activity: 'movie' })),
    ['alex-outing:email', 'alex-outing:text'],
  );
  assert.equal(
    (await audience({ group: 'invitees', activity: 'movie' })).selected_members,
    2,
  );
  const text = await audience({ channel: 'text' });
  assert.deepEqual(ids(text), ['alex-outing:text']);
  assert.equal(text.omissions[0].member, 'another-outing');
  assert.deepEqual(ids(await audience({ channel: 'email' })), [
    'alex-outing:email',
    'another-outing:email',
  ]);
  await assert.rejects(audience({ channel: 'fax' }));
  await assert.rejects(audience({ group: 'accepted', activity: 'ceremony' }));
});
void test('incomplete profiles are visible omissions and duplicate destinations never merge memberships', async () => {
  await store.createMember(org, 'outing', {
    name: 'Missing phone',
    email: 'missing@example.invalid',
    phone: '',
    preference: 'both',
  });
  await store.updateProfile(
    org,
    'outing',
    'another-outing',
    {
      name: 'Robin Reed',
      email: 'ALEX@example.invalid',
      phone: '',
      preference: 'email',
    },
    0,
  );
  const r = await audience();
  assert.equal(r.selected_members, 3);
  assert.equal(r.deliveries.length, 3);
  assert.equal(r.omissions.length, 1);
  assert.match(r.omissions[0].reason, /Incomplete/);
  assert.equal(r.duplicates.length, 1);
  assert.equal(r.duplicates[0].members.length, 2);
  assert.equal(new Set(r.deliveries.map((d) => d.id)).size, 3);
  assert.deepEqual(
    r.deliveries
      .filter((d) => d.channel === 'email')
      .map((d) => d.profile_revision)
      .sort((a, b) => a - b),
    [0, 1],
  );
});
void test('individual selection is an intersection and rejects foreign or duplicate memberships', async () => {
  assert.deepEqual(
    ids(
      await audience({
        filter: 'individuals',
        individuals: ['another-outing'],
      }),
    ),
    ['another-outing:email'],
  );
  assert.deepEqual(
    ids(
      await audience({
        group: 'accepted',
        activity: 'movie',
        filter: 'individuals',
        individuals: ['another-outing'],
      }),
    ),
    [],
  );
  for (const individuals of [
    [],
    ['alex-concerts'],
    ['alex-outing', 'alex-outing'],
  ])
    await assert.rejects(audience({ filter: 'individuals', individuals }));
});
void test('unanswered invitations distinguish invitees, declines and withdrawals', async () => {
  assert.deepEqual(
    ids(await audience({ filter: 'unanswered-invitation', activity: 'movie' })),
    ['another-outing:email'],
  );
  const other = (await member('another-outing')).actor;
  await respond(other, 'another-outing', 'declined');
  assert.deepEqual(
    ids(await audience({ filter: 'unanswered-invitation', activity: 'movie' })),
    [],
  );
  await store.invite(org, 'outing', {
    revision: await rev(),
    member: 'another-outing',
    activity: 'movie',
    state: 'withdrawn',
  });
  assert.equal(
    (await audience({ group: 'invitees', activity: 'movie' })).selected_members,
    1,
  );
});
void test('unanswered polls use their reviewed subset, latest response and invitation generation', async () => {
  const a = (await member()).actor,
    b = (await member('another-outing')).actor;
  await respond(b, 'another-outing', 'accepted');
  const p = await store.poll(org, 'outing', {
    revision: await rev(),
    activity: 'movie',
    event: 'dinner',
    title: 'Choice',
    options: ['A', 'B'],
    multiple: true,
    members: ['alex-outing'],
  });
  const query = { filter: 'unanswered-poll', poll: p.id };
  assert.deepEqual(ids(await audience(query)), [
    'alex-outing:email',
    'alex-outing:text',
  ]);
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: p.id,
    choices: [0],
  });
  assert.deepEqual(ids(await audience(query)), []);
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: p.id,
    choices: [],
  });
  assert.equal((await audience(query)).selected_members, 1);
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: p.id,
    choices: [1],
  });
  await respond(a, 'alex-outing', 'declined');
  await respond(a, 'alex-outing', 'accepted');
  assert.equal((await audience(query)).selected_members, 1);
  await store.poll(org, 'outing', {
    revision: await rev(),
    id: p.id,
    action: 'close',
  });
  await assert.rejects(audience(query));
});
void test('outstanding groups use confirmed balances and retain declined members in the all-active group', async () => {
  const a = (await member()).actor,
    p = await store.payment(org, 'outing', {
      revision: await rev(),
      activity: 'movie',
      event: 'dinner',
      member: 'alex-outing',
      title: 'Meal',
      currency: 'USD',
      amount: 1000,
      link: '',
    });
  const query = { filter: 'outstanding-payment' };
  assert.equal((await audience(query)).selected_members, 1);
  const report = await store.ledger(a, 'outing', {
    revision: await rev(),
    request: p.id,
    kind: 'report',
    amount: 1000,
    note: '',
  });
  assert.equal((await audience(query)).selected_members, 1);
  await respond(a, 'alex-outing', 'declined');
  assert.equal((await audience(query)).selected_members, 1);
  assert.equal(
    (await audience({ ...query, group: 'accepted', activity: 'movie' }))
      .selected_members,
    0,
  );
  await store.ledger(org, 'outing', {
    revision: await rev(),
    request: p.id,
    kind: 'confirm',
    amount: 1000,
    report: report.id,
    note: 'Checked',
  });
  assert.equal((await audience(query)).selected_members, 0);
});
void test('audience review requires current organizer authority, open state and revision', async () => {
  const a = (await member()).actor;
  await assert.rejects(store.audience(a, 'outing', { revision: await rev() }));
  await assert.rejects(
    store.audience(
      { kind: 'preview', id: 'a', member: 'alex-outing' },
      'outing',
      { revision: await rev() },
    ),
  );
  await assert.rejects(store.audience(org, 'concerts', { revision: 0 }));
  const stale = await rev();
  await store.setState(org, 'outing', {
    revision: stale,
    state: 'closed',
    confirm: true,
  });
  await assert.rejects(audience());
  await assert.rejects(audience({ revision: stale }));
  await store.setState(org, 'outing', {
    revision: await rev(),
    state: 'open',
    confirm: true,
  });
  assert.equal((await audience()).selected_members, 2);
});
void test('review returns no credentials and changes no member, revision, audit or code records', async () => {
  const tables = ['members', 'flings', 'audit', 'codes', 'sessions'];
  const read = async () =>
    Promise.all(
      tables.map(
        async (t) => (await store.q(`SELECT * FROM ${t}`).all()).results,
      ),
    );
  const before = await read();
  const r = await audience();
  const after = await read();
  assert.deepEqual(before, after);
  assert.equal(JSON.stringify(r).includes('alex-concerts'), false);
  assert.ok(
    !/"(?:code|digest|ciphertext|session|token|csrf)"/.test(JSON.stringify(r)),
  );
  assert.equal(
    (await store.q('SELECT COUNT(*) AS n FROM guards').first())!.n,
    0,
  );
});
void test('HTTP audience review requires organizer cookie, expected identity, origin and CSRF', async () => {
  const env = {
      DB: store.db,
      FLINGS_SECRET: secret,
      FLINGS_MODE: 'local',
      FLINGS_ORIGIN: 'http://localhost:5187',
    },
    base = env.FLINGS_ORIGIN + '/api/flings/';
  const login = await handle(
    new Request(base + 'local/organizer', {
      method: 'POST',
      headers: {
        Origin: env.FLINGS_ORIGIN,
        'Content-Type': 'application/json',
        'x-flings-local': '1',
      },
      body: JSON.stringify({ organizer: 'a' }),
    }),
    env,
  );
  const { csrf } = (await login.json()) as { csrf: string },
    cookie = login.headers.get('set-cookie')!.split(';')[0];
  const call = (headers: Record<string, string>) =>
    handle(
      new Request(base + 'outing/organizer/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ revision: 0 }),
      }),
      env,
    );
  assert.equal((await call({ cookie })).status, 403);
  const headers = {
    cookie,
    Origin: env.FLINGS_ORIGIN,
    'x-flings-csrf': csrf,
    'x-flings-organizer': 'a',
  };
  assert.equal((await call(headers)).status, 200);
  assert.equal(
    (await call({ ...headers, 'x-flings-organizer': 'c' })).status,
    409,
  );
});

void test('activity-specific payment audiences exclude obligations in another activity', async () => {
  const a = (await member()).actor;
  await store.author(org, 'outing', 'activity', {
    revision: await rev(),
    title: 'Another activity',
    summary: 'Other',
    details: 'Private',
    state: 'published',
  });
  const activity = (await store
    .q("SELECT id FROM activities WHERE title='Another activity'")
    .first())!.id;
  await store.author(org, 'outing', 'event', {
    revision: await rev(),
    activity,
    title: 'Other event',
    summary: 'Other',
    details: 'Private',
    zone: 'UTC',
    local: '2026-10-03T19:00',
  });
  const event = (await store
    .q('SELECT id FROM events WHERE activity=?', activity)
    .first())!.id;
  await store.invite(org, 'outing', {
    revision: await rev(),
    member: 'alex-outing',
    activity,
    state: 'invited',
  });
  await store.respond(a, 'outing', 'alex-outing', {
    revision: await rev(),
    activity,
    state: 'accepted',
  });
  await store.payment(org, 'outing', {
    revision: await rev(),
    activity,
    event,
    member: 'alex-outing',
    title: 'Other expense',
    currency: 'USD',
    amount: 1000,
    link: '',
  });
  assert.equal(
    (await audience({ filter: 'outstanding-payment' })).selected_members,
    1,
  );
  assert.equal(
    (
      await audience({
        group: 'accepted',
        activity: 'movie',
        filter: 'outstanding-payment',
      })
    ).selected_members,
    0,
  );
  assert.equal(
    (
      await audience({
        group: 'accepted',
        activity,
        filter: 'outstanding-payment',
      })
    ).selected_members,
    1,
  );
});
