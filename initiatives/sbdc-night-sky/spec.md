# SBDC Night-Sky Simulator — Specification

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Purpose:** An interactive, standalone simulation showing how a very large constellation of space-based data centers (SBDCs) would appear in the sky from any point on Earth, at any time of day and year — extending the static report figures into a tool a reader can explore.

**Status:** Implemented — see the addendum at the end for final status against this spec. · July 9, 2026

---

## 1. Background and scope

The report figures (developed in the prior conversation) show two frozen moments: an orbit-geometry diagram and a horizon view ~30 minutes after sunset. This simulator generalizes them. The user chooses a latitude, a date (which sets the sunset time and solar geometry), and a time of day; the simulator renders the sky that observer would see, with the SBDC swarm, launch trains, and background stars, and reports summary numbers (satellites above horizon, satellites visible, brightest magnitude).

The scenario modeled is the January 30, 2026 FCC filing: up to one million satellites, 500–2,000 km altitude, in Sun-synchronous (dawn–dusk, ~97–99° inclination) and 30°-inclination shells. The filing does not specify shell arrangement, satellite size, or brightness, so those are explicit, user-adjustable assumptions (Section 5).

**In scope:** naked-eye horizon and all-sky views; twilight/night/day transitions; Earth-shadow eclipsing; both orbit families; launch trains; latitude effects including high-latitude summer all-night visibility; satellite brightness as a directly-stated, anchored parameter (v3); optional data-center clustering; real-time and fast-forward playback.

**Out of scope (v1):** photometric-grade brightness prediction; radio/thermal impacts; long-exposure telescope streak view (listed as a v2 candidate); individual-satellite ephemerides against real TLEs.

## 2. User-facing behavior

### 2.1 Views

**Horizon view (default).** Panoramic sky as seen standing on the ground: azimuth on the x-axis, altitude 0–90° on the y. Twilight glow sits over the sun's azimuth; the SBDC band appears where geometry puts it. Ground silhouette along the bottom with cardinal direction labels.

**All-sky view (toggle).** Fisheye projection, zenith at center, horizon at the rim — the "more satellites than stars" figure, live.

Both views are **pannable** (drag to turn / recentre) and **zoomable** (wheel / pinch changes field of view, 20°–120° in horizon view). Hovering/tapping a satellite shows a tooltip: altitude-azimuth, range, shell, estimated magnitude, sunlit/eclipsed status.

### 2.2 Controls

| Control | Range / values | Default | Notes |
|---|---|---|---|
| Latitude | −90° … +90°, 1° steps | 40° N | Slider + numeric entry |
| Day of year (date) | Jan 1 … Dec 31 | Jun 21 | Sets solar declination → sunset time, shown live next to the slider |
| Local time (solar) | 00:00 … 24:00, 1-min steps | sunset + 30 min | A "sunset / dusk / midnight / dawn" quick-jump row; optional animate/play button that advances time |
| Constellation size | 10,000 … 1,000,000 (log slider) | 300,000 | Total satellites across all shells |
| SSO vs 30°-shell split | 0–100 % | 70 % SSO | Filing lists both families |
| Shell altitudes | presets: Low (500–700 km), Mid (700–1,200 km), Spread (500–2,000 km) | Spread | Editable per-shell in an "advanced" panel |
| SBDC brightness (v3) | −7 … +7 mag at the 1,000 km / 90°-phase / zenith reference | +0.5 (unmitigated) | Sets the population's median magnitude directly; anchors at +0.5 / +5.5 / +7 (Section 5.4, §v3) |
| Data-center clustering (v3) | off/on; 10–1,000 sats/cluster; 0.2–10 km diameter (variations in Advanced) | off | Packs satellites into compact formations; cluster count derived (§v3) |
| Playback (v3) | Real time / Fast forward (+ shimmer toggle); twilight lock; Dawn −60 | stopped; shimmer on | Orbital propagation in real time; sunset/dawn-relative time hold (§v3) |
| Launch trains | 0–10 recent trains | 1 | Each train: ~60 satellites in a tight string at 350–450 km climbing to its plane |
| Star field | on/off + limiting magnitude 4.0–6.5 | on, 6.0 | Simulates light pollution levels |
| Render style | chosen from the draft styles | (per review) | Photographic vs chart vs print styles |

Direction of gaze (which azimuth the horizon view faces) is set by panning, with a compass readout.

