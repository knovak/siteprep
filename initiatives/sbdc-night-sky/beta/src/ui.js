// SBDC Night-Sky Simulator — UI layer. Developed by Ken Novak and David Sandalow, draft for review 2026-07-20
/**
 * sbdc ui — controls, interaction, and readouts over the tested model
 * and renderer. Reads embedded JSON blocks (#sbdc-data, #bsc-catalog).
 * All state lives in App.state; recomputes are staged:
 *   config change  -> regenerate constellation (debounced, busy flag)
 *   observer/time  -> re-evaluate satellites + stars (throttled)
 *   pan/zoom       -> redraw only (cached evaluation)
 */

/* global MODEL, RENDER — injected by the build (same module scope) */

const App = {
  data: null, catalog: null,
  cons: null, ev: null, stars: null, starVis: null, summary: null,
  renderer: null,
  playing: null, playTimer: null,          // null | "rt" | "ff"
  timeLock: false, timeAnchor: null,       // twilight-locked time (v3)
  shimmer: true,                           // along-track motion in fast-forward
  state: {
    latDeg: 40, doy: 172, solarTimeHours: 20.7,
    brightnessRefMag: 0.5, userLimitingMag: 6.0, propagationSec: 0,
  },
  cfg: {
    totalSats: 300000, ssoFraction: 0.7, shellPreset: "spread",
    trains: 1, seed: 12345,
    clustering: { enabled: false, satsPerCluster: 100, memberSigma: 0.35,
                  clusterDiameterKm: 1.0, diameterSigma: 0.35 },
  },
};

const $ = (id) => document.getElementById(id);

/* ------------------------- i18n (EN / FR) ------------------------- */
/* The assumptions table stays in English: sbdc-data.json is the single
   English source of truth for the auditable physics. */

