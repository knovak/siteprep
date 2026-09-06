import {expect, test} from '@playwright/test';

import {renderPilePage} from '../src/pile-page.mjs';

function sampleItems(count = 10_000) {
  return Array.from({length: count}, (_, index) => ({
    id: `item-${index + 1}`,
    url: `https://example${index % 37}.com/read/${index + 1}`,
    title: `Bookmark ${index + 1}: a useful article with enough title context`,
    note: index % 3 ? null : 'A short saved note that remains readable in the blind review grid.',
    tags: [`folder:Reading/topic-${index % 12}`, 'src:browser-export'],
    verdict: null,
    verdict_at: null,
    capture: index % 3 ? {state: 'pass1-gap', image_ref: null} : {state: 'pass1-ready', image_ref: `capture-${index}`},
    capture_url: index % 3 ? null : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XIVz0gAAAABJRU5ErkJggg==',
  }));
}

async function installPile(page) {
  const backend = {
    items: sampleItems(),
    collection: {id: 'pile', name: 'My bookmarks', kind: 'personal'},
    collections: [],
    session: null,
    actions: [],
    requests: [],
    proposalRevision: 0,
    importRequests: [],
    importOutcomes: [],
    importBarrier: null,
    selectionDelays: new Map(),
    history: [],
    savedSelections: [{id: 'saved-reading', name: 'Reading queue', expression: 'folder:Reading/*', count: 834}],
    authorizedUsers: [
      {email: 'julie.duffield@gmail.com', type: 'user'},
      {email: 'krnovak@gmail.com', type: 'admin'},
    ],
    templates: [{id: 'starter', name: 'Starter pile', kind: 'demo-template', item_count: 12}],
  };
  backend.collections.push(backend.collection);
  await page.route('https://pile.test/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const requestCollectionId = request.headers()['x-bookmark-collection-id'] || '';
    backend.requests.push({method: request.method(), path: url.pathname, collectionId: requestCollectionId});
    if (request.method() === 'GET' && url.pathname === '/') {
      return route.fulfill({contentType: 'text/html', body: renderPilePage({isAdmin: true})});
    }
    if (request.method() === 'GET' && url.pathname === '/api/collections') {
      return route.fulfill({json: {
        active_collection_id: 'pile', can_edit_templates: false,
        collections: backend.collections.map(collection => ({
          ...collection, item_count: collection.id === 'pile' ? backend.items.length : 0,
        })),
        templates: backend.templates,
      }});
    }
    if (request.method() === 'GET' && (url.pathname === '/api/items' || url.pathname === '/api/selection')) {
      const collectionId = request.headers()['x-bookmark-collection-id'] || 'pile';
      const selectionDelay = backend.selectionDelays.get(collectionId) || 0;
      if (selectionDelay) await new Promise(resolve => setTimeout(resolve, selectionDelay));
      const collectionItems = collectionId === 'pile' ? backend.items : [];
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 200);
      const backlog = collectionItems.filter(item => !item.verdict).length;
      return route.fulfill({json: {collection_id: collectionId, collection_total: collectionItems.length, collection_backlog: backlog, total: collectionItems.length, backlog, captures: {total: collectionItems.length, metadata_images: collectionId === 'pile' ? 3334 : 0, screenshot_images: 0, gaps: collectionId === 'pile' ? 6666 : 0, queued: collectionId === 'pile' ? 6666 : 0, duplicate_distribution: collectionId === 'pile' ? [12, 7, 4] : []}, items: collectionItems.slice(offset, offset + limit)}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/selections') {
      return route.fulfill({json: {selections: backend.savedSelections}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/selection-history') {
      return route.fulfill({json: {selections: backend.history}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/authorized-users') {
      return route.fulfill({json: {users: backend.authorizedUsers}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/proposals') {
      const source = requestCollectionId === 'other' ? 'other-source' : 'browser-export';
      return route.fulfill({json: {proposals: [
        {id: `src:${source}`, kind: 'src', name: source, expression: `src:${source}`, count: backend.proposalRevision + 1},
        {id: 'tag:topic:later', kind: 'tag', name: 'topic:later', expression: 'topic:later', count: 2},
        {id: 'folder:reading-topic-0', kind: 'folder', name: 'reading-topic-0', expression: 'folder:reading-topic-0', count: 834},
        {id: 'site:example0.com', kind: 'site', name: 'example0.com', expression: 'site:example0.com', count: 271},
        {id: 'image:none', kind: 'image', name: 'none', expression: 'image:none', count: 6666},
        {id: 'verdict:archive', kind: 'verdict', name: 'archive', expression: 'verdict:archive', count: 0},
        {id: 'verdict:junk', kind: 'verdict', name: 'junk', expression: 'verdict:junk', count: 0},
        {id: 'verdict:keep', kind: 'verdict', name: 'keep', expression: 'verdict:keep', count: 0},
        {id: 'verdict:needs-time', kind: 'verdict', name: 'needs-time', expression: 'verdict:needs-time', count: 0},
        {id: 'verdict:not-junk', kind: 'verdict', name: 'not junk', expression: 'not verdict:junk', count: 10_000},
        {id: 'verdict:untriaged', kind: 'verdict', name: 'untriaged', expression: 'verdict:untriaged', count: 10_000},
        {id: 'verdict:untriaged-or-needs-time', kind: 'verdict', name: 'untriaged or needs-time', expression: 'verdict:untriaged or verdict:needs-time', count: 10_000},
        {id: 'error:any', kind: 'error', name: 'any error', expression: 'err:*', count: 3},
        {id: 'error:err:404', kind: 'error', name: 'err:404', expression: 'tag-key:err%3A404', count: 2},
        {id: 'error:err:timeout', kind: 'error', name: 'err:timeout', expression: 'tag-key:err%3Atimeout', count: 1},
      ]}});
    }
    if (request.method() === 'GET' && url.pathname === '/api/session') {
      return route.fulfill({json: {
        collection_id: requestCollectionId || 'pile',
        session: backend.session,
        actions: backend.actions.map((changes, index) => ({
          id: `action-${index + 1}`, action_kind: 'verdict',
          payload: {changes, verdict: backend.items.find(item => item.id === changes[0]?.item_id)?.verdict || 'keeper'},
          created_at: new Date(Date.now() - (backend.actions.length - index) * 1000).toISOString(), undone_at: null,
        })),
      }});
    }
    if (request.method() === 'POST' && url.pathname === '/api/import') {
      const form = await new Response(request.postDataBuffer(), {headers: {'content-type': request.headers()['content-type']}}).formData();
      backend.importRequests.push({
        files: await Promise.all(form.getAll('file').map(async file => ({name: file.name, text: await file.text()}))),
        source: form.get('source'), collectionId: requestCollectionId,
      });
      const outcome = backend.importOutcomes.shift();
      if (backend.importBarrier) await backend.importBarrier();
      backend.proposalRevision += 1;
      return route.fulfill(outcome || {status: 201, json: {parsed: 1, added: 1, merged: 0, total: 1}});
    }
    const body = request.postDataJSON();
    if (request.method() === 'POST' && url.pathname === '/api/collections' && body.action === 'rename') {
      backend.collection = {...backend.collection, name: body.name.trim()};
      backend.collections[0] = backend.collection;
      return route.fulfill({json: {collection: {...backend.collection, item_count: backend.items.length}}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/collections' && body.action === 'create') {
      const collection = {id: 'collection-new', name: body.name.trim(), kind: 'private'};
      backend.collections.push(collection);
      return route.fulfill({status: 201, json: {collection: {...collection, item_count: 0}}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/collections' && body.action === 'create-template') {
      const collection = {id: 'template-new', name: body.name.trim(), kind: 'demo-template'};
      backend.collections.push(collection);
      backend.templates.push({...collection, item_count: 0});
      return route.fulfill({json: {collection: {...collection, item_count: 0}}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/collections' && body.action === 'erase') {
      const erasedItems = backend.items.length;
      backend.items = [];
      return route.fulfill({json: {collection: backend.collection, erased_items: erasedItems}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/selection-history') {
      backend.history = backend.history.filter(row => row.expression !== body.expression);
      backend.history.unshift({expression: body.expression, used_at: new Date().toISOString()});
      return route.fulfill({status: 201, json: backend.history[0]});
    }
    if (request.method() === 'POST' && url.pathname === '/api/authorized-users') {
      const email = body.email.trim().toLowerCase();
      if (body.action === 'add') {
        backend.authorizedUsers = backend.authorizedUsers.filter(user => user.email !== email);
        const user = {email, type: body.type};
        backend.authorizedUsers.push(user);
        backend.authorizedUsers.sort((left, right) => left.email.localeCompare(right.email));
        return route.fulfill({status: 201, json: {user}});
      }
      backend.authorizedUsers = backend.authorizedUsers.filter(user => user.email !== email);
      return route.fulfill({json: {user: {email}}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/selection/verdict') {
      const matches = backend.items;
      if (!body.confirmed) return route.fulfill({status: 409, json: {confirmation_required: true, count: matches.length}});
      const changes = [];
      for (const item of matches) {
        if (item.verdict === body.verdict) continue;
        changes.push({item_id: item.id, verdict: body.verdict, verdict_at: new Date().toISOString()});
        Object.assign(item, {verdict: body.verdict, verdict_at: new Date().toISOString()});
      }
      backend.actions.push(changes);
      backend.session.items_judged += changes.length;
      return route.fulfill({json: {
        changes,
        backlog: backend.items.filter(item => !item.verdict).length,
        session: backend.session,
      }});
    }
    if (request.method() === 'POST' && url.pathname === '/api/session') {
      if (body.action === 'start') {
        if (backend.session && !backend.session.ended_at) return route.fulfill({json: backend.session});
        backend.session = {
          id: 'session-1', collection_id: 'pile', started_at: new Date(Date.now() - 60_000).toISOString(),
          ended_at: null, items_judged: 0, elapsed_ms: null,
        };
        return route.fulfill({status: 201, json: backend.session});
      }
      backend.session = {...backend.session, ended_at: new Date().toISOString(), elapsed_ms: 60_000};
      return route.fulfill({json: backend.session});
    }
    if (request.method() === 'POST' && url.pathname === '/api/verdict') {
      const changes = [];
      for (const id of body.item_ids) {
        const item = backend.items.find(candidate => candidate.id === id);
        if (item && item.verdict !== body.verdict) {
          changes.push({item_id: id, verdict: item.verdict, verdict_at: item.verdict_at});
          Object.assign(item, {verdict: body.verdict, verdict_at: new Date().toISOString()});
        }
      }
      backend.actions.push(changes);
      backend.session.items_judged += changes.length;
      return route.fulfill({json: {
        changes: changes.map(change => ({item_id: change.item_id, verdict: body.verdict, verdict_at: new Date().toISOString()})),
        backlog: backend.items.filter(item => !item.verdict).length,
        session: backend.session,
      }});
    }
    if (request.method() === 'POST' && url.pathname === '/api/tag') {
      const mode = body.mode === 'remove' ? 'remove' : 'apply';
      const itemIds = Array.isArray(body.item_ids) && body.item_ids.length
        ? body.item_ids
        : backend.items.map(item => item.id);
      const requestedTags = [...new Set(body.tags || [])];
      const changes = [];
      for (const itemId of itemIds) {
        const item = backend.items.find(candidate => candidate.id === itemId);
        if (!item) continue;
        const changedTags = requestedTags.filter(tag => mode === 'remove' ? item.tags.includes(tag) : !item.tags.includes(tag));
        if (!changedTags.length) continue;
        item.tags = mode === 'remove'
          ? item.tags.filter(tag => !changedTags.includes(tag))
          : [...item.tags, ...changedTags];
        changes.push(mode === 'remove'
          ? {item_id: itemId, removed_tags: changedTags}
          : {item_id: itemId, added_tags: changedTags});
      }
      return route.fulfill({json: {
        kind: mode === 'remove' ? 'tag-remove' : 'tag-apply',
        changes,
        backlog: backend.items.filter(item => !item.verdict).length,
        session: backend.session,
      }});
    }
    if (request.method() === 'POST' && url.pathname === '/api/undo') {
      const changes = backend.actions.pop() || [];
      for (const change of changes) Object.assign(backend.items.find(item => item.id === change.item_id), {verdict: change.verdict, verdict_at: change.verdict_at});
      backend.session.items_judged = Math.max(0, backend.session.items_judged - changes.length);
      return route.fulfill({json: {changes, backlog: backend.items.filter(item => !item.verdict).length, session: backend.session}});
    }
    if (request.method() === 'POST' && url.pathname === '/api/captures/gaps') {
      return route.fulfill({json: {enabled: false, processed: 0, status: {total: backend.items.length, metadata_images: 3334, screenshot_images: 0, gaps: 6666, queued: 6666, duplicate_distribution: [12, 7, 4]}}});
    }
    return route.fulfill({status: 404, json: {error: 'Not found'}});
  });
  return backend;
}

async function expectLayout(page, {width, height, visible, cards, columns, rows}) {
  await page.setViewportSize({width, height});
  await expect.poll(() => page.evaluate(() => ({
    visible: window.__pileState.visible,
    cards: document.querySelectorAll('.bookmark-card').length,
    shown: document.querySelectorAll('.bookmark-card:not([hidden])').length,
    columns: getComputedStyle(document.querySelector('#grid')).gridTemplateColumns.split(' ').length,
    rows: getComputedStyle(document.querySelector('#grid')).gridTemplateRows.split(' ').length,
  }))).toEqual({visible, cards, shown: visible, columns, rows});
}

test('10,000 items keep a bounded DOM at each responsive layout', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('#count')).toHaveText('10,000');

  await expectLayout(page, {width: 1600, height: 900, visible: 16, cards: 24, columns: 8, rows: 2});
  await expectLayout(page, {width: 1000, height: 900, visible: 12, cards: 16, columns: 4, rows: 3});
  await expect(page.locator('.layout-picker')).toBeHidden();
  await expectLayout(page, {width: 820, height: 1100, visible: 9, cards: 12, columns: 3, rows: 3});
  await expect(page.locator('.layout-picker')).toBeHidden();
  await expectLayout(page, {width: 390, height: 844, visible: 1, cards: 3, columns: 1, rows: 1});
  await expect.poll(() => page.locator('#grid').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(550);
  await expect.poll(() => page.locator('.footer-line').evaluate(element => element.getBoundingClientRect().bottom)).toBeGreaterThan(820);
});

test('Import, Select, and Export share the row and only one expands at a time', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('#count')).toHaveText('10,000');

  const panels = page.locator('.file-tools > details');
  await expect(panels).toHaveCount(3);
  const collapsedWidths = await panels.evaluateAll(rows => rows.map(row => row.getBoundingClientRect().width));
  expect(Math.max(...collapsedWidths) - Math.min(...collapsedWidths)).toBeLessThan(2);

  await page.locator('#importer > summary').click();
  await expect(page.locator('#importer')).toHaveAttribute('open', '');
  await expect(page.locator('#selector')).not.toHaveAttribute('open', '');
  const importWidths = await panels.evaluateAll(rows => rows.map(row => row.getBoundingClientRect().width));
  expect(importWidths[0]).toBeGreaterThan(importWidths[1] * 3);

  await page.locator('#selector > summary').click();
  await expect(page.locator('#selector')).toHaveAttribute('open', '');
  await expect(page.locator('#importer')).not.toHaveAttribute('open', '');
  const selectWidths = await panels.evaluateAll(rows => rows.map(row => row.getBoundingClientRect().width));
  expect(selectWidths[1]).toBeGreaterThan(selectWidths[0] * 3);

  await page.locator('#exporter > summary').click();
  await expect(page.locator('#exporter')).toHaveAttribute('open', '');
  await expect(page.locator('#selector')).not.toHaveAttribute('open', '');
  await page.locator('#exporter > summary').click();
  await expect(page.locator('.file-tools > details[open]')).toHaveCount(0);
});

test('Select remembers query strings in reverse recent order', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await page.locator('#selector > summary').click();

  await page.getByLabel('Selection expression').fill('site:first.example');
  await page.getByRole('button', {name: 'Open selection'}).click();
  await expect(page.getByLabel('Previous selections')).toContainText('site:first.example');
  await page.getByLabel('Selection expression').fill('folder:reading-topic*');
  await page.getByRole('button', {name: 'Open selection'}).click();
  await expect(page.getByLabel('Previous selections')).toContainText('folder:reading-topic*');
  const history = await page.getByLabel('Previous selections').locator('option').allTextContents();
  expect(history).toEqual(['Previous selections', 'folder:reading-topic*', 'site:first.example']);
  await page.getByLabel('Previous selections').selectOption('site:first.example');
  await page.getByRole('button', {name: 'Open previous'}).click();
  await expect(page.getByLabel('Selection expression')).toHaveValue('site:first.example');
});

test('Open choice buttons show whether a proposal, saved selection, or previous selection is chosen', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await page.locator('#selector > summary').click();

  for (const [selectLabel, buttonName, option] of [
    ['Automatic proposals', 'Open proposal', 'src:browser-export'],
    ['Saved selections', 'Open saved', 'saved-reading'],
  ]) {
    const select = page.getByLabel(selectLabel);
    const button = page.getByRole('button', {name: buttonName});
    await expect(button).toHaveCSS('color', 'rgb(23, 49, 56)');
    await expect(button).toHaveCSS('background-color', 'rgb(240, 233, 221)');
    await expect(button).toHaveAttribute('data-selection-ready', 'false');
    await select.selectOption(option);
    await expect(button).toHaveCSS('color', 'rgb(23, 63, 67)');
    await expect(button).toHaveCSS('background-color', 'rgb(211, 232, 225)');
    await expect(button).toHaveAttribute('data-selection-ready', 'true');
    await select.selectOption('');
    await expect(button).toHaveCSS('color', 'rgb(23, 49, 56)');
    await expect(button).toHaveCSS('background-color', 'rgb(240, 233, 221)');
  }

  await page.getByLabel('Selection expression').fill('site:first.example');
  await page.getByRole('button', {name: 'Open selection'}).click();
  const previous = page.getByLabel('Previous selections');
  const openPrevious = page.getByRole('button', {name: 'Open previous'});
  await expect(openPrevious).toHaveCSS('color', 'rgb(23, 49, 56)');
  await expect(openPrevious).toHaveCSS('background-color', 'rgb(240, 233, 221)');
  await previous.selectOption('site:first.example');
  await expect(openPrevious).toHaveCSS('color', 'rgb(23, 63, 67)');
  await expect(openPrevious).toHaveCSS('background-color', 'rgb(211, 232, 225)');
});

test('Import accepts a file dropped beside the file chooser', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await page.locator('#importer > summary').click();

  const dropZone = page.locator('#import-drop-zone');
  await expect(dropZone).toContainText('Drop files here');
  const positions = await page.locator('.import-file-picker').evaluate(picker => {
    const input = picker.querySelector('#bookmark-file').getBoundingClientRect();
    const drop = picker.querySelector('#import-drop-zone').getBoundingClientRect();
    return {inputTop: input.top, inputBottom: input.bottom, dropTop: drop.top, dropBottom: drop.bottom, dropLeft: drop.left, inputLeft: input.left};
  });
  expect(positions.dropLeft).toBeGreaterThan(positions.inputLeft);
  expect(Math.min(positions.inputBottom, positions.dropBottom) - Math.max(positions.inputTop, positions.dropTop)).toBeGreaterThan(20);

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['<!doctype html><title>Bookmarks</title>'], 'dragged-bookmarks.html', {type: 'text/html'}));
    return transfer;
  });
  await dropZone.dispatchEvent('dragenter', {dataTransfer});
  await expect(dropZone).toHaveAttribute('data-drag-active', 'true');
  await dropZone.dispatchEvent('drop', {dataTransfer});
  await expect(dropZone).not.toHaveAttribute('data-drag-active', 'true');
  await expect(page.locator('#import-drop-copy')).toHaveText('dragged-bookmarks.html ready to import');
  await expect.poll(() => page.locator('#bookmark-file').evaluate(input => input.files[0]?.name)).toBe('dragged-bookmarks.html');

  await page.setViewportSize({width: 390, height: 844});
  const phoneDrop = await dropZone.boundingBox();
  expect(phoneDrop.x).toBeGreaterThanOrEqual(0);
  expect(phoneDrop.x + phoneDrop.width).toBeLessThanOrEqual(390);
  expect(phoneDrop.height).toBeGreaterThanOrEqual(40);

  await page.getByRole('button', {name: 'Import file'}).click();
  await expect(page.locator('#import-status')).toHaveText('Imported 1 new; merged 0.');
});

test('file chooser imports a mixed batch sequentially into its starting collection', async ({page}) => {
  const backend = await installPile(page);
  backend.collections.push({id: 'other', name: 'Other collection', kind: 'private'});
  backend.importOutcomes.push(
    {status: 201, json: {added: 2, merged: 1}},
    {status: 201, json: {added: 1, merged: 3}},
  );
  let releaseFirst;
  const firstFinished = new Promise(resolve => { releaseFirst = resolve; });
  backend.importBarrier = () => backend.importRequests.length === 1 ? firstFinished : Promise.resolve();
  await page.goto('https://pile.test/');
  await page.locator('#importer > summary').click();
  const files = [
    {name: 'first.html', mimeType: 'text/html', buffer: Buffer.from('<DL><DT><A HREF="https://example.com">First</A></DL>')},
    {name: 'second.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"bookmark-sorter/v1","items":[]}')},
  ];
  await page.locator('#bookmark-file').setInputFiles(files);
  await page.locator('#source').fill('batch-source');
  await expect(page.locator('#import-drop-copy')).toHaveText('2 files ready to import');
  expect(backend.importRequests).toHaveLength(0);
  await page.getByRole('button', {name: 'Import files', exact: true}).click();
  await expect(page.locator('#import-status')).toContainText('Importing 1 of 2: first.html');
  await expect(page.locator('#bookmark-file')).toBeDisabled();
  await expect(page.locator('#source')).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Import files', exact: true})).toBeDisabled();
  await page.locator('#import-form').dispatchEvent('submit');
  await page.locator('#collection-select').selectOption('other');
  await expect(page.locator('#collection-select')).toHaveValue('other');
  expect(backend.importRequests).toHaveLength(1);
  releaseFirst();
  await expect(page.locator('#import-status')).toHaveText('Imported 3 new; merged 4. 2 of 2 files imported into “My bookmarks”.');
  await expect(page.locator('#import-results li')).toHaveText([
    'first.html — Imported 2 new; merged 1.',
    'second.json — Imported 1 new; merged 3.',
  ]);
  expect(backend.importRequests).toEqual(files.map(file => ({
    files: [{name: file.name, text: file.buffer.toString()}], source: 'batch-source', collectionId: 'pile',
  })));
  await expect(page.locator('#collection-select')).toHaveValue('other');
  await expect(page.locator('#bookmark-file')).toBeEnabled();
  await expect(page.locator('#source')).toBeEnabled();
});

test('dropping multiple files keeps their order and continues after a rejected file', async ({page}) => {
  const backend = await installPile(page);
  backend.importOutcomes.push(
    {status: 201, json: {added: 2, merged: 0}},
    {status: 400, json: {error: 'Invalid JSON'}},
    {status: 201, json: {added: 0, merged: 2}},
  );
  await page.goto('https://pile.test/');
  await page.locator('#importer > summary').click();
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    for (const [name, content] of [['first.html', '<DL></DL>'], ['broken.json', '{'], ['last.json', '{}']]) {
      transfer.items.add(new File([content], name));
    }
    return transfer;
  });
  await page.locator('#import-drop-zone').dispatchEvent('drop', {dataTransfer});
  await expect(page.locator('#import-drop-copy')).toHaveText('3 files ready to import');
  expect(backend.importRequests).toHaveLength(0);
  await page.getByRole('button', {name: 'Import files', exact: true}).click();
  await expect(page.locator('#import-status')).toHaveText('Imported 2 new; merged 2. 2 of 3 files imported into “My bookmarks”. 1 file failed; see results below.');
  await expect(page.locator('#import-results li')).toHaveText([
    'first.html — Imported 2 new; merged 0.',
    'broken.json — Import failed: Invalid JSON',
    'last.json — Imported 0 new; merged 2.',
  ]);
  await expect(page.locator('#import-results .error')).toHaveCount(1);
  await expect(page.locator('#importer')).toHaveAttribute('open', '');
  expect(backend.importRequests.map(request => request.files.map(file => file.name))).toEqual([['first.html'], ['broken.json'], ['last.json']]);
  await expect(page.getByRole('button', {name: 'Import files', exact: true})).toBeEnabled();
});

test('a refresh failure preserves successful import results and allows another batch', async ({page}) => {
  await installPile(page);
  await page.goto('https://pile.test/');
  await page.locator('#importer > summary').click();
  await page.route('https://pile.test/api/collections', route => route.fulfill({status: 503, json: {error: 'Temporarily unavailable'}}));
  await page.locator('#bookmark-file').setInputFiles({name: 'one.json', mimeType: 'application/json', buffer: Buffer.from('{}')});
  await page.getByRole('button', {name: 'Import files', exact: true}).click();
  await expect(page.locator('#import-status')).toHaveText('Imported 1 new; merged 0. Could not refresh the collection: Temporarily unavailable');
  await expect(page.locator('#import-results li')).toHaveText('one.json — Imported 1 new; merged 0.');
  await expect(page.getByRole('button', {name: 'Import files', exact: true})).toBeEnabled();
});

test('page layout dropdown redraws the wide grid immediately', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');

  const picker = page.getByLabel('Page layout');
  await expect(picker).toBeEnabled();
  await expect(picker).toHaveValue('2x8');
  await expectLayout(page, {width: 1600, height: 900, visible: 16, cards: 24, columns: 8, rows: 2});

  for (const expected of [
    {value: '3x3', visible: 9, cards: 12, columns: 3, rows: 3},
    {value: '2x6', visible: 12, cards: 18, columns: 6, rows: 2},
    {value: '3x12', visible: 36, cards: 48, columns: 12, rows: 3},
    {value: '2x8', visible: 16, cards: 24, columns: 8, rows: 2},
  ]) {
    await picker.selectOption(expected.value);
    await expectLayout(page, {width: 1600, height: 900, ...expected});
  }
  await expect(page.locator('#status')).toHaveText('Showing 2 rows × 8 columns (16 bookmarks per page).');
});

test('3x12 fits complete landscape, square, and portrait captures inside each card', async ({page}) => {
  const backend = await installPile(page);
  for (const [index, [width, height]] of [[1200, 630], [600, 600], [600, 900]].entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="teal"/><rect y="66%" width="100%" height="34%" fill="orange"/></svg>`;
    backend.items[index].capture_url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    backend.items[index].capture = {state: 'pass1-ready', image_ref: `shape-${index}`};
  }
  await page.setViewportSize({width: 1600, height: 900});
  await page.goto('https://pile.test/');
  const captures = page.locator('.bookmark-card:not([hidden]) .capture img');
  await expect.poll(() => captures.evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const originalTwoRowSizes = await captures.evaluateAll(images => images.slice(0, 3).map(image => ({width: image.clientWidth, height: image.clientHeight})));
  await page.getByLabel('Page layout').selectOption('3x12');
  for (const viewport of [{width: 1320, height: 820}, {width: 1600, height: 900}, {width: 3440, height: 1440}]) {
    await expectLayout(page, {...viewport, visible: 36, cards: 48, columns: 12, rows: 3});
    const metrics = await captures.evaluateAll(images => images.slice(0, 3).map(image => {
      const bounds = image.getBoundingClientRect();
      const capture = image.parentElement.getBoundingClientRect();
      const card = image.closest('.bookmark-card');
      const title = card.querySelector('h2').getBoundingClientRect();
      const tags = card.querySelector('.tags').getBoundingClientRect();
      const verdict = card.querySelector('.verdict-label').getBoundingClientRect();
      return {
        fits: bounds.top >= capture.top - 1 && bounds.bottom <= capture.bottom + 1 && bounds.left >= capture.left - 1 && bounds.right <= capture.right + 1,
        objectFit: getComputedStyle(image).objectFit,
        readable: title.height >= 30 && title.bottom <= tags.top && verdict.bottom <= card.getBoundingClientRect().bottom,
      };
    }));
    expect(metrics).toHaveLength(3);
    for (const metric of metrics) expect(metric).toEqual({fits: true, objectFit: 'contain', readable: true});
  }
  await page.setViewportSize({width: 1600, height: 900});
  await page.getByLabel('Page layout').selectOption('2x8');
  await expect.poll(() => captures.evaluateAll(images => images.slice(0, 3).map(image => ({width: image.clientWidth, height: image.clientHeight})))).toEqual(originalTwoRowSizes);
});

test('three-row layouts reserve most of each card for readable bookmark text', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await page.getByLabel('Page layout').selectOption('3x3');
  await expectLayout(page, {width: 1600, height: 900, visible: 9, cards: 12, columns: 3, rows: 3});

  const metrics = await page.locator('[data-item-id="item-1"]').evaluate(card => {
    const capture = card.querySelector('.capture').getBoundingClientRect();
    const title = card.querySelector('h2').getBoundingClientRect();
    const bounds = card.getBoundingClientRect();
    return {captureRatio: capture.height / bounds.height, titleHeight: title.height, titleBottom: title.bottom, cardBottom: bounds.bottom};
  });
  expect(metrics.captureRatio).toBeLessThan(0.32);
  expect(metrics.titleHeight).toBeGreaterThan(20);
  expect(metrics.titleBottom).toBeLessThan(metrics.cardBottom);

  await page.getByLabel('Page layout').selectOption('3x12');
  await expectLayout(page, {width: 1600, height: 900, visible: 36, cards: 48, columns: 12, rows: 3});
  const compactMetrics = await page.locator('[data-item-id="item-1"]').evaluate(card => {
    const capture = card.querySelector('.capture').getBoundingClientRect();
    const title = card.querySelector('h2');
    const tags = card.querySelector('.tags').getBoundingClientRect();
    const bounds = card.getBoundingClientRect();
    return {
      captureRatio: capture.height / bounds.height,
      titleHeight: title.getBoundingClientRect().height,
      lineClamp: getComputedStyle(title).webkitLineClamp,
      titleBottom: title.getBoundingClientRect().bottom,
      tagsTop: tags.top,
    };
  });
  expect(compactMetrics.captureRatio).toBeGreaterThan(0.35);
  expect(compactMetrics.captureRatio).toBeLessThan(0.45);
  expect(compactMetrics.titleHeight).toBeGreaterThan(30);
  expect(compactMetrics.lineClamp).toBe('none');
  expect(compactMetrics.tagsTop - compactMetrics.titleBottom).toBeLessThan(5);
});

test('keyboard verdicts, marked groups, atomic undo, and sitting rate work without navigation', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  let navigations = 0;
  page.on('request', request => { if (request.isNavigationRequest()) navigations += 1; });
  await page.goto('https://pile.test/');
  await expect(page.locator('#grid')).toBeFocused();
  const originalCard = await page.locator('[data-item-id="item-1"]').elementHandle();

  await page.keyboard.press('k');
  await expect(page.locator('#backlog')).toHaveText('9,999');
  await expect(page.locator('[data-item-id="item-1"]')).toHaveAttribute('data-verdict', 'keeper');
  await expect(page.locator('[data-item-id="item-1"] .verdict-label')).toHaveText('Keep');
  await expect(page.locator('button[data-verdict="needs-more-time"]')).toHaveText(/Needs-time/);
  await expect(page.locator('body')).not.toContainText('Keeper');
  await expect(page.locator('body')).not.toContainText('Needs more time');
  expect(await originalCard.evaluate(card => card.isConnected)).toBe(true);
  await expect(page.locator('[data-item-id="item-2"]')).toHaveClass(/focused/);

  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#mark-count')).toHaveText('2 marked');
  await page.keyboard.press('j');
  await expect(page.locator('#backlog')).toHaveText('9,997');
  await expect(page.locator('#mark-count')).toHaveText('0 marked');
  await expect(page.locator('[data-item-id="item-2"]')).toHaveAttribute('data-verdict', 'junk');
  await expect(page.locator('[data-item-id="item-3"]')).toHaveAttribute('data-verdict', 'junk');

  await page.keyboard.press('u');
  await expect(page.locator('#status')).toHaveText('Undid the last action as one step.');
  await expect(page.locator('#backlog')).toHaveText('9,999');
  await expect(page.locator('[data-item-id="item-2"]')).toHaveAttribute('data-verdict', '');
  await expect(page.locator('[data-item-id="item-3"]')).toHaveAttribute('data-verdict', '');
  await expect.poll(() => page.locator('#rate').textContent()).not.toBe('—');

  expect(backend.actions).toHaveLength(1);
  expect(backend.session.items_judged).toBe(1);
  expect(navigations).toBe(1);
  expect(page.url()).toBe('https://pile.test/');
});

test('stored captures render locally while the capture-gap control stays disabled', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('.capture img')).toHaveCount(8);
  expect(backend.requests.some(request => request.path.startsWith('/read/'))).toBe(false);
  expect(backend.requests.filter(request => request.path === '/api/captures/gaps')).toHaveLength(0);
  await expect(page.locator('#capture-gaps')).toBeDisabled();
  expect(backend.requests.filter(request => request.path === '/api/captures/gaps')).toHaveLength(0);
});

test('bookmark titles link out and the copy control copies the saved URL', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: async value => { window.__copiedBookmarkUrl = value; }},
    });
  });
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');

  const firstCard = page.locator('[data-item-id="item-1"]');
  const titleLink = firstCard.locator('h2 a');
  await expect(titleLink).toHaveAttribute('href', 'https://example0.com/read/1');
  await expect(titleLink).toHaveAttribute('target', '_blank');
  await expect(titleLink).toHaveAttribute('rel', 'noopener noreferrer');

  await firstCard.locator('.copy-url').click();
  await expect(page.locator('#status')).toHaveText('Copied URL for Bookmark 1: a useful article with enough title context.');
  await expect.poll(() => page.evaluate(() => window.__copiedBookmarkUrl)).toBe('https://example0.com/read/1');
});

test('help explains controls and selection syntax, and tags expose their complete list', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');

  await page.locator('#help-toggle').click();
  await expect(page.locator('#help-panel')).toBeVisible();
  await expect(page.locator('#help-panel')).toContainText('Sweep untriaged');
  await expect(page.locator('#help-panel')).toContainText('site:example.com');
  await expect(page.locator('#help-panel')).toContainText('title:*court-drama*');
  await expect(page.locator('#help-panel')).toContainText('src:safari-export');
  await expect(page.locator('#help-panel')).toContainText('folder:*modern-art*');
  await expect(page.locator('#help-panel')).toContainText('topic:*modern-art*');
  await expect(page.locator('#help-panel')).toContainText('in:2026-08-19');
  await expect(page.locator('#help-panel')).toContainText('punctuation, symbols, and spaces become a single dash');
  await expect(page.locator('#help-panel')).toContainText('A trailing * matches the beginning of a normalized value');
  await expect(page.locator('#help-panel')).toContainText('surrounding a value with * matches it anywhere');
  await expect(page.locator('#help-panel')).toContainText('verdict:untriaged');
  await expect(page.locator('#help-panel')).toContainText('image:present');
  const documentation = page.getByRole('link', {name: 'Full documentation'});
  await expect(documentation).toHaveAttribute('href', 'https://knovak.github.io/siteprep/initiatives/bookmark-sorter/README.html');
  await expect(documentation).toHaveAttribute('target', '_blank');
  await expect(documentation).toHaveAttribute('rel', 'noopener noreferrer');
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-panel')).toBeHidden();

  const firstTag = page.locator('[data-item-id="item-1"] .tag').first();
  await firstTag.hover();
  const popover = page.locator('#tag-popover');
  await expect(popover).toBeVisible();
  await expect(popover).toHaveText('All tags:\nfolder:Reading/topic-0\nsrc:browser-export');
  await popover.hover();
  await page.waitForTimeout(250);
  await expect(popover).toBeVisible();
  await expect.poll(() => popover.evaluate(element => getComputedStyle(element).userSelect)).toBe('text');
  await expect.poll(() => popover.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(12);
  const selected = await popover.evaluate(element => {
    const selection = getSelection();
    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.addRange(range);
    return selection.toString();
  });
  expect(selected).toContain('src:browser-export');
});

test('collection rename uses an inline form and supports save or keyboard cancel', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await page.getByRole('button', {name: 'Rename'}).click();
  await expect(page.locator('#rename-form')).toBeVisible();
  await expect(page.getByLabel('Collection name')).toHaveValue('My bookmarks');
  await expect(page.getByLabel('Collection name')).toBeFocused();
  await page.getByLabel('Collection name').press('Escape');
  await expect(page.locator('#rename-form')).toBeHidden();
  await expect(page.getByRole('button', {name: 'Rename'})).toBeFocused();

  await page.getByRole('button', {name: 'Rename'}).click();
  await page.getByLabel('Collection name').fill('Reviewed bookmarks');
  await page.getByLabel('Collection name').press('Enter');
  await expect(page.locator('#status')).toHaveText('Collection renamed.');
  await expect(page.locator('#rename-form')).toBeHidden();
  await expect(page.getByLabel('Current collection')).toContainText('Reviewed bookmarks');
  await expect(page.getByRole('button', {name: 'Rename'})).toBeFocused();
  expect(backend.collection.name).toBe('Reviewed bookmarks');
});

test('New creates a named empty collection without a browser prompt', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await page.getByRole('button', {name: 'New'}).click();
  await expect(page.locator('#rename-form')).toBeVisible();
  await expect(page.getByLabel('Collection name')).toHaveValue('');
  await page.getByLabel('Collection name').fill('Research queue');
  await page.getByLabel('Collection name').press('Enter');

  await expect(page.locator('#status')).toHaveText('Empty collection created.');
  await expect(page.getByLabel('Current collection')).toHaveValue('collection-new');
  await expect(page.locator('#count')).toHaveText('0');
  expect(backend.collections.at(-1)).toEqual({id: 'collection-new', name: 'Research queue', kind: 'private'});
});

test('Admin contains sitting, capture, and authorized-user controls', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await expect(page.locator('.toolbar #session, .toolbar #capture-pass-one, .toolbar #capture-gaps')).toHaveCount(0);
  await page.locator('#importer > summary').click();
  await expect(page.locator('#importer').getByRole('button', {name: 'Create template'})).toHaveCount(0);
  await page.locator('#importer > summary').click();
  await page.locator('#admin-menu > summary').click();
  const adminPosition = await page.locator('#admin-menu').evaluate(menu => {
    const summary = menu.querySelector('summary').getBoundingClientRect();
    const panel = menu.querySelector('.admin-menu-content').getBoundingClientRect();
    return {summaryBottom: summary.bottom, panelTop: panel.top};
  });
  expect(adminPosition.panelTop).toBeGreaterThan(adminPosition.summaryBottom);
  await expect(page.locator('#session')).toBeVisible();
  await expect(page.locator('#capture-pass-one')).toBeVisible();
  await expect(page.locator('#capture-gaps')).toBeVisible();
  await page.getByRole('button', {name: 'Display users'}).click();
  await expect(page.locator('#authorized-users')).toContainText('krnovak@gmail.com — admin');
  const adminOrder = await page.locator('.admin-menu-content').evaluate(panel => ({
    users: [...panel.children].indexOf(panel.querySelector('#authorized-users')),
    metadata: [...panel.children].indexOf(panel.querySelector('#capture-pass-one')),
    gaps: [...panel.children].indexOf(panel.querySelector('#capture-gaps')),
  }));
  expect(adminOrder.metadata).toBeGreaterThan(adminOrder.users);
  expect(adminOrder.gaps).toBeGreaterThan(adminOrder.users);

  await page.getByLabel('Template name').fill('Research starter');
  await page.getByRole('button', {name: 'Create template'}).click();
  await expect(page.getByLabel('Current collection')).toHaveValue('template-new');
  await expect(page.locator('#collection-kind')).toHaveText('demo template');
  await expect(page.locator('#status')).toHaveText('Demo template “Research starter” created and selected.');

  await page.getByRole('button', {name: 'Show sitting'}).click();
  await expect(page.locator('#sitting-report')).toBeVisible();
  await expect(page.locator('#sitting-summary')).toContainText('In progress');
  await expect(page.locator('#sitting-summary')).toContainText('Items judged');
  const sittingDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export sitting data'}).click();
  expect((await sittingDownload).suggestedFilename()).toBe('bookmark-sorter-sitting.json');
  await expect(page.locator('#status')).toHaveText('Exported the displayed sitting data.');

  await page.locator('#add-user-email').fill('New.Reader@Example.com');
  await page.locator('#add-user-type').selectOption('user');
  await page.getByRole('button', {name: 'Add user'}).click();
  await expect(page.locator('#authorized-users')).toContainText('new.reader@example.com — user');
  await page.locator('#remove-user-email').fill('new.reader@example.com');
  const removeUser = page.getByRole('button', {name: 'Remove user'});
  await expect(removeUser).toHaveCSS('color', 'rgb(142, 48, 41)');
  await removeUser.click();
  await expect(page.locator('#authorized-users')).not.toContainText('new.reader@example.com');
  expect(backend.authorizedUsers).toHaveLength(2);

  await page.setViewportSize({width: 430, height: 932});
  const phonePosition = await page.locator('#admin-menu').evaluate(menu => {
    const summary = menu.querySelector('summary').getBoundingClientRect();
    const panel = menu.querySelector('.admin-menu-content').getBoundingClientRect();
    return {summaryTop: summary.top, summaryBottom: summary.bottom, panelTop: panel.top, viewportHeight: innerHeight};
  });
  expect(phonePosition.summaryTop).toBeGreaterThanOrEqual(0);
  expect(phonePosition.summaryBottom).toBeLessThan(phonePosition.viewportHeight);
  expect(phonePosition.panelTop).toBeGreaterThan(phonePosition.summaryBottom);
});

test('Automatic proposals are grouped in the requested order without Same labels', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await expect(page.locator('#proposals optgroup')).toHaveCount(7);
  const labels = await page.locator('#proposals optgroup').evaluateAll(groups => groups.map(group => group.label));
  expect(labels).toEqual(['src', 'tag', 'verdict', 'errors', 'folder', 'site', 'image']);
  await expect(page.locator('#proposals optgroup[label="verdict"] option')).toHaveCount(3);
  const verdictLabels = await page.locator('#proposals optgroup[label="verdict"] option').allTextContents();
  expect(verdictLabels).toEqual(['not junk (10,000)', 'untriaged (10,000)', 'untriaged or needs-time (10,000)']);
  const errorLabels = await page.locator('#proposals optgroup[label="errors"] option').allTextContents();
  expect(errorLabels).toEqual(['any error (3)', 'err:404 (2)', 'err:timeout (1)']);
  await expect(page.locator('#proposals optgroup[label="tag"]')).not.toContainText('err:');
  await expect(page.locator('#proposals')).not.toContainText('Same ');
});

test('Automatic proposals refresh after choosing a collection and completing an import', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  backend.collections.push({id: 'other', name: 'Other collection', kind: 'private'});
  await page.goto('https://pile.test/');
  await expect(page.locator('#proposals option[value="src:browser-export"]')).toHaveText('browser-export (1)');

  await page.getByLabel('Current collection').selectOption('other');
  await expect(page.locator('#proposals option[value="src:other-source"]')).toHaveText('other-source (1)');
  expect(backend.requests.filter(request => request.path === '/api/proposals').at(-1).collectionId).toBe('other');

  await page.locator('#importer summary').click();
  await page.locator('#bookmark-file').setInputFiles({
    name: 'bookmarks.html', mimeType: 'text/html', buffer: Buffer.from('<!doctype html><title>Bookmarks</title>'),
  });
  await page.getByRole('button', {name: 'Import file'}).click();
  await expect(page.locator('#status')).toHaveText('Imported 1 new; merged 0.');
  await expect(page.locator('#import-status')).toHaveText('Imported 1 new; merged 0.');
  await expect(page.locator('#proposals option[value="src:other-source"]')).toHaveText('other-source (2)');

  await page.getByLabel('Current collection').selectOption('pile');
  await expect(page.locator('#count')).toHaveText('10,000');
  backend.selectionDelays.set('other', 400);
  await page.getByLabel('Current collection').selectOption('other');
  await page.getByLabel('Current collection').selectOption('pile');
  await page.waitForTimeout(600);
  await expect(page.getByLabel('Current collection')).toHaveValue('pile');
  await expect(page.locator('#count')).toHaveText('10,000');
  await expect(page.locator('[data-item-id="item-1"]')).toContainText('src:browser-export');
});

test('Export downloads either the collection or the current selection as importable JSON', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');

  await page.locator('#exporter summary').click();
  await expect(page.locator('#export-scope option').first()).toHaveText('Current collection (10,000)');
  await page.locator('#selector > summary').click();
  await page.getByLabel('Selection expression').fill('site:example0.com');
  await page.getByRole('button', {name: 'Open selection'}).click();
  await page.locator('#exporter > summary').click();
  await page.getByLabel('Export scope').selectOption('selection');
  const selectionDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export file'}).click();
  const selectionFile = await selectionDownload;
  expect(selectionFile.suggestedFilename()).toBe('bookmark-sorter-My-bookmarks.json');
  const selectionUrl = new URL(selectionFile.url());
  expect(selectionUrl.pathname).toBe('/api/export');
  expect(selectionUrl.searchParams.get('collection_id')).toBe('pile');
  expect(selectionUrl.searchParams.get('expression')).toBe('site:example0.com');
  await expect(page.locator('#status')).toContainText('current selection');

  await page.getByLabel('Export scope').selectOption('collection');
  const collectionDownload = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export file'}).click();
  const collectionFile = await collectionDownload;
  expect(collectionFile.suggestedFilename()).toBe('bookmark-sorter-My-bookmarks.json');
  const collectionUrl = new URL(collectionFile.url());
  expect(collectionUrl.pathname).toBe('/api/export');
  expect(collectionUrl.searchParams.get('collection_id')).toBe('pile');
  expect(collectionUrl.searchParams.has('expression')).toBe(false);
  await expect(page.locator('#status')).toContainText('current collection');
  await expect(page.locator('#bookmark-file')).toHaveAttribute('accept', /\.json/);
});

test('Export erases the current collection only after confirmation', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await installPile(page);
  await page.goto('https://pile.test/');
  await page.locator('#exporter > summary').click();

  let prompt = '';
  page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.accept(); });
  await page.getByRole('button', {name: 'Erase current collection'}).click();
  await expect(page.locator('#count')).toHaveText('0');
  expect(prompt).toContain('Erase all 10,000 bookmarks in “My bookmarks”?');
  await expect(page.locator('#status')).toHaveText('Erased 10,000 bookmarks from “My bookmarks”.');
  await expect(page.getByLabel('Current collection')).toContainText('My bookmarks');
});

test('sweep changes only visible untriaged cards, advances, and paging is read-only', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  backend.items[0].verdict = 'keeper';
  await page.goto('https://pile.test/');

  await expect(page.locator('.toolbar #sweep-verdict')).toHaveCount(1);
  await expect(page.locator('#selector #sweep-verdict')).toHaveCount(0);
  await expect(page.locator('#sweep-rest')).toHaveText('Sweep untriaged');
  await page.locator('#sweep-rest').click();
  await expect(page.locator('#position')).toContainText('17–32 of 10,000');
  expect(backend.items[0].verdict).toBe('keeper');
  expect(backend.items.slice(1, 16).every(item => item.verdict === 'junk')).toBe(true);
  expect(backend.items[16].verdict).toBe(null);
  const judgedAfterSweep = backend.items.filter(item => item.verdict).length;

  await page.locator('#previous-page').click();
  await expect(page.locator('#position')).toContainText('1–16 of 10,000');
  await page.locator('#next-page').click();
  await expect(page.locator('#position')).toContainText('17–32 of 10,000');
  expect(backend.items.filter(item => item.verdict).length).toBe(judgedAfterSweep);
});

test('sweep scope dropdown switches the action to the entire current selection', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  backend.items = backend.items.slice(0, 4);
  await page.goto('https://pile.test/');

  await page.getByLabel('Sweep mode').selectOption('selection');
  await expect(page.locator('#sweep-rest')).toHaveText('Sweep all selected');
  let prompt = '';
  page.once('dialog', async dialog => { prompt = dialog.message(); await dialog.accept(); });
  await page.locator('#sweep-rest').click();

  await expect(page.locator('#status')).toHaveText('Applied the verdict to all 4 items in the current selection.');
  expect(prompt).toContain('Apply Junk to all 4 items in the current selection?');
  expect(backend.items.every(item => item.verdict === 'junk')).toBe(true);
});

test('tag dropdown toggles between adding and removing tags from the current selection', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  backend.items = backend.items.slice(0, 4);
  await page.goto('https://pile.test/');
  await page.locator('#selector > summary').click();

  await expect(page.locator('#selector > summary')).toHaveText('Select and tag');
  await expect(page.locator('#tag-selection')).toHaveText('Tag items');
  await expect(page.locator('#tag-input')).toHaveAttribute('aria-label', 'Tags to add');
  await expect(page.locator('#tag-selection')).toHaveAttribute('data-tag-ready', 'false');
  await expect(page.locator('#tag-selection')).toHaveCSS('color', 'rgb(23, 49, 56)');
  await expect(page.locator('#tag-selection')).toHaveCSS('background-color', 'rgb(240, 233, 221)');
  await expect(page.locator('.tag-mode-picker')).toHaveCSS('color', 'rgb(23, 49, 56)');
  await expect(page.locator('.tag-mode-picker')).toHaveCSS('background-color', 'rgb(240, 233, 221)');
  await page.locator('#tag-input').fill('test-tag');
  await expect(page.locator('#tag-selection')).toHaveAttribute('data-tag-ready', 'true');
  await expect(page.locator('#tag-selection')).toHaveCSS('color', 'rgb(23, 63, 67)');
  await expect(page.locator('#tag-selection')).toHaveCSS('background-color', 'rgb(211, 232, 225)');
  await expect(page.locator('.tag-mode-picker')).toHaveCSS('color', 'rgb(23, 63, 67)');
  await expect(page.locator('.tag-mode-picker')).toHaveCSS('background-color', 'rgb(211, 232, 225)');
  await page.locator('#tag-selection').click();
  await expect(page.locator('#status')).toHaveText('Added tags to 4 items as one action.');
  await expect(page.locator('#tag-selection')).toHaveAttribute('data-tag-ready', 'false');
  await expect(page.locator('#tag-selection')).toHaveCSS('background-color', 'rgb(240, 233, 221)');
  expect(backend.items.every(item => item.tags.includes('test-tag'))).toBe(true);
  expect(backend.items.every(item => !item.tags.includes('te') && !item.tags.includes('t-tag'))).toBe(true);

  await page.getByLabel('Tag mode').selectOption('remove');
  await expect(page.locator('#tag-selection')).toHaveText('Untag items');
  await expect(page.locator('#tag-input')).toHaveAttribute('aria-label', 'Tags to remove');
  await page.locator('#tag-input').fill('test-tag');
  await expect(page.locator('#tag-selection')).toHaveAttribute('data-tag-ready', 'true');
  await page.locator('#tag-selection').click();
  await expect(page.locator('#status')).toHaveText('Removed tags from 4 items as one action.');
  await expect(page.locator('#tag-selection')).toHaveAttribute('data-tag-ready', 'false');
  await expect(page.locator('#tag-selection')).toHaveCSS('background-color', 'rgb(240, 233, 221)');
  expect(backend.items.every(item => !item.tags.includes('test-tag'))).toBe(true);

  await page.getByLabel('Tag mode').selectOption('apply');
  await expect(page.locator('#tag-selection')).toHaveText('Tag items');
});


test('Day and Night preserve every layout and remember the browser choice', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  await page.goto('https://pile.test/');
  const mode = page.getByLabel('Color mode');
  await expect(mode).toHaveValue('day');
  await expect(page.locator('#count')).toHaveText('10,000');
  for (const layout of ['3x3', '2x6', '2x8', '3x12']) {
    await page.getByLabel('Page layout').selectOption(layout);
    await page.locator('.bookmark-card .mark').first().click();
    const before = await page.locator('#grid').evaluate(grid => ({
      bounds: grid.getBoundingClientRect().toJSON(),
      columns: getComputedStyle(grid).gridTemplateColumns,
      rows: getComputedStyle(grid).gridTemplateRows,
      ids: [...grid.children].map(card => card.dataset.itemId),
    }));
    const requests = backend.requests.length;
    await mode.selectOption('night');
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await expect(page.locator('.bookmark-card.marked')).toHaveCount(1);
    expect(await page.locator('#grid').evaluate(grid => ({
      bounds: grid.getBoundingClientRect().toJSON(),
      columns: getComputedStyle(grid).gridTemplateColumns,
      rows: getComputedStyle(grid).gridTemplateRows,
      ids: [...grid.children].map(card => card.dataset.itemId),
    }))).toEqual(before);
    expect(backend.requests.length).toBe(requests);
    await page.locator('.bookmark-card .mark').first().click();
    await mode.selectOption('day');
  }
  await mode.selectOption('night');
  await page.reload();
  await expect(mode).toHaveValue('night');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await mode.selectOption('day');
  await page.reload();
  await expect(mode).toHaveValue('day');
  for (const width of [320, 390, 820]) {
    await page.setViewportSize({width, height: 844});
    await expect(mode).toBeVisible();
    const bounds = await mode.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('header').evaluate(header => {
      const brand = header.querySelector('.brand').getBoundingClientRect();
      const tools = header.querySelector('.header-tools').getBoundingClientRect();
      return brand.right <= tools.left;
    })).toBe(true);
    await mode.selectOption('night');
  }
});

test('unavailable browser storage still permits Day and Night', async ({page}) => {
  await installPile(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('https://pile.test/');
  await expect(page.getByLabel('Color mode')).toHaveValue('day');
  await page.getByLabel('Color mode').selectOption('night');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(page.locator('#count')).toHaveText('10,000');
});

test('night selection and focus outlines stay visible for all verdicts', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  const backend = await installPile(page);
  const verdicts = [null, 'keeper', 'junk', 'archive', 'needs-more-time'];
  verdicts.forEach((verdict, index) => { backend.items[index].verdict = verdict; });
  await page.goto('https://pile.test/');
  await page.getByLabel('Color mode').selectOption('night');
  for (let index = 0; index < verdicts.length; index += 1) {
    const card = page.locator('.bookmark-card').nth(index);
    await card.locator('.site').click();
    await card.locator('.mark').click();
    await expect(card).toHaveAttribute('aria-selected', 'true');
    await expect(card).toHaveCSS('border-color', 'rgb(185, 199, 213)');
    await expect(card).toHaveCSS('opacity', '1');
    await expect(card).toHaveClass(/focused/);
    await expect(card).toHaveCSS('outline-style', 'solid');
    const contrast = await card.evaluate(card => {
      const luminance = color => {
        const channels = color.match(/[0-9.]+/g).slice(0, 3).map(Number).map(v => {
          v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const ratio = (a, b) => { a = luminance(a); b = luminance(b); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const style = getComputedStyle(card);
      const canvas = getComputedStyle(document.documentElement).backgroundColor;
      return {
        selection: Math.min(ratio(style.borderColor, style.backgroundColor), ratio(style.borderColor, canvas)),
        focus: ratio(style.outlineColor, style.backgroundColor),
        text: ratio(getComputedStyle(card.querySelector('h2')).color, style.backgroundColor),
        secondary: ratio(getComputedStyle(card.querySelector('.site')).color, style.backgroundColor),
      };
    });
    expect(contrast.selection).toBeGreaterThanOrEqual(3);
    expect(contrast.focus).toBeGreaterThanOrEqual(3);
    expect(contrast.text).toBeGreaterThanOrEqual(4.5);
    expect(contrast.secondary).toBeGreaterThanOrEqual(4.5);
  }
  await expect(page.locator('.bookmark-card.marked')).toHaveCount(5);
  await expect(page.locator('.bookmark-card').first()).not.toHaveClass(/focused/);
  await expect(page.locator('.bookmark-card').first()).toHaveCSS('border-color', 'rgb(185, 199, 213)');
});

test('Pastel washes keep actions readable, compact, and touch accessible', async ({page, browser}) => {
  await page.setViewportSize({width: 1600, height: 1000});
  await installPile(page);
  await page.goto('https://pile.test/');
  const contrast = button => button.evaluate(button => {
    const style = getComputedStyle(button);
    const channels = value => value.match(/[\d.]+/g).map(Number);
    let background = channels(style.backgroundColor);
    const overlay = style.backgroundImage.match(/rgba?\([^)]+\)/);
    if (overlay) {
      const wash = channels(overlay[0]);
      background = background.map((v, i) => v * (1 - (wash[3] ?? 1)) + wash[i] * (wash[3] ?? 1));
    }
    const luminance = rgb => rgb.slice(0, 3).map(v => {
      v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((total, v, i) => total + v * [.2126, .7152, .0722][i], 0);
    const a = luminance(channels(style.color)), b = luminance(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  for (const theme of ['day', 'night']) {
    await page.getByLabel('Color mode').selectOption(theme);
    const buttons = page.locator('.toolbar button[data-verdict], #sweep-rest, #help-toggle');
    for (const button of await buttons.all()) {
      await expect(button).toBeEnabled();
      await expect(button).toHaveCSS('font-weight', '400');
      expect((await button.boundingBox()).height).toBeLessThanOrEqual(34);
      expect(await button.evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThanOrEqual(12);
      await page.mouse.move(0, 0);
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      await button.hover();
      await expect(button).not.toHaveCSS('background-image', 'none');
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      await page.mouse.down();
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    await page.locator('#help-toggle').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#help-toggle')).toHaveCSS('outline-style', 'solid');
    await expect(page.locator('#previous-page')).toBeDisabled();
  }
  const touch = await browser.newContext({hasTouch: true, viewport: {width: 390, height: 844}});
  try {
    const phone = await touch.newPage();
    await installPile(phone);
    await phone.goto('https://pile.test/');
    for (const control of await phone.locator('.toolbar button, #theme-mode, #help-toggle, .file-tools > details > summary').all()) {
      expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await touch.close(); }
});
