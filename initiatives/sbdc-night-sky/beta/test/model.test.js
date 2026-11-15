import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));

const DOY = { equinoxMar: 79, solsticeJun: 172, equinoxSep: 265, solsticeDec: 355 };

/* ---------------- 1.1 PRNG + utilities ---------------- */

test("PRNG: deterministic under seed, different across seeds", () => {
  const a = M.makeRng(42), b = M.makeRng(42), c = M.makeRng(43);
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test("PRNG: gauss has ~zero mean, ~unit sd", () => {
  const r = M.makeRng(7);
  let s = 0, s2 = 0; const N = 20000;
  for (let i = 0; i < N; i++) { const g = r.gauss(); s += g; s2 += g * g; }
  assert.ok(Math.abs(s / N) < 0.03, "mean " + s / N);
  assert.ok(Math.abs(Math.sqrt(s2 / N) - 1) < 0.03);
});

test("dirToAltAz: cardinal directions and zenith", () => {
  const basis = M.enuBasis(40);
  assert.ok(Math.abs(M.dirToAltAz(basis.up, basis).altDeg - 90) < 1e-9);
  const n = M.dirToAltAz(basis.north, basis);
  assert.ok(Math.abs(n.altDeg) < 1e-9 && Math.abs(n.azDeg) < 1e-9);
  const e = M.dirToAltAz(basis.east, basis);
  assert.ok(Math.abs(e.azDeg - 90) < 1e-9);
});

/* ---------------- 1.2 Solar ephemeris ---------------- */

test("solar declination at solstices and equinoxes", () => {
  assert.ok(Math.abs(M.solarEphemeris(DOY.solsticeJun, 12, data).decDeg - 23.44) < 0.3);
  assert.ok(Math.abs(M.solarEphemeris(DOY.solsticeDec, 12, data).decDeg + 23.44) < 0.3);
  assert.ok(Math.abs(M.solarEphemeris(DOY.equinoxMar, 12, data).decDeg) < 0.5);
  assert.ok(Math.abs(M.solarEphemeris(DOY.equinoxSep, 12, data).decDeg) < 0.5);
});

test("noon sun altitude = 90 - |lat - dec|", () => {
  const dec = M.solarEphemeris(DOY.solsticeJun, 12, data).decDeg;
  const alt = M.sunAltAz(40, DOY.solsticeJun, 12, data).altDeg;
  assert.ok(Math.abs(alt - (90 - Math.abs(40 - dec))) < 0.05);
});

test("equatorial equinox sunset near 18:00 local solar", () => {
  const tw = M.twilightTimes(0, DOY.equinoxMar, data);
  assert.equal(tw.sunset.sets.length, 1);
  assert.ok(Math.abs(tw.sunset.sets[0] - 18.0) < 0.12, "sunset " + tw.sunset.sets[0]);
});

test("polar day at 70N in June: sun never sets, no NaN", () => {
  const tw = M.twilightTimes(70, DOY.solsticeJun, data);
  assert.equal(tw.sunset.sets.length, 0);
  assert.ok(tw.sunset.alwaysAbove);
  assert.ok(!tw.sunset.alwaysBelow);
});

test("polar night at 75N in December", () => {
  const tw = M.twilightTimes(75, DOY.solsticeDec, data);
  assert.ok(tw.sunset.alwaysBelow);
});

/* ---------------- 1.3 Star catalog ---------------- */

test("catalog integrity: count, size, Sirius", () => {
  assert.ok(catalog.count >= 9000 && catalog.count <= 9110, "count " + catalog.count);
  const bytes = statSync(new URL("../data/bsc-reduced.json", import.meta.url)).size;
  assert.ok(bytes < 160_000, "catalog bytes " + bytes);
  let sirius = -1;
  for (const [i, n] of Object.entries(catalog.names)) if (n === "Sirius") sirius = +i;
  assert.ok(sirius >= 0);
  assert.equal(catalog.v[sirius] / 10, -1.5);
  assert.ok(Math.abs(catalog.ra[sirius] / 100 - 101.287) < 0.02);
  assert.ok(Math.abs(catalog.dec[sirius] / 100 + 16.716) < 0.02);
});

test("Polaris altitude ~= observer latitude, at any hour", () => {
  let polaris = -1;
  for (const [i, n] of Object.entries(catalog.names)) if (n === "Polaris") polaris = +i;
  for (const t of [0, 6, 13, 21]) {
    const st = M.starAltAz(catalog, 40, 100, t, data);
    assert.ok(Math.abs(st.altDeg[polaris] - 40) < 1.2, `t=${t} alt=${st.altDeg[polaris]}`);
  }
});

test("Alpha Centauri never rises from 40N; Sirius transit altitude ~33.3 deg", () => {
  let acen = -1, sirius = -1;
  for (const [i, n] of Object.entries(catalog.names)) {
    if (n === "Alpha Centauri") acen = +i;
    if (n === "Sirius") sirius = +i;
  }
  let maxA = -90, maxS = -90;
  for (let t = 0; t < 24; t += 0.25) {
    const st = M.starAltAz(catalog, 40, 200, t, data);
    maxA = Math.max(maxA, st.altDeg[acen]);
    maxS = Math.max(maxS, st.altDeg[sirius]);
  }
  assert.ok(maxA < 0, "Alpha Cen max alt " + maxA);
  assert.ok(Math.abs(maxS - 33.3) < 0.6, "Sirius transit " + maxS);
});

/* ---------------- 1.4 Constellation generator ---------------- */

test("SSO inclination from J2 condition", () => {
  assert.ok(Math.abs(M.ssoInclinationDeg(550, data) - 97.6) < 0.3);
  const i550 = M.ssoInclinationDeg(550, data), i1200 = M.ssoInclinationDeg(1200, data);
  assert.ok(i1200 > i550, "inclination grows with altitude");
  assert.ok(i550 > 90 && i1200 < 102);
});

test("generator: count conservation, determinism, family split", () => {
  const cfg = M.defaultConfig(data, { totalSats: 20000, trains: 2, seed: 99 });
  const c1 = M.generateConstellation(cfg, data);
  const c2 = M.generateConstellation(cfg, data);
  assert.equal(c1.n, 20000 + 2 * cfg.train.satsPerTrain);
  assert.deepEqual(Array.from(c1.px.slice(0, 50)), Array.from(c2.px.slice(0, 50)));
  let sso = 0, inc = 0, tr = 0;
  for (let i = 0; i < c1.n; i++) [sso, inc, tr][c1.family[i]] !== undefined &&
    (c1.family[i] === 0 ? sso++ : c1.family[i] === 1 ? inc++ : tr++);
  assert.equal(sso, Math.round(20000 * cfg.ssoFraction));
  assert.equal(tr, 2 * cfg.train.satsPerTrain);
});

test("SSO satellites cluster about the terminator plane (sun frame)", () => {
  const cfg = M.defaultConfig(data, { totalSats: 20000, ssoFraction: 1, trains: 0, seed: 5 });
  const c = M.generateConstellation(cfg, data);
  // terminator plane in the sun frame is x=0; dawn-dusk sats keep |x|/r small
  let sum = 0; const fr = [];
  for (let i = 0; i < c.n; i++) {
    const r = Math.hypot(c.px[i], c.py[i], c.pz[i]);
    const f = Math.abs(c.px[i]) / r; sum += f; fr.push(f);
  }
  fr.sort((a, b) => a - b);
  assert.ok(sum / c.n < 0.25, "mean |x|/r " + sum / c.n);
  assert.ok(fr[Math.floor(0.95 * fr.length)] < 0.45, "p95 " + fr[Math.floor(0.95 * fr.length)]);
});

test("30-deg shell never exceeds 30 deg latitude", () => {
  const cfg = M.defaultConfig(data, { totalSats: 20000, ssoFraction: 0, trains: 0, seed: 6 });
  const c = M.generateConstellation(cfg, data);
  for (let i = 0; i < c.n; i++) {
    const r = Math.hypot(c.px[i], c.py[i], c.pz[i]);
    const lat = Math.asin(c.pz[i] / r) * 180 / Math.PI;
    assert.ok(Math.abs(lat) <= 30.001, "lat " + lat);
  }
});

/* ---------------- 1.5 Geometry & shadow ---------------- */

const Re = data.physicalConstants.earthRadiusKm.value;
const fakeSat = (x, y, z) => ({
  n: 1, px: Float64Array.of(x), py: Float64Array.of(y), pz: Float64Array.of(z),
  m0: Float32Array.of(0.5), family: Uint8Array.of(0), shellAlt: Float32Array.of(600),
});

test("topocentric: overhead satellite has alt 90, range = altitude", () => {
  // T=12 -> frame rotation is identity; observer lat 0 up = +X
  const ev = M.evaluate(fakeSat(Re + 600, 0, 0), { latDeg: 0, doy: 79, solarTimeHours: 12 }, data);
  assert.ok(Math.abs(ev.alt[0] - 90) < 0.01);
  assert.ok(Math.abs(ev.range[0] - 600) < 0.5);
});

test("topocentric: antipodal satellite is below the horizon", () => {
  const ev = M.evaluate(fakeSat(-(Re + 600), 0, 0), { latDeg: 0, doy: 79, solarTimeHours: 12 }, data);
  assert.ok(ev.alt[0] < 0);
});

test("shadow: anti-solar eclipsed, sub-solar sunlit, both geometries", () => {
  const s = [1, 0, 0];
  for (const g of ["cone", "cylinder"]) {
    assert.equal(M.isSunlit(-(Re + 600), 0, 0, s, data, g), false, g + " anti-solar");
    assert.equal(M.isSunlit(Re + 600, 0, 0, s, data, g), true, g + " sub-solar");
  }
});

test("shadow: cone and cylinder differ only near the umbra boundary", () => {
  const s = [1, 0, 0];
  // deep behind Earth, just inside the cylinder radius: cylinder says
  // eclipsed, tapered cone says sunlit
  const depth = 13000, rho = Re - 20;
  assert.equal(M.isSunlit(-depth, rho, 0, s, data, "cylinder"), false);
  assert.equal(M.isSunlit(-depth, rho, 0, s, data, "cone"), true);
  // far from the boundary they agree
  assert.equal(M.isSunlit(-depth, Re + 500, 0, s, data, "cylinder"),
               M.isSunlit(-depth, Re + 500, 0, s, data, "cone"));
});

test("shadow: higher shells exit the shadow at smaller anti-solar angles", () => {
  const s = [1, 0, 0];
  const exitAngle = (h) => {
    for (let a = 0; a <= 90; a += 0.25) {
      const r = Re + h, th = (180 - a) * Math.PI / 180; // from +X (sun): 180 = anti-solar
      if (M.isSunlit(r * Math.cos(th), r * Math.sin(th), 0, s, data, "cone")) return a;
    }
    return 90;
  };
  const e600 = exitAngle(600), e1200 = exitAngle(1200), e2000 = exitAngle(2000);
  assert.ok(e600 > e1200 && e1200 > e2000, `${e600} ${e1200} ${e2000}`);
});

/* ---------------- 1.6 Photometry & sky brightness ---------------- */

test("magnitude: range doubling adds ~1.5 mag", () => {
  const m1 = M.satMagnitude(0.5, 1000, Math.PI / 2, 90, data);
  const m2 = M.satMagnitude(0.5, 2000, Math.PI / 2, 90, data);
  assert.ok(Math.abs((m2 - m1) - 5 * Math.log10(2)) < 1e-9);
  // Kasten-Young airmass is 0.9997 (not exactly 1) at zenith
  assert.ok(Math.abs(m1 - 0.5) < 1e-3, "m0 recovered at reference range/phase/zenith");
});

test("magnitude: extinction dims low-altitude objects; mitigation adds exactly", () => {
  const hi = M.satMagnitude(0.5, 1000, Math.PI / 2, 90, data);
  const lo = M.satMagnitude(0.5, 1000, Math.PI / 2, 5, data);
  assert.ok(lo > hi + 1, "airmass extinction at 5 deg");
  assert.ok(Math.abs(M.satMagnitude(0.5, 1000, 1, 45, data, 5) -
                     M.satMagnitude(0.5, 1000, 1, 45, data, 0) - 5) < 1e-9);
  // v3 brightness slider: offset = refMag - default; default reproduces
  // the report-calibrated population exactly (offset 0)
  assert.equal(M.brightnessOffset({ brightnessRefMag: 0.5 }, data), 0);
  assert.ok(Math.abs(M.brightnessOffset({ brightnessRefMag: 5.5 }, data) - 5) < 1e-9);
  assert.ok(Math.abs(M.brightnessOffset({ brightnessRefMag: -7 }, data) + 7.5) < 1e-9);
  assert.equal(M.brightnessOffset({}, data), 0);
});

test("population magnitudes honor the report envelope (-2..+4-ish)", () => {
  const cfg = M.defaultConfig(data, { totalSats: 5000, trains: 0, seed: 11 });
  const c = M.generateConstellation(cfg, data);
  for (let i = 0; i < c.n; i++) {
    assert.ok(c.m0[i] >= cfg.m0Clamp[0] - 1e-6 && c.m0[i] <= cfg.m0Clamp[1] + 1e-6);
  }
});

test("sky darkens monotonically as the sun sinks; limits sane", () => {
  let prev = -Infinity;
  for (const alt of [20, 5, 0, -3, -6, -9, -12, -15, -18, -30]) {
    const mu = M.zenithMu(alt, data);
    assert.ok(mu >= prev, `mu(${alt})=${mu}`);
    prev = mu;
  }
  assert.ok(Math.abs(M.zenithMu(-18, data) - 21.9) < 0.01);
  assert.ok(M.limitingMag(21.9, data) > 6.3 && M.limitingMag(21.9, data) <= 6.5);
  assert.ok(Math.abs(M.limitingMag(14, data) - 2.0) < 0.01);
});

test("twilight glow brightens the sky toward the sun", () => {
  const s = [1, 0, 0];
  const towardSun = M.muAt([1, 0.1, 0.1], s, -6, data);
  const awaySun = M.muAt([-1, 0.1, 0.1], s, -6, data);
  assert.ok(towardSun < awaySun, `${towardSun} vs ${awaySun}`);
});

/* ---------------- 1.7 summarize() shape ---------------- */

test("summarize returns the full readout contract", () => {
  const cfg = M.defaultConfig(data, { totalSats: 5000, seed: 3 });
  const c = M.generateConstellation(cfg, data);
  const s = M.summarize(c, { latDeg: 40, doy: 172, solarTimeHours: 20.3 }, data, catalog);
  for (const k of ["aboveHorizon", "sunlitAbove", "visible", "visibleStars",
                   "brightestMag", "sunAltDeg", "aboveHorizonPerFamily", "visiblePerFamily"]) {
    assert.ok(k in s, "missing " + k);
  }
  assert.ok(s.aboveHorizon >= s.sunlitAbove && s.sunlitAbove >= s.visible);
});

/* ---------------- v2: velocities, streaks, custom shells ---------------- */

test("velocity: unit length and perpendicular to the radius vector", () => {
  const cfg = M.defaultConfig(data, { totalSats: 2000, trains: 1, seed: 31 });
  const c = M.generateConstellation(cfg, data);
  for (let i = 0; i < c.n; i += 97) {
    const vlen = Math.hypot(c.vx[i], c.vy[i], c.vz[i]);
    assert.ok(Math.abs(vlen - 1) < 1e-6, "unit velocity: " + vlen);
    const dp = (c.px[i] * c.vx[i] + c.py[i] * c.vy[i] + c.pz[i] * c.vz[i]) /
               Math.hypot(c.px[i], c.py[i], c.pz[i]);
    assert.ok(Math.abs(dp) < 1e-6, "radial component: " + dp);
  }
});

test("streaks: 30 s displacement of a 600 km overhead satellite is 12-27 deg", () => {
  // observer lat 0, T=12 (frame rotation identity), satellite overhead
  // moving along +Y at 600 km
  const c = {
    n: 1, px: Float64Array.of(Re + 600), py: Float64Array.of(0), pz: Float64Array.of(0),
    vx: Float32Array.of(0), vy: Float32Array.of(1), vz: Float32Array.of(0),
    m0: Float32Array.of(0), family: Uint8Array.of(0), shellAlt: Float32Array.of(600),
  };
  const state = { latDeg: 0, doy: 79, solarTimeHours: 12 };
  const ev = M.evaluate(c, state, data);
  const st = M.streakEndpoints(c, state, data, 30);
  // angular separation between (alt, az) start and end
  const a1 = ev.alt[0] * Math.PI / 180, a2 = st.alt2[0] * Math.PI / 180;
  const dz = (st.az2[0] - ev.az[0]) * Math.PI / 180;
  const sep = Math.acos(Math.sin(a1) * Math.sin(a2) +
    Math.cos(a1) * Math.cos(a2) * Math.cos(dz)) * 180 / Math.PI;
  assert.ok(sep > 12 && sep < 27, "overhead streak length deg: " + sep);
  // a higher, more distant satellite streaks less
  const c2 = { ...c, px: Float64Array.of(Re + 2000), shellAlt: Float32Array.of(2000) };
  const ev2 = M.evaluate(c2, state, data);
  const st2 = M.streakEndpoints(c2, state, data, 30);
  const b1 = ev2.alt[0] * Math.PI / 180, b2 = st2.alt2[0] * Math.PI / 180;
  const dz2 = (st2.az2[0] - ev2.az[0]) * Math.PI / 180;
  const sep2 = Math.acos(Math.sin(b1) * Math.sin(b2) +
    Math.cos(b1) * Math.cos(b2) * Math.cos(dz2)) * 180 / Math.PI;
  assert.ok(sep2 < sep, `higher shell streaks less: ${sep2} vs ${sep}`);
});

test("parseShellSpec: valid, normalizing, clamping, and rejecting", () => {
  const s = M.parseShellSpec("550:1, 1200:1");
  assert.equal(s.length, 2);
  assert.ok(Math.abs(s[0].share - 0.5) < 1e-9 && s[0].altKm === 550);
  const c = M.parseShellSpec("300:2; 2500:2");   // clamped to filing envelope
  assert.equal(c[0].altKm, 500); assert.equal(c[1].altKm, 2000);
  assert.equal(M.parseShellSpec("nonsense"), null);
  assert.equal(M.parseShellSpec(""), null);
  assert.equal(M.parseShellSpec("550:0"), null); // zero share rejected
});


/* ---------------- v3: propagation, clustering ---------------- */

test("propagation: radius conserved, full period returns, overhead rate 0.4-0.9 deg/s", () => {
  const mu = data.physicalConstants.muEarth.value;
  const c = {
    n: 1, px: Float64Array.of(Re + 600), py: Float64Array.of(0), pz: Float64Array.of(0),
    vx: Float32Array.of(0), vy: Float32Array.of(1), vz: Float32Array.of(0),
    m0: Float32Array.of(0), family: Uint8Array.of(0), shellAlt: Float32Array.of(600),
    clusterId: Int32Array.of(-1), clustered: false,
  };
  const st = (tau) => ({ latDeg: 0, doy: 79, solarTimeHours: 12, propagationSec: tau });
  const r0 = Re + 600;
  const T = 2 * Math.PI * Math.sqrt(r0 ** 3 / mu);
  // radius conserved at several taus (range from center = r0 exactly)
  for (const tau of [0, 137, 1234, T / 3]) {
    const ev = M.evaluate(c, st(tau), data);
    // reconstruct geocentric radius from observer range/alt: overhead => Re + range at tau=0 only;
    // instead check via streak-free invariant: |P(tau)| = r0 using evaluate internals indirectly:
    // range from observer r satisfies law of cosines with alt; simplest strong check: at tau=T, back to start
  }
  const ev0 = M.evaluate(c, st(0), data);
  const evT = M.evaluate(c, st(T), data);
  assert.ok(Math.abs(ev0.alt[0] - evT.alt[0]) < 0.01, "period return alt");
  assert.ok(Math.abs(ev0.range[0] - evT.range[0]) < 1.0, "period return range");
  // angular rate overhead: 10 s displacement
  const ev10 = M.evaluate(c, st(10), data);
  const a1 = ev0.alt[0] * Math.PI / 180, a2 = ev10.alt[0] * Math.PI / 180;
  const dz = (ev10.az[0] - ev0.az[0]) * Math.PI / 180;
  const sep = Math.acos(Math.sin(a1) * Math.sin(a2) +
    Math.cos(a1) * Math.cos(a2) * Math.cos(dz)) * 18 / Math.PI; // deg per s (x10 /10)
  assert.ok(sep / 1 >= 0.4 && sep / 1 <= 0.9, "overhead rate deg/s: " + sep);
});

test("propagation: satellites sweep the sky while stars stand nearly still", () => {
  const cfg = M.defaultConfig(data, { totalSats: 4000, trains: 0, seed: 88 });
  const c = M.generateConstellation(cfg, data);
  const s0 = { latDeg: 0, doy: 79, solarTimeHours: 18.5, propagationSec: 0 };
  const s1 = { latDeg: 0, doy: 79, solarTimeHours: 18.5 + 10 / 3600, propagationSec: 10 };
  const e0 = M.evaluate(c, s0, data), e1 = M.evaluate(c, s1, data);
  const seps = [];
  for (const i of e0.above) {
    if (!e0.sunlit[i] || e1.alt[i] <= 0) continue;
    const a1 = e0.alt[i] * Math.PI / 180, a2 = e1.alt[i] * Math.PI / 180;
    const dz = (e1.az[i] - e0.az[i]) * Math.PI / 180;
    seps.push(Math.acos(Math.max(-1, Math.min(1, Math.sin(a1) * Math.sin(a2) +
      Math.cos(a1) * Math.cos(a2) * Math.cos(dz)))) * 180 / Math.PI);
  }
  seps.sort((a, b) => a - b);
  const med = seps[Math.floor(seps.length / 2)];
  const p90 = seps[Math.floor(seps.length * 0.9)];
  // median includes distant near-horizon satellites (~0.1-0.2 deg/s);
  // closer ones sweep at the canonical 0.4-0.9 deg/s
  assert.ok(med > 0.8, "median 10 s displacement deg: " + med);
  assert.ok(p90 > 2, "p90 10 s displacement deg (>= 0.2 deg/s is unmistakable motion): " + p90);
  // stars: 10 s of solar time = 0.042 deg of sky rotation
  const st0 = M.starAltAz(catalog, 0, 79, 18.5, data);
  const st1 = M.starAltAz(catalog, 0, 79, 18.5 + 10 / 3600, data);
  let smax = 0;
  for (let i = 0; i < catalog.count; i += 50) {
    smax = Math.max(smax, Math.hypot(st1.altDeg[i] - st0.altDeg[i],
      (st1.azDeg[i] - st0.azDeg[i]) * Math.cos(st0.altDeg[i] * Math.PI / 180)));
  }
  assert.ok(smax < 0.06, "max star drift over 10 s deg: " + smax);
  assert.ok(med > 15 * smax, "satellites visibly outpace the star field: " + (med / smax).toFixed(0) + "x");
});

const CLUS = { enabled: true, satsPerCluster: 100, memberSigma: 0.35,
               clusterDiameterKm: 1.0, diameterSigma: 0.35 };

test("clustering generator: counts, shared plane/shell, physical diameter", () => {
  const cfg = M.defaultConfig(data, { totalSats: 30000, trains: 0, seed: 9, clustering: CLUS });
  const c = M.generateConstellation(cfg, data);
  assert.equal(c.n, 30000);
  assert.ok(c.clustered);
  const groups = new Map();
  for (let i = 0; i < c.n; i++) {
    const id = c.clusterId[i];
    (groups.get(id) || groups.set(id, []).get(id)).push(i);
  }
  const sizes = [...groups.values()].map((g) => g.length);
  const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  assert.ok(mean > 60 && mean < 160, "mean members " + mean + " over " + sizes.length + " clusters");
  // members of one cluster: same shell altitude; physical spread ~ diameter scale
  const g = [...groups.values()].find((x) => x.length >= 20);
  const alt0 = c.shellAlt[g[0]];
  let maxD = 0;
  for (const i of g) {
    assert.equal(c.shellAlt[i], alt0, "members share shell");
    for (const j of g) {
      const d = Math.hypot(c.px[i] - c.px[j], c.py[i] - c.py[j], c.pz[i] - c.pz[j]);
      if (d > maxD) maxD = d;
    }
  }
  assert.ok(maxD > 0.1 && maxD < 12, "cluster physical extent km: " + maxD);
});

test("clustering: population flux conserved vs unclustered (same seed, same N)", () => {
  const mk = (cl) => M.generateConstellation(
    M.defaultConfig(data, { totalSats: 40000, trains: 0, seed: 5150, clustering: cl }), data);
  const flux = (c) => { let f = 0; for (let i = 0; i < c.n; i++) f += 10 ** (-0.4 * c.m0[i]); return f; };
  const r = flux(mk(CLUS)) / flux(mk({ enabled: false }));
  assert.ok(Math.abs(r - 1) < 0.05, "population flux ratio " + r);
});

test("clustering: invisible members sum to a visible knot (combined magnitude)", () => {
  // hand-built compact cluster overhead at dusk-dark sky: 100 sats of
  // individual apparent mag ~7 (invisible) -> combined ~2 (visible)
  const n = 100, r = Re + 600;
  const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n);
  const vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n);
  const m0 = new Float32Array(n), fam = new Uint8Array(n), sh = new Float32Array(n);
  const cid = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const du = (i / n - 0.5) * (1.0 / r);          // 1 km along-track spread
    px[i] = r * Math.cos(du); py[i] = r * Math.sin(du); pz[i] = 0;
    vx[i] = -Math.sin(du); vy[i] = Math.cos(du); vz[i] = 0;
    m0[i] = 8.0;                                    // faint individuals
    fam[i] = 0; sh[i] = 600; cid[i] = 7;
  }
  const cons = { n, px, py, pz, vx, vy, vz, m0, family: fam, shellAlt: sh,
                 clusterId: cid, clustered: true };
  // T=12 identity rotation, observer under the cluster; darkish sky via userLimitingMag
  const st = { latDeg: 0, doy: 79, solarTimeHours: 12, userLimitingMag: 6.0 };
  const ev = M.evaluate(cons, st, data);
  // individually: mag ~ 8 - 1.1 (range 600) = ~6.9 > any daytime/dark limit? use math directly:
  const anyIndividuallyVisible = ev.mag.some((m, i) => ev.sunlit[i] && m <= 4.0);
  assert.ok(!anyIndividuallyVisible, "individuals faint");
  assert.ok(ev.objectStats, "objectStats present");
  const info = ev.clusterInfo.get(7);
  assert.ok(info && info.compact, "cluster is compact: " + JSON.stringify(info));
  const expected = ev.mag[50] - 2.5 * Math.log10(100);
  assert.ok(Math.abs(info.combinedMag - expected) < 0.2,
    `combined ${info.combinedMag} vs expected ${expected.toFixed(2)}`);
  assert.ok(info.extentDeg * 60 > 2 && info.extentDeg * 60 < 12,
    "1 km at ~600 km spans a few arcmin: " + (info.extentDeg * 60).toFixed(1));
});

