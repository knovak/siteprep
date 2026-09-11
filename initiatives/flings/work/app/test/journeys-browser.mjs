import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [],
  run = Date.now();
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      for (const [fling, title, organizer, activity] of [
        ['outing', 'A movie, then dinner', 'Casey', 'Movie & dinner'],
        ['wedding', 'Maya & Theo’s wedding', 'Rowan', 'The ceremony'],
        ['concerts', 'Concerts through autumn', 'Sam', 'Autumn concerts'],
      ]) {
        const context = await browser.newContext({
          viewport,
          timezoneId: 'Asia/Tokyo',
        });
        const page = await context.newPage(),
          errors = [];
        context.on('page', (p) =>
          p.on('pageerror', (e) => errors.push(e.message)),
        );
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(base + '/organizer');
        await page
          .getByRole('button', { name: organizer, exact: true })
          .click();
        await expect(
          page.getByRole('link', { name: title, exact: true }),
        ).toBeVisible();
        await expect(page.locator('.gatherings article')).toHaveCount(
          organizer === 'Casey' ? 2 : 1,
        );
        await page.getByRole('link', { name: title, exact: true }).click();
        await expect(
          page.getByRole('heading', { level: 1, name: title }),
        ).toBeVisible();
        if (
          await page
            .getByRole('button', { name: 'Reopen fling', exact: true })
            .count()
        ) {
          await page
            .getByRole('button', { name: 'Reopen fling', exact: true })
            .click();
          await page.getByRole('button', { name: 'Confirm reopening' }).click();
        }
        const name = `Rehearsal ${engine} ${viewport.width} ${run}`;
        await page.getByLabel('Member name', { exact: true }).fill(name);
        await page
          .getByLabel('Member email', { exact: true })
          .fill('fictional@example.invalid');
        await page
          .getByRole('button', { name: 'Create member', exact: true })
          .click();
        await expect(
          page.getByText('Member profile created. No message was sent.'),
        ).toBeVisible();
        await page
          .getByRole('button', {
            name: `Invite ${name} · ${activity}`,
            exact: true,
          })
          .click();
        await expect(
          page.getByText('Invitation saved. No message was sent.'),
        ).toBeVisible();
        const overview = await (
          await context.request.get(base + `/api/flings/${fling}/organizer`)
        ).json();
        const m = overview.members.find((m) => m.name === name),
          a = overview.activities.find((a) => a.title === activity);
        const response = await context.request.post(
          base + `/api/flings/${fling}/organizer/${m.id}/issue`,
          {
            headers: { Origin: base, 'x-flings-csrf': overview.csrf },
            data: {},
          },
        );
        assert.equal(response.status(), 200);
        const { code } = await response.json();
        const mp = await context.newPage();
        await mp.goto(base + `/f/${fling}/member#code=${code}`);
        await expect(
          mp.getByRole('button', { name: 'Accept invitation' }),
        ).toBeVisible();
        assert.equal(new URL(mp.url()).hash, '');
        const memberRead = async () =>
          (
            await context.request.get(
              base + `/api/flings/${fling}/member/${m.id}`,
            )
          ).json();
        assert.equal((await memberRead()).activities[0].details, null);
        await mp
          .getByRole('button', { name: 'Accept invitation' })
          .press('Enter');
        await expect(mp.locator('.badge.accepted')).toBeVisible();
        assert.ok((await memberRead()).activities[0].details);
        await expect(mp.locator('.event').first()).toContainText(
          'America/Los_Angeles',
        );
        await mp.getByRole('button', { name: 'Decline invitation' }).click();
        await expect(mp.locator('.badge.declined')).toBeVisible();
        assert.equal((await memberRead()).activities[0].details, null);
        await page.bringToFront();
        await expect(
          page.getByRole('button', { name: 'Preview ' + name, exact: true }),
        ).toBeVisible();
        await page
          .getByRole('button', { name: 'Preview ' + name, exact: true })
          .click();
        await expect(
          page.getByText(`Preview — ${name} · read-only`),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: /Accept invitation|Save profile/ }),
        ).toHaveCount(0);
        await page.goto(base + '/organizer/' + fling);
        await page
          .getByRole('button', { name: 'Close fling', exact: true })
          .click();
        await page.getByRole('button', { name: 'Confirm closure' }).click();
        await expect(
          page.getByRole('button', { name: 'Reopen fling', exact: true }),
        ).toBeVisible();
        // Deliberately keep the member tab stale: direct HTTP uses its old revision.
        assert.equal(
          (
            await context.request.post(
              base + `/api/flings/${fling}/member/${m.id}/respond`,
              {
                headers: {
                  Origin: base,
                  'x-flings-csrf': (
                    await (
                      await context.request.get(
                        base + `/api/flings/${fling}/session`,
                      )
                    ).json()
                  ).csrf,
                },
                data: {
                  activity: a.id,
                  state: 'accepted',
                  revision: overview.fling.revision,
                },
              },
            )
          ).status(),
          409,
        );
        await mp.reload();
        await expect(
          mp.getByText(
            'This fling is closed. You can still correct your contact details.',
          ),
        ).toBeVisible();
        await expect(
          mp.getByRole('button', { name: 'Accept invitation' }),
        ).toHaveCount(0);
        await mp.getByRole('button', { name: 'Save profile' }).click();
        await expect(
          mp.getByText('Your profile is saved for this fling.'),
        ).toBeVisible();
        await page.bringToFront();
        await page
          .getByRole('button', { name: 'Reopen fling', exact: true })
          .click();
        await page.getByRole('button', { name: 'Confirm reopening' }).click();
        await expect(
          page.getByRole('button', { name: 'Close fling', exact: true }),
        ).toBeVisible();
        assert.equal((await memberRead()).activities[0].invitation, 'declined');
        await page
          .getByRole('button', {
            name: `Withdraw ${name} · ${activity}`,
            exact: true,
          })
          .click();
        await expect(page.getByText('Invitation withdrawn.')).toBeVisible();
        assert.equal((await memberRead()).activities.length, 0);
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            {
              message:
                engine + ' ' + viewport.width + ' ' + fling + ' overflow',
            },
          )
          .toBe(true);
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          browser: browser.version(),
          viewport,
          fling,
          passed: true,
          checks: [
            'assigned-flings',
            'profile-created',
            'invite',
            'accept-by-keyboard',
            'decline-redaction',
            'event-zone',
            'preview-read-only',
            'close-stale-write',
            'closed-profile-correction',
            'reopen-preserves-response',
            'withdraw-redaction',
            'no-overflow',
            'no-page-errors',
          ],
        });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await mkdir('test/evidence', { recursive: true });
await writeFile(
  'test/evidence/phase-2-journeys.json',
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      node: process.version,
      os: os.platform() + ' ' + os.release(),
      receipts,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${receipts.length} organizer/member browser journeys passed.`);
