const url = new URL('../dist/index.html', import.meta.url).href;
async function boot(page, context) {
  await page.clock.install({time:new Date('2026-09-09T12:00:00Z')});
  await context.setOffline(true);
  await page.goto(url);
  await expect(page.locator('#local-state')).toContainText('SQLite / WASM');
  await page.locator('#admin-menu > summary').click();
  await page.locator('#local-sample').click();
  await expect(page.locator('#count')).toHaveText('18');
  await page.locator('#admin-menu > summary').click();
  return async () => {};
}
import {test, expect} from '@playwright/test';

test('single-card verdicts preserve other marks, timestamp/filter/undo persist, and title copy stays independent', async ({page, context}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const close = await boot(page, context);
  // Clipboard is the only stub: verify the exact payload, without depending on OS permission prompts.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => { window.copiedTitle = text; }}, configurable: true}));
  const cards = page.locator('.bookmark-card:visible');
  const firstId = await cards.nth(0).getAttribute('data-item-id');
  const secondId = await cards.nth(1).getAttribute('data-item-id');
  const first = page.locator('[data-item-id="' + firstId + '"]');
  const second = page.locator('[data-item-id="' + secondId + '"]');
  const title = await first.locator('.title-text').innerText();
  await second.locator('.mark').click();
  await first.locator('.copy-title').click();
  expect(await page.evaluate(() => window.copiedTitle)).toBe(title);
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  for (const value of ['keeper', 'archive', 'needs-more-time']) {
    await first.locator('[data-card-verdict="' + value + '"]').click();
    await expect(first).toHaveAttribute('data-verdict', value);
    await expect(second).toHaveAttribute('data-verdict', '');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(first.locator('[data-card-verdict="' + value + '"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(id => window.__pileState.items.find(item => item.id === id)?.tags.filter(tag => tag.startsWith('updated_at')).length, firstId)).toBe(1);
  }
  // Space activates the individual button, rather than the grid's marking shortcut.
  await first.locator('[data-card-verdict="keeper"]').focus();
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('data-verdict', 'keeper');
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await second.locator('.mark').click();
  await page.locator('#selector > summary').click();
  await page.locator('#selection-expression').fill('updated_at:>2026-09');
  await page.locator('#open-selection').click();
  await expect(cards).toHaveCount(1);
  await page.locator('#tag-input').fill('reviewed');
  await page.locator('#tag-selection').click();
  await expect.poll(() => page.evaluate(() => window.__pileState.items[0]?.tags.includes('reviewed'))).toBe(true);
  await page.locator('#undo').click();
  await expect.poll(() => page.evaluate(() => window.__pileState.items[0]?.tags.includes('reviewed'))).toBe(false);
  await page.locator('#selection-expression').fill('updated_at:<2027 and verdict:keep');
  await page.locator('#open-selection').click();
  await expect(cards).toHaveCount(1);
  await first.locator('[data-card-verdict="archive"]').click();
  await expect(cards).toHaveCount(0);
  await page.locator('#undo').click();
  await expect(cards).toHaveCount(1);
  const collection = await page.locator('#collection-select').inputValue();
  await page.reload();
  await expect(page.locator('#collection-select option[value="' + collection + '"]')).toBeAttached();
  await page.locator('#collection-select').selectOption(collection);
  await expect(first).toHaveAttribute('data-verdict', 'keeper');
  const tags = await page.evaluate(id => window.__pileState.items.find(item => item.id === id).tags, firstId);
  expect(tags.filter(tag => tag.startsWith('updated_at'))).toHaveLength(1);
  expect(tags.find(tag => tag.startsWith('updated_at'))).toMatch(/^updated_at:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  for (const size of [{width:1800,height:1000}, {width:430,height:932}]) {
    await page.setViewportSize(size);
    await expect(first.locator('.copy-title')).toBeVisible();
    await expect.poll(() => first.evaluate(card => {
      const mark = card.querySelector('.mark').getBoundingClientRect();
      const buttons = [...card.querySelectorAll('.card-verdict')].map(button => button.getBoundingClientRect());
      const copy = card.querySelector('.copy-title').getBoundingClientRect();
      const heading = card.querySelector('h2').getBoundingClientRect();
      return {below: buttons.every(box => box.top > mark.bottom), squares: buttons.every(box => box.width === box.height && box.width < mark.width), copyFits: copy.right <= heading.right + 1 && copy.bottom <= heading.bottom + 1};
    })).toEqual({below:true,squares:true,copyFits:true});
  }
  expect(errors).toEqual([]);
  await close();
});
