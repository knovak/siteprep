const { test, expect } = require('@playwright/test');

const WARSAW = '/decks/poland/sections/warsaw/overview.html';

// Experiment: collapsible topics on the Poland deck's Warsaw page.
// See shared/poland-warsaw-collapsible-topics-techdoc.md
test.describe('Collapsible topics (Warsaw experiment)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WARSAW);
    await page.waitForSelector('.topic-toggle');
  });

  test('CT-01: Every topic heading gets a toggle and a body', async ({ page }) => {
    const headings = page.locator('.card-content .topic-heading');
    expect(await headings.count()).toBeGreaterThan(5);

    const orphans = await page.evaluate(() => Array.from(document.querySelectorAll('.topic-heading'))
      .filter((h) => !h.querySelector('.topic-toggle')
        || !h.nextElementSibling
        || !h.nextElementSibling.classList.contains('topic-body'))
      .map((h) => h.textContent.trim()));
    expect(orphans).toEqual([]);
  });

  test('CT-02: POLIN and OpenTopoMap start collapsed, others expanded', async ({ page }) => {
    const states = await page.evaluate(() => Object.fromEntries(
      Array.from(document.querySelectorAll('.topic-heading')).map((h) => [
        h.textContent.trim(),
        h.querySelector('.topic-toggle').getAttribute('aria-expanded')
      ])
    ));

    const collapsed = Object.entries(states)
      .filter(([, expanded]) => expanded === 'false')
      .map(([title]) => title);

    expect(collapsed).toHaveLength(2);
    expect(collapsed.some((title) => title.startsWith('POLIN Museum and Royal Castle'))).toBe(true);
    expect(collapsed).toContain('Warsaw map (OpenTopoMap)');
    expect(states['Warsaw map (OpenStreetMap)']).toBe('true');
    expect(states.Attractions).toBe('true');
  });

  test('CT-03: Collapsed body is hidden, expanded body is visible', async ({ page }) => {
    const attractions = page.locator('.topic-heading', { hasText: 'Attractions' }).first();
    const body = attractions.locator('xpath=following-sibling::div[1]');

    await expect(body).toBeVisible();
    await attractions.locator('.topic-toggle').click();
    await expect(body).toBeHidden();
    await expect(attractions).toContainText('Attractions');
  });

  test('CT-04: Clicking the heading text toggles too', async ({ page }) => {
    const events = page.locator('.topic-heading', { hasText: 'Events' }).first();
    const toggle = events.locator('.topic-toggle');
    const body = events.locator('xpath=following-sibling::div[1]');

    await events.click({ position: { x: 100, y: 10 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toBeHidden();

    await events.click({ position: { x: 100, y: 10 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();
  });

  test('CT-05: Toggles are keyboard operable', async ({ page }) => {
    const toggle = page.locator('.topic-heading', { hasText: 'Milk Bars' }).first().locator('.topic-toggle');

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('CT-06: Expanding the OpenTopoMap topic gives its map a real size', async ({ page }) => {
    const topoContainer = page.locator('#map-topo');
    await expect(topoContainer).toBeHidden();

    await page.locator('.topic-heading', { hasText: 'Warsaw map (OpenTopoMap)' })
      .first()
      .locator('.topic-toggle')
      .click();

    await expect(topoContainer).toBeVisible();
    const size = await topoContainer.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });

  test('CT-07: Topics toggle independently', async ({ page }) => {
    const palaces = page.locator('.topic-heading', { hasText: 'Palaces' }).first();
    const museums = page.locator('.topic-heading', { hasText: 'Museums' }).first();

    await palaces.locator('.topic-toggle').click();
    await expect(palaces.locator('.topic-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(museums.locator('.topic-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(museums.locator('xpath=following-sibling::div[1]')).toBeVisible();
  });
});
