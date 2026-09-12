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
  const browser = await launcher.launch(
    engine === 'chromium' && process.env.FLINGS_CHROMIUM_PATH
      ? { executablePath: process.env.FLINGS_CHROMIUM_PATH }
      : {},
  );
  try {
    for (const width of [1280, 390]) {
      console.log('Organizer assignment journey', engine, width);
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + '/organizer');
      await page.getByRole('button', { name: 'Casey', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Your gatherings' }),
      ).toBeVisible();
      // Casey renames herself from the workspace page, before creating anything.
      const displayName = 'Casey ' + engine + ' ' + width;
      await page
        .getByLabel('Organizer name', { exact: true })
        .fill(displayName);
      await page
        .getByRole('button', { name: 'Save name', exact: true })
        .click();
      await expect(page.getByText('Organizer name saved.')).toBeVisible();
      // A fresh fling per iteration keeps this test isolated from the shared
      // fixture flings and from every other iteration's own fling.
      const title = 'Assignment rehearsal ' + engine + ' ' + width;
      await page.getByLabel('New fling title').fill(title);
      await page
        .getByRole('button', { name: 'Create fling', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { level: 1, name: title }),
      ).toBeVisible();
      const removeButtons = page.getByRole('button', { name: 'Remove' });
      await expect(page.getByText(displayName + ' (you)')).toBeVisible();
      await expect(removeButtons).toHaveCount(1);
      await expect(removeButtons).toBeDisabled();
      await expect(
        page.getByText('the last one cannot be removed here'),
      ).toBeVisible();
      // Adding an unknown organizer id fails. Like every other guard failure
      // in this app, that 409 resets the workspace view; reloading shows the
      // list unchanged rather than a half-applied assignment.
      await page
        .getByLabel('Existing organizer ID', { exact: true })
        .fill('nobody');
      await page
        .getByRole('button', { name: 'Add organizer', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Confirm addition', exact: true })
        .click();
      await expect(page.getByRole('alert')).toContainText(
        'Access or the record changed',
      );
      await page
        .getByRole('button', { name: 'Reload workspace', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { level: 1, name: title }),
      ).toBeVisible();
      await expect(removeButtons).toHaveCount(1);
      // Add Rowan (b), then Sam (c).
      for (const [id, name] of [
        ['b', 'Rowan'],
        ['c', 'Sam'],
      ]) {
        await page
          .getByLabel('Existing organizer ID', { exact: true })
          .fill(id);
        await page
          .getByRole('button', { name: 'Add organizer', exact: true })
          .click();
        await expect(page.getByRole('alertdialog')).toContainText(
          'full organizer access',
        );
        const pending = await context.request.get(
          `${base}/api/flings/${page.url().split('/').pop()}/organizer`,
        );
        assert.equal(pending.status(), 200);
        assert.equal(
          (await pending.json()).organizers.length,
          id === 'b' ? 1 : 2,
        );
        await page
          .getByRole('button', { name: 'Keep current organizers', exact: true })
          .click();
        await expect(removeButtons).toHaveCount(id === 'b' ? 1 : 2);
        await page
          .getByRole('button', { name: 'Add organizer', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Confirm addition', exact: true })
          .press('Enter');
        await expect(
          page.getByText('Organizer added. They see this fling next time'),
        ).toBeVisible();
        await expect(page.getByText(name, { exact: true })).toBeVisible();
      }
      await expect(removeButtons).toHaveCount(3);
      await expect(removeButtons.first()).toBeEnabled();
      // Remove them again, one at a time, back down to the sole organizer.
      for (const name of ['Rowan', 'Sam']) {
        await page
          .getByRole('listitem')
          .filter({ hasText: name })
          .getByRole('button', { name: 'Remove' })
          .click();
        await expect(
          page.getByText('Remove ' + name + ' as an organizer?'),
        ).toBeVisible();
        await page
          .getByRole('button', { name: 'Confirm removal', exact: true })
          .click();
        await expect(page.getByText('Organizer removed.')).toBeVisible();
        await expect(page.getByText(name, { exact: true })).toHaveCount(0);
      }
      await expect(removeButtons).toHaveCount(1);
      await expect(removeButtons).toBeDisabled();
      // The disabled button is defense against mis-clicks, not the actual
      // authority: the server refuses the same removal even called directly.
      const overview = await (
        await context.request.get(
          `${base}/api/flings/${page.url().split('/').pop()}/organizer`,
        )
      ).json();
      const forced = await context.request.post(
        `${base}/api/flings/${page.url().split('/').pop()}/organizer/assignments/remove`,
        {
          headers: { Origin: base, 'x-flings-csrf': overview.csrf },
          data: { organizer: 'a', confirm: true },
        },
      );
      assert.equal(forced.status(), 409);
      assert.equal(
        (
          await context.request.get(
            `${base}/api/flings/${page.url().split('/').pop()}/organizer`,
          )
        ).ok(),
        true,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        browser: browser.version(),
        width,
        passed: true,
        checks: [
          'organizer-name-save',
          'organizer-list-shows-self-and-co-organizers',
          'unknown-organizer-id-rejected',
          'cancel-addition-without-granting-access',
          'add-organizer-after-keyboard-confirmation',
          'remove-organizer-with-confirmation',
          'sole-organizer-remove-disabled-in-ui',
          'sole-organizer-remove-refused-by-server',
          'no-overflow',
          'no-page-errors',
        ],
      });
      await page.goto(base + '/organizer');
      await page.getByLabel('Organizer name', { exact: true }).fill('Casey');
      await page
        .getByRole('button', { name: 'Save name', exact: true })
        .click();
      await expect(page.getByText('Organizer name saved.')).toBeVisible();
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/assignments-20260912.json',
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
console.log(`${receipts.length} organizer assignment journeys passed.`);
