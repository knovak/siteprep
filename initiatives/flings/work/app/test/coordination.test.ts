import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { CoordinationStore, safeText, safeLink } from '../lib/coordination.ts';
import { digest, type Actor } from '../lib/access.ts';
import { seed } from '../lib/fixtures.ts';
import { handle } from '../lib/http.ts';
const secret = 'fictional-coordination-secret-over-32-characters';
const org: Actor = { kind: 'organizer', id: 'a' };
let mf: Miniflare, store: CoordinationStore, now: number;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new CoordinationStore(
    (await mf.getD1Database('DB')) as unknown as D1Database,
    secret,
    () => now,
  );
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(new URL(file, dir), 'utf8');
    await store.db.batch(
      sql
        .split('--> statement-breakpoint')
        .filter((x) => x.trim())
        .map((x) => store.db.prepare(x)),
    );
  }
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
const snapshot = (actor: Actor = org) => store.coordination(actor, 'outing');
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
const post = async (actor: Actor, extra: Record<string, unknown> = {}) =>
  store.post(actor, 'outing', {
    revision: await rev(),
    activity: 'movie',
    event: 'dinner',
    body: 'Event private text',
    ...extra,
  });
const poll = async (extra: Record<string, unknown> = {}) =>
  store.poll(org, 'outing', {
    revision: await rev(),
    event: 'dinner',
    activity: 'movie',
    title: 'Meal choice',
    options: ['Soup', 'Salad'],
    multiple: false,
    members: ['alex-outing'],
    ...extra,
  });
const pay = async (extra: Record<string, unknown> = {}) =>
  store.payment(org, 'outing', {
    revision: await rev(),
    event: 'dinner',
    activity: 'movie',
    title: 'Meal',
    member: 'alex-outing',
    currency: 'USD',
    amount: 1000,
    link: 'https://example.invalid/pay',
    ...extra,
  });
const ledger = async (
  actor: Actor,
  request: string,
  kind: string,
  amount: number,
  extra: Record<string, unknown> = {},
) =>
  store.ledger(actor, 'outing', {
    revision: await rev(),
    request,
    kind,
    amount,
    note: 'Fictional evidence',
    ...extra,
  });
const respond = async (actor: Actor, state: string) =>
  store.respond(actor, 'outing', 'alex-outing', {
    revision: await rev(),
    activity: 'movie',
    state,
  });
const count = async (table: string) =>
  Number((await store.q(`SELECT COUNT(*) AS n FROM ${table}`).first())!.n);

