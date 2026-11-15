import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as R from "../src/render.js";
import { zenithMu } from "../src/model.js";

const skyData = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));

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

test("the hills are the same hills on both sides of north", () => {
  // The view centred on north runs from azimuth -55 to 55. The silhouette has
  // to repeat every 360 degrees, or the hills change as the view pans past 0.
  for (let az = -180; az <= 180; az += 3.5) {
    assert.ok(Math.abs(R.hillAltDeg(az) - R.hillAltDeg(az + 360)) < 1e-9, `az ${az}`);
    assert.ok(Math.abs(R.hillAltDeg(az) - R.hillAltDeg(az - 360)) < 1e-9, `az ${az}`);
  }
});

test("in view: inside the picture and above the hills, or anywhere in the all-sky view", () => {
  const W = 1600, H = 760;
  const view = { mode: "horizon", centerAz: 315, centerAlt: 25, fovDeg: 110 };
  assert.equal(R.inFrame(315, 25, view, W, H), true, "the centre of the picture");
  assert.equal(R.inFrame(135, 25, view, W, H), false, "behind the viewer");
  assert.equal(R.inFrame(315, 80, view, W, H), false, "above the top edge");
  assert.equal(R.inFrame(315, 0.2, view, W, H), false, "behind the hills");
  assert.equal(R.inFrame(315, -5, view, W, H), false, "below the horizon");
  // a view centred on north takes in both 350 and 10
  const north = { mode: "horizon", centerAz: 0, centerAlt: 28, fovDeg: 110 };
  assert.equal(R.inFrame(350, 20, north, W, H), true);
  assert.equal(R.inFrame(10, 20, north, W, H), true);
  // the all-sky view shows every direction above the horizon
  const fisheye = { mode: "fisheye", centerAz: 0, centerAlt: 28, fovDeg: 110 };
  assert.equal(R.inFrame(135, 25, fisheye, W, H), true);
  assert.equal(R.inFrame(135, -1, fisheye, W, H), false);
});

test("sky color: skyglow keeps the brightness and loses the twilight hue", () => {
  for (const mu of [16, 18.5, 21]) {
    const natural = R.muToColor(mu), lit = R.skyColor(mu, 1), half = R.skyColor(mu, 0.5);
    assert.deepEqual(R.skyColor(mu, 0), natural, "no skyglow, no change");
    const level = (c) => (c[0] + c[1] + c[2]) / 3;
    assert.ok(Math.abs(level(lit) - level(natural)) < 0.01 * level(natural) + 1e-9, `mu ${mu}: same brightness`);
    assert.ok(lit[0] > lit[1] && lit[1] > lit[2], `mu ${mu}: warm gray, red above green above blue`);
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(half[k] - (natural[k] + lit[k]) / 2) < 1e-12, "half skyglow is halfway");
    }
  }
  assert.deepEqual(R.skyColor(18, -1), R.muToColor(18), "a fraction below 0 is 0");
  assert.deepEqual(R.skyColor(18, 2), R.skyColor(18, 1), "a fraction above 1 is 1");
});

test("sky colors stay with the stages of twilight", () => {
  // The ramp maps brightness to color, and each color was chosen for a stage
  // of twilight. If the twilight table changes, the ramp's anchors have to
  // change with it, or the whole sky takes the color of a different hour.
  for (const stage of R.SKY_COLOR_STAGES) {
    const got = R.muToColor(zenithMu(stage.sunAltDeg, skyData));
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(got[k] - stage.c[k]) < 0.01,
        `Sun ${stage.sunAltDeg}: channel ${k} is ${got[k].toFixed(3)}, the stage's color has ${stage.c[k]}`);
    }
  }
  // the ramp runs from bright to dark without a step back
  const level = (mu) => R.muToColor(mu).reduce((a, v) => a + v, 0);
  for (let mu = 9; mu <= 22; mu += 0.5) assert.ok(level(mu) <= level(mu - 0.5) + 1e-9, `mu ${mu}`);
});

test("sky color: moonlight is blue gray, skyglow is warm gray, and they share the sky", () => {
  const mu = 19;
  const level = (c) => (c[0] + c[1] + c[2]) / 3;
  const moonlit = R.skyColor(mu, 0, 1), glow = R.skyColor(mu, 1, 0);
  assert.ok(moonlit[2] > moonlit[1] && moonlit[1] > moonlit[0], "moonlight: blue above green above red");
  assert.ok(glow[0] > glow[1] && glow[1] > glow[2], "skyglow: red above green above blue");
  assert.ok(Math.abs(level(moonlit) - level(R.muToColor(mu))) < 0.01 * level(moonlit) + 1e-9, "the brightness is the ramp's");
  // shares that add up to more than the whole sky are cut back to it
  assert.deepEqual(R.skyColor(mu, 1, 1), glow);
  const both = R.skyColor(mu, 0.5, 0.5);
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(both[k] - (glow[k] + moonlit[k]) / 2) < 1e-12);
});

