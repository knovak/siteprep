// A demo that has a beta is published twice, and each copy says which one it
// is. The build tests check the bytes; this checks what a reader sees - that
// the label is on screen in each copy, in the element it was meant to join,
// and that the demos index and the initiative's overview page reach the beta.
//
// The copies come from `initiatives.mjs channels`, the same list the build
// publishes from, so a new beta is covered without editing this file.

const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const channels = JSON.parse(execFileSync(
  'node', [path.join(ROOT, 'scripts', 'initiatives.mjs'), 'channels', '--json'],
  { cwd: ROOT, encoding: 'utf8' }
));
const LABELS = { released: 'Released', beta: 'Beta' };
const urlPath = (...parts) => `/${parts.join('/').split('/').map(encodeURIComponent).join('/')}`;

test.use({ serviceWorkers: 'block' });

test.describe('demo beta', () => {
  test('at least one demo has a beta to check', () => {
    expect(channels.filter((row) => row.channel === 'beta').length).toBeGreaterThan(0);
  });

  for (const row of channels) {
    test(`${row.slug}: the ${row.channel} copy is labeled ${LABELS[row.channel]}`, async ({ page }) => {
      const errors = [];
      const offPage = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('request', (request) => {
        if (!request.url().endsWith(urlPath(row.path, row.root_html))) offPage.push(request.url());
      });

      await page.goto(urlPath(row.path, row.root_html));
      const stamp = page.locator('#siteprep-channel-stamp');
      await expect(stamp).toBeVisible();
      await expect(stamp).toHaveAttribute('data-channel', row.channel);
      await expect(stamp).toContainText(LABELS[row.channel]);
      if (row.changed) await expect(stamp).toContainText(`changed ${row.changed}`);

      // A declared anchor has to be on the page. If a change to the demo
      // removes it, the label falls back to a fixed corner line; this fails so
      // that `beta.stamp` is updated rather than left pointing at nothing.
      if (row.stamp) {
        await expect(page.locator(`${row.stamp} > #siteprep-channel-stamp`)).toBeVisible();
      }

      // The label is inert: it loads nothing and breaks nothing.
      expect(errors).toEqual([]);
      expect(offPage).toEqual([]);
    });
  }

  for (const row of channels.filter((entry) => entry.channel === 'beta')) {
    test(`${row.slug}: the demos index links the beta beside the release`, async ({ page }) => {
      await page.goto('/demos/index.html');
      const item = page.locator('.toc-item', { has: page.getByRole('link', { name: 'Beta version' }) });
      await expect(item).toHaveCount(1);
      await item.getByRole('link', { name: 'Beta version' }).click();
      await expect(page).toHaveURL(new RegExp(`${urlPath(row.path)}/(${row.root_html})?$`));
      await expect(page.locator('#siteprep-channel-stamp')).toHaveAttribute('data-channel', 'beta');
    });

    test(`${row.slug}: the initiative page links the beta`, async ({ page }) => {
      await page.goto(`/initiatives/${row.slug}/index.html`);
      const card = page.locator('main[aria-labelledby="initiative-deployments"]');
      const link = card.locator('li', { hasText: 'Beta —' }).getByRole('link');
      await expect(link).toHaveAttribute('href', new RegExp(`${urlPath(row.path)}/(${row.root_html})?$`));
    });
  }
});
