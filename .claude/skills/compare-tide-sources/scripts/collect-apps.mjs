// Drives both Tide Here editions in a real browser and records the coast-local
// day each one shows. Neither app renders without JavaScript, so fetching HTML
// is not an option.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { HOSTED_URL, OFFLINE_URL, OFFLINE_REPO_COPY, loadPlaywright, launchOptions, from12Hour, makeEvent } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true]));
const repoRoot = args.repo ?? process.cwd();
const config = JSON.parse(readFileSync(new URL('../locations.json', import.meta.url)));
const only = args.only ? String(args.only).split(',') : null;
const locations = config.locations.filter((l) => !only || only.includes(l.id));

const EVENT = /^(Low|High)(?:\s+tide)?\s*·\s*(\d{1,2}:\d{2}\s*[AP]M)\s*(-?\d+(?:\.\d+)?)\s*m$/i;
function parseEvents(lines) {
  return lines.map((line) => {
    const match = EVENT.exec(line.replace(/\s+/g, ' ').trim());
    if (!match) throw new Error(`unparsed tide row: ${line}`);
    return makeEvent(match[1].toUpperCase().startsWith('H') ? 'H' : 'L', from12Hour(match[2]), match[3]);
  });
}

const { chromium } = loadPlaywright(repoRoot);
const browser = await chromium.launch(launchOptions());
const results = {};

