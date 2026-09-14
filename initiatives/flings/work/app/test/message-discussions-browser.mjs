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
        await api('workspace/organizer', {
          title: 'Saturday dinner discussion',
        })
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
      await expect(
        panel.getByLabel('Core message', { exact: true }),
      ).toBeDisabled();
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
        .getByRole('checkbox', {
          name: 'Also post to one discussion',
          exact: true,
        })
        .check();
      await panel.getByLabel('Discussion', { exact: true }).selectOption('0');
      await panel
        .getByLabel('Shared discussion text', { exact: true })
        .fill('Shared dinner update.\nBring an idea for next time.');
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
      await expect(
        panel.getByRole('button', {
          name: 'Approve these exact messages',
          exact: true,
        }),
      ).toBeDisabled();
      await expect(panel.locator('.message-discussion-review')).toContainText(
        'Alex',
      );
      await expect(panel.locator('.message-discussion-review')).toContainText(
        'Casey',
      );
      await expect(panel.locator('.message-discussion-review')).toContainText(
        'Shared dinner update.',
      );
      assert.equal(
        (await api(fling + '/organizer/coordination')).posts.length,
        0,
      );
      await panel
        .getByRole('checkbox', {
          name: 'I reviewed the discussion readers and shared text.',
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
      assert.equal(manifest.discussion, undefined);
      const post = (await api(fling + '/organizer/coordination')).posts[0];
      assert.equal(
        post.body,
        'Shared dinner update.\nBring an idea for next time.',
      );
      assert.equal(post.notification.state, 'Notification prepared');
      assert.equal(post.notification.counts.unknown, 3);
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
      await panel.locator('.message-history > summary').click();
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
      const endpoint = fling + '/organizer/messages';
      const report = {
        batch_id: manifest.batch_id,
        revision: 1,
        results: [
          {
            delivery_id: manifest.deliveries[0].id,
            status: 'reported_failed',
            evidence: 'Fictional app interruption',
          },
        ],
      };
      const preview = await api(endpoint + '/results-preview', { report });
      await api(endpoint + '/results-record', { ...preview, confirm: true });
      await page.reload();
      const discussions = page.getByRole('region', {
        name: 'Discussions',
        exact: true,
      });
      await expect(discussions).toContainText(
        'Reported outcomes · 0 reported sent · 1 reported failed · 0 suppressed · 2 outcome unknown',
      );
      await expect(discussions).toContainText('Shared dinner update.');
      await expect(discussions).not.toContainText('Bring your "ideas".');
      await expect(discussions).not.toContainText('dinner@example.invalid');
      await discussions
        .getByRole('link', { name: 'Review notification batch', exact: true })
        .click();
      await expect(
        panel.getByRole('heading', { name: 'Saturday "dinner"', exact: true }),
      ).toBeVisible();
      assert.equal(
        (await api(fling + '/organizer/coordination')).posts.length,
        1,
      );
      await panel
        .getByText('Reviewed discussion: Whole fling', { exact: true })
        .click();
      await expect(panel.locator('.message-history')).toContainText(
        'Shared dinner update.',
      );
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
          path: '.wrangler/qa/message-discussions-state.json',
        });
        await chmod('.wrangler/qa/message-discussions-state.json', 0o600);
        await writeFile('.wrangler/qa/message-discussions-fling.txt', fling, {
          mode: 0o600,
        });
      }
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'separate-shared-text-and-audience-review',
          'independent-discussion-confirmation',
          'keyboard-approval',
          'single-atomic-post',
          'copy-and-recopy-do-not-duplicate',
          'shared-post-contains-no-personal-suffix-or-contact',
          'reported-counts-on-reload',
          'organizer-link-opens-review-history',
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
  'test/evidence/message-discussions-browser-20260914.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' message-discussion browser journeys passed.');
