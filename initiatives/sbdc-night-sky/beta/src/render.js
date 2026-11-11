// SBDC Night-Sky Simulator — renderer. Developed by Ken Novak and David Sandalow, draft for review 2026-07-20
/**
 * sbdc renderer — Style A "twilight photographic" (naked-eye realism).
 *
 * Pure projection math is exported separately (Node-testable); canvas
 * work lives in SkyRenderer. The sky background is computed from the
 * model's sky-brightness field muAt(), so the western glow is physically
 * driven, not painted. Point sources render as smooth PSF sprites
 * (saturating core + gentle skirt — no double rings), calibrated per
 * data.renderCalibration.
 */

/* ------------------------------------------------------------------ */
/* Projections (pure, testable)                                        */
/* ------------------------------------------------------------------ */

export function wrap180(d) { let x = ((d + 180) % 360 + 360) % 360 - 180; return x; }

/** Horizon panorama: equirectangular about (centerAz, centerAlt).
 *  fovDeg = horizontal field of view; vertical fov derives from aspect. */
export function projHorizon(azDeg, altDeg, view, W, H) {
  const fovV = view.fovDeg * H / W;
  const x = W / 2 + (wrap180(azDeg - view.centerAz) / view.fovDeg) * W;
  const y = H / 2 - ((altDeg - view.centerAlt) / fovV) * H;
  return { x, y, visible: x >= -40 && x <= W + 40 && y >= -40 && y <= H + 40 };
}

export function unprojHorizon(x, y, view, W, H) {
  const fovV = view.fovDeg * H / W;
  const az = view.centerAz + ((x - W / 2) / W) * view.fovDeg;
  const alt = view.centerAlt + ((H / 2 - y) / H) * fovV;
  return { azDeg: ((az % 360) + 360) % 360, altDeg: alt };
}

/** All-sky fisheye (equidistant): zenith at center, horizon at the rim,
 *  north up, east LEFT (astronomical convention: looking up). */
/** Rolling-hills silhouette height (deg above the horizon) as a
 *  deterministic function of azimuth — stable under panning. */
export const hillAltDeg = (azDeg) =>
  Math.max(0.4, 1.7 + 1.15 * Math.sin(azDeg * 0.11) * Math.sin(azDeg * 0.041 + 1.3)
                 + 0.75 * Math.sin(azDeg * 0.023 + 2.2));

export function projFisheye(azDeg, altDeg, W, H, marginPx = 30) {
  // Map convention (per review): north at top, EAST ON THE RIGHT — like a
  // geographic map, not the mirrored astronomical looking-up chart.
  const R = Math.min(W, H) / 2 - marginPx;
  const r = R * (90 - altDeg) / 90;
  const a = azDeg * Math.PI / 180;
  return {
    x: W / 2 + r * Math.sin(a),
    y: H / 2 - r * Math.cos(a),
    visible: altDeg > -2,
    R,
  };
}

export function unprojFisheye(x, y, W, H, marginPx = 30) {
  const R = Math.min(W, H) / 2 - marginPx;
  const dx = x - W / 2, dy = H / 2 - y;   // map convention: east on the right
  const r = Math.hypot(dx, dy);
  const alt = 90 - 90 * (r / R);
  let az = Math.atan2(dx, dy) * 180 / Math.PI;
  if (az < 0) az += 360;
  return { azDeg: az, altDeg: alt };
}

/* ------------------------------------------------------------------ */
/* Sky-brightness -> color ramp (pure, testable)                       */
/* ------------------------------------------------------------------ */

/** Map surface brightness mu (V mag/arcsec^2, bright=small) to an RGB
 *  sky color. Anchors chosen to match the approved report figure:
 *  deep indigo night -> violet dusk -> warm peach/gold twilight -> day. */
const MU_RAMP = [
  { mu: 4.0,  c: [0.62, 0.74, 0.92] },  // daylight blue
  { mu: 10.0, c: [0.80, 0.66, 0.52] },  // low bright twilight gold
  { mu: 13.0, c: [0.55, 0.38, 0.34] },  // deep twilight peach
  { mu: 16.0, c: [0.22, 0.16, 0.28] },  // violet dusk
  { mu: 19.0, c: [0.085, 0.075, 0.16] },// late dusk indigo
  { mu: 21.9, c: [0.022, 0.024, 0.055] } // dark night
];

export function muToColor(mu) {
  const t = MU_RAMP;
  if (mu <= t[0].mu) return t[0].c.slice();
  if (mu >= t[t.length - 1].mu) return t[t.length - 1].c.slice();
  for (let i = 1; i < t.length; i++) {
    if (mu <= t[i].mu) {
      const f = (mu - t[i - 1].mu) / (t[i].mu - t[i - 1].mu);
      return [0, 1, 2].map((k) => t[i - 1].c[k] + f * (t[i].c[k] - t[i - 1].c[k]));
    }
  }
  return t[t.length - 1].c.slice();
}

