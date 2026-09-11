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
const receipts = [],
  run = Date.now();
for (const [engine, browserType] of Object.entries({
  chromium,
  firefox,
  webkit,
})) {
  if (process.env.FLINGS_BROWSER && engine !== process.env.FLINGS_BROWSER)
    continue;
  const browser = await browserType.launch();
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        timezoneId: 'Asia/Tokyo',
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      console.log('Authoring journey', engine, width);
      const gathering = `Authored ${engine} ${width} ${run}`;
      await page.goto(base + '/organizer');
      await page.getByRole('button', { name: 'Casey', exact: true }).click();
      await page.getByLabel('New fling title').fill(gathering);
      await page
        .getByRole('button', { name: 'Create fling', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { level: 1, name: gathering }),
      ).toBeVisible();
      const fling = page.url().split('/').pop();
      const overview = async () =>
        (
          await context.request.get(`${base}/api/flings/${fling}/organizer`)
        ).json();
      const save = async (name) => {
        await page.getByRole('button', { name, exact: true }).click();
        await expect(
          page.getByText('Gathering plan saved. No message was sent.'),
        ).toBeVisible();
        await expect(page.locator('.author-form')).toHaveCount(0);
      };
      async function activity(title) {
        await page
          .getByRole('button', { name: 'Add activity', exact: true })
          .click();
        await page.getByLabel('Activity title', { exact: true }).fill(title);
        await page
          .getByLabel('Invitation summary')
          .fill('An invitation summary');
        await page
          .getByLabel('Accepted members only: place and details')
          .fill('Private activity location');
        await save('Save activity');
      }
      async function event(activityTitle, title, local) {
        await page
          .getByRole('button', {
            name: `Add event to ${activityTitle}`,
            exact: true,
          })
          .click();
        await page.getByLabel('Event title', { exact: true }).fill(title);
        await page.getByLabel('Invitation summary').fill('Event summary');
        await page
          .getByLabel('Accepted members only: place and details')
          .fill('Private ' + title + ' venue');
        await page.getByLabel('Local date and time').fill(local);
        await save('Save event');
      }
      // Author the three planned gathering shapes without seeded activity/event records.
      await activity('Movie and meal');
      await event('Movie and meal', 'Screening', '2026-10-03T18:00');
      await event('Movie and meal', 'Meal', '2026-10-03T20:30');
      for (const [title, date] of [
        ['Welcome', '2026-10-09T18:00'],
        ['Ceremony', '2026-10-10T15:00'],
        ['Brunch', '2026-10-11T10:00'],
      ]) {
        await activity(title);
        await event(title, title + ' event', date);
      }
      await activity('Concert series');
      await event('Concert series', 'October concert', '2026-10-17T19:00');
      await event('Concert series', 'November concert', '2026-11-14T19:00');
      const beforeOrder = await overview();
      assert.equal(beforeOrder.activities.length, 5);
      assert.equal(beforeOrder.events.length, 7);
      await page
        .getByRole('button', { name: 'Move Concert series up', exact: true })
        .click();
      await expect(
        page.locator('.activity-plan > article').nth(3),
      ).toContainText('Concert series');
      await page
        .getByRole('button', { name: 'Edit November concert', exact: true })
        .click();
      await expect(page.getByLabel('Local date and time')).toHaveValue(
        '2026-11-14T19:00',
      );
      await page.getByLabel('Local date and time').fill('2026-03-08T02:30');
      await page
        .getByRole('button', { name: 'Save event', exact: true })
        .click();
      await expect(
        page.getByText(
          'That local time does not exist in this zone. Choose another time.',
        ),
      ).toBeVisible();
      assert.deepEqual((await overview()).events, beforeOrder.events);
      await page.getByLabel('Local date and time').fill('2026-11-01T01:30');
      await page
        .getByRole('button', { name: 'Save event', exact: true })
        .click();
      await expect(
        page.getByLabel('This time occurs twice: choose UTC offset'),
      ).toBeVisible();
      assert.deepEqual((await overview()).events, beforeOrder.events);
      await page
        .getByLabel('This time occurs twice: choose UTC offset')
        .selectOption('2026-11-01T09:30:00.000Z');
      await save('Save event');
      assert.equal(
        (await overview()).events.find((e) => e.title === 'November concert')
          .starts,
        '2026-11-01T09:30:00.000Z',
      );
      await page
        .getByRole('button', { name: 'Edit November concert', exact: true })
        .click();
      await expect(
        page.getByLabel('This time occurs twice: choose UTC offset'),
      ).toHaveValue('2026-11-01T09:30:00.000Z');
      await save('Save event');
      await page
        .getByRole('button', { name: 'Edit Movie and meal', exact: true })
        .click();
      await page.getByLabel('Activity status').selectOption('published');
      await save('Save activity');
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
      const issued = await context.request.post(
        `${base}/api/flings/${fling}/organizer/${member.id}/issue`,
        { headers: { Origin: base, 'x-flings-csrf': snapshot.csrf }, data: {} },
      );
      assert.equal(issued.status(), 200);
      const mp = await context.newPage();
      mp.on('pageerror', (e) => errors.push(e.message));
      await mp.goto(
        `${base}/f/${fling}/member#code=${(await issued.json()).code}`,
      );
      await expect(
        mp.getByRole('button', { name: 'Accept invitation' }),
      ).toBeVisible();
      await expect(mp.getByText('Private Screening venue')).toHaveCount(0);
      await mp.getByRole('button', { name: 'Accept invitation' }).click();
      await expect(mp.getByText('Private Screening venue')).toBeVisible();
      await expect(
        mp.getByText('America/Los_Angeles', { exact: false }).first(),
      ).toBeVisible();
      await page.bringToFront();
      await page.reload();
      await page.waitForLoadState('networkidle');
      // Reopen after the member response to acquire its committed revision.
      await expect(
        page.getByRole('button', { name: 'Edit Movie and meal', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Edit Movie and meal', exact: true })
        .click();
      await page.getByLabel('Activity status').selectOption('cancelled');
      await save('Save activity');
      await mp.reload();
      await expect(
        mp.locator('.badge').filter({ hasText: 'Cancelled' }),
      ).toBeVisible();
      await expect(mp.getByText('Private Screening venue')).toHaveCount(0);
      await expect(
        mp.getByRole('button', { name: 'Accept invitation' }),
      ).toHaveCount(0);
      const projection = await (
        await context.request.get(
          `${base}/api/flings/${fling}/member/${member.id}`,
        )
      ).json();
      assert.equal(projection.activities.length, 1);
      assert.equal(projection.activities[0].details, null);
      assert.ok(projection.events.every((e) => e.details === null));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.bringToFront();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page
        .getByRole('button', { name: 'Edit Welcome', exact: true })
        .click();
      await page
        .getByLabel('Activity title', { exact: true })
        .fill('Unsaved draft');
      const competing = await overview();
      assert.equal(
        (
          await context.request.post(
            `${base}/api/flings/${fling}/organizer/title`,
            {
              headers: { Origin: base, 'x-flings-csrf': competing.csrf },
              data: {
                title: 'A newer saved title',
                revision: competing.fling.revision,
              },
            },
          )
        ).status(),
        200,
      );
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(
        page.getByLabel('Activity title', { exact: true }),
      ).toHaveValue('Unsaved draft');
      await page.waitForLoadState('networkidle');
      await page
        .getByRole('button', { name: 'Save activity', exact: true })
        .click();
      await expect(page.getByRole('alert')).toContainText(
        'Access or the record changed',
      );
      assert.ok(
        (await overview()).activities.some((a) => a.title === 'Welcome'),
      );
      assert.ok(
        !(await overview()).activities.some((a) => a.title === 'Unsaved draft'),
      );
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        browser: browser.version(),
        width,
        activities: 5,
        events: 7,
        passed: true,
        checks: [
          'creation-assignment',
          'movie-meal',
          'weekend-grouping',
          'concert-months',
          'order',
          'gap-rejection',
          'explicit-repeated-offset',
          'round-trip',
          'draft-hidden',
          'accept-private-details',
          'cancel-redaction',
          'viewer-zone',
          'no-overflow',
          'no-page-errors',
          'focus-preserves-draft',
          'stale-draft-rejected',
        ],
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/authoring-20260911.json',
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
console.log(`${receipts.length} complete authoring journeys passed.`);
