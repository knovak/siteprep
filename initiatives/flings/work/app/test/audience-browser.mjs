import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile, chmod } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187',
  expect = baseExpect.configure({ timeout: 15000 }),
  receipts = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1280, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport }),
        page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const login = await context.request.post(
        base + '/api/flings/local/organizer',
        {
          headers: { Origin: base, 'x-flings-local': '1' },
          data: { organizer: 'a' },
        },
      );
      assert.equal(login.status(), 200);
      const { csrf } = await login.json(),
        headers = {
          Origin: base,
          'x-flings-csrf': csrf,
          'x-flings-organizer': 'a',
        };
      const api = async (path, data) => {
        const r = data
          ? await context.request.post(base + '/api/flings/' + path, {
              headers,
              data,
            })
          : await context.request.get(base + '/api/flings/' + path, {
              headers,
            });
        const v = await r.json();
        assert.ok(r.ok(), v.error || path);
        return v;
      };
      const fling = (
        await api('workspace/organizer', { title: 'Weekend together' })
      ).id;
      const state = () => api(fling + '/organizer'),
        rev = async () => (await state()).fling.revision;
      await api(fling + '/organizer/activity', {
        revision: await rev(),
        title: 'Saturday dinner',
        summary: 'Dinner together',
        details: 'Fictional venue',
        state: 'published',
      });
      const activity = (await state()).activities[0].id;
      await api(fling + '/organizer/event', {
        revision: await rev(),
        activity,
        title: 'Dinner table',
        summary: 'Evening',
        details: 'Private details',
        zone: 'America/Los_Angeles',
        local: '2026-10-03T19:00',
      });
      const event = (await state()).events[0].id,
        members = [];
      for (const [name, preference, email, phone] of [
        ['Alex', 'both', 'group@example.invalid', '+12025550123'],
        ['Robin', 'email', 'group@example.invalid', ''],
        ['Sam', 'text', '', ''],
      ]) {
        const member = (
          await api(fling + '/organizer/members', {
            name,
            preference,
            email,
            phone,
          })
        ).id;
        members.push(member);
        await api(fling + '/organizer/invitation', {
          revision: await rev(),
          activity,
          member,
          state: 'invited',
        });
        if (name === 'Sam') continue;
        const code = (await api(fling + '/organizer/' + member + '/issue', {}))
          .code;
        const exchange = await context.request.post(
          base + '/api/flings/' + fling + '/exchange',
          {
            headers: { Origin: base, 'x-flings-exchange': '1' },
            data: { code },
          },
        );
        const memberAuth = await exchange.json();
        const r = await context.request.post(
          base + '/api/flings/' + fling + '/member/' + member + '/respond',
          {
            headers: { Origin: base, 'x-flings-csrf': memberAuth.csrf },
            data: { revision: await rev(), activity, state: 'accepted' },
          },
        );
        assert.equal(r.status(), 200);
      }
      const poll = (
        await api(fling + '/organizer/coordination', {
          kind: 'poll',
          revision: await rev(),
          activity,
          event,
          title: 'Dinner choice',
          options: ['Soup', 'Salad'],
          multiple: false,
          members: members.slice(0, 2),
        })
      ).id;
      // Only Robin is unanswered: issue/exchange Alex again, without changing the organizer cookie.
      const code = (
        await api(fling + '/organizer/' + members[0] + '/issue', {})
      ).code;
      const ex = await context.request.post(
          base + '/api/flings/' + fling + '/exchange',
          {
            headers: { Origin: base, 'x-flings-exchange': '1' },
            data: { code },
          },
        ),
        ma = await ex.json();
      assert.equal(
        (
          await context.request.post(
            base +
              '/api/flings/' +
              fling +
              '/member/' +
              members[0] +
              '/coordination',
            {
              headers: { Origin: base, 'x-flings-csrf': ma.csrf },
              data: { kind: 'vote', revision: await rev(), poll, choices: [0] },
            },
          )
        ).status(),
        200,
      );
      await api(fling + '/organizer/coordination', {
        kind: 'payment',
        revision: await rev(),
        activity,
        event,
        member: members[1],
        title: 'Dinner share',
        currency: 'USD',
        amount: 1000,
        link: '',
      });
      await page.goto(base + '/organizer/' + fling);
      const panel = page.getByRole('region', {
        name: 'Message audience',
        exact: true,
      });
      const review = async () => {
        await panel
          .getByRole('button', { name: 'Review recipients', exact: true })
          .press('Enter');
        await expect(panel.locator('.audience-result')).toBeVisible();
      };
      await expect(
        panel.getByRole('button', { name: 'Review recipients', exact: true }),
      ).toBeEnabled();
      await review();
      await expect(
        panel.getByRole('heading', {
          name: '3 memberships · 3 individual messages',
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        panel.getByRole('heading', { name: 'Shared destinations need review' }),
      ).toBeVisible();
      await expect(
        panel.getByText(/Incomplete notification profile/),
      ).toBeVisible();
      await panel.getByLabel('Delivery channels').selectOption('text');
      await review();
      await expect(
        panel.getByRole('heading', {
          name: '3 memberships · 1 individual message',
          exact: true,
        }),
      ).toBeVisible();
      await panel.getByLabel('Delivery channels').selectOption('preference');
      await panel.getByLabel('Recipient group').selectOption('accepted');
      await panel.getByLabel('Audience activity').selectOption(activity);
      await review();
      await expect(
        panel.getByRole('heading', {
          name: '2 memberships · 3 individual messages',
          exact: true,
        }),
      ).toBeVisible();
      await panel
        .getByLabel('Further limit to')
        .selectOption('unanswered-poll');
      await panel.getByLabel('Audience poll').selectOption(poll);
      await review();
      await expect(
        panel.getByRole('heading', {
          name: '1 membership · 1 individual message',
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        panel.locator('.audience-columns').getByText('Robin', { exact: true }),
      ).toBeVisible();
      await panel.getByLabel('Recipient group').selectOption('all');
      await panel
        .getByLabel('Further limit to')
        .selectOption('unanswered-invitation');
      await panel.getByLabel('Audience activity').selectOption(activity);
      await review();
      await expect(
        panel.getByRole('heading', {
          name: '1 membership · 0 individual messages',
          exact: true,
        }),
      ).toBeVisible();
      await panel
        .getByLabel('Further limit to')
        .selectOption('outstanding-payment');
      await review();
      await expect(
        panel.locator('.audience-columns').getByText('Robin', { exact: true }),
      ).toBeVisible();
      await panel.getByLabel('Further limit to').selectOption('individuals');
      await panel.getByRole('checkbox', { name: 'Alex', exact: true }).check();
      await review();
      await expect(
        panel.getByRole('heading', {
          name: '1 membership · 2 individual messages',
          exact: true,
        }),
      ).toBeVisible();
      // Focus refresh removes an audience computed against an older profile revision.
      const current = (await state()).members.find((m) => m.id === members[0]);
      const changed = await context.request.put(
        base + '/api/flings/' + fling + '/organizer/' + members[0],
        { headers, data: { ...current, email: 'new@example.invalid' } },
      );
      assert.equal(changed.status(), 200);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(panel.locator('.audience-result')).toHaveCount(0);
      await panel
        .getByRole('button', { name: 'Review recipients', exact: true })
        .click();
      await expect(panel.locator('.audience-result')).toContainText(
        'new@example.invalid',
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      if (engine === 'chromium' && viewport.width === 1280) {
        await context.storageState({
          path: '.wrangler/qa/audience-state.json',
        });
        await chmod('.wrangler/qa/audience-state.json', 0o600);
        await writeFile('.wrangler/qa/audience-fling.txt', fling, {
          mode: 0o600,
        });
      }
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'group-selection',
          'channel-restriction',
          'duplicate-memberships-retained',
          'incomplete-profile-omission',
          'poll-subset-and-current-vote',
          'unanswered-invitation',
          'outstanding-balance',
          'individual-selection',
          'stale-profile-result-cleared',
          'keyboard-review',
          'no-overflow',
          'no-browser-errors',
        ],
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/audience-20260912.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' audience browser journeys passed.');
