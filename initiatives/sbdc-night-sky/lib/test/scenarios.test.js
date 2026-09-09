import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));

const JUN = 172, DEC = 355, MAR = 79;

// one full-size constellation reused across scenarios (default: 300k,
// 70% SSO, "spread" shells, 1 train, seed 12345)
const CFG = M.defaultConfig(data, { seed: 12345 });
const C = M.generateConstellation(CFG, data);

const sum = (latDeg, doy, solarTimeHours, extra = {}) =>
  M.summarize(C, { latDeg, doy, solarTimeHours, ...extra }, data, catalog);

const sunsetAt = (lat, doy) => {
  const tw = M.twilightTimes(lat, doy, data);
  assert.equal(tw.sunset.sets.length, 1, "expected a single sunset");
  return tw.sunset.sets[0];
};

/* A1: equator, equinox, 30 min after sunset — band visible, more
   visible satellites than visible stars (unmitigated, N=300k). */
test("A1: equatorial dusk — visible satellites outnumber visible stars", () => {
  const t = sunsetAt(0, MAR) + 0.5;
  const s = sum(0, MAR, t);
  assert.ok(s.visiblePerFamily.sso > 100, "SSO band present: " + JSON.stringify(s));
  assert.ok(s.visible > s.visibleStars,
    `sats ${s.visible} vs stars ${s.visibleStars} (sunAlt ${s.sunAltDeg})`);
});

/* A2: equator, equinox, local midnight — SSO below horizon; 30-deg
   shell all eclipsed at deep night; some 30-deg visible in early night. */
test("A2: equatorial midnight — SSO gone, 30-deg shell eclipsed", () => {
  const s = sum(0, MAR, 0);
  assert.equal(s.aboveHorizonPerFamily.sso, 0, "SSO above horizon at midnight");
  assert.equal(s.visiblePerFamily.inclined, 0, "30-deg visible at deep midnight");
  const early = sum(0, MAR, 19.0); // ~1 h after sunset
  assert.ok(early.visiblePerFamily.inclined > 0, "30-deg visible in early night");
});

/* A3: at EQUINOX dusk the observer sits under the band, which runs
   roughly N-S through the sky. (At the June solstice this is NOT true
   at 40N — see A3b — because sunset at LT ~19.7 happens well after the
   band's ~LT-18 overpass.) */
test("A3: 40N equinox dusk — SSO band visible, runs roughly N-S", () => {
  const t = sunsetAt(40, MAR) + 0.5;
  const state = { latDeg: 40, doy: MAR, solarTimeHours: t };
  const s = M.summarize(C, state, data, catalog);
  assert.ok(s.visiblePerFamily.sso > 100, JSON.stringify(s));
  const ev = M.evaluate(C, state, data);
  let nearMeridian = 0, total = 0;
  for (const i of ev.above) {
    if (C.family[i] !== 0 || !ev.visible[i] || ev.alt[i] > 45) continue;
    total++;
    const az = ev.az[i];
    const dist = Math.min(az, Math.abs(az - 180), 360 - az);
    if (dist <= 45) nearMeridian++;
  }
  assert.ok(total > 50, "enough low-band satellites: " + total);
  assert.ok(nearMeridian / total > 0.55,
    `meridian fraction ${(nearMeridian / total).toFixed(2)} of ${total}`);
});

/* A3b: seasonal displacement — at 40N June-solstice dusk, sunset comes
   ~2 h after the band's local-time-18 overpass, so the visible band
   sits west of the meridian. A real solstice effect the simulator must
   show (it is why summer evening viewing differs from equinox). */
test("A3b: 40N Jun-21 dusk — band displaced into the western sky", () => {
  const t = sunsetAt(40, JUN) + 0.5;
  const ev = M.evaluate(C, { latDeg: 40, doy: JUN, solarTimeHours: t }, data);
  let east = 0, west = 0;
  for (const i of ev.above) {
    if (C.family[i] !== 0 || !ev.visible[i]) continue;
    if (ev.az[i] > 180) west++; else east++;
  }
  assert.ok(west > 5 * east, `west ${west} east ${east}`);
});

/* A4: latitude-independence of the twilight pass — at equinox, the same
   sun depression gives comparable visible counts from the equator to
   high mid-latitudes ("everyone sees the band at their local dusk"). */
