const { test, expect } = require('@playwright/test');

/**
 * The nav bar must stay inside the deployment it was loaded from.
 *
 * Branch previews are published under `/branch/<name>/`, and the nav used to
 * work out the site root by looking for `decks` in the URL. On any page without
 * that segment - the root index, the demos index - it fell back to the first
 * path segment and sent every button to main. The bug was invisible from the
 * main site, where guessing the wrong root happens to give the right answer.
 *
 * These tests serve the built site from a simulated branch prefix and assert
 * that no nav link escapes it.
 */

const BRANCH_PREFIX = '/branch/simulated-preview';

// The site registers a service worker at the deployment root, which can serve
// cached responses and bypass the route interception below. These tests are
// about navigation, not caching, so keep it out of the way.
test.use({ serviceWorkers: 'block' });

/** Serve gh-pages under a branch-preview prefix, as GitHub Pages does. */
async function routeBranchPreview(page, baseURL) {
  await page.route(`**${BRANCH_PREFIX}/**`, async (route) => {
    const url = new URL(route.request().url());
    const withoutPrefix = url.pathname.slice(BRANCH_PREFIX.length) || '/';
    try {
      const response = await route.fetch({
        url: new URL(withoutPrefix + url.search, baseURL).href
      });
      // Read the body before fulfilling: passing the response object through
      // can fail as "disposed" when a subresource is still in flight while the
      // test finishes.
      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: await response.body()
      });
    } catch (err) {
      // A request outliving the page it belongs to is not a test failure.
      await route.abort().catch(() => {});
    }
  });
}

const PAGES = [
  { path: '/index.html', name: 'root deck index' },
  { path: '/demos/index.html', name: 'demos index' },
  { path: '/decks/india1/index.html', name: 'deck index' }
];

test.describe('nav bar on a branch preview', () => {
  for (const target of PAGES) {
    test(`${target.name} keeps every nav link inside the branch`, async ({ page, baseURL }) => {
      await routeBranchPreview(page, baseURL);
      await page.goto(`${BRANCH_PREFIX}${target.path}`);

      const nav = page.locator('nav.tag-nav');
      await expect(nav).toBeVisible();

      const links = nav.locator('a');
      expect(await links.count()).toBeGreaterThan(0);

      for (const href of await links.evaluateAll((els) => els.map((el) => el.href))) {
        // Off-site links (the Documents drive folder) are not our business.
        if (!href.includes(new URL(page.url()).host)) continue;
        expect(
          href,
          `nav link escaped the branch preview: ${href}`
        ).toContain(BRANCH_PREFIX);
      }
    });
  }

  test('root index declares its version root', async ({ page, baseURL }) => {
    await routeBranchPreview(page, baseURL);
    await page.goto(`${BRANCH_PREFIX}/index.html`);

    const versionRoot = await page.evaluate(() => window.SiteNav.versionRoot());
    expect(new URL(versionRoot).pathname).toBe(`${BRANCH_PREFIX}/`);
  });
});

test.describe('nav bar on the main deployment', () => {
  test('deck page renders the expected buttons', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const labels = await page
      .locator('nav.tag-nav a')
      .evaluateAll((els) => els.map((el) => el.textContent.trim()));

    expect(labels).toEqual([
      '🏠 Home',
      '⬆️ Top of deck',
      '🔺 Documents',
      '🧪 Demos',
      '🧭 Initiatives'
    ]);
  });

  test('TOC pages omit "Top of deck", which would only repeat Home', async ({ page }) => {
    await page.goto('/index.html');

    const labels = await page
      .locator('nav.tag-nav a')
      .evaluateAll((els) => els.map((el) => el.textContent.trim()));

    expect(labels).toEqual(['🏠 Home', '🔺 Documents', '🧪 Demos', '🧭 Initiatives']);
  });

  test('internal nav links open in the same tab', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const internal = page.locator('nav.tag-nav a:not([href^="https://drive.google.com"])');
    for (const target of await internal.evaluateAll((els) => els.map((el) => el.target))) {
      expect(target).toBe('');
    }
  });
});