const LANG = { cur: "en" };
const TR = {
  tagline: ["what a constellation of space-based data centers does to the sky — physics-based, every assumption inspectable",
            "l'effet d'une constellation de centres de données spatiaux sur le ciel — fondé sur la physique, chaque hypothèse inspectable"],
  assumBtn: ["Assumptions & data", "Hypothèses et données"],
  saveBtn: ["Save PNG", "Enregistrer PNG"],
  grpObserver: ["Observer", "Observateur"],
  grpConstellation: ["Constellation", "Constellation"],
  grpSky: ["Sky & display", "Ciel et affichage"],
  lat: ["Latitude", "Latitude"], date: ["Date", "Date"],
  time: ["Local time", "Heure locale"],
  jumpSunset: ["Sunset", "Coucher"], jumpD30: ["+30 min", "+30 min"],
  jumpD60: ["+60 min", "+60 min"], jumpMid: ["Midnight", "Minuit"],
  jumpDawn: ["Dawn −30", "Aube −30"], jumpDawn60: ["Dawn −60", "Aube −60"],
  timelock: ["Hold time relative to sunset/dawn as latitude changes",
             "Garder l\u2019heure relative au coucher/à l\u2019aube quand la latitude change"],
  playRt: ["▶ Real time", "▶ Temps réel"], pauseRt: ["❚❚ Real time", "❚❚ Temps réel"],
  playFf: ["▶▶ Fast forward", "▶▶ Avance rapide"], pauseFf: ["❚❚ Fast forward", "❚❚ Avance rapide"],
  shimmer: ["Satellites move in fast forward (shimmer)", "Satellites en mouvement en avance rapide (scintillement)"],
  sats: ["Satellites", "Satellites"],
  fams: ["Orbit families", "Familles d'orbites"],
  shells: ["Shell altitudes", "Altitudes des coquilles"],
  shLow: ["Low (550–650 km)", "Basses (550–650 km)"],
  shMid: ["Mid (750–1,150 km)", "Moyennes (750–1 150 km)"],
  shSpread: ["Spread (550–1,800 km)", "Étalées (550–1 800 km)"],
  shCustom: ["Custom…", "Personnalisé…"],
  customFmt: ["format: altitude:share, e.g. 550:0.5, 1200:0.5",
              "format : altitude:part, ex. 550:0.5, 1200:0.5"],
  bright: ["SBDC brightness", "Luminosité des SBDC"],
  bUnmit: ["unmitigated", "sans atténuation"],
  bStrong: ["strong mitigation", "atténuation forte"],
  bIau: ["IAU target", "cible UAI"],
  hintBright: ["median mag at 1,000 km reference · +0.5 ≈ unmitigated · +5.5 ≈ strong mitigation (Starlink record) · +7 = IAU target",
               "mag médiane à la référence 1 000 km · +0,5 ≈ sans atténuation · +5,5 ≈ atténuation forte (record Starlink) · +7 = cible UAI"],
  trains: ["Recent launch trains", "Trains de lancement récents"],
  seed: ["Seed (reproducibility)", "Graine (reproductibilité)"],
  grpAdvanced: ["Advanced", "Avancé"],
  clusterOn: ["Cluster into data-center groups", "Regrouper en grappes de centres de données"],
  cpc: ["Satellites per cluster", "Satellites par grappe"],
  cdia: ["Cluster diameter", "Diamètre de grappe"],
  cvar: ["Cluster membership variation", "Variation d\u2019effectif des grappes"],
  cdvar: ["Cluster diameter variation", "Variation du diamètre des grappes"],
  clDerived: ["clusters", "grappes"],
  rVisObjects: ["naked-eye VISIBLE objects", "OBJETS VISIBLES à l\u2019œil nu"],
  rSatsIn: ["satellites within", "satellites inclus"],
  ttCluster: ["SBDC cluster (compact knot)", "Grappe de SBDC (nœud compact)"],
  ttMembers: ["satellites", "satellites"],
  ttExtent: ["across", "d\u2019étendue"],
  ttCombined: ["combined mag", "mag combinée"],
  reseed: ["Randomize", "Aléatoire"],
  view: ["View", "Vue"],
  viewHorizon: ["Horizon (drag to look around)", "Horizon (glisser pour regarder)"],
  viewFish: ["All-sky fisheye (zenith at center)", "Ciel entier (zénith au centre)"],
  eyelim: ["Eye / sky quality limit", "Limite œil / qualité du ciel"],
  showStars: ["Show stars (Yale Bright Star Catalog)", "Afficher les étoiles (catalogue Yale)"],
  tint: ["Tint by orbit family (analysis aid)", "Colorer par famille d'orbite (aide à l'analyse)"],
  longexp: ["Long-exposure camera (30 s) — the astronomy view", "Pose longue (30 s) — la vue astronomique"],
  hintFcc: ["FCC filing envelope: up to 1,000,000", "enveloppe du dossier FCC : jusqu'à 1 000 000"],
  markPole: ["Mark celestial pole (sky\u2019s rotation center)", "Marquer le pôle céleste (centre de rotation du ciel)"],
  poleN: ["north celestial pole", "pôle céleste nord"],
  poleS: ["south celestial pole", "pôle céleste sud"],
  hintStarlim: ["lower = light-polluted site", "plus bas = site pollué par la lumière"],
  hintDrag: ["Drag to pan · scroll to zoom · arrows/±/space on keyboard · hover a bright point for details",
             "Glisser pour se déplacer · pincer/molette pour zoomer · flèches/±/espace au clavier · toucher un point brillant pour les détails"],
  hintLongexp: ["every sunlit satellite becomes a 12–27° streak; stars to the catalog limit",
                "chaque satellite éclairé devient une traînée de 12–27° ; étoiles jusqu'à la limite du catalogue"],
  busy: ["computing…", "calcul…"],
  facing: ["facing", "cap"],
  rSun: ["SUN", "SOLEIL"], rAbove: ["SBDCs above horizon", "SBDC au-dessus de l'horizon"],
  rSunlit: ["sunlit", "éclairés"], rVisible: ["naked-eye VISIBLE", "VISIBLES à l'œil nu"],
  rStars: ["visible stars", "étoiles visibles"], rBrightest: ["brightest mag", "mag la plus brillante"],
  rTime: ["local time", "heure locale"], rSeed: ["seed", "graine"],
  rDef: ["visible = sunlit + above horizon + brighter than the twilight naked-eye threshold",
         "visibles = éclairés + au-dessus de l'horizon + plus brillants que le seuil crépusculaire à l'œil nu"],
  rCam: ["camera mode: streaks = one 30 s exposure, stars to catalog limit",
         "mode caméra : traînées = une pose de 30 s, étoiles jusqu'à la limite du catalogue"],
  sunsetLbl: ["sunset", "coucher"], sunriseLbl: ["sunrise", "lever"],
  polarDay: ["polar day — no sunset", "jour polaire — pas de coucher"],
  polarNight: ["polar night — no sunrise", "nuit polaire — pas de lever"],
  aVenus: ["Venus-class", "classe Vénus"],
  aSirius: ["brighter than Sirius", "plus brillant que Sirius"],
  aJupiter: ["like Jupiter", "comme Jupiter"],
  aBright: ["like a bright star", "comme une étoile brillante"],
  aStar: ["star-like", "comme une étoile"],
  famSso: ["Sun-synchronous", "héliosynchrone"],
  fam30: ["30° shell", "coquille 30°"],
  famTrain: ["launch train", "train de lancement"],
  ttRange: ["range", "distance"], ttShell: ["shell", "coquille"],
  ttSunlit: ["sunlit", "éclairé"], ttShadow: ["in Earth's shadow", "dans l'ombre de la Terre"],
  ttStar: ["star", "étoile"],
};
const T = (k) => TR[k][LANG.cur === "fr" ? 1 : 0];
const MONTHS = {
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  fr: ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"],
};