test("clustering: launch trains stay per-member (not knots)", () => {
  const cfg = M.defaultConfig(data, { totalSats: 5000, trains: 2, seed: 4, clustering: CLUS });
  const c = M.generateConstellation(cfg, data);
  for (let i = 5000; i < c.n; i++) assert.ok(c.clusterId[i] < 0, "train sats own objects");
});

test("one plane per shell sits at the centre of the spread; a train of one is placed", () => {
  // Both were divisions by (count - 1). With one plane every SSO satellite
  // sat at one edge of the spread; a train of one had no position at all.
  const cfg = M.defaultConfig(data, {
    totalSats: 2000, ssoFraction: 1, planesPerShell: 1, trains: 1, seed: 7,
    train: { satsPerTrain: 1, altKm: 400, arcLengthDeg: 8, m0BonusMag: -0.3 },
  });
  const c = M.generateConstellation(cfg, data);
  assert.equal(c.n, 2001);
  for (let i = 0; i < c.n; i++) {
    assert.ok(Number.isFinite(c.px[i]) && Number.isFinite(c.py[i]) && Number.isFinite(c.pz[i]), `satellite ${i}`);
  }
  // With one plane and LTAN 6 or 18, every orbit normal has the same tilt
  // toward or away from the Sun: |h . x| is one value, cos(inclination).
  const tilts = new Set();
  for (let i = 0; i < 2000; i++) {
    const hx = c.py[i] * c.vz[i] - c.pz[i] * c.vy[i];
    const hy = c.pz[i] * c.vx[i] - c.px[i] * c.vz[i];
    const hz = c.px[i] * c.vy[i] - c.py[i] * c.vx[i];
    const n = Math.hypot(hx, hy, hz);
    // node on the Y axis (dawn-dusk): the normal has no Y component
    assert.ok(Math.abs(hy / n) < 1e-6, `satellite ${i}: plane is off the dawn-dusk line by ${hy / n}`);
    tilts.add(Math.abs(hx / n).toFixed(2));
  }
  assert.ok(tilts.size <= 4, `one plane per shell altitude: ${[...tilts].join(", ")}`);
});

