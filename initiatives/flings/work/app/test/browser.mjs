import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187';
const expect = baseExpect.configure({ timeout: 15000 });
const receipts = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const requestUrls = [],
        consoleMessages = [],
        errors = [];
      context.on('request', (req) => requestUrls.push(req.url()));
      page.on('console', (msg) => consoleMessages.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(base);
      await expect(
        page.getByRole('heading', { name: 'A place for each fling.' }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Open member page' })
        .first()
        .click();
      await expect(
        page.getByRole('heading', {
          name: 'A movie, then dinner',
          exact: true,
          level: 1,
        }),
      ).toBeVisible();
      await expect(page.getByLabel('Name', { exact: true })).toHaveValue(
        /Alex/,
      );
      assert.equal(new URL(page.url()).hash, '');
      const p2 = await context.newPage();
      await p2.goto(base);
      await p2.getByRole('button', { name: 'Open member page' }).nth(2).click();
      await expect(
        p2.getByRole('heading', {
          name: 'Concerts through autumn',
          exact: true,
          level: 1,
        }),
      ).toBeVisible();
      await page.bringToFront();
      await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
      const changed = 'Alex ' + engine + ' ' + viewport.width;
      await page.getByLabel('Name', { exact: true }).fill(changed);
      await page.getByLabel('Receive messages by').press('Tab');
      await expect(
        page.getByRole('button', { name: 'Save profile' }),
      ).toBeFocused();
      await page.getByRole('button', { name: 'Save profile' }).press('Enter');
      await expect(
        page.getByText('Your profile is saved for this fling.'),
      ).toBeVisible();
      await p2.bringToFront();
      await expect(p2.getByLabel('Name', { exact: true })).toHaveValue(
        'Alex Morgan',
      );
      const cookies = await context.cookies();
      for (const key of ['flings_outing', 'flings_concerts']) {
        const c = cookies.find((x) => x.name === key);
        assert.ok(c?.httpOnly);
        assert.equal(c.sameSite, 'Strict');
        assert.equal(c.secure, false);
      }
      // A separate organizer cookie is never used as a member session.
      const organizer = await context.request.post(
        base + '/api/flings/local/organizer',
        {
          headers: { Origin: base, 'x-flings-local': '1' },
          data: { organizer: 'a' },
        },
      );
      assert.equal(organizer.status(), 200);
      const { csrf } = await organizer.json();
      const auth = { Origin: base, 'x-flings-csrf': csrf };
      const preview = await context.request.post(
        base + '/api/flings/wedding/organizer/jordan-wedding/preview',
        { headers: auth, data: {} },
      );
      const previewUrl = (await preview.json()).url;
      const pp = await context.newPage();
      await pp.goto(base + previewUrl);
      await expect(
        pp.getByText('Preview — Jordan Lee · read-only'),
      ).toBeVisible();
      await expect(
        pp.getByRole('button', { name: 'Save profile' }),
      ).toHaveCount(0);
      await expect(pp.getByLabel('Name', { exact: true })).toBeDisabled();
      assert.equal(new URL(pp.url()).hash, '');
      assert.ok(
        !(await pp.locator('body').innerText()).includes(
          '34 Fictional Terrace',
        ),
      );
      const replace = await context.request.post(
        base + '/api/flings/outing/organizer/another-outing/issue',
        { headers: auth, data: {} },
      );
      const rawCode = (await replace.json()).code;
      assert.ok(rawCode);
      const other = await context.newPage();
      await other.goto(base + '/f/outing/member#code=' + rawCode);
      await expect(other.getByLabel('Name', { exact: true })).toHaveValue(
        'Robin Reed',
      );
      // The original page keeps its expected member; it must never adopt Robin.
      await page.bringToFront();
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.getByRole('alert')).toContainText(
        'Access or the record changed',
      );
      await expect(
        page.getByRole('button', { name: 'Save profile' }),
      ).toHaveCount(0);
      assert.ok(
        !(await page.locator('body').innerText()).includes('Robin Reed'),
      );
      assert.ok(
        requestUrls.every(
          (u) =>
            !u.includes(rawCode) &&
            !u.includes('#code=') &&
            !u.includes('#preview='),
        ),
      );
      assert.ok(consoleMessages.every((x) => !x.includes(rawCode)));
      assert.deepEqual(errors, []);
      assert.equal(
        await other.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      // Return through history: the replaced link was scrubbed before any request.
      await other.goto(base);
      await other.goBack();
      assert.equal(new URL(other.url()).hash, '');
      await expect(other.getByLabel('Name', { exact: true })).toHaveValue(
        'Robin Reed',
      );
      const webmcp = await other.evaluate(
        () => typeof document.modelContext?.registerTool === 'function',
      );
      receipts.push({
        engine,
        browser_version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'fragment-cleanup',
          'two-fling-sessions',
          'profile-save-by-keyboard',
          'profile-isolation',
          'http-only-cookies',
          'preview-read-only',
          'private-details-filtered',
          'same-fling-stale-context',
          'history-cleanup',
          'no-code-in-request-urls-or-console',
          'no-browser-errors',
          'no-horizontal-overflow',
        ],
        webmcp: webmcp ? 'available-unverified' : 'unsupported',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await mkdir('test/evidence', { recursive: true });
await writeFile(
  'test/evidence/browser.json',
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      node: process.version,
      os: os.platform() + ' ' + os.release(),
      base,
      receipts,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${receipts.length} browser journeys passed.`);
