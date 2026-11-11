import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { digest, type Actor } from '../lib/access.ts';
import { RecoveryRestoreStore } from '../lib/recovery-restore.ts';
import { checkRecoveryFile } from '../lib/recovery-check.ts';
import { seed } from '../lib/fixtures.ts';
const org: Actor = { kind: 'organizer', id: 'a' };
let mf: Miniflare, store: RecoveryRestoreStore, now: number;
beforeEach(async () => {
  now = Date.UTC(2026, 10, 12);
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  store = new RecoveryRestoreStore(
    (await mf.getD1Database('DB')) as unknown as D1Database,
    'participation-test-secret-at-least-32-characters',
    () => now,
  );
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter((n) => n.endsWith('.sql'))
    .sort())
    await store.db.batch(
      (await readFile(new URL(file, dir), 'utf8'))
        .split('--> statement-breakpoint')
        .filter((s) => s.trim())
        .map((s) => store.q(s)),
    );
  await seed(store);
  await store.q("DELETE FROM invitations WHERE activity='movie'").run();
  await store
    .q(
      "INSERT INTO invitations(member,activity,fling,state) VALUES('alex-outing','movie','outing','invited')",
    )
    .run();
  await store
    .q(
      "INSERT INTO members(id,fling,name) VALUES('third','outing','Third'),('fourth','outing','Fourth')",
    )
    .run();
});
afterEach(async () => {
  await mf?.dispose();
});
const revision = async () =>
  Number(
    (await store.q("SELECT revision FROM flings WHERE id='outing'").first())!
      .revision,
  );
const invitations = async () =>
  (
    await store
      .q(
        "SELECT member,state,timed_out,invited_at FROM invitations WHERE activity='movie' ORDER BY member",
      )
      .all()
  ).results;
