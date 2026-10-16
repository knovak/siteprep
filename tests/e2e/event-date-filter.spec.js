const { test, expect } = require('@playwright/test');

const SYDNEY = '/decks/australia-october-2026/sections/sydney/overview.html';
const FILTER = '/shared/event_date_filter/event_date_filter';
const COLLAPSIBLE = '/shared/collapsible_topics/collapsible_topics';
const OCTOBER_16 = new Date('2026-10-16T01:00:00Z'); // Noon in Sydney; October 15 in Los Angeles.

test.use({ timezoneId: 'Australia/Sydney' });

function mode(page, label) {
  return page.getByRole('group', { name: 'Event dates' }).getByRole('button', { name: label, exact: true });
}

async function fixture(page, baseURL, items, { filterFirst = false } = {}) {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>
    <main class="card-content"><h2 data-event-filter="events">Events</h2>
    <ul id="events">${items}</ul><h2>Other topic</h2><p>Unrelated content</p></main>
    </body></html>`);
  await page.addStyleTag({ url: new URL(`${COLLAPSIBLE}.css`, baseURL).href });
  await page.addStyleTag({ url: new URL(`${FILTER}.css`, baseURL).href });
  await page.addScriptTag({ url: new URL(`${COLLAPSIBLE}.js`, baseURL).href });
  if (!filterFirst) await page.evaluate(() => window.CollapsibleTopics.init());
  await page.addScriptTag({ url: new URL(`${FILTER}.js`, baseURL).href });
  if (filterFirst) await page.evaluate(() => window.CollapsibleTopics.init());
  await expect(mode(page, 'Today and future')).toHaveAttribute('aria-pressed', 'true');
}

async function visibleIds(page) {
  return page.locator('#events > li:visible').evaluateAll((items) => items.map((item) => item.id));
}

test.describe('Sydney adopts the optional event date filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(OCTOBER_16);
    // Event filtering is local; third-party maps must not delay these checks.
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.goto(SYDNEY);
  });

  test('defaults to current and future events and restores the original order with All dates', async ({ page }) => {
    const heading = page.locator('[data-event-filter]');
    const listId = await heading.getAttribute('data-event-filter');
    const items = page.locator(`#${listId} > li`);
    const originalOrder = await items.locator('.item-id').allTextContents();
    expect(originalOrder.length).toBeGreaterThan(0);
    await expect(items.locator(':scope > strong .item-id')).toHaveCount(originalOrder.length);
    await expect(page.locator(`#${listId} > li:not([data-event-dates])`)).toHaveCount(0);
    await expect(heading.getByRole('group', { name: 'Event dates' })).toBeVisible();
    await expect(mode(page, 'Today and future')).toHaveAttribute('aria-pressed', 'true');

    const past = items.filter({ hasText: '{476}' });
    const endingToday = items.filter({ hasText: '{335}' });
    const today = items.filter({ hasText: '{552}' });
    const future = items.filter({ hasText: '{697}' });
    await expect(past).toBeHidden();
    await expect(endingToday).toBeVisible();
    await expect(today).toBeVisible();
    await expect(future).toBeVisible();

    await mode(page, 'Today only').click();
    await expect(past).toBeHidden();
    await expect(endingToday).toBeVisible();
    await expect(today).toBeVisible();
    await expect(future).toBeHidden();
    await expect(mode(page, 'Today only')).toHaveAttribute('aria-pressed', 'true');
    await expect(mode(page, 'Today and future')).toHaveAttribute('aria-pressed', 'false');

    await mode(page, 'All dates').click();
    await expect(page.locator(`#${listId} > li:visible .item-id`)).toHaveText(originalOrder);
    await expect(page.locator('.event-date-filter-empty')).toBeHidden();
    await page.reload();
    await expect(mode(page, 'Today and future')).toHaveAttribute('aria-pressed', 'true');
    await expect(past).toBeHidden();
  });

  test('the selector stays beside the heading and scrolls within a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const heading = page.locator('[data-event-filter]');
    const group = page.getByRole('group', { name: 'Event dates' });
    await group.scrollIntoViewIfNeeded();
    const dimensions = await group.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const toggle = element.closest('h2').querySelector('.topic-toggle').getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        client: element.clientWidth,
        scroll: element.scrollWidth,
        left: box.left,
        right: box.right,
        sameLine: box.top < toggle.bottom && box.bottom > toggle.top,
      };
    });
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.left).toBeGreaterThanOrEqual(0);
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.sameLine).toBe(true);
    expect(dimensions.scroll).toBeGreaterThan(dimensions.client);
    await mode(page, 'All dates').click();
    await expect(mode(page, 'All dates')).toHaveAttribute('aria-pressed', 'true');
    await expect(heading.locator('.topic-toggle')).toHaveAttribute('aria-expanded', 'true');
  });
});

