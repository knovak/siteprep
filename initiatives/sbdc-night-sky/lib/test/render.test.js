import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/render.js";

test("horizon projection round-trips az/alt", () => {
  const view = { centerAz: 200, centerAlt: 25, fovDeg: 100 };
  for (const [az, alt] of [[200, 25], [160, 5], [250, 60], [359, 10]]) {
    const p = R.projHorizon(az, alt, view, 1200, 700);
    const u = R.unprojHorizon(p.x, p.y, view, 1200, 700);
    assert.ok(Math.abs(R.wrap180(u.azDeg - az)) < 1e-9, `az ${az} -> ${u.azDeg}`);
    assert.ok(Math.abs(u.altDeg - alt) < 1e-9, `alt ${alt} -> ${u.altDeg}`);
  }
});

test("horizon projection: center maps to canvas center; az wraps", () => {
  const view = { centerAz: 10, centerAlt: 20, fovDeg: 90 };
  const c = R.projHorizon(10, 20, view, 1000, 600);
  assert.ok(Math.abs(c.x - 500) < 1e-9 && Math.abs(c.y - 300) < 1e-9);
  // 350 deg is 20 deg west of center az 10 -> left of center, not far right
  const west = R.projHorizon(350, 20, view, 1000, 600);
  assert.ok(west.x < 500 && west.x > 200, "wrap-around x " + west.x);
});

test("fisheye: zenith center, horizon rim, north up, east RIGHT (map convention)", () => {
  const W = 800, H = 800;
  const z = R.projFisheye(0, 90, W, H);
  assert.ok(Math.abs(z.x - 400) < 1e-9 && Math.abs(z.y - 400) < 1e-9);
  const n = R.projFisheye(0, 0, W, H);
  assert.ok(Math.abs(n.x - 400) < 1e-9 && n.y < 400, "north up");
  const e = R.projFisheye(90, 0, W, H);
  assert.ok(e.x > 400, "east on the right (map convention, per review)");
  const u = R.unprojFisheye(n.x, n.y, W, H);
  assert.ok(Math.abs(u.altDeg) < 1e-6 && Math.abs(u.azDeg) < 1e-6);
});

test("default view faces north; hills silhouette bounded and deterministic", () => {
  // north default (per review): east lands on the right of the panorama
  assert.equal(R.DEFAULT_VIEW.centerAz, 0);
  assert.equal(R.DEFAULT_VIEW.mode, "horizon");
  for (let az = -360; az <= 720; az += 7) {
    const hAlt = R.hillAltDeg(az);
    assert.ok(hAlt >= 0.4 && hAlt <= 3.7, "hill range: " + hAlt);
  }
  assert.equal(R.hillAltDeg(123.4), R.hillAltDeg(123.4));
});

test("fisheye round-trips arbitrary points", () => {
  for (const [az, alt] of [[45, 30], [180, 70], [270, 5], [330, 45]]) {
    const p = R.projFisheye(az, alt, 900, 700);
    const u = R.unprojFisheye(p.x, p.y, 900, 700);
    assert.ok(Math.abs(u.azDeg - az) < 1e-6 && Math.abs(u.altDeg - alt) < 1e-6,
      `${az},${alt} -> ${u.azDeg},${u.altDeg}`);
  }
});

test("mu color ramp: monotone darkening, no NaN, clamped ends", () => {
  let prevSum = Infinity;
  for (let mu = 3; mu <= 23; mu += 0.25) {
    const c = R.muToColor(mu);
    for (const v of c) { assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, "mu " + mu); }
    const s = c[0] + c[1] + c[2];
    assert.ok(s <= prevSum + 0.35, `brightness not (loosely) decreasing at mu ${mu}`);
    prevSum = s;
  }
  assert.deepEqual(R.muToColor(1), R.muToColor(4));
  assert.deepEqual(R.muToColor(25), R.muToColor(21.9));
});

test("magToFlux: 5 magnitudes = 100x flux", () => {
  assert.ok(Math.abs(R.magToFlux(0) / R.magToFlux(5) - 100) < 1e-9);
});
