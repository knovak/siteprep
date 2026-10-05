import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import { expectVisibleValidation } from './native-validation.mjs';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [];
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
        viewport: { width, height: width === 390 ? 844 : 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + '/organizer');
      await page.getByRole('button', { name: 'Casey', exact: true }).click();
      await page
        .getByLabel('New fling title')
        .fill(`Focus ${engine} ${width} ${Date.now()}`);
      await page
        .getByRole('button', { name: 'Create fling', exact: true })
        .click();
      const button = (name) => page.getByRole('button', { name, exact: true });
      const open = async (name, label) => {
        await button(name).press('Enter');
        await expect(page.getByLabel(label, { exact: true })).toBeFocused();
      };
      const close = async (name, trigger) => {
        await button(name).press('Enter');
        await expect(page.locator('.author-form')).toHaveCount(0);
        await expect(button(trigger)).toBeFocused();
      };
      await open('Edit fling details', 'Fling title');
      await page.keyboard.press('Tab');
      await expect(
        page.getByLabel('Fling description (visible to every member)'),
      ).toBeFocused();
      await page.keyboard.type('Keyboard description');
      await expect(
        page.getByLabel('Fling description (visible to every member)'),
      ).toBeFocused();
      await close('Save fling details', 'Edit fling details');
      await open('Add activity', 'Activity title');
      await page.keyboard.type('Focus activity');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Invitation summary')).toBeFocused();
      await page.keyboard.type('Keyboard summary');
      await expect(page.getByLabel('Invitation summary')).toBeFocused();
      await close('Save activity', 'Add activity');
      await open('Add event to Focus activity', 'Event title');
      await expectVisibleValidation(page, 'Save event', 'Event title');
      await page.keyboard.type('Discarded event');
      await close('Cancel editing', 'Add event to Focus activity');
      await expect(
        page.getByRole('heading', { name: 'Discarded event' }),
      ).toHaveCount(0);
      await open('Add event to Focus activity', 'Event title');
      await page.keyboard.type('Focus event');
      await page
        .getByLabel('Local date and time', { exact: true })
        .fill('2026-10-17T18:00');
      await close('Save event', 'Add event to Focus activity');
      await open('Edit Focus event', 'Event title');
      await page
        .getByLabel('Event title', { exact: true })
        .fill('Renamed focus event');
      await close('Save event', 'Edit Renamed focus event');
      await open('Edit Focus activity', 'Activity title');
      await close('Cancel editing', 'Edit Focus activity');
      // Switching editors while an existing form stays mounted must refocus the title.
      await open('Edit fling details', 'Fling title');
      await page.keyboard.press('Tab');
      await open('Add activity', 'Activity title');
      await close('Cancel editing', 'Add activity');
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        browser: browser.version(),
        width,
        passed: true,
      });
      await context.close();
      console.log('Authoring focus passed', engine, width);
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  process.env.FLINGS_EVIDENCE || 'test/evidence/authoring-focus-20260917.json',
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