function applyLang(lang) {
  LANG.cur = lang;
  $("lang-toggle").textContent = lang === "en" ? "FR" : "EN";
  document.documentElement.lang = lang;
  const txt = (sel, k) => { const el = document.querySelector(sel); if (el) el.textContent = T(k); };
  const lbl = (sel, k) => {
    const el = document.querySelector(sel);
    if (el && el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = T(k) + " ";
  };
  txt("header .sub", "tagline");
  txt("#open-assumptions", "assumBtn"); txt("#snapshot", "saveBtn");
  const sums = document.querySelectorAll("aside details.grp > summary");
  ["grpObserver", "grpConstellation", "grpSky", "grpAdvanced"].forEach((k, i) => {
    if (sums[i]) sums[i].textContent = T(k);
  });
  lbl('label[for="lat"]', "lat"); lbl('label[for="date"]', "date");
  lbl('label[for="time"]', "time"); lbl('label[for="nsats"]', "sats");
  lbl('label[for="sso"]', "fams"); lbl('label[for="brightness"]', "bright");
  lbl('label[for="trains"]', "trains"); lbl('label[for="starlim"]', "eyelim");
  lbl('label[for="cpc"]', "cpc"); lbl('label[for="cdia"]', "cdia");
  lbl('label[for="cvar"]', "cvar"); lbl('label[for="cdvar"]', "cdvar");
  txt('label[for="clusteron"]', "clusterOn"); txt('label[for="timelock"]', "timelock");
  txt('label[for="shimmer"]', "shimmer"); txt("#jump-dawn60", "jumpDawn60");
  txt("#hint-bright", "hintBright");
  $("play-rt").textContent = App.playing === "rt" ? T("pauseRt") : T("playRt");
  $("play-ff").textContent = App.playing === "ff" ? T("pauseFf") : T("playFf");
  if ($("bright-label") && App.state) $("bright-label").textContent = brightLabel(App.state.brightnessRefMag);
  txt('label[for="shells"]', "shells"); txt('label[for="seed"]', "seed");
  txt('label[for="view"], label[for="viewmode"]', "view");
  txt("#jump-sunset", "jumpSunset"); txt("#jump-dusk30", "jumpD30");
  txt("#jump-dusk60", "jumpD60"); txt("#jump-midnight", "jumpMid");
  txt("#jump-dawn30", "jumpDawn"); txt("#reseed", "reseed");
  txt('#shells option[value="low"]', "shLow"); txt('#shells option[value="mid"]', "shMid");
  txt('#shells option[value="spread"]', "shSpread"); txt('#shells option[value="custom"]', "shCustom");
  txt('#viewmode option[value="horizon"]', "viewHorizon");
  txt('#viewmode option[value="fisheye"]', "viewFish");
  txt('label[for="show-stars"]', "showStars"); txt('label[for="tint"]', "tint");
  txt('label[for="longexp"]', "longexp"); txt('label[for="markpole"]', "markPole");
  if (App.renderer) {
    App.renderer.poleLabels = [T("poleN"), T("poleS")];
    redraw();
  }
  txt("#hint-fcc", "hintFcc");
  txt("#hint-starlim", "hintStarlim"); txt("#hint-drag", "hintDrag");
  txt("#hint-longexp", "hintLongexp"); txt("#busy", "busy");
  if (App.summary) { updateReadout(); updateDateLabels(); }
}
const fmtTime = (h) => {
  const t = ((h % 24) + 24) % 24;
  const hh = Math.floor(t), mm = Math.round((t - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
};
const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
function fmtDoy(doy) {
  const names = MONTHS[LANG.cur] || MONTHS.en;
  let d = doy;
  for (let i = 0; i < 12; i++) { if (d <= MONTH_DAYS[i]) return `${names[i]} ${d}`; d -= MONTH_DAYS[i]; }
  return `${names[11]} 31`;
}

/* ------------------------- recompute pipeline ------------------------- */

function rebuildConstellation() {
  setBusy(true);
  setTimeout(() => {
    const d = App.data;
    const cfg = MODEL.defaultConfig(d, {
      totalSats: App.cfg.totalSats,
      ssoFraction: App.cfg.ssoFraction,
      shells: App.cfg.shellPreset === "custom" && App.cfg.customShells
        ? App.cfg.customShells
        : d.scenario.shellPresets.value[App.cfg.shellPreset === "custom" ? "spread" : App.cfg.shellPreset],
      trains: App.cfg.trains,
      clustering: { ...App.cfg.clustering },
      seed: App.cfg.seed,
    });
    App.state.propagationSec = 0;   // fresh constellation, fresh clock
    App.cons = MODEL.generateConstellation(cfg, d);
    reevaluate();
  }, 10);
}

let evalPending = false;
function reevaluate() {
  if (evalPending) return;
  evalPending = true;
  requestAnimationFrame(() => {
    evalPending = false;
    const { data, catalog, cons, state } = App;
    App.ev = MODEL.evaluate(cons, state, data);
    const st = MODEL.starAltAz(catalog, state.latDeg, state.doy, state.solarTimeHours, data);
    App.stars = st;
    App.starVis = MODEL.starVisibility(
      catalog, st, state.latDeg, App.ev.sunDir, App.ev.sunAltDeg,
      state.userLimitingMag, data).vis;
    // camera mode: a 30 s exposure records the whole catalog, and each
    // satellite needs its end-of-exposure sky position
    if (App.renderer.longExposure) {
      App.streaks = MODEL.streakEndpoints(cons, state, data,
        data.photometry.cameraMode.value.exposureSec);
      const all = new Uint8Array(catalog.count);
      for (let i = 0; i < catalog.count; i++) all[i] = st.altDeg[i] > 0 ? 1 : 0;
      App.starVisCam = all;
    } else {
      App.streaks = null;
    }
    App.summary = MODEL.summarize(cons, state, data, catalog);
    redraw();
    updateReadout();
    updateDateLabels();
    setBusy(false);
  });
}

function redraw() {
  if (!App.ev) return;
  const cam = App.renderer.longExposure;
  App.renderer.draw(App.state, App.ev, App.cons, App.stars,
    cam ? App.starVisCam : App.starVis, cam ? App.streaks : null);
}

/* ------------------------- readouts ------------------------- */


function brightLabel(m) {
  const s = (m >= 0 ? "+" : "\u2212") + Math.abs(m).toFixed(1);
  if (Math.abs(m - 0.5) < 0.26) return `${s} \u2014 ${T("bUnmit")}`;
  if (Math.abs(m - 5.5) < 0.26) return `${s} \u2014 ${T("bStrong")}`;
  if (m >= 6.75) return `${s} \u2014 ${T("bIau")}`;
  return `${s} mag`;
}

function brightAnchor(m) {
  if (m == null) return "";
  if (m < -3.3) return T("aVenus");
  if (m < -1.2) return T("aSirius");
  if (m < 0.3) return T("aJupiter");
  if (m < 1.6) return T("aBright");
  return T("aStar");
}

function updateReadout() {
  const s = App.summary;
  const line =
    `${T("rSun")} ${s.sunAltDeg > 0 ? "+" : ""}${s.sunAltDeg.toFixed(1)}°  ·  ` +
    `${T("rAbove")} ${s.aboveHorizon.toLocaleString()}  ·  ${T("rSunlit")} ${s.sunlitAbove.toLocaleString()}  ·  ` +
    (App.cfg.clustering && App.cfg.clustering.enabled
      ? `${T("rVisObjects")} ${s.visibleObjects.toLocaleString()} (${s.visible.toLocaleString()} ${T("rSatsIn")})`
      : `${T("rVisible")} ${s.visible.toLocaleString()}`) +
    `  ·  ${T("rStars")} ${s.visibleStars.toLocaleString()}` +
    (s.brightestObjectMag != null
      ? `  ·  ${T("rBrightest")} ${s.brightestObjectMag.toFixed(1)} (${brightAnchor(s.brightestObjectMag)})` : "");
  $("readout").textContent = line;
  $("readout-sub").textContent =
    `lat ${App.state.latDeg}°  ·  ${fmtDoy(App.state.doy)}  ·  ${fmtTime(App.state.solarTimeHours)} ${T("rTime")}` +
    `  ·  ${T("rSeed")} ${App.cfg.seed}  ·  ` +
    (App.renderer && App.renderer.longExposure ? T("rCam") : T("rDef"));
}

function updateDateLabels() {
  const tw = MODEL.twilightTimes(App.state.latDeg, App.state.doy, App.data);
  let txt;
  if (tw.sunset.alwaysAbove) txt = T("polarDay");
  else if (tw.sunset.alwaysBelow) txt = T("polarNight");
  else txt = `${T("sunsetLbl")} ${fmtTime(tw.sunset.sets[0])} · ${T("sunriseLbl")} ${fmtTime(tw.sunset.rises[0])}`;
  $("sun-events").textContent = txt;
  $("date-label").textContent = fmtDoy(App.state.doy);
  $("time-label").textContent = fmtTime(App.state.solarTimeHours);
  $("lat-label").textContent = `${Math.abs(App.state.latDeg)}°${App.state.latDeg >= 0 ? "N" : "S"}`;
}

function setBusy(b) { $("busy").style.visibility = b ? "visible" : "hidden"; }

/* ------------------------- quick time jumps ------------------------- */

function jumpTo(kind) {
  const tw = MODEL.twilightTimes(App.state.latDeg, App.state.doy, App.data);
  const set = tw.sunset.sets[0], rise = tw.sunset.rises[0];
  let t = App.state.solarTimeHours;
  if (kind === "sunset" && set != null) t = set;
  else if (kind === "dusk30" && set != null) t = set + 0.5;
  else if (kind === "dusk60" && set != null) t = set + 1.0;
  else if (kind === "midnight") t = 0;
  else if (kind === "dawn30" && rise != null) t = rise - 0.5;
  else if (kind === "dawn60" && rise != null) t = rise - 1.0;
  App.state.solarTimeHours = ((t % 24) + 24) % 24;
  $("time").value = Math.round(App.state.solarTimeHours * 60);
  reevaluate();
}

/* ------------------------- play ------------------------- */

/* Twilight-locked time (v3): keep the chosen sunset/dawn-relative offset
   when latitude or date changes. Falls back to absolute time under polar
   day/night (no reference event exists). */
function setAnchorFromJump(k) {
  const map = { sunset: ["sunset", 0], dusk30: ["sunset", 30], dusk60: ["sunset", 60],
                dawn30: ["dawn", -30], dawn60: ["dawn", -60], midnight: null };
  App.timeAnchor = map[k] ? { ref: map[k][0], offsetMin: map[k][1] } : null;
}
function twilightRefs() {
  const tw = MODEL.twilightTimes(App.state.latDeg, App.state.doy, App.data);
  return {
    sunset: tw.sunset.sets.length ? tw.sunset.sets[0] : null,
    dawn: tw.sunset.rises.length ? tw.sunset.rises[0] : null,
  };
}
function anchorFromCurrentTime() {
  const r = twilightRefs();
  if (r.sunset == null && r.dawn == null) { App.timeAnchor = null; return; }
  const t = App.state.solarTimeHours;
  const dSun = r.sunset == null ? 99 : Math.abs(((t - r.sunset + 36) % 24) - 12);
  const dDawn = r.dawn == null ? 99 : Math.abs(((t - r.dawn + 36) % 24) - 12);
  const ref = dSun <= dDawn ? "sunset" : "dawn";
  const base = ref === "sunset" ? r.sunset : r.dawn;
  App.timeAnchor = { ref, offsetMin: Math.round((((t - base + 36) % 24) - 12) * 60) };
}
function applyTimeLock() {
  if (!App.timeLock || !App.timeAnchor) return;
  const r = twilightRefs();
  const base = App.timeAnchor.ref === "sunset" ? r.sunset : r.dawn;
  if (base == null) return;                       // polar day/night: hold absolute
  App.state.solarTimeHours = ((base + App.timeAnchor.offsetMin / 60) % 24 + 24) % 24;
  $("time").value = Math.round(App.state.solarTimeHours * 60);
}

/* Dual playback (v3). "rt": simulated time advances at wall-clock speed and
   satellites propagate along their orbits — they visibly cross the sky at
   0.4-0.9 deg/s while the stars barely move. "ff": accelerated sweep;
   along-track motion follows the shimmer toggle (App.shimmer, default on). */
function setPlaying(p) {
  App.playing = p;
  $("play-rt").textContent = p === "rt" ? T("pauseRt") : T("playRt");
  $("play-ff").textContent = p === "ff" ? T("pauseFf") : T("playFf");
  if (App.playTimer) { clearInterval(App.playTimer); App.playTimer = null; }
  if (!p) return;
  const slow = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (p === "rt") {
    let last = Date.now();
    App.playTimer = setInterval(() => {
      const now = Date.now(), dt = (now - last) / 1000; last = now;
      App.state.solarTimeHours = (App.state.solarTimeHours + dt / 3600) % 24;
      App.state.propagationSec = (App.state.propagationSec || 0) + dt;
      $("time").value = Math.round(App.state.solarTimeHours * 60);
      reevaluate();
    }, slow ? 1000 : 330);
  } else {
    const stepMin = slow ? 20 : 6;       // simulated minutes per tick
    App.playTimer = setInterval(() => {
      App.state.solarTimeHours = (App.state.solarTimeHours + stepMin / 60) % 24;
      if (App.shimmer) App.state.propagationSec = (App.state.propagationSec || 0) + stepMin * 60;
      $("time").value = Math.round(App.state.solarTimeHours * 60);
      reevaluate();
    }, slow ? 650 : 140);
  }
}

/* ------------------------- assumptions panel ------------------------- */

function buildAssumptions() {
  const host = $("assump-body");
  host.innerHTML = "";
  const d = App.data;
  const conf = (c) => `<span class="chip chip-${c.split(" ")[0]}">${c}</span>`;
  for (const [section, entries] of Object.entries(d)) {
    if (section.startsWith("_")) continue;
    const h = document.createElement("h3");
    h.textContent = section;
    host.appendChild(h);
    if (entries._note) {
      const p = document.createElement("p");
      p.className = "assump-note"; p.textContent = entries._note;
      host.appendChild(p);
    }
    const tbl = document.createElement("table");
    tbl.innerHTML = "<thead><tr><th>parameter</th><th>value</th><th>units</th><th>source</th><th>confidence</th></tr></thead>";
    const tb = document.createElement("tbody");
    for (const [key, e] of Object.entries(entries)) {
      if (key.startsWith("_") || e == null || typeof e !== "object" || !("value" in e)) continue;
      const tr = document.createElement("tr");
      let val = JSON.stringify(e.value);
      if (val.length > 90) val = val.slice(0, 87) + "…";
      tr.innerHTML = `<td>${key}</td><td class="mono">${val}</td>` +
        `<td>${e.units || ""}</td><td>${e.source || ""}</td><td>${conf(e.confidence || "")}</td>`;
      tb.appendChild(tr);
    }
    tbl.appendChild(tb);
    host.appendChild(tbl);
  }
}

/* ------------------------- snapshot ------------------------- */

function snapshot() {
  const src = App.renderer.canvas;
  const CAP = 96;
  const out = document.createElement("canvas");
  out.width = src.width; out.height = src.height + CAP;
  const g = out.getContext("2d");
  g.drawImage(src, 0, 0);
  g.fillStyle = "#0d0f16"; g.fillRect(0, src.height, out.width, CAP);
  g.fillStyle = "#e8e4d8";
  g.font = `${Math.max(12, out.width / 105)}px ui-monospace, monospace`;
  g.fillText($("readout").textContent, 14, src.height + 30);
  g.fillStyle = "#8b8fa3";
  g.fillText($("readout-sub").textContent, 14, src.height + 56);
  g.fillStyle = "#6b6f83";
  g.font = `${Math.max(10, out.width / 130)}px ui-monospace, monospace`;
  g.fillText("Developed by Ken Novak and David Sandalow, draft for review 2026-07-20", 14, src.height + 82);
  out.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sbdc-sky_lat${App.state.latDeg}_${fmtDoy(App.state.doy).replace(" ", "")}_${fmtTime(App.state.solarTimeHours).replace(":", "")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}

/* ------------------------- interaction ------------------------- */

function bindCanvas() {
  const cv = App.renderer.canvas;
  const pointers = new Map();   // pointerId -> {x, y}
  let drag = null;              // single-pointer pan anchor
  let pinch = null;             // { dist0, fov0 }

  const pinchDist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  cv.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cv.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY,
               az: App.renderer.view.centerAz, alt: App.renderer.view.centerAlt };
      pinch = null;
    } else if (pointers.size === 2 && App.renderer.view.mode === "horizon") {
      drag = null;
      pinch = { dist0: pinchDist(), fov0: App.renderer.view.fovDeg };
    }
  });
  cv.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = App.renderer.view;
    if (pinch && pointers.size === 2) {
      const d = pinchDist();
      if (d > 10) {
        v.fovDeg = Math.max(20, Math.min(140, pinch.fov0 * pinch.dist0 / d));
        redraw();
      }
    } else if (drag && v.mode === "horizon") {
      const degPerPx = v.fovDeg / cv.getBoundingClientRect().width;
      v.centerAz = ((drag.az - (e.clientX - drag.x) * degPerPx) % 360 + 360) % 360;
      v.centerAlt = Math.max(-5, Math.min(80,
        drag.alt + (e.clientY - drag.y) * degPerPx));
      redraw();
      $("compass").textContent = `${T("facing")} ${Math.round(v.centerAz)}°`;
    } else if (!drag && !pinch) {
      hover(e);
    }
  });
  const lift = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) drag = null;
  };
  cv.addEventListener("pointerup", lift);
  cv.addEventListener("pointercancel", lift);
  cv.addEventListener("wheel", (e) => {
    e.preventDefault();
    const v = App.renderer.view;
    if (v.mode !== "horizon") return;
    v.fovDeg = Math.max(20, Math.min(140, v.fovDeg * (e.deltaY > 0 ? 1.1 : 0.9)));
    redraw();
  }, { passive: false });
}

