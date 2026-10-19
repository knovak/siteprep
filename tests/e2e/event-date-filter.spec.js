const { test, expect } = require('@playwright/test');

const SYDNEY = '/decks/australia-october-2026/sections/sydney/overview.html';
const FILTER = '/shared/event_date_filter/event_date_filter';
const COLLAPSIBLE = '/shared/collapsible_topics/collapsible_topics';
const OCTOBER_16 = new Date('2026-10-16T01:00:00Z'); // Noon in Sydney; October 15 in Los Angeles.
const EVENT_PAGES = [
  ['/decks/australia-october-2026/sections/brisbane/overview.html', 1],
  ['/decks/australia-october-2026/sections/cairns/overview.html', 1],
  ['/decks/australia-october-2026/sections/stradbroke-island/overview.html', 1],
  ['/decks/australia-october-2026/sections/sunshine-coast/overview.html', 1],
  [SYDNEY, 1],
  ['/decks/rockies/sections/aspen/overview.html', 1],
  ['/decks/rockies/sections/boulder/overview.html', 1],
  ['/decks/rockies/sections/carbondale/overview.html', 1],
  ['/decks/rockies/sections/snowmass/overview.html', 1],
  ['/decks/eclipse-2027/sections/luxor-eclipse/overview.html', 1],
  ['/decks/british-columbia/sections/vancouver/overview.html', 2],
];

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

test.describe('Sydney keeps event choices when filtering dates', () => {
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
    expect(originalOrder.slice(0, 9)).toEqual([
      '{112}', '{584}', '{329}', '{697}', '{363}', '{513}', '{265}', '{135}', '{136}',
    ]);
    for (const rejectedId of [335, 552, 714, 571, 268, 877]) {
      expect(originalOrder).not.toContain(`{${rejectedId}}`);
    }
    await expect(items.locator(':scope > strong .item-id')).toHaveCount(originalOrder.length);
    await expect(page.locator(`#${listId} > li:not([data-event-dates])`)).toHaveCount(0);
    await expect(heading.getByRole('group', { name: 'Event dates' })).toBeVisible();
    await expect(mode(page, 'Today and future')).toHaveAttribute('aria-pressed', 'true');

    const past = items.filter({ hasText: '{476}' });
    const startingToday = items.filter({ hasText: '{584}' });
    const future = items.filter({ hasText: '{697}' });
    await expect(past).toBeHidden();
    await expect(startingToday).toBeVisible();
    await expect(future).toBeVisible();

    await mode(page, 'Today only').click();
    await expect(past).toBeHidden();
    await expect(startingToday).toBeVisible();
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

for (const [path, listCount] of EVENT_PAGES) {
  test(`all event lists have working date controls: ${path}`, async ({ page }) => {
    await page.clock.setFixedTime(OCTOBER_16);
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.goto(path);
    const headings = page.locator('[data-event-filter]');
    await expect(headings).toHaveCount(listCount);
    await expect(page.getByRole('group', { name: 'Event dates' })).toHaveCount(listCount);
    for (const heading of await headings.all()) {
      const listId = await heading.getAttribute('data-event-filter');
      const items = page.locator(`#${listId} > li`);
      const originalOrder = await items.allTextContents();
      expect(originalOrder.length).toBeGreaterThan(0);
      const group = heading.getByRole('group', { name: 'Event dates' });
      await expect(group).toBeVisible();
      await expect(group.getByRole('button', { name: 'Today and future', exact: true }))
        .toHaveAttribute('aria-pressed', 'true');
      await group.getByRole('button', { name: 'Today only', exact: true }).click();
      await expect(page.locator(`#${listId} > li:not([data-event-dates])[hidden]`)).toHaveCount(0);
      await group.getByRole('button', { name: 'All dates', exact: true }).click();
      await expect(page.locator(`#${listId} > li:visible`)).toHaveText(originalOrder);
      await expect(group.getByRole('button', { name: 'All dates', exact: true }))
        .toHaveAttribute('aria-pressed', 'true');
    }
  });
}

test('Current Rockies events use their December dates and inclusive range endings', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-23T01:00:00Z'));
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/decks/rockies/sections/snowmass/overview.html');
  const items = page.locator('#snowmass-events > li');
  const originalOrder = await items.allTextContents();
  const counterpoints = items.filter({ hasText: '{535}' });
  await expect(items.filter({ hasText: '{313}' })).toBeHidden();
  await expect(items.filter({ hasText: '{770}' })).toBeVisible();
  await expect(items.filter({ hasText: '{435}' })).toBeVisible();
  await expect(counterpoints).toBeVisible();
  await mode(page, 'Today only').click();
  await expect(items.filter({ hasText: '{313}' })).toBeHidden();
  await expect(items.filter({ hasText: '{770}' })).toBeVisible();
  await expect(items.filter({ hasText: '{435}' })).toBeVisible();
  await expect(counterpoints).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-12-24T01:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(items.filter({ hasText: '{770}' })).toBeHidden();
  await expect(items.filter({ hasText: '{435}' })).toBeHidden();
  await expect(counterpoints).toBeVisible();
  for (const [date, visible] of [
    ['2026-12-25', false], ['2026-12-26', false], ['2026-12-27', false],
    ['2026-12-28', true], ['2026-12-29', true], ['2026-12-30', false],
  ]) {
    await page.clock.setFixedTime(new Date(`${date}T01:00:00Z`));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    if (visible) await expect(counterpoints).toBeVisible();
    else await expect(counterpoints).toBeHidden();
  }
  await mode(page, 'All dates').click();
  await expect(page.locator('#snowmass-events > li:visible')).toHaveText(originalOrder);
});

test('Future Luxor filters its dated eclipse while keeping variable schedules visible', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-08-03T01:00:00Z'));
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/decks/eclipse-2027/sections/luxor-eclipse/overview.html');
  const items = page.locator('#luxor-events > li');
  const eclipse = items.filter({ hasText: '{536}' });
  const variableEvents = [items.filter({ hasText: '{279}' }), items.filter({ hasText: '{803}' })];
  await expect(eclipse).toBeHidden();
  for (const event of variableEvents) await expect(event).toBeVisible();
  await mode(page, 'Today only').click();
  await expect(eclipse).toBeHidden();
  for (const event of variableEvents) await expect(event).toBeVisible();
  await expect(page.locator('.event-date-filter-empty')).toBeHidden();
  await mode(page, 'All dates').click();
  await expect(eclipse).toBeVisible();
});

