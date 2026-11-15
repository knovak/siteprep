// The sixteen paired cases of the 12 October 2026 comparison document, as a
// regression check. `site1` holds what this simulator reported on that date
// (`whole_sky_visible`) and what the same settings give now
// (`after_twilight_correction`). `site2` holds what
// sdross0/orbital-datacenter-brightness reported for the matching case; those
// numbers are the targets the upgrade units compare against.
//
// Until Unit 3 this file reproduced the counts of that date exactly, in all
// 16 cases. Unit 3 corrected the twilight sky-brightness table, which moved
// them, so the fixture now carries both sets.
//
// A model change that is meant to move the current numbers updates
// fixtures/paired-comparisons.json in the same pull request and says why,
// the same rule as for golden/golden.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as M from "../src/model.js";
import { settingsParseDate, settingsParseTime } from "../src/settings.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const data = read("../data/sbdc-data.json");
const catalog = read("../data/bsc-reduced.json");
const paired = read("./fixtures/paired-comparisons.json");

const setup = paired.site1_setup;
const shells = M.parseShellSpec(setup.custom_shells);
const constellation = M.generateConstellation(M.defaultConfig(data, {
  totalSats: setup.satellites,
  ssoFraction: setup.sso_percent / 100,
  shells,
  trains: setup.launch_trains,
  seed: setup.seed,
}), data);

test("paired cases: the shell spec is the 54 levels of the filing's three SSO bands", () => {
  assert.equal(shells.length, 54);
  assert.equal(shells[0].altKm, 565);
  assert.equal(shells[53].altKm, 1002);
  const total = shells.reduce((a, s) => a + s.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-12, "shares are normalised");
});

for (const c of paired.cases) {
  const state = (brightnessRefMag) => ({
    latDeg: c.site1.latitude,
    doy: settingsParseDate(c.date),
    solarTimeHours: settingsParseTime(c.solar_time).clock / 60,
    userLimitingMag: c.site1.eye_limit_mag,
    brightnessRefMag,
  });
  test(`paired ${c.pair}: ${c.title} - the document's Site 1 settings, with the corrected twilight sky`, () => {
    const bright = M.summarize(constellation, state(1.0), data, catalog);
    const faint = M.summarize(constellation, state(6.0), data, catalog);
    assert.equal(bright.visible, c.site1.brightness_1_0.after_twilight_correction, "reference brightness +1.0");
    assert.equal(faint.visible, c.site1.brightness_6_0.after_twilight_correction, "reference brightness +6.0");
    assert.equal(bright.sunAltDeg, c.site1.sun_altitude_deg);
  });
}

test("paired cases: what the twilight correction did to the documented counts", () => {
  // The corrected table is brighter than the old one with the Sun less than
  // 12 degrees down and slightly darker from there to 18 degrees. So the
  // documented counts fall in the twilight cases and rise a little in the
  // darker ones. London is held by its eye limit of 5.2 and barely moves.
  for (const c of paired.cases) {
    for (const key of ["brightness_1_0", "brightness_6_0"]) {
      const was = c.site1[key].whole_sky_visible, now = c.site1[key].after_twilight_correction;
      if (was === 0) { assert.equal(now, 0, `${c.pair} ${key}`); continue; }
      const ratio = now / was;
      if (c.site1.sun_altitude_deg > -12) assert.ok(ratio <= 1.001 && ratio > 0.75, `${c.pair} ${key}: ${ratio.toFixed(3)}`);
      else assert.ok(ratio >= 1 && ratio < 1.25, `${c.pair} ${key}: ${ratio.toFixed(3)}`);
    }
  }
});

test("paired cases: Site 1 and Site 2 agree on scale in the bright case", () => {
  // The document's own summary: similar whole-sky totals, different pictures.
  // Recorded here so a later change to the photometry shows up as a moved
  // ratio. The June and Sydney cases have small counts and are left out.
  for (const c of paired.cases) {
    const s1 = c.site1.brightness_1_0.whole_sky_visible;
    const s2 = c.site2.no_mitigation.whole_sky_visible;
    if (s2 < 5000) continue;
    assert.ok(s1 / s2 > 0.7 && s1 / s2 < 1.2, `${c.pair}: Site 1 / Site 2 = ${(s1 / s2).toFixed(2)}`);
  }
});