### 2.3 Readouts

*(v3: when clustering is enabled, the visible count is reported as visible **objects** with the number of satellites they contain; the brightest-magnitude figure refers to the brightest object, individual or knot.)*

A status strip always shows: computed sunset/sunrise time for the chosen latitude and date; sun depression angle; satellites above the horizon; satellites sunlit **and** above the horizon; satellites visible to the naked eye (brighter than the sky-contrast threshold); count of visible satellites vs visible stars; brightest satellite magnitude with a comparison anchor ("brighter than Venus / like Jupiter / like a bright star").

### 2.4 Physical behaviors the simulation must reproduce

These are the acceptance-level truths, all established in the prior conversation:

1. **Twilight concentration.** For dawn–dusk SSO satellites, an observer sees the dense band near local dusk and dawn; at local midnight (mid/low latitudes) the SSO swarm is below the horizon.
2. **Latitude-independence of the twilight pass.** Every latitude passes under the SSO band twice a day. Changing latitude at fixed "minutes after sunset" keeps the band visible (its orientation and elevation change).
3. **High-latitude summer.** Near and above ~55–65° latitude around the June solstice (and the mirrored southern case), the SSO ring stays above the horizon and sunlit essentially all night.
4. **30°-shell behavior.** The 30° satellites are visible from low/mid latitudes spread across the sky, are progressively eclipsed by Earth's shadow as the night deepens, and are never visible above ~35–40° latitude plus the visibility footprint.
5. **Earth shadow.** A satellite is drawn dark (or omitted) when inside Earth's shadow; higher shells stay sunlit longer into the night.
6. **Band geometry.** The SSO band runs roughly north–south through the sky for an observer on the terminator; density increases toward the horizon (slant-path through the shell) while atmospheric extinction dims the lowest objects.
7. **Appearance.** Satellites are steady, planet-like points (no twinkle), rendered as smooth point-spread profiles calibrated to naked-eye response — small saturated cores, gentle skirts, no double rings. Unmitigated SBDCs mostly outshine most stars (magnitude −2 to +4 vs. all but ~a dozen stars fainter than +1.5).
8. **Launch trains.** Trains run along the track of the plane they are climbing into (roughly N–S for SSO trains), lower and therefore brighter than the operational shells.
9. **Day sky.** Before sunset / after sunrise, the sky-brightness model hides all but (optionally) the very brightest objects — the display should not show a star field at noon.

## 3. Architecture

**Deliverable:** one standalone HTML file, `sbdc-sky-simulator.html`, no network access required, everything inline (JS, CSS, data). Opens from disk in any modern browser.

Internally three layers, kept separable in source before a build step inlines them:

- `sbdc-data.json` — every physical constant, assumption, and dataset (Section 5). Embedded in the HTML as a single `<script type="application/json" id="sbdc-data">` block, so it remains one findable, replaceable blob even inside the single file. Also shipped alongside as a separate file for inspection.
- `sbdc-model.js` — pure functions, no DOM: solar ephemeris, coordinate transforms, constellation generator, shadow test, magnitude model, sky-brightness model, visibility counts. This is the tested code.
- `sbdc-ui.js` — Canvas 2D renderer, controls, pan/zoom, tooltips. Reads only from the model layer.

**Rendering:** Canvas 2D with additive compositing for point-spread splats. Target: 60 fps pan/zoom at 300k satellites via (a) generating satellites procedurally per frame only within the view frustum + horizon cap, and (b) statistical rendering — beyond a per-pixel density cap, faint satellites are drawn from a density texture rather than individually. WebGL is the fallback plan only if Canvas 2D profiling fails the 30 fps floor on a mid-range laptop (see risks, implementation plan §6).

**Reproducibility:** all stochastic placement uses a seeded PRNG (mulberry32); the seed is shown in the UI and settable, so any specific rendered sky can be reproduced exactly.

## 4. Physical model

### 4.1 Sun position
Low-precision solar ephemeris (Meeus, *Astronomical Algorithms* ch. 25 short form): day-of-year → solar declination and equation of time → local solar altitude/azimuth for the observer. Accuracy ~0.01–0.1°, far beyond what the visualization needs. Sunset/civil/nautical/astronomical twilight times derived from solar altitude crossings (−0.833°, −6°, −12°, −18°).

