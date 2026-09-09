// Headless smoke test of the BUILT artifact: loads dist/sbdc-sky-simulator.html
// in jsdom (with node-canvas), lets the app boot and render, then saves the
// actual app canvas to /tmp/smoke_*.png and checks readout content.
// Also exercises: time jump, mitigation change, fisheye view.
import { readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";

let html = readFileSync(new URL("../dist/sbdc-sky-simulator.html", import.meta.url), "utf8");
// jsdom cannot execute <script type="module">; the built script has no
// imports/exports, so run it as a classic script.
html = html.replace('<script type="module">', "<script>");

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "file:///sim/sbdc-sky-simulator.html",
});
const { window } = dom;
// jsdom has no layout: give the canvas host a size before boot completes.
Object.defineProperty(window.HTMLElement.prototype, "clientWidth", {
  get() { return this.id === "canvas-wrap" ? 1280 : 300; },
});
Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
  get() { return this.id === "canvas-wrap" ? 760 : 40; },
});
window.dispatchEvent(new window.Event("resize"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const doc = window.document;

function shoot(name) {
  const cv = doc.getElementById("sky");
  const dataUrl = cv.toDataURL("image/png");
  writeFileSync("/tmp/smoke_" + name + ".png", Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("saved /tmp/smoke_" + name + ".png", cv.width + "x" + cv.height);
}

const fail = (m) => { console.error("SMOKE FAIL:", m); process.exit(1); };

await sleep(4500); // boot + constellation build + first evaluate/draw

const readout = doc.getElementById("readout").textContent;
console.log("READOUT:", readout);
if (!/VISIBLE [\d,]+/.test(readout)) fail("readout not populated: " + readout);
if (!/visible stars [\d,]+/.test(readout)) fail("star count missing");
shoot("1_default_40N_jun_dusk");

// jump to midnight (should collapse visible counts at 40N June? partially)
doc.getElementById("jump-midnight").click();
await sleep(900);
console.log("MIDNIGHT:", doc.getElementById("readout").textContent);
shoot("2_midnight");

// equator equinox dusk — the classic dense-band scene
doc.getElementById("lat").value = "0";
doc.getElementById("lat").dispatchEvent(new window.Event("input"));
doc.getElementById("date").value = "79";
doc.getElementById("date").dispatchEvent(new window.Event("input"));
await sleep(500);
doc.getElementById("jump-dusk30").click();
await sleep(900);
const eq = doc.getElementById("readout").textContent;
console.log("EQ DUSK:", eq);
const vis = +(eq.match(/VISIBLE ([\d,]+)/)[1].replace(/,/g, ""));
if (vis < 5000) fail("equator dusk visible count implausibly low: " + vis);
shoot("3_equator_equinox_dusk");

// brightness slider to strong mitigation (+5.5)
doc.getElementById("brightness").value = "55";
doc.getElementById("brightness").dispatchEvent(new window.Event("input"));
await sleep(900);
const mit = doc.getElementById("readout").textContent;
console.log("MITIGATED:", mit);
const visM = +(mit.match(/VISIBLE ([\d,]+)/)[1].replace(/,/g, ""));
if (visM >= vis) fail("brightness +5.5 did not reduce visible count");
shoot("4_equator_dusk_fully_mitigated");

// fisheye all-sky view
doc.getElementById("brightness").value = "5";
doc.getElementById("brightness").dispatchEvent(new window.Event("input"));
doc.getElementById("viewmode").value = "fisheye";
doc.getElementById("viewmode").dispatchEvent(new window.Event("change"));
await sleep(900);
shoot("5_allsky_fisheye");

// regression: the fisheye disk must not bloom into an over-exposed white
// blob (the failure mode rejected in the report review) — check the mean
// luminance of the central patch of the canvas.
{
  const cv = doc.getElementById("sky");
  const g = cv.getContext("2d");
  const S = 120;
  const px = g.getImageData((cv.width - S) / 2, (cv.height - S) / 2, S, S).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += (px[i] + px[i + 1] + px[i + 2]) / 3;
  const mean = sum / (px.length / 4) / 255;
  if (mean > 0.55) throw new Error(`fisheye center over-exposed: mean ${mean.toFixed(3)} > 0.55`);
  console.log(`fisheye center mean luminance ${mean.toFixed(3)} (<= 0.55 ok)`);
}

// ---- v2: long-exposure camera mode ----
doc.getElementById("viewmode").value = "horizon";
doc.getElementById("viewmode").dispatchEvent(new window.Event("change"));
doc.getElementById("longexp").checked = true;
doc.getElementById("longexp").dispatchEvent(new window.Event("change"));
await sleep(900);
shoot("6_long_exposure");
{
  const cv = doc.getElementById("sky");
  const g = cv.getContext("2d");
  const d = g.getImageData(0, 0, cv.width, Math.floor(cv.height * 0.9)).data;
  let lum = 0;
  for (let i = 0; i < d.length; i += 4) lum += d[i] + d[i + 1] + d[i + 2];
  lum /= (d.length / 4) * 3 * 255;
  if (lum < 0.03) fail("long-exposure frame appears black: " + lum.toFixed(4));
  if (!doc.getElementById("readout-sub").textContent.includes("camera mode"))
    fail("camera-mode note missing from readout");
  console.log("LONG-EXPOSURE OK — frame mean " + lum.toFixed(3));
}
doc.getElementById("longexp").checked = false;
doc.getElementById("longexp").dispatchEvent(new window.Event("change"));
await sleep(400);

// ---- v2: language toggle EN -> FR -> EN ----
{
  doc.getElementById("lang-toggle").click();
  await sleep(200);
  const sum0 = doc.querySelector("aside details.grp > summary").textContent;
  if (sum0 !== "Observateur") fail("FR toggle failed: summary = " + sum0);
  if (!doc.getElementById("readout").textContent.startsWith("SOLEIL"))
    fail("FR readout failed: " + doc.getElementById("readout").textContent.slice(0, 30));
  doc.getElementById("lang-toggle").click();
  await sleep(200);
  if (doc.querySelector("aside details.grp > summary").textContent !== "Observer")
    fail("EN toggle-back failed");
  console.log("LANGUAGE OK — EN -> FR -> EN");
}

// ---- v2: custom shells ----
{
  doc.getElementById("shells").value = "custom";
  doc.getElementById("shells-custom-input").value = "600:1, 1500:1";
  doc.getElementById("shells-custom-input").dispatchEvent(new window.Event("change"));
  doc.getElementById("shells").dispatchEvent(new window.Event("change"));
  await sleep(1300);
  const hint = doc.getElementById("shells-custom-hint").textContent;
  if (!/600 km 50%/.test(hint)) fail("custom shell hint wrong: " + hint);
  console.log("CUSTOM SHELLS OK — " + hint);
  doc.getElementById("shells").value = "spread";
  doc.getElementById("shells").dispatchEvent(new window.Event("change"));
  await sleep(1300);
}

// ---- review changes + v3: brightness, ranges, pole, playback, clusters ----
{
  const br = doc.getElementById("brightness");
  if (br.min !== "-70" || br.max !== "70") fail("brightness slider range: " + br.min + ".." + br.max);
  if (br.value !== "5") fail("brightness default should be +0.5 (value 5): " + br.value);
  br.value = "55"; br.dispatchEvent(new window.Event("input"));
  await sleep(500);
  const bl = doc.getElementById("bright-label").textContent;
  if (!bl.includes("+5.5")) fail("brightness +5.5 label wrong: " + bl);
  br.value = "5"; br.dispatchEvent(new window.Event("input"));
  await sleep(400);

  const ns = doc.getElementById("nsats");
  ns.value = "0"; ns.dispatchEvent(new window.Event("input"));
  const nlbl = doc.getElementById("nsats-label").textContent.replace(/[^0-9]/g, "");
  if (nlbl !== "10000") fail("satellites min should be 10,000: " + nlbl);
  ns.value = "74"; ns.dispatchEvent(new window.Event("input"));
  const nlbl2 = doc.getElementById("nsats-label").textContent.replace(/[^0-9]/g, "");
  if (nlbl2 !== "300000") fail("default slider position should read 300,000: " + nlbl2);

  const mp = doc.getElementById("markpole");
  if (!mp.checked) fail("markpole should default on");
  mp.checked = false; mp.dispatchEvent(new window.Event("change"));
  await sleep(150);
  mp.checked = true; mp.dispatchEvent(new window.Event("change"));
  await sleep(150);

  // v3: playback buttons + shimmer default
  if (!doc.getElementById("play-rt") || !doc.getElementById("play-ff")) fail("dual play buttons missing");
  if (!doc.getElementById("shimmer").checked) fail("shimmer should default ON");
  if (!doc.getElementById("jump-dawn60")) fail("Dawn -60 button missing");

  // v3: twilight lock — enable, jump to sunset+30, move latitude, verify hold
  doc.getElementById("jump-dusk30").click();
  await sleep(600);
  doc.getElementById("timelock").checked = true;
  doc.getElementById("timelock").dispatchEvent(new window.Event("change"));
  const lat = doc.getElementById("lat");
  lat.value = "0"; lat.dispatchEvent(new window.Event("input"));
  await sleep(700);
  const sub = doc.getElementById("readout-sub").textContent;
  if (!/18:3\d/.test(sub)) fail("timelock: expected ~sunset+30 (18:30) at equator equinox-ish, got: " + sub);
  doc.getElementById("timelock").checked = false;
  doc.getElementById("timelock").dispatchEvent(new window.Event("change"));
  lat.value = "40"; lat.dispatchEvent(new window.Event("input"));
  await sleep(500);
}
console.log("REVIEW CHANGES OK — brightness slider, 10k floor, pole, playback, timelock");

// ---- v3: clustering toggle end to end ----
{
  doc.getElementById("clusteron").checked = true;
  doc.getElementById("clusteron").dispatchEvent(new window.Event("change"));
  await sleep(1600);
  const ro = doc.getElementById("readout").textContent;
  if (!/objects/i.test(ro)) fail("clustered readout should report objects: " + ro.slice(0, 80));
  const mObj = ro.match(/objects\s+([\d,]+)\s+\(([\d,]+)/i);
  if (!mObj) fail("cannot parse objects readout: " + ro.slice(0, 100));
  const nObj = +mObj[1].replace(/,/g, ""), nSat = +mObj[2].replace(/,/g, "");
  if (!(nObj > 10 && nObj < nSat / 5)) fail(`object aggregation implausible: ${nObj} objects / ${nSat} sats`);
  shoot("7_clustered_knots");
  console.log(`CLUSTERING OK — ${nObj} visible objects containing ${nSat} satellites`);
  doc.getElementById("clusteron").checked = false;
  doc.getElementById("clusteron").dispatchEvent(new window.Event("change"));
  await sleep(1400);
}

// ---- attribution + control placement (2026-07-20 refinements) ----
{
  const at = doc.getElementById("attribution");
  if (!at || !/Ken Novak and David Sandalow/.test(at.textContent)) fail("attribution element missing/wrong");
  const grps = [...doc.querySelectorAll("aside details.grp")];
  if (!grps[3].contains(doc.getElementById("shimmer"))) fail("shimmer should live in the Advanced group");
  const tl = doc.querySelector('label[for="timelock"]').textContent;
  if (!/as latitude changes/.test(tl)) fail("timelock label not updated: " + tl);
  const tm = doc.querySelector('label[for="time"]').textContent;
  if (/solar/i.test(tm)) fail("time label should not say solar: " + tm);
  console.log("ATTRIBUTION & PLACEMENT OK");
}

// assumptions panel builds rows
const rows = doc.querySelectorAll("#assump-body tr").length;
console.log("assumptions rows:", rows);
if (rows < 20) fail("assumptions panel too sparse: " + rows);

console.log("SMOKE OK — visible", vis, "-> mitigated", visM);
window.close();

// ---- second boot: phone-sized layout (390x430 canvas host) ----
// exercises the mobile code path end to end; asserts a real-sized canvas
// and a rendered (non-black) frame with no window errors.
{
  const dom2 = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true,
    url: "file:///sim/sbdc-sky-simulator.html",
    beforeParse(w) {
      // simulate a phone: max-width queries match, reduced-motion doesn't
      w.matchMedia = (q) => ({
        matches: /max-width/.test(q), media: q,
        addEventListener() {}, removeEventListener() {},
        addListener() {}, removeListener() {},
      });
    },
  });
  const w2 = dom2.window;
  const errs = [];
  w2.addEventListener("error", (e) => errs.push(e.message));
  Object.defineProperty(w2.HTMLElement.prototype, "clientWidth", {
    get() { return this.id === "canvas-wrap" ? 390 : 300; },
  });
  Object.defineProperty(w2.HTMLElement.prototype, "clientHeight", {
    get() { return this.id === "canvas-wrap" ? 430 : 40; },
  });
  w2.dispatchEvent(new w2.Event("resize"));
  await sleep(1400);
  const cv2 = w2.document.getElementById("sky");
  if (cv2.width < 300 || cv2.height < 300) throw new Error(`mobile canvas ${cv2.width}x${cv2.height}`);
  const g2 = cv2.getContext("2d");
  const d2 = g2.getImageData(0, 0, cv2.width, Math.floor(cv2.height * 0.9)).data;
  let lum = 0;
  for (let i = 0; i < d2.length; i += 4) lum += d2[i] + d2[i + 1] + d2[i + 2];
  lum /= (d2.length / 4) * 3 * 255;
  if (lum < 0.02) throw new Error("mobile frame appears black: mean " + lum.toFixed(4));
  if (errs.length) throw new Error("mobile boot errors: " + errs.join(" | "));
  // collapsible groups: on a phone only the first (Observer) stays open
  const grps = [...w2.document.querySelectorAll("aside details.grp")];
  if (grps.length !== 4) throw new Error("expected 4 control groups, got " + grps.length);
  const open = grps.map((d) => d.open);
  if (!(open[0] === true && !open[1] && !open[2] && !open[3]))
    throw new Error("mobile collapse wrong: " + JSON.stringify(open));
  console.log(`MOBILE OK — canvas ${cv2.width}x${cv2.height}, frame mean ${lum.toFixed(3)}, groups collapsed [${open}]`);
  w2.close();
}

// ---- third boot: pathological collapsed layout (0-height host) ----
// the guard must substitute a fallback height and never throw.
{
  const dom3 = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true,
    url: "file:///sim/sbdc-sky-simulator.html",
  });
  const w3 = dom3.window;
  const errs = [];
  w3.addEventListener("error", (e) => errs.push(e.message));
  Object.defineProperty(w3.HTMLElement.prototype, "clientWidth", {
    get() { return this.id === "canvas-wrap" ? 390 : 300; },
  });
  Object.defineProperty(w3.HTMLElement.prototype, "clientHeight", {
    get() { return 0; },
  });
  w3.dispatchEvent(new w3.Event("resize"));
  await sleep(1400);
  const cv3 = w3.document.getElementById("sky");
  if (cv3.height < 64) throw new Error("collapsed-layout fallback failed: h=" + cv3.height);
  if (errs.length) throw new Error("collapsed-layout errors: " + errs.join(" | "));
  console.log(`COLLAPSED-LAYOUT OK — fallback canvas ${cv3.width}x${cv3.height}, no errors`);
  w3.close();
}

process.exit(0);