void test('all discussion scopes follow actual member/preview permission and retain safe text', async () => {
  const accepted = (await member()).actor,
    invited = (await member('another-outing')).actor;
  await post(org, {
    activity: null,
    event: null,
    body: 'Fling <script>alert(1)</script> https://example.invalid/info',
  });
  await post(accepted, { event: null, body: 'Activity private text' });
  await post(accepted);
  assert.equal((await snapshot(accepted)).posts.length, 3);
  const limited = await snapshot(invited);
  assert.equal(limited.posts.length, 1);
  assert.ok(!JSON.stringify(limited).includes('private text'));
  const preview: Actor = { kind: 'preview', id: 'a', member: 'another-outing' };
  assert.deepEqual((await snapshot(preview)).posts, limited.posts);
  await assert.rejects(post(invited));
  await assert.rejects(post(preview, { activity: null, event: null }));
  await assert.rejects(post(org, { event: 'vows' }));
  await assert.rejects(
    store.post(org, 'concerts', {
      revision: 0,
      activity: null,
      event: null,
      body: 'Denied',
    }),
  );
  await respond(accepted, 'declined');
  assert.equal((await snapshot(accepted)).posts.length, 1);
  await respond(accepted, 'accepted');
  assert.equal((await snapshot(accepted)).posts.length, 3);
  await store.invite(org, 'outing', {
    revision: await rev(),
    member: 'alex-outing',
    activity: 'movie',
    state: 'withdrawn',
  });
  assert.equal((await snapshot(accepted)).posts.length, 1);
});
void test('own-post editing, attributed history, organizer hiding and stale edits are atomic', async () => {
  const a = (await member()).actor,
    b = (await member('another-outing')).actor;
  const p = await post(a, { activity: null, event: null });
  const revision = await rev();
  const results = await Promise.allSettled([
    store.post(a, 'outing', { revision, id: p.id, body: 'Edited A' }),
    store.post(a, 'outing', { revision, id: p.id, body: 'Edited B' }),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(await count('post_history'), 1);
  await assert.rejects(
    post(b, { id: p.id, activity: null, event: null, body: 'Impersonation' }),
  );
  await post(org, {
    id: p.id,
    activity: null,
    event: null,
    action: 'hide',
    reason: 'Private information',
  });
  const visible = (await snapshot(a)).posts[0];
  assert.equal(visible.body, '');
  assert.equal(visible.hidden, 1);
  const admin = await snapshot();
  assert.ok(String(admin.posts[0].body).startsWith('Edited'));
  assert.equal(admin.post_history.length, 2);
  assert.equal(
    admin.post_history.find((h) => h.action === 'hide')!.reason,
    'Private information',
  );
  assert.equal((await snapshot(a)).post_history.length, 0);
});
void test('personal links, unsafe URLs and malformed text never enter coordination records', async () => {
  for (const text of [
    'https://host/f/fling/member#code=secret',
    'https://host/#preview=ticket',
    'https://host/#%63ode=secret',
    'https://host/%2566/fling/member',
    'https://host/preview/f/m',
  ])
    assert.throws(() => safeText(text));
  for (const link of [
    'javascript:alert(1)',
    'https://u:p@example.invalid',
    'data:text/html,test',
  ])
    assert.throws(() => safeLink(link));
  assert.equal(
    safeText('<img src=x onerror=alert(1)>'),
    '<img src=x onerror=alert(1)>',
  );
  await assert.rejects(post(org, { body: '#code=secret' }));
  assert.equal(await count('posts'), 0);
  assert.equal(await count('guards'), 0);
});
void test('poll choice modes, reviewed subsets, privacy and immutable replacement', async () => {
  const a = (await member()).actor,
    b = (await member('another-outing')).actor;
  const p = await poll();
  await assert.rejects(
    store.vote(a, 'outing', {
      revision: await rev(),
      poll: p.id,
      choices: [0, 1],
    }),
  );
  await assert.rejects(
    store.vote(b, 'outing', {
      revision: await rev(),
      poll: p.id,
      choices: [0],
    }),
  );
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: p.id,
    choices: [1],
  });
  assert.equal((await snapshot(b)).polls.length, 0);
  const mine = (await snapshot(a)).polls[0];
  assert.deepEqual(mine.choices, [1]);
  assert.equal(mine.totals, null);
  assert.deepEqual(mine.responses, []);
  assert.deepEqual((await snapshot()).polls[0].totals, [0, 1]);
  const next = await poll({
    replaces: p.id,
    multiple: true,
    options: ['One', 'Two', 'Three'],
  });
  assert.equal(
    (await snapshot(a)).polls.find((x) => x.id === p.id)!.closed,
    true,
  );
  await assert.rejects(
    store.vote(a, 'outing', {
      revision: await rev(),
      poll: p.id,
      choices: [0],
    }),
  );
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: next.id,
    choices: [0, 2],
  });
  assert.deepEqual(
    (await snapshot(a)).polls.find((x) => x.id === next.id)!.choices,
    [0, 2],
  );
  assert.equal(await count('votes'), 2);
  await assert.rejects(poll({ members: ['another-outing'] }));
  await assert.rejects(poll({ event: 'vows' }));
});
void test('decline, withdrawal and reacceptance retire votes without deleting history', async () => {
  const a = (await member()).actor,
    p = await poll();
  const vote = async () =>
    store.vote(a, 'outing', {
      revision: await rev(),
      poll: p.id,
      choices: [0],
    });
  await vote();
  await respond(a, 'declined');
  assert.deepEqual((await snapshot()).polls[0].totals, [0, 0]);
  await respond(a, 'accepted');
  assert.deepEqual((await snapshot(a)).polls[0].choices, []);
  await vote();
  await store.invite(org, 'outing', {
    revision: await rev(),
    member: 'alex-outing',
    activity: 'movie',
    state: 'withdrawn',
  });
  assert.deepEqual((await snapshot()).polls[0].totals, [0, 0]);
  await store.invite(org, 'outing', {
    revision: await rev(),
    member: 'alex-outing',
    activity: 'movie',
    state: 'invited',
  });
  await respond(a, 'accepted');
  assert.deepEqual((await snapshot(a)).polls[0].choices, []);
  await vote();
  const state = (await snapshot()).polls[0];
  assert.equal(state.responses.length, 3);
  assert.equal(state.responses.filter((x) => x.current).length, 1);
});
void test('deadline boundary, changed responses, closed polls and stale races use the database guard', async () => {
  const a = (await member()).actor,
    p = await poll({ deadline: now + 1000 });
  const revision = await rev();
  const r = await Promise.allSettled([
    store.vote(a, 'outing', { revision, poll: p.id, choices: [0] }),
    store.vote(a, 'outing', { revision, poll: p.id, choices: [1] }),
  ]);
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: p.id,
    choices: [1],
  });
  assert.equal(await count('votes'), 2);
  now += 1000;
  await assert.rejects(
    store.vote(a, 'outing', {
      revision: await rev(),
      poll: p.id,
      choices: [0],
    }),
  );
  assert.deepEqual((await snapshot(a)).polls[0].totals, [0, 1]);
  const p2 = await poll();
  await store.poll(org, 'outing', {
    revision: await rev(),
    action: 'close',
    id: p2.id,
  });
  await assert.rejects(
    store.vote(a, 'outing', {
      revision: await rev(),
      poll: p2.id,
      choices: [0],
    }),
  );
});
void test('explicit payment allocations are private, integer-based and independent of outside links', async () => {
  const a = (await member()).actor,
    b = (await member('another-outing')).actor;
  const p = await pay();
  assert.equal((await snapshot(a)).payments[0].balance, 1000);
  assert.equal((await snapshot(b)).payments.length, 0);
  assert.equal(
    (await snapshot({ kind: 'preview', id: 'a', member: 'another-outing' }))
      .payments.length,
    0,
  );
  await assert.rejects(pay({ member: 'another-outing' }));
  await assert.rejects(pay({ currency: 'ZZZ' }));
  await assert.rejects(pay({ event: 'vows' }));
  for (const value of [1.1, 0, -3, Number.MAX_SAFE_INTEGER])
    await assert.rejects(pay({ amount: value }));
  await assert.rejects(ledger(b, p.id, 'report', 200));
  const report = await ledger(a, p.id, 'report', 600);
  assert.equal((await snapshot(a)).payments[0].balance, 1000);
  await ledger(org, p.id, 'confirm', 400, { report: report.id });
  assert.equal((await snapshot(a)).payments[0].balance, 600);
  await assert.rejects(
    ledger(org, p.id, 'confirm', 300, { report: report.id }),
  );
  await ledger(org, p.id, 'confirm', 200, { report: report.id });
  assert.equal((await snapshot(a)).payments[0].balance, 400);
  assert.equal(await count('payment_ledger'), 3);
});
void test('corrections, waivers and refunds append attribution and competing confirmations cannot double count', async () => {
  const a = (await member()).actor,
    p = await pay();
  const report = await ledger(a, p.id, 'report', 1000);
  const revision = await rev();
  const results = await Promise.allSettled([
    store.ledger(org, 'outing', {
      revision,
      request: p.id,
      kind: 'confirm',
      amount: 1000,
      report: report.id,
      note: 'Checked A',
    }),
    store.ledger(org, 'outing', {
      revision,
      request: p.id,
      kind: 'confirm',
      amount: 1000,
      report: report.id,
      note: 'Checked B',
    }),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal((await snapshot()).payments[0].balance, 0);
  await assert.rejects(ledger(org, p.id, 'waiver', 1));
  await ledger(org, p.id, 'refund', 200);
  await ledger(org, p.id, 'correction', 100);
  await ledger(org, p.id, 'correction', -50);
  await ledger(org, p.id, 'waiver', 250);
  assert.equal((await snapshot()).payments[0].balance, 0);
  await assert.rejects(ledger(org, p.id, 'refund', 801));
  assert.equal(await count('payment_ledger'), 6);
  assert.ok(
    (await snapshot()).payments[0].entries.every(
      (e) => e.actor && e.author && e.at,
    ),
  );
});
void test('decline, withdrawal and cancellation retain balances without creating payments or refunds', async () => {
  const a = (await member()).actor,
    p = await pay();
  await ledger(a, p.id, 'report', 200);
  await respond(a, 'declined');
  assert.equal((await snapshot(a)).payments[0].balance, 1000);
  await store.invite(org, 'outing', {
    revision: await rev(),
    member: 'alex-outing',
    activity: 'movie',
    state: 'withdrawn',
  });
  assert.equal((await snapshot(a)).payments[0].balance, 1000);
  await store.author(org, 'outing', 'activity', {
    revision: await rev(),
    id: 'movie',
    title: 'Cancelled',
    summary: 'Cancelled',
    details: 'Private',
    state: 'cancelled',
  });
  assert.equal((await snapshot(a)).payments[0].balance, 1000);
  assert.equal(await count('payment_ledger'), 1);
});
void test('closed flings, preview and revoked actors reject every coordination mutation; reopening preserves histories', async () => {
  const a = (await member()).actor,
    p = await poll(),
    payment = await pay();
  await post(a);
  await store.vote(a, 'outing', {
    revision: await rev(),
    poll: p.id,
    choices: [0],
  });
  await store.poll(org, 'outing', {
    revision: await rev(),
    id: p.id,
    action: 'close',
  });
  const prior = await snapshot();
  await store.setState(org, 'outing', {
    revision: await rev(),
    state: 'closed',
    confirm: true,
  });
  await assert.rejects(post(a));
  await assert.rejects(post(org));
  await assert.rejects(poll());
  await assert.rejects(pay());
  await assert.rejects(ledger(a, payment.id, 'report', 100));
  await assert.rejects(ledger(org, payment.id, 'waiver', 100));
  await store.setState(org, 'outing', {
    revision: await rev(),
    state: 'open',
    confirm: true,
  });
  const next = await snapshot();
  assert.deepEqual(next.posts, prior.posts);
  assert.deepEqual(next.polls, prior.polls);
  assert.deepEqual(next.payments, prior.payments);
  const preview: Actor = { kind: 'preview', id: 'a', member: 'alex-outing' };
  await assert.rejects(
    store.vote(preview, 'outing', {
      revision: await rev(),
      poll: p.id,
      choices: [0],
    }),
  );
  await assert.rejects(ledger(preview, payment.id, 'report', 100));
  await store.removeMember(org, 'outing', 'alex-outing');
  await assert.rejects(post(a, { activity: null, event: null }));
  await assert.rejects(snapshot(a));
});
void test('database rejects cross-fling event relationships directly, without API validation', async () => {
  await assert.rejects(
    store
      .q(
        "INSERT INTO posts(id,fling,activity,event,actor,actor_kind,author,body,created) VALUES('bad','outing','movie','vows','a','organizer','Casey','bad',0)",
      )
      .run(),
  );
  await assert.rejects(
    store
      .q(
        "INSERT INTO payment_requests VALUES('bad','outing','vows','alex-outing','Bad','USD',100,'','a',0)",
      )
      .run(),
  );
  assert.equal(await count('posts'), 0);
  assert.equal(await count('payment_requests'), 0);
});
void test('HTTP coordination routes enforce cookies, expected member, origin, CSRF, preview and hosted denial', async () => {
  const { session } = await member();
  const env = {
    DB: store.db,
    FLINGS_SECRET: secret,
    FLINGS_MODE: 'local',
    FLINGS_ORIGIN: 'http://localhost:5187',
  };
  const url = 'http://localhost:5187/api/flings/';
  const cookie = 'flings_outing=' + session.token;
  const read = await handle(
    new Request(url + 'outing/member/alex-outing/coordination', {
      headers: { cookie },
    }),
    env,
  );
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('Cache-Control'), 'no-store, private');
  const ss = await handle(
    new Request(url + 'outing/session', { headers: { cookie } }),
    env,
  );
  const { csrf } = (await ss.json()) as { csrf: string };
  const body = { kind: 'post', revision: await rev(), body: 'HTTP post' };
  const write = (path: string, headers: Record<string, string>) =>
    handle(
      new Request(url + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
      env,
    );
  assert.equal(
    (await write('outing/member/alex-outing/coordination', { cookie })).status,
    403,
  );
  const headers = { cookie, Origin: env.FLINGS_ORIGIN, 'x-flings-csrf': csrf };
  assert.equal(
    (await write('outing/member/another-outing/coordination', headers)).status,
    409,
  );
  assert.equal(
    (await write('outing/member/alex-outing/coordination', headers)).status,
    200,
  );
  assert.equal(
    (
      await handle(new Request(url + 'outing/organizer/coordination'), {
        ...env,
        FLINGS_MODE: 'hosted',
      })
    ).status,
    403,
  );
});