**Simplification (documented in-app):** "local solar time" is used rather than clock time + longitude + time zone. Longitude is therefore irrelevant and not an input. This matches the report's framing (everything is "minutes after local sunset").

### 4.2 Constellation generator
Satellites are generated procedurally from parameters, not from an ephemeris file:

- Each **shell** = altitude, inclination, number of planes, satellites per plane, RAAN spread.
- **SSO shells:** inclination from the Sun-synchronous condition for the shell altitude (97.4° at 550 km → 99.5° at 1,200 km, computed from the J2 nodal-precession formula, not hard-coded); RAANs clustered around the dawn–dusk orientation with a configurable local-time-of-ascending-node spread (default ±45 min), reflecting that a real deployment would smear across near-terminator planes.
- **30° shells:** inclination 30°, RAAN uniform.
- Positions: circular orbits, uniform mean anomaly, phase offset per plane. Earth rotation handled by working in an Earth-fixed frame where the SSO node tracks the sun (the defining property of SSO) — the mathematically clean shortcut that makes "the ring stays fixed over the terminator while Earth turns beneath it" exact rather than approximate.

**Simplification (documented):** the sub-solar-point seasonal drift of the terminator (solstice tilt) IS modeled — the SSO plane precesses with the mean sun, so June-solstice high-latitude behavior emerges correctly. Orbit eccentricity, drag, and J2 short-period terms are ignored.

### 4.3 Visibility pipeline (per satellite)
1. **Above horizon?** Geometric: elevation > 0° from observer (spherical Earth, radius 6,371 km; refraction ignored — documented).
2. **Sunlit?** Cylindrical Earth-shadow test with umbra taper (conical correction ~0.26°/R⊕ — the choice between cylinder and cone is a data-file flag; default cone).
3. **Bright enough to see?** Estimated magnitude (4.4) vs. the naked-eye detection threshold given local sky surface brightness (4.5). A satellite is "visible" when its magnitude beats the threshold; near the threshold it is rendered fading, not popping.

### 4.4 Satellite magnitude model
Anchored to the numbers agreed in the conversation: large unmitigated SBDCs ≈ magnitude **−2 to +4** across the population and geometries. Implemented as a diffuse-sphere approximation:

m = m₀(1000 km) + 5·log₁₀(range/1000 km) − 2.5·log₁₀(phaseFunction(α)) + extinction(k, airmass)

with m₀ drawn per-satellite from a distribution (default N(0.5, 1.3), clamped [−2.5, +4.5]) representing size/attitude/albedo variation, phase function = Lambertian sphere, extinction k = 0.20 mag/airmass. The **SBDC brightness slider** (v3) sets the population's median magnitude at the reference condition directly, −7 … +7, applied as a uniform offset to the per-satellite scatter; anchors mark +0.5 (unmitigated large platform — the default and the report calibration), +5.5 (strong mitigation, the Starlink-class darkening record, landing the population near the IAU +7 recommendation region — "reduce, not eliminate"), and +7 (the IAU target itself). Mitigation measures are the engineering interpretation of movement along this scale, not a separate mechanism. All constants live in the data file.

**This is the least certain part of the model and is flagged as such in the UI** — the filing gives no sizes or albedos.

### 4.5 Sky brightness and detection threshold
Twilight sky surface brightness as a function of sun depression angle: piecewise model fit to published zenith values (~ mag 12/arcsec² at sunset → ~17 at −6° → ~19.5 at −12° → ~21.5–22 dark sky at −18°), with a gradient toward the solar azimuth. Naked-eye point-source limiting magnitude derived from surface brightness via a standard contrast model (Schaefer-style, simplified; tabulated in the data file with the source noted). Stars and satellites share the same threshold — this is what makes stars "come out" correctly as the user drags time past dusk.

### 4.6 Star field
Real catalog: the **Yale Bright Star Catalog** (9,096 stars to V ≈ 6.5), reduced to (RA, Dec, V) at ~110 KB embedded JSON. Star positions transformed to alt-az via standard sidereal-time rotation. Using a real catalog (Orion, the Southern Cross, etc. appear where they belong) makes the "satellites vs stars" comparison honest and the display recognizable. Proper names for ~20 brightest stars for tooltips.

### 4.7 Launch trains
Each train: N_train satellites (default 60) at a low altitude (default 400 km), tightly strung along-track (default 8° arc), in a plane offset from the operational planes; rendered brighter (nearer) per the same magnitude model.

