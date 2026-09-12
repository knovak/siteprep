import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const login = await context.request.post(
        base + '/api/flings/local/organizer',
        {
          headers: { Origin: base, 'x-flings-local': '1' },
          data: { organizer: 'a' },
        },
      );
      assert.equal(login.status(), 200);
      const { csrf } = await login.json();
      const headers = {
        Origin: base,
        'x-flings-csrf': csrf,
        'x-flings-organizer': 'a',
      };
      const api = async (path, data) => {
        const res = data
          ? await context.request.post(base + '/api/flings/' + path, {
              headers,
              data,
            })
          : await context.request.get(base + '/api/flings/' + path, {
              headers,
            });
        const value = await res.json();
        assert.ok(res.ok(), value.error || path);
        return value;
      };
      const fling = (
        await api('workspace/organizer', {
          title: `Coordination ${engine} ${viewport.width}`,
        })
      ).id;
      const state = () => api(fling + '/organizer');
      let revision = 0;
      const author = async (kind, data) => {
        const x = await api(fling + '/organizer/' + kind, {
          revision,
          ...data,
        });
        revision = (await state()).fling.revision;
        return x;
      };
      await author('activity', {
        title: 'Dinner',
        summary: 'Dinner summary',
        details: 'Participant details',
        state: 'published',
      });
      const activity = (await state()).activities[0].id;
      await author('event', {
        activity,
        title: 'At the table',
        summary: 'Evening',
        details: 'Private room',
        zone: 'America/Los_Angeles',
        local: '2026-10-03T19:00',
      });
      const member = (
        await api(fling + '/organizer/members', {
          name: 'Alex',
          email: 'alex@example.invalid',
          phone: '',
          preference: 'email',
        })
      ).id;
      const outsider = (
        await api(fling + '/organizer/members', {
          name: 'Robin',
          email: 'robin@example.invalid',
          phone: '',
          preference: 'email',
        })
      ).id;
      await author('invitation', { member, activity, state: 'invited' });
      const link = await api(fling + '/organizer/' + member + '/issue', {});
      const mc = await browser.newContext({ viewport }),
        mp = await mc.newPage();
      mp.on('pageerror', (e) => errors.push(e.message));
      await mp.goto(base + '/f/' + fling + '/member#code=' + link.code);
      await expect(
        mp.getByRole('heading', {
          name: `Coordination ${engine} ${viewport.width}`,
          exact: true,
        }),
      ).toBeVisible();
      await mp.getByRole('button', { name: 'Accept invitation' }).click();
      await expect(mp.getByText('You’re going', { exact: true })).toBeVisible();
      await page.goto(base + '/organizer/' + fling);
      const panel = page.getByRole('region', {
        name: 'Coordination',
        exact: true,
      });
      await expect(
        panel.getByRole('button', { name: 'Write a post' }),
      ).toBeVisible();
      // Organizer creates a fling post through the form, using literal HTML-like text.
      await panel.getByRole('button', { name: 'Write a post' }).click();
      await page
        .getByLabel('Post text', { exact: true })
        .fill(
          'Welcome <img src=x onerror=alert(1)> https://example.invalid/info',
        );
      await page
        .getByRole('button', { name: 'Save coordination', exact: true })
        .click();
      await expect(panel.getByText(/Welcome <img/)).toBeVisible();
      assert.equal(await panel.locator('img').count(), 0);
      assert.equal(
        await panel
          .getByRole('link', {
            name: 'https://example.invalid/info',
            exact: true,
          })
          .getAttribute('rel'),
        'noopener noreferrer',
      );
      await panel
        .getByRole('button', { name: 'Create a poll', exact: true })
        .click();
      await page.getByLabel('Poll question').fill('What shall we eat?');
      await page.getByLabel('Choices, one per line').fill('Soup\nSalad');
      await page.getByRole('checkbox', { name: 'Alex', exact: true }).check();
      await page
        .getByRole('button', { name: 'Save coordination', exact: true })
        .click();
      await expect(
        panel.getByRole('heading', { name: 'What shall we eat?' }),
      ).toBeVisible();
      await panel
        .getByRole('button', { name: 'Request a payment', exact: true })
        .click();
      await page.getByLabel('Payment description').fill('Dinner share');
      await page
        .getByLabel('Allocate to an accepted member')
        .selectOption(member);
      await page
        .getByLabel('Amount in minor units (USD cents, JPY yen)', {
          exact: true,
        })
        .fill('1000');
      await page
        .getByLabel('Outside payment link (optional)')
        .fill('https://example.invalid/pay');
      await page
        .getByRole('button', { name: 'Save coordination', exact: true })
        .click();
      await expect(
        panel.getByText('1000 USD minor units outstanding'),
      ).toBeVisible();
      // Member coordinates by keyboard; other memberships cannot retrieve the content.
      await mp.bringToFront();
      await mp.reload();
      const mPanel = mp.getByRole('region', {
        name: 'Coordination',
        exact: true,
      });
      await expect(
        mPanel.getByRole('heading', { name: 'What shall we eat?' }),
      ).toBeVisible();
      await mPanel.getByRole('radio', { name: 'Soup', exact: true }).check();
      await mPanel
        .getByRole('button', { name: 'Save vote', exact: true })
        .press('Enter');
      await expect(
        mPanel.getByRole('radio', { name: 'Soup', exact: true }),
      ).toBeChecked();
      assert.equal(await mPanel.getByText(/Results:/).count(), 0);
      await mPanel.getByRole('button', { name: 'Write a post' }).click();
      await mp
        .getByLabel('Discussion audience')
        .selectOption({ label: 'At the table · event' });
      await mp
        .getByLabel('Post text', { exact: true })
        .fill('PRIVATE DINNER POST');
      await mp
        .getByRole('button', { name: 'Save coordination', exact: true })
        .click();
      await expect(mPanel.getByText('PRIVATE DINNER POST', { exact: true }))
        .toBeVisible()
        .catch(async (e) => {
          console.log(await mp.locator('body').innerText());
          throw e;
        });
      await mPanel
        .getByRole('button', { name: 'Edit post', exact: true })
        .click();
      await mp
        .getByLabel('Post text', { exact: true })
        .fill('PRIVATE DINNER POST EDITED');
      await mp
        .getByRole('button', { name: 'Save coordination', exact: true })
        .click();
      await expect(
        mPanel.getByText('PRIVATE DINNER POST EDITED', { exact: true }),
      ).toBeVisible();
      await mPanel
        .getByRole('button', { name: 'Report outside payment', exact: true })
        .click();
      await mp.getByLabel('Amount in minor units', { exact: true }).fill('600');
      await mp
        .getByLabel('Outside payment reference (optional)')
        .fill('Fictional transfer');
      await mp.getByRole('button', { name: 'Submit report' }).click();
      await expect(
        mPanel.getByText('Reported, unconfirmed', { exact: true }),
      ).toBeVisible();
      await expect(
        mPanel.getByText('1000 USD minor units outstanding'),
      ).toBeVisible();
      const wrong = await api(
        fling + '/organizer/' + outsider + '/preview',
        {},
      );
      const preview = await context.newPage();
      await preview.goto(base + wrong.url);
      await expect(
        preview.getByText('Preview — Robin · read-only'),
      ).toBeVisible();
      await expect(
        preview
          .getByRole('region', { name: 'Coordination', exact: true })
          .getByText(/Welcome <img/),
      ).toBeVisible();
      assert.ok(
        !(await preview.locator('body').innerText()).includes('PRIVATE DINNER'),
      );
      assert.equal(
        await preview.getByRole('heading', { name: 'Dinner share' }).count(),
        0,
      );
      assert.equal(
        await preview.getByRole('button', { name: 'Write a post' }).count(),
        0,
      );
      // Partial confirmation reduces the balance; close and reopen retain the ledger and poll.
      await page.bringToFront();
      await page.reload();
      await panel.getByRole('button', { name: 'Record adjustment' }).click();
      await page
        .getByLabel('Reported payment to confirm')
        .selectOption({ index: 1 });
      await page
        .getByLabel('Amount in minor units', { exact: true })
        .fill('400');
      await page
        .getByLabel('Reason or reference')
        .fill('Checked fictional transfer');
      await page
        .getByRole('button', { name: 'Save coordination', exact: true })
        .click();
      await expect(
        panel.getByText('600 USD minor units outstanding'),
      ).toBeVisible();
      await panel
        .getByRole('button', { name: 'Close poll', exact: true })
        .click();
      await expect(panel.getByText('Closed', { exact: true })).toBeVisible();
      const postCard = panel
        .locator('article')
        .filter({ hasText: 'PRIVATE DINNER POST EDITED' });
      await postCard
        .getByRole('button', { name: 'Hide post', exact: true })
        .click();
      await page
        .getByLabel('Reason for hiding')
        .fill('Fictional moderation review');
      await page
        .getByRole('button', { name: 'Hide post', exact: true })
        .first()
        .click();
      await expect(
        postCard.getByText('Post hidden by an organizer.'),
      ).toBeVisible();
      const pre = await api(fling + '/organizer/coordination');
      const { csrf: memberCsrf } = await (
        await mc.request.get(base + '/api/flings/' + fling + '/session')
      ).json();
      const late = {
        kind: 'post',
        body: 'STALE SHOULD FAIL',
        revision: pre.revision,
      };
      await author('state', {
        state: 'closed',
        confirm: true,
        revision: (await state()).fling.revision,
      });
      const denied = await mc.request.post(
        base + '/api/flings/' + fling + '/member/' + member + '/coordination',
        { headers: { Origin: base, 'x-flings-csrf': memberCsrf }, data: late },
      );
      assert.equal(denied.status(), 409);
      await mp.reload();
      await expect(
        mPanel.getByText('600 USD minor units outstanding'),
      ).toBeVisible();
      await expect(
        mPanel.getByText('Results: Soup: 1 · Salad: 0'),
      ).toBeVisible();
      assert.equal(
        await mPanel.getByRole('button', { name: 'Write a post' }).count(),
        0,
      );
      await author('state', {
        state: 'open',
        confirm: true,
        revision: (await state()).fling.revision,
      });
      await mp.reload();
      await expect(
        mPanel.getByText('Results: Soup: 1 · Salad: 0'),
      ).toBeVisible();
      await expect(
        mPanel.getByText('600 USD minor units outstanding'),
      ).toBeVisible();
      assert.equal(
        await mPanel.getByRole('button', { name: 'Save vote' }).count(),
        0,
      );
      assert.ok(
        !(await mPanel.innerText()).includes('PRIVATE DINNER POST EDITED'),
      );
      assert.equal(
        await mp.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      if (engine === 'chromium' && viewport.width === 1280) {
        await mkdir('.wrangler/qa', { recursive: true });
        await context.storageState({
          path: '.wrangler/qa/organizer-state.json',
        });
        await chmod('.wrangler/qa/organizer-state.json', 0o600);
        await writeFile('.wrangler/qa/fling.txt', fling, { mode: 0o600 });
      }
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'literal-text-safe-link',
          'scope-aware-discussion',
          'own-post-edit',
          'reviewed-poll-subset',
          'member-vote',
          'member-result-privacy',
          'explicit-allocation',
          'report-versus-confirmation',
          'partial-confirmation',
          'preview-isolation',
          'attributed-hide',
          'stale-closure-rejection',
          'closed-poll-survives-reopen',
          'history-survives-reopen',
          'keyboard-submit',
          'no-overflow',
          'no-browser-errors',
        ],
      });
      await preview.close();
      await context.close();
      await mc.close();
    }
  } finally {
    await browser.close();
  }
}
await mkdir('test/evidence', { recursive: true });
await writeFile(
  'test/evidence/coordination-20260912.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' coordination browser journeys passed.');
