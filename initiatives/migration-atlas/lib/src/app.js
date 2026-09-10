// app.js — Migration Atlas, Phases 1–3 (atlas theme).
// Depends on: d3-geo (window.d3), core.js functions, ATLAS_DATA, LAND110, LAND50.

(function () {
  "use strict";

  // ---------- theme ----------
  const T = {
    page: "#0e2f36", ocean: "#123a42", land: "#1f545c", coast: "#3f7d84",
    graticule: "#1a4750", text: "#eaf6f2", subtext: "#8fb8b4",
    ui: "#0e2f36", uiEdge: "#2b5f66", accent: "#ffd166",
    palette: REGION_SPECTRUM,     // geographic sweep, Americas blue -> SE Asia violet (core.js)
    typePalette: TYPE_SPECTRUM,   // coercion spectrum, blue=voluntary -> red=coerced (core.js)
    confidence: { high: "#9ae3c0", medium: "#ffd166", low: "#ff8fa3" },
  };

  // ---------- state ----------
  let data = ATLAS_DATA;
  let DOMAIN = timeDomain(data);
  let density = [], maxDensity = 1;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let year = DOMAIN[0], playing = false, speed = 2, clockMode = "piecewise";
  let colorMode = "type";             // 'region' | 'type' — type (coercion spectrum) is default
  let hover = null;                    // migration object or null
  let selection = null;                // migration object or null
  let focusRange = null;               // {m, start, end}
  const filters = { types: new Set(), regions: new Set(), min: 0, query: "" };

  const $ = id => document.getElementById(id);
  function fmt(n) {
    if (n == null) return "—";
    if (n >= 1e6) { const v = n / 1e6; return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + "M"; }
    if (n >= 1e3) return Math.round(n / 1e3) + "K";
    return String(n);
  }
  function flowColor(m) {
    return colorMode === "region" ? (T.palette[m.region] || T.accent)
                                  : (T.typePalette[m.type] || T.accent);
  }
  function isVisible(m) {
    if (!filters.types.has(m.type) || !filters.regions.has(m.region)) return false;
    if (m.migrants < filters.min) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!(m.name.toLowerCase().includes(q) || m.cause.toLowerCase().includes(q) ||
            m.id.includes(q))) return false;
    }
    return true;
  }

  // ---------- canvases ----------
  const baseCv = $("base"), flowCv = $("flows");
  const bctx = baseCv.getContext("2d");
  const fctx = flowCv.getContext("2d");
  const pickCv = document.createElement("canvas"); // offscreen hit-test buffer
  const pctx = pickCv.getContext("2d", { willReadFrequently: true });
  let W = 0, H = 0, DPR = 1;
  let renderStamp = 0, pickStamp = -1;

  // ---------- projection camera ----------
  const projection = d3.geoEqualEarth();
  const cam = { rot: 0, s: 1, ty: 0 };
  let s0 = 1;
  const sphere = { type: "Sphere" };
  let lodTimer = null, useHiRes = false;

  function applyCamera() {
    projection.rotate([cam.rot, 0]).scale(cam.s).translate([W / 2, cam.ty]);
  }
  function zoomK() { return cam.s / s0; }
  function clampCamera() {
    cam.s = clamp(cam.s, 0.7 * s0, 40 * s0);
    applyCamera();
    const topY = projection([0, 89.9])[1], botY = projection([0, -89.9])[1];
    if (topY > H * 0.70) cam.ty -= topY - H * 0.70;
    if (botY < H * 0.30) cam.ty += H * 0.30 - botY;
    applyCamera();
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight - $("timebar").offsetHeight;
    for (const cv of [baseCv, flowCv]) {
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + "px"; cv.style.height = H + "px";
    }
    pickCv.width = W; pickCv.height = H;
    const keepRot = cam.rot, hadFit = s0 !== 1;
    const prevK = hadFit ? zoomK() : 1;
    projection.rotate([0, 0]);
    projection.fitExtent([[24, 20], [W - 24, H - 16]], sphere);
    s0 = projection.scale();
    cam.s = s0 * (hadFit ? prevK : 1);
    cam.ty = projection.translate()[1];
    cam.rot = keepRot;
    clampCamera();
    renderBase(); renderFlows();
  }

  // ---------- base layer ----------
  const graticule = d3.geoGraticule10();
  function renderBase() {
    applyCamera();
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.fillStyle = T.page; bctx.fillRect(0, 0, W, H);
    const path = d3.geoPath(projection, bctx);
    bctx.beginPath(); path(sphere); bctx.fillStyle = T.ocean; bctx.fill();
    bctx.beginPath(); path(graticule);
    bctx.strokeStyle = T.graticule; bctx.lineWidth = 0.7; bctx.stroke();
    const land = (useHiRes && zoomK() > 3) ? LAND50 : LAND110;
    bctx.beginPath(); path(land);
    bctx.fillStyle = T.land; bctx.fill();
    bctx.strokeStyle = T.coast; bctx.lineWidth = 0.7; bctx.stroke();
    bctx.beginPath(); path(sphere);
    bctx.strokeStyle = T.uiEdge; bctx.lineWidth = 1.2; bctx.stroke();
  }
  function scheduleHiRes() {
    useHiRes = false;
    clearTimeout(lodTimer);
    lodTimer = setTimeout(() => {
      if (zoomK() > 3) { useHiRes = true; renderBase(); }
    }, 180);
  }

  // ---------- flow geometry ----------
  const N = 72;
  function flowPathPts(src, dst, bowSign) {
    const interp = d3.geoInterpolate([src.lon, src.lat], [dst.lon, dst.lat]);
    const pts = new Array(N);
    for (let i = 0; i < N; i++) pts[i] = projection(interp(i / (N - 1)));
    const runs = [];
    let start = 0;
    const jump = Math.max(W * 0.45, cam.s * 2.2);
    for (let i = 1; i < N; i++)
      if (Math.abs(pts[i][0] - pts[i - 1][0]) > jump) { runs.push([start, i - 1]); start = i; }
    runs.push([start, N - 1]);
    if (runs.length === 1) {
      const a = pts[0], b = pts[N - 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      const bow = Math.min(L * 0.14, 90 * Math.sqrt(zoomK())) * bowSign;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), f = Math.sin(Math.PI * t) * bow;
        pts[i] = [pts[i][0] + nx * f, pts[i][1] + ny * f];
      }
    }
    return { pts, runs };
  }

  function ribbonSegment(pts, i0, i1, t0, t1, w0, w1, withHead) {
    const n = i1 - i0 + 1;
    if (n < 2) return null;
    const left = [], right = [];
    const headStart = withHead ? Math.max(2, Math.floor(n * 0.88)) : n;
    let head = null;
    for (let i = 0; i < n; i++) {
      const p = pts[i0 + i];
      const pPrev = pts[Math.max(i0, i0 + i - 1)], pNext = pts[Math.min(i1, i0 + i + 1)];
      let tx = pNext[0] - pPrev[0], ty2 = pNext[1] - pPrev[1];
      const tl = Math.hypot(tx, ty2) || 1; tx /= tl; ty2 /= tl;
      const nx = -ty2, ny = tx;
      const tg = t0 + (t1 - t0) * (i / (n - 1));
      const w = (w0 + (w1 - w0) * tg) / 2;
      if (i < headStart) {
        left.push([p[0] + nx * w, p[1] + ny * w]);
        right.push([p[0] - nx * w, p[1] - ny * w]);
      } else if (head === null) {
        const hw = w * 2.9;
        head = [[p[0] + nx * hw, p[1] + ny * hw], pts[i1].slice(), [p[0] - nx * hw, p[1] - ny * hw]];
      }
    }
    return { left, right, head };
  }
  function traceRibbon(ctx, rib) {
    ctx.beginPath();
    ctx.moveTo(rib.left[0][0], rib.left[0][1]);
    for (const p of rib.left) ctx.lineTo(p[0], p[1]);
    if (rib.head) for (const p of rib.head) ctx.lineTo(p[0], p[1]);
    for (let i = rib.right.length - 1; i >= 0; i--) ctx.lineTo(rib.right[i][0], rib.right[i][1]);
    ctx.closePath();
  }

  // ---------- dynamic layer + scene geometry ----------
  let sceneGeom = [];   // rebuilt each render; reused by the picking pass
  let shownCount = 0, activeCount = 0;

  function buildScene() {
    sceneGeom = [];
    shownCount = 0; activeCount = 0;
    for (const m of data.migrations) {
      if (!isVisible(m)) continue;
      shownCount++;
      const env = flowEnvelope(year, m.period.start, m.period.end);
      const grow = circleProgress(year, m.period.start, m.period.end);
      if (env.alpha > 0) activeCount++;
      const seed = hashStr(m.id);
      // residual circles
      if (grow > 0) {
        for (const d of m.destinations) {
          const r = circleRadiusPx(residualPopulation(d), zoomK()) * grow;
          if (r < 1.5) continue;
          const p = projection([d.lon, d.lat]);
          sceneGeom.push({ kind: "circle", m, d, x: p[0], y: p[1], r });
        }
      }
      // flow ribbons
      if (env.alpha > 0) {
        for (let di = 0; di < m.destinations.length; di++) {
          const d = m.destinations[di];
          const w = flowWidthPx(destVolume(m, d), zoomK());
          const bowSign = ((seed + di) % 2 === 0 ? 1 : -1);
          const { pts, runs } = flowPathPts(m.source, d, bowSign);
          const ribs = [];
          for (let ri = 0; ri < runs.length; ri++) {
            const [i0, i1] = runs[ri];
            const rib = ribbonSegment(pts, i0, i1, i0 / (N - 1), i1 / (N - 1),
                                      w * 0.30, w, ri === runs.length - 1);
            if (rib) ribs.push(rib);
          }
          sceneGeom.push({ kind: "flow", m, d, di, env, w, pts, ribs, seed });
        }
      }
    }
  }

  function renderFlows() {
    applyCamera();
    buildScene();
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fctx.clearRect(0, 0, W, H);
    const hl = hover ? hover.id : (selection ? selection.id : null);

    for (const g of sceneGeom) {
      if (g.kind !== "circle") continue;
      const color = flowColor(g.m);
      const dim = hl && g.m.id !== hl ? 0.3 : 1;
      fctx.beginPath(); fctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      fctx.fillStyle = color; fctx.globalAlpha = 0.45 * dim; fctx.fill();
      fctx.globalAlpha = 0.95 * dim; fctx.lineWidth = 1.6; fctx.strokeStyle = color; fctx.stroke();
      fctx.globalAlpha = 1;
    }
    for (const g of sceneGeom) {
      if (g.kind !== "flow") continue;
      const color = flowColor(g.m);
      const dim = hl && g.m.id !== hl ? 0.22 : 1;
      const lowConf = g.m.confidence === "low";
      const alpha = g.env.alpha * 0.92 * dim;
      for (const rib of g.ribs) {
        fctx.globalAlpha = alpha * 0.18;
        traceRibbon(fctx, rib);
        fctx.lineWidth = g.w * 1.6; fctx.strokeStyle = color;
        fctx.lineJoin = "round"; fctx.stroke();
        fctx.globalAlpha = alpha;
        traceRibbon(fctx, rib);
        fctx.fillStyle = color; fctx.fill();
        if (lowConf) {
          fctx.globalAlpha = Math.min(1, alpha + 0.15);
          fctx.setLineDash([5, 4]); fctx.lineWidth = 1;
          fctx.strokeStyle = color; fctx.stroke(); fctx.setLineDash([]);
        }
        if (g.m.id === hl) {
          fctx.globalAlpha = 0.9;
          traceRibbon(fctx, rib);
          fctx.lineWidth = 1.4; fctx.strokeStyle = T.text; fctx.stroke();
        }
        fctx.globalAlpha = 1;
      }
      if (!reducedMotion && g.w > 2.5) {
        fctx.fillStyle = "#ffffff";
        for (let j = 0; j < 3; j++) {
          const ph = particlePhase(year, g.seed * 0.001 + g.di * 7 + j * 11);
          const idx = Math.min(N - 1, Math.max(0, Math.round(ph * (N - 1))));
          const p = g.pts[idx];
          fctx.globalAlpha = 0.85 * g.env.alpha * dim;
          fctx.beginPath(); fctx.arc(p[0], p[1], Math.max(1.4, g.w * 0.30), 0, Math.PI * 2);
          fctx.fill();
        }
        fctx.globalAlpha = 1;
      }
    }

    renderStamp++;
    $("yearBig").textContent = Math.floor(year);
    $("stats").textContent =
      `${data.migrations.length} migrations · ${activeCount} active · ${shownCount} shown`;
    flowCv.setAttribute("aria-label",
      `World migration map, year ${Math.floor(year)}, ${activeCount} migrations active`);
    drawScrubber();
    if (!playing) writeHashSoon();
  }

  // ---------- picking (color buffer, rebuilt lazily) ----------
  let pickItems = [];
  function idToColor(i) { const v = i + 1; return `rgb(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255})`; }
  function renderPicking() {
    pickItems = [];
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, W, H);
    for (const g of sceneGeom) {
      const col = idToColor(pickItems.length);
      pickItems.push(g);
      pctx.fillStyle = col; pctx.strokeStyle = col;
      if (g.kind === "circle") {
        pctx.beginPath(); pctx.arc(g.x, g.y, Math.max(g.r, 6), 0, Math.PI * 2); pctx.fill();
      } else {
        for (const rib of g.ribs) {
          traceRibbon(pctx, rib);
          pctx.fill();
          pctx.lineWidth = Math.max(8, g.w); pctx.lineJoin = "round"; pctx.stroke();
        }
      }
    }
    pickStamp = renderStamp;
  }
  function pickAt(x, y) {
    if (pickStamp !== renderStamp) renderPicking();
    const d = pctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    if (d[3] === 0) return null;
    const v = (d[0] << 16) | (d[1] << 8) | d[2];
    return v > 0 && v <= pickItems.length ? pickItems[v - 1] : null;
  }

  // ---------- tooltip / detail panel ----------
  const tip = $("tip");
  function showTip(g, x, y) {
    const m = g.m;
    tip.innerHTML = `<div class="t1">${m.name}</div>
      <div class="t2">${m.period.start}–${m.period.end} · ${quantityLabel(m)}: ${fmt(m.migrants)}` +
      (g.kind === "circle" ? ` · ${g.d.name}: ${fmt(residualPopulation(g.d))} (${g.d.diaspora_today == null ? 'settlement estimate' : 'reported diaspora or stock'})` : "") +
      `</div>`;
    tip.style.display = "block";
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(x + 14, W - r.width - 8) + "px";
    tip.style.top = Math.min(y + 14, H - r.height - 8) + "px";
  }
  function hideTip() { tip.style.display = "none"; }

  function openDetail(m) {
    selection = m;
    $("dpTitle").textContent = m.name;
    const conf = `<span class="badge" style="background:${T.confidence[m.confidence]}">${m.confidence} confidence</span>`;
    $("dpMeta").innerHTML =
      `${m.period.start}–${m.period.end} · ${data.type_legend[m.type] ? m.type.replace(/-/g, " ") : m.type}` +
      ` · from ${data.region_legend[m.region] || m.region} &nbsp;${conf}`;
    let numHtml = `<div class="num">${quantityLabel(m)}: <b>${fmt(m.migrants)}</b>`;
    if (m.migrants_range) numHtml += ` <span style="color:${T.subtext}">(est. ${fmt(m.migrants_range[0])}–${fmt(m.migrants_range[1])})</span>`;
    numHtml += `</div>`;
    if (m.migrants_note) numHtml += `<div class="num" style="color:${T.subtext}">${m.migrants_note}</div>`;
    let dests = `<div class="dests">`;
    for (const d of m.destinations) {
      dests += `<div>→ ${d.name} <span>· settled ${fmt(d.settled)}` +
        (d.diaspora_today != null ? ` · reported diaspora / stock ${fmt(d.diaspora_today)}` : "") + `</span></div>`;
    }
    dests += `</div>`;
    $("dpBody").innerHTML =
      `<p>${m.cause}.</p>` + numHtml + dests +
      `<p class="dim">Map points represent the named regions schematically; an aggregate point does not locate every community. Destination figures may use different dates or populations and need not sum to the headline estimate. See the notes and sources before comparing them.</p>` +
      `<div class="refs">Sources: ${m.references.join("; ")}</div>`;
    $("filterPanel").style.display = "none";
    $("filtersBtn").setAttribute("aria-pressed", "false");
    $("detailPanel").style.display = "block";
    renderFlows();
  }
  function closeDetail() {
    selection = null;
    $("detailPanel").style.display = "none";
    renderFlows();
  }
  $("dpClose").onclick = closeDetail;

  // ---------- focus ----------
  function focusOn(m) {
    const pts = [[m.source.lon, m.source.lat]]
      .concat(m.destinations.map(d => [d.lon, d.lat]));
    // circular mean longitude -> rotation
    let sx = 0, sy = 0;
    for (const p of pts) { sx += Math.cos(p[0] * Math.PI / 180); sy += Math.sin(p[0] * Math.PI / 180); }
    cam.rot = -Math.atan2(sy, sx) * 180 / Math.PI;
    // iterate: fit bbox of projected points into 55% of viewport
    for (let it = 0; it < 3; it++) {
      applyCamera();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) {
        const s = projection(p);
        x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]);
        y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]);
      }
      const bw = Math.max(x1 - x0, 40), bh = Math.max(y1 - y0, 40);
      const f = Math.min((W * 0.55) / bw, (H * 0.55) / bh);
      cam.s = clamp(cam.s * Math.min(Math.max(f, 0.2), 5), 0.7 * s0, 40 * s0);
      applyCamera();
      let cy = 0;
      for (const p of pts) cy += projection(p)[1];
      cam.ty += H / 2 - cy / pts.length;
      clampCamera();
    }
    focusRange = { m, start: m.period.start, end: m.period.end + FADE_YEARS };
    $("focusName").textContent = "Focus: " + m.name;
    $("focusChip").style.display = "block";
    setYear(Math.max(DOMAIN[0], m.period.start - 1), false);
    scheduleHiRes(); renderBase(); renderFlows();
  }
  function clearFocus() {
    focusRange = null;
    $("focusChip").style.display = "none";
    renderFlows();
  }
  $("dpFocus").onclick = () => { if (selection) focusOn(selection); };
  $("focusClear").onclick = clearFocus;

  // ---------- timeline ----------
  function refreshDensity() {
    density = eraDensity(data, DOMAIN, 200);
    maxDensity = Math.max(...density, 1);
  }
  const scrub = $("scrub");
  const sctx = scrub.getContext("2d");
  let lastT = null, dragScrub = false;

  function scrubX(y) {
    const r = scrub.getBoundingClientRect();
    return (y - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0]) * r.width;
  }
  function scrubYearAt(x) {
    const r = scrub.getBoundingClientRect();
    return clamp(DOMAIN[0] + x / r.width * (DOMAIN[1] - DOMAIN[0]), DOMAIN[0], DOMAIN[1]);
  }
  function drawScrubber() {
    const r = scrub.getBoundingClientRect();
    const w = r.width, h = r.height;
    scrub.width = w * DPR; scrub.height = h * DPR;
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sctx.clearRect(0, 0, w, h);
    const trackY = h * 0.62;
    sctx.beginPath(); sctx.moveTo(0, trackY);
    for (let i = 0; i < density.length; i++)
      sctx.lineTo((i + 0.5) / density.length * w, trackY - (density[i] / maxDensity) * (h * 0.42));
    sctx.lineTo(w, trackY); sctx.closePath();
    sctx.fillStyle = T.subtext; sctx.globalAlpha = 0.30; sctx.fill(); sctx.globalAlpha = 1;
    sctx.strokeStyle = T.uiEdge; sctx.lineWidth = 4; sctx.lineCap = "round";
    sctx.beginPath(); sctx.moveTo(2, trackY); sctx.lineTo(w - 2, trackY); sctx.stroke();
    if (focusRange) { // highlight focused period
      sctx.strokeStyle = "#eaf6f2"; sctx.globalAlpha = 0.35; sctx.lineWidth = 8;
      sctx.beginPath(); sctx.moveTo(scrubX(focusRange.start), trackY);
      sctx.lineTo(scrubX(focusRange.end), trackY); sctx.stroke(); sctx.globalAlpha = 1;
    }
    const px = scrubX(year);
    sctx.strokeStyle = T.accent; sctx.lineWidth = 4;
    sctx.beginPath(); sctx.moveTo(2, trackY); sctx.lineTo(Math.max(2, px), trackY); sctx.stroke();
    sctx.fillStyle = T.subtext; sctx.font = "10px system-ui, sans-serif"; sctx.textAlign = "center";
    for (let y = 1000; y <= 2000; y += 200) sctx.fillText(y, scrubX(y), trackY + 16);
    sctx.beginPath(); sctx.arc(px, trackY, 7, 0, Math.PI * 2);
    sctx.fillStyle = T.text; sctx.fill();
    sctx.lineWidth = 2; sctx.strokeStyle = T.page; sctx.stroke();
  }
  function setYear(y, rerender = true) {
    year = clamp(y, DOMAIN[0], DOMAIN[1]);
    if (rerender) renderFlows();
  }
  function tick(t) {
    if (!playing) return;
    if (lastT !== null) {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      const dom = focusRange
        ? [Math.max(DOMAIN[0], focusRange.start - 1), Math.min(DOMAIN[1], focusRange.end)]
        : DOMAIN;
      const y = advanceYear(year, dt, speed, clockMode, dom);
      setYear(y, false);
      if (y >= dom[1]) setPlaying(false);
    }
    lastT = t;
    renderFlows();
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    playing = p;
    lastT = null;
    $("playBtn").textContent = p ? "❚❚" : "▶";
    if (p) requestAnimationFrame(tick);
  }

  // ---------- pointer interaction ----------
  const pointers = new Map();
  let anchor = null, pinch = null, downAt = null, moved = false;

  function geoAt(x, y) { applyCamera(); return projection.invert([x, y]); }
  function anchorTo(g, mx, my) {
    applyCamera();
    const p = projection(g);
    if (!p) return;
    const dxdlam = projection([g[0] + 0.5, g[1]])[0] - projection([g[0] - 0.5, g[1]])[0];
    if (Math.abs(dxdlam) > 1e-9) cam.rot += (mx - p[0]) / dxdlam;
    cam.rot = ((cam.rot + 180) % 360 + 360) % 360 - 180;
    applyCamera();
    cam.ty += my - projection(g)[1];
    clampCamera();
  }

  // iOS WebViews throw NotFoundError capturing already-released touch pointers.
  function safeCapture(el, id) { try { el.setPointerCapture(id); } catch (_) { } }

  flowCv.addEventListener("pointerdown", e => {
    safeCapture(flowCv, e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    downAt = [e.clientX, e.clientY]; moved = false;
    hideTip();
    if (pointers.size === 1) {
      const g = geoAt(e.clientX, e.clientY);
      anchor = g ? { g, id: e.pointerId } : null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]), s0: cam.s };
      anchor = null;
    }
  });
  flowCv.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) {
      // hover (no buttons)
      if (e.buttons === 0) {
        const g = pickAt(e.clientX, e.clientY);
        const id = g ? g.m.id : null;
        if ((hover && hover.id) !== id) { hover = g ? g.m : null; renderFlows(); }
        if (g) showTip(g, e.clientX, e.clientY); else hideTip();
        flowCv.style.cursor = g ? "pointer" : "grab";
      }
      return;
    }
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) moved = true;
    if (pointers.size === 1 && anchor && anchor.id === e.pointerId && moved) {
      anchorTo(anchor.g, e.clientX, e.clientY);
      renderBase(); renderFlows();
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const g = geoAt(mid[0], mid[1]);
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      cam.s = clamp(pinch.s0 * d / pinch.d0, 0.7 * s0, 40 * s0);
      if (g) anchorTo(g, mid[0], mid[1]); else clampCamera();
      scheduleHiRes(); renderBase(); renderFlows();
    }
  });
  const endPtr = e => {
    const wasClick = pointers.size === 1 && !moved;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) anchor = null;
    if (wasClick) {
      const g = pickAt(e.clientX, e.clientY);
      if (g) openDetail(g.m);
      else closeDetail();
    } else {
      scheduleHiRes(); renderBase(); renderFlows();
    }
  };
  flowCv.addEventListener("pointerup", endPtr);
  flowCv.addEventListener("pointercancel", e => { pointers.delete(e.pointerId); pinch = null; anchor = null; });

  flowCv.addEventListener("wheel", e => {
    e.preventDefault();
    hideTip();
    const g = geoAt(e.clientX, e.clientY);
    cam.s = clamp(cam.s * Math.pow(2, -e.deltaY * 0.0018), 0.7 * s0, 40 * s0);
    if (g) anchorTo(g, e.clientX, e.clientY); else clampCamera();
    scheduleHiRes(); renderBase(); renderFlows();
  }, { passive: false });
  flowCv.addEventListener("dblclick", e => {
    const g = geoAt(e.clientX, e.clientY);
    cam.s = clamp(cam.s * 1.7, 0.7 * s0, 40 * s0);
    if (g) anchorTo(g, e.clientX, e.clientY); else clampCamera();
    scheduleHiRes(); renderBase(); renderFlows();
  });
  flowCv.addEventListener("pointerleave", () => { hideTip(); if (hover) { hover = null; renderFlows(); } });

  // ---------- scrubber interaction ----------
  scrub.addEventListener("pointerdown", e => {
    dragScrub = true; safeCapture(scrub, e.pointerId);
    setYear(scrubYearAt(e.clientX - scrub.getBoundingClientRect().left));
  });
  scrub.addEventListener("pointermove", e => {
    if (dragScrub) setYear(scrubYearAt(e.clientX - scrub.getBoundingClientRect().left));
  });
  scrub.addEventListener("pointerup", () => dragScrub = false);

  // ---------- filters ----------
  function buildFilterUI() {
    const tc = $("typeChecks"); tc.innerHTML = "";
    for (const key of orderedTypes(data)) {
      const label = data.type_legend[key];
      filters.types.add(key);
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox" checked id="flt-type-${key}">
        <span class="sw" style="background:${T.typePalette[key] || T.accent}"></span>${key.replace(/-/g, " ")}`;
      lab.title = label;
      lab.querySelector("input").onchange = ev => {
        ev.target.checked ? filters.types.add(key) : filters.types.delete(key);
        renderFlows();
      };
      tc.appendChild(lab);
    }
    const rc = $("regionChecks"); rc.innerHTML = "";
    for (const key of orderedRegions(data)) {
      const label = data.region_legend[key];
      filters.regions.add(key);
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox" checked id="flt-region-${key}">
        <span class="sw" style="background:${T.palette[key]}"></span>${label}`;
      lab.querySelector("input").onchange = ev => {
        ev.target.checked ? filters.regions.add(key) : filters.regions.delete(key);
        renderFlows();
      };
      rc.appendChild(lab);
    }
  }
  function setAll(kind, on) {
    const legend = kind === "types" ? data.type_legend : data.region_legend;
    for (const key of Object.keys(legend)) {
      on ? filters[kind].add(key) : filters[kind].delete(key);
      const cb = $(`flt-${kind === "types" ? "type" : "region"}-${key}`);
      if (cb) cb.checked = on;
    }
    renderFlows();
  }
  $("allTypes").onclick = () => setAll("types", true);
  $("noTypes").onclick = () => setAll("types", false);
  $("allRegions").onclick = () => setAll("regions", true);
  $("noRegions").onclick = () => setAll("regions", false);
  $("searchBox").oninput = e => { filters.query = e.target.value.trim(); renderFlows(); };
  $("minSlider").oninput = e => {
    const v = +e.target.value;
    filters.min = v === 0 ? 0 : Math.round(Math.pow(10, 4 + (v / 100) * 4.5));
    $("minLabel").textContent = v === 0 ? "(all)" : "≥ " + fmt(filters.min);
    renderFlows();
  };
  $("filtersBtn").onclick = () => {
    const p = $("filterPanel");
    const open = p.style.display !== "block";
    p.style.display = open ? "block" : "none";
    $("filtersBtn").setAttribute("aria-pressed", String(open));
    if (open) { $("detailPanel").style.display = "none"; selection = null; renderFlows(); }
  };
  $("fpClose").onclick = () => {
    $("filterPanel").style.display = "none";
    $("filtersBtn").setAttribute("aria-pressed", "false");
  };

  // ---------- legend toggle (E1: hidden by default) ----------
  let legendVisible = false;
  function setLegend(v) {
    legendVisible = v;
    $("legend").style.display = v ? "block" : "none";
    $("legendBtn").setAttribute("aria-pressed", String(v));
    writeHashSoon();
  }
  $("legendBtn").onclick = () => setLegend(!legendVisible);

  // ---------- color mode ----------
  $("colorModeBtn").onclick = () => {
    colorMode = colorMode === "region" ? "type" : "region";
    $("colorModeBtn").textContent = "Color: " + colorMode;
    $("colorModeBtn").setAttribute("aria-pressed", String(colorMode === "type"));
    buildLegend(); renderFlows();
  };

  // Types in canonical coercion order; novel types from dropped-in datasets last.
  function orderedTypes(d) {
    const known = TYPE_ORDER.filter(k => k in d.type_legend);
    const extra = Object.keys(d.type_legend).filter(k => !TYPE_ORDER.includes(k));
    return known.concat(extra);
  }

  // Regions in canonical west->east order; novel regions from datasets last.
  function orderedRegions(d) {
    const known = REGION_ORDER.filter(k => k in d.region_legend);
    const extra = Object.keys(d.region_legend).filter(k => !REGION_ORDER.includes(k));
    return known.concat(extra);
  }

  // ---------- legend ----------
  function buildLegend() {
    const el = $("legendRegions"); el.innerHTML = "";
    const entries = colorMode === "region"
      ? orderedRegions(data).map(k => [T.palette[k] || T.accent, data.region_legend[k]])
      : orderedTypes(data).map(k => [T.typePalette[k] || T.accent, k.replace(/-/g, " ")]);
    $("legendColorTitle").textContent = colorMode === "region"
      ? "COLOR = SOURCE REGION · WEST (BLUE) → EAST (VIOLET)"
      : "COLOR = TYPE · BLUE = VOLUNTARY → RED = COERCED";
    for (const [color, label] of entries) {
      const row = document.createElement("div"); row.className = "lgRow";
      const sw = document.createElement("span"); sw.className = "sw";
      sw.style.background = color;
      row.appendChild(sw); row.appendChild(document.createTextNode(label));
      el.appendChild(row);
    }
    const wl = $("legendWidths"); wl.innerHTML = "";
    for (const [label, mv] of [["1M", 1e6], ["10M", 1e7], ["30M", 3e7]]) {
      const row = document.createElement("div"); row.className = "lgRow";
      const bar = document.createElement("span"); bar.className = "wbar";
      bar.style.height = flowWidthPx(mv, 1).toFixed(1) + "px";
      row.appendChild(bar); row.appendChild(document.createTextNode(label));
      wl.appendChild(row);
    }
  }

  // ---------- data table & about modals ----------
  function buildTable() {
    const tb = $("dataTable").querySelector("tbody");
    tb.innerHTML = "";
    const sorted = [...data.migrations].sort((a, b) => a.period.start - b.period.start);
    for (const m of sorted) {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.innerHTML = `<td>${m.name}</td><td>${m.period.start}–${m.period.end}</td>
        <td>${m.type.replace(/-/g, " ")}</td><td>${data.region_legend[m.region] || m.region}</td>
        <td class="r">${fmt(m.migrants)}<br><small>${quantityLabel(m)}</small></td><td>${m.confidence}</td>`;
      const open = () => { closeModal($("tableModal")); openDetail(m); focusOn(m); };
      tr.onclick = open;
      tr.onkeydown = ev => {
        if (ev.key === "Enter") {
          // Closing restores button focus; consume Enter before its native click.
          ev.preventDefault();
          open();
        }
      };
      tb.appendChild(tr);
    }
  }
  const modalOpeners = new WeakMap();
  function openModal(el) {
    modalOpeners.set(el, document.activeElement);
    el.style.display = "flex";
    el.querySelector(".xBtn").focus();
  }
  function closeModal(el) {
    el.style.display = "none";
    modalOpeners.get(el)?.focus();
  }
  $("tableBtn").onclick = () => { buildTable(); openModal($("tableModal")); };
  $("aboutBtn").onclick = () => openModal($("aboutModal"));
  for (const el of document.querySelectorAll(".modalWrap")) {
    el.addEventListener("click", e => { if (e.target === el) closeModal(el); });
    el.querySelector("[data-close]").onclick = () => closeModal(el);
  }

  // ---------- toast ----------
  let toastTimer = null;
  function toast(msg, ms = 3500) {
    const t = $("toast");
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.style.display = "none", ms);
  }

  // ---------- drag & drop dataset (Phase 5 workflow) ----------
  window.addEventListener("dragover", e => e.preventDefault());
  window.addEventListener("drop", async e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      const { errors, warnings } = validateData(parsed);
      if (errors.length) {
        toast("Data rejected — " + errors.length + " error(s): " + errors.slice(0, 2).join(" · "), 6000);
        return;
      }
      adoptData(parsed);
      toast(`Loaded ${parsed.migrations.length} migrations from ${f.name}` +
            (warnings.length ? ` (${warnings.length} warning(s))` : ""));
    } catch (err) {
      toast("Could not read file: " + err.message, 5000);
    }
  });
  function adoptData(d) {
    data = d;
    DOMAIN = timeDomain(data);
    filters.types.clear(); filters.regions.clear();
    selection = null; hover = null; focusRange = null;
    $("detailPanel").style.display = "none";
    $("focusChip").style.display = "none";
    buildFilterUI(); buildLegend(); refreshDensity();
    setYear(clamp(year, DOMAIN[0], DOMAIN[1]));
  }

  // ---------- URL permalink ----------
  let hashTimer = null, applyingHash = false, permalinkOk = true;
  function writeHashSoon() {
    if (applyingHash || !permalinkOk) return;
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      if (!permalinkOk) return;
      const h = `#y=${year.toFixed(1)}&r=${cam.rot.toFixed(1)}&k=${zoomK().toFixed(2)}` +
        `&cy=${(cam.ty / H).toFixed(3)}&cm=${colorMode}` +
        (legendVisible ? "&lg=1" : "") +
        (selection ? `&sel=${selection.id}` : "");
      try { history.replaceState(null, "", h); }
      catch (_) { permalinkOk = false; }   // sandboxed WebViews (e.g. iOS app viewers) deny this
    }, 400);
  }
  function applyHash() {
    if (!location.hash) return;
    applyingHash = true;
    try {
      const p = new URLSearchParams(location.hash.slice(1));
      if (p.get("k")) cam.s = clamp((+p.get("k")) * s0, 0.7 * s0, 40 * s0);
      if (p.get("r")) cam.rot = +p.get("r");
      if (p.get("cy")) cam.ty = (+p.get("cy")) * H;
      clampCamera();
      const cmWant = p.get("cm");
      if (cmWant && (cmWant === "region" || cmWant === "type") && cmWant !== colorMode)
        $("colorModeBtn").onclick();
      if (p.get("lg") === "1") setLegend(true);
      if (p.get("y")) setYear(+p.get("y"), false);
      const sel = p.get("sel") && data.migrations.find(m => m.id === p.get("sel"));
      if (sel) openDetail(sel);
      scheduleHiRes(); renderBase(); renderFlows();
    } catch (_) { }
    applyingHash = false;
  }

  // ---------- controls ----------
  $("playBtn").onclick = () => setPlaying(!playing);
  $("stepBack").onclick = () => setYear(Math.floor(year) - 1);
  $("stepFwd").onclick = () => setYear(Math.floor(year) + 1);
  $("prevEvt").onclick = () => { const p = prevEventStart(data, year); if (p !== null) setYear(p); };
  $("nextEvt").onclick = () => { const n = nextEventStart(data, year); if (n !== null) setYear(n); };
  $("speedSel").onchange = e => speed = +e.target.value;
  $("clockSel").onchange = e => clockMode = e.target.value;
  function zoomBy(f) {
    const g = geoAt(W / 2, H / 2);
    cam.s = clamp(cam.s * f, 0.7 * s0, 40 * s0);
    if (g) anchorTo(g, W / 2, H / 2); else clampCamera();
    scheduleHiRes(); renderBase(); renderFlows();
  }
  $("zoomIn").onclick = () => zoomBy(1.5);
  $("zoomOut").onclick = () => zoomBy(1 / 1.5);
  const yearBig = $("yearBig");
  function askYear() {
    const v = prompt(`Go to year (${DOMAIN[0]}–${DOMAIN[1]}):`, Math.floor(year));
    if (v !== null && !isNaN(+v)) setYear(+v);
  }
  yearBig.onclick = askYear;
  yearBig.onkeydown = e => { if (e.key === "Enter" || e.key === " ") askYear(); };

  window.addEventListener("keydown", e => {
    const modal = [...document.querySelectorAll('.modalWrap')].find(el => el.style.display === 'flex');
    if (modal) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(modal); }
      if (e.key === 'Tab') {
        const controls = [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.disabled && el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
          e.preventDefault(); last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
          e.preventDefault(); first?.focus();
        }
      }
      return; // Reading a dialog must not scrub or start the map behind it.
    }
    if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.code === 'Space' && e.target.closest('button, a[href]')) return;
    if (e.code === "Space") { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === "ArrowRight") setYear(Math.floor(year) + (e.shiftKey ? 10 : 1));
    else if (e.key === "ArrowLeft") setYear(Math.floor(year) - (e.shiftKey ? 10 : 1));
    else if (e.key === "Home") setYear(DOMAIN[0]);
    else if (e.key === "End") setYear(DOMAIN[1]);
    else if (e.key === "+" || e.key === "=") zoomBy(1.5);
    else if (e.key === "-") zoomBy(1 / 1.5);
    else if (e.key === "Escape") {
      if ($("tableModal").style.display === "flex") closeModal($("tableModal"));
      else if ($("aboutModal").style.display === "flex") closeModal($("aboutModal"));
      else if ($("detailPanel").style.display === "block") closeDetail();
      else if ($("filterPanel").style.display === "block") $("fpClose").onclick();
      else if (focusRange) clearFocus();
    }
  });

  // ---------- test hooks (deliberate, documented) ----------
  window.__atlas = {
    get ready() { return readyAt; },
    setYear: y => setYear(y),
    setCamera: ({ rot, k, cyFrac }) => {
      if (rot != null) cam.rot = rot;
      if (k != null) cam.s = clamp(k * s0, 0.7 * s0, 40 * s0);
      if (cyFrac != null) cam.ty = cyFrac * H;
      clampCamera(); useHiRes = zoomK() > 3;
      renderBase(); renderFlows();
    },
    cam: () => ({ rot: cam.rot, k: zoomK(), ty: cam.ty }),
    project: p => projection(p),
    invert: p => projection.invert(p),
    counts: () => ({ shown: shownCount, active: activeCount, total: data.migrations.length }),
    year: () => year,
    findPixelFor(id) {
      if (pickStamp !== renderStamp) renderPicking();
      const img = pctx.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y += 4) {
        for (let x = 0; x < W; x += 4) {
          const i = (y * W + x) * 4;
          if (img[i + 3] === 0) continue;
          const v = (img[i] << 16) | (img[i + 1] << 8) | img[i + 2];
          if (v > 0 && v <= pickItems.length && pickItems[v - 1].m.id === id) return [x, y];
        }
      }
      return null;
    },
  };

  // ---------- boot ----------
  let readyAt = null;
  window.addEventListener("resize", resize);
  buildFilterUI();
  buildLegend();
  refreshDensity();
  resize();
  setYear(DOMAIN[0]);
  applyHash();
  readyAt = performance.now();
})();