async function configure(extra: Record<string, unknown> = {}) {
  await store.author(org, 'outing', 'participation', {
    id: 'movie',
    revision: await revision(),
    capacity: 1,
    cascading: false,
    timeout_minutes: null,
    allow_late: false,
    member_ids: ['alex-outing', 'another-outing', 'third'],
    ...extra,
  });
}
async function member(id: string) {
  const link = await store.issue(org, 'outing', id);
  const session = await store.exchange('outing', link.code);
  return {
    kind: 'member',
    digest: await digest(session.token),
    member: id,
  } as Actor;
}
async function respond(actor: Actor, state: string, rev?: number) {
  if (actor.kind !== 'member') throw Error();
  return store.respond(actor, 'outing', actor.member, {
    activity: 'movie',
    state,
    revision: rev ?? (await revision()),
  });
}
void test('existing activities remain unlimited; selected invitations do not include others', async () => {
  const a = await member('alex-outing'),
    b = await member('another-outing');
  await store.invite(org, 'outing', {
    member: 'another-outing',
    activity: 'movie',
    state: 'invited',
    revision: await revision(),
  });
  await respond(a, 'accepted');
  await respond(b, 'accepted');
  assert.equal(
    (await store.projection(a, 'outing', 'alex-outing')).activities[0].capacity,
    null,
  );
  await assert.rejects(configure({ member_ids: ['alex-outing'], capacity: 1 }));
  await configure({
    capacity: 2,
    member_ids: ['alex-outing', 'another-outing'],
  });
  assert.equal(
    (await invitations()).some((i) => i.member === 'third'),
    false,
  );
});
void test('one final place is atomic, closed to later accepts, and redacts unconfirmed details', async () => {
  await configure();
  const a = await member('alex-outing'),
    b = await member('another-outing');
  const rev = await revision();
  const race = await Promise.allSettled([
    respond(a, 'accepted', rev),
    respond(b, 'accepted', rev),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  const loser = race[0].status === 'fulfilled' ? b : a;
  await assert.rejects(respond(loser, 'accepted'));
  if (loser.kind !== 'member') throw Error();
  const view = await store.projection(loser, 'outing', loser.member);
  assert.equal(view.activities[0].is_full, 1);
  assert.equal(view.activities[0].details, null);
  assert.equal(
    (await invitations()).filter((i) => i.state === 'accepted').length,
    1,
  );
});
void test('cascade follows chosen order on decline and accepted cancellation', async () => {
  await configure({
    cascading: true,
    member_ids: ['third', 'alex-outing', 'another-outing'],
  });
  // The legacy Alex invitation is preserved; it already occupies the pending place.
  const a = await member('alex-outing'),
    third = await member('third'),
    b = await member('another-outing');
  await respond(a, 'declined');
  assert.equal(
    (await invitations()).find((i) => i.member === 'third')?.state,
    'invited',
  );
  assert.equal(
    (await invitations()).find((i) => i.member === 'another-outing'),
    undefined,
  );
  await respond(third, 'accepted');
  await respond(third, 'declined');
  assert.equal(
    (await invitations()).find((i) => i.member === 'another-outing')?.state,
    'invited',
  );
  await respond(b, 'accepted');
});
void test('deadline boundary advances the queue once; strict expiry survives a decline retry', async () => {
  await configure({ cascading: true, timeout_minutes: 10 });
  const a = await member('alex-outing');
  now += 10 * 60000 - 1;
  await store.overview(org, 'outing');
  assert.equal(
    (await invitations()).find((i) => i.member === 'another-outing'),
    undefined,
  );
  now++;
  const rev = await revision();
  await assert.rejects(respond(a, 'accepted', rev));
  assert.equal(
    (await invitations()).find((i) => i.member === 'alex-outing')?.timed_out,
    1,
  );
  assert.equal(
    (await invitations()).find((i) => i.member === 'another-outing')?.state,
    'invited',
  );
  const settled = await revision();
  await store.overview(org, 'outing');
  assert.equal(await revision(), settled);
  await respond(a, 'declined');
  await assert.rejects(respond(a, 'accepted'));
});
void test('late acceptance competes for space and never overbooks', async () => {
  await configure({ cascading: true, timeout_minutes: 1, allow_late: true });
  const a = await member('alex-outing'),
    b = await member('another-outing');
  now += 60000;
  await store.overview(org, 'outing');
  await respond(a, 'accepted');
  await assert.rejects(respond(b, 'accepted'));
  assert.equal(
    (await invitations()).filter((i) => i.state === 'accepted').length,
    1,
  );
});
void test('late acceptance is rejected once the replacement confirms', async () => {
  await configure({ cascading: true, timeout_minutes: 1, allow_late: true });
  const a = await member('alex-outing'),
    b = await member('another-outing');
  now += 60000;
  await store.overview(org, 'outing');
  await respond(b, 'accepted');
  await assert.rejects(respond(a, 'accepted'));
});
void test('withdrawal advances the queue without reinviting the withdrawn member', async () => {
  await configure({ cascading: true });
  await store.invite(org, 'outing', {
    member: 'alex-outing',
    activity: 'movie',
    state: 'withdrawn',
    revision: await revision(),
  });
  await store.overview(org, 'outing');
  assert.equal(
    (await invitations()).find((i) => i.member === 'alex-outing')?.state,
    'withdrawn',
  );
  assert.equal(
    (await invitations()).find((i) => i.member === 'another-outing')?.state,
    'invited',
  );
});
void test('capacity and roster validation roll back edits; authorization and queued visibility hold', async () => {
  await configure({ cascading: true });
  const before = await invitations();
  for (const extra of [
    { capacity: 0 },
    { capacity: 1.5 },
    { timeout_minutes: -1 },
    { member_ids: ['jordan-wedding'] },
    { member_ids: ['third', 'third'] },
  ])
    await assert.rejects(configure(extra));
  await assert.rejects(
    store.author({ kind: 'organizer', id: 'c' }, 'outing', 'participation', {
      id: 'movie',
      revision: await revision(),
      capacity: 2,
      cascading: false,
      timeout_minutes: null,
      allow_late: false,
      member_ids: ['third'],
    }),
  );
  assert.deepEqual(await invitations(), before);
  const third = await member('third');
  assert.deepEqual(
    (await store.projection(third, 'outing', 'third')).activities,
    [],
  );
});
void test('confirmed members cannot be deselected or squeezed below capacity', async () => {
  await configure({ capacity: 2 });
  await respond(await member('alex-outing'), 'accepted');
  await respond(await member('another-outing'), 'accepted');
  await assert.rejects(configure({ capacity: 1 }));
  await assert.rejects(configure({ capacity: 2, member_ids: ['alex-outing'] }));
});
void test('closed gatherings freeze cascade; reopening settles expired invitations', async () => {
  await configure({ cascading: true, timeout_minutes: 1 });
  await store.setState(org, 'outing', {
    state: 'closed',
    revision: await revision(),
    confirm: true,
  });
  now += 60000;
  await store.overview(org, 'outing');
  assert.equal(
    (await invitations()).find((i) => i.member === 'alex-outing')?.state,
    'invited',
  );
  await store.setState(org, 'outing', {
    state: 'open',
    revision: await revision(),
    confirm: true,
  });
  assert.equal(
    (await invitations()).find((i) => i.member === 'another-outing')?.state,
    'invited',
  );
});
void test('removed members are skipped when their place opens', async () => {
  await configure({ cascading: true });
  await store
    .q(
      "UPDATE members SET state='removed' WHERE id IN ('alex-outing','another-outing')",
    )
    .run();
  await store.overview(org, 'outing');
  assert.equal(
    (await invitations()).find((i) => i.member === 'third')?.state,
    'invited',
  );
});
void test('draft selections open only when published, for both invitation modes', async () => {
  for (const cascading of [false, true]) {
    const result = await store.author(org, 'outing', 'activity', {
      revision: await revision(),
      title: 'Draft',
      summary: 'Summary',
      details: 'Private',
      state: 'draft',
    });
    await store.author(org, 'outing', 'participation', {
      id: result.id,
      revision: await revision(),
      capacity: 1,
      cascading,
      timeout_minutes: null,
      allow_late: false,
      member_ids: ['third', 'fourth'],
    });
    assert.equal(
      (await store
        .q('SELECT COUNT(*) n FROM invitations WHERE activity=?', result.id)
        .first())!.n,
      0,
    );
    await store.author(org, 'outing', 'activity', {
      id: result.id,
      revision: await revision(),
      title: 'Draft',
      summary: 'Summary',
      details: 'Private',
      state: 'published',
    });
    assert.equal(
      (await store
        .q('SELECT COUNT(*) n FROM invitations WHERE activity=?', result.id)
        .first())!.n,
      cascading ? 1 : 2,
    );
  }
});
void test('recovery exports participation settings and validates capacity and invitation references', async () => {
  await configure({ cascading: true, timeout_minutes: 10, allow_late: true });
  const result = await store.exportRecovery(org, 'outing', {
    confirm_unencrypted: true,
  });
  const file = result.file;
  assert.ok(file);
  const check = checkRecoveryFile(file);
  assert.equal(check.valid, true, JSON.stringify(check.issues));
  const data = file as { records: Record<string, Record<string, unknown>[]> };
  const activity = data.records.activities.find((a) => a.id === 'movie')!;
  assert.deepEqual(activity.invitation_order, [
    'alex-outing',
    'another-outing',
    'third',
  ]);
  assert.equal(activity.capacity, 1);
  activity.invitation_order = ['unknown'];
  assert.equal(checkRecoveryFile(file).valid, false);
});
void test('recovery restore remaps the ordered members and keeps the participation policy', async () => {
  await configure({ cascading: true, timeout_minutes: 10, allow_late: true });
  const file = (
    await store.exportRecovery(org, 'outing', { confirm_unencrypted: true })
  ).file;
  const input = {
    file,
    organizer_mapping: file.records.organizers.map((r) => ({
      source: r.id,
      target: null,
    })),
  };
  const preview = await store.recoveryPreview(org, 'outing', input);
  assert.ok(preview.plan, JSON.stringify(preview.check));
  const restored = await store.restoreRecovery(org, 'outing', {
    ...input,
    ticket: preview.confirmation!.ticket,
    confirm_restore: true,
  });
  const activity = await store
    .q(
      'SELECT * FROM activities WHERE fling=? AND title=?',
      restored.id,
      'Movie & dinner',
    )
    .first();
  assert.equal(activity!.capacity, 1);
  assert.equal(activity!.cascading, 1);
  assert.equal(activity!.timeout_minutes, 10);
  assert.equal(activity!.allow_late, 1);
  const ids = JSON.parse(String(activity!.invitation_order));
  assert.equal(ids.length, 3);
  assert.ok(
    ids.every(
      (id: string) => !['alex-outing', 'another-outing', 'third'].includes(id),
    ),
  );
  const members = (
    await store.q('SELECT id FROM members WHERE fling=?', restored.id).all()
  ).results;
  assert.ok(ids.every((id: string) => members.some((m) => m.id === id)));
});
