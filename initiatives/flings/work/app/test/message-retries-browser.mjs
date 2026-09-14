import {
  chromium,
  firefox,
  webkit,
  expect as baseExpect,
} from '@playwright/test';
import assert from 'node:assert/strict';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
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
        const value = await r.json();
        assert.ok(r.ok(), value.error || path);
        return value;
      };
      const fling = (
        await api('workspace/organizer', { title: 'Saturday dinner retries' })
      ).id;
      for (const [name, preference, email, phone] of [
        ['Alex', 'both', 'alex@example.invalid', '+12025550123'],
        ['Robin', 'email', 'robin@example.invalid', ''],
      ])
        await api(fling + '/organizer/members', {
          name,
          preference,
          email,
          phone,
        });
      const workspace = await api(fling + '/organizer'),
        endpoint = fling + '/organizer/messages';
      const reviewed = await api(endpoint + '/prepare', {
        revision: workspace.fling.revision,
        core_text: 'Dinner together at 6 pm.',
        subject: 'Saturday dinner',
        discussion: { body: 'Dinner plans for everyone' },
      });
      const identity = {
        batch_id: reviewed.manifest.batch_id,
        revision: 1,
        fingerprint: reviewed.fingerprint,
      };
      await api(endpoint + '/approve', {
        ...identity,
        confirm: true,
        confirm_discussion: true,
      });
      await api(endpoint + '/export', identity);
      const first = reviewed.manifest.deliveries[0];
      const failed = await api(endpoint + '/results-preview', {
        report: {
          batch_id: identity.batch_id,
          revision: 1,
          results: [
            {
              delivery_id: first.id,
              status: 'reported_failed',
              evidence: 'Fictional failed first attempt',
            },
          ],
        },
      });
      await api(endpoint + '/results-record', { ...failed, confirm: true });
      await page.goto(base + '/organizer/' + fling);
      const panel = page.getByRole('region', {
        name: 'Exact message review',
        exact: true,
      });
      await panel
        .getByText('Message review history (1)', { exact: true })
        .click();
      const retries = panel.getByRole('region', {
        name: 'Selected delivery retries',
        exact: true,
      });
      await retries
        .getByRole('checkbox', {
          name: first.name + ' · ' + first.channel + ' · attempt 1',
          exact: true,
        })
        .check();
      const inspect = retries.getByLabel(
        'Account-history check for ' + first.name + ' · ' + first.channel,
        { exact: true },
      );
      await inspect.fill(
        'Inspected the correct account history: no message was sent.',
      );
      const reviewButton = retries.getByRole('button', {
        name: 'Review selected retry',
        exact: true,
      });
      await expect(reviewButton).toBeDisabled();
      await retries
        .getByRole('checkbox', {
          name: 'The prior sending run has stopped.',
          exact: true,
        })
        .check();
      await retries
        .getByRole('checkbox', {
          name: 'I checked account history and confirmed every selected delivery was not sent.',
          exact: true,
        })
        .check();
      await reviewButton.focus();
      await page.keyboard.press('Enter');
      const review = retries.getByRole('region', {
        name: 'Selected retry review',
        exact: true,
      });
      await expect(review).toContainText('Only these 1 deliveries');
      await expect(review).toContainText(first.destination);
      await expect(review).toContainText(first.suffix);
      const copy = review.getByRole('button', {
        name: 'Confirm and copy selected retry',
        exact: true,
      });
      await expect(copy).toBeDisabled();
      await inspect.fill(
        'Checked again in the intended account; no message exists.',
      );
      await expect(review).toHaveCount(0);
      await reviewButton.click();
      await review
        .getByRole('checkbox', {
          name: 'I reviewed these exact selected messages and destinations.',
          exact: true,
        })
        .check();
      await copy.click();
      const prompt = retries.getByLabel('Selected retry sending prompt', {
        exact: true,
      });
      await expect(prompt).toBeVisible();
      const raw = await prompt.inputValue(),
        manifest = JSON.parse(raw.slice(raw.indexOf('{')));
      assert.equal(manifest.attempt, 2);
      assert.deepEqual(manifest.deliveries, [first]);
      const afterRetry = (await api(endpoint)).batches[0];
      assert.equal(afterRetry.retries.length, 1);
      assert.equal(afterRetry.results.counts.unknown, 3);
      assert.equal(
        (await api(fling + '/organizer/coordination')).posts.filter(
          (p) => p.notification,
        ).length,
        1,
      );
      // Report UI now identifies the current attempt and clears the exported retry.
      const results = panel.getByRole('region', {
        name: 'Reported delivery outcomes',
        exact: true,
      });
      await results
        .getByRole('button', { name: 'Report delivery results', exact: true })
        .click();
      await results
        .getByRole('button', { name: 'Use result template', exact: true })
        .click();
      const text = results.getByLabel('Result JSON', { exact: true }),
        template = JSON.parse(await text.inputValue());
      const row = template.results.find((r) => r.delivery_id === first.id);
      assert.equal(row.attempt, 2);
      await text.fill(
        JSON.stringify({
          ...template,
          results: [
            {
              ...row,
              status: 'reported_sent',
              evidence: 'Attempt 2 observed in Sent; receipt unverified.',
            },
          ],
        }),
      );
      await results
        .getByRole('button', { name: 'Preview result changes', exact: true })
        .click();
      const resultPreview = results.getByRole('region', {
        name: 'Result changes preview',
        exact: true,
      });
      await resultPreview
        .getByRole('checkbox', {
          name: 'I reviewed these reported outcomes and evidence.',
          exact: true,
        })
        .check();
      await resultPreview
        .getByRole('button', { name: 'Record reported outcomes', exact: true })
        .click();
      await expect(prompt).toHaveCount(0);
      await expect(
        retries.getByRole('checkbox', {
          name: first.name + ' · ' + first.channel + ' · attempt 2',
          exact: true,
        }),
      ).toHaveCount(0);
      await page.reload();
      await panel
        .getByText('Message review history (1)', { exact: true })
        .click();
      await retries.getByText('Retry history (1)', { exact: true }).click();
      await expect(retries).toContainText('Attempt 2 · Casey (a)');
      await expect(retries).toContainText(
        'Checked again in the intended account',
      );
      await expect(
        retries.getByRole('button', {
          name: 'Recheck and copy attempt 2',
          exact: true,
        }),
      ).toHaveCount(0);
      const history = (await api(endpoint)).batches[0];
      assert.equal(history.results.counts.reported_sent, 1);
      assert.equal(history.results.reports.length, 2);
      assert.ok(
        !JSON.stringify(history).includes(first.suffix.split('#code=')[1]),
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
        await context.storageState({ path: '.wrangler/qa/retries-state.json' });
        await chmod('.wrangler/qa/retries-state.json', 0o600);
        await writeFile('.wrangler/qa/retries-fling.txt', fling, {
          mode: 0o600,
        });
      }
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'explicit-selection',
          'history-and-stopped-run-required',
          'keyboard-review',
          'exact-subset',
          'editing-clears-review',
          'copy-remains-unknown',
          'one-discussion-post',
          'attempt-result-template',
          'record-clears-prompt',
          'sent-not-retryable',
          'reload-preserves-attempt-history',
          'redacted-history',
          'no-overflow',
          'no-page-errors',
        ],
        sending:
          'Fictional fixtures and stubbed clipboard; no real accounts or sending.',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/message-retries-browser-20260914.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' selected-retry browser journeys passed.');
