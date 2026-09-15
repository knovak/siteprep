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
        let failure = 'network';
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
          if (input.url().endsWith('/native/status') && failure) {
            if (failure === 'network') await route.abort('failed');
            else
              await route.fulfill({
                status: failure === 'server' ? 503 : 200,
                contentType: 'application/json',
                body: failure === 'shape' ? '{}' : 'interrupted response',
              });
            return;
          }
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
        const retry = page.getByRole('button', {
          name: 'Reload workspace',
          exact: true,
        });
        await page.getByRole('alert').waitFor();
        assert.equal(await retry.isEnabled(), true);
        failure = '';
        await retry.click();
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
        failure = 'server';
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.getByRole('alert').waitFor();
        assert.equal(await retry.isEnabled(), true);
        assert.equal(
          await page
            .getByRole('button', { name: 'Add activity', exact: true })
            .count(),
          0,
        );
        failure = '';
        await retry.click();
        await page
          .getByRole('button', { name: 'Add activity', exact: true })
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
        for (const injected of ['network', 'server', 'json', 'shape']) {
          failure = injected;
          await page.evaluate(() => window.dispatchEvent(new Event('focus')));
          await page.getByRole('alert').waitFor();
          assert.equal(await retry.isEnabled(), true, injected + ' retry');
          assert.equal(
            await page
              .getByRole('link', {
                name: 'Native identity acceptance ' + key,
                exact: true,
              })
              .count(),
            0,
            injected + ' stale gathering',
          );
          assert.equal(
            await page.getByLabel('Organizer name').count(),
            0,
            injected + ' stale profile',
          );
          assert.equal(
            await page
              .getByRole('heading', {
                name: 'Your ChatGPT account',
                exact: true,
              })
              .count(),
            0,
            injected + ' stale account',
          );
          failure = '';
          await retry.click();
          await page
            .getByRole('link', {
              name: 'Native identity acceptance ' + key,
              exact: true,
            })
            .waitFor();
          assert.equal(
            await page.getByRole('alert').count(),
            0,
            injected + ' recovery clears error',
          );
        }
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
            'initial network failure offers retry',
            'gathering failure clears controls and retry restores them',
            'network, 503, invalid JSON and invalid status shape clear stale account and records',
            'retry restores same account without document reload',
            'successful retry clears error',
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
      './evidence/native-resilience-browser-20260915.json',
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
  console.log(
    `${results.length} native interruption/recovery browser journeys passed`,
  );
} finally {
  await mf.dispose();
}
