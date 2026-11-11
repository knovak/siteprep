// Organizer page orientation: section order and navigation, button variants,
// and keeping the scroll position and keyboard focus across a re-check.
// Run against `npm run dev:local`. Set FLINGS_BROWSER to run one engine.
import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [],
  run = Date.now();

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.FLINGS_BROWSER && engine !== process.env.FLINGS_BROWSER)
    continue;
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const title = `Place ${engine} ${viewport.width} ${run}`;
      await page.goto(base + '/organizer');
      await page.getByRole('button', { name: 'Casey', exact: true }).click();
      await page.getByLabel('New fling title', { exact: true }).fill(title);
      await page
        .getByRole('button', { name: 'Create fling', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { level: 1, name: title }),
      ).toBeVisible();
      const memberName = page.getByLabel('Member name', { exact: true });
      await expect(memberName).toBeVisible();

      // Planning comes before the backup and deletion tools.
      const order = await page.evaluate(() =>
        [...document.querySelectorAll('main h2')].map((h) =>
          h.textContent.trim(),
        ),
      );
      const position = (text) => order.indexOf(text);
      assert.ok(position('Activities & events') >= 0, order.join(' | '));
      assert.ok(
        position('Activities & events') < position('Members & invitations') &&
          position('Members & invitations') <
            position('Discussions, polls & payments') &&
          position('Discussions, polls & payments') <
            position('Message audience') &&
          position('Message audience') < position('Backup & deletion'),
        order.join(' | '),
      );

      // The section bar reaches each section and stays in view.
      const bar = page.getByRole('navigation', {
        name: 'Sections of this gathering',
      });
      await expect(bar.getByRole('link')).toHaveCount(5);
      await bar.getByRole('link', { name: 'Backup & deletion' }).click();
      await expect(
        page.getByRole('heading', { name: 'Backup & deletion', exact: true }),
      ).toBeInViewport();
      await expect(bar).toBeInViewport();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        'the section bar must not widen the page',
      );

      // Variants are visibly different, and none falls back to the default.
      const background = (name) =>
        page
          .getByRole('button', { name, exact: true })
          .evaluate((el) => getComputedStyle(el).backgroundColor);
      const primary = await background('Add activity'),
        outline = await background('Edit fling details'),
        destructive = await background('Delete this gathering…');
      assert.equal(
        new Set([primary, outline, destructive]).size,
        3,
        `button variants: ${primary} / ${outline} / ${destructive}`,
      );

      // The focus re-check keeps the scroll position.
      await bar.getByRole('link', { name: 'Members', exact: true }).click();
      await expect(memberName).toBeInViewport();
      const before = await page.evaluate(() => window.scrollY);
      assert.ok(before > 0, 'the page should be scrolled before the re-check');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(memberName).toBeHidden();
      await expect(memberName).toBeVisible();
      assert.equal(await page.evaluate(() => window.scrollY), before);

      // A confirmation is shown inside the window, wherever the action was.
      await memberName.fill('Pat Place');
      await page
        .getByRole('button', { name: 'Create member', exact: true })
        .click();
      const notice = page.getByText(
        'Member profile created. No message was sent.',
      );
      await expect(notice).toBeInViewport();

      // The timed refresh, every 15 seconds, leaves a field being typed in
      // alone: focus stays and no keystroke is lost.
      await memberName.click();
      const whileTyping = await page.evaluate(() => window.scrollY);
      const typed = 'typing across a timed refresh';
      for (const character of typed) {
        await page.keyboard.type(character);
        await page.waitForTimeout(600);
      }
      await expect(memberName).toHaveValue(typed);
      await expect(memberName).toBeFocused();
      assert.equal(await page.evaluate(() => window.scrollY), whileTyping);

      assert.deepEqual(errors, []);
      receipts.push({ engine, viewport: viewport.width, passed: true });
      console.log(`Organizer place passed ${engine} ${viewport.width}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
if (process.env.FLINGS_EVIDENCE)
  await writeFile(
    process.env.FLINGS_EVIDENCE,
    JSON.stringify({ run, receipts }, null, 2) + '\n',
  );
console.log(`${receipts.length} organizer place journeys passed.`);
