import { readFileSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));
for (const [latDeg, doy, seed, clustered] of [[40, 172, 12345, false], [-30, 355, 54321, false], [40, 79, 54321, true]]) {
  const options = { seed, totalSats: 300000 };
  if (clustered) options.clustering = { enabled: true, satsPerCluster: 100, clusterDiameterKm: 0.1, memberSigma: 0, diameterSigma: 0 };
  const constellation = M.generateConstellation(M.defaultConfig(data, options), data);
  const state = { latDeg, doy, brightnessRefMag: 0.5, userLimitingMag: 6, moon: "off" };
  for (const [cap, step] of [[30000, 15], [100000, 5], [300000, 5], [300000, 2.5]]) {
    const thin = M.thinConstellation(constellation, cap);
    const hours = M.significantHours(M.nightSamples(thin, state, data, catalog, step), step);
    console.log([latDeg, doy, seed, clustered, thin.n, step, ...[hours.atLeast100, hours.outnumberStars, hours.exceedsSky].map(value => +(value * 60).toFixed(1))].join("\t"));
  }
}
