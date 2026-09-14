import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, chmod } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187',
  expect = baseExpect.configure({ timeout: 15000 }),
  receipts = [];
const fixture = JSON.parse(
  await readFile(
    new URL('../public/recovery/example-v1.json', import.meta.url),
    'utf8',
  ),
);
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
      const create = await context.request.post(
        base + '/api/flings/workspace/organizer',
        { headers, data: { title: 'Backup review rehearsal' } },
      );
      assert.equal(create.status(), 201);
      const { id: fling } = await create.json();
      const snapshot = async () => {
        const r = await context.request.get(
          base + '/api/flings/' + fling + '/organizer',
          { headers },
        );
        assert.equal(r.status(), 200);
        return r.json();
      };
      const before = await snapshot();
      await page.goto(base + '/organizer/' + fling);
      const panel = page.getByRole('region', {
          name: 'Check a gathering backup',
          exact: true,
        }),
        input = panel.getByLabel('Gathering JSON file (up to 8 MiB)'),
        button = panel.getByRole('button', {
          name: 'Check backup file',
          exact: true,
        }),
        clear = panel.getByRole('button', { name: 'Clear file and result' });
      await expect(button).toBeDisabled();
      const upload = async (value) =>
        input.setInputFiles({
          name: 'edited-copy.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            typeof value === 'string' ? value : JSON.stringify(value),
          ),
        });
      await upload('{bad');
      await button.click();
      await expect(panel.getByRole('alert')).toContainText(
        'not valid UTF-8 JSON',
      );
      const bad = structuredClone(fixture);
      bad.records.events[0].activity = 'missing';
      await upload(bad);
      await button.click();
      await expect(panel).toContainText('/records/events/0/activity');
      await expect(panel).not.toContainText('File checks passed.');
      const edited = structuredClone(fixture);
      edited.records.members[0].name = 'Changed fictional name';
      edited.records.events[0].title = 'Edited dinner';
      edited.migration_notes = 'Preserved original; edited a separate copy.';
      await upload(edited);
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(panel).toContainText('File checks passed.');
      await expect(panel).toContainText('46 records');
      assert.deepEqual(await snapshot(), before);
      await panel.getByText('Records in this file', { exact: true }).click();
      await expect(panel).toContainText('members: 2');
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await clear.click();
      await expect(input).toHaveValue('');
      await expect(button).toBeDisabled();
      await expect(panel).not.toContainText('File checks passed.');
      await input.setInputFiles({
        name: 'huge.json',
        mimeType: 'application/json',
        buffer: Buffer.alloc(8 * 1024 * 1024 + 1, 32),
      });
      await expect(button).toBeDisabled();
      await expect(panel.getByRole('alert')).toContainText('8 MiB');
      // Replacing or clearing a file invalidates its in-flight response.
      let release, received;
      const hold = new Promise((r) => {
          release = r;
        }),
        inFlight = new Promise((r) => {
          received = r;
        });
      await page.route('**/organizer/recovery/check', async (route) => {
        const response = await route.fetch();
        received();
        await hold;
        await route.fulfill({ response });
      });
      await upload(edited);
      await button.click();
      await inFlight;
      await clear.click();
      release();
      await page.unrouteAll({ behavior: 'wait' });
      await expect(panel).not.toContainText('File checks passed.');
      await upload(edited);
      await button.click();
      await expect(panel).toContainText('File checks passed.');
      if (engine === 'chromium' && viewport.width === 1280) {
        await mkdir('.wrangler/qa', { recursive: true });
        await context.storageState({
          path: '.wrangler/qa/recovery-check-state.json',
        });
        await chmod('.wrangler/qa/recovery-check-state.json', 0o600);
        await writeFile(
          '.wrangler/qa/recovery-check-url.txt',
          base + '/organizer/' + fling,
        );
        await panel.screenshot({
          path: '.wrangler/qa/recovery-check-desktop.png',
        });
      }
      if (engine === 'chromium' && viewport.width === 390)
        await panel.screenshot({
          path: '.wrangler/qa/recovery-check-phone.png',
        });
      // A pending result cannot reappear after an organizer switch.
      let releaseActor, receivedActor;
      const actorHold = new Promise((r) => {
          releaseActor = r;
        }),
        actorFlight = new Promise((r) => {
          receivedActor = r;
        });
      await page.route('**/organizer/recovery/check', async (route) => {
        const response = await route.fetch();
        receivedActor();
        await actorHold;
        await route.fulfill({ response });
      });
      await button.click();
      await actorFlight;
      await login('c');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(panel).toHaveCount(0);
      releaseActor();
      await page.unrouteAll({ behavior: 'wait' });
      await expect(
        page.getByText('File checks passed.', { exact: true }),
      ).toHaveCount(0);
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        viewport,
        checks: [
          'valid edited copy',
          'malformed JSON',
          'record-level parent error',
          'keyboard submit',
          'clear file',
          '8 MiB browser limit',
          'late cleared response',
          'late organizer response',
          'active gathering unchanged',
          'no horizontal overflow',
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
  'test/evidence/recovery-check-browser-20260914.json',
  JSON.stringify({ at: new Date().toISOString(), receipts }, null, 2) + '\n',
);
console.log(JSON.stringify({ journeys: receipts.length, passed: true }));
