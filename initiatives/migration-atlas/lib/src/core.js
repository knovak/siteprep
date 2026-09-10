// core.js — pure functions for the Migration Atlas (no DOM, no d3).
// Exported for node tests; the build strips `export ` for the browser bundle.

export const FADE_YEARS = 5;   // residual-circle framing after end (not arc visibility)

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ---- visual scaling -------------------------------------------------------
// Arrow width in px at world zoom (k=1): w = 3.0 * sqrt(millions), clamped to
// [1.5, 28]; scales with sqrt(zoom) so world-scale comparisons survive zooming.
export function flowWidthPx(migrants, k = 1) {
  const base = 3.0 * Math.sqrt(Math.max(migrants, 0) / 1e6);
  return clamp(base, 1.5, 28) * Math.sqrt(k);
}

// Residual circle: AREA proportional to diaspora -> radius ~ sqrt(diaspora).
export function circleRadiusPx(population, k = 1) {
  if (!population || population <= 0) return 0;
  const base = 2.2 * Math.sqrt(population / 1e6);
  return clamp(base, 2, 42) * Math.sqrt(k);
}

export function easeOutCubic(t) { const u = clamp(t, 0, 1) - 1; return u * u * u + 1; }

// ---- time envelopes -------------------------------------------------------
// Flow visibility envelope: absent before start, fully visible for the exact
// [start, end] period the data claims, absent after end.
export function flowEnvelope(year, start, end) {
  if (year < start) return { alpha: 0, phase: "pre" };
  if (year <= end) return { alpha: 1, phase: "active" };
  return { alpha: 0, phase: "post" };
}

// Residual circle growth: eases up during the migration, persists at 1 after.
export function circleProgress(year, start, end) {
  if (year <= start) return 0;
  if (year >= end) return 1;
  return easeOutCubic((year - start) / Math.max(end - start, 1e-9));
}

// ---- playback clock -------------------------------------------------------
// Piecewise clock: sparse centuries pass quickly. [fromYear, toYear, years/sec]
export const CLOCK_SEGMENTS = [[-Infinity, 1800, 10], [1800, 1900, 4], [1900, Infinity, 2]];
export const LINEAR_RATE = 4; // years/sec in linear mode

export function advanceYear(year, dtSec, speed, mode, domain) {
  const [lo, hi] = domain;
  if (mode === "linear") return clamp(year + dtSec * LINEAR_RATE * speed, lo, hi);
  let t = dtSec * speed, y = year;
  let guard = 0;
  while (t > 1e-9 && y < hi && guard++ < 10) {
    const seg = CLOCK_SEGMENTS.find(s => y < s[1]);
    const rate = seg[2];
    const secsToSegEnd = (Math.min(seg[1], hi) - y) / rate;
    if (secsToSegEnd >= t) { y += t * rate; t = 0; }
    else { y = Math.min(seg[1], hi); t -= secsToSegEnd; }
  }
  return clamp(y, lo, hi);
}

// ---- dataset helpers ------------------------------------------------------
export function timeDomain(data) {
  let lo = Infinity, hi = -Infinity;
  for (const m of data.migrations) {
    lo = Math.min(lo, m.period.start);
    hi = Math.max(hi, m.period.end);
  }
  // Keep the opening year before the first recorded migration, so Home and
  // the beginning of the scrubber can show a map without flows or circles.
  return [lo - 1, hi];
}

// Volume attributed to one destination arrow (people who moved there).
export function destVolume(migration, dest) {
  if (dest.settled != null) return dest.settled;
  return migration.migrants / migration.destinations.length;
}

// Population shown by the residual circle.
export function residualPopulation(dest) {
  return dest.diaspora_today != null ? dest.diaspora_today : (dest.settled || 0);
}

// Histogram of "active migration count" per year-bin, for the scrubber strip.
export function eraDensity(data, domain, nbins = 160) {
  const [lo, hi] = domain, out = new Array(nbins).fill(0);
  for (let i = 0; i < nbins; i++) {
    const y = lo + (i + 0.5) / nbins * (hi - lo);
    for (const m of data.migrations)
      if (flowEnvelope(y, m.period.start, m.period.end).alpha > 0) out[i]++;
  }
  return out;
}

export function nextEventStart(data, year) {
  let best = null;
  for (const m of data.migrations) {
    const s = m.period.start;
    if (s > year + 1e-9 && (best === null || s < best)) best = s;
  }
  return best;
}

export function prevEventStart(data, year) {
  let best = null;
  for (const m of data.migrations) {
    const s = m.period.start;
    if (s < year - 1e-9 && (best === null || s > best)) best = s;
  }
  return best;
}

// Deterministic particle phase: a pure function of (year, seed) so scrubbing
// backward reproduces identical frames.
export function particlePhase(year, seed) {
  const v = year * 0.35 + seed * 0.6180339887;
  return v - Math.floor(v);
}

// Tiny string hash for per-flow seeds / bow direction.
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

