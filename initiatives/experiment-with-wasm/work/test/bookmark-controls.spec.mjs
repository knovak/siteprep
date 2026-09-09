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

test('card choices are local, toggle instantly, and sweep saves mixed verdicts as one undoable action', async ({page, context}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const close = await boot(page, context);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {value:{writeText: async text => {window.copiedTitle = text;}}, configurable:true});
    window.verdictRequests = [];
    const name = window.bookmarkLocalRequest ? 'bookmarkLocalRequest' : 'fetch';
    const request = window[name];
    window[name] = async (path, options) => {
      if (path === '/api/verdict' && options?.method === 'POST') {
        window.verdictRequests.push(JSON.parse(options.body));
        if (window.failNextSweep) { window.failNextSweep = false; return new Response(JSON.stringify({error:'Try the sweep again'}), {status:503}); }
      }
      return request(path, options);
    };
  });
  const cards = page.locator('.bookmark-card:visible');
  const ids = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.itemId));
  const card = i => page.locator('[data-item-id="' + ids[i] + '"]');
  const choice = (i, value) => card(i).locator('[data-card-verdict="' + value + '"]');
  await card(1).locator('.mark').click();
  const title = await card(0).locator('.title-text').innerText();
  await card(0).locator('.copy-title').click();
  expect(await page.evaluate(() => window.copiedTitle)).toBe(title);
  for (const value of ['keeper','archive','needs-more-time']) {
    await choice(0, value).click();
    await expect(choice(0, value)).toHaveAttribute('aria-pressed','true');
    await expect(card(0)).toHaveAttribute('data-verdict','');
    await expect(card(1)).toHaveAttribute('aria-selected','true');
  }
  await choice(0,'needs-more-time').click();
  await expect(choice(0,'needs-more-time')).toHaveAttribute('aria-pressed','false');
  await choice(0,'keeper').focus();
  await page.keyboard.press('Space');
  await expect(choice(0,'keeper')).toHaveAttribute('aria-pressed','true');
  await expect(card(0)).toHaveAttribute('aria-selected','false');
  await choice(1,'archive').click();
  await choice(2,'needs-more-time').click();
  expect(await page.evaluate(() => window.verdictRequests.length)).toBe(0);
  expect(await page.evaluate(() => window.__pileState.items.some(item => item.tags.some(tag => tag.startsWith('updated_at'))))).toBe(false);
  await page.locator('#next-page').click();
  await expect(page.locator('#previous-page')).toBeEnabled();
  await page.locator('#previous-page').click();
  await expect(choice(0,'keeper')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(() => {window.failNextSweep = true;});
  await page.locator('#sweep-rest').click();
  await expect(page.locator('#status')).toHaveText('Try the sweep again');
  await expect(choice(0,'keeper')).toHaveAttribute('aria-pressed','true');
  await expect(card(0)).toHaveAttribute('data-verdict','');
  await page.locator('#sweep-rest').click();
  await expect(page.locator('#position')).toContainText('17–18');
  await page.locator('#previous-page').click();
  for (const [i, value] of ['keeper','archive','needs-more-time','junk'].entries()) {
    await expect(card(i)).toHaveAttribute('data-verdict',value);
  }
  await expect(card(0).locator('[aria-pressed="true"]')).toHaveCount(0);
  const requests = await page.evaluate(() => window.verdictRequests);
  expect(requests).toHaveLength(2); // failed request and one retry, with the same complete action
  expect(requests[1].item_ids).toHaveLength(16);
  expect(requests[1].item_verdicts).toEqual({[ids[0]]:'keeper',[ids[1]]:'archive',[ids[2]]:'needs-more-time'});
  expect(await page.evaluate(() => window.__pileState.items.slice(0,16).every(item => item.tags.filter(tag => tag.startsWith('updated_at')).length === 1))).toBe(true);
  await page.locator('#undo').click();
  await expect(card(0)).toHaveAttribute('data-verdict','');
  await expect(card(3)).toHaveAttribute('data-verdict','');
  expect(await page.evaluate(() => window.__pileState.items.some(item => item.tags.some(tag => tag.startsWith('updated_at'))))).toBe(false);
  expect(errors).toEqual([]);
  await close();
});

test('sweeping honors a new dropdown default, overrides an existing verdict, and persists the saved choices', async ({page, context}) => {
  const close = await boot(page, context);
  const first = page.locator('.bookmark-card:visible').first();
  const id = await first.getAttribute('data-item-id');
  const target = page.locator('[data-item-id="' + id + '"]');
  await page.locator('button[data-verdict="keeper"]').click();
  await expect(target).toHaveAttribute('data-verdict','keeper');
  await target.locator('[data-card-verdict="archive"]').click();
  await page.locator('#sweep-verdict').selectOption('needs-more-time');
  await page.locator('#sweep-rest').click();
  await expect(page.locator('#position')).toContainText('17–18');
  await page.locator('#previous-page').click();
  await expect(target).toHaveAttribute('data-verdict','archive');
  await expect(page.locator('.bookmark-card:visible').nth(1)).toHaveAttribute('data-verdict','needs-more-time');
  const collection = await page.locator('#collection-select').inputValue();
  await page.reload();
  await page.locator('#collection-select').selectOption(collection);
  await expect(target).toHaveAttribute('data-verdict','archive');
  await expect(target.locator('.card-verdict[aria-pressed="true"]')).toHaveCount(0);
  await target.locator('[data-card-verdict="keeper"]').click();
  for (const size of [{width:1800,height:1000},{width:1600,height:900},{width:430,height:932}]) {
    await page.setViewportSize(size);
    if (size.width > 1100) await page.locator('#page-layout').selectOption('3x12');
    await expect.poll(() => target.evaluate(card => {
      const mark = card.querySelector('.mark').getBoundingClientRect();
      const buttons = [...card.querySelectorAll('.card-verdict')].map(button => button.getBoundingClientRect());
      const copyButton = card.querySelector('.copy-title');
      const copy = copyButton.getBoundingClientRect();
      return {copyHit:copyButton.contains(document.elementFromPoint(copy.x+copy.width/2,copy.y+copy.height/2)),below:buttons.every(box=>box.top>mark.bottom),small:buttons.every(box=>box.width===20 && box.height===20)};
    })).toEqual({copyHit:true,below:true,small:true});
    await expect(target.locator('[data-card-verdict="keeper"]')).toHaveAttribute('aria-pressed','true');
  }
  await close();
});

test('pending choices survive filtered paging and both sweep scopes use them', async ({page, context}) => {
  const close = await boot(page, context);
  await page.locator('#selector > summary').click();
  await page.locator('#selection-expression').fill('verdict:untriaged');
  await page.locator('#open-selection').click();
  await page.locator('.bookmark-card:visible').first().locator('[data-card-verdict="keeper"]').click();
  await page.locator('#next-page').click();
  const last = page.locator('.bookmark-card:visible').last();
  const lastId = await last.getAttribute('data-item-id');
  await last.locator('[data-card-verdict="archive"]').click();
  await page.locator('#previous-page').click();
  await page.locator('#sweep-rest').click();
  await expect(page.locator('.bookmark-card:visible')).toHaveCount(2);
  await expect(page.locator('[data-item-id="'+lastId+'"] [data-card-verdict="archive"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#sweep-mode').selectOption('selection');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#sweep-rest').click();
  await expect(page.locator('.bookmark-card:visible')).toHaveCount(0);
  await page.locator('#undo').click();
  await expect(page.locator('.bookmark-card:visible')).toHaveCount(2);
  await expect(page.locator('.bookmark-card:visible [aria-pressed="true"]')).toHaveCount(0);
  await close();
});
