// The sixteen paired cases of the 12 October 2026 comparison document, as a
// regression check. `site1` holds what this simulator reported on that date,
// reproduced here from the same settings. `site2` holds what
// sdross0/orbital-datacenter-brightness reported for the matching case; those
// numbers are the targets the later upgrade units compare against.
//
// A model change that is meant to move the Site 1 numbers updates
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
  test(`paired ${c.pair}: ${c.title} - Site 1 counts of 12 October 2026`, () => {
    const bright = M.summarize(constellation, state(1.0), data, catalog);
    const faint = M.summarize(constellation, state(6.0), data, catalog);
    assert.equal(bright.visible, c.site1.brightness_1_0.whole_sky_visible, "reference brightness +1.0");
    assert.equal(faint.visible, c.site1.brightness_6_0.whole_sky_visible, "reference brightness +6.0");
  });
}

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