/* ---------------- unit 5: the perspective view, aiming ---------------- */

test("perspective projection: the aim is the centre, and positions round-trip", () => {
  const W = 1600, H = 760;
  const view = { mode: "perspective", centerAz: 315, centerAlt: 25, fovDeg: 90 };
  const c = R.projPerspective(315, 25, view, W, H);
  assert.ok(Math.abs(c.x - W / 2) < 1e-9 && Math.abs(c.y - H / 2) < 1e-9, "the aim point is the centre");
  for (const [az, alt] of [[315, 25], [300, 10], [340, 50], [280, 5], [350, 30]]) {
    const p = R.projPerspective(az, alt, view, W, H);
    const u = R.unprojPerspective(p.x, p.y, view, W, H);
    assert.ok(Math.abs(R.wrap180(u.azDeg - az)) < 1e-9 && Math.abs(u.altDeg - alt) < 1e-9, `${az}, ${alt}`);
  }
  // the edges of the picture at the centre's height are half the field of view away
  const left = R.unprojPerspective(0, H / 2, view, W, H), right = R.unprojPerspective(W, H / 2, view, W, H);
  const sep = (a, b) => {
    const r = Math.PI / 180;
    const v = (p) => [Math.cos(p.altDeg * r) * Math.sin(p.azDeg * r), Math.cos(p.altDeg * r) * Math.cos(p.azDeg * r), Math.sin(p.altDeg * r)];
    const x = v(a), y = v(b);
    return Math.acos(x[0] * y[0] + x[1] * y[1] + x[2] * y[2]) / r;
  };
  assert.ok(Math.abs(sep(left, right) - 90) < 1e-6, "edge to edge is the field of view: " + sep(left, right));
  // east is on the right, up is up
  assert.ok(R.projPerspective(325, 25, view, W, H).x > W / 2);
  assert.ok(R.projPerspective(315, 35, view, W, H).y < H / 2);
  // behind the camera there is no position
  assert.equal(R.projPerspective(135, 10, view, W, H).visible, false);
});

test("perspective projection: straight lines in the sky stay straight", () => {
  // The horizon is a great circle. In a perspective picture its points lie on
  // one line; in the panorama it is level because azimuth is the x axis.
  const W = 1600, H = 760, view = { mode: "perspective", centerAz: 200, centerAlt: 30, fovDeg: 100 };
  const pts = [-40, -20, 0, 20, 40].map((off) => R.projPerspective(200 + off, 0, view, W, H));
  const slope = (pts[4].y - pts[0].y) / (pts[4].x - pts[0].x);
  for (const p of pts) {
    assert.ok(Math.abs(p.y - (pts[0].y + slope * (p.x - pts[0].x))) < 1e-6, "the horizon is one line");
  }
  // a wide field is cut to the widest the view draws
  const wide = R.projPerspective(260, 30, { ...view, fovDeg: 140 }, W, H);
  const cut = R.projPerspective(260, 30, { ...view, fovDeg: R.PERSPECTIVE_MAX_FOV }, W, H);
  assert.equal(wide.x, cut.x);
});

test("in view, in the perspective view: in front of the camera, inside the picture, above the hills", () => {
  const W = 1600, H = 760, view = { mode: "perspective", centerAz: 315, centerAlt: 25, fovDeg: 90 };
  assert.equal(R.inFrame(315, 25, view, W, H), true);
  assert.equal(R.inFrame(135, 25, view, W, H), false, "behind the camera");
  assert.equal(R.inFrame(315, 0.2, view, W, H), false, "behind the hills");
  assert.equal(R.inFrame(315, 80, view, W, H), false, "above the picture");
  assert.equal(R.inFrame(15, 25, view, W, H), false, "60 degrees to the side of a 90-degree field");
});

test("the densest sky: the fullest window around the horizon, not the average direction", () => {
  assert.equal(R.densestAzimuth([], 90), null);
  // one group around 300 degrees
  const west = []; for (let k = 0; k < 500; k++) west.push(280 + (k % 40));
  const facing = R.densestAzimuth(west, 90);
  assert.ok(Math.abs(R.wrap180(facing - 300)) < 25, "facing " + facing);
  // two lobes, at 60 and at 300, the second larger: the answer is the larger
  // lobe. Their mean direction is north, where there is nothing.
  const two = []; for (let k = 0; k < 300; k++) two.push(50 + (k % 20)); for (let k = 0; k < 500; k++) two.push(290 + (k % 20));
  const lobe = R.densestAzimuth(two, 60);
  assert.ok(Math.abs(R.wrap180(lobe - 300)) < 25, "facing " + lobe);
  // a group that straddles north
  const north = []; for (let k = 0; k < 400; k++) north.push((350 + (k % 20)) % 360);
  assert.ok(Math.abs(R.wrap180(R.densestAzimuth(north, 90))) < 30, "facing " + R.densestAzimuth(north, 90));
});