## 5. Data & assumptions file — the auditable core

Everything a reviewer might challenge lives in `sbdc-data.json`, organized so each value carries a `value`, `units`, `source`, and `confidence` ("measured / published / modeled / assumed"). Top-level sections:

| Section | Contents | Confidence |
|---|---|---|
| `physicalConstants` | Earth radius, μ, J2, AU, obliquity 23.44° | measured |
| `scenario` | Constellation total, shell definitions (altitude, inclination family, count share), LTAN spread | **assumed** — FCC filing bounds only |
| `photometry` | m₀ scatter, phase function choice, extinction k, reference-brightness anchors (v3), camera mode | **modeled/assumed** — flagged prominently |
| `skyBrightness` | Twilight brightness vs sun-depression table + source citation | published |
| `limitingMagnitude` | Contrast/threshold table + source citation | published (simplified) |
| `starCatalog` | Yale BSC subset | measured |
| `launchTrain` | Train size, altitude, arc length | assumed (Starlink-train analog) |
| `renderCalibration` | PSF core/skirt parameters per style, naked-eye vs camera mode | aesthetic, but documented |

An **"Assumptions" panel** in the app renders this file as a readable table so the audit trail is visible without opening the source. Replacing the JSON block (or the sidecar file in the dev repo) changes the simulation with no code edits.

## 6. Standalone vs. server — the trade-off requested

**Recommended: fully standalone HTML (as specified).** Everything above fits comfortably: BSC subset ~110 KB, code ~60–90 KB, total file ~250–400 KB. No installation, no server, works offline, e-mailable alongside the report, archivally stable.

**When a server version would be genuinely better** (offered as an alternative, not chosen):
1. **Real ephemerides** — if you later want the tool to overlay *actual* tracked objects (Starlink today, ODC satellites if launched) from CelesTrak TLEs, that requires fetching current data.
2. **Deeper star catalogs / Milky Way imagery** — Gaia-based catalogs to mag 8+ or photographic sky backgrounds are tens of MB; better streamed.
3. **WebGL asset pipelines / shared links with server-rendered previews** for report distribution at scale.
4. **Usage analytics** if the report team wants to know how readers explore it.

None of these are needed for the report's illustrative purpose, so the standalone build is primary; the architecture (data file + pure model + UI) ports to a served version without rework if (1) ever becomes a requirement.

## 7. Non-functional requirements

Performance: initial render < 2 s; pan/zoom ≥ 30 fps at 300k satellites on a 2020-era laptop, ≥ 15 fps at 1M. Compatibility: current Chrome, Edge, Firefox, Safari, desktop and tablet; degrade gracefully on phones (fewer rendered points). Accessibility: all controls keyboard-operable; readouts as live text (screen-reader friendly); reduced-motion preference slows both playback modes to gentle discrete steps. No external network requests at all (verifiable: works with DevTools offline mode).

## 8. Open questions for David

1. **"Time of sunset" as an input.** Sunset time is determined by latitude + date, so a truly independent sunset slider would break physical consistency. The spec instead uses a **date slider that displays the computed sunset time live**, plus quick-jump buttons ("sunset", "30 min after", "midnight"). Is that acceptable, or did you want a simplified mode where sunset time is set directly (with the date decoupled)?
2. **Both orbit families, or SSO-only?** The filing includes 30°-inclination shells; the spec includes them with a split slider. Keep, or focus v1 purely on the dawn–dusk story?
3. **Long-exposure/telescope mode** (streaks, the astronomy-impact view): v2, or must-have for v1?
4. **Default constellation size:** 300,000 shown by default (matching "several hundred thousand" in the figures) with the slider reaching the filing's 1,000,000 — or default to the full million?
5. **Star-catalog realism:** real Yale catalog (recognizable constellations, ~110 KB) vs. procedural stars (smaller file). Spec assumes the real catalog.
6. Any need for a **French/other-language** or print-export (PNG snapshot button) feature for the report workflow? A snapshot button is cheap and proposed for inclusion.


---

## Addendum — final status against this specification (project closure)

