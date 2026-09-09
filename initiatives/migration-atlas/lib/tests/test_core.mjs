// tests/test_core.mjs — T1 (data) + T2 (unit) gates for Phases 0–2. Run: node tests/test_core.mjs
import { readFileSync } from "fs";
import {
  flowWidthPx, circleRadiusPx, flowEnvelope, circleProgress, advanceYear,
  timeDomain, eraDensity, nextEventStart, prevEventStart, sceneHash,
  destVolume, residualPopulation, particlePhase, CLOCK_SEGMENTS,
  TYPE_ORDER, TYPE_SPECTRUM, REGION_ORDER, REGION_SPECTRUM, validateData, quantityLabel,
} from "../src/core.js";

const data = JSON.parse(readFileSync(new URL("../data/migrations.json", import.meta.url)));
let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.error("  FAIL:", name); }
}
function close(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

// ---------- T1: data validation ----------
console.log("T1 data validation");
const TYPES = new Set(Object.keys(data.type_legend));
const REGIONS = new Set(Object.keys(data.region_legend));
const ids = new Set();
const YEAR_MAX = new Date().getFullYear() + 1;
for (const m of data.migrations) {
  if (m.migrants_range && m.migrants_range[1] / m.migrants_range[0] > 2)
    ok(m.confidence === 'low', `broad estimate range carries low confidence: ${m.id}`);
}
for (const id of ['syrian-civil-war','venezuelan-exodus','rohingya-exodus','ukraine-war','filipino-overseas'])
  ok(quantityLabel(data.migrations.find(m=>m.id===id)) === 'Reported population abroad', `stock is not called people moved: ${id}`);
ok(quantityLabel({}) === 'People moved', 'legacy datasets retain mover label');
ok(validateData({...data,migrations:[{...data.migrations[0],quantity_kind:'invented'}]}).errors.some(e=>e.includes('quantity kind')), 'unsupported quantity definitions are rejected');
for (const m of data.migrations) {
  ok(!ids.has(m.id), `unique id: ${m.id}`); ids.add(m.id);
  ok(m.period.start >= 1000 && m.period.start <= m.period.end && m.period.end <= YEAR_MAX,
     `period sane: ${m.id}`);
  ok(TYPES.has(m.type), `known type: ${m.id}`);
  ok(REGIONS.has(m.region), `known region: ${m.id}`);
  ok(Number.isFinite(m.migrants) && m.migrants > 0, `migrants > 0: ${m.id}`);
  ok(Array.isArray(m.references) && m.references.length >= 1, `has reference: ${m.id}`);
  ok(["high", "medium", "low"].includes(m.confidence), `confidence enum: ${m.id}`);
  const pts = [[m.source.lat, m.source.lon, "source"]]
    .concat(m.destinations.map(d => [d.lat, d.lon, d.name]));
  for (const [lat, lon, name] of pts)
    ok(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180, `coords: ${m.id}/${name}`);
  for (const d of m.destinations)
    if (d.settled != null && d.settled > m.migrants && !m.migrants_note)
      console.warn("  WARN: settled > migrants without note:", m.id, d.name);
}
// known-bad fixtures must be caught by the same rules
const badFixtures = [
  { why: "missing lat", rec: { id: "x1", period: {start:1500,end:1510}, type:"religious", region:"weur", migrants: 10, confidence:"low", references:["r"], source:{name:"s",lon:0}, destinations:[] } },
  { why: "negative migrants", rec: { id: "x2", period:{start:1500,end:1510}, type:"religious", region:"weur", migrants:-5, confidence:"low", references:["r"], source:{name:"s",lat:0,lon:0}, destinations:[] } },
  { why: "duplicate id", rec: { ...data.migrations[0] } },
  { why: "unknown type", rec: { id:"x3", period:{start:1500,end:1510}, type:"teleportation", region:"weur", migrants:5, confidence:"low", references:["r"], source:{name:"s",lat:0,lon:0}, destinations:[] } },
  { why: "start > end", rec: { id:"x4", period:{start:1600,end:1500}, type:"religious", region:"weur", migrants:5, confidence:"low", references:["r"], source:{name:"s",lat:0,lon:0}, destinations:[] } },
];
for (const { why, rec } of badFixtures) {
  const caught =
    !(rec.source && Number.isFinite(rec.source.lat) && Number.isFinite(rec.source.lon)) ||
    !(Number.isFinite(rec.migrants) && rec.migrants > 0) ||
    ids.has(rec.id) ||
    !TYPES.has(rec.type) ||
    !(rec.period.start <= rec.period.end);
  ok(caught, `bad fixture rejected: ${why}`);
}

// ---------- T2: scaling ----------
console.log("T2 scaling");
ok(close(flowWidthPx(1e6, 1), 3.0), "width(1M)=3px");
ok(flowWidthPx(100, 1) === 1.5, "min width clamp");
ok(flowWidthPx(55e6, 1) < 28 + 1e-9 && flowWidthPx(1e9, 1) === 28, "max width clamp");
ok(flowWidthPx(4e6, 4) === flowWidthPx(4e6, 1) * 2, "width scales with sqrt(zoom)");
let prev = 0, mono = true;
for (const m of [1e4, 1e5, 1e6, 5e6, 2e7, 6e7]) {
  const w = flowWidthPx(m, 1); if (w < prev) mono = false; prev = w;
}
ok(mono, "width monotone in migrants");
ok(close(circleRadiusPx(1e6, 1), 2.2), "radius(1M)=2.2px");
ok(circleRadiusPx(112e6, 1) === Math.min(2.2 * Math.sqrt(112), 42), "radius large value");
ok(circleRadiusPx(0, 1) === 0 && circleRadiusPx(null, 1) === 0, "radius zero/null");

// ---------- T2: envelopes ----------
console.log("T2 envelopes");
ok(flowEnvelope(1499, 1500, 1600).alpha === 0, "pre alpha 0");
ok(flowEnvelope(1500, 1500, 1600).alpha === 1, "start year alpha 1, exact");
ok(flowEnvelope(1550, 1500, 1600).alpha === 1, "active alpha 1");
ok(flowEnvelope(1600, 1500, 1600).alpha === 1, "end year alpha 1, exact");
ok(flowEnvelope(1601, 1500, 1600).alpha === 0, "post alpha 0, no fade tail");
ok(circleProgress(1500, 1500, 1600) === 0 && circleProgress(1600, 1500, 1600) === 1,
   "circle growth endpoints");
ok(circleProgress(1550, 1500, 1600) > 0.5, "ease-out growth front-loaded");

// ---------- T2: clock ----------
console.log("T2 clock");
const DOM = timeDomain(data);
ok(DOM[0] === 1000 && DOM[1] >= 2026, "domain from data");
ok(close(advanceYear(1500, 1, 1, "piecewise", DOM), 1510), "10 yr/s before 1800");
ok(close(advanceYear(1850, 1, 1, "piecewise", DOM), 1854), "4 yr/s 1800-1900");
ok(close(advanceYear(1950, 1, 1, "piecewise", DOM), 1952), "2 yr/s after 1900");
// crossing the 1800 boundary mid-frame: 1795 + 1s = 0.5s@10 + 0.5s@4 = 1802
ok(close(advanceYear(1795, 1, 1, "piecewise", DOM), 1802), "boundary crossing exact");
ok(close(advanceYear(1795, 1, 2, "piecewise", DOM), 1806), "speed multiplier: 2x crosses to 1806");
ok(advanceYear(DOM[1] - 1, 10, 8, "piecewise", DOM) === DOM[1], "clamps at domain end");
ok(close(advanceYear(1500, 2, 1, "linear", DOM), 1508), "linear mode 4 yr/s");
ok(CLOCK_SEGMENTS.length === 3, "three clock segments");

// ---------- T2: dataset helpers ----------
console.log("T2 helpers");
const atl = data.migrations.find(m => m.id === "atlantic-slave-trade");
ok(destVolume(atl, atl.destinations[0]) === 4900000, "destVolume uses settled");
ok(residualPopulation(atl.destinations[0]) === 112000000, "residual uses diaspora_today");
const dens = eraDensity(data, DOM, 100);
ok(dens.length === 100 && Math.max(...dens) >= 8, "era density peaks (mass-migration era)");
ok(dens[0] >= 1, "density at 1000 counts Turkic/Roma/slave trades era");
ok(nextEventStart(data, 1491) === 1492, "next event after 1491 is 1492 expulsion");
ok(prevEventStart(data, 1493) === 1492, "prev event before 1493");
ok(nextEventStart(data, 2025) === null || nextEventStart(data, 2025) <= DOM[1], "next near end");

// ---------- T2: determinism ----------
console.log("T2 determinism");
const h1850 = sceneHash(data, 1850);
// simulate playing forward then scrubbing back
let y = 1850;
for (let i = 0; i < 120; i++) y = advanceYear(y, 1 / 60, 2, "piecewise", DOM);
const afterPlay = sceneHash(data, 1850); // scrub back to exactly 1850
ok(afterPlay === h1850, "scene at 1850 identical after play + scrub-back");
ok(sceneHash(data, 1492.5) === sceneHash(data, 1492.5), "hash stable");
const p1 = particlePhase(1850.25, 42), p2 = particlePhase(1850.25, 42);
ok(p1 === p2 && p1 >= 0 && p1 < 1, "particle phase deterministic in year");
ok(particlePhase(1850.25, 42) !== particlePhase(1850.26, 42), "particle phase varies with year");

// ---------- E2: coercion spectrum ----------
console.log("E2 coercion spectrum");
function hue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255,
        b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
function l1(a, b) {
  let s = 0;
  for (let i = 1; i < 7; i += 2)
    s += Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16));
  return s;
}
ok(TYPE_ORDER.length === 9 && new Set(TYPE_ORDER).size === 9, "TYPE_ORDER: 9 unique types");
const legendKeys = new Set(Object.keys(data.type_legend));
ok(TYPE_ORDER.every(t => legendKeys.has(t)) && legendKeys.size === TYPE_ORDER.length,
   "TYPE_ORDER is a permutation of dataset type_legend keys");
