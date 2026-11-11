// SBDC Night-Sky Simulator — physics model. Developed by Ken Novak and David Sandalow, draft for review 2026-07-20
/**
 * sbdc model core — pure functions, no DOM. Runs identically in the
 * browser and under Node (tests). All physical constants and assumption
 * values are injected from sbdc-data.json ("data" parameter); nothing
 * tunable is hard-coded here.
 *
 * FRAMES
 * ------
 * Working frame: Earth-centered, Z = north pole, X = observer's meridian
 * on the equator, Y = east. Local (apparent) solar time T sets the Sun's
 * hour angle H = (T - 12) * 15 deg; the Sun unit vector is
 *   s = (cos d cos H, -cos d sin H, sin d),  d = solar declination.
 * Constellations are generated once in a Sun-referenced frame (Sun's
 * equatorial projection along +X) and rotated by thetaSun per query, so
 * the SSO ring "stays over the terminator while Earth turns beneath it"
 * exactly.
 *
 * SIMPLIFICATIONS (each mirrored by a flag/entry in sbdc-data.json):
 * spherical Earth; no refraction; circular orbits; local solar time used
 * as the time argument for the low-precision ephemeris; penumbra ignored.
 */

const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;

/* ------------------------------------------------------------------ */
/* PRNG                                                               */
/* ------------------------------------------------------------------ */

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  return next;
}

/* ------------------------------------------------------------------ */
/* Small vector helpers (plain arrays [x,y,z])                        */
/* ------------------------------------------------------------------ */

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a) => Math.sqrt(dot(a, a));
export function normalize(a) { const n = norm(a); return [a[0] / n, a[1] / n, a[2] / n]; }

/* ------------------------------------------------------------------ */
/* Solar ephemeris (Meeus short form / NOAA approximation)            */
/* ------------------------------------------------------------------ */

/** Days since J2000.0 for (yearAnchor, dayOfYear, local solar hours).
 *  Local solar time is used in place of UT — declination drift over the
 *  longitude-equivalent offset is < 0.01 deg (documented simplification). */
export function daysSinceJ2000(doy, hours, yearAnchor = 2026) {
  // JD(yearAnchor-01-01 00:00) precomputed for 2026 = 2461041.5
  const jdJan1 = { 2026: 2461041.5 }[yearAnchor];
  if (jdJan1 === undefined) throw new Error("yearAnchor not tabulated: " + yearAnchor);
  return jdJan1 + (doy - 1) + hours / 24 - 2451545.0;
}

/** Solar ecliptic longitude, RA, declination (all degrees). */
export function solarEphemeris(doy, hours, data) {
  const eps = data.physicalConstants.obliquityDeg.value * DEG;
  const d = daysSinceJ2000(doy, hours, data.geometryModel.yearAnchor.value);
  const L = (280.460 + 0.9856474 * d) % 360;
  const g = ((357.528 + 0.9856003 * d) % 360) * DEG;
  const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  return {
    eclLonDeg: ((lam / DEG) % 360 + 360) % 360,
    raDeg: ((ra / DEG) % 360 + 360) % 360,
    decDeg: dec / DEG,
  };
}

/** Sun hour angle (deg, positive west of observer meridian). */
export const sunHourAngleDeg = (solarTimeHours) => (solarTimeHours - 12) * 15;

/** Equatorial angle of the Sun's projection in the working frame. */
export const thetaSunDeg = (solarTimeHours) => -sunHourAngleDeg(solarTimeHours);

/** Sun unit vector in the working frame. */
export function sunVector(doy, solarTimeHours, data) {
  const { decDeg } = solarEphemeris(doy, solarTimeHours, data);
  const H = sunHourAngleDeg(solarTimeHours) * DEG;
  const d = decDeg * DEG;
  return [Math.cos(d) * Math.cos(H), -Math.cos(d) * Math.sin(H), Math.sin(d)];
}

/** Observer geocentric unit vector (latitude only; frame longitude 0). */
export function observerUnit(latDeg) {
  const p = latDeg * DEG;
  return [Math.cos(p), 0, Math.sin(p)];
}

/** Local East-North-Up basis at the observer. */
export function enuBasis(latDeg) {
  const up = observerUnit(latDeg);
  const east = [0, 1, 0];
  const north = [-up[2] * 1, 0, up[0]]; // up x east for up=(c,0,s)
  return { east, north, up };
}

/** Altitude/azimuth (deg) of a direction vector seen from the observer. */
export function dirToAltAz(v, basis) {
  const u = normalize(v);
  const alt = Math.asin(Math.max(-1, Math.min(1, dot(u, basis.up)))) / DEG;
  let az = Math.atan2(dot(u, basis.east), dot(u, basis.north)) / DEG;
  if (az < 0) az += 360;
  return { altDeg: alt, azDeg: az };
}

/** Sun altitude/azimuth for observer. */
export function sunAltAz(latDeg, doy, solarTimeHours, data) {
  return dirToAltAz(sunVector(doy, solarTimeHours, data), enuBasis(latDeg));
}