test('Option Vancouver filters its music schedule and Events lists independently', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-06T01:00:00Z'));
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/decks/british-columbia/sections/vancouver/overview.html');
  const liveGroup = page.locator('[data-event-filter="vancouver-viff-live-events"]')
    .getByRole('group', { name: 'Event dates' });
  const eventsGroup = page.locator('[data-event-filter="vancouver-events"]')
    .getByRole('group', { name: 'Event dates' });
  const liveItems = page.locator('#vancouver-viff-live-events > li');
  const events = page.locator('#vancouver-events > li');
  await expect(page.locator('#vancouver-viff-live-events > li:visible')).toHaveCount(3);
  await expect(page.locator('#vancouver-events > li:visible')).toHaveCount(2);
  await liveGroup.getByRole('button', { name: 'Today only', exact: true }).click();
  await expect(page.locator('#vancouver-viff-live-events > li:visible')).toHaveCount(1);
  await expect(liveItems.filter({ hasText: 'ERASERHEAD XIU XIU' })).toBeVisible();
  await expect(eventsGroup.getByRole('button', { name: 'Today and future', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#vancouver-events > li:visible')).toHaveCount(2);
  await eventsGroup.getByRole('button', { name: 'Today only', exact: true }).click();
  await expect(events.filter({ hasText: 'VIFF:' })).toBeVisible();
  await expect(events.filter({ hasText: 'Thanksgiving:' })).toBeHidden();
  await liveGroup.getByRole('button', { name: 'All dates', exact: true }).click();
  await expect(page.locator('#vancouver-viff-live-events > li:visible')).toHaveCount(7);
  await expect(events.filter({ hasText: 'Thanksgiving:' })).toBeHidden();
});

for (const path of [
  '/decks/aus2503/sections/sydney/overview.html',
  '/decks/australia-october-2026/sections/sydney/overview-reject.html',
  '/decks/australia-october-2026/sections/sunshine-coast/overview-reject.html',
]) {
  test(`Past and rejected pages keep their existing behavior: ${path}`, async ({ page }) => {
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