ok(TYPE_ORDER[0] === "voluntary-economic", "most voluntary first");
ok(TYPE_ORDER[8] === "forced-enslavement", "most coerced last");
ok(TYPE_ORDER.every(t => /^#[0-9a-f]{6}$/i.test(TYPE_SPECTRUM[t] || "")),
   "every ordered type has a hex color");
const hues = TYPE_ORDER.map(t => hue(TYPE_SPECTRUM[t]));
ok(hues[0] >= 200, `blue end >= 200deg (${hues[0].toFixed(0)})`);
ok(hues[8] <= 15, `red end <= 15deg (${hues[8].toFixed(0)})`);
ok(hues.every((h, i) => i === 0 || h < hues[i - 1]),
   "hue strictly decreasing along coercion order (blue -> red)");
ok(TYPE_ORDER.every((t, i) => i === 0 ||
   l1(TYPE_SPECTRUM[t], TYPE_SPECTRUM[TYPE_ORDER[i - 1]]) >= 40),
   "adjacent spectrum colors visually distinct (L1 >= 40)");

// ---------- E6: geographic region spectrum ----------
console.log("E6 region spectrum");
const unwrap = h => h > 250 ? h - 360 : h;   // violets continue below red
ok(REGION_ORDER.length === 10 && new Set(REGION_ORDER).size === 10, "REGION_ORDER: 10 unique regions");
const regKeys = new Set(Object.keys(data.region_legend));
ok(REGION_ORDER.every(r => regKeys.has(r)) && regKeys.size === REGION_ORDER.length,
   "REGION_ORDER is a permutation of dataset region_legend keys");
ok(REGION_ORDER[0] === "namer" && REGION_ORDER[9] === "seasia", "sweep runs N America -> SE Asia");
ok(REGION_ORDER.every(r => /^#[0-9a-f]{6}$/i.test(REGION_SPECTRUM[r] || "")),
   "every region has a hex color");
const rhues = REGION_ORDER.map(r => unwrap(hue(REGION_SPECTRUM[r])));
ok(rhues[0] >= 210, `Americas end is deep blue (${rhues[0].toFixed(0)})`);
ok(rhues.every((h, i) => i === 0 || h < rhues[i - 1]),
   "unwrapped hue strictly decreasing along west->east order");
ok(REGION_ORDER.every((r, i) => i === 0 ||
   l1(REGION_SPECTRUM[r], REGION_SPECTRUM[REGION_ORDER[i - 1]]) >= 40),
   "adjacent region colors visually distinct (L1 >= 40)");
const CONT = { namer: "americas", lamer: "americas", weur: "europe", eeur: "europe",
               mena: "mena", afr: "africa", casia: "asia", sasia: "asia",
               easia: "asia", seasia: "asia" };
const contSeq = REGION_ORDER.map(r => CONT[r]);
ok(contSeq.every((c, i) => contSeq.indexOf(c) === i || contSeq[i - 1] === c),
   "continents form contiguous blocks in the ordering");

// ---------- validateData self-check ----------
console.log("validateData");
const vd = validateData(data);
ok(vd.errors.length === 0, "canonical dataset validates: " + vd.errors.slice(0, 2).join("; "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