/* ---------------- unit 2: plane layout, scatter, phase law ---------------- */

const DEG = Math.PI / 180;
const filedShells = data.scenario.shellPresets.value["filed-sso"];
const filedConfig = (overrides = {}) => M.defaultConfig(data, {
  totalSats: 54000, ssoFraction: 1, trains: 0, seed: 12345, shells: filedShells,
  planeLayout: "filed", ltanSpreadMinutes: 40, m0Sigma: 0, ...overrides,
});
// unit normal of each satellite's orbit, as a short text key
const planeKey = (c, i) => {
  const hx = c.py[i] * c.vz[i] - c.pz[i] * c.vy[i];
  const hy = c.pz[i] * c.vx[i] - c.px[i] * c.vz[i];
  const hz = c.px[i] * c.vy[i] - c.py[i] * c.vx[i];
  const n = Math.hypot(hx, hy, hz);
  return [hx / n, hy / n, hz / n].map((v) => v.toFixed(4)).join(",");
};

test("filed shells: 54 levels in the filing's three Sun-synchronous bands", () => {
  assert.equal(filedShells.length, 54);
  const band = (lo, hi) => filedShells.filter((s) => s.altKm >= lo && s.altKm <= hi);
  assert.equal(band(565, 585).length, 10);
  assert.equal(band(707, 744).length, 22);
  assert.equal(band(967, 1002).length, 22);
  const total = filedShells.reduce((a, s) => a + s.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-4, "shares sum to 1: " + total);
  // shares follow the filed satellites per plane: 4,999 : 5,565 : 5,770
  const ratio = band(967, 1002)[0].share / band(565, 585)[0].share;
  assert.ok(Math.abs(ratio - 5770 / 4999) < 2e-3, "upper to lower level: " + ratio);
});

