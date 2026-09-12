import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

// Author every gathering through the interface. HTTP is used only to inspect
// projections, obtain the separate member-entry capability, and test denials.
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [];
const fixtures = [
  {
    key: 'outing',
    owner: 'Casey',
    activities: [
      {
        title: 'Movie and meal',
        events: [
          ['Screening', '2026-10-03T18:00'],
          ['Dinner', '2026-10-03T20:30'],
        ],
      },
    ],
  },
  {
    key: 'wedding',
    owner: 'Casey',
    activities: [
      { title: 'Welcome', events: [['Welcome supper', '2026-10-09T18:00']] },
      { title: 'Ceremony', events: [['Wedding vows', '2026-10-10T15:00']] },
      { title: 'Brunch', events: [['Farewell brunch', '2026-10-11T10:00']] },
    ],
  },
  {
    key: 'concerts',
    owner: 'Sam',
    activities: [
      {
        title: 'Autumn concerts',
        events: [
          ['October concert', '2026-10-17T19:00'],
          ['December concert', '2026-12-12T19:00'],
        ],
      },
    ],
  },
];
const button = (p, name) => p.getByRole('button', { name, exact: true });
const label = (p, name) => p.getByLabel(name, { exact: true });
async function read(context, path, headers) {
  const response = await context.request.get(base + '/api/flings/' + path, {
    headers,
  });
  assert.equal(
    response.status(),
    200,
    'authorized read: ' + path.split('/').pop(),
  );
  return response.json();
}
async function signIn(context, name) {
  const page = await context.newPage();
  await page.goto(base + '/organizer');
  await button(page, name).click();
  await expect(label(page, 'New fling title')).toBeEnabled();
  return page;
}
async function ready(f) {
  await f.page.goto(base + '/organizer/' + f.id);
  await expect(
    f.page.getByRole('button', { name: /^(Close|Reopen) fling$/ }),
  ).toBeEnabled();
}
async function saved(page, kind) {
  await button(page, 'Save ' + kind).click();
  await expect(
    page.getByText('Gathering plan saved. No message was sent.'),
  ).toBeVisible();
  await expect(page.locator('.author-form')).toHaveCount(0);
}
async function addMember(f, name, email = 'shared@example.invalid') {
  await label(f.page, 'Member name').fill(name);
  await label(f.page, 'Member email').fill(email);
  await button(f.page, 'Create member').click();
  await expect(
    f.page.getByText('Member profile created. No message was sent.'),
  ).toBeVisible();
  return (await read(f.context, f.id + '/organizer')).members.find(
    (m) => m.name === name,
  );
}
async function invite(f, name, activity, withdraw = false) {
  await button(
    f.page,
    `${withdraw ? 'Withdraw' : 'Invite'} ${name} · ${activity}`,
  ).click();
  await expect(
    f.page.getByText(
      withdraw
        ? 'Invitation withdrawn.'
        : 'Invitation saved. No message was sent.',
    ),
  ).toBeVisible();
}
async function enterMember(f, context, member) {
  const snapshot = await read(f.context, f.id + '/organizer');
  const issued = await f.context.request.post(
    `${base}/api/flings/${f.id}/organizer/${member.id}/issue`,
    {
      headers: { Origin: base, 'x-flings-csrf': snapshot.csrf },
      data: {},
    },
  );
  assert.equal(issued.status(), 200);
  const page = await context.newPage();
  await page.goto(
    `${base}/f/${f.id}/member#code=${(await issued.json()).code}`,
  );
  await expect(label(page, 'Name')).toBeVisible();
  assert.equal(new URL(page.url()).hash, '');
  return page;
}
async function reloadMember(f) {
  await f.mp.reload();
  await expect(label(f.mp, 'Name')).toBeEnabled();
}
function activityCard(f, title) {
  return f.mp
    .locator('article.activity')
    .filter({ has: f.mp.getByRole('heading', { name: title, exact: true }) });
}
async function projection(f, context) {
  return read(context, `${f.id}/member/${f.member.id}`);
}
async function parity(f, memberContext, previewContext) {
  await ready(f);
  await button(f.page, 'Preview ' + f.member.name).click();
  await expect(
    f.page.getByText(`Preview — ${f.member.name} · read-only`),
  ).toBeVisible();
  await expect(button(f.page, 'Save profile')).toHaveCount(0);
  await expect(
    f.page.getByRole('button', {
      name: /Accept invitation|Decline invitation/,
    }),
  ).toHaveCount(0);
  // A fresh preview token also proves server projection parity and write denial.
  const s = await read(f.context, f.id + '/organizer');
  const response = await f.context.request.post(
    `${base}/api/flings/${f.id}/organizer/${f.member.id}/preview`,
    {
      headers: { Origin: base, 'x-flings-csrf': s.csrf },
      data: {},
    },
  );
  assert.equal(response.status(), 200);
  const url = new URL((await response.json()).url, base);
  const headers = {
    Authorization:
      'Bearer ' + new URLSearchParams(url.hash.slice(1)).get('preview'),
  };
  const actual = await projection(f, memberContext);
  const preview = await read(
    previewContext,
    `${f.id}/member/${f.member.id}`,
    headers,
  );
  assert.deepEqual({ ...preview, preview: false }, actual);
  for (const [path, method, data] of [
    [
      `member/${f.member.id}`,
      'PUT',
      { ...actual.profile, revision: actual.profile.revision },
    ],
    [
      `member/${f.member.id}/respond`,
      'POST',
      {
        activity: f.activities[0].id,
        state: 'accepted',
        revision: actual.fling.revision,
      },
    ],
    ['organizer/assignments', 'POST', { organizer: 'b', confirm: true }],
  ]) {
    const denied = await previewContext.request.fetch(
      `${base}/api/flings/${f.id}/${path}`,
      {
        method,
        headers: { ...headers, Origin: base },
        data,
      },
    );
    assert.equal(denied.status(), 403);
  }
  assert.deepEqual(await projection(f, memberContext), actual);
  await ready(f);
}

