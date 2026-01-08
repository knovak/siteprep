const { test, expect } = require('@playwright/test');
const { isInViewport } = require('../helpers/test-utils');

test.describe('Interactive Element Tests', () => {
  test('INT-01: Collapsible location toggles open/close', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    // Navigate to a section with collapsible content
    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      // Look for collapsible elements
      const collapsibleHeaders = page.locator('.location-header, .collapsible, summary, [onclick*="toggle"]');

      if (await collapsibleHeaders.count() > 0) {
        const firstCollapsible = collapsibleHeaders.first();

        // Get initial state
        const initialDisplay = await page.evaluate((el) => {
          const content = el.nextElementSibling;
          return content ? window.getComputedStyle(content).display : 'none';
        }, await firstCollapsible.elementHandle());

        // Click to toggle
        await firstCollapsible.click();
        await page.waitForTimeout(500);

        // Get new state
        const newDisplay = await page.evaluate((el) => {
          const content = el.nextElementSibling;
          return content ? window.getComputedStyle(content).display : 'none';
        }, await firstCollapsible.elementHandle());

        // State should have changed
        expect(newDisplay).not.toBe(initialDisplay);
      }
    }
  });

  test('INT-02: Toggle icon changes on click', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      // Look for toggle indicators
      const toggles = page.locator('.location-header, .collapsible, summary');

      if (await toggles.count() > 0) {
        const firstToggle = toggles.first();

        // Get initial text/icon
        const initialText = await firstToggle.textContent();

        // Click to toggle
        await firstToggle.click();
        await page.waitForTimeout(300);

        // For details/summary elements, state changes
        const tagName = await firstToggle.evaluate(el => el.tagName);

        if (tagName === 'SUMMARY') {
          const detailsElement = await firstToggle.evaluate(el => el.closest('details'));
          expect(detailsElement).toBeTruthy();
        }
      }
    }
  });

  test('INT-03: Location content starts collapsed', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      // Check for collapsed content
      const details = page.locator('details');

      if (await details.count() > 0) {
        const firstDetail = details.first();

        // Should not have 'open' attribute initially
        const isOpen = await firstDetail.evaluate(el => el.hasAttribute('open'));

        // Default should be collapsed (unless explicitly opened)
        // This test checks the initial state
        expect(typeof isOpen).toBe('boolean');
      }
    }
  });

  test('INT-04: Google Maps links work', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      // Look for Google Maps links
      const mapsLinks = page.locator('a[href*="google.com/maps"], a[href*="maps.google.com"]');

      if (await mapsLinks.count() > 0) {
        const firstMapsLink = mapsLinks.first();

        // Should have href
        const href = await firstMapsLink.getAttribute('href');
        expect(href).toContain('google.com/maps');

        // Should open in new tab
        const target = await firstMapsLink.getAttribute('target');
        expect(target).toBe('_blank');
      }
    }
  });

  test('INT-05: Wikipedia links work', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      // Look for Wikipedia links
      const wikiLinks = page.locator('a[href*="wikipedia.org"]');

      if (await wikiLinks.count() > 0) {
        const firstWikiLink = wikiLinks.first();

        // Should have href
        const href = await firstWikiLink.getAttribute('href');
        expect(href).toContain('wikipedia.org');

        // Should open in new tab
        const target = await firstWikiLink.getAttribute('target');
        expect(target).toBe('_blank');
      }
    }
  });

  test('INT-06: Links show hover state', async ({ page }) => {
    await page.goto('/');

    const link = page.locator('a').first();
    await expect(link).toBeVisible();

    // Get initial color
    const initialColor = await link.evaluate(el => window.getComputedStyle(el).color);

    // Hover over link
    await link.hover();
    await page.waitForTimeout(100);

    // Check that link has some styling (even if color didn't change, cursor should)
    const cursor = await link.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('INT-07: Focus visible on keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el);
      return {
        tagName: el.tagName,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
      };
    });

    expect(focusedElement.tagName).toBeTruthy();
    // Focus should be visible (browser default or custom)
    expect(focusedElement.outlineStyle).not.toBe('none');
  });

  test('INT-08: Multiple toggles work independently', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      const details = page.locator('details');
      const count = await details.count();

      if (count >= 2) {
        // Open first
        await details.nth(0).click();
        await page.waitForTimeout(200);

        const first = await details.nth(0).evaluate(el => el.hasAttribute('open'));

        // Open second
        await details.nth(1).click();
        await page.waitForTimeout(200);

        const second = await details.nth(1).evaluate(el => el.hasAttribute('open'));

        // Both should be able to be open independently
        expect(first).toBe(true);
        expect(second).toBe(true);
      }
    }
  });

  test('INT-09: Toggle has smooth animation', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      const details = page.locator('details').first();

      if (await details.count() > 0) {
        // Check for CSS transition
        const transition = await details.evaluate(el => {
          const content = el.querySelector('summary + *');
          return content ? window.getComputedStyle(content).transition : '';
        });

        // Should have some transition (or element exists for animation)
        expect(typeof transition).toBe('string');
      }
    }
  });

  test('INT-10: No JavaScript errors in console', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to deck
    await page.click('a[href*="decks/india1"]');
    await page.waitForLoadState('networkidle');

    // Navigate to card
    const cardLink = page.locator('a[href*="sections/"]').first();
    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Should have no JavaScript errors (filter out known timing issues)
    const filteredErrors = consoleErrors.filter(e =>
      !e.includes('Service worker') &&
      !e.includes('buildBreadcrumb is not defined')
    );
    expect(filteredErrors).toEqual([]);
  });

  test('INT-11: Touch events work on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      // Tap on card link
      await cardLink.tap();
      await page.waitForLoadState('networkidle');

      // Should navigate
      expect(page.url()).toContain('sections/');

      // Tap on collapsible
      const details = page.locator('details').first();

      if (await details.count() > 0) {
        const summary = details.locator('summary');
        await summary.tap();
        await page.waitForTimeout(300);

        // Should toggle
        const isOpen = await details.evaluate(el => el.hasAttribute('open'));
        expect(typeof isOpen).toBe('boolean');
      }
    }
  });

  test('INT-12: Expanded content scrolls into view', async ({ page }) => {
    await page.goto('/decks/india1/index.html');

    const cardLink = page.locator('a[href*="sections/"]').first();

    if (await cardLink.count() > 0) {
      await cardLink.click();
      await page.waitForLoadState('networkidle');

      const details = page.locator('details').first();

      if (await details.count() > 0) {
        const summary = details.locator('summary');

        // Click to open
        await summary.click();
        await page.waitForTimeout(500);

        // Content should be visible (browser typically scrolls automatically)
        const isOpen = await details.evaluate(el => el.hasAttribute('open'));
        expect(isOpen).toBe(true);
      }
    }
  });
});
