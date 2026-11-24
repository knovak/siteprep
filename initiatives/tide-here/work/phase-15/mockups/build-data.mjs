// Builds mockup-data.json for the extremity-indicator mockups from one year of
// NOAA high/low predictions for Seattle (9447130). Run from this directory:
//   node build-data.mjs <path-to-noaa-year.json>
// The NOAA year file is the response of
//   datagetter?product=predictions&interval=hilo&datum=MLLW&units=metric
//   &time_zone=gmt&station=9447130&begin_date=20260101&end_date=20261231
import {readFileSync, writeFileSync} from 'node:fs';
import {calculateAstronomyDay, calculateMoonPhase} from '../../phase-4/src/astronomy.mjs';
import {fiveLocalDays, localDateForInstant} from '../../phase-1/src/day-model.mjs';
import {coastDateLabel, formatCoastTime, tideProgress} from '../../phase-6/src/page-view.mjs';

const zone = 'America/Los_Angeles';
const station = {latitude: 47.6026, longitude: -122.3393};
const now = new Date('2026-11-24T20:30:00Z'); // 12:30 PM in Seattle
const year = JSON.parse(readFileSync(process.argv[2], 'utf8')).predictions.map((row) => ({
  type: row.type === 'H' ? 'high' : 'low',
  at: new Date(`${row.t.replace(' ', 'T')}:00Z`).toISOString(),
  height: Number(row.v)
}));

const PROBABILITIES = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.98, 0.99];
function quantiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return PROBABILITIES.map((p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]);
}
const highs = year.filter((e) => e.type === 'high').map((e) => e.height);
const lows = year.filter((e) => e.type === 'low').map((e) => e.height);
const thresholds = {probabilities: PROBABILITIES, high: quantiles(highs), low: quantiles(lows), highCount: highs.length, lowCount: lows.length};

// "Among the highest N%" of the year's high tides (or lowest N% of lows):
// N is the share of same-type events at least as extreme, rounded up.
function top(event) {
  const list = event.type === 'high' ? highs : lows;
  const asExtreme = event.type === 'high'
    ? list.filter((h) => h >= event.height).length
    : list.filter((h) => h <= event.height).length;
  return Math.max(1, Math.ceil(100 * asExtreme / list.length));
}
function tier(event) {
  const n = top(event);
  return n <= 2 ? 'exceptional' : n <= 10 ? 'notable' : null;
}

const rows = fiveLocalDays(now, zone);
const progress = tideProgress(year, now);
const days = rows.map((row) => {
  const date = row.date;
  const astronomy = calculateAstronomyDay(row, {...station, timeZone: zone});
  const tides = year.filter((e) => localDateForInstant(e.at, zone) === date).map((e) => ({
    type: e.type === 'high' ? 'High tide' : 'Low tide',
    kind: e.type,
    time: formatCoastTime(e.at, zone),
    height: `${e.height.toFixed(2)} m`,
    value: e.height,
    isPast: Date.parse(e.at) < now.getTime(),
    tier: tier(e),
    top: top(e)
  }));
  const isToday = date === localDateForInstant(now, zone);
  const phase = isToday ? calculateMoonPhase(now) : astronomy.moonPhase;
  return {
    date,
    label: `${isToday ? 'Today · ' : ''}${coastDateLabel(date)}`,
    isToday,
    tides,
    moonrise: astronomy.moonrise.map((i) => formatCoastTime(i, zone)).join(', ') || 'Does not rise',
    moonPhase: {phase: phase.phase, name: phase.name}
  };
});
writeFileSync('mockup-data.json', `${JSON.stringify({station: 'Seattle, Puget Sound (NOAA 9447130)', datum: 'MLLW', year: 2026, thresholds, progress, days}, null, 2)}\n`);
console.log(JSON.stringify(thresholds));
for (const d of days) console.log(d.label, d.tides.map((t) => `${t.kind[0]} ${t.time} ${t.value} ${t.tier ?? '-'} top ${t.top}%`).join(' | '), '| moon', d.moonPhase.name);
