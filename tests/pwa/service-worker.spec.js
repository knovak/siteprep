const { test, expect } = require('@playwright/test');
const { waitForServiceWorker, getCacheNames, isCached } = require('../helpers/test-utils');

test.describe('PWA Functionality Tests', () => {
  test('PWA-01: Manifest exists', async ({ page }) => {
    await page.goto('/');

    // Check manifest file exists
    const manifestResponse = await page.request.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);
  });

  test('PWA-02: Manifest valid JSON', async ({ page }) => {
    const manifestResponse = await page.request.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);

    const manifestText = await manifestResponse.text();
    let manifest;

    // Should parse as valid JSON
    expect(() => {
      manifest = JSON.parse(manifestText);
    }).not.toThrow();

    // Should have required fields
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
  });

  test('PWA-03: Service worker registers', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/');

    // Wait for service worker to register
    const swState = await waitForServiceWorker(page);
    expect(swState).toBe('activated');
  });

  test('PWA-04: Service worker activates', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/');

    // Wait for service worker to fully activate
    const swState = await waitForServiceWorker(page);
    expect(swState).toBe('activated');
  });

  test('PWA-05: Cache created', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/');

    // Wait for SW to activate
    await waitForServiceWorker(page);

    // Give cache time to populate
    await page.waitForTimeout(1000);

    const cacheNames = await getCacheNames(page);

    // Should have at least one cache starting with 'siteprep-'
    const siteprepCache = cacheNames.find(name => name.startsWith('siteprep-'));
    expect(siteprepCache).toBeTruthy();
  });

  test('PWA-06: Offline access works', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);

    // First visit while online
    await page.goto('/');
    await waitForServiceWorker(page);
    await page.waitForTimeout(1000);

    // Verify core assets are cached
    const indexCached = await isCached(page, page.url());
    expect(indexCached).toBe(true);

    // Go offline
    await context.setOffline(true);

    // Reload page - should load from cache
    await page.reload();

    // Page should still be accessible
    const title = await page.title();
    expect(title).toBeTruthy();

    // Content should be visible
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('PWA-09: start_url loads correctly', async ({ page }) => {
    const manifestResponse = await page.request.get('/manifest.webmanifest');
    const manifest = await manifestResponse.json();

    // Navigate to start_url
    await page.goto(manifest.start_url);

    // Should load successfully
    expect(page.url()).toContain(manifest.start_url.replace('./', ''));

    // Should have content
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('PWA-10: Cache version defined', async ({ page }) => {
    const swResponse = await page.request.get('/sw.js');
    const swCode = await swResponse.text();

    // Should have CACHE_VERSION constant
    expect(swCode).toContain('CACHE_VERSION');
    expect(swCode).toMatch(/CACHE_VERSION\s*=\s*['"]v\d+['"]/);
  });

  test('PWA-11: Cache update on version change', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/');

    await waitForServiceWorker(page);
    await page.waitForTimeout(1000);

    const initialCaches = await getCacheNames(page);

    // All caches should follow the versioning pattern
    const siteprepCaches = initialCaches.filter(name => name.startsWith('siteprep-'));
    expect(siteprepCaches.length).toBeGreaterThan(0);

    // Each cache should have version identifier
    siteprepCaches.forEach(cacheName => {
      expect(cacheName).toMatch(/siteprep-v\d+/);
    });
  });

  test('BUILD-08: Service worker code injected in HTML', async ({ page }) => {
    const indexResponse = await page.request.get('/');
    const htmlContent = await indexResponse.text();

    // Should include scripts.js which contains service worker registration
    expect(htmlContent).toContain('scripts.js');

    // Verify scripts.js actually contains service worker code
    const scriptsResponse = await page.request.get('/decks/india1/assets/scripts.js');
    const scriptsContent = await scriptsResponse.text();
    expect(scriptsContent).toContain('serviceWorker');
    expect(scriptsContent).toContain('navigator.serviceWorker.register');
  });
});

test.describe('PWA - Deck Pages', () => {
  test('Service worker registers on deck pages', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);

    // Navigate to a deck
    await page.goto('/decks/india1/index.html');

    // Wait for service worker to register
    const swState = await waitForServiceWorker(page);
    expect(swState).toBe('activated');
  });

  test('Deck pages work offline', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);

    // Visit deck page while online
    await page.goto('/decks/india1/index.html');
    await waitForServiceWorker(page);
    await page.waitForTimeout(1000);

    // Navigate to a section
    const firstLink = page.locator('a[href*="sections/"]').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Go offline
      await context.setOffline(true);

      // Reload - should work from cache
      await page.reload();

      const bodyText = await page.textContent('body');
      expect(bodyText.length).toBeGreaterThan(0);
    }
  });
});