test("A4: equinox, sun depression -8 — comparable visibility 0..55 deg lat", () => {
  const counts = [0, 20, 40, 55].map((lat) => {
    const c = M.sunCrossings(lat, MAR, -8, data);
    assert.equal(c.sets.length, 1);
    return sum(lat, MAR, c.sets[0]).visible;
  });
  for (const v of counts) assert.ok(v > 5000, "counts " + counts);
  const ratio = Math.max(...counts) / Math.min(...counts);
  assert.ok(ratio < 2, `max/min ratio ${ratio.toFixed(2)} (${counts})`);
});

/* A5: high-latitude summer, two distinct facts.
   (a) 55N Jun-21 local midnight: sky reaches nautical-dark (~-11.6 deg)
       and SSO satellites are naked-eye visible ALL night.
   (b) 65N Jun-21 local midnight: white nights — thousands of satellites
       remain SUNLIT above the horizon all night (the astronomy-impact
       fact), but the bright twilight sky hides them from the naked eye. */
test("A5: high-latitude summer midnight — all-night visibility / illumination", () => {
  const a = sum(55, JUN, 0);
  assert.ok(a.visiblePerFamily.sso > 100, "55N visible: " + JSON.stringify(a));
  const b = sum(65, JUN, 0);
  assert.ok(b.sunlitAbove > 5000, "65N sunlit above: " + b.sunlitAbove);
  assert.ok(b.visible < 50, "65N white-night sky hides them: " + b.visible);
});

/* A6: mirror of A5(a) in the southern summer. */
test("A6: 55S Dec-21 midnight — mirror all-night visibility", () => {
  const s = sum(-55, DEC, 0);
  assert.ok(s.visiblePerFamily.sso > 100, JSON.stringify(s));
});

/* A7: 30-deg shell latitude cap — invisible from 75N (30 deg + max
   footprint 40.4 deg at 2,000 km < 75 deg). */
test("A7: 75N never sees the 30-deg shell; 20N sees plenty", () => {
  for (const t of [0, 6, 12, 20]) {
    const s = sum(75, MAR, t);
    assert.equal(s.aboveHorizonPerFamily.inclined, 0, "t=" + t);
  }
  const low = sum(20, MAR, 20);
  assert.ok(low.aboveHorizonPerFamily.inclined > 1000);
});

/* A8: noon — sky essentially blank (a Venus-class outlier is allowed,
   as in reality). */
test("A8: noon sky is essentially blank", () => {
  const s = sum(40, JUN, 12);
  assert.ok(s.visible < 10, "visible at noon: " + s.visible);
  assert.equal(s.visibleStars, 0, "stars at noon");
});

/* A9: linear count scaling with constellation size. */
test("A9: aboveHorizon scales linearly with N", () => {
  const mk = (n) => M.generateConstellation(
    M.defaultConfig(data, { totalSats: n, trains: 0, seed: 777 }), data);
  const t = sunsetAt(0, MAR) + 0.5;
  const state = { latDeg: 0, doy: MAR, solarTimeHours: t };
  const a = M.summarize(mk(150000), state, data).aboveHorizon;
  const b = M.summarize(mk(300000), state, data).aboveHorizon;
  assert.ok(Math.abs(b / a - 2) < 0.05, `ratio ${(b / a).toFixed(3)}`);
});

/* A10: horizon-cap geometry against the analytic cap-area fraction,
   using uniform sphere sampling (independent of the constellation
   generator). */
test("A10: fraction above horizon matches analytic cap area", () => {
  const Re = data.physicalConstants.earthRadiusKm.value;
  const h = 600, r = Re + h, N = 200000;
  const rng = M.makeRng(2024);
  const px = new Float64Array(N), py = new Float64Array(N), pz = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const z = 2 * rng() - 1, phi = rng() * 2 * Math.PI, q = Math.sqrt(1 - z * z);
    px[i] = r * q * Math.cos(phi); py[i] = r * q * Math.sin(phi); pz[i] = r * z;
  }
  const fake = { n: N, px, py, pz, m0: new Float32Array(N),
                 family: new Uint8Array(N), shellAlt: new Float32Array(N).fill(h) };
  const ev = M.evaluate(fake, { latDeg: 33, doy: 100, solarTimeHours: 15 }, data);
  const frac = ev.above.length / N;
  const analytic = (1 - Re / r) / 2;
  assert.ok(Math.abs(frac / analytic - 1) < 0.15,
    `frac ${frac.toFixed(4)} vs analytic ${analytic.toFixed(4)}`);
});