/* ---------------- the sdross0 settings against Site 2's counts ---------------- */

// The constellation, brightness models and naked-eye threshold of the three
// sdross0 presets, at Site 2's latitude, solar time and Bortle class for each
// pair. The counts are compared with the whole-sky counts Site 2 reported.
// They are not expected to be equal: the two simulators draw their plane
// nodes independently (Site 2 states about 2% scatter between layouts without
// mitigation and about 30% with it at an equinox), and their twilight curves
// differ.
const sdross0 = M.generateConstellation(M.defaultConfig(data, {
  totalSats: paired.site2_setup.satellites,
  ssoFraction: 1,
  trains: 0,
  seed: 12345,
  shells: data.scenario.shellPresets.value["filed-sso"],
  planeLayout: "filed",
  ltanSpreadMinutes: paired.site2_setup.plane_spread_deg * 4,
  m0Sigma: 0,
}), data);

// Allowed ratio of this simulator's count to Site 2's, by pair. The bands
// say what each is wide for:
//   dark      Sun more than 15 degrees down. The two limits agree to about
//             0.1 magnitude, and extinction differs by 0.05 per airmass.
//   twilight  Sun 10 to 12 degrees down. This simulator's twilight sky is
//             Patat et al.'s, measured at Paranal, which is about half a
//             magnitude darker here than the curve Site 2 uses.
//   marginal  Site 2's count is small because the satellites are near the
//             limit of visibility. A tenth of a magnitude changes such a
//             count by half, and one plane layout differs from another by
//             a factor of three (six layouts gave 329 to 1,194 for pair 02).
// Before Unit 3 corrected the sky and added the Schaefer threshold, the
// twilight rows were 1.11 and 1.17 without mitigation and 3.9 and 3.1 with.
const BANDS = {
  "01-02": { none: [0.8, 1.1], mini: [0.2, 1.2], why: "dark; mini marginal" },
  "03-04": { none: [0.8, 1.1], mini: [0.4, 1.2], why: "dark; mini marginal" },
  "05-06": { none: [0.8, 1.1], mini: [0.15, 1.2], why: "dark; mini marginal" },
  "07-08": { none: [0.85, 1.1], mini: [0.85, 1.2], why: "dark" },
  "09-10": { none: [0.4, 1.6], mini: null, why: "marginal" },
  "11-12": { none: [0.9, 1.15], mini: [1, 2.5], why: "twilight" },
  "13-14": { none: [0.35, 1.3], mini: null, why: "marginal" },
  "15-16": { none: [0.9, 1.15], mini: [0.8, 1.8], why: "twilight, Bortle 5" },
};

for (const c of paired.cases) {
  test(`paired ${c.pair}: the sdross0 settings against Site 2's counts`, () => {
    const state = {
      latDeg: c.site2.latitude,
      doy: settingsParseDate(c.date),
      solarTimeHours: settingsParseTime(c.solar_time).clock / 60,
      userLimitingMag: 6.5,
      ambientBortle: c.site2.bortle,
      nakedEyeThreshold: "schaefer",
    };
    const none = M.summarize(sdross0, { ...state, brightnessRefMag: 0.8, phaseLaw: "lambert" }, data, catalog);
    const mini = M.summarize(sdross0, { ...state, brightnessRefMag: 6.2, phaseLaw: "mini" }, data, catalog);
    const band = BANDS[c.pair];
    const check = (label, got, want, range) => {
      if (want === 0) { assert.equal(got, 0, `${label}: Site 2 reports none visible`); return; }
      const ratio = got / want;
      assert.ok(ratio >= range[0] && ratio <= range[1],
        `${label}: ${got} here, ${want} at Site 2, ratio ${ratio.toFixed(2)} outside ${range[0]} to ${range[1]} (${band.why})`);
    };
    check("no mitigation", none.visible, c.site2.no_mitigation.whole_sky_visible, band.none);
    check("optimistic mitigation", mini.visible, c.site2.optimistic_mitigation.whole_sky_visible, band.mini);
    // the Mini curve never shows more than the Lambertian sphere 5.4 magnitudes brighter
    assert.ok(mini.visible <= none.visible);
  });
}