function hover(e) {
  const rect = App.renderer.canvas.getBoundingClientRect();
  const scale = App.renderer.canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale, y = (e.clientY - rect.top) * scale;
  const hit = App.renderer.pick(x, y);
  const tip = $("tooltip");
  if (!hit) { tip.style.display = "none"; return; }
  let html;
  if (hit.kind === "sat") {
    const i = hit.i, ev = App.ev, fam = [T("famSso"), T("fam30"), T("famTrain")][App.cons.family[i]];
    const ci = ev.clusterInfo && ev.clusterInfo.get(App.cons.clusterId[i]);
    if (ci && ci.compact) {
      html = `<b>${T("ttCluster")}</b><br>` +
        `${ci.count} ${T("ttMembers")} · ${(ci.extentDeg * 60).toFixed(0)}\u2032 ${T("ttExtent")}<br>` +
        `${T("ttCombined")} ${ci.combinedMag != null ? ci.combinedMag.toFixed(1) : "—"} · ${T("ttRange")} ${Math.round(ev.range[i]).toLocaleString()} km<br>` +
        `alt ${ev.alt[i].toFixed(1)}° · az ${ev.az[i].toFixed(0)}° · ${fam}`;
    } else {
      html = `<b>SBDC — ${fam}</b><br>` +
        `alt ${ev.alt[i].toFixed(1)}° · az ${ev.az[i].toFixed(0)}°<br>` +
        `${T("ttRange")} ${Math.round(ev.range[i]).toLocaleString()} km · ${T("ttShell")} ${Math.round(App.cons.shellAlt[i])} km<br>` +
        `mag ${ev.mag[i].toFixed(1)} · ${ev.sunlit[i] ? T("ttSunlit") : T("ttShadow")}`;
    }
  } else {
    const i = hit.i, name = App.catalog.names[String(i)] || T("ttStar");
    html = `<b>${name}</b><br>V mag ${(App.catalog.v[i] / 10).toFixed(1)}`;
  }
  tip.innerHTML = html;
  tip.style.display = "block";
  tip.style.left = Math.min(rect.width - 190, e.clientX - rect.left + 14) + "px";
  tip.style.top = (e.clientY - rect.top + 14) + "px";
}

