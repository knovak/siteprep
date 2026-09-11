import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [];
for (const [engine, launcher] of Object.entries({
  chromium,
  firefox,
  webkit,
})) {
  const browser = await launcher.launch();
  try {
    for (const width of [1280, 390]) {
      console.log('Event details journey', engine, width);
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        timezoneId: 'Asia/Tokyo',
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + '/organizer');
      await page.getByRole('button', { name: 'Casey', exact: true }).click();
      await page.getByLabel('New fling title').fill('Weekend with friends');
      await page
        .getByRole('button', { name: 'Create fling', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Weekend with friends' }),
      ).toBeVisible();
      const fling = page.url().split('/').pop();
      const overview = async () =>
        (
          await context.request.get(`${base}/api/flings/${fling}/organizer`)
        ).json();
      const save = async (kind) => {
        await page
          .getByRole('button', { name: 'Save ' + kind, exact: true })
          .click();
        await expect(
          page.getByText('Gathering plan saved. No message was sent.'),
        ).toBeVisible();
        await expect(page.locator('.author-form')).toHaveCount(0);
      };
      await page
        .getByRole('button', { name: 'Edit fling details', exact: true })
        .click();
      await page
        .getByLabel('Fling description (visible to every member)', {
          exact: true,
        })
        .fill('A film, a shared meal, and time to catch up.');
      await page
        .getByLabel('Default time zone', { exact: true })
        .fill('Australia/Brisbane');
      await save('fling details');
      await page
        .getByRole('button', { name: 'Add activity', exact: true })
        .click();
      await page
        .getByLabel('Activity title', { exact: true })
        .fill('Movie and meal');
      await page
        .getByLabel('Activity status', { exact: true })
        .selectOption('published');
      await save('activity');
      await page
        .getByRole('button', {
          name: 'Add event to Movie and meal',
          exact: true,
        })
        .click();
      await expect(
        page.getByLabel('Event time zone', { exact: true }),
      ).toHaveValue('Australia/Brisbane');
      await page
        .getByLabel('Event title', { exact: true })
        .fill('Evening screening');
      await page
        .getByLabel('Local date and time', { exact: true })
        .fill('2026-11-01T00:30');
      await page
        .getByLabel('Local end date and time (optional)', { exact: true })
        .fill('2026-11-01T01:30');
      await page
        .getByLabel('Event time zone', { exact: true })
        .fill('America/Los_Angeles');
      await page
        .getByLabel('Invitation location (visible before acceptance)', {
          exact: true,
        })
        .fill('Downtown · location shared after acceptance');
      await page
        .getByLabel('Accepted members only: location name', { exact: true })
        .fill('Fictional Lantern Cinema');
      await page
        .getByLabel('Accepted members only: street address', { exact: true })
        .fill('123 Fictional Lane');
      await page
        .getByLabel('Accepted members only: location link', { exact: true })
        .fill('https://example.invalid/private-venue');
      await expect(
        page.getByLabel('End time occurs twice: choose UTC offset', {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Save event', exact: true })
        .click();
      assert.equal((await overview()).events.length, 0);
      await page
        .getByLabel('End time occurs twice: choose UTC offset', { exact: true })
        .selectOption('2026-11-01T09:30:00.000Z');
      await save('event');
      const first = (await overview()).events[0];
      assert.equal(first.starts, '2026-11-01T07:30:00.000Z');
      assert.equal(first.ends, '2026-11-01T09:30:00.000Z');
      assert.ok(Number.isSafeInteger(first.changed_at));
      await page
        .getByRole('button', { name: 'Edit fling details', exact: true })
        .click();
      await page
        .getByLabel('Default time zone', { exact: true })
        .fill('Europe/London');
      await save('fling details');
      assert.deepEqual((await overview()).events[0], first);
      await page
        .getByRole('button', { name: 'Edit Evening screening', exact: true })
        .click();
      await expect(
        page.getByLabel('End time occurs twice: choose UTC offset', {
          exact: true,
        }),
      ).toHaveValue(first.ends);
      await expect(
        page.getByLabel('Accepted members only: location link', {
          exact: true,
        }),
      ).toHaveValue(first.location_url);
      await page
        .getByLabel('Local end date and time (optional)', { exact: true })
        .fill('2026-11-01T00:00');
      await page
        .getByRole('button', { name: 'Save event', exact: true })
        .click();
      await expect(page.getByRole('alert')).toContainText(
        'The end must be after the start.',
      );
      assert.deepEqual((await overview()).events[0], first);
      await page
        .getByLabel('Local end date and time (optional)', { exact: true })
        .fill('2027-03-14T02:30');
      await page
        .getByRole('button', { name: 'Save event', exact: true })
        .click();
      await expect(page.getByRole('alert')).toContainText(
        'That local time does not exist',
      );
      assert.deepEqual((await overview()).events[0], first);
      await page
        .getByLabel('Local end date and time (optional)', { exact: true })
        .fill('2026-11-01T02:30');
      await save('event');
      assert.equal(
        (await overview()).events[0].ends,
        '2026-11-01T10:30:00.000Z',
      );
      await page
        .getByLabel('Member name', { exact: true })
        .fill('Fictional Guest');
      await page
        .getByRole('button', { name: 'Create member', exact: true })
        .click();
      await expect(
        page.getByText('Member profile created. No message was sent.'),
      ).toBeVisible();
      await page
        .getByRole('button', {
          name: 'Invite Fictional Guest · Movie and meal',
          exact: true,
        })
        .click();
      await expect(
        page.getByText('Invitation saved. No message was sent.'),
      ).toBeVisible();
      const snapshot = await overview(),
        member = snapshot.members[0];
      const issue = await context.request.post(
        `${base}/api/flings/${fling}/organizer/${member.id}/issue`,
        { headers: { Origin: base, 'x-flings-csrf': snapshot.csrf }, data: {} },
      );
      assert.equal(issue.status(), 200);
      const mp = await context.newPage();
      mp.on('pageerror', (e) => errors.push(e.message));
      await mp.goto(
        `${base}/f/${fling}/member#code=${(await issue.json()).code}`,
      );
      await expect(
        mp.getByRole('button', { name: 'Accept invitation', exact: true }),
      ).toBeVisible();
      await expect(
        mp.getByText('A film, a shared meal, and time to catch up.'),
      ).toBeVisible();
      await expect(
        mp.getByText('Downtown · location shared after acceptance'),
      ).toBeVisible();
      await expect(mp.getByText('123 Fictional Lane')).toHaveCount(0);
      const projection = async () =>
        (
          await context.request.get(
            `${base}/api/flings/${fling}/member/${member.id}`,
          )
        ).json();
      assert.equal((await projection()).events[0].location_url, null);
      await mp
        .getByRole('button', { name: 'Accept invitation', exact: true })
        .click();
      await expect(mp.getByText('123 Fictional Lane')).toBeVisible();
      const link = mp.getByRole('link', { name: 'Location link', exact: true });
      await expect(link).toHaveAttribute('href', first.location_url);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
      await expect(mp.locator('time').nth(1)).toHaveAttribute(
        'datetime',
        '2026-11-01T10:30:00.000Z',
      );
      await expect(mp.getByText('Updated ', { exact: false })).toContainText(
        'America/Los_Angeles',
      );
      // Separate preview authority must show the same accepted projection, without a code.
      const fresh = await overview();
      const preview = await context.request.post(
        `${base}/api/flings/${fling}/organizer/${member.id}/preview`,
        { headers: { Origin: base, 'x-flings-csrf': fresh.csrf }, data: {} },
      );
      assert.equal(preview.status(), 200);
      const pp = await context.newPage();
      await pp.goto(new URL((await preview.json()).url, base).href);
      await expect(pp.getByText('123 Fictional Lane')).toBeVisible();
      await expect(
        pp.getByRole('button', { name: 'Accept invitation', exact: true }),
      ).toHaveCount(0);
      for (const view of [mp, pp])
        assert.equal(
          await view.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      await pp.close();
      await mp.bringToFront();
      await mp
        .getByRole('button', { name: 'Decline invitation', exact: true })
        .click();
      await expect(mp.getByText('123 Fictional Lane')).toHaveCount(0);
      assert.equal(
        JSON.stringify(await projection()).includes('private-venue'),
        false,
      );
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        browser: browser.version(),
        width,
        passed: true,
        checks: [
          'description',
          'default-zone-prefill',
          'existing-event-zone-preserved',
          'end-repeat-choice',
          'end-range-rejection',
          'end-gap-rejection',
          'round-trip-end-and-location',
          'updated-time',
          'invitation-location',
          'participant-only-location',
          'preview-parity',
          'decline-redaction',
          'external-link-referrer',
          'tokyo-viewer-event-zone',
          'no-overflow',
          'no-page-errors',
        ],
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/event-details-20260911.json',
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
console.log(`${receipts.length} event details journeys passed.`);
