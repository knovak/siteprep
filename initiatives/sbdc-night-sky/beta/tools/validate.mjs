import { readFileSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));
const scenario = options => M.generateConstellation(M.defaultConfig(data, options), data);
function report(label, constellation, state) {
  const result = M.summarize(constellation, state, data, catalog);
  console.log(`${label}: ${result.visibleObjects} visible objects (${result.visible} members), ` +
    `${result.visibleStars} stars; ${result.sunlitAbove} sunlit of ${result.aboveHorizon} above the horizon.`);
  return result.visibleObjects;
}
console.log("Scenario comparisons (model output, not observations)");
for (const [label, latitude, config, magnitudes] of [
  ["Illustrative 300k", 0, { totalSats: 300000, seed: 12345 }, [0.5]],
  ["7k, single 550 km shell; inclined family is a proxy", 40,
    { totalSats: 7000, ssoFraction: 0, trains: 0, seed: 4242, shells: [{ altKm: 550, share: 1 }] }, [3.5, 4.5]],
  ["1M", 0, { totalSats: 1000000, seed: 777 }, [0.5, 3, 5.5]],
]) {
  const constellation = scenario(config);
  const solarTimeHours = label === "1M" ? 18.5 : M.sunCrossings(latitude, 79, -0.833, data).sets[0] + 0.75;
  const counts = magnitudes.map(brightnessRefMag => report(`${label}, reference +${brightnessRefMag}`,
    constellation, { latDeg: latitude, doy: 79, solarTimeHours, brightnessRefMag }));
  if (counts.length > 1) console.log(`Change between endpoints: ${counts.at(-1) - counts[0]} objects.`);
}

const observation = JSON.parse(readFileSync(new URL("../test/fixtures/paranal-dark-v.json", import.meta.url)));
const modeled = M.zenithMu(-30, data);
console.log(`Observed dark zenith V: ${observation.mean} ± ${observation.rms} RMS (${observation.count} measurements). ` +
  `Modeled ${modeled}; difference ${(modeled - observation.mean).toFixed(2)} mag/arcsec². This checks only the sky background.`);
console.log("Deterministic regression and cross-model comparisons are tested separately by npm test.");