// ---- hosted edition (ChatGPT Sites) -------------------------------------
// One fresh context per place: the app caches provider station lists, and a
// reused context can serve a stale coast for the next query.
for (const location of locations) {
  const record = { source: 'hosted', query: location.query };
  for (let attempt = 1; attempt <= 3 && !record.events; attempt += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    // A provider catalogue that fails in the runner's own network looks exactly
    // like the app choosing not to use that provider. Record the difference.
    const providerCalls = new Map();
    const isProvider = (url) => config.providerHosts.some((host) => url.includes(host));
    page.on('response', (response) => {
      if (isProvider(response.url())) providerCalls.set(response.url().slice(0, 160), `HTTP ${response.status()}`);
    });
    page.on('requestfailed', (request) => {
      if (isProvider(request.url())) providerCalls.set(request.url().slice(0, 160), `FAILED ${request.failure()?.errorText ?? 'unknown'}`);
    });
    try {
      await page.goto(HOSTED_URL, { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction(() => !document.querySelector('#show-selection')?.disabled, null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await page.fill('#place', location.query);
      await page.click('#show-selection');
      await page.waitForFunction(() => {
        const result = document.querySelector('#result');
        const state = document.querySelector('#state-panel');
        return (result && !result.hidden && document.querySelectorAll('.day-card').length > 0) || (state && !state.hidden);
      }, null, { timeout: 150000 });
      await page.waitForTimeout(1200);
      const raw = await page.evaluate(() => {
        const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
        const state = document.querySelector('#state-panel');
        const result = document.querySelector('#result');
        const card = document.querySelector('.day-card');
        return {
          blocked: state && !state.hidden ? { code: text('#state-code'), message: text('#state-message') } : null,
          shown: Boolean(result && !result.hidden),
          station: text('#station-name'), stationKind: text('#station-kind'), zone: text('#zone-name'),
          resolved: text('#resolved-name'), sourceCopy: text('#source-copy'), attribution: text('#source-attribution'),
          warnings: [...document.querySelectorAll('#warnings .warning')].map((w) => w.textContent.replace(/\s+/g, ' ').trim()),
          date: card?.dataset.date ?? null,
          rows: card ? [...card.querySelectorAll('.event-group li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) : []
        };
      });
      if (!raw.shown) { record.unavailable = raw.blocked?.message ?? 'no forecast rendered'; record.events = []; }
      else {
        Object.assign(record, {
          station: raw.station, stationKind: raw.stationKind, zone: raw.zone, resolved: raw.resolved,
          sourceCopy: raw.sourceCopy, attribution: raw.attribution, warnings: raw.warnings,
          date: raw.date, events: parseEvents(raw.rows)
        });
      }
    } catch (error) {
      record.error = `attempt ${attempt}: ${String(error).split('\n')[0].slice(0, 200)}`;
    }
    record.providerCalls = Object.fromEntries(providerCalls);
    record.providerFailures = Object.entries(record.providerCalls)
      .filter(([, outcome]) => !outcome.startsWith('HTTP 2'))
      .map(([url, outcome]) => `${outcome} ${url}`);
    await context.close();
  }
  results[location.id] = { expectProvider: location.expectProvider, hosted: record };
  console.error(`hosted   ${location.id} -> ${record.events ? (record.station ?? record.unavailable) : record.error}`);
}

// ---- offline edition (single-file WASM app) -----------------------------
// The 39 MB file is loaded once and reused: startup dominates the cost and the
// app clears its own result between queries.
const offline = await browser.newContext();
const page = await offline.newPage();
await page.goto(OFFLINE_URL, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => /Ready offline/.test(document.querySelector('#runtime-status')?.textContent ?? ''), null, { timeout: 300000 });
console.error('offline  engine ready');

for (const location of locations) {
  const record = { source: 'offline', query: location.query };
  try {
    // Clear the previous forecast so a failed lookup cannot be read as a result.
    await page.evaluate(() => {
      for (const selector of ['#result', '#place-choices', '#state-panel']) {
        const element = document.querySelector(selector);
        if (element) element.hidden = true;
      }
      document.querySelector('#day-cards')?.replaceChildren();
    });
    await page.fill('#place-input', location.query);
    // Older published files have a date control; current searches start today automatically.
    if (await page.locator('#start-date').count()) await page.fill('#start-date', '');
    await page.click('#show-selection');
    const settled = () => {
      const visible = (selector) => { const element = document.querySelector(selector); return element && !element.hidden; };
      return visible('#place-choices') || visible('#state-panel') || (visible('#result') && document.querySelectorAll('.day-card').length > 0);
    };
    await page.waitForFunction(settled, null, { timeout: 150000 });
    if (await page.locator('#place-choices').isVisible()) {
      record.choices = (await page.locator('#place-list button').allTextContents()).map((s) => s.replace(/\s+/g, ' ').trim());
      await page.locator('#place-list button').first().click();
      await page.waitForFunction(() => {
        const visible = (selector) => { const element = document.querySelector(selector); return element && !element.hidden; };
        return visible('#state-panel') || (visible('#result') && document.querySelectorAll('.day-card').length > 0);
      }, null, { timeout: 150000 });
    }
    await page.waitForTimeout(800);
    const raw = await page.evaluate(() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
      const state = document.querySelector('#state-panel');
      const result = document.querySelector('#result');
      const card = document.querySelector('.day-card');
      return {
        blocked: state && !state.hidden ? { title: text('#state-title'), message: text('#state-message') } : null,
        shown: Boolean(result && !result.hidden),
        coast: text('#coast-name'), point: text('#selected-point'), zone: text('#zone-name'), note: text('#forecast-note'),
        date: card?.dataset.date ?? null,
        rows: card ? [...card.querySelectorAll('.event-group li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) : []
      };
    });
    if (!raw.shown) { record.unavailable = raw.blocked?.title ?? 'no forecast rendered'; record.events = []; }
    else {
      Object.assign(record, {
        station: raw.coast, modelPoint: raw.point, zone: raw.zone, note: raw.note,
        date: raw.date, events: parseEvents(raw.rows)
      });
    }
  } catch (error) {
    record.error = String(error).split('\n')[0].slice(0, 200);
  }
  results[location.id].offline = record;
  console.error(`offline  ${location.id} -> ${record.events ? (record.station ?? record.unavailable) : record.error}`);
}
await browser.close();

// The published single file should be the artifact this repository committed.
// A mismatch means the comparison is measuring a stale deploy.
const artifact = { url: OFFLINE_URL };
try {
  const published = Buffer.from(await (await fetch(OFFLINE_URL)).arrayBuffer());
  artifact.publishedSha256 = createHash('sha256').update(published).digest('hex');
  artifact.publishedBytes = published.length;
  const local = `${repoRoot}/${OFFLINE_REPO_COPY}`;
  if (existsSync(local)) {
    artifact.repoSha256 = createHash('sha256').update(readFileSync(local)).digest('hex');
    artifact.matchesRepo = artifact.repoSha256 === artifact.publishedSha256;
  }
} catch (error) {
  artifact.error = String(error).slice(0, 200);
}

const out = args.out ?? 'apps.json';
writeFileSync(out, JSON.stringify({ collectedAt: new Date().toISOString(), artifact, locations: results }, null, 2));
console.error(`wrote ${out}`);
