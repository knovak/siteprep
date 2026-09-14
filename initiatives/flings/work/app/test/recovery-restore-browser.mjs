import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187',
  expect = baseExpect.configure({ timeout: 15000 }),
  receipts = [];
const fixture = JSON.parse(
  await readFile(
    new URL('../public/recovery/example-v1.json', import.meta.url),
    'utf8',
  ),
);
fixture.records.flings[0].title = 'Restored dinner rehearsal';
fixture.records.events[0].title = 'Edited dinner reservation';
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
      const created = await context.request.post(
        base + '/api/flings/workspace/organizer',
        { headers, data: { title: 'Recovery browser source' } },
      );
      assert.equal(created.status(), 201);
      const { id: source } = await created.json();
      await page.goto(base + '/organizer/' + source);
      const parent = page.getByRole('region', {
        name: 'Check a gathering backup',
        exact: true,
      });
      await parent
        .getByLabel('Gathering JSON file (up to 8 MiB)')
        .setInputFiles({
          name: 'edited-copy.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(fixture)),
        });
      await parent
        .getByRole('button', { name: 'Check backup file', exact: true })
        .click();
      await expect(parent).toContainText('File checks passed.');
      const panel = parent.getByRole('region', {
        name: 'Preview a new gathering',
        exact: true,
      });
      await panel
        .getByRole('button', { name: 'Load organizer choices', exact: true })
        .click();
      for (let i = 0; i < fixture.records.organizers.length; i++)
        await panel
          .getByLabel('Account for historical organizer ' + (i + 1))
          .selectOption('history');
      await panel
        .getByRole('button', { name: 'Review restore preview', exact: true })
        .click();
      const submit = panel.getByRole('button', {
        name: 'Confirm and create restored gathering',
        exact: true,
      });
      await expect(submit).toBeDisabled();
      await panel
        .getByRole('checkbox', {
          name: 'I reviewed this file and organizer access and want to create a new gathering.',
        })
        .check();
      await expect(submit).toBeEnabled();
      // A changed mapping invalidates consent before another review.
      await panel
        .getByLabel('Account for historical organizer 1')
        .selectOption('account:a');
      await expect(submit).toHaveCount(0);
      await panel
        .getByRole('button', { name: 'Review restore preview', exact: true })
        .click();
      await expect(submit).toBeDisabled();
      await panel
        .getByRole('checkbox', {
          name: 'I reviewed this file and organizer access and want to create a new gathering.',
        })
        .check();
      await submit.focus();
      await page.keyboard.press('Enter');
      const success = page.getByRole('region', {
        name: 'Restored gathering',
        exact: true,
      });
      await expect(success).toContainText('No member links were created');
      const link = success.getByRole('link', {
          name: 'Open restored gathering',
        }),
        href = await link.getAttribute('href');
      const id = href.split('/').at(-1);
      assert.notEqual(id, source);
      assert.notEqual(id, fixture.fling_id);
      const exported = await context.request.post(
        base + '/api/flings/' + id + '/organizer/recovery/export',
        { headers, data: { confirm_unencrypted: true } },
      );
      assert.equal(exported.status(), 200);
      const backup = await exported.json();
      assert.ok(
        backup.file.records.events.some(
          (r) => r.title === 'Edited dinner reservation',
        ),
      );
      await link.click();
      await expect(
        page.getByRole('heading', {
          name: 'Restored dinner rehearsal',
          exact: true,
        }),
      ).toBeVisible();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const history = await context.request.get(
        base + '/api/flings/' + id + '/organizer/messages',
        { headers },
      );
      const messages = await history.json();
      assert.ok(
        messages.batches.every(
          (b) => b.imported_at !== null && b.state.includes('cancelled'),
        ),
      );
      await page
        .getByRole('button', { name: 'Delete this gathering…', exact: true })
        .click();
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toContainText(
        'provider backups have separate retention',
      );
      await expect(
        dialog.getByRole('button', {
          name: 'Permanently delete gathering',
          exact: true,
        }),
      ).toBeDisabled();
      await dialog.getByRole('button', { name: 'Keep gathering' }).click();
      await expect(dialog).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Delete this gathering…', exact: true })
        .click();
      await dialog
        .getByLabel('Type the gathering title to delete')
        .fill('wrong title');
      await dialog
        .getByRole('checkbox', {
          name: 'I understand this permanently removes the gathering from this app.',
        })
        .check();
      await expect(
        dialog.getByRole('button', {
          name: 'Permanently delete gathering',
          exact: true,
        }),
      ).toBeDisabled();
      await dialog
        .getByLabel('Type the gathering title to delete')
        .fill(fixture.records.flings[0].title);
      await dialog
        .getByRole('button', {
          name: 'Permanently delete gathering',
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(base + '/organizer');
      assert.ok(
        (
          await context.request.get(base + '/api/flings/' + id + '/organizer', {
            headers,
          })
        ).status() >= 400,
      );
      const sourceData = await context.request.get(
        base + '/api/flings/' + source + '/organizer',
        { headers },
      );
      assert.equal(sourceData.status(), 200);
      const sourceRow = (await sourceData.json()).fling;
      assert.equal(
        (
          await context.request.post(
            base + '/api/flings/' + source + '/organizer/recovery/delete',
            {
              headers,
              data: {
                title: sourceRow.title,
                revision: sourceRow.revision,
                confirm_delete: true,
              },
            },
          )
        ).status(),
        200,
      );
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        checks: [
          'edited-file restore',
          'explicit and reset consent',
          'keyboard confirmation',
          'fresh gathering',
          'imported outcomes',
          'cancel deletion',
          'exact-title deletion',
          'source isolation',
          'no page errors',
          'no horizontal overflow',
        ],
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await mkdir(new URL('evidence/', import.meta.url), { recursive: true });
await writeFile(
  new URL('evidence/recovery-restore-browser-20260914.json', import.meta.url),
  JSON.stringify({ at: new Date().toISOString(), receipts }, null, 2) + '\n',
);
console.log(JSON.stringify({ journeys: receipts.length, passed: true }));
