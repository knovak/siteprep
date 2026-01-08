const { expect } = require('@playwright/test');

/**
 * Build the site before running tests
 * Should be called in global setup or before test suite
 */
async function buildSite() {
  const { execSync } = require('child_process');
  execSync('bash scripts/build.sh', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
}

/**
 * Wait for service worker to be activated
 */
async function waitForServiceWorker(page) {
  return await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      throw new Error('Service Worker not active');
    }

    return registration.active.state;
  });
}

/**
 * Get cache names from the browser
 */
async function getCacheNames(page) {
  return await page.evaluate(async () => {
    return await caches.keys();
  });
}

/**
 * Check if a URL is cached
 */
async function isCached(page, url) {
  return await page.evaluate(async (url) => {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const response = await cache.match(url);
      if (response) return true;
    }
    return false;
  }, url);
}

/**
 * Navigate through the site structure
 */
async function navigateToCard(page, deckName, sectionName) {
  // From root to deck TOC
  await page.goto('/');
  await page.click(`a[href*="decks/${deckName}"]`);
  await page.waitForLoadState('networkidle');

  // From deck TOC to card
  const cardLink = page.locator(`a[href*="${sectionName}"]`).first();
  await cardLink.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Check for broken links on a page
 */
async function checkForBrokenLinks(page) {
  const links = await page.locator('a[href]').all();
  const brokenLinks = [];
  const currentUrl = new URL(page.url());

  for (const link of links) {
    const href = await link.getAttribute('href');

    // Skip external links and fragments
    if (!href || href.startsWith('#')) {
      continue;
    }

    // Skip external links
    if (href.startsWith('http://') || href.startsWith('https://')) {
      continue;
    }

    // Resolve relative URLs based on current page URL
    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, currentUrl.href);
    } catch (e) {
      brokenLinks.push(href);
      continue;
    }

    // Check internal links (only check same-origin links)
    if (absoluteUrl.origin === currentUrl.origin) {
      const response = await page.context().request.get(absoluteUrl.href, { failOnStatusCode: false });
      if (response.status() === 404) {
        brokenLinks.push(href);
      }
    }
  }

  return brokenLinks;
}

/**
 * Check if element is visible in viewport
 */
async function isInViewport(page, selector) {
  return await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, selector);
}

module.exports = {
  buildSite,
  waitForServiceWorker,
  getCacheNames,
  isCached,
  navigateToCard,
  checkForBrokenLinks,
  isInViewport,
};
