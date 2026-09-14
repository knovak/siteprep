import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import Ajv from 'ajv';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187',
  expect = baseExpect.configure({ timeout: 15000 }),
  receipts = [];
const schema = JSON.parse(
  await readFile(
    new URL('../public/recovery/schema-v1.json', import.meta.url),
    'utf8',
  ),
);
const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1280, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
          viewport,
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await context.addInitScript(() => {
        const revoke = URL.revokeObjectURL.bind(URL);
        window.__revokedRecoveryURLs = [];
        URL.revokeObjectURL = (url) => {
          window.__revokedRecoveryURLs.push(url);
          revoke(url);
        };
      });
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
      const api = async (path, data) => {
        const r = data
          ? await context.request.post(base + '/api/flings/' + path, {
              headers,
              data,
            })
          : await context.request.get(base + '/api/flings/' + path, {
              headers,
            });
        const value = await r.json();
        assert.ok(r.ok(), value.error || path);
        return value;
      };
      const title = 'Dinner plans — saved together',
        fling = (await api('workspace/organizer', { title })).id;
      await api(fling + '/organizer/members', {
        name: 'Alex “café” Morgan',
        preference: 'email',
        email: 'alex@example.invalid',
        phone: '',
      });
      const initial = await api(fling + '/organizer');
      await page.goto(base + '/organizer/' + fling);
      const panel = page.getByRole('region', {
          name: 'Export gathering records',
          exact: true,
        }),
        prepare = panel.getByRole('button', {
          name: 'Prepare JSON export',
          exact: true,
        }),
        consent = panel.getByRole('checkbox');
      await expect(panel).toContainText('unencrypted personal data');
      await expect(prepare).toBeDisabled();
      await consent.check();
      await prepare.focus();
      await page.keyboard.press('Enter');
      const save = panel.getByRole('link', {
        name: 'Save JSON file',
        exact: true,
      });
      await expect(save)
        .toBeVisible()
        .catch(async (error) => {
          console.error(
            'Export page notices:',
            await page.locator('.error').allTextContents(),
          );
          throw error;
        });
      const url = await save.getAttribute('href');
      const downloadEvent = page.waitForEvent('download');
      await save.click();
      const download = await downloadEvent;
      assert.equal(await download.failure(), null);
      assert.match(
        download.suggestedFilename(),
        new RegExp('^flings-' + fling + '-.*\\.json$'),
      );
      const raw = await readFile(await download.path(), 'utf8'),
        file = JSON.parse(raw);
      assert.ok(validate(file), JSON.stringify(validate.errors));
      assert.equal(file.fling_id, fling);
      assert.equal(file.records.flings[0].title, title);
      assert.equal(file.records.members[0].name, 'Alex “café” Morgan');
      assert.deepEqual(
        file.records.members.map((r) => r.id),
        initial.members.map((m) => m.id),
      );
      assert.equal(Object.keys(file.counts).length, 22);
      assert.ok(
        !/#code=|#preview=|fictional:a|ciphertext|"sessions"/.test(raw),
      );
      await panel.getByText('Records included', { exact: true }).click();
      await expect(panel).toContainText('members: 1');
      await consent.uncheck();
      await expect(save).toHaveCount(0);
      assert.ok(
        await page.evaluate(
          (u) => window.__revokedRecoveryURLs.includes(u),
          url,
        ),
      );
      await consent.check();
      await prepare.click();
      await expect(save).toBeVisible();
      const newURL = await save.getAttribute('href');
      assert.notEqual(newURL, url);
      // An in-flight response must not recreate a download after the organizer changes.
      let release;
      const hold = new Promise((resolve) => {
        release = resolve;
      });
      let received;
      const inFlight = new Promise((resolve) => {
        received = resolve;
      });
      await page.route('**/organizer/recovery/export', async (route) => {
        const response = await route.fetch();
        received();
        await hold;
        await route.fulfill({ response });
      });
      await prepare.click();
      await inFlight;
      await context.request.post(base + '/api/flings/local/organizer', {
        headers: { Origin: base, 'x-flings-local': '1' },
        data: { organizer: 'c' },
      });
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(panel).toHaveCount(0);
      release();
      await page.unrouteAll({ behavior: 'wait' });
      await expect(
        page.getByRole('link', { name: 'Save JSON file', exact: true }),
      ).toHaveCount(0);
      assert.ok(
        await page.evaluate(
          (u) => window.__revokedRecoveryURLs.includes(u),
          newURL,
        ),
      );
      // The file guide and both downloadable reference files are served without app credentials.
      for (const path of [
        'schema-v1.json',
        'example-v1.json',
        'format-v1.html',
      ])
        assert.equal(
          (await context.request.get(base + '/recovery/' + path)).status(),
          200,
        );
      await page.goto(base + '/recovery/format-v1.html');
      await expect(
        page.getByRole('heading', {
          name: 'Save and understand a gathering file',
        }),
      ).toBeVisible();
      await page.getByText('payment_ledger', { exact: true }).click();
      await expect(
        page
          .getByText(
            'Whole minor currency units (for example 1000 = USD 10.00). Never a floating-point major-unit amount.',
            { exact: true },
          )
          .first(),
      ).toBeVisible();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      // Leave one fictional snapshot ready for the required post-build screenshot.
      if (engine === 'chromium' && viewport.width === 1280) {
        await context.request.post(base + '/api/flings/local/organizer', {
          headers: { Origin: base, 'x-flings-local': '1' },
          data: { organizer: 'a' },
        });
        await mkdir('.wrangler/qa', { recursive: true });
        await context.storageState({
          path: '.wrangler/qa/recovery-state.json',
        });
        await chmod('.wrangler/qa/recovery-state.json', 0o600);
        await writeFile('.wrangler/qa/recovery-fling.txt', fling, {
          mode: 0o600,
        });
      }
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'plain-data-confirmation',
          'keyboard-prepare',
          'actual-browser-download',
          'schema-valid-file',
          'exact-unicode-and-record-ids',
          '22-collection-counts',
          'credentials-excluded',
          'uncheck-revokes-URL',
          'fresh-snapshot',
          'organizer-change-removes-download',
          'late-response-cannot-restore-download',
          'guide-and-reference-downloads',
          'no-overflow',
          'no-page-errors',
        ],
        data: 'New fictional gathering and contacts; no real sending, restore or deletion.',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/recovery-export-browser-20260914.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' recovery-export browser journeys passed.');