for (const [engine, launcher] of Object.entries({
  chromium,
  firefox,
  webkit,
})) {
  if (process.env.FLINGS_BROWSER && engine !== process.env.FLINGS_BROWSER)
    continue;
  const browser = await launcher.launch();
  try {
    for (const width of [1280, 390]) {
      console.log('Independent gathering matrix', engine, width);
      const errors = [];
      const contexts = [];
      async function context() {
        const c = await browser.newContext({
          viewport: { width, height: 900 },
          timezoneId: 'Asia/Tokyo',
        });
        c.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
        contexts.push(c);
        return c;
      }
      try {
        const a = await context(),
          b = await context(),
          c = await context();
        const members = await context(),
          preview = await context(),
          anonymous = await context();
        const ap = await signIn(a, 'Casey'),
          cp = await signIn(c, 'Sam'),
          bp = await signIn(b, 'Rowan');
        const made = [];
        for (const fixture of fixtures) {
          const f = {
            ...fixture,
            context: fixture.owner === 'Casey' ? a : c,
            page: fixture.owner === 'Casey' ? ap : cp,
          };
          console.log('Author and exercise', engine, width, f.key);
          await f.page.goto(base + '/organizer');
          const title = `Independent ${f.key} ${engine} ${width}`;
          await label(f.page, 'New fling title').fill(title);
          await button(f.page, 'Create fling').click();
          await expect(
            f.page.getByRole('heading', { level: 1, name: title }),
          ).toBeVisible();
          f.id = f.page.url().split('/').pop();
          await button(f.page, 'Edit fling details').click();
          await label(
            f.page,
            'Fling description (visible to every member)',
          ).fill('Fictional ' + f.key + ' gathering');
          await label(f.page, 'Default time zone').fill('America/Los_Angeles');
          await saved(f.page, 'fling details');
          for (const activity of fixture.activities) {
            await button(f.page, 'Add activity').click();
            await label(f.page, 'Activity title').fill(activity.title);
            await label(f.page, 'Invitation summary').fill(
              'Invitation to ' + activity.title,
            );
            await label(
              f.page,
              'Accepted members only: place and details',
            ).fill('PRIVATE ' + activity.title);
            await saved(f.page, 'activity'); // Default draft must stay hidden.
            for (const [event, time] of activity.events) {
              await button(f.page, 'Add event to ' + activity.title).click();
              await label(f.page, 'Event title').fill(event);
              await label(f.page, 'Local date and time').fill(time);
              await label(f.page, 'Local end date and time (optional)').fill(
                time.replace(
                  /T\d\d:/,
                  (t) =>
                    'T' +
                    String(Number(t.slice(1, 3)) + 1).padStart(2, '0') +
                    ':',
                ),
              );
              await label(f.page, 'Accepted members only: street address').fill(
                'PRIVATE ADDRESS ' + event,
              );
              await label(
                f.page,
                'Invitation location (visible before acceptance)',
              ).fill('Public area ' + event);
              await saved(f.page, 'event');
            }
            await button(f.page, 'Edit ' + activity.title).click();
            await label(f.page, 'Activity status').selectOption('published');
            await saved(f.page, 'activity');
          }
          const s = await read(f.context, f.id + '/organizer');
          f.activities = s.activities;
          assert.equal(s.events.length, f.key === 'wedding' ? 3 : 2);
          assert.equal(
            new Set(s.events.map((e) => e.starts)).size,
            s.events.length,
          );
          assert.equal(
            new Set(s.events.map((e) => e.location_address)).size,
            s.events.length,
          );
          if (f.key === 'concerts')
            assert.ok(
              Date.parse(s.events[1].starts) - Date.parse(s.events[0].starts) >
                50 * 86400000,
            );
          if (f.key === 'wedding') {
            await button(f.page, 'Move Brunch up').click();
            await expect(
              f.page.locator('.activity-plan > article').nth(1),
            ).toContainText('Brunch');
          }
          // Each independent fling exercises assignment addition and withdrawal.
          await label(f.page, 'Existing organizer ID').fill('b');
          await button(f.page, 'Add organizer').click();
          await expect(f.page.getByRole('alertdialog')).toBeVisible();
          await button(f.page, 'Confirm addition').click();
          await expect(
            f.page.getByText('Organizer added. They see this fling next time'),
          ).toBeVisible();
          assert.equal(
            (await read(b, f.id + '/organizer')).organizers.length,
            2,
          );
          f.member = await addMember(f, 'Shared Guest');
          await button(f.page, 'Edit profile for Shared Guest').click();
          await label(f.page, 'Edit member name').fill('Cancelled edit');
          await button(f.page, 'Cancel profile edit').click();
          assert.equal(
            (await read(f.context, f.id + '/organizer')).members[0].name,
            'Shared Guest',
          );
          await button(f.page, 'Edit profile for Shared Guest').click();
          await label(f.page, 'Edit member phone').fill('+12025550123');
          await label(f.page, 'Edit member message preference').selectOption(
            'both',
          );
          assert.equal(
            await f.page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await button(f.page, 'Save member profile').press('Enter');
          await expect(
            f.page.getByText(
              'Member profile saved for this fling. No message was sent.',
            ),
          ).toBeVisible();
          for (const activity of f.activities)
            await invite(f, f.member.name, activity.title);
          f.mp = await enterMember(f, members, f.member);
          const p = await projection(f, members);
          assert.equal(p.profile.phone, '+12025550123');
          assert.equal(p.profile.preference, 'both');
          assert.equal(p.profile.complete, true);
          assert.equal(p.activities.length, f.activities.length);
          assert.equal(JSON.stringify(p).includes('PRIVATE'), false);
          await parity(f, members, preview);
          await reloadMember(f);
          const first = f.activities[0];
          await button(activityCard(f, first.title), 'Accept invitation').press(
            'Enter',
          );
          await expect(
            activityCard(f, first.title).locator('.badge.accepted'),
          ).toBeVisible();
          const accepted = await projection(f, members);
          assert.equal(accepted.activities.filter((x) => x.details).length, 1);
          assert.ok(
            accepted.events
              .filter((e) => e.activity === first.id)
              .every((e) => e.location_address),
          );
          assert.ok(
            accepted.events
              .filter((e) => e.activity !== first.id)
              .every((e) => e.location_address === null),
          );
          await parity(f, members, preview);
          await reloadMember(f);
          await button(
            activityCard(f, first.title),
            'Decline invitation',
          ).click();
          await expect(
            activityCard(f, first.title).locator('.badge.declined'),
          ).toBeVisible();
          assert.equal(
            JSON.stringify(await projection(f, members)).includes('PRIVATE'),
            false,
          );
          await parity(f, members, preview);
          await reloadMember(f);
          await button(
            activityCard(f, first.title),
            'Accept invitation',
          ).click();
          await expect(
            activityCard(f, first.title).locator('.badge.accepted'),
          ).toBeVisible();
          await ready(f);
          await invite(f, f.member.name, first.title, true);
          assert.equal(
            (await projection(f, members)).activities.some(
              (x) => x.id === first.id,
            ),
            false,
          );
          await parity(f, members, preview);
          await invite(f, f.member.name, first.title);
          await reloadMember(f);
          await button(
            activityCard(f, first.title),
            'Accept invitation',
          ).click();
          await expect(
            activityCard(f, first.title).locator('.badge.accepted'),
          ).toBeVisible();
          // Turn a previously invited activity into draft, then cancelled.
          for (const state of ['draft', 'cancelled']) {
            await ready(f);
            await button(f.page, 'Edit ' + first.title).click();
            await label(f.page, 'Activity status').selectOption(state);
            await saved(f.page, 'activity');
            await reloadMember(f);
            const value = await projection(f, members);
            if (state === 'draft')
              assert.equal(
                value.activities.some((x) => x.id === first.id),
                false,
              );
            else
              await expect(activityCard(f, first.title)).toContainText(
                'Cancelled',
              );
            assert.equal(
              value.events.some(
                (e) => e.activity === first.id && e.location_address,
              ),
              false,
            );
            await parity(f, members, preview);
          }
          await button(f.page, 'Edit ' + first.title).click();
          await label(f.page, 'Activity status').selectOption('published');
          await saved(f.page, 'activity');
          const beforeClose = await projection(f, members);
          await button(f.page, 'Close fling').click();
          await button(f.page, 'Confirm closure').click();
          await expect(button(f.page, 'Reopen fling')).toBeVisible();
          const session = await read(members, f.id + '/session');
          const stale = await members.request.post(
            `${base}/api/flings/${f.id}/member/${f.member.id}/respond`,
            {
              headers: { Origin: base, 'x-flings-csrf': session.csrf },
              data: {
                activity: first.id,
                state: 'declined',
                revision: beforeClose.fling.revision,
              },
            },
          );
          assert.equal(stale.status(), 409);
          await reloadMember(f);
          await label(f.mp, 'Name').fill('Closed Guest ' + f.key);
          await button(f.mp, 'Save profile').click();
          await expect(
            f.mp.getByText('Your profile is saved for this fling.'),
          ).toBeVisible();
          f.member.name = 'Closed Guest ' + f.key;
          await parity(f, members, preview);
          await button(f.page, 'Edit profile for ' + f.member.name).click();
          await label(f.page, 'Edit member phone').fill('+12025550124');
          await button(f.page, 'Save member profile').click();
          await expect(
            f.page.getByText(
              'Member profile saved for this fling. No message was sent.',
            ),
          ).toBeVisible();
          assert.equal(
            (await projection(f, members)).profile.phone,
            '+12025550124',
          );
          await button(f.page, 'Reopen fling').click();
          await button(f.page, 'Confirm reopening').click();
          await expect(button(f.page, 'Close fling')).toBeVisible();
          assert.deepEqual(
            (await projection(f, members)).activities,
            beforeClose.activities,
          );
          await reloadMember(f);
          await expect(f.mp.locator('.event').first()).toContainText(
            'America/Los_Angeles',
          );
          for (const p of [f.page, f.mp])
            assert.equal(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
            );
          const stable = await read(f.context, f.id + '/organizer');
          for (const outsider of [
            anonymous,
            members,
            fixture.owner === 'Casey' ? c : a,
          ]) {
            const denied = await outsider.request.get(
              `${base}/api/flings/${f.id}/organizer`,
            );
            assert.ok([401, 403, 409].includes(denied.status()));
            assert.equal((await denied.text()).includes('PRIVATE'), false);
          }
          assert.deepEqual(await read(f.context, f.id + '/organizer'), stable);
          // Remove Rowan from outing/concerts; retain the shared wedding for T1 below.
          if (f.key !== 'wedding') {
            await f.page
              .getByRole('listitem')
              .filter({ hasText: 'Rowan' })
              .getByRole('button', { name: 'Remove', exact: true })
              .click();
            await button(f.page, 'Confirm removal').click();
            await expect(f.page.getByText('Organizer removed.')).toBeVisible();
            assert.equal(
              (
                await b.request.get(`${base}/api/flings/${f.id}/organizer`)
              ).status(),
              409,
            );
          }
          made.push(f);
        }
        const [outing, wedding, concerts] = made;
        assert.equal(new Set(made.map((f) => f.id)).size, 3);
        assert.equal(new Set(made.map((f) => f.member.id)).size, 3);
        // All three sessions coexist, and matching contact details are independent.
        for (const f of made)
          assert.equal(
            (await projection(f, members)).profile.name,
            'Closed Guest ' + f.key,
          );
        await reloadMember(outing);
        await ready(outing);
        await button(
          outing.page,
          'Edit profile for ' + outing.member.name,
        ).click();
        await label(outing.page, 'Edit member email').fill(
          'stale@example.invalid',
        );
        await label(outing.mp, 'Email').fill('outing-only@example.invalid');
        await label(outing.mp, 'Phone').fill('');
        await label(outing.mp, 'Receive messages by').selectOption('both');
        await button(outing.mp, 'Save profile').click();
        await expect(
          outing.mp.getByText('Your profile is saved for this fling.'),
        ).toBeVisible();
        // Focus refresh cannot silently advance an already-open profile draft.
        await outing.page.bringToFront();
        await expect(label(outing.page, 'Edit member email')).toHaveValue(
          'stale@example.invalid',
        );
        await button(outing.page, 'Save member profile').click();
        await expect(outing.page.getByRole('alert')).toBeVisible();
        assert.equal(
          (await projection(outing, members)).profile.email,
          'outing-only@example.invalid',
        );
        await ready(outing);
        assert.equal(
          (await projection(outing, members)).profile.complete,
          false,
        );
        for (const f of [wedding, concerts])
          assert.equal(
            (await projection(f, members)).profile.email,
            'shared@example.invalid',
          );
        // Organizer A is a concert member, never a concert organizer.
        await ready(concerts);
        const caseyMember = await addMember(
          concerts,
          'Casey',
          'casey@example.invalid',
        );
        await invite(concerts, 'Casey', concerts.activities[0].title);
        const caseyPage = await enterMember(concerts, a, caseyMember);
        await expect(button(caseyPage, 'Accept invitation')).toBeVisible();
        assert.equal(
          (
            await a.request.get(`${base}/api/flings/${concerts.id}/organizer`)
          ).status(),
          409,
        );
        const before = await read(a, outing.id + '/organizer');
        const denied = await a.request.post(
          `${base}/api/flings/${outing.id}/organizer/invitation`,
          {
            headers: { Origin: base, 'x-flings-csrf': before.csrf },
            data: {
              member: outing.member.id,
              activity: wedding.activities[0].id,
              state: 'invited',
              revision: before.fling.revision,
            },
          },
        );
        assert.equal(denied.status(), 409);
        assert.deepEqual(await read(a, outing.id + '/organizer'), before);
        // Rowan removes Casey from only the wedding. Casey's open editor is stale.
        await ready(wedding);
        await button(wedding.page, 'Edit fling details').click();
        await label(wedding.page, 'Fling title').fill('This must not be saved');
        await bp.goto(base + '/organizer/' + wedding.id);
        await expect(button(bp, 'Edit fling details')).toBeVisible();
        await bp
          .getByRole('listitem')
          .filter({ hasText: 'Casey' })
          .getByRole('button', { name: 'Remove', exact: true })
          .click();
        await button(bp, 'Confirm removal').click();
        await expect(bp.getByText('Organizer removed.')).toBeVisible();
        // Keep the stale tab unfocused and submit its form, exercising its saved actor/revision.
        await wedding.page
          .locator('.author-form')
          .evaluate((form) => form.requestSubmit());
        await expect(wedding.page.getByRole('alert')).toBeVisible();
        assert.notEqual(
          (await read(b, wedding.id + '/organizer')).fling.title,
          'This must not be saved',
        );
        assert.equal(
          (
            await a.request.get(`${base}/api/flings/${wedding.id}/organizer`)
          ).status(),
          409,
        );
        assert.equal(
          (await read(a, outing.id + '/organizer')).fling.id,
          outing.id,
        );
        assert.equal(
          (await read(a, `${concerts.id}/member/${caseyMember.id}`)).profile
            .name,
          'Casey',
        );
        await expect(
          bp
            .getByRole('listitem')
            .getByRole('button', { name: 'Remove', exact: true }),
        ).toBeDisabled();
        assert.deepEqual(errors, []);
        for (const f of made)
          receipts.push({
            engine,
            browser: browser.version(),
            width,
            gathering: f.key,
            passed: true,
            checks: [
              'independent-interface-authoring',
              'distinct-event-times-and-places',
              'confirmed-organizer-assignment',
              'organizer-member-profile-edit-and-cancel',
              'closed-organizer-profile-correction',
              'stale-organizer-profile-edit-rejected',
              'invited-accepted-declined-withdrawn-preview-parity',
              'preview-write-denial',
              'draft-hiding-cancellation-notice',
              'closure-stale-response',
              'closed-profile-correction',
              'reopen-preserves-responses',
              'unrelated-role-denial',
              'three-member-sessions',
              'matching-contact-independence',
              'cross-fling-child-denial',
              'scoped-organizer-revocation',
              'tokyo-viewer-event-zone',
              'no-overflow',
              'no-page-errors',
            ],
          });
      } finally {
        for (const c of contexts) await c.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/independent-gatherings-20260912.json',
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      source_base: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      node: process.version,
      os: os.platform() + ' ' + os.release(),
      receipts,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `${receipts.length} independent-gathering browser journeys passed.`,
);
