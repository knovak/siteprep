const { test, expect } = require('@playwright/test');

/**
 * The initiatives TOC and the generated overview pages.
 *
 * These pages are produced from initiative.json, so the thing worth testing is
 * that derived status actually reaches the page - a dashboard that silently
 * renders nothing looks identical to one with nothing to say.
 */

test.use({ serviceWorkers: 'block' });

test.describe('initiatives TOC', () => {
  test('explains what an initiative is, for a reader arriving cold', async ({ page }) => {
    await page.goto('/initiatives/index.html');

    await expect(page.locator('#initiatives-about')).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain('durable unit of intent');
    expect(body).toContain('wish → shaped → specified');
  });

  test('lists every initiative with a link to its overview', async ({ page }) => {
    await page.goto('/initiatives/index.html');

    const entries = page.locator('.toc-item');
    expect(await entries.count()).toBeGreaterThan(0);

    const links = await page
      .locator('.toc-item h3 a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(href).toMatch(/^\.\/[^/]+\/index\.html$/);
    }
  });

  test('separates active initiatives from dormant ones', async ({ page }) => {
    await page.goto('/initiatives/index.html');

    // At least one section is on the page, and an empty one is not rendered at
    // all, so each is asserted only when it has entries.
    const sections = page.locator('[aria-labelledby="initiatives-active"], [aria-labelledby="initiatives-dormant"]');
    expect(await sections.count()).toBeGreaterThan(0);

    for (const [id, expected] of [['initiatives-active', false], ['initiatives-dormant', true]]) {
      const card = page.locator(`[aria-labelledby="${id}"]`);
      if (await card.count() === 0) continue;

      const stages = await card.locator('.toc-item .tag')
        .evaluateAll((els) => els.map((el) => el.textContent.trim()));
      expect(stages.length).toBeGreaterThan(0);
      for (const stage of stages) {
        expect(['dormant', 'archived'].includes(stage), `${stage} in ${id}`).toBe(expected);
      }
    }
  });

  test('carries the shared nav bar, including the Initiatives button', async ({ page }) => {
    await page.goto('/initiatives/index.html');

    const labels = await page
      .locator('nav.tag-nav a')
      .evaluateAll((els) => els.map((el) => el.textContent.trim()));
    expect(labels).toContain('🧭 Initiatives');
  });
});

test.describe('initiative overview page', () => {
  test('shows derived status rather than an empty shell', async ({ page }) => {
    await page.goto('/initiatives/index.html');
    const first = page.locator('.toc-item h3 a').first();
    await first.click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#initiative-purpose')).toBeVisible();
    await expect(page.locator('#initiative-status')).toBeVisible();
    await expect(page.locator('#initiative-stands')).toBeVisible();

    // The stage has to actually appear - this is the page's whole job.
    const status = await page.locator('#initiative-status ~ .card-content, .card-content').allTextContents();
    expect(status.join(' ')).toMatch(/Stage:/);

    // "Where this stands" leads with the two rows a reader arrives for, and
    // both are computed - they are on the page whether or not a brief exists.
    const stands = await page.locator('[aria-labelledby="initiative-stands"] dl.stands dt')
      .evaluateAll((els) => els.map((el) => el.textContent.trim()));
    expect(stands.slice(0, 2)).toEqual(['Needs from you', 'Scheduled']);
  });

  test('links documents as rendered HTML, never as raw markdown', async ({ page }) => {
    await page.goto('/initiatives/index.html');
    await page.locator('.toc-item h3 a').first().click();
    await page.waitForLoadState('domcontentloaded');

    const docLinks = await page
      .locator('#initiative-documents ~ .card-content a, .card-content a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));

    for (const href of docLinks) {
      expect(href, `documents must be rendered, not served as .md: ${href}`).not.toMatch(/\.md$/);
    }
  });

  test('a rendered document page shows the document body', async ({ page }) => {
    // Discovered rather than hardcoded, so the suite does not depend on which
    // initiatives happen to exist.
    await page.goto('/initiatives/index.html');
    const slugHref = await page.locator('.toc-item h3 a').first().getAttribute('href');
    const slug = slugHref.replace(/^\.\//, '').replace(/\/index\.html$/, '');

    await page.goto(`/initiatives/${slug}/wish.html`);

    const body = await page.textContent('body');
    expect(body).toContain('Wish');
    expect(body.length).toBeGreaterThan(200);
  });
});
