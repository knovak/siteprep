// Fictional dispatcher simulation: real app UI + handle() + actual local D1.
// This does not prove an independent real ChatGPT login or hosted dispatch.
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { Miniflare } from 'miniflare';
import { handle, type Bindings } from '../lib/http.ts';
const base = process.env.FLINGS_BROWSER_URL || 'http://localhost:5187';
const origin = 'https://native-browser.example.invalid';
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("test")}}',
  compatibilityDate: '2026-05-15',
  d1Databases: ['DB'],
});
const db = (await mf.getD1Database('DB')) as unknown as D1Database;
const dir = new URL('../drizzle/', import.meta.url);
const results: unknown[] = [];
try {
  for (const name of (await readdir(dir))
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(new URL(name, dir), 'utf8');
    await db.batch(
      sql
        .split('--> statement-breakpoint')
        .filter((x) => x.trim())
        .map((x) => db.prepare(x)),
    );
  }
  for (const [engine, launcher] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await launcher.launch();
    try {
      for (const [size, viewport] of Object.entries({
        desktop: { width: 1280, height: 900 },
        phone: { width: 390, height: 844 },
      })) {
        const context = await browser.newContext({ viewport });
        let viewer = 1;
        const key = engine + '-' + size;
        const env: Bindings = {
          DB: db,
          FLINGS_SECRET: 'fictional-native-browser-secret-over-32-characters',
          FLINGS_MODE: 'chatgpt',
          FLINGS_ORIGIN: origin,
          FLINGS_ORGANIZERS: JSON.stringify(
            [1, 2].map((n) => ({
              email: `${key}-${n}@example.invalid`,
              name: `Organizer ${n}`,
            })),
          ),
        };
        await context.route('**/api/flings/**', async (route) => {
          const input = route.request();
          const url = origin + new URL(input.url()).pathname;
          const headers: Record<string, string> = {
            ...input.headers(),
            'oai-authenticated-user-id': key + '-' + viewer,
            'oai-authenticated-user-email': `${key}-${viewer}@example.invalid`,
          };
          if (headers.origin === base) headers.origin = origin;
          const response = await handle(
            new Request(url, {
              method: input.method(),
              headers,
              ...(input.postData() ? { body: input.postData()! } : {}),
            }),
            env,
          );
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: await response.text(),
          });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        await page.goto(base + '/organizer');
        const open = page.getByRole('button', {
          name: 'Open my organizer workspace',
          exact: true,
        });
        await open.waitFor();
        assert.equal(
          await page
            .getByRole('heading', { name: 'Choose a fictional organizer' })
            .count(),
          0,
        );
        await open.focus();
        await page.keyboard.press('Enter');
        await page
          .getByText('No assigned gatherings.', { exact: true })
          .waitFor();
        await page
          .getByLabel('New fling title')
          .fill('Native identity acceptance ' + key);
        await page
          .getByRole('button', { name: 'Create fling', exact: true })
          .click();
        await page
          .getByRole('heading', {
            name: 'Native identity acceptance ' + key,
            exact: true,
          })
          .waitFor();
        await page
          .getByRole('link', { name: 'Organizer workspace', exact: true })
          .click();
        await page
          .getByRole('link', {
            name: 'Native identity acceptance ' + key,
            exact: true,
          })
          .waitFor();
        viewer = 2;
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.getByRole('alert').waitFor();
        assert.equal(
          await page
            .getByRole('link', {
              name: 'Native identity acceptance ' + key,
              exact: true,
            })
            .count(),
          0,
        );
        await open.click();
        await page
          .getByText('No assigned gatherings.', { exact: true })
          .waitFor();
        assert.equal(
          await page.getByLabel('Organizer name').inputValue(),
          'Organizer 2',
        );
        assert.equal(
          await page
            .locator('a[href="/signout-with-chatgpt?return_to=%2Forganizer"]')
            .getAttribute('target'),
          '_top',
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
        results.push({
          engine,
          size,
          passed: true,
          checks: [
            'keyboard enrollment',
            'no fictional chooser',
            'create own gathering',
            'account switch clears stale data',
            'independent assignments',
            'top-level signout',
            'no overflow',
          ],
        });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    new URL(
      './evidence/native-identity-browser-20260915.json',
      import.meta.url,
    ),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        mode: 'local fictional dispatch simulation',
        results,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`${results.length} native organizer browser journeys passed`);
} finally {
  await mf.dispose();
}