// ---- coercion spectrum (extension E2) --------------------------------------
// Canonical ordering of migration types from most voluntary to most coerced,
// mapped onto the visible spectrum: blue (voluntary) -> red (coerced).
// This ordering is a tested requirement; hues descend monotonically.
export const TYPE_ORDER = [
  "voluntary-economic",    // ~211° blue
  "colonial-settlement",   // ~185° cyan
  "conquest-migration",    // ~157° sea green
  "religious",             // ~118° green
  "indentured-labor",      // ~80°  yellow-green
  "refugee-flight",        // ~48°  yellow
  "internal-forced",       // ~32°  orange
  "forced-expulsion",      // ~16°  orange-red
  "forced-enslavement",    // ~0°   red
];
export const TYPE_SPECTRUM = {
  "voluntary-economic": "#5aa2f0",
  "colonial-settlement": "#47c9d6",
  "conquest-migration": "#4fd6a3",
  "religious": "#6fd457",
  "indentured-labor": "#b4d94a",
  "refugee-flight": "#f2ca45",
  "internal-forced": "#f59e42",
  "forced-expulsion": "#f26e45",
  "forced-enslavement": "#ee4747",
};

// ---- geographic region spectrum (extension E6) -----------------------------
// Regions sweep west -> east with continents contiguous in hue: Americas in
// blues, Europe in greens, MENA gold, Sub-Saharan Africa brown, Asia through
// orange/red/crimson to SE Asia violet. Unwrapped hue decreases monotonically
// (222deg down through 0deg into the violets); this is a tested requirement.
export const REGION_ORDER = [
  "namer",   // ~222deg deep blue
  "lamer",   // ~199deg sky blue
  "weur",    // ~150deg deep green
  "eeur",    // ~78deg  yellow-green
  "mena",    // ~50deg  gold
  "afr",     // ~30deg  brown
  "casia",   // ~21deg  peach-orange
  "sasia",   // ~0deg   red
  "easia",   // ~337deg crimson-pink
  "seasia",  // ~285deg violet
];
export const REGION_SPECTRUM = {
  namer: "#4a7de8", lamer: "#62c4ee", weur: "#37b070", eeur: "#a7cf4d",
  mena: "#e8cf4e", afr: "#b5793f", casia: "#f0925f", sasia: "#ee5d5d",
  easia: "#e8478a", seasia: "#c86ee8",
};

// Shared dataset validation — used by the T1 test gate AND by the app's
// drag-and-drop data loader, so contributors get the same errors everywhere.
// Stocks and repeated movements must not be labelled as unique people moved.
export const QUANTITY_LABELS = {
  movers: 'People moved', stock: 'Reported population abroad',
  'post-migration-population': 'Post-migration population',
  displacement: 'Displaced people, including internal displacement',
  circular: 'Cumulative movements, including repeat moves',
};
export function quantityLabel(m) {
  return QUANTITY_LABELS[m.quantity_kind || 'movers'] || 'Reported estimate';
}

export function validateData(data) {
  const errors = [], warnings = [];
  if (!data || !Array.isArray(data.migrations)) {
    return { errors: ["migrations array missing"], warnings };
  }
  const types = new Set(Object.keys(data.type_legend || {}));
  const regions = new Set(Object.keys(data.region_legend || {}));
  const ids = new Set();
  const ymax = new Date().getFullYear() + 1;
  for (const m of data.migrations) {
    const tag = m.id || m.name || "?";
    if (!m.id) errors.push(`missing id: ${tag}`);
    else if (ids.has(m.id)) errors.push(`duplicate id: ${m.id}`);
    else ids.add(m.id);
    if (!m.period || !Number.isFinite(m.period.start) || !Number.isFinite(m.period.end) ||
        m.period.start > m.period.end || m.period.start < 1000 || m.period.end > ymax)
      errors.push(`bad period: ${tag}`);
    if (!types.has(m.type)) errors.push(`unknown type '${m.type}': ${tag}`);
    if (!regions.has(m.region)) errors.push(`unknown region '${m.region}': ${tag}`);
    if (!(Number.isFinite(m.migrants) && m.migrants > 0)) errors.push(`migrants must be > 0: ${tag}`);
    if (m.quantity_kind != null && !Object.hasOwn(QUANTITY_LABELS, m.quantity_kind))
      errors.push(`unknown quantity kind: ${tag}`);
    if (!Array.isArray(m.references) || m.references.length < 1) errors.push(`needs a reference: ${tag}`);
    if (!["high", "medium", "low"].includes(m.confidence)) errors.push(`bad confidence: ${tag}`);
    if (!Array.isArray(m.destinations) || m.destinations.length < 1)
      errors.push(`needs >= 1 destination: ${tag}`);
    const pts = [["source", m.source]].concat((m.destinations || []).map(d => [d.name, d]));
    for (const [nm, p] of pts) {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) ||
          p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180)
        errors.push(`bad coords (${nm}): ${tag}`);
    }
    for (const d of m.destinations || [])
      if (d.settled != null && d.settled > m.migrants && !m.migrants_note)
        warnings.push(`settled > migrants without note: ${tag}/${d.name}`);
  }
  return { errors, warnings };
}

// Full computed scene state at a year — used by the determinism test and by
// the renderer. Pure function of (data, year).
export function sceneState(data, year) {
  const rows = [];
  for (const m of data.migrations) {
    const env = flowEnvelope(year, m.period.start, m.period.end);
    const grow = circleProgress(year, m.period.start, m.period.end);
    for (const d of m.destinations) {
      rows.push({
        id: m.id, dest: d.name,
        alpha: Math.round(env.alpha * 1e6) / 1e6,
        phase: env.phase,
        width: Math.round(flowWidthPx(destVolume(m, d)) * 1e6) / 1e6,
        radius: Math.round(circleRadiusPx(residualPopulation(d)) * grow * 1e6) / 1e6,
      });
    }
  }
  return rows;
}

export function sceneHash(data, year) {
  return JSON.stringify(sceneState(data, year));
}