/* ------------------------- controls binding ------------------------- */

function bindControls() {
  const on = (id, evt, fn) => $(id).addEventListener(evt, fn);

  on("lat", "input", (e) => { App.state.latDeg = +e.target.value; applyTimeLock(); reevaluate(); });
  on("date", "input", (e) => { App.state.doy = +e.target.value; applyTimeLock(); reevaluate(); });
  on("time", "input", (e) => {
    App.state.solarTimeHours = +e.target.value / 60;
    if (App.timeLock) anchorFromCurrentTime();
    reevaluate();
  });

  for (const k of ["sunset", "dusk30", "dusk60", "midnight", "dawn30", "dawn60"])
    on("jump-" + k, "click", () => { jumpTo(k); setAnchorFromJump(k); });
  on("timelock", "change", (e) => {
    App.timeLock = e.target.checked;
    if (App.timeLock && !App.timeAnchor) anchorFromCurrentTime();
  });
  on("play-rt", "click", () => setPlaying(App.playing === "rt" ? null : "rt"));
  on("play-ff", "click", () => setPlaying(App.playing === "ff" ? null : "ff"));
  on("shimmer", "change", (e) => { App.shimmer = e.target.checked; });

  on("nsats", "input", (e) => {
    // log slider 0..100 -> 10k..1M (per review; lower bound was 50k)
    const f = +e.target.value / 100;
    let n = Math.round(10000 * Math.pow(100, f) / 1000) * 1000;
    if (Math.abs(n - 300000) <= 5000) n = 300000;  // snap to the report default
    App.cfg.totalSats = n;
    $("nsats-label").textContent = App.cfg.totalSats.toLocaleString();
  });
  on("nsats", "change", rebuildConstellation);
  on("sso", "input", (e) => {
    App.cfg.ssoFraction = +e.target.value / 100;
    $("sso-label").textContent = `${e.target.value}% SSO / ${100 - e.target.value}% 30°`;
  });
  on("sso", "change", rebuildConstellation);
  on("shells", "change", (e) => {
    const custom = e.target.value === "custom";
    $("shells-custom").style.display = custom ? "" : "none";
    if (custom) {
      const parsed = MODEL.parseShellSpec($("shells-custom-input").value);
      if (!parsed) return; // wait for a valid spec
      App.cfg.customShells = parsed;
    }
    App.cfg.shellPreset = e.target.value;
    rebuildConstellation();
  });
  on("shells-custom-input", "change", (e) => {
    const parsed = MODEL.parseShellSpec(e.target.value);
    $("shells-custom-hint").textContent = parsed
      ? parsed.map((s) => `${s.altKm} km ${(s.share * 100).toFixed(0)}%`).join(" · ")
      : T("customFmt");
    if (parsed && $("shells").value === "custom") {
      App.cfg.customShells = parsed;
      rebuildConstellation();
    }
  });
  on("longexp", "change", (e) => {
    App.renderer.longExposure = e.target.checked;
    reevaluate();
  });
  on("markpole", "change", (e) => {
    App.renderer.markPole = e.target.checked;
    redraw();
  });
  on("brightness", "input", (e) => {
    App.state.brightnessRefMag = +e.target.value / 10;
    $("bright-label").textContent = brightLabel(App.state.brightnessRefMag);
    reevaluate();
  });
  const clusterDerived = () => {
    const n = Math.round(App.cfg.totalSats / App.cfg.clustering.satsPerCluster);
    $("cluster-derived").textContent = `\u2248 ${n.toLocaleString()} ${T("clDerived")}`;
  };
  on("clusteron", "change", (e) => {
    App.cfg.clustering.enabled = e.target.checked;
    $("cluster-ctls").style.display = e.target.checked ? "" : "none";
    clusterDerived();
    rebuildConstellation();
  });
  on("cpc", "input", (e) => {
    App.cfg.clustering.satsPerCluster = Math.round(10 * Math.pow(100, +e.target.value / 100));
    $("cpc-label").textContent = App.cfg.clustering.satsPerCluster.toLocaleString();
    clusterDerived();
  });
  on("cpc", "change", () => { if (App.cfg.clustering.enabled) rebuildConstellation(); });
  on("cdia", "input", (e) => {
    App.cfg.clustering.clusterDiameterKm =
      Math.round(0.2 * Math.pow(50, +e.target.value / 100) * 10) / 10;
    $("cdia-label").textContent = App.cfg.clustering.clusterDiameterKm.toFixed(1) + " km";
  });
  on("cdia", "change", () => { if (App.cfg.clustering.enabled) rebuildConstellation(); });
  on("cvar", "input", (e) => {
    App.cfg.clustering.memberSigma = +e.target.value / 100;
    $("cvar-label").textContent = App.cfg.clustering.memberSigma.toFixed(2);
  });
  on("cvar", "change", () => { if (App.cfg.clustering.enabled) rebuildConstellation(); });
  on("cdvar", "input", (e) => {
    App.cfg.clustering.diameterSigma = +e.target.value / 100;
    $("cdvar-label").textContent = App.cfg.clustering.diameterSigma.toFixed(2);
  });
  on("cdvar", "change", () => { if (App.cfg.clustering.enabled) rebuildConstellation(); });

  on("trains", "input", (e) => { $("trains-label").textContent = e.target.value; });
  on("trains", "change", (e) => { App.cfg.trains = +e.target.value; rebuildConstellation(); });
  on("seed", "change", (e) => { App.cfg.seed = (+e.target.value | 0); rebuildConstellation(); });
  on("reseed", "click", () => {
    App.cfg.seed = (Math.random() * 1e9) | 0;
    $("seed").value = App.cfg.seed;
    rebuildConstellation();
  });

  on("starlim", "input", (e) => {
    App.state.userLimitingMag = +e.target.value / 10;
    $("starlim-label").textContent = `mag ${App.state.userLimitingMag.toFixed(1)}`;
    reevaluate();
  });
  on("show-stars", "change", (e) => { App.renderer.showStars = e.target.checked; redraw(); });
  on("tint", "change", (e) => { App.renderer.tintFamilies = e.target.checked; redraw(); });
  on("viewmode", "change", (e) => {
    App.renderer.view.mode = e.target.value;
    $("compass").style.display = e.target.value === "horizon" ? "" : "none";
    redraw();
  });

  on("open-assumptions", "click", () => { $("assump").classList.add("open"); });
  on("close-assumptions", "click", () => { $("assump").classList.remove("open"); });
  on("snapshot", "click", snapshot);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    const v = App.renderer.view;
    if (e.key === "ArrowLeft") { v.centerAz = (v.centerAz - 5 + 360) % 360; redraw(); }
    else if (e.key === "ArrowRight") { v.centerAz = (v.centerAz + 5) % 360; redraw(); }
    else if (e.key === "ArrowUp") { v.centerAlt = Math.min(80, v.centerAlt + 3); redraw(); }
    else if (e.key === "ArrowDown") { v.centerAlt = Math.max(-5, v.centerAlt - 3); redraw(); }
    else if (e.key === "+" || e.key === "=") { v.fovDeg = Math.max(20, v.fovDeg * 0.9); redraw(); }
    else if (e.key === "-") { v.fovDeg = Math.min(140, v.fovDeg * 1.1); redraw(); }
    else if (e.key === " ") { e.preventDefault(); setPlaying(App.playing ? null : "ff"); }
  });
}

