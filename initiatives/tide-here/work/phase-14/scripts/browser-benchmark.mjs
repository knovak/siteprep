import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {build} from 'vite';

// This compares browser request paths, not a real Australian network location.
// All API responses are recorded/mocked; no external provider is contacted.
const workRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = resolve(workRoot, '../../..');
const options = Object.fromEntries(process.argv.slice(2).map(value => {
  const match = /^--([^=]+)=(.*)$/.exec(value);
  if (!match) throw new Error('Use --repetitions=5 --latencies=150,250 --output=/absolute/result.json');
  return [match[1], match[2]];
}));
const repetitions = Number(options.repetitions ?? 5);
const latencies = (options.latencies ?? '150,250').split(',').map(Number);
assert(Number.isInteger(repetitions) && repetitions > 0);
assert(latencies.length > 0 && latencies.every(value => Number.isFinite(value) && value >= 0));
const baselineCommit = options.baseline ?? '195cf6435';
const original = path => execFileSync('git', ['show', `${baselineCommit}:initiatives/tide-here/work/${path}`], {
  cwd: repositoryRoot, encoding: 'utf8',
});
const baselineApp = original('phase-6/app.mjs');
const baselineClient = original('phase-6/src/stored-tide-client.mjs');
let runtimeOnlyApp = baselineApp;
for (const path of [
  '../phase-2/data/catalogue-slices.fixture.json',
  '../phase-1/data/time-zones.fixture.geojson',
  '../phase-0/fixtures/noaa-seattle-hilo.json',
  '../phase-0/fixtures/chs-halifax-hilo.json',
  './data/australia-stations.json',
]) {
  assert(runtimeOnlyApp.includes(`json('${path}')`));
  runtimeOnlyApp = runtimeOnlyApp.replace(`json('${path}')`, `fixtureMode ? json('${path}') : null`);
}
runtimeOnlyApp = runtimeOnlyApp.replace(
  'const fixtureStations = normalizeStationCatalogues(catalogueFixture, providerConfig);',
  'const fixtureStations = fixtureMode ? normalizeStationCatalogues(catalogueFixture, providerConfig) : null;',
);
const finalApp = await readFile(join(workRoot, 'phase-6/app.mjs'), 'utf8');
const finalClient = await readFile(join(workRoot, 'phase-6/src/stored-tide-client.mjs'), 'utf8');
const appPath = join(workRoot, 'phase-6/app.mjs');
const clientPath = join(workRoot, 'phase-6/src/stored-tide-client.mjs');

async function bundle(app, client) {
  const output = await build({
    configFile: false, publicDir: false, logLevel: 'silent',
    plugins: [{
      name: 'benchmark-source-variant',
      load(id) {
        if (id === appPath) return app;
        if (id === clientPath) return client;
      },
    }],
    build: {
      write: false, target: 'es2022', minify: true,
      lib: {entry: appPath, formats: ['es'], fileName: () => 'app.mjs'},
    },
  });
  const chunks = (Array.isArray(output) ? output : [output]).flatMap(result => result.output);
  assert.equal(chunks.length, 1, 'The deployed browser bundle must remain one request');
  return chunks[0].code;
}

const variants = [
  {id: 'baseline', app: baselineApp, client: baselineClient},
  {id: 'runtime-data-only', app: runtimeOnlyApp, client: baselineClient},
  {id: 'bundled-runtime-data', app: await bundle(runtimeOnlyApp, baselineClient), client: baselineClient},
  {id: 'final-prefetch-cache', app: await bundle(finalApp, finalClient), client: finalClient},
];
const catalogue = JSON.parse(await readFile(join(workRoot, 'phase-6/data/australia-stations.json'), 'utf8'));
const station = catalogue.stations.find(value => value.id === 'au-qld-mooloolaba');
assert(station, 'The Australian benchmark port must exist');
const byVariant = new Map(variants.map(value => [value.id, value]));
let currentLatency = 0;
let requestLog = [];

function forecast(body) {
  const selected = catalogue.stations.find(value => value.id === body.station.id);
  assert(selected);
  return {
    input: body.context.input, place: body.context.place, coast: body.context.coast,
    station: selected, timeZone: body.timeZone,
    previousTide: {type: 'high', at: new Date(Date.parse(body.rows[0].startUtc) - 3_600_000).toISOString(), height: 1.8, unit: 'm'},
    days: body.rows.map(row => ({
      date: row.date,
      tides: [2, 8, 14, 20].map((hour, index) => ({
        type: index % 2 ? 'high' : 'low',
        at: new Date(Date.parse(row.startUtc) + hour * 3_600_000).toISOString(),
        height: index % 2 ? 1.8 : 0.4, unit: 'm',
      })),
      sunrise: [], sunset: [], moonrise: [], moonset: [], moonPhase: null,
    })),
    sources: [{provider: body.provider, dataClass: 'benchmark-recorded-response', official: true}],
    warnings: [],
  };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let body;
    let type = 'application/json';
    if (url.pathname === '/stations') {
      body = JSON.stringify(catalogue);
    } else if (url.pathname === '/forecast' && request.method === 'POST') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      body = JSON.stringify(forecast(JSON.parse(Buffer.concat(chunks))));
    } else {
      const match = /^\/run\/([^/]+)\/(.+)$/.exec(url.pathname);
      if (!match || !byVariant.has(match[1]) || match[2].includes('..')) throw new Error('Unexpected path');
      const variant = byVariant.get(match[1]);
      const path = match[2];
      body = path === 'phase-6/app.mjs' ? variant.app
        : path === 'phase-6/src/stored-tide-client.mjs' ? variant.client
        : await readFile(join(workRoot, path));
      type = path.endsWith('.mjs') ? 'application/javascript'
        : path.endsWith('.html') ? 'text/html'
        : path.endsWith('.css') ? 'text/css' : 'application/json';
    }
    requestLog.push({path: url.pathname, method: request.method, bytes: Buffer.byteLength(body)});
    await delay(currentLatency);
    response.writeHead(200, {'content-type': type, 'cache-control': 'no-store'});
    response.end(body);
  } catch (error) {
    if (request.url !== '/favicon.ico') console.error(error.message);
    response.writeHead(404);
    response.end('Not found');
  }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const samples = [];