/**
 * Find local solar times when the Sun crosses a given altitude.
 * Returns { rises:[h], sets:[h], alwaysAbove, alwaysBelow }.
 */
export function sunCrossings(latDeg, doy, altDeg, data) {
  const f = (t) => sunAltAz(latDeg, doy, t, data).altDeg - altDeg;
  const N = 288; // 5-minute scan
  const sets = [], rises = [];
  let prev = f(0), anyAbove = prev > 0, anyBelow = prev <= 0;
  for (let i = 1; i <= N; i++) {
    const t = (24 * i) / N;
    const cur = f(t);
    anyAbove = anyAbove || cur > 0; anyBelow = anyBelow || cur <= 0;
    if ((prev > 0) !== (cur > 0)) {
      let lo = (24 * (i - 1)) / N, hi = t;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if ((f(lo) > 0) !== (f(mid) > 0)) hi = mid; else lo = mid;
      }
      (prev > 0 ? sets : rises).push((lo + hi) / 2);
    }
    prev = cur;
  }
  return { rises, sets, alwaysAbove: anyAbove && !anyBelow, alwaysBelow: anyBelow && !anyAbove };
}

/** Sunset / twilight boundaries for the day. Flags for polar day/night. */
export function twilightTimes(latDeg, doy, data) {
  const out = {};
  for (const [key, alt] of [["sunset", -0.833], ["civil", -6], ["nautical", -12], ["astronomical", -18]]) {
    out[key] = sunCrossings(latDeg, doy, alt, data);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Orbits and constellation                                            */
/* ------------------------------------------------------------------ */

/** Sun-synchronous inclination (deg) for a circular orbit at altKm,
 *  from the J2 nodal-precession condition. */
export function ssoInclinationDeg(altKm, data) {
  const Re = data.physicalConstants.earthRadiusKm.value;
  const mu = data.physicalConstants.muEarth.value;
  const J2 = data.physicalConstants.j2.value;
  const year = data.physicalConstants.tropicalYearDays.value * 86400;
  const a = Re + altKm;
  const n = Math.sqrt(mu / (a * a * a));           // rad/s
  const rot = TAU / year;                          // required node rate, rad/s
  const cosi = -rot / (1.5 * J2 * (Re / a) * (Re / a) * n);
  if (cosi < -1 || cosi > 1) throw new Error("no SSO solution at alt " + altKm);
  return Math.acos(cosi) / DEG;
}

/** Geometric half-angle (deg, at Earth's center) of the horizon cap for
 *  a shell at altKm: satellites within this angular distance of the
 *  observer are above the geometric horizon. */
export function horizonCapDeg(altKm, data) {
  const Re = data.physicalConstants.earthRadiusKm.value;
  return Math.acos(Re / (Re + altKm)) / DEG;
}

/**
 * Generate the constellation in the SUN-REFERENCED frame (Sun equatorial
 * projection along +X). Cacheable across time-slider moves; rotate by
 * thetaSun per query. Returns typed arrays.
 *
 * cfg: { totalSats, ssoFraction, shells:[{altKm,share}], planesPerShell,
 *        ltanHours, ltanSpreadMinutes, inclinedDeg,
 *        trains, train:{satsPerTrain, altKm, arcLengthDeg, m0BonusMag},
 *        m0Mean, m0Sigma, m0Clamp, seed }
 */
export function generateConstellation(cfg, data) {
  const Re = data.physicalConstants.earthRadiusKm.value;
  const rng = makeRng(cfg.seed);
  const nTrainSats = (cfg.trains || 0) * (cfg.train ? cfg.train.satsPerTrain : 0);
  const N = cfg.totalSats + nTrainSats;
  const px = new Float64Array(N), py = new Float64Array(N), pz = new Float64Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  const m0 = new Float32Array(N);
  const clusterId = new Int32Array(N);
  const family = new Uint8Array(N);   // 0 = SSO, 1 = 30-deg, 2 = launch train
  const shellAlt = new Float32Array(N);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const sampleM0 = () => clamp(cfg.m0Mean + cfg.m0Sigma * rng.gauss(), cfg.m0Clamp[0], cfg.m0Clamp[1]);

  // cumulative shell shares
  const shares = cfg.shells.map((s) => s.share);
  const total = shares.reduce((a, b) => a + b, 0);
  const cum = []; let acc = 0;
  for (const s of shares) { acc += s / total; cum.push(acc); }
  const pickShell = (u) => { for (let i = 0; i < cum.length; i++) if (u <= cum[i]) return i; return cum.length - 1; };

  const placeOnOrbit = (idx, altKm, incDeg, nodeDeg) => {
    const r = Re + altKm;
    const th = nodeDeg * DEG, inc = incDeg * DEG;
    const Nx = Math.cos(th), Ny = Math.sin(th);          // node vector
    const Ex = -Math.sin(th), Ey = Math.cos(th);         // 90 deg east of node
    const Wx = Math.cos(inc) * Ex, Wy = Math.cos(inc) * Ey, Wz = Math.sin(inc);
    const u = rng() * TAU;                               // uniform anomaly
    const cu = Math.cos(u), su = Math.sin(u);
    px[idx] = r * (Nx * cu + Wx * su);
    py[idx] = r * (Ny * cu + Wy * su);
    pz[idx] = r * (Wz * su);
    // velocity direction dP/du = -N sin u + W cos u (unit: N, W orthonormal)
    vx[idx] = -Nx * su + Wx * cu;
    vy[idx] = -Ny * su + Wy * cu;
    vz[idx] = Wz * cu;
  };

  // LTAN -> node angle relative to the Sun's equatorial projection (at +X,
  // i.e. theta_sun = 0 in this frame): local time t at equatorial angle
  // theta is  t = 12 + theta/15  =>  theta_node = (LTAN - 12) * 15.
  const nodeFromLtan = (ltanHours) => (ltanHours - 12) * 15;

  const nSso = Math.round(cfg.totalSats * cfg.ssoFraction);
  const planeCount = cfg.planesPerShell;
  const cl = cfg.clustering;
  if (cl && cl.enabled) {
    // hierarchical clustering (v3): cluster CENTERS are placed with the
    // same shell/plane/anomaly machinery as independent satellites, so the
    // constellation-scale distribution is unchanged; members are strewn
    // around each center within a lognormal cluster diameter.
    let i = 0, cid = 0, ssoPlaced = 0;
    while (i < cfg.totalSats) {
      const isSso = ssoPlaced < nSso;
      const k = Math.min(cfg.totalSats - i, Math.max(2,
        Math.round(cl.satsPerCluster * Math.exp(cl.memberSigma * rng.gauss()))));
      const sh = cfg.shells[pickShell(rng())];
      let incDeg, nodeDeg;
      if (isSso) {
        incDeg = ssoInclinationDeg(sh.altKm, data);
        const plane = Math.floor(rng() * planeCount);
        const ltan = cfg.ltanHours +
          ((plane / Math.max(1, planeCount - 1)) - 0.5) * 2 * (cfg.ltanSpreadMinutes / 60);
        nodeDeg = ((rng() < 0.5 ? ltan : ltan + 12) - 12) * 15;
      } else {
        incDeg = cfg.inclinedDeg;
        nodeDeg = rng() * 360;
      }
      const r = Re + sh.altKm;
      const th = nodeDeg * DEG, inc = incDeg * DEG;
      const Nx = Math.cos(th), Ny = Math.sin(th);
      const Ex = -Math.sin(th), Ey = Math.cos(th);
      const Wx = Math.cos(inc) * Ex, Wy = Math.cos(inc) * Ey, Wz = Math.sin(inc);
      const u0 = rng() * TAU;
      const cu0 = Math.cos(u0), su0 = Math.sin(u0);
      // center position/velocity unit vectors (in-plane basis)
      const phx = Nx * cu0 + Wx * su0, phy = Ny * cu0 + Wy * su0, phz = Wz * su0;
      const tx = -Nx * su0 + Wx * cu0, ty = -Ny * su0 + Wy * cu0, tz = Wz * cu0;
      const nx0 = phy * tz - phz * ty, ny0 = phz * tx - phx * tz, nz0 = phx * ty - phy * tx;
      const D = cl.clusterDiameterKm * Math.exp(cl.diameterSigma * rng.gauss());
      for (let j = 0; j < k; j++, i++) {
        const du = rng.gauss() * (D / (4 * r));       // along-track (rad)
        const w = rng.gauss() * (D / 8);              // cross-track (km)
        const dr = rng.gauss() * (D / 8);             // radial (km)
        const cdu = Math.cos(du), sdu = Math.sin(du);
        const rr = r + dr;
        px[i] = rr * (phx * cdu + tx * sdu) + w * nx0;
        py[i] = rr * (phy * cdu + ty * sdu) + w * ny0;
        pz[i] = rr * (phz * cdu + tz * sdu) + w * nz0;
        vx[i] = -phx * sdu + tx * cdu;
        vy[i] = -phy * sdu + ty * cdu;
        vz[i] = -phz * sdu + tz * cdu;
        family[i] = isSso ? 0 : 1;
        shellAlt[i] = sh.altKm;
        m0[i] = sampleM0();
        clusterId[i] = cid;
        if (isSso) ssoPlaced++;
      }
      cid++;
    }
  } else
  for (let i = 0; i < cfg.totalSats; i++) {
    const isSso = i < nSso;
    const sh = cfg.shells[pickShell(rng())];
    let incDeg, nodeDeg;
    if (isSso) {
      incDeg = ssoInclinationDeg(sh.altKm, data);
      const plane = Math.floor(rng() * planeCount);
      const ltan = cfg.ltanHours +
        ((plane / Math.max(1, planeCount - 1)) - 0.5) * 2 * (cfg.ltanSpreadMinutes / 60);
      // half the planes use the descending-node twin (LTAN + 12 h) — same
      // physical dawn-dusk geometry, opposite travel direction.
      nodeDeg = nodeFromLtan(rng() < 0.5 ? ltan : ltan + 12);
    } else {
      incDeg = cfg.inclinedDeg;
      nodeDeg = rng() * 360;
    }
    placeOnOrbit(i, sh.altKm, incDeg, nodeDeg);
    family[i] = isSso ? 0 : 1;
    shellAlt[i] = sh.altKm;
    m0[i] = sampleM0();
    clusterId[i] = -1 - i;   // unique: independent satellite is its own object
  }

  // launch trains: tight strings climbing into near-dawn-dusk planes
  let idx = cfg.totalSats;
  for (let t = 0; t < (cfg.trains || 0); t++) {
    const tr = cfg.train;
    const inc = ssoInclinationDeg(tr.altKm, data);
    const ltan = cfg.ltanHours + (rng() - 0.5) * 2.5; // offset plane, ±~1.2 h
    const nodeDeg = nodeFromLtan(rng() < 0.5 ? ltan : ltan + 12);
    const u0 = rng() * 360;
    for (let k = 0; k < tr.satsPerTrain; k++, idx++) {
      const r = Re + tr.altKm;
      const th = nodeDeg * DEG, inci = inc * DEG;
      const Nx = Math.cos(th), Ny = Math.sin(th);
      const Ex = -Math.sin(th), Ey = Math.cos(th);
      const Wx = Math.cos(inci) * Ex, Wy = Math.cos(inci) * Ey, Wz = Math.sin(inci);
      const u = (u0 + (k / (tr.satsPerTrain - 1) - 0.5) * tr.arcLengthDeg) * DEG;
      const cu = Math.cos(u), su = Math.sin(u);
      px[idx] = r * (Nx * cu + Wx * su);
      py[idx] = r * (Ny * cu + Wy * su);
      pz[idx] = r * (Wz * su);
      vx[idx] = -Nx * su + Wx * cu;
      vy[idx] = -Ny * su + Wy * cu;
      vz[idx] = Wz * cu;
      family[idx] = 2;
      shellAlt[idx] = tr.altKm;
      m0[idx] = sampleM0() + tr.m0BonusMag;
      clusterId[idx] = -1 - idx;   // trains are not compute clusters
    }
  }
  return { n: N, px, py, pz, vx, vy, vz, m0, family, shellAlt,
           clusterId, clustered: !!(cl && cl.enabled) };
}

/** Configuration builder: defaults from the data file + overrides. */
export function defaultConfig(data, overrides = {}) {
  const sc = data.scenario, ph = data.photometry;
  return Object.assign({
    totalSats: sc.totalSatellitesDefault.value,
    ssoFraction: sc.ssoFractionDefault.value,
    shells: sc.shellPresets.value[sc.defaultShellPreset.value],
    planesPerShell: sc.planesPerShell.value,
    ltanHours: sc.ssoLtanHours.value,
    ltanSpreadMinutes: sc.ssoLtanSpreadMinutes.value,
    inclinedDeg: sc.inclinedShellInclinationDeg.value,
    trains: 1,
    train: ph.launchTrain.value,
    clustering: {
      enabled: data.clustering.enabledDefault.value,
      satsPerCluster: data.clustering.satsPerCluster.value.default,
      memberSigma: data.clustering.memberSigma.value.default,
      clusterDiameterKm: data.clustering.clusterDiameterKm.value.default,
      diameterSigma: data.clustering.diameterSigma.value.default,
    },
    m0Mean: ph.m0Mean.value,
    m0Sigma: ph.m0Sigma.value,
    m0Clamp: ph.m0Clamp.value,
    seed: 12345,
  }, overrides);
}

/* ------------------------------------------------------------------ */
/* Shadow                                                              */
/* ------------------------------------------------------------------ */

/** Is a geocentric point P (km) sunlit? s = sun unit vector.
 *  geometry: "cone" (umbra taper) or "cylinder". Penumbra ignored. */
export function isSunlit(Px, Py, Pz, s, data, geometry) {
  const Re = data.physicalConstants.earthRadiusKm.value;
  const along = Px * s[0] + Py * s[1] + Pz * s[2];
  if (along >= 0) return true;                    // day side of center plane
  const a = -along;                               // depth behind terminator
  const qx = Px + a * s[0], qy = Py + a * s[1], qz = Pz + a * s[2];
  const rho = Math.sqrt(qx * qx + qy * qy + qz * qz);
  if (geometry === "cylinder") return rho >= Re;
  const Rs = data.physicalConstants.sunRadiusKm.value;
  const AU = data.physicalConstants.astronomicalUnitKm.value;
  const tanU = (Rs - Re) / AU;                    // umbra taper angle
  return rho >= Re - a * tanU;
}

/* ------------------------------------------------------------------ */
/* Photometry                                                          */
/* ------------------------------------------------------------------ */

/** Lambertian-sphere phase function, alpha in radians. */
export const lambertPhase = (alpha) => (Math.sin(alpha) + (Math.PI - alpha) * Math.cos(alpha)) / Math.PI;

/** Kasten-Young airmass from altitude in degrees (>= ~0). */
export function airmass(altDeg) {
  const z = 90 - Math.max(altDeg, 0);
  return 1 / (Math.cos(z * DEG) + 0.50572 * Math.pow(96.07995 - z, -1.6364));
}

/**
 * Apparent V magnitude of a satellite.
 * m0 is defined at 1000 km range and 90 deg phase angle.
 */
/** brightnessOffsetMag: shift applied uniformly to the population; derived
 *  in evaluate() from state.brightnessRefMag minus the reference default
 *  (the "SBDC brightness" slider — see photometry.referenceBrightness). */
export function satMagnitude(m0, rangeKm, phaseRad, altDeg, data, brightnessOffsetMag = 0) {
  const k = data.photometry.extinctionCoefficient.value;
  const p = Math.max(lambertPhase(phaseRad), 1e-6);
  const p90 = lambertPhase(Math.PI / 2);
  return m0 + brightnessOffsetMag +
    5 * Math.log10(rangeKm / 1000) -
    2.5 * Math.log10(p / p90) +
    k * (airmass(altDeg) - 1);
}


/** Offset (mag) from the brightness slider: refMag minus the data default,
 *  so the default slider position reproduces the report-calibrated
 *  population exactly. Back-compatible with legacy state.mitigationMag. */
export function brightnessOffset(state, data) {
  const ref = data.photometry.referenceBrightness;
  if (state.brightnessRefMag != null) return state.brightnessRefMag - ref.value.default;
  return state.mitigationMag || 0;
}

/* ------------------------------------------------------------------ */
/* Sky brightness and limiting magnitude                               */
/* ------------------------------------------------------------------ */

function interp(table, xKey, yKey, x) {
  const t = table;
  if (x <= t[0][xKey]) { /* handled below by ordering check */ }
  // table may be descending in xKey; normalize to ascending
  const asc = t[0][xKey] < t[t.length - 1][xKey] ? t : [...t].reverse();
  if (x <= asc[0][xKey]) return asc[0][yKey];
  if (x >= asc[asc.length - 1][xKey]) return asc[asc.length - 1][yKey];
  for (let i = 1; i < asc.length; i++) {
    if (x <= asc[i][xKey]) {
      const f = (x - asc[i - 1][xKey]) / (asc[i][xKey] - asc[i - 1][xKey]);
      return asc[i - 1][yKey] + f * (asc[i][yKey] - asc[i - 1][yKey]);
    }
  }
  return asc[asc.length - 1][yKey];
}

/** Zenith sky surface brightness (V mag/arcsec^2) vs Sun altitude. */
export function zenithMu(sunAltDeg, data) {
  return interp(data.skyBrightness.table.value, "sunAltDeg", "muVmagPerArcsec2", sunAltDeg);
}

/** Sky surface brightness at a sky position (unit direction from the
 *  observer), including the twilight glow toward the Sun. */
export function muAt(dir, sunDir, sunAltDeg, data) {
  const mu0 = zenithMu(sunAltDeg, data);
  const amp = data.skyBrightness.twilightGlowAmplitudeMag.value;
  const scale = data.skyBrightness.twilightGlowScaleDeg.value;
  const f = sunAltDeg >= 0 ? 1 : Math.max(0, (sunAltDeg + 18) / 18);
  const ang = Math.acos(Math.max(-1, Math.min(1, dot(normalize(dir), sunDir)))) / DEG;
  return Math.max(4, mu0 - amp * f * Math.exp(-ang / scale));
}

/** Naked-eye point-source limiting magnitude for sky brightness mu. */
export function limitingMag(mu, data) {
  return interp(data.limitingMagnitude.table.value, "muVmagPerArcsec2", "limitingMag", mu);
}

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

/**
 * Star alt-az for the current observer/time. The vernal equinox sits at
 * working-frame equatorial angle thetaSun - RA_sun; a star at RA is at
 * theta = thetaEquinox + RA.
 * Returns { altDeg, azDeg, vmag } arrays (Float32) for the catalog.
 */
export function starAltAz(catalog, latDeg, doy, solarTimeHours, data) {
  const eph = solarEphemeris(doy, solarTimeHours, data);
  const th0 = (thetaSunDeg(solarTimeHours) - eph.raDeg) * DEG;
  const basis = enuBasis(latDeg);
  const n = catalog.count;
  const alt = new Float32Array(n), az = new Float32Array(n), vmag = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ra = catalog.ra[i] / 100 * DEG, dec = catalog.dec[i] / 100 * DEG;
    const th = th0 + ra;
    const v = [Math.cos(dec) * Math.cos(th), Math.cos(dec) * Math.sin(th), Math.sin(dec)];
    const aa = dirToAltAz(v, basis);
    alt[i] = aa.altDeg; az[i] = aa.azDeg; vmag[i] = catalog.v[i] / 10;
  }
  return { altDeg: alt, azDeg: az, vmag };
}

/* ------------------------------------------------------------------ */
/* Per-satellite evaluation and the aggregate summarize() API          */
/* ------------------------------------------------------------------ */

/**
 * Evaluate every satellite for an observer state; returns typed arrays
 * (altDeg, azDeg, rangeKm, mag, sunlit, visible) plus indices of those
 * above the horizon (for renderers).
 *
 * state: { latDeg, doy, solarTimeHours, brightnessRefMag, userLimitingMag, propagationSec,
 *          shadowGeometry }
 */
export function evaluate(constellation, state, data) {
  const Re = data.physicalConstants.earthRadiusKm.value;
  const s = sunVector(state.doy, state.solarTimeHours, data);
  const sunAlt = sunAltAz(state.latDeg, state.doy, state.solarTimeHours, data).altDeg;
  const basis = enuBasis(state.latDeg);
  const O = observerUnit(state.latDeg).map((c) => c * Re);
  const geom = state.shadowGeometry || data.shadowModel.geometry.value;
  const userCap = state.userLimitingMag ?? data.limitingMagnitude.userLimitingMagCap.value;
  const mit = brightnessOffset(state, data);

  const th = thetaSunDeg(state.solarTimeHours) * DEG;
  const cth = Math.cos(th), sth = Math.sin(th);

  const n = constellation.n;
  const alt = new Float32Array(n), az = new Float32Array(n);
  const range = new Float32Array(n), mag = new Float32Array(n);
  const sunlit = new Uint8Array(n), visible = new Uint8Array(n);
  const above = [];

  // real-time playback: advance each satellite along its circular orbit
  // P(tau) = P cos(n tau) + r*Vhat sin(n tau), n = sqrt(mu/r^3) (spec v3)
  const tau = state.propagationSec || 0;
  const muE = data.physicalConstants.muEarth.value;

  for (let i = 0; i < n; i++) {
    let Px = constellation.px[i], Py = constellation.py[i], Pz = constellation.pz[i];
    if (tau !== 0) {
      const r0 = Re + constellation.shellAlt[i];
      const nn = Math.sqrt(muE / (r0 * r0 * r0));
      const ct = Math.cos(nn * tau), st = Math.sin(nn * tau);
      const vx = constellation.vx[i] * r0, vy = constellation.vy[i] * r0, vz = constellation.vz[i] * r0;
      Px = Px * ct + vx * st; Py = Py * ct + vy * st; Pz = Pz * ct + vz * st;
    }
    // rotate sun-frame position into the working frame
    const x = Px * cth - Py * sth;
    const y = Px * sth + Py * cth;
    const z = Pz;
    const vx = x - O[0], vy = y - O[1], vz = z - O[2];
    const r = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const upDot = (vx * basis.up[0] + vy * basis.up[1] + vz * basis.up[2]) / r;
    const a = Math.asin(Math.max(-1, Math.min(1, upDot))) / DEG;
    alt[i] = a; range[i] = r;
    if (a <= 0) { visible[i] = 0; continue; }
    above.push(i);
    let azv = Math.atan2(
      vx * basis.east[0] + vy * basis.east[1] + vz * basis.east[2],
      vx * basis.north[0] + vy * basis.north[1] + vz * basis.north[2]) / DEG;
    if (azv < 0) azv += 360;
    az[i] = azv;
    const lit = isSunlit(x, y, z, s, data, geom);
    sunlit[i] = lit ? 1 : 0;
    if (!lit) { mag[i] = 99; visible[i] = 0; continue; }
    const cosPhase = (s[0] * -vx + s[1] * -vy + s[2] * -vz) / r; // sat->obs vs sat->sun
    const phase = Math.acos(Math.max(-1, Math.min(1, cosPhase)));
    const m = satMagnitude(constellation.m0[i], r, phase, a, data, mit);
    mag[i] = m;
    const mu = muAt([vx, vy, vz], s, sunAlt, data);
    const lim = Math.min(limitingMag(mu, data), userCap);
    visible[i] = m <= lim ? 1 : 0;
  }

  // ---- cluster-aware visibility (v3) ----
  // Compact clusters act photometrically as single objects: members that
  // are individually invisible can sum to a visible knot. Wide groupings
  // (launch trains, extent > resolveExtentDeg) stay per-member. Rewrites
  // the per-satellite visible flags so renderers draw knots correctly.
  let objectStats = null, clusterInfo = null;
  if (constellation.clustered) {
    const resolveDeg = data.clustering.resolveExtentDeg.value;
    const groups = new Map();
    for (const i of above) {
      if (!sunlit[i]) continue;
      const id = constellation.clusterId[i];
      let g = groups.get(id);
      if (!g) { g = []; groups.set(id, g); }
      g.push(i);
    }
    clusterInfo = new Map();
    let visibleObjects = 0, visibleSats = 0, brightestObj = Infinity;
    const dirOf = (i) => {
      const aa = alt[i] * DEG, zz = az[i] * DEG, ca = Math.cos(aa);
      return [
        ca * (Math.cos(zz) * basis.north[0] + Math.sin(zz) * basis.east[0]) + Math.sin(aa) * basis.up[0],
        ca * (Math.cos(zz) * basis.north[1] + Math.sin(zz) * basis.east[1]) + Math.sin(aa) * basis.up[1],
        ca * (Math.cos(zz) * basis.north[2] + Math.sin(zz) * basis.east[2]) + Math.sin(aa) * basis.up[2],
      ];
    };
    for (const [id, mem] of groups) {
      if (id < 0 || mem.length === 1) {           // independent satellites
        for (const i of mem) if (visible[i]) {
          visibleObjects++; visibleSats++;
          if (mag[i] < brightestObj) brightestObj = mag[i];
        }
        continue;
      }
      let cx = 0, cy = 0, cz = 0, flux = 0;
      const dirs = mem.map(dirOf);
      for (let k = 0; k < mem.length; k++) {
        cx += dirs[k][0]; cy += dirs[k][1]; cz += dirs[k][2];
        flux += Math.pow(10, -0.4 * mag[mem[k]]);
      }
      const cn = Math.hypot(cx, cy, cz);
      const cen = [cx / cn, cy / cn, cz / cn];
      let maxAng = 0;
      for (const dd of dirs) {
        const a = Math.acos(Math.max(-1, Math.min(1, dot(dd, cen))));
        if (a > maxAng) maxAng = a;
      }
      const extentDeg = (2 * maxAng) / DEG;
      if (extentDeg > resolveDeg) {               // wide: per-member objects
        for (const i of mem) if (visible[i]) {
          visibleObjects++; visibleSats++;
          if (mag[i] < brightestObj) brightestObj = mag[i];
        }
        clusterInfo.set(id, { count: mem.length, combinedMag: null, extentDeg, compact: false });
        continue;
      }
      const mc = -2.5 * Math.log10(Math.max(flux, 1e-12));
      const lim = Math.min(limitingMag(muAt(cen, s, sunAlt, data), data), userCap);
      const vis = mc <= lim;
      for (const i of mem) visible[i] = vis ? 1 : 0;
      clusterInfo.set(id, { count: mem.length, combinedMag: Math.round(mc * 100) / 100, extentDeg, compact: true });
      if (vis) {
        visibleObjects++; visibleSats += mem.length;
        if (mc < brightestObj) brightestObj = mc;
      }
    }
    objectStats = {
      visibleObjects, visibleSats,
      brightestObjectMag: isFinite(brightestObj) ? Math.round(brightestObj * 100) / 100 : null,
    };
  }
  return { alt, az, range, mag, sunlit, visible, above, sunAltDeg: sunAlt, sunDir: s,
           objectStats, clusterInfo };
}

/* ------------------------------------------------------------------ */
/* Long-exposure streaks (v2 camera mode)                              */
/* ------------------------------------------------------------------ */

/**
 * Sky positions of each satellite at the END of a camera exposure.
 * Linear chord approximation P2 = P + V * v_circ * dt (a 30 s LEO arc is
 * ~1.8 deg of orbit — chord error is negligible at display scale). The
 * observer's own motion and the terminator's drift over the exposure
 * (~0.008 deg) are ignored; both documented in the data file.
 * Returns { alt2, az2 } (Float32Array, degrees), aligned with evaluate().
 */
export function streakEndpoints(constellation, state, data, exposureSec) {
  const Re = data.physicalConstants.earthRadiusKm.value;
  const mu = data.physicalConstants.muEarth.value;
  const basis = enuBasis(state.latDeg);
  const O = observerUnit(state.latDeg).map((c) => c * Re);
  const th = thetaSunDeg(state.solarTimeHours) * DEG;
  const cth = Math.cos(th), sth = Math.sin(th);
  const n = constellation.n;
  const alt2 = new Float32Array(n), az2 = new Float32Array(n);
  const tau = state.propagationSec || 0;
  for (let i = 0; i < n; i++) {
    const r = Re + constellation.shellAlt[i];
    const speed = Math.sqrt(mu / r);                 // km/s, circular
    const d = speed * exposureSec;
    let P0x = constellation.px[i], P0y = constellation.py[i], P0z = constellation.pz[i];
    let V0x = constellation.vx[i], V0y = constellation.vy[i], V0z = constellation.vz[i];
    if (tau !== 0) {
      const nn = speed / r, ct = Math.cos(nn * tau), st = Math.sin(nn * tau);
      const nPx = P0x * ct + V0x * r * st, nPy = P0y * ct + V0y * r * st, nPz = P0z * ct + V0z * r * st;
      const nVx = -P0x / r * st + V0x * ct, nVy = -P0y / r * st + V0y * ct, nVz = -P0z / r * st + V0z * ct;
      P0x = nPx; P0y = nPy; P0z = nPz; V0x = nVx; V0y = nVy; V0z = nVz;
    }
    const Px = P0x + V0x * d;
    const Py = P0y + V0y * d;
    const Pz = P0z + V0z * d;
    const x = Px * cth - Py * sth, y = Px * sth + Py * cth, z = Pz;
    const wx = x - O[0], wy = y - O[1], wz = z - O[2];
    const rr = Math.sqrt(wx * wx + wy * wy + wz * wz);
    alt2[i] = Math.asin(Math.max(-1, Math.min(1,
      (wx * basis.up[0] + wy * basis.up[1] + wz * basis.up[2]) / rr))) / DEG;
    let a = Math.atan2(
      wx * basis.east[0] + wy * basis.east[1] + wz * basis.east[2],
      wx * basis.north[0] + wy * basis.north[1] + wz * basis.north[2]) / DEG;
    if (a < 0) a += 360;
    az2[i] = a;
  }
  return { alt2, az2 };
}

/**
 * Parse a custom shell spec string "alt:share, alt:share, ..." into the
 * shells array used by the constellation generator. Shares are
 * normalized; altitudes clamped to the filing's 500-2,000 km envelope.
 * Returns null if nothing parseable.
 */
export function parseShellSpec(text) {
  if (!text) return null;
  const shells = [];
  for (const part of String(text).split(/[,;]+/)) {
    const m = part.trim().match(/^(\d+(?:\.\d+)?)\s*[:\/]\s*(\d+(?:\.\d+)?)$/);
    if (!m) continue;
    const altKm = Math.max(500, Math.min(2000, parseFloat(m[1])));
    const share = parseFloat(m[2]);
    if (share > 0) shells.push({ altKm, share });
  }
  if (!shells.length) return null;
  const total = shells.reduce((a, s) => a + s.share, 0);
  for (const s of shells) s.share /= total;
  return shells;
}

/**
 * Per-star naked-eye visibility for the current state, shared by
 * summarize() and the renderer. Returns { vis: Uint8Array, count }.
 */
export function starVisibility(catalog, st, latDeg, sunDir, sunAltDeg, userCap, data) {
  const basis = enuBasis(latDeg);
  const k = data.photometry.extinctionCoefficient.value;
  const vis = new Uint8Array(catalog.count);
  let count = 0;
  for (let i = 0; i < catalog.count; i++) {
    if (st.altDeg[i] <= 0) continue;
    const aa = st.altDeg[i] * DEG, zz = st.azDeg[i] * DEG;
    const dir = [
      Math.cos(aa) * (Math.cos(zz) * basis.north[0] + Math.sin(zz) * basis.east[0]) + Math.sin(aa) * basis.up[0],
      Math.cos(aa) * (Math.cos(zz) * basis.north[1] + Math.sin(zz) * basis.east[1]) + Math.sin(aa) * basis.up[1],
      Math.cos(aa) * (Math.cos(zz) * basis.north[2] + Math.sin(zz) * basis.east[2]) + Math.sin(aa) * basis.up[2],
    ];
    const mu = muAt(dir, sunDir, sunAltDeg, data);
    const lim = Math.min(limitingMag(mu, data), userCap);
    const m = st.vmag[i] + k * (airmass(st.altDeg[i]) - 1);
    if (m <= lim) { vis[i] = 1; count++; }
  }
  return { vis, count };
}

/**
 * The aggregate API the UI readouts and acceptance tests consume.
 * Returns counts, brightest satellite, star comparison, and sun context.
 */
export function summarize(constellation, state, data, catalog = null) {
  const ev = evaluate(constellation, state, data);
  let aboveHorizon = 0, sunlitAbove = 0, vis = 0, brightest = Infinity;
  const perFamily = { sso: 0, inclined: 0, train: 0 };
  const famName = ["sso", "inclined", "train"];
  const visPerFamily = { sso: 0, inclined: 0, train: 0 };
  for (const i of ev.above) {
    aboveHorizon++;
    perFamily[famName[constellation.family[i]]]++;
    if (ev.sunlit[i]) {
      sunlitAbove++;
      if (ev.visible[i]) {
        vis++;
        visPerFamily[famName[constellation.family[i]]]++;
        if (ev.mag[i] < brightest) brightest = ev.mag[i];
      }
    }
  }
  let visibleStars = 0;
  if (catalog) {
    const st = starAltAz(catalog, state.latDeg, state.doy, state.solarTimeHours, data);
    const userCap = state.userLimitingMag ?? data.limitingMagnitude.userLimitingMagCap.value;
    visibleStars = starVisibility(catalog, st, state.latDeg, ev.sunDir, ev.sunAltDeg, userCap, data).count;
  }
  const os = ev.objectStats;
  return {
    aboveHorizon, sunlitAbove, visible: os ? os.visibleSats : vis,
    visibleObjects: os ? os.visibleObjects : vis,
    aboveHorizonPerFamily: perFamily, visiblePerFamily: visPerFamily,
    visibleStars,
    brightestMag: vis > 0 ? Math.round(brightest * 100) / 100 : null,
    brightestObjectMag: os ? os.brightestObjectMag
      : (vis > 0 ? Math.round(brightest * 100) / 100 : null),
    sunAltDeg: Math.round(ev.sunAltDeg * 100) / 100,
  };
}