/** Flux for splatting from magnitude (relative, saturates in tonemap). */
export const magToFlux = (m) => Math.pow(10, -0.4 * (m - 1.2));

/* ------------------------------------------------------------------ */
/* Canvas renderer                                                     */
/* ------------------------------------------------------------------ */

/** Default view: facing NORTH (east on the right — map-like, per review). */
export const DEFAULT_VIEW = { mode: "horizon", centerAz: 0, centerAlt: 28, fovDeg: 110 };

export class SkyRenderer {
  /**
   * @param canvas HTMLCanvasElement
   * @param model  the model module namespace (injected, keeps this file DOM-only)
   * @param data   parsed sbdc-data.json
   */
  constructor(canvas, model, data) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = model;
    this.data = data;
    this.view = { ...DEFAULT_VIEW };
    this.tintFamilies = false;
    this.showStars = true;
    this.longExposure = false;   // v2 camera mode: satellites as streaks
    this.markPole = true;        // crosshair at the celestial pole
    this.poleLabels = ["north celestial pole", "south celestial pole"];
    this._sprites = {};
    this._bgCanvas = (typeof document !== "undefined") ? document.createElement("canvas") : null;
    this._grid = null; // spatial index of drawn points for tooltips
  }

  /* ---- sprites: pre-rendered radial PSFs per color, sized at draw ---- */
  _sprite(key, rgb) {
    if (this._sprites[key]) return this._sprites[key];
    const S = 64, c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    const [r, gg, b] = rgb.map((v) => Math.round(v * 255));
    // saturating core + smooth gaussian-ish skirt; single profile, no rings
    grad.addColorStop(0.00, `rgba(${r},${gg},${b},1)`);
    grad.addColorStop(0.10, `rgba(${r},${gg},${b},0.95)`);
    grad.addColorStop(0.28, `rgba(${r},${gg},${b},0.45)`);
    grad.addColorStop(0.55, `rgba(${r},${gg},${b},0.12)`);
    grad.addColorStop(1.00, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    this._sprites[key] = c;
    return c;
  }

  project(azDeg, altDeg) {
    const { canvas, view } = this;
    return view.mode === "horizon"
      ? projHorizon(azDeg, altDeg, view, canvas.width, canvas.height)
      : projFisheye(azDeg, altDeg, canvas.width, canvas.height);
  }

  unproject(x, y) {
    const { canvas, view } = this;
    return view.mode === "horizon"
      ? unprojHorizon(x, y, view, canvas.width, canvas.height)
      : unprojFisheye(x, y, canvas.width, canvas.height);
  }

  /* ---- physically driven sky background (low-res, scaled up) ---- */
  _drawBackground(state, ev) {
    const { ctx, canvas, model, data } = this;
    const BW = 128, BH = 84;
    const bg = this._bgCanvas;
    bg.width = BW; bg.height = BH;
    const bctx = bg.getContext("2d");
    const img = bctx.createImageData(BW, BH);
    const basis = model.enuBasis(state.latDeg);
    const sunDir = ev.sunDir, sunAlt = ev.sunAltDeg;
    const sx = canvas.width / BW, sy = canvas.height / BH;
    for (let j = 0; j < BH; j++) {
      for (let i = 0; i < BW; i++) {
        const p = this.unproject((i + 0.5) * sx, (j + 0.5) * sy);
        let rgb;
        if (p.altDeg <= 0 || (this.view.mode === "fisheye" && p.altDeg < 0)) {
          rgb = [0.012, 0.012, 0.02]; // below horizon / outside rim
        } else {
          const aa = p.altDeg * Math.PI / 180, zz = p.azDeg * Math.PI / 180;
          const dir = [0, 1, 2].map((k) =>
            Math.cos(aa) * (Math.cos(zz) * basis.north[k] + Math.sin(zz) * basis.east[k]) +
            Math.sin(aa) * basis.up[k]);
          const mu = model.muAt(dir, sunDir, sunAlt, data);
          rgb = muToColor(mu);
        }
        const o = (j * BW + i) * 4;
        img.data[o] = rgb[0] * 255; img.data[o + 1] = rgb[1] * 255;
        img.data[o + 2] = rgb[2] * 255; img.data[o + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  }

  _groundAndLabels(latDeg = 40) {
    const { ctx, canvas, view } = this;
    ctx.save();
    if (view.mode === "horizon") {
      // rolling hills: a gentle deterministic silhouette (0.4-3.3 deg),
      // consistent under panning because it is a function of azimuth
      const y0 = this.project(view.centerAz, 0).y;
      const W = canvas.width;
      ctx.fillStyle = "#05060a";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      const degPerPx = view.fovDeg / W;
      const azLeft = view.centerAz - view.fovDeg / 2;
      for (let x = 0; x <= W; x += 3) {
        const az = azLeft + x * degPerPx;
        const p = this.project(((az % 360) + 360) % 360, hillAltDeg(az));
        ctx.lineTo(x, p.y);
      }
      ctx.lineTo(W, canvas.height);
      ctx.closePath();
      ctx.fill();
      // faint crest line along the hills
      ctx.strokeStyle = "rgba(216,226,255,0.22)";
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const az = azLeft + x * degPerPx;
        const p = this.project(((az % 360) + 360) % 360, hillAltDeg(az));
        x === 0 ? ctx.moveTo(x, p.y) : ctx.lineTo(x, p.y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(199,205,224,0.85)";
      ctx.font = `${Math.max(11, canvas.width / 90)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      for (let az = 0; az < 360; az += 45) {
        const p = this.project(az, 0);
        if (p.x < -20 || p.x > canvas.width + 20) continue;
        const lab = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][az / 45];
        ctx.fillText(lab, p.x, Math.min(canvas.height - 8, (p.y || canvas.height) + 18));
      }
    } else {
      // fisheye rim + cardinals (map convention: N top, E right)
      const c = this.project(0, 90);
      const R = projFisheye(0, 0, canvas.width, canvas.height).R;
      ctx.strokeStyle = "rgba(216,226,255,0.3)";
      ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, R, 0, Math.PI * 2); ctx.stroke();
      // mask outside the rim
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.arc(canvas.width / 2, canvas.height / 2, R, 0, Math.PI * 2, true);
      ctx.fillStyle = "#05060a"; ctx.fill();
      ctx.fillStyle = "rgba(199,205,224,0.85)";
      ctx.font = `${Math.max(11, canvas.width / 90)}px ui-monospace, monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const [az, lab] of [[0, "N"], [90, "E"], [180, "S"], [270, "W"]]) {
        const p = projFisheye(az, -6, canvas.width, canvas.height);
        ctx.fillText(lab, p.x, p.y);
      }
      ctx.textBaseline = "alphabetic";
    }
    if (this.markPole) this._poleMarker(latDeg);
    ctx.restore();
  }

  /** Small labeled crosshair at the celestial pole — the sky's rotation
   *  center: altitude = |latitude|, toward N (lat >= 0) or S. */
  _poleMarker(latDeg) {
    const { ctx, canvas } = this;
    const north = latDeg >= 0;
    const p = this.project(north ? 0 : 180, Math.abs(latDeg));
    if (!p.visible || p.x < -10 || p.x > canvas.width + 10 ||
        p.y < -10 || p.y > canvas.height + 10) return;
    const a = Math.max(6, canvas.width / 160), g = a * 0.35; // arm, gap
    ctx.strokeStyle = "rgba(216,226,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x - a, p.y); ctx.lineTo(p.x - g, p.y);
    ctx.moveTo(p.x + g, p.y); ctx.lineTo(p.x + a, p.y);
    ctx.moveTo(p.x, p.y - a); ctx.lineTo(p.x, p.y - g);
    ctx.moveTo(p.x, p.y + g); ctx.lineTo(p.x, p.y + a);
    ctx.stroke();
    ctx.fillStyle = "rgba(199,205,224,0.6)";
    ctx.font = `${Math.max(10, canvas.width / 110)}px ui-monospace, monospace`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(this.poleLabels[north ? 0 : 1], p.x + a + 5, p.y);
    ctx.textBaseline = "alphabetic";
  }

  /**
   * Draw a full frame from a cached model evaluation.
   * ev: output of model.evaluate(); stars: output of model.starAltAz()
   * starVis: Uint8Array visibility per star (precomputed with the sky model)
   */
  draw(state, ev, constellation, stars, starVis, streaks = null) {
    const { ctx, canvas } = this;
    if (canvas.width < 8 || canvas.height < 8) return { drawnBright: 0 };
    let drawnBright = 0;
    ctx.globalCompositeOperation = "source-over";
    this._drawBackground(state, ev);

    // PSF size tracks the view's angular pixel scale, so the all-sky
    // fisheye (few px/deg) doesn't saturate into an over-exposed blob and
    // a zoomed horizon view keeps points plausibly point-like.
    const pxPerDeg = this.view.mode === "horizon"
      ? canvas.width / this.view.fovDeg
      : projFisheye(0, 0, canvas.width, canvas.height).R / 90;
    const sizeScale = Math.min(2.5, Math.max(0.30, Math.pow(pxPerDeg / 11.6, 0.8)));

    const grid = new Map(); // tooltip spatial index: cell -> [{x,y,kind,i}]
    const cell = 24;
    const put = (x, y, kind, i) => {
      const k = ((x / cell) | 0) + ":" + ((y / cell) | 0);
      let a = grid.get(k); if (!a) { a = []; grid.set(k, a); }
      a.push({ x, y, kind, i });
    };

    ctx.globalCompositeOperation = "lighter";

    // ---- stars ----
    if (this.showStars && stars) {
      const spr = this._sprite("star", [0.90, 0.93, 1.0]);
      for (let i = 0; i < stars.altDeg.length; i++) {
        if (!starVis[i]) continue;
        const p = this.project(stars.azDeg[i], stars.altDeg[i]);
        if (!p.visible) continue;
        const flux = magToFlux(stars.vmag[i]);
        const size = sizeScale * Math.min(30, 3.2 + 4.2 * Math.log10(1 + flux) * 4);
        ctx.drawImage(spr, p.x - size / 2, p.y - size / 2, size, size);
        if (stars.vmag[i] < 2.5) put(p.x, p.y, "star", i);
      }
    }

    // ---- satellites ----
    if (this.longExposure && streaks) {
      // camera mode: every sunlit satellite brighter than the camera limit
      // becomes a streak from its start position to its end-of-exposure
      // position; stroke alpha spreads the flux along the trail length.
      const camLim = this.data.photometry.cameraMode.value.cameraLimitingMag;
      ctx.lineCap = "round";
      const famStroke = this.tintFamilies
        ? [[255, 224, 158], [184, 217, 255], [255, 250, 191]]
        : [[255, 237, 204], [255, 237, 204], [255, 237, 204]];
      for (const i of ev.above) {
        if (!ev.sunlit[i] || ev.mag[i] > camLim) continue;
        const p1 = this.project(ev.az[i], ev.alt[i]);
        const p2 = this.project(streaks.az2[i], Math.max(streaks.alt2[i], 0));
        if (!p1.visible && !p2.visible) continue;
        const len = Math.max(2, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        const flux = magToFlux(ev.mag[i]);
        const alpha = Math.min(0.9, 1.6 * flux / len);
        if (alpha < 0.008) continue;
        const c = famStroke[constellation.family[i]];
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        ctx.lineWidth = Math.min(3.5, 1.0 + 0.5 * Math.log10(1 + flux));
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        if (ev.mag[i] < 2) put(p1.x, p1.y, "sat", i);
      }
    } else {
      // naked-eye mode (Style A): visible-only steady points
      const warm = [1.0, 0.93, 0.80];
      const famRgb = this.tintFamilies
        ? [[1.0, 0.88, 0.62], [0.72, 0.85, 1.0], [1.0, 0.98, 0.75]]
        : [warm, warm, warm];
      const sprites = famRgb.map((c, k) => this._sprite("fam" + k + this.tintFamilies, c));
      const faintFill = famRgb.map((c) =>
        `rgba(${c.map((v) => Math.round(v * 255)).join(",")},0.75)`);

      const BRIGHT_CAP = 9000, BRIGHT_MAG = 3.2;
      for (const i of ev.above) {
        if (!ev.visible[i]) continue;
        const p = this.project(ev.az[i], ev.alt[i]);
        if (!p.visible) continue;
        const m = ev.mag[i], fam = constellation.family[i];
        if (m < BRIGHT_MAG && drawnBright < BRIGHT_CAP) {
          const flux = magToFlux(m);
          const size = sizeScale * Math.min(46, 4.5 + 5.5 * Math.log10(1 + flux) * 4);
          ctx.drawImage(sprites[fam], p.x - size / 2, p.y - size / 2, size, size);
          drawnBright++;
          put(p.x, p.y, "sat", i);
        } else {
          ctx.fillStyle = faintFill[fam];
          const d = Math.max(1.0, 1.6 * Math.sqrt(sizeScale));
          ctx.fillRect(p.x - d / 2, p.y - d / 2, d, d);
        }
      }
    }

    ctx.globalCompositeOperation = "source-over";
    this._groundAndLabels(state.latDeg);
    this._grid = { grid, cell };
    return { drawnBright };
  }

  /** Nearest drawn point within maxPx of (x, y): {kind, i} | null */
  pick(x, y, maxPx = 14) {
    if (!this._grid) return null;
    const { grid, cell } = this._grid;
    let best = null, bd = maxPx * maxPx;
    const ci = (x / cell) | 0, cj = (y / cell) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = grid.get((ci + di) + ":" + (cj + dj));
      if (!a) continue;
      for (const p of a) {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
    }
    return best;
  }
}
