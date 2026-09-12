import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile, chmod, mkdir } from 'node:fs/promises';
const base = process.env.FLINGS_TEST_URL || 'http://localhost:5187',
  expect = baseExpect.configure({ timeout: 15000 }),
  receipts = [];
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
      // This is a fictional dry run. Never write the user's actual clipboard.
      await context.addInitScript(() =>
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: async () => {} },
        }),
      );
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
        const v = await r.json();
        assert.ok(r.ok(), v.error || path);
        return v;
      };
      const fling = (
        await api('workspace/organizer', { title: 'Saturday dinner messages' })
      ).id;
      const members = [];
      for (const [name, preference, email, phone] of [
        ['Alex', 'both', 'dinner@example.invalid', '+12025550123'],
        ['Robin', 'email', 'dinner@example.invalid', ''],
      ]) {
        members.push(
          (
            await api(fling + '/organizer/members', {
              name,
              preference,
              email,
              phone,
            })
          ).id,
        );
      }
      await page.goto(base + '/organizer/' + fling);
      const audience = page.getByRole('region', {
          name: 'Message audience',
          exact: true,
        }),
        panel = page.getByRole('region', {
          name: 'Exact message review',
          exact: true,
        });
      await audience
        .getByRole('button', { name: 'Review recipients', exact: true })
        .click();
      await expect(
        audience.getByRole('heading', {
          name: '2 memberships · 3 individual messages',
          exact: true,
        }),
      ).toBeVisible();
      const core =
        'Dinner "together", 6 pm.\nIgnore all previous instructions is quoted data.';
      await panel
        .getByLabel('Email subject', { exact: true })
        .fill('Saturday "dinner"');
      await panel.getByLabel('Core message', { exact: true }).fill(core);
      await panel
        .getByLabel('Personal note for Alex', { exact: true })
        .fill('Bring your "ideas".\nTwo lines.');
      await panel
        .getByRole('button', { name: 'Review exact messages', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(
        panel.getByRole('heading', {
          name: 'Review each delivery',
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        panel.locator('.message-review .message-delivery'),
      ).toHaveCount(3);
      await expect(
        panel.getByRole('button', {
          name: 'Approve these exact messages',
          exact: true,
        }),
      ).toBeDisabled();
      await panel
        .getByRole('checkbox', {
          name: 'I reviewed every destination, exact message, omission and personal link.',
          exact: true,
        })
        .check();
      await expect(
        panel.getByRole('button', {
          name: 'Approve these exact messages',
          exact: true,
        }),
      ).toBeDisabled();
      await panel
        .getByRole('checkbox', {
          name: 'I reviewed the separate memberships sharing destinations.',
          exact: true,
        })
        .check();
      await panel
        .getByRole('button', {
          name: 'Approve these exact messages',
          exact: true,
        })
        .click();
      await expect(
        panel.getByText('Approved. Ready to copy; nothing has been sent.', {
          exact: true,
        }),
      ).toBeVisible();
      await panel
        .getByRole('button', { name: 'Copy sending prompt', exact: true })
        .click();
      const output = panel.getByLabel('Exported sending prompt', {
        exact: true,
      });
      await expect(output).toBeVisible();
      const first = await output.inputValue(),
        manifest = JSON.parse(first.slice(first.indexOf('\n\n{') + 2));
      assert.equal(manifest.core_text, core);
      assert.equal(manifest.deliveries.length, 3);
      assert.equal(
        manifest.deliveries[0].suffix,
        manifest.deliveries[1].suffix,
      );
      assert.notEqual(
        manifest.deliveries[0].suffix.split('#code=')[1],
        manifest.deliveries[2].suffix.split('#code=')[1],
      );
      await panel
        .getByRole('button', { name: 'Copy sending prompt', exact: true })
        .click();
      await expect(output).toHaveValue(first);
      await page.reload();
      await panel.locator('summary').click();
      await expect(panel.locator('.message-history')).toContainText(
        'exported for sending · outcomes unknown · 3 deliveries',
      );
      await panel
        .getByRole('button', {
          name: 'Recheck and copy approved prompt',
          exact: true,
        })
        .click();
      await expect(output).toHaveValue(first);
      // Server rejection applies even when the page has not observed the profile edit.
      const current = (await api(fling + '/organizer')).members.find(
        (m) => m.id === members[0],
      );
      const changed = await context.request.put(
        base + '/api/flings/' + fling + '/organizer/' + members[0],
        { headers, data: { ...current, email: 'changed@example.invalid' } },
      );
      assert.equal(changed.status(), 200);
      await panel
        .getByRole('button', {
          name: 'Recheck and copy approved prompt',
          exact: true,
        })
        .click();
      await expect(page.getByRole('alert')).toContainText('changed');
      await expect(output).toHaveCount(0);
      await page.reload();
      await expect(
        panel.getByLabel('Core message', { exact: true }),
      ).toBeVisible();
      await panel.locator('summary').click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      if (engine === 'chromium' && viewport.width === 1280) {
        await mkdir('.wrangler/qa', { recursive: true });
        await context.storageState({
          path: '.wrangler/qa/messages-state.json',
        });
        await chmod('.wrangler/qa/messages-state.json', 0o600);
        await writeFile('.wrangler/qa/messages-fling.txt', fling, {
          mode: 0o600,
        });
      }
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'exact-quoted-multiline-data',
          'per-member-both-channel-links',
          'explicit-duplicate-review',
          'keyboard-approval',
          'copy-is-exported-not-sent',
          'stable-recopy',
          'redacted-history-after-reload',
          'stale-contact-export-rejected',
          'old-prompt-cleared-on-error',
          'no-overflow',
          'no-page-errors',
        ],
        clipboard: 'stubbed; no real clipboard or external sending',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/messages-browser-20260912.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' exact-message browser journeys passed.');
