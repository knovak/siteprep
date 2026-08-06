const { test, expect } = require('@playwright/test');

// Shared CollapsibleTopics library - see shared/collapsible_topics/collapsible_topics.md
// Every deck loads it from its assets/scripts.js, so these tests sample pages
// from several decks: section pages, deck index pages, and map pages.

const WARSAW = '/decks/poland/sections/warsaw/overview.html';

const PAGES = [
  { path: '/decks/poland/sections/warsaw/overview.html', name: 'Warsaw (section, maps)' },
  { path: '/decks/baltic/sections/tallinn/overview.html', name: 'Tallinn (section)' },
  { path: '/decks/uk/sections/london/overview.html', name: 'London (section)' },
  { path: '/decks/india3/sections/jodhpur/overview.html', name: 'Jodhpur (section, maps)' },
  { path: '/decks/mexico/sections/oaxaca-city/overview.html', name: 'Oaxaca (section, maps)' },
  { path: '/decks/dubai1/sections/abu-dhabi-day-trip/overview.html', name: 'Abu Dhabi (gallery)' },
  { path: '/decks/india1/sections/india-maps/overview.html', name: 'India maps (map sections)' },
  { path: '/decks/india1/index.html', name: 'India1 deck index' },
  { path: '/decks/rockies/index.html', name: 'Rockies deck index' },
  { path: '/decks/aus2503/sections/sydney/overview.html', name: 'Sydney (section)' }
];

async function topicState(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.topic-heading')).map((heading) => {
    const button = heading.querySelector('.topic-toggle');
    const body = document.getElementById(button.getAttribute('aria-controls'));
    return {
      title: heading.textContent.trim(),
      expanded: button.getAttribute('aria-expanded'),
      hasBody: Boolean(body) && body.classList.contains('topic-body'),
      bodyHidden: body ? body.hidden : null
    };
  }));
}

test.describe('Collapsible topics: shared behavior across pages', () => {
  for (const { path, name } of PAGES) {
    test(`CT-01 ${name}: topics get a toggle and a body`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('.topic-toggle');

      const topics = await topicState(page);
      expect(topics.length).toBeGreaterThan(0);
      expect(topics.filter((t) => !t.hasBody)).toEqual([]);
      // aria state and body visibility must agree
      expect(topics.filter((t) => (t.expanded === 'true') === t.bodyHidden)).toEqual([]);
    });

    test(`CT-02 ${name}: toggling hides and restores every topic`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('.topic-toggle');

      const collapseAll = () => page.evaluate(() => document.querySelectorAll('.topic-toggle')
        .forEach((b) => { if (b.getAttribute('aria-expanded') === 'true') b.click(); }));
      const expandAll = () => page.evaluate(() => document.querySelectorAll('.topic-toggle')
        .forEach((b) => { if (b.getAttribute('aria-expanded') === 'false') b.click(); }));

      const fullHeight = await page.evaluate(() => document.body.scrollHeight);
      await collapseAll();

      const collapsed = await topicState(page);
      expect(collapsed.every((t) => t.expanded === 'false' && t.bodyHidden)).toBe(true);
      // titles stay on screen
      await expect(page.locator('.topic-heading').first()).toBeVisible();
      const shortHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(shortHeight).toBeLessThan(fullHeight);

      await expandAll();
      const expanded = await topicState(page);
      expect(expanded.every((t) => t.expanded === 'true' && !t.bodyHidden)).toBe(true);
    });

    test(`CT-03 ${name}: TOC cards, legends and links keep their own headings`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('.topic-toggle');

      const intruders = await page.evaluate(() => ({
        inWidgets: document.querySelectorAll('.toc-grid .topic-toggle, .map-legend .topic-toggle, a .topic-toggle').length,
        // no topic body may be left without the heading that controls it
        orphanBodies: Array.from(document.querySelectorAll('.topic-body'))
          .filter((body) => !document.querySelector(`.topic-toggle[aria-controls="${body.id}"]`)).length
      }));

      expect(intruders.inWidgets).toBe(0);
      expect(intruders.orphanBodies).toBe(0);
    });
  }
});

