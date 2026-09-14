import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187',
  expect = baseExpect.configure({ timeout: 15000 }),
  receipts = [];
const fixture = JSON.parse(
  await readFile(
    new URL('../public/recovery/example-v1.json', import.meta.url),
    'utf8',
  ),
);
fixture.records.organizers.push({
  id: '__proto__',
  name: '<script>history only</script>',
});
fixture.counts.organizers++;
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
      const login = async (organizer) => {
        const r = await context.request.post(
          base + '/api/flings/local/organizer',
          {
            headers: { Origin: base, 'x-flings-local': '1' },
            data: { organizer },
          },
        );
        assert.equal(r.status(), 200);
        return r.json();
      };
      const { csrf } = await login('a'),
        headers = {
          Origin: base,
          'x-flings-csrf': csrf,
          'x-flings-organizer': 'a',
        };
      const created = await context.request.post(
        base + '/api/flings/workspace/organizer',
        { headers, data: { title: 'Restore preview rehearsal' } },
      );
      assert.equal(created.status(), 201);
      const { id: fling } = await created.json();
      const snapshot = async () =>
        (
          await context.request.get(
            base + '/api/flings/' + fling + '/organizer',
            { headers },
          )
        ).json();
      const before = await snapshot();
      await page.goto(base + '/organizer/' + fling);
      const parent = page.getByRole('region', {
          name: 'Check a gathering backup',
          exact: true,
        }),
        panel = parent.getByRole('region', {
          name: 'Preview a new gathering',
          exact: true,
        });
      const input = parent.getByLabel('Gathering JSON file (up to 8 MiB)');
      const check = parent.getByRole('button', {
        name: 'Check backup file',
        exact: true,
      });
      const clear = parent.getByRole('button', {
        name: 'Clear file and result',
      });
      const load = panel.getByRole('button', {
        name: 'Load organizer choices',
        exact: true,
      });
      const review = panel.getByRole('button', {
        name: 'Review restore preview',
        exact: true,
      });
      const proposed = panel.getByRole('heading', {
        name: 'Proposed restore — nothing has been created',
      });
      const upload = async (value = fixture) => {
        await input.setInputFiles({
          name: 'edited-copy.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(value)),
        });
        await check.click();
        await expect(parent).toContainText('File checks passed.');
      };
      const choose = async () => {
        await load.click();
        await expect(review).toBeDisabled();
        await panel
          .getByLabel('Account for historical organizer 1')
          .selectOption('account:a');
        await panel
          .getByLabel('Account for historical organizer 2')
          .selectOption('history');
        await expect(review).toBeDisabled();
        const archived = panel.getByLabel('Account for historical organizer 3');
        await expect(archived.locator('option')).toHaveCount(2);
        await archived.selectOption('history');
      };
      await upload();
      await choose();
      await review.focus();
      await page.keyboard.press('Enter');
      await expect(proposed).toBeVisible();
      await expect(panel).toContainText('47 imported records');
      await expect(panel).toContainText(
        'Organizer accounts with proposed access: Casey',
      );
      await expect(panel).toContainText('<script>history only</script>');
      assert.deepEqual(await snapshot(), before);
      await expect(
        panel.getByRole('button', {
          name: /confirm|create|restore gathering/i,
        }),
      ).toBeDisabled();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      // Changing a mapping hides the old plan immediately, including late responses.
      const delayed = async () => {
        let received, release;
        const flight = new Promise((r) => {
            received = r;
          }),
          hold = new Promise((r) => {
            release = r;
          });
        await page.route(
          '**/organizer/recovery/restore-preview',
          async (route) => {
            const response = await route.fetch();
            received();
            await hold;
            await route.fulfill({ response });
          },
        );
        return { flight, release };
      };
      let pending = await delayed();
      await review.click();
      await pending.flight;
      await panel
        .getByLabel('Account for historical organizer 1')
        .selectOption('history');
      pending.release();
      await page.unrouteAll({ behavior: 'wait' });
      await expect(proposed).toHaveCount(0);
      await review.click();
      await expect(proposed).toBeVisible();
      await expect(panel).toContainText(
        'Organizer accounts with proposed access: Casey',
      );
      pending = await delayed();
      await review.click();
      await pending.flight;
      await clear.click();
      pending.release();
      await page.unrouteAll({ behavior: 'wait' });
      await expect(panel).toHaveCount(0);
      await upload();
      await choose();
      await review.click();
      await expect(proposed).toBeVisible();
      // A replacement file must discard the prior choices and preview.
      const replacement = structuredClone(fixture);
      replacement.records.flings[0].title = 'Edited restored gathering';
      await upload(replacement);
      await expect(proposed).toHaveCount(0);
      await choose();
      await review.click();
      await expect(proposed).toBeVisible();
      await expect(panel).toContainText('Edited restored gathering');
      // On a narrow display and at 200% text size, the preview stays contained.
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      assert.ok(
        await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });
      if (engine === 'chromium') {
        await mkdir('.wrangler/qa', { recursive: true });
        await panel.screenshot({
          path: '.wrangler/qa/recovery-preview-' + viewport.width + '.png',
        });
        if (viewport.width === 1280) {
          await context.storageState({
            path: '.wrangler/qa/recovery-preview-state.json',
          });
          await chmod('.wrangler/qa/recovery-preview-state.json', 0o600);
          await writeFile(
            '.wrangler/qa/recovery-preview-url.txt',
            base + '/organizer/' + fling,
          );
        }
      }
      pending = await delayed();
      await review.click();
      await pending.flight;
      await login('c');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(parent).toHaveCount(0);
      pending.release();
      await page.unrouteAll({ behavior: 'wait' });
      await expect(proposed).toHaveCount(0);
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        viewport,
        checks: [
          'explicit choices without name matching',
          'history-only actor',
          'prototype-like identifier',
          'importer retained',
          'new gathering inventory',
          'keyboard preview',
          'text-only uploaded names',
          'active gathering unchanged',
          'late changed mapping',
          'late cleared response',
          'replacement clears preview',
          'late organizer response',
          'phone and 200 percent text containment',
          'no page errors',
        ],
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/recovery-preview-browser-20260914.json',
  JSON.stringify({ at: new Date().toISOString(), receipts }, null, 2) + '\n',
);
console.log(JSON.stringify({ journeys: receipts.length, passed: true }));
