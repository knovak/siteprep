// Fetches the same coast-local day from each location's official hydrographic
// service. One adapter per service; a service that fails is recorded as
// unavailable rather than throwing, so one dead site does not lose the run.
import { readFileSync, writeFileSync } from 'node:fs';
import { fetchJson, fetchText, BROWSER_UA, makeEvent, inZone, shiftDate, sortEvents, todayIn } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true]));
const config = JSON.parse(readFileSync(new URL('../locations.json', import.meta.url)));
const apps = args.apps ? JSON.parse(readFileSync(args.apps)) : null;
const only = args.only ? String(args.only).split(',') : null;
const locations = config.locations.filter((l) => !only || only.includes(l.id));

// The comparison day is whichever coast-local day the apps displayed, so the
// official table lines up with what a reader would have seen on screen.
function targetDate(location) {
  if (args.date) return String(args.date);
  const record = apps?.locations?.[location.id];
  return record?.hosted?.date ?? record?.offline?.date ?? todayIn(location.zone);
}

// ---- adapters -----------------------------------------------------------

async function noaa({ station }, date, zone) {
  const compact = date.replace(/-/g, '');
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=siteprep-tide-compare`
    + `&begin_date=${compact}&end_date=${compact}&datum=MLLW&station=${station}&time_zone=lst_ldt&units=metric&interval=hilo&format=json`;
  const body = await fetchJson(url);
  if (!body.predictions) throw new Error(body.error?.message ?? 'no predictions returned');
  return {
    events: body.predictions.map((p) => makeEvent(p.type, p.t.slice(11, 16), p.v)),
    fetchedFrom: url
  };
}

// CHS returns water levels without labelling turning points, so highs and lows
// are read off the shape of the series.
async function chs({ station }, date, zone) {
  const list = await fetchJson(`https://api-iwls.dfo-mpo.gc.ca/api/v1/stations?code=${station}`);
  if (!list.length) throw new Error(`no CHS station with code ${station}`);
  const series = list[0].timeSeries.find((s) => s.code === 'wlp-hilo');
  if (!series) throw new Error('station has no wlp-hilo series');
  const from = `${shiftDate(date, -1)}T00:00:00Z`;
  const to = `${shiftDate(date, 1)}T23:59:59Z`;
  const url = `https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/${list[0].id}/data?time-series-code=wlp-hilo&from=${from}&to=${to}`;
  const rows = (await fetchJson(url)).map((row) => ({ instant: new Date(row.eventDate), value: row.value }));
  rows.sort((a, b) => a.instant - b.instant);
  const events = rows.map((row, index) => {
    const previous = rows[index - 1]?.value;
    const next = rows[index + 1]?.value;
    const neighbour = previous ?? next;
    if (neighbour === undefined) return null;
    const local = inZone(row.instant, zone);
    return local.date === date ? makeEvent(row.value > neighbour ? 'H' : 'L', local.time, row.value) : null;
  }).filter(Boolean);
  return { events, fetchedFrom: url };
}

async function bom({ station, region, tzJs }, date, zone) {
  const url = `https://www.bom.gov.au/australia/tides/print.php?aac=${station}&type=tide&date=${date}`
    + `&region=${region}&tz=${encodeURIComponent(zone)}&tz_js=${tzJs}&days=1`;
  // Collapse the markup to pipe-separated cells: |High|7:31 am|1.11 m|
  const flat = (await fetchText(url))
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '|')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s*\|\s*/g, '|')
    .replace(/\|+/g, '|');
  const heading = /\|[A-Z][a-z]{2} (\d{1,2}) [A-Z][a-z]{2}\|/.exec(flat);
  if (heading && Number(heading[1]) !== Number(date.slice(8, 10))) {
    throw new Error(`BOM returned ${heading[0].replace(/\|/g, '')}, not ${date}`);
  }
  const events = [];
  const row = /\|(High|Low)\|(\d{1,2}):(\d{2})\s*(am|pm)\|(-?\d+\.\d+)\s*m(?=\|)/gi;
  for (let match = row.exec(flat); match; match = row.exec(flat)) {
    let hour = Number(match[2]) % 12;
    if (match[4].toLowerCase() === 'pm') hour += 12;
    events.push(makeEvent(match[1][0].toUpperCase(), `${String(hour).padStart(2, '0')}:${match[3]}`, match[5]));
  }
  if (!events.length) throw new Error('no tide rows found in the BOM page');
  return { events, fetchedFrom: url };
}