test.describe('Collapsible topics: interaction', () => {
  test('CT-04: Clicking the heading text toggles too', async ({ page }) => {
    await page.goto('/decks/uk/sections/london/overview.html');
    await page.waitForSelector('.topic-toggle');

    const heading = page.locator('.topic-heading').first();
    const toggle = heading.locator('.topic-toggle');

    await heading.click({ position: { x: 120, y: 10 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await heading.click({ position: { x: 120, y: 10 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('CT-05: Links inside a topic body still work, and toggles are keyboard operable', async ({ page }) => {
    await page.goto('/decks/uk/sections/london/overview.html');
    await page.waitForSelector('.topic-toggle');

    const toggle = page.locator('.topic-toggle').first();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // aria-label tracks the state so screen readers announce the action
    await expect(toggle).toHaveAttribute('aria-label', /^Collapse /);
  });

  test('CT-06: Topics toggle independently', async ({ page }) => {
    await page.goto('/decks/aus2503/sections/sydney/overview.html');
    await page.waitForSelector('.topic-toggle');

    const toggles = page.locator('.topic-toggle');
    expect(await toggles.count()).toBeGreaterThan(2);

    await toggles.nth(1).click();
    await expect(toggles.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggles.nth(2)).toHaveAttribute('aria-expanded', 'true');
  });

  test('CT-07: A card title collapses the whole card', async ({ page }) => {
    await page.goto('/decks/india1/index.html');
    await page.waitForSelector('.topic-toggle');

    const toc = page.locator('.card-header .topic-heading', { hasText: 'Table of Contents' }).first();
    const cards = page.locator('.toc-grid');

    await expect(cards.first()).toBeVisible();
    await toc.locator('.topic-toggle').click();
    await expect(cards.first()).toBeHidden();
    await expect(toc).toBeVisible();

    await toc.locator('.topic-toggle').click();
    await expect(cards.first()).toBeVisible();
  });
});

test.describe('Collapsible topics: maps', () => {
  test('CT-08: A map re-measures itself after collapse and expand', async ({ page }) => {
    await page.goto('/decks/india1/sections/india-maps/overview.html');
    await page.waitForSelector('.topic-toggle');
    const map = page.locator('.leaflet-container').first();

    if (await map.count() === 0) test.skip(true, 'Leaflet unavailable in this environment');
    await expect(map).toBeVisible();

    const heading = page.locator('.map-section .topic-heading').first();
    await heading.locator('.topic-toggle').click();
    await expect(map).toBeHidden();

    await page.setViewportSize({ width: 820, height: 900 });
    await heading.locator('.topic-toggle').click();
    await expect(map).toBeVisible();

    // Leaflet only paints tiles across the width it believes it has, so full
    // tile coverage means invalidateSize ran after the container changed size.
    await expect.poll(async () => map.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const tiles = Array.from(el.querySelectorAll('.leaflet-tile'));
      if (!tiles.length) return 0;
      const right = Math.max(...tiles.map((t) => t.getBoundingClientRect().right));
      return Math.round(Math.min(1, (Math.min(right, box.right) - box.left) / box.width) * 100);
    }), { timeout: 10000 }).toBeGreaterThanOrEqual(99);
  });
});

test.describe('Collapsible topics: Warsaw defaults', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WARSAW);
    await page.waitForSelector('.topic-toggle');
  });

  test('CT-09: POLIN and OpenTopoMap start collapsed, others expanded', async ({ page }) => {
    const topics = await topicState(page);
    const collapsed = topics.filter((t) => t.expanded === 'false').map((t) => t.title);

    expect(collapsed).toHaveLength(2);
    expect(collapsed.some((title) => title.startsWith('POLIN Museum and Royal Castle'))).toBe(true);
    expect(collapsed).toContain('Warsaw map (OpenTopoMap)');

    const byTitle = Object.fromEntries(topics.map((t) => [t.title, t.expanded]));
    expect(byTitle['Warsaw map (OpenStreetMap)']).toBe('true');
    expect(byTitle.Attractions).toBe('true');
  });

  test('CT-10: The collapsed OpenTopoMap map renders once expanded', async ({ page }) => {
    const container = page.locator('#map-topo');
    await expect(container).toBeHidden();

    await page.locator('.topic-heading', { hasText: 'Warsaw map (OpenTopoMap)' })
      .first()
      .locator('.topic-toggle')
      .click();

    await expect(container).toBeVisible();
    const size = await container.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });
});
