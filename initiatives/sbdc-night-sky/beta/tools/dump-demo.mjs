// Dumps model-evaluated skies (visible satellites + stars, sun position)
// for four demonstration scenarios -> /tmp/demo-skies.json
import { readFileSync, writeFileSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));

const cfg = M.defaultConfig(data, { seed: 12345 });
const C = M.generateConstellation(cfg, data);

const sunsetPlus = (lat, doy, plusH) => M.sunCrossings(lat, doy, -0.833, data).sets[0] + plusH;

const scenarios = [
  { name: "Equator, equinox, sunset+30 min — the classic band, N–S through the southern sky",
    latDeg: 0, doy: 79, solarTimeHours: sunsetPlus(0, 79, 0.5) },
  { name: "40°N, June solstice, sunset+30 min — band displaced into the west (solstice effect)",
    latDeg: 40, doy: 172, solarTimeHours: sunsetPlus(40, 172, 0.5) },
  { name: "55°N, June solstice, local midnight — all-night visibility",
    latDeg: 55, doy: 172, solarTimeHours: 0 },
  { name: "Equator, equinox, local midnight — SSO below horizon, 30° shell in shadow",
    latDeg: 0, doy: 79, solarTimeHours: 0 },
];

const out = [];
for (const sc of scenarios) {
  const state = { latDeg: sc.latDeg, doy: sc.doy, solarTimeHours: sc.solarTimeHours };
  const ev = M.evaluate(C, state, data);
  const sats = [];
  for (const i of ev.above) {
    if (!ev.visible[i]) continue;
    sats.push([+ev.az[i].toFixed(2), +ev.alt[i].toFixed(2), +ev.mag[i].toFixed(2), C.family[i]]);
  }
  const st = M.starAltAz(catalog, sc.latDeg, sc.doy, sc.solarTimeHours, data);
  const basis = M.enuBasis(sc.latDeg);
  const stars = [];
  const userCap = data.limitingMagnitude.userLimitingMagCap.value;
  for (let i = 0; i < catalog.count; i++) {
    if (st.altDeg[i] <= 0) continue;
    const aa = st.altDeg[i] * Math.PI / 180, zz = st.azDeg[i] * Math.PI / 180;
    const dir = [0, 1, 2].map((k) =>
      Math.cos(aa) * (Math.cos(zz) * basis.north[k] + Math.sin(zz) * basis.east[k]) +
      Math.sin(aa) * basis.up[k]);
    const mu = M.muAt(dir, ev.sunDir, ev.sunAltDeg, data);
    const lim = Math.min(M.limitingMag(mu, data), userCap);
    const m = st.vmag[i] + data.photometry.extinctionCoefficient.value * (M.airmass(st.altDeg[i]) - 1);
    if (m <= lim) stars.push([+st.azDeg[i].toFixed(2), +st.altDeg[i].toFixed(2), +st.vmag[i].toFixed(2)]);
  }
  const sunAA = M.sunAltAz(sc.latDeg, sc.doy, sc.solarTimeHours, data);
  out.push({ name: sc.name, sunAltDeg: +ev.sunAltDeg.toFixed(2), sunAzDeg: +sunAA.azDeg.toFixed(2),
             nVisibleSats: sats.length, nVisibleStars: stars.length, sats, stars });
  console.log(sc.name, "-> sats", sats.length, "stars", stars.length, "sunAlt", ev.sunAltDeg.toFixed(1));
}
writeFileSync("/tmp/demo-skies.json", JSON.stringify(out));
console.log("written /tmp/demo-skies.json");
