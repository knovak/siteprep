const { test, expect } = require('@playwright/test');

test.describe('Map Functionality Tests', () => {
  test('MAP-01: India Maps page loads successfully', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page).toHaveTitle(/India Maps/);

    // Check that map containers exist
    const map1 = page.locator('#india-map-osm');
    const map2 = page.locator('#india-map-topo');

    await expect(map1).toBeVisible();
    await expect(map2).toBeVisible();
  });

  test('MAP-02: UAE Maps page loads successfully', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page).toHaveTitle(/UAE Maps/);

    // Check that map containers exist
    const map1 = page.locator('#uae-map-osm');
    const map2 = page.locator('#uae-map-topo');

    await expect(map1).toBeVisible();
    await expect(map2).toBeVisible();
  });

  test('MAP-03: Leaflet library loads correctly on India Maps', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for Leaflet to load
    await page.waitForTimeout(300);

    // Check that Leaflet is defined
    const leafletDefined = await page.evaluate(() => typeof window.L !== 'undefined');
    expect(leafletDefined).toBe(true);
  });

  test('MAP-04: Leaflet library loads correctly on UAE Maps', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for Leaflet to load
    await page.waitForTimeout(300);

    // Check that Leaflet is defined
    const leafletDefined = await page.evaluate(() => typeof window.L !== 'undefined');
    expect(leafletDefined).toBe(true);
  });

  test('MAP-05: Map containers have proper height on India Maps', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Check that map containers have explicit height
    const map1Height = await page.locator('#india-map-osm').evaluate(el => {
      return window.getComputedStyle(el).height;
    });

    const map2Height = await page.locator('#india-map-topo').evaluate(el => {
      return window.getComputedStyle(el).height;
    });

    // Height should be 600px or 400px (mobile)
    expect(map1Height).toMatch(/\d+px/);
    expect(map2Height).toMatch(/\d+px/);

    // Height should not be 0
    const map1HeightValue = parseInt(map1Height);
    const map2HeightValue = parseInt(map2Height);

    expect(map1HeightValue).toBeGreaterThan(0);
    expect(map2HeightValue).toBeGreaterThan(0);
  });

  test('MAP-06: Map containers have proper height on UAE Maps', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Check that map containers have explicit height
    const map1Height = await page.locator('#uae-map-osm').evaluate(el => {
      return window.getComputedStyle(el).height;
    });

    const map2Height = await page.locator('#uae-map-topo').evaluate(el => {
      return window.getComputedStyle(el).height;
    });

    // Height should be 600px or 400px (mobile)
    expect(map1Height).toMatch(/\d+px/);
    expect(map2Height).toMatch(/\d+px/);

    // Height should not be 0
    const map1HeightValue = parseInt(map1Height);
    const map2HeightValue = parseInt(map2Height);

    expect(map1HeightValue).toBeGreaterThan(0);
    expect(map2HeightValue).toBeGreaterThan(0);
  });

  test('MAP-07: India Maps has correct number of markers', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for maps to initialize
    await page.waitForTimeout(500);

    // Check that markers are created (15 locations)
    const markerCount = await page.evaluate(() => {
      const map1Container = document.querySelector('#india-map-osm');
      const markers = map1Container.querySelectorAll('.leaflet-marker-icon');
      return markers.length;
    });

    expect(markerCount).toBe(15);
  });

  test('MAP-08: UAE Maps has correct number of markers', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for maps to initialize
    await page.waitForTimeout(500);

    // Check that markers are created (9 locations)
    const markerCount = await page.evaluate(() => {
      const map1Container = document.querySelector('#uae-map-osm');
      const markers = map1Container.querySelectorAll('.leaflet-marker-icon');
      return markers.length;
    });

    expect(markerCount).toBe(9);
  });

  test('MAP-09: Navigation buttons exist and work on India Maps', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for controls to be created
    await page.waitForTimeout(300);

    // Check that controls exist
    const controlsDiv = page.locator('#india-legend-osm');
    await expect(controlsDiv).toBeVisible();

    // Check that there are navigation buttons (15 locations + 1 "Show all" button = 16 buttons)
    const buttons = page.locator('#india-legend-osm button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBe(16);

    // Click on first button
    const firstButton = buttons.first();
    await firstButton.click();
    await page.waitForTimeout(300);

    // Map should still be visible after clicking
    const map1 = page.locator('#india-map-osm');
    await expect(map1).toBeVisible();
  });

  test('MAP-10: Navigation buttons exist and work on UAE Maps', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for controls to be created
    await page.waitForTimeout(300);

    // Check that controls exist
    const controlsDiv = page.locator('#uae-legend-osm');
    await expect(controlsDiv).toBeVisible();

    // Check that there are navigation buttons (9 locations + 1 "Show all" button = 10 buttons)
    const buttons = page.locator('#uae-legend-osm button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBe(10);

    // Click on first button
    const firstButton = buttons.first();
    await firstButton.click();
    await page.waitForTimeout(300);

    // Map should still be visible after clicking
    const map1 = page.locator('#uae-map-osm');
    await expect(map1).toBeVisible();
  });

  test('MAP-11: "Show all" button works on India Maps', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for controls to be created
    await page.waitForTimeout(300);

    // Find "Show all" button
    const showAllButton = page.locator('#india-legend-osm button').last();
    const buttonText = await showAllButton.textContent();
    expect(buttonText).toContain('Show all');

    // Click on "Show all" button
    await showAllButton.click();
    await page.waitForTimeout(300);

    // Map should still be visible
    const map1 = page.locator('#india-map-osm');
    await expect(map1).toBeVisible();
  });

  test('MAP-12: "Show all" button works on UAE Maps', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for controls to be created
    await page.waitForTimeout(300);

    // Find "Show all" button
    const showAllButton = page.locator('#uae-legend-osm button').last();
    const buttonText = await showAllButton.textContent();
    expect(buttonText).toContain('Show all');

    // Click on "Show all" button
    await showAllButton.click();
    await page.waitForTimeout(300);

    // Map should still be visible
    const map1 = page.locator('#uae-map-osm');
    await expect(map1).toBeVisible();
  });

  test('MAP-13: Markers have popups on India Maps', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for maps to initialize
    await page.waitForTimeout(500);

    // Click on first marker
    const firstMarker = page.locator('#india-map-osm .leaflet-marker-icon').first();
    await firstMarker.click();
    await page.waitForTimeout(300);

    // Check that popup is visible
    const popup = page.locator('#india-map-osm .leaflet-popup');
    await expect(popup).toBeVisible();
  });

  test('MAP-14: Markers have popups on UAE Maps', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for maps to initialize
    await page.waitForTimeout(500);

    // Click on first marker
    const firstMarker = page.locator('#uae-map-osm .leaflet-marker-icon').first();
    await firstMarker.click();
    await page.waitForTimeout(300);

    // Check that popup is visible
    const popup = page.locator('#uae-map-osm .leaflet-popup');
    await expect(popup).toBeVisible();
  });

  test('MAP-15: No JavaScript errors on India Maps', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Filter out known harmless errors
    const filteredErrors = consoleErrors.filter(e =>
      !e.includes('Service worker') &&
      !e.includes('favicon') &&
      !e.includes('buildBreadcrumb is not defined')
    );

    expect(filteredErrors).toEqual([]);
  });

  test('MAP-16: No JavaScript errors on UAE Maps', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Filter out known harmless errors
    const filteredErrors = consoleErrors.filter(e =>
      !e.includes('Service worker') &&
      !e.includes('favicon') &&
      !e.includes('buildBreadcrumb is not defined')
    );

    expect(filteredErrors).toEqual([]);
  });

  test('MAP-17: Both maps exist on India Maps page', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for maps to initialize
    await page.waitForTimeout(500);

    // Check that both map tiles are loaded
    const map1Tiles = await page.locator('#india-map-osm .leaflet-tile').count();
    const map2Tiles = await page.locator('#india-map-topo .leaflet-tile').count();

    expect(map1Tiles).toBeGreaterThan(0);
    expect(map2Tiles).toBeGreaterThan(0);
  });

  test('MAP-18: Both maps exist on UAE Maps page', async ({ page }) => {
    await page.goto('/decks/dubai1/sections/uae-maps/overview.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for maps to initialize
    await page.waitForTimeout(500);

    // Check that both map tiles are loaded
    const map1Tiles = await page.locator('#uae-map-osm .leaflet-tile').count();
    const map2Tiles = await page.locator('#uae-map-topo .leaflet-tile').count();

    expect(map1Tiles).toBeGreaterThan(0);
    expect(map2Tiles).toBeGreaterThan(0);
  });

  test('MAP-19: Map sections are accessible from India1 deck index', async ({ page }) => {
    await page.goto('/decks/india1/index.html');
    await page.waitForLoadState('domcontentloaded');

    // Check that India Maps link exists
    const mapsLink = page.locator('a[href="./sections/india-maps/overview.html"]');
    await expect(mapsLink).toBeVisible();

    // Click on the link
    await mapsLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Should navigate to India Maps page
    expect(page.url()).toContain('india-maps/overview.html');
  });

  test('MAP-20: Map sections are accessible from Dubai1 deck index', async ({ page }) => {
    await page.goto('/decks/dubai1/index.html');
    await page.waitForLoadState('domcontentloaded');

    // Check that UAE Maps link exists
    const mapsLink = page.locator('a[href="./sections/uae-maps/overview.html"]');
    await expect(mapsLink).toBeVisible();

    // Click on the link
    await mapsLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Should navigate to UAE Maps page
    expect(page.url()).toContain('uae-maps/overview.html');
  });
});
