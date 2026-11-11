// Generates test/golden/golden.json: frozen summarize() outputs for five
// fixed (seed, state) tuples. Run with: node tools/make-golden.mjs
// Any model change that alters these must be intentional (regenerate and
// note it in the commit/change log).
import { readFileSync, writeFileSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));

const cases = [
  { name: "equator-equinox-dusk",   cfg: { seed: 12345 },                           state: { latDeg: 0,   doy: 79,  solarTimeHours: 18.5 } },
  { name: "40N-june-dusk",          cfg: { seed: 12345 },                           state: { latDeg: 40,  doy: 172, solarTimeHours: 20.2 } },
  { name: "55N-june-midnight",      cfg: { seed: 12345 },                           state: { latDeg: 55,  doy: 172, solarTimeHours: 0 } },
  { name: "mitigated-million",      cfg: { seed: 777, totalSats: 1000000 },         state: { latDeg: 0,   doy: 79,  solarTimeHours: 18.5, brightnessRefMag: 5.5 } },
  { name: "clustered-300k-dusk",    cfg: { seed: 12345, clustering: { enabled: true, satsPerCluster: 100, memberSigma: 0.35, clusterDiameterKm: 1.0, diameterSigma: 0.35 } }, state: { latDeg: 0, doy: 79, solarTimeHours: 18.5 } },
  { name: "50k-low-shells-30deg",   cfg: { seed: 42, totalSats: 50000, ssoFraction: 0.3 }, state: { latDeg: 20, doy: 265, solarTimeHours: 19.5 } },
];

const out = [];
for (const c of cases) {
  const cfg = M.defaultConfig(data, c.cfg);
  const cons = M.generateConstellation(cfg, data);
  const s = M.summarize(cons, c.state, data, catalog);
  out.push({ name: c.name, cfg: c.cfg, state: c.state, expect: s });
  console.log(c.name, JSON.stringify(s));
}
writeFileSync(new URL("../test/golden/golden.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("golden.json written");
