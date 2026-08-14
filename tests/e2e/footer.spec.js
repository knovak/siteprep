const { test, expect } = require('@playwright/test');

/**
 * The footer is the one piece of chrome every published page carries, and it is
 * the same row everywhere: rendered by `shared/site_footer/`, from the version
 * and page position `scripts/build.sh` writes onto the `<footer>` element.
 *
 * It used to be emitted as a block of escaped JavaScript inlined into each
 * page, and eight pages carried a hand-copied snapshot of it as well - frozen
 * at "Version: main", and one link short. These tests assert the row is now
 * identical everywhere and appears exactly once per page.
 */

const GITHUB_HREF = 'https://github.com/knovak/siteprep';

// The build's version footer, as opposed to a deck's own back-link footer:
// only the injected one carries the version.
const VERSION_FOOTER = '.site-footer[data-version] .footer-nav';

const PAGES = [
  { path: '/index.html', name: 'root deck index', links: ['Version:', 'Google Drive', 'GitHub', 'View all versions'] },
  { path: '/demos/index.html', name: 'demos index', links: ['Version:', 'Google Drive', 'GitHub', 'View all versions'] },
  { path: '/initiatives/index.html', name: 'initiatives index', links: ['Version:', 'Google Drive', 'GitHub', 'View all versions'] },
  { path: '/decks/india1/index.html', name: 'deck index', links: ['Version:', 'Deck', 'Google Drive', 'GitHub', 'View all versions'] },
  {
    path: '/decks/india1/sections/bangalore/overview.html',
    name: 'section page',
    links: ['Version:', 'Deck', 'Section', 'Google Drive', 'GitHub', 'View all versions']
  }
];

test.describe('site footer', () => {
  for (const target of PAGES) {
    test(`${target.name} renders the shared footer row`, async ({ page }) => {
      await page.goto(target.path);

      const nav = page.locator(VERSION_FOOTER);
      await expect(nav).toHaveCount(1);

      const texts = await nav.locator('a').allTextContents();
      expect(texts.length).toBe(target.links.length);
      target.links.forEach((expected, index) => {
        // The version link carries the branch name, which differs per build.
        expect(texts[index]).toContain(expected);
      });
    });

    test(`${target.name} links to the GitHub repository`, async ({ page }) => {
      await page.goto(target.path);

      // Exact text: the version link carries the branch name, which can itself
      // contain the word "github".
      const github = page.locator(`${VERSION_FOOTER} a`, { hasText: /^GitHub$/ });
      await expect(github).toHaveAttribute('href', GITHUB_HREF);
      await expect(github).toHaveAttribute('target', '_blank');
    });
  }

  test('the version link stays inside this deployment', async ({ page }) => {
    await page.goto('/decks/india1/sections/bangalore/overview.html');

    const version = page.locator(`${VERSION_FOOTER} a`).first();
    await expect(version).toContainText('Version:');

    // Relative, and resolving to the deployment root - never an absolute path
    // or a link to another version's home.
    const href = await version.getAttribute('href');
    expect(href.startsWith('/')).toBe(false);
    expect(href.startsWith('http')).toBe(false);
    expect(new URL(href, page.url()).pathname).toBe('/index.html');
  });
});
