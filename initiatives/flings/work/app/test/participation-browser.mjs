import { chromium, firefox, webkit, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const receipts = [];
for (const [engine, launcher] of Object.entries({
  chromium,
  firefox,
  webkit,
})) {
  if (process.env.FLINGS_BROWSER && process.env.FLINGS_BROWSER !== engine)
    continue;
  let browser;
  try {
    browser = await launcher.launch({ timeout: 30000 });
  } catch (error) {
    receipts.push({
      engine,
      unavailable: String(error.message).split('\n')[0],
    });
    continue;
  }
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const login = await context.request.post(
        base + '/api/flings/local/organizer',
        {
          headers: { origin: base, 'x-flings-local': '1' },
          data: { organizer: 'a' },
        },
      );
      assert.equal(login.status(), 200);
      const auth = await login.json();
      const headers = {
        origin: base,
        'x-flings-organizer': 'a',
        'x-flings-csrf': auth.csrf,
      };
      async function post(path, data) {
        const response = await context.request.post(
          base + '/api/flings/' + path,
          { headers, data },
        );
        const body = await response.json();
        assert.ok(response.ok(), JSON.stringify(body));
        return body;
      }
      const { id: fling } = await post('workspace/organizer', {
        title: `Participation ${engine} ${width} ${Date.now()}`,
      });
      const get = async () =>
        (
          await context.request.get(base + `/api/flings/${fling}/organizer`)
        ).json();
      const members = [];
      for (const name of ['Alex', 'Blair', 'Casey'])
        members.push(
          await post(fling + '/organizer/members', {
            name,
            email: name.toLowerCase() + '@example.invalid',
            phone: '',
            preference: 'email',
          }),
        );
      const activity = await post(fling + '/organizer/activity', {
        revision: (await get()).fling.revision,
        title: 'Dinner table',
        summary: 'Three friends, one place',
        details: 'PRIVATE TABLE DETAILS',
        state: 'published',
      });
      await page.goto(base + '/organizer/' + fling);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Participation',
      );
      await page
        .getByRole('button', { name: 'Manage participation', exact: true })
        .click();
      await page.getByLabel('Limit participation', { exact: true }).check();
      await page.getByLabel('Maximum confirmed members').fill('1');
      await page.getByLabel('Cascading invitations', { exact: true }).check();
      await page
        .getByLabel('Response timeout (minutes, optional)', { exact: true })
        .fill('60');
      await page
        .getByLabel('Allow timed-out members to accept while a place remains')
        .check();
      for (const name of ['Alex', 'Blair', 'Casey'])
        await page.getByLabel(name, { exact: true }).check();
      await page
        .getByRole('button', { name: 'Move Casey earlier', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Save participation', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Cancel participation edit' }),
      ).toHaveCount(0);
      let data = await get();
      assert.deepEqual(JSON.parse(data.activities[0].invitation_order), [
        members[0].id,
        members[2].id,
        members[1].id,
      ]);
      assert.equal(data.invitations.length, 1);
      assert.equal(data.activities[0].allow_late, 1);
      const links = [];
      for (const m of members)
        links.push(await post(fling + '/organizer/' + m.id + '/issue', {}));
      const memberContext = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const memberPage = await memberContext.newPage();
      await memberPage.clock.install();
      await memberPage.goto(
        base + '/f/' + fling + '/member#code=' + links[0].code,
      );
      await expect(
        memberPage.getByRole('button', {
          name: 'Decline invitation',
          exact: true,
        }),
      ).toBeVisible();
      await memberPage
        .getByRole('button', { name: 'Decline invitation', exact: true })
        .click();
      await expect(
        memberPage.getByText('Your invitation response is saved.'),
      ).toBeVisible();
      data = await get();
      assert.equal(
        data.invitations.find((i) => i.member === members[2].id).state,
        'invited',
      );
      assert.equal(
        data.invitations.some((i) => i.member === members[1].id),
        false,
      );
      await memberPage.goto(
        base + '/f/' + fling + '/member#code=' + links[2].code,
      );
      await expect(
        memberPage.getByRole('button', {
          name: 'Accept invitation',
          exact: true,
        }),
      ).toBeVisible();
      await memberPage
        .getByRole('button', { name: 'Accept invitation', exact: true })
        .click();
      await expect(memberPage.getByText('PRIVATE TABLE DETAILS')).toBeVisible();
      await memberPage.goto(
        base + '/f/' + fling + '/member#code=' + links[0].code,
      );
      await expect(
        memberPage.getByText('Closed — all places have been filled.'),
      ).toBeVisible();
      await expect(
        memberPage.getByRole('button', {
          name: 'Accept invitation',
          exact: true,
        }),
      ).toBeDisabled();
      await expect(memberPage.getByText('PRIVATE TABLE DETAILS')).toHaveCount(
        0,
      );
      await memberPage
        .getByLabel('Name', { exact: true })
        .fill('Unsaved profile draft');
      const polled = memberPage.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().endsWith('/member/' + members[0].id),
      );
      await memberPage.clock.fastForward(15000);
      await polled;
      await expect(memberPage.getByLabel('Name', { exact: true })).toHaveValue(
        'Unsaved profile draft',
      );
      await page.reload();
      await expect(
        page.getByText('0 of 1 confirmed', { exact: false }),
      ).toHaveCount(0);
      await expect(
        page.getByText('1 of 1 confirmed · Closed — full', { exact: false }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Manage participation', exact: true })
        .click();
      await expect(
        page.getByLabel('Cascading invitations', { exact: true }),
      ).toBeChecked();
      await expect(
        page.getByLabel('Response timeout (minutes, optional)', {
          exact: true,
        }),
      ).toHaveValue('60');
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
      if (engine === 'chromium' && width === 1280) {
        await context.storageState({
          path: '/private/tmp/flings-screenshot-state.json',
        });
        await writeFile(
          '/private/tmp/flings-screenshot-url.txt',
          base + '/organizer/' + fling,
        );
      }
      receipts.push({
        engine,
        width,
        passed: true,
        checks: [
          'subset',
          'limit',
          'cascade order',
          'timeout configuration',
          'late policy',
          'decline advances',
          'confirmation closes',
          'private details',
          'reload',
          'no horizontal overflow',
          'poll preserves profile draft',
        ],
      });
      await memberContext.close();
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  new URL('./evidence/participation-20261112.json', import.meta.url),
  JSON.stringify(
    {
      date: '2026-11-12',
      scope: 'local fictional browser and D1 journeys',
      receipts,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(receipts, null, 2));