All v1 requirements are implemented and verified (59 automated tests as of v3, three-layout headless smoke of the built artifact, external-anchor validation). Deltas from the draft: **(1)** the "time of sunset" input was resolved per review as a date slider with the computed sunset displayed live (open question 1); **(2)** the constellation-size lower bound was raised to 50,000 at plan review, then restored to the draft's 10,000 in the post-closure changes below — §2.2 reflects the final range; **(3)** per-shell editing (§2.2) shipped as a Custom option accepting `altitude:share` pairs rather than a full advanced panel; **(4)** two v2 candidates were implemented after v1 acceptance — the long-exposure camera mode (§ out-of-scope list) and a French interface — leaving live-TLE overlays as the only §6 server-dependent item, unimplemented by design; **(5)** renderer regression testing uses screenshot statistics and behavioral assertions in the headless smoke rather than golden-image hashes (implementation plan §2), which proved more robust across canvas back-ends; **(6)** two physical findings surfaced during Phase 1 and are encoded as acceptance tests: the seasonal westward displacement of the dusk band at solstices, and the split between all-night *illumination* (peaks ~65°+) and all-night naked-eye *visibility* (peaks ~55°) in high-latitude summer.

**Post-closure review changes (same date):** default orientation changed to facing north in both views with east on the right (map convention, replacing the astronomical looking-up mirror in the fisheye); a labeled celestial-pole crosshair added (altitude = |latitude|, toward the visible pole) with a "Mark celestial pole" toggle under Sky & display, on by default; a rolling-hills ground silhouette added to the horizon view; the brightness-mitigation range extended from +5 to +7 mag with +5 relabeled from "full" to "strong" mitigation; and the constellation slider's lower bound restored to 10,000 (the draft's original value, superseding the 50,000 set at plan review). All are covered by updated unit and smoke tests; golden physics fixtures were unaffected.

## v3 upgrades (implemented per UPGRADE_PLAN.md review, July 18, 2026)

**Brightness semantics.** The mitigation slider is replaced by **SBDC brightness**: the median satellite magnitude at the reference condition (1,000 km range, 90° phase, zenith), range −7…+7, population scatter retained, anchors at +0.5 (unmitigated — the default, preserving all published-figure calibration), +5.5 (strong mitigation, Starlink-class record), and +7 (IAU recommendation). Internally an offset from the reference default, so the slider is evaluation-cheap; legacy golden fixtures were migrated (mitigation m ↦ brightness 0.5+m) and every pre-v3 value verified reproduced exactly.

**Playback and time.** Real-time playback propagates every satellite analytically along its circular orbit (P(τ) = P cos nτ + rV̂ sin nτ), so satellites traverse the sky at their true 0.2–0.9°/s against a star field moving 15″/s; fast-forward retains the accelerated sweep, with along-track motion governed by a **shimmer** toggle (default on, per review). A **twilight lock** holds sunset/dawn-relative offsets across latitude/date changes, falling back to absolute time under polar day/night. Dawn −60 joins the quick jumps.

**Hierarchical clustering.** Optional, off by default per review: cluster centers placed by the unchanged shell/plane machinery; members strewn within lognormal diameters (defaults 100 satellites / 1 km; variation σ = 0.35 in Advanced); cluster count derived as total ÷ per-cluster. Visibility is cluster-aware — compact knots (extent < 0.5°) are judged by combined magnitude m꜀ = −2.5 log₁₀ Σ10^(−0.4mᵢ), so individually-invisible members can form a visible object; wide groupings (launch trains) stay per-member. The readout distinguishes visible **objects** from satellites contained; knot tooltips report membership, extent, and combined magnitude. Population flux conserved (verified to 0.05%); cluster-level night-to-night lumpiness of above-horizon totals is a real, documented consequence.

**UI.** Fourth **Advanced** group (seed, tint, celestial pole, fast-forward shimmer, cluster variations), collapsed by default; all new strings translated (EN/FR). Suite: 59 model/scenario/golden/renderer tests plus extended smoke (brightness anchors, timelock hold, playback controls, clustering end-to-end).

**Post-v3 refinements (2026-07-20):** attribution line ("Developed by Ken Novak and David Sandalow, draft for review 2026-07-20") added to the simulator's corner, to every exported PNG's footer, to every document's subtitle, and as source-code header comments; twilight-lock label clarified to "Hold time relative to sunset/dawn as latitude changes"; the shimmer toggle moved from Observer to Advanced; the time label simplified from "Local solar time" to "Local time" (the clock remains solar — documented in the tutorial's limitations).
