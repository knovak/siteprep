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
        await api('workspace/organizer', { title: 'Saturday dinner results' })
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
      });
      const identity = {
        batch_id: reviewed.manifest.batch_id,
        revision: 1,
        fingerprint: reviewed.fingerprint,
      };
      await api(endpoint + '/approve', { ...identity, confirm: true });
      await api(endpoint + '/export', identity);
      await page.goto(base + '/organizer/' + fling);
      const panel = page.getByRole('region', {
        name: 'Exact message review',
        exact: true,
      });
      await panel
        .getByText('Message review history (1)', { exact: true })
        .click();
      const results = panel.getByRole('region', {
        name: 'Reported delivery outcomes',
        exact: true,
      });
      await expect(results).toContainText(
        '0 reported sent · 0 reported failed · 0 suppressed · 3 unknown',
      );
      await results
        .getByRole('button', { name: 'Report delivery results', exact: true })
        .click();
      await results
        .getByRole('button', { name: 'Use result template', exact: true })
        .click();
      const textarea = results.getByLabel('Result JSON', { exact: true });
      const template = JSON.parse(await textarea.inputValue());
      assert.equal(template.batch_id, identity.batch_id);
      const report = {
        ...template,
        results: [
          {
            ...template.results[0],
            status: 'reported_sent',
            evidence: 'Gmail Sent reference "α"\nObserved by an external tool.',
          },
          {
            ...template.results[1],
            status: 'reported_failed',
            evidence: 'Messages showed an error; no receipt claim.',
          },
        ],
      };
      await textarea.fill(
        JSON.stringify({
          ...report,
          results: [report.results[0], report.results[0]],
        }),
      );
      await results
        .getByRole('button', { name: 'Preview result changes', exact: true })
        .click();
      await expect(page.getByRole('alert')).toContainText('only once');
      assert.equal((await api(endpoint)).batches[0].results_revision, 0);
      await textarea.fill(JSON.stringify(report));
      await results
        .getByRole('button', { name: 'Preview result changes', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      const preview = results.getByRole('region', {
        name: 'Result changes preview',
        exact: true,
      });
      await expect(preview).toContainText('Outcome unknown → Reported sent');
      await expect(preview).toContainText(
        '1 other deliveries remain unchanged',
      );
      await expect(
        preview.getByRole('button', {
          name: 'Record reported outcomes',
          exact: true,
        }),
      ).toBeDisabled();
      assert.equal((await api(endpoint)).batches[0].results_revision, 0);
      // Editing even after reviewing must discard the old confirmation.
      await textarea.fill(JSON.stringify(report, null, 2));
      await expect(preview).toHaveCount(0);
      await results
        .getByRole('button', { name: 'Preview result changes', exact: true })
        .click();
      await preview
        .getByRole('checkbox', {
          name: 'I reviewed these reported outcomes and evidence.',
          exact: true,
        })
        .check();
      await preview
        .getByRole('button', { name: 'Record reported outcomes', exact: true })
        .click();
      await expect(results).toContainText(
        'Results recorded. Recipient receipt remains unverified.',
      );
      await expect(results).toContainText(
        '1 reported sent · 1 reported failed · 0 suppressed · 1 unknown',
      );
      await expect(
        panel.getByRole('button', {
          name: 'Recheck and copy approved prompt',
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        panel.getByLabel('Exported sending prompt', { exact: true }),
      ).toHaveCount(0);
      await page.reload();
      await panel
        .getByText('Message review history (1)', { exact: true })
        .click();
      await expect(results).toContainText(
        '1 reported sent · 1 reported failed · 0 suppressed · 1 unknown',
      );
      await expect(results).toContainText('Reported by Casey (a)');
      await results
        .getByRole('button', { name: 'Report delivery results', exact: true })
        .click();
      await textarea.fill(
        JSON.stringify({
          ...report,
          results: [
            {
              ...report.results[0],
              status: 'unknown',
              evidence: 'Correction: this observation was ambiguous.',
            },
          ],
        }),
      );
      await results
        .getByRole('button', { name: 'Preview result changes', exact: true })
        .click();
      await expect(preview).toContainText('Reported sent → Outcome unknown');
      await expect(preview).toContainText(
        'Previous claimed evidence: Gmail Sent reference',
      );
      await preview
        .getByRole('checkbox', {
          name: 'I reviewed these reported outcomes and evidence.',
          exact: true,
        })
        .check();
      await preview
        .getByRole('button', { name: 'Record reported outcomes', exact: true })
        .click();
      await expect(results).toContainText(
        '0 reported sent · 1 reported failed · 0 suppressed · 2 unknown',
      );
      await results.getByText('Report history (2)', { exact: true }).click();
      await expect(results).toContainText('Gmail Sent reference "α"');
      await expect(results).toContainText(
        'Correction: this observation was ambiguous.',
      );
      const history = (await api(endpoint)).batches[0];
      assert.equal(history.results.reports.length, 2);
      assert.equal(history.results_revision, 2);
      assert.equal(history.results.counts.unknown, 2);
      const encoded = JSON.stringify(history);
      for (const d of reviewed.manifest.deliveries)
        assert.ok(!encoded.includes(d.suffix.split('#code=')[1]));
      assert.ok(!(await results.locator('a').count()));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      if (engine === 'chromium' && viewport.width === 1280) {
        await mkdir('.wrangler/qa', { recursive: true });
        await context.storageState({ path: '.wrangler/qa/results-state.json' });
        await chmod('.wrangler/qa/results-state.json', 0o600);
        await writeFile('.wrangler/qa/results-fling.txt', fling, {
          mode: 0o600,
        });
      }
      receipts.push({
        engine,
        version: browser.version(),
        viewport,
        passed: true,
        checks: [
          'invalid-duplicate-rejected-without-write',
          'preview-before-confirmation',
          'keyboard-preview',
          'edited-input-clears-preview',
          'mixed-outcomes-with-unreported-unknown',
          'reported-evidence-not-receipt',
          'reload-and-attribution',
          'correction-preview-retains-history',
          'full-batch-recopy-unavailable-after-report',
          'redacted-history',
          'no-overflow',
          'no-page-errors',
        ],
        sending:
          'fictional API-export fixture only; no external apps or real clipboard',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  'test/evidence/message-results-browser-20260913.json',
  JSON.stringify(
    { recorded_at: new Date().toISOString(), base, receipts },
    null,
    2,
  ) + '\n',
);
console.log(receipts.length + ' result-reporting browser journeys passed.');