/* ------------------------- boot ------------------------- */

// Surface any runtime failure on the page itself — webview consoles often
// reduce errors to an unactionable "Script error."
function installErrorBanner() {
  const show = (msg) => {
    let el = document.getElementById("errbar");
    if (!el) {
      el = document.createElement("div");
      el.id = "errbar";
      el.innerHTML = '<span></span><button aria-label="Dismiss">×</button>';
      el.lastChild.onclick = () => el.remove();
      document.body.appendChild(el);
    }
    el.firstChild.textContent = "Simulator error — please report: " + msg;
  };
  window.addEventListener("error", (e) =>
    show(`${e.message} (${(e.filename || "inline").split("/").pop()}:${e.lineno})`));
  window.addEventListener("unhandledrejection", (e) =>
    show(String(e.reason && e.reason.message || e.reason)));
}

function resizeCanvas() {
  const wrap = $("canvas-wrap");
  const cv = App.renderer.canvas;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  // Never let a collapsed layout produce a zero-size canvas (iOS Safari
  // throws on zero-dimension canvas operations).
  const wCss = wrap.clientWidth || document.documentElement.clientWidth || 640;
  const hCss = wrap.clientHeight ||
    Math.round((window.innerHeight || 700) * 0.5) || 360;
  cv.width = Math.max(64, Math.round(wCss * dpr));
  cv.height = Math.max(64, Math.round(hCss * dpr));
  redraw();
}

function boot() {
  installErrorBanner();
  App.data = JSON.parse(document.getElementById("sbdc-data").textContent);
  App.catalog = JSON.parse(document.getElementById("bsc-catalog").textContent);
  App.renderer = new RENDER.SkyRenderer($("sky"), MODEL, App.data);

  // initial time: 30 min after sunset for the defaults
  const tw = MODEL.twilightTimes(App.state.latDeg, App.state.doy, App.data);
  if (tw.sunset.sets.length) App.state.solarTimeHours = tw.sunset.sets[0] + 0.5;
  $("time").value = Math.round(App.state.solarTimeHours * 60);

  buildAssumptions();
  bindControls();
  bindCanvas();
  $("lang-toggle").addEventListener("click", () =>
    applyLang(LANG.cur === "en" ? "fr" : "en"));
  // On phones, keep the sky pinned and start with only Observer expanded —
  // the other groups stay one tap away without pushing the sky off screen.
  const narrow = typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 900px)").matches;
  if (narrow) {
    document.querySelectorAll("aside details.grp").forEach((d, i) => {
      if (i > 0) d.open = false;
    });
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 250));
  resizeCanvas();
  rebuildConstellation();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else boot();
}