test('dates are inclusive, gaps remain gaps, and invalid or missing metadata stays visible', async ({ page, baseURL }) => {
  await page.clock.setFixedTime(OCTOBER_16);
  await fixture(page, baseURL, `
    <li id="past" data-event-dates="2026-10-14/2026-10-15">Past</li>
    <li id="ending" data-event-dates="2026-10-14/2026-10-16">Ends today</li>
    <li id="starting" data-event-dates="2026-10-16/2026-10-18">Starts today</li>
    <li id="today" data-event-dates="2026-10-16">Today</li>
    <li id="gap" data-event-dates="2026-10-14/2026-10-15,2026-10-17/2026-10-18">No show today</li>
    <li id="separate" data-event-dates="2026-10-14,2026-10-16">Separate performances</li>
    <li id="future" data-event-dates="2026-10-17">Future</li>
    <li id="missing">Dates to be confirmed</li>
    <li id="impossible" data-event-dates="2026-02-30">Invalid calendar date</li>
    <li id="reversed" data-event-dates="2026-10-18/2026-10-14">Invalid range</li>
    <li id="partial" data-event-dates="2026-10-14,unknown">Partly invalid metadata</li>`);
  await expect.poll(() => visibleIds(page)).toEqual([
    'ending', 'starting', 'today', 'gap', 'separate', 'future', 'missing', 'impossible', 'reversed', 'partial',
  ]);
  await mode(page, 'Today only').click();
  await expect.poll(() => visibleIds(page)).toEqual([
    'ending', 'starting', 'today', 'separate', 'missing', 'impossible', 'reversed', 'partial',
  ]);
  await mode(page, 'All dates').click();
  await expect(page.locator('#events > li:visible')).toHaveCount(11);
});