try {
  browser = await chromium.launch({headless: true});
  for (const latencyMs of latencies) {
    currentLatency = latencyMs;
    for (let repetition = 0; repetition < repetitions; repetition += 1) {
      // Rotate order to spread browser/JIT warmup across all options.
      const ordered = [...variants.slice(repetition % variants.length), ...variants.slice(0, repetition % variants.length)];
      for (const variant of ordered) {
        const context = await browser.newContext({viewport: {width: 430, height: 932}});
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await context.route('**/*', route => {
          if (route.request().url().startsWith(`${origin}/`)) return route.continue();
          pageErrors.push(`Unexpected external request: ${route.request().url()}`);
          return route.abort();
        });
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'geolocation', {value: {
            getCurrentPosition(success) { success({coords: {latitude: -26.65, longitude: 153.09}}); },
          }});
          window.__benchmarkReady = null;
          new MutationObserver(() => {
            if (!window.__benchmarkReady && document.querySelectorAll('.day-card').length === 5
                && document.querySelector('#result')?.hidden === false
                && document.querySelector('#loading-status')?.hidden === true) {
              window.__benchmarkReady = performance.now();
            }
          }).observe(document, {subtree: true, childList: true, attributes: true});
        });
        await page.route('https://nominatim.openstreetmap.org/**', async route => {
          requestLog.push({path: 'mock-nominatim', method: 'GET', bytes: 0});
          await delay(latencyMs);
          await route.fulfill({json: {display_name: 'Maroochydore, Queensland, Australia', lat: '-26.65', lon: '153.09'}});
        });
        for (const state of ['cold', 'warm']) {
          requestLog = [];
          await page.goto(`${origin}/run/${variant.id}/phase-6/index.html`, {waitUntil: 'domcontentloaded'});
          await page.waitForFunction(() => window.__benchmarkReady !== null, null, {timeout: 30_000});
          const result = await page.evaluate(() => ({
            readyMs: window.__benchmarkReady,
            station: document.querySelector('#station-name').textContent,
            cards: [...document.querySelectorAll('.day-card')].map(card => card.dataset.date),
            tideEvents: [...document.querySelectorAll('.tide-label')].map(label => label.textContent),
          }));
          assert.equal(result.station, station.name);
          assert.equal(result.cards.length, 5);
          assert.equal(result.tideEvents.length, 20);
          assert.deepEqual(pageErrors, []);
          samples.push({variant: variant.id, latencyMs, repetition: repetition + 1, state,
            readyMs: Math.round(result.readyMs), requestCount: requestLog.length,
            bytes: requestLog.reduce((sum, value) => sum + value.bytes, 0),
            dataRequests: requestLog.filter(value => ['/stations', '/forecast', 'mock-nominatim'].includes(value.path)).map(value => value.path),
          });
        }
        await context.close();
      }
    }
  }
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = latencies.flatMap(latencyMs => variants.flatMap(variant => ['cold', 'warm'].map(state => {
  const matching = samples.filter(value => value.variant === variant.id && value.latencyMs === latencyMs && value.state === state);
  return {
    variant: variant.id, latencyMs, state, runs: matching.length,
    medianReadyMs: median(matching.map(value => value.readyMs)),
    minReadyMs: Math.min(...matching.map(value => value.readyMs)),
    maxReadyMs: Math.max(...matching.map(value => value.readyMs)),
    medianRequestCount: median(matching.map(value => value.requestCount)),
    medianBytes: median(matching.map(value => value.bytes)),
  };
})));
const report = {
  schema: 'tide-here/browser-performance/v1', baselineCommit,
  measuredAt: new Date().toISOString(), repetitions, latenciesMs: latencies,
  description: 'Chromium 430x932, recorded Mooloolaba official-port forecast, fixed per-response delay on local HTTP and mocked geocoding. No real Australian probe or external provider request. HTTP asset caching disabled in every variant to isolate browser data caches. Warm means same browser storage after one successful cold load.',
  metric: 'Navigation start to five visible forecast cards and loading indicator hidden, measured by browser MutationObserver.',
  summary, samples,
};
if (options.output) await writeFile(resolve(options.output), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