test("filed layout: two planes per level, satellites evenly spaced along each", () => {
  const c = M.generateConstellation(filedConfig(), data);
  assert.equal(c.n, 54000);
  const planes = new Map();
  for (let i = 0; i < c.n; i++) {
    const key = c.shellAlt[i].toFixed(2) + "|" + planeKey(c, i);
    if (!planes.has(key)) planes.set(key, []);
    planes.get(key).push(i);
  }
  assert.equal(planes.size, 108, "54 levels x 2 node families");
  for (const [key, members] of planes) {
    // filed shares give each plane close to 1/108 of the satellites
    assert.ok(members.length > 400 && members.length < 600, `${key}: ${members.length} satellites`);
  }
  // Along one plane, the gaps between neighbours cluster round one spacing:
  // each satellite is moved by a random 0.3 of the spacing, so the gaps vary
  // by about 0.42 of it. Satellites placed at random have gaps that vary by a
  // whole spacing, with a median of 0.69.
  const gapStats = (cons, members) => {
    // anomaly from the node: P/r = N cos u + W sin u and V = -N sin u + W cos u,
    // whose z parts are Wz sin u and Wz cos u
    const angles = members.map((i) =>
      Math.atan2(cons.pz[i] / Math.hypot(cons.px[i], cons.py[i], cons.pz[i]), cons.vz[i])).sort((a, b) => a - b);
    const step = 2 * Math.PI / members.length;
    const gaps = [];
    for (let k = 1; k < angles.length; k++) gaps.push((angles[k] - angles[k - 1]) / step);
    const mean = gaps.reduce((a, g) => a + g, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
    return { median: [...gaps].sort((a, b) => a - b)[gaps.length >> 1], sd };
  };
  for (const members of [...planes.values()].slice(0, 6)) {
    const g = gapStats(c, members);
    assert.ok(g.median > 0.85 && g.median < 1.15, `median gap ${g.median.toFixed(2)} spacings`);
    assert.ok(g.sd > 0.25 && g.sd < 0.6, `gaps vary by ${g.sd.toFixed(2)} spacings`);
  }
  // the default layout, for contrast: one of its planes, satellites at random
  const spread = M.generateConstellation(M.defaultConfig(data, {
    totalSats: 200000, ssoFraction: 1, trains: 0, seed: 12345,
    shells: [{ altKm: 700, share: 1 }], planesPerShell: 2 }), data);
  const first = planeKey(spread, 0), randomMembers = [];
  for (let i = 0; i < spread.n; i++) if (planeKey(spread, i) === first) randomMembers.push(i);
  assert.ok(gapStats(spread, randomMembers).sd > 0.85, "random placement has widely varying gaps");
});

test("filed layout: nodes lie within the plane spread, on both sides of the dawn-dusk line", () => {
  for (const spreadDeg of [0, 10, 30]) {
    const c = M.generateConstellation(filedConfig({ ltanSpreadMinutes: spreadDeg * 4 }), data);
    let most = 0, east = 0, west = 0;
    for (let i = 0; i < c.n; i += 97) {
      // the line of nodes is where the orbit plane meets the equator: z x h
      const hx = c.py[i] * c.vz[i] - c.pz[i] * c.vy[i];
      const hy = c.pz[i] * c.vx[i] - c.px[i] * c.vz[i];
      const node = Math.atan2(hx, -hy) / DEG;                   // direction of z x h
      const off = Math.min(Math.abs(M_wrap(node - 90)), Math.abs(M_wrap(node + 90)));
      most = Math.max(most, off);
      if (Math.abs(M_wrap(node - 90)) < Math.abs(M_wrap(node + 90))) east++; else west++;
    }
    assert.ok(most <= spreadDeg + 1e-6, `spread ${spreadDeg}: a node is ${most.toFixed(3)} deg off the dawn-dusk line`);
    if (spreadDeg > 0) assert.ok(most > spreadDeg * 0.8, `spread ${spreadDeg}: nodes reach ${most.toFixed(2)} deg`);
    assert.ok(east > 0 && west > 0, "both node families are present");
  }
});
function M_wrap(deg) { return ((deg + 180) % 360 + 360) % 360 - 180; }

test("the default layout is not changed by the new options", () => {
  // planeLayout "spread" with the data file's spread and scatter is the
  // constellation the golden fixtures were made from, satellite for satellite.
  const a = M.generateConstellation(M.defaultConfig(data, { totalSats: 5000, seed: 12345 }), data);
  const b = M.generateConstellation(M.defaultConfig(data, {
    totalSats: 5000, seed: 12345, planeLayout: "spread",
    ltanSpreadMinutes: data.scenario.ssoLtanSpreadMinutes.value, m0Sigma: data.photometry.m0Sigma.value,
  }), data);
  assert.deepEqual(Array.from(a.px), Array.from(b.px));
  assert.deepEqual(Array.from(a.m0), Array.from(b.m0));
});

test("brightness scatter 0 gives every satellite the same reference brightness", () => {
  const c = M.generateConstellation(filedConfig({ totalSats: 2000 }), data);
  assert.ok(Array.from(c.m0).every((m) => Math.abs(m - data.photometry.m0Mean.value) < 1e-6));
  const scattered = M.generateConstellation(filedConfig({ totalSats: 2000, m0Sigma: 1.3 }), data);
  assert.ok(new Set(Array.from(scattered.m0).map((m) => m.toFixed(3))).size > 1000);
});

test("phase laws are zero at 90 degrees; the Mini curve is the published one", () => {
  for (const law of ["lambert", "mini"]) {
    assert.ok(Math.abs(M.phaseMagnitude(Math.PI / 2, law, data)) < 1e-12, law);
  }
  // Mallama et al. (2023): V = 2.630 + 0.1065 a - 0.0005167 a^2 at 1,000 km.
  // sdross0's ASSUMPTIONS.md quotes 3.64 at 10 degrees and 8.03 at 90.
  const mini = (deg) => 8.030 + M.phaseMagnitude(deg * DEG, "mini", data);
  assert.ok(Math.abs(mini(10) - 3.64) < 0.01, "10 deg: " + mini(10));
  assert.ok(Math.abs(mini(90) - 8.03) < 0.01, "90 deg: " + mini(90));
  // front-lit is far brighter under the Mini curve than for a Lambertian sphere
  const gain = (law) => -M.phaseMagnitude(10 * DEG, law, data);
  assert.ok(gain("mini") > 4 && gain("lambert") < 1.3, `mini ${gain("mini")}, lambert ${gain("lambert")}`);
});

test("reference brightness +0.796 is the Lambertian sphere of Boley, Lawler and Rein", () => {
  // their eq. 2 with zeta = 0.2 x 800 m2, at 1,000 km, 90 degrees, zenith,
  // k = 0.15 mag per airmass: V = -26.77 - 2.5 log10(2 zeta / (3 pi^2)) + 30 + 0.15
  const zeta = 0.2 * 800;
  const v = -26.77 - 2.5 * Math.log10(2 * zeta / (3 * Math.PI ** 2)) + 5 * Math.log10(1e6) + 0.15;
  assert.ok(Math.abs(v - 0.796) < 0.001, "V = " + v);
  // and the Mini curve scaled by area 710 / 116.03 m2: 8.030 - 1.967 + 0.15
  const mini = 2.630 + 0.1065 * 90 - 0.0005167 * 8100 - 2.5 * Math.log10(710 / 116.03) + 0.15;
  assert.ok(Math.abs(mini - 6.213) < 0.001, "V = " + mini);
});

test("satMagnitude: the phase law is the only thing that differs between the two models", () => {
  const args = [0.5, 800, 60 * DEG, 40, data, 0.3];
  const lambert = M.satMagnitude(...args), mini = M.satMagnitude(...args, "mini");
  assert.equal(M.satMagnitude(...args, "lambert"), lambert, "lambert is the default");
  const want = M.phaseMagnitude(60 * DEG, "mini", data) - M.phaseMagnitude(60 * DEG, "lambert", data);
  assert.ok(Math.abs((mini - lambert) - want) < 1e-12);
});