// EasyTide publishes GMT instants at full precision; the rendered page rounds
// heights to 0.1 m, so the JSON is the better reading.
async function ukho({ station }, date, zone) {
  const url = `https://easytide.admiralty.co.uk/Home/GetPredictionData?stationId=${station}`;
  const body = await fetchJson(url, { referer: 'https://easytide.admiralty.co.uk/' });
  const events = (body.tidalEventList ?? []).map((event) => {
    const local = inZone(new Date(`${event.dateTime}Z`), zone);
    return local.date === date ? makeEvent(event.eventType === 0 ? 'H' : 'L', local.time, Number(event.height.toFixed(3))) : null;
  }).filter(Boolean);
  if (!events.length) throw new Error(`EasyTide has no events for ${date} (it publishes 7 days from today)`);
  return { events, fetchedFrom: url };
}

// SHOM's WAF rejects a direct call to the JSON endpoint, so drive the public
// page the way a reader would and capture the response it asks for. The key in
// that URL is SHOM's own and can rotate; nothing here depends on its value.
async function shom({ station }, date, zone) {
  const { loadPlaywright, launchOptions } = await import('./lib.mjs');
  const { chromium } = loadPlaywright(process.env.TIDE_COMPARE_REPO ?? process.cwd());
  const browser = await chromium.launch(launchOptions());
  try {
    const page = await (await browser.newContext({ locale: 'fr-FR', timezoneId: zone })).newPage();
    const url = `https://maree.shom.fr/harbor/${encodeURIComponent(station)}/hlt?date=${date}&utc=standard`;
    const wanted = page.waitForResponse((response) => /\/hdm\/spm\/hlt\?/.test(response.url()) && response.ok(), { timeout: 120000 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 });
    const body = await (await wanted).json();
    const rows = body[date];
    if (!rows) throw new Error(`SHOM returned no rows for ${date}`);
    return {
      events: rows
        .filter((row) => row[0] === 'tide.high' || row[0] === 'tide.low')
        .map((row) => makeEvent(row[0] === 'tide.high' ? 'H' : 'L', row[1], row[2])),
      fetchedFrom: url
    };
  } finally {
    await browser.close();
  }
}

// Fixed-width annual table: 24 hourly heights, then YYMMDD, station code,
// four high-tide slots and four low-tide slots of hhmm+height, 9999 for unused.
async function jma({ station }, date) {
  const [year, month, day] = date.split('-').map(Number);
  const url = `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/${station}.txt`;
  const wanted = [String(year % 100), String(month), String(day)];
  for (const line of (await fetchText(url)).split('\n')) {
    if (line.length < 136) continue;
    if ([line.slice(72, 74), line.slice(74, 76), line.slice(76, 78)].map((s) => s.trim()).join() !== wanted.join()) continue;
    const slots = (offset, kind) => Array.from({ length: 4 }, (_, i) => {
      const clock = line.slice(offset + i * 7, offset + i * 7 + 4);
      const height = line.slice(offset + i * 7 + 4, offset + i * 7 + 7);
      if (clock.includes('9999')) return null;
      return makeEvent(kind, `${String(Number(clock.slice(0, 2))).padStart(2, '0')}:${clock.slice(2)}`, Number(height) / 100);
    }).filter(Boolean);
    return { events: [...slots(80, 'H'), ...slots(108, 'L')], fetchedFrom: url };
  }
  throw new Error(`JMA table has no row for ${date}`);
}

const ADAPTERS = { noaa, chs, bom, ukho, shom, jma };

// ---- run ----------------------------------------------------------------

const results = {};
for (const location of locations) {
  const date = targetDate(location);
  const record = { date, kind: location.official.kind, station: location.official.name, datum: location.official.datum, url: location.official.url };
  try {
    const adapter = ADAPTERS[location.official.kind];
    if (!adapter) throw new Error(`no adapter for ${location.official.kind}`);
    const { events, fetchedFrom } = await adapter(location.official, date, location.zone);
    record.events = sortEvents(events);
    record.fetchedFrom = fetchedFrom;
  } catch (error) {
    record.unavailable = String(error.message ?? error).slice(0, 220);
  }
  results[location.id] = record;
  console.error(`official ${location.id} (${date}) -> ${record.events ? `${record.events.length} events` : `UNAVAILABLE: ${record.unavailable}`}`);
  await new Promise((resolve) => setTimeout(resolve, 1200)); // stay polite to the public services
}

const out = args.out ?? 'official.json';
writeFileSync(out, JSON.stringify({ collectedAt: new Date().toISOString(), locations: results }, null, 2));
console.error(`wrote ${out}`);
