// SBDC Night-Sky Simulator — text and number formatting (beta). Developed by Ken Novak and David Sandalow, draft for review 2026-07-20
/**
 * sbdc format — small pure functions the page uses to turn model values into
 * the text and control values a person sees. No DOM and no simulation, so the
 * Node tests cover them directly.
 *
 * Every top-level name starts with "format" or "FORMAT" because the build
 * puts all source files in one scope.
 */

/** Hours (any real number) -> "HH:MM", rounded to the minute, 00:00-23:59. */
export function formatClock(hours) {
  const minutes = Math.round((((hours % 24) + 24) % 24) * 60) % 1440;
  const two = (n) => String(n).padStart(2, "0");
  return `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`;
}

/** Signed difference a - b between two clock times, in hours, in (-12, 12]. */
export function formatClockDelta(a, b) {
  const d = (((a - b) % 24) + 24) % 24;
  return d > 12 ? d - 24 : d;
}

/**
 * Where a solar time sits relative to the nearer of sunset and sunrise.
 * Returns { ref: "sunset" | "sunrise", minutes } with minutes positive after
 * the event and negative before it, or null when the Sun neither sets nor
 * rises on that day (sunset and sunrise both null).
 */
export function formatTwilightOffset(solarTimeHours, sunsetHours, sunriseHours) {
  let best = null;
  for (const [ref, at] of [["sunset", sunsetHours], ["sunrise", sunriseHours]]) {
    if (at == null) continue;
    const minutes = Math.round(formatClockDelta(solarTimeHours, at) * 60);
    if (!best || Math.abs(minutes) < Math.abs(best.minutes)) best = { ref, minutes };
  }
  return best;
}

/**
 * Satellite totals the Satellites slider moves to when its own value is
 * within 1% of one. The slider is logarithmic, so without this its positions
 * land on 501,000 or 251,000 and the round totals cannot be chosen.
 */
export const FORMAT_ROUND_SATELLITE_COUNTS = [
  10000, 20000, 25000, 50000, 75000, 100000, 150000, 200000, 250000,
  300000, 400000, 500000, 600000, 750000, 800000, 1000000,
];

/** Satellites slider position (0-100) -> satellite total, 10,000 to 1,000,000. */
export function formatSatelliteCount(position) {
  const n = Math.round(10000 * Math.pow(100, position / 100) / 1000) * 1000;
  // 300,000 is the report's default and keeps its original, wider window
  if (Math.abs(n - 300000) <= 5000) return 300000;
  for (const round of FORMAT_ROUND_SATELLITE_COUNTS) {
    if (Math.abs(n - round) <= round * 0.01) return round;
  }
  return n;
}

/**
 * A shell list as one line for the hint under the custom-shells box: every
 * shell when there are few, a count and the altitude range when there are many.
 */
export function formatShellSummary(shells) {
  if (shells.length <= 6) {
    return shells.map((s) => `${s.altKm} km ${(s.share * 100).toFixed(0)}%`).join(" · ");
  }
  const alts = shells.map((s) => s.altKm);
  const km = (v) => Math.round(v).toLocaleString("en-US");
  return `${shells.length} shells · ${km(Math.min(...alts))}–${km(Math.max(...alts))} km`;
}

/**
 * A ratio as a person would say it: "23×", "2.4×", "1/3.5", "1/1,300".
 * Above 1 it is a multiple; below 1 it is one part in so many.
 */
export function formatRatio(ratio) {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return "0";
  const number = (v) => (v >= 9.95 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1));
  if (ratio >= 0.95) return `${number(ratio)}×`;
  return `1/${number(1 / ratio)}`;
}
