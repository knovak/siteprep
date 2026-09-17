import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
  request,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Local fictional test only.');
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [];
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
      const api = await request.newContext({ baseURL: base });
      const login = await api.post('/api/flings/local/organizer', {
        headers: { Origin: base, 'x-flings-local': '1' },
        data: { organizer: 'a' },
      });
      assert.equal(login.status(), 200);
      const headers = {
        Origin: base,
        'x-flings-csrf': (await login.json()).csrf,
        'x-flings-organizer': 'a',
      };
      async function org(path, data) {
        const r =
          data === undefined
            ? await api.get('/api/flings/' + path, { headers })
            : await api.post('/api/flings/' + path, { headers, data });
        assert.ok(r.ok(), `Organizer request failed: ${r.status()}`);
        return r.json();
      }
      const title = `Member recovery ${engine} ${width} ${Date.now()}`;
      const fling = (await org('workspace/organizer', { title })).id;
      const overview = () => org(fling + '/organizer');
      const write = async (kind, data) =>
        org(`${fling}/organizer/${kind}`, {
          ...data,
          revision: (await overview()).fling.revision,
        });
      await write('activity', {
        title: 'Dinner',
        summary: 'Fictional dinner',
        details: 'Private table',
        state: 'published',
      });
      const activity = (await overview()).activities[0].id;
      await write('event', {
        activity,
        title: 'Dinner event',
        summary: '',
        details: 'Private event',
        local: '2026-10-17T18:00',
        zone: 'America/Los_Angeles',
      });
      const event = (await overview()).events[0].id;
      const member = (
        await org(`${fling}/organizer/members`, {
          name: 'Fictional Alex',
          email: 'alex@example.invalid',
          phone: '',
          preference: 'email',
        })
      ).id;
      await write('invitation', { activity, member, state: 'invited' });
      const link = await org(`${fling}/organizer/${member}/issue`, {});
      const context = await browser.newContext({
        baseURL: base,
        viewport: { width, height: 900 },
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/f/${fling}/member#code=${link.code}`);
      await page
        .getByRole('button', { name: 'Accept invitation', exact: true })
        .click();
      await expect(
        page.getByText('You’re going', { exact: true }),
      ).toBeVisible();
      await write('coordination', {
        kind: 'poll',
        activity,
        event,
        title: 'Drink?',
        options: ['Water', 'Tea'],
        multiple: false,
        members: [member],
      });
      await page
        .getByRole('button', { name: 'Refresh coordination', exact: true })
        .click();
      await page.getByRole('radio', { name: 'Tea', exact: true }).check();
      await page
        .getByRole('button', { name: 'Save vote', exact: true })
        .click();
      await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
      await page.getByRole('radio', { name: 'Water', exact: true }).check();
      const before = await org(`${fling}/organizer/coordination`);
      await write('state', { state: 'closed', confirm: true });
      await page
        .getByRole('button', { name: 'Save vote', exact: true })
        .click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(
        page.getByText('Opening your member page…', { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel('Name', { exact: true })).toHaveCount(0);
      const retry = page.getByRole('button', {
        name: 'Reload member page',
        exact: true,
      });
      await expect(retry).toBeEnabled();
      await retry.click();
      await expect(
        page.getByText(
          'This fling is closed. You can still correct your contact details.',
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Save vote', exact: true }),
      ).toHaveCount(0);
      const after = await org(`${fling}/organizer/coordination`);
      assert.deepEqual(
        after.polls,
        before.polls,
        'Rejected vote must preserve poll records',
      );
      await page
        .getByLabel('Name', { exact: true })
        .fill('Fictional Alex corrected');
      await page
        .getByRole('button', { name: 'Save profile', exact: true })
        .click();
      await expect(
        page.getByText('Your profile is saved for this fling.', {
          exact: true,
        }),
      ).toBeVisible();
      await write('state', { state: 'open', confirm: true });
      await page.reload();
      await expect(
        page.getByRole('radio', { name: 'Tea', exact: true }),
      ).toBeChecked();
      // Revoke all old credentials, but do not open the replacement link.
      await org(`${fling}/organizer/${member}/replace`, { confirm: true });
      await page
        .getByRole('button', { name: 'Refresh coordination', exact: true })
        .click();
      await expect(page.getByRole('alert')).toBeVisible();
      await retry.click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(retry).toBeEnabled();
      await expect(page.getByLabel('Name', { exact: true })).toHaveCount(0);
      // A different session must not make Retry silently switch memberships.
      const other = (
        await org(`${fling}/organizer/members`, {
          name: 'Other fictional member',
          email: '',
          phone: '',
          preference: 'email',
        })
      ).id;
      const otherLink = await org(`${fling}/organizer/${other}/issue`, {});
      const exchange = await context.request.post(
        `/api/flings/${fling}/exchange`,
        {
          headers: { Origin: base, 'x-flings-exchange': '1' },
          data: { code: otherLink.code },
        },
      );
      assert.equal(exchange.status(), 200);
      await retry.click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(retry).toBeEnabled();
      await expect(
        page.getByText('Other fictional member', { exact: false }),
      ).toHaveCount(0);
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        browser: browser.version(),
        width,
        passed: true,
        checks: [
          'stale-closed-vote-error',
          'same-member-retry',
          'poll-unchanged',
          'closed-profile-correction',
          'reopen-preserves-vote',
          'revocation-remains-denied',
          'different-session-never-adopted',
        ],
      });
      await context.close();
      await api.dispose();
      console.log('Member recovery passed', engine, width);
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/member-recovery-20260917.json',
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      node: process.version,
      os: `${os.platform()} ${os.release()}`,
      receipts,
    },
    null,
    2,
  ) + '\n',
);