for (const [timezoneId, expectedDay] of [['Australia/Sydney', '16'], ['America/Los_Angeles', '15']]) {
  test(`today follows the browser calendar in ${timezoneId}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ timezoneId, baseURL });
    try {
      const page = await context.newPage();
      await page.clock.setFixedTime(OCTOBER_16);
      await fixture(page, baseURL, `
        <li id="day15" data-event-dates="2026-10-15">October 15</li>
        <li id="day16" data-event-dates="2026-10-16">October 16</li>`);
      await mode(page, 'Today only').click();
      await expect.poll(() => visibleIds(page)).toEqual([`day${expectedDay}`]);
    } finally {
      await context.close();
    }
  });
}

test('refreshes the active mode at local midnight while the page stays open', async ({ page, baseURL }) => {
  await page.clock.install({ time: new Date('2026-10-16T12:55:00Z') });
  await fixture(page, baseURL, `
    <li id="today" data-event-dates="2026-10-16">October 16</li>
    <li id="tomorrow" data-event-dates="2026-10-17">October 17</li>`);
  await mode(page, 'Today only').click();
  await page.clock.pauseAt(new Date('2026-10-16T12:59:59Z'));
  await expect.poll(() => visibleIds(page)).toEqual(['today']);
  await page.clock.runFor(2000);
  await expect.poll(() => visibleIds(page)).toEqual(['tomorrow']);
  await expect(mode(page, 'Today only')).toHaveAttribute('aria-pressed', 'true');
});

test('refreshes after focus, visibility changes, and restoration from page history', async ({ page, baseURL }) => {
  await page.clock.setFixedTime(OCTOBER_16);
  await fixture(page, baseURL, [16, 17, 18, 19].map((day) =>
    `<li id="day${day}" data-event-dates="2026-10-${day}">October ${day}</li>`).join(''));
  await mode(page, 'Today only').click();
  for (const [index, eventName] of ['focus', 'visibilitychange', 'pageshow'].entries()) {
    const day = 17 + index;
    await page.clock.setFixedTime(new Date(`2026-10-${day}T01:00:00Z`));
    await page.evaluate((name) => {
      if (name === 'visibilitychange') document.dispatchEvent(new Event(name));
      else if (name === 'pageshow') window.dispatchEvent(new PageTransitionEvent(name, { persisted: true }));
      else window.dispatchEvent(new Event(name));
    }, eventName);
    await expect.poll(() => visibleIds(page)).toEqual([`day${day}`]);
  }
});

for (const filterFirst of [false, true]) {
  test(`filter controls and topic collapse stay independent when ${filterFirst ? 'the filter' : 'CollapsibleTopics'} initializes first`, async ({ page, baseURL }) => {
    await page.clock.setFixedTime(OCTOBER_16);
    await fixture(page, baseURL, `
      <li id="today" data-event-dates="2026-10-16">Today</li>
      <li id="future" data-event-dates="2026-10-17">Future</li>`, { filterFirst });
    const heading = page.locator('[data-event-filter]');
    const toggle = heading.locator('.topic-toggle');
    const group = page.getByRole('group', { name: 'Event dates' });
    await expect(toggle).toHaveAttribute('aria-label', 'Collapse Events');

    await mode(page, 'Today and future').focus();
    await page.keyboard.press('Tab');
    await expect(mode(page, 'Today only')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(mode(page, 'Today only')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#future')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(mode(page, 'All dates')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#future')).toBeVisible();
    await group.dispatchEvent('click'); // Clicking the selector's padding must not collapse the topic.
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.press('Space');
    await expect(page.locator('#events')).toBeHidden();
    await expect(group).toBeVisible();
    await mode(page, 'Today only').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.press('Enter');
    await expect(page.locator('#today')).toBeVisible();
    await expect(page.locator('#future')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-label', 'Collapse Events');

    await page.evaluate(() => window.EventDateFilter.init());
    await expect(heading.locator('.event-date-filter')).toHaveCount(1);
    await expect(page.locator('.event-date-filter-empty')).toHaveCount(1);
  });
}

test('empty states explain the active filter and collapse with the event list', async ({ page, baseURL }) => {
  await page.clock.setFixedTime(OCTOBER_16);
  await fixture(page, baseURL, '<li id="past" data-event-dates="2026-10-15">Past event</li>');
  const message = page.locator('.event-date-filter-empty');
  const toggle = page.locator('[data-event-filter] .topic-toggle');
  await expect(message).toHaveText('No events today or in the future.');
  await expect(message).toBeVisible();
  await expect(page.locator('.topic-body .event-date-filter-empty')).toHaveCount(1);
  await mode(page, 'Today only').click();
  await expect(message).toHaveText('No events today.');
  await toggle.click();
  await expect(message).toBeHidden();
  await toggle.click();
  await expect(message).toBeVisible();
  await mode(page, 'All dates').click();
  await expect(message).toBeHidden();
  await expect(page.locator('#past')).toBeVisible();
});

for (const path of [
  '/decks/australia-october-2026/sections/brisbane/overview.html',
  '/decks/aus2503/sections/sydney/overview.html',
]) {
  test(`pages without adoption keep their existing behavior: ${path}`, async ({ page }) => {
    await page.clock.setFixedTime(OCTOBER_16);
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.goto(path);
    await expect(page.locator('.topic-toggle').first()).toBeVisible();
    await expect(page.locator('.event-date-filter')).toHaveCount(0);
    await expect(page.locator('li[hidden]')).toHaveCount(0);
  });
}

test('Sydney still shows all source events when JavaScript is unavailable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.goto(SYDNEY);
    const listId = await page.locator('[data-event-filter]').getAttribute('data-event-filter');
    const items = page.locator(`#${listId} > li`);
    expect(await items.count()).toBeGreaterThan(0);
    await expect(items.filter({ hasText: '{476}' })).toBeVisible();
    await expect(page.locator(`#${listId} > li[hidden]`)).toHaveCount(0);
    await expect(page.locator('.event-date-filter')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
