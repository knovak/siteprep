# SBDC Night-Sky Simulator — Implementation Plan

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

Companion to SPECIFICATION.md · July 9, 2026

> **Status: complete.** All phases executed; see PHASE1/PHASE23/PHASE4 reports and FINAL_REPORT.md. Deviations from this plan are listed in the SPECIFICATION.md addendum.

## 0. Development shape

Source is developed as separable files, then a tiny build step inlines them into the single deliverable:

```
sbdc-sim/
  data/sbdc-data.json          # all constants & assumptions (spec §5)
  data/bsc-reduced.json        # Yale BSC subset (generated once, §1.3)
  src/model.js                 # pure functions — the tested core
  src/render.js                # canvas splatting, projections, styles
  src/ui.js                    # controls, pan/zoom, tooltips, readouts
  src/app.css / index.html     # shell
  test/model.test.js           # Node-run unit + property tests
  test/scenarios.test.js       # acceptance scenarios (spec §2.4)
  test/golden/                 # seeded golden-count fixtures
  build.js                     # inline everything → sbdc-sky-simulator.html
```

Node is used only for testing and building; the artifact itself has zero dependencies. `model.js` is written dual-environment (ES module, no DOM references) so the identical file runs in the browser and under `node --test`.

## 1. Phase 1 — Model core (est. the largest phase)

1.1 **PRNG + utilities.** mulberry32 seeded PRNG; vector/rotation helpers; angle wrapping. *Tests:* PRNG determinism (same seed → same sequence), rotation round-trips.

1.2 **Solar ephemeris.** Meeus short-form: JD → solar declination, equation of time → altitude/azimuth for (lat, solar time); twilight crossing solver. *Tests:* declination ≈ +23.44° at Jun-21 and ≈ 0 at equinoxes (±0.3°); sunset at equator on equinox ≈ 18:00 local solar (±3 min); polar-day detection at 70°N in June (no sunset found — must return the flag, not NaN).

1.3 **Star catalog pipeline.** One-off Python script downloads/parses the Yale BSC (or uses the bundled copy), emits `bsc-reduced.json` [ra, dec, vmag] with magnitudes quantized to 0.1. *Tests:* record count 9,000–9,110; Sirius present at V ≈ −1.46; file < 150 KB. RA/Dec → alt-az transform tested against two hand-computed cases (Sirius from 40°N at a known sidereal time; Polaris altitude ≈ observer latitude).

1.4 **Constellation generator.** Shell spec → satellite positions in the sun-referenced Earth-fixed frame (spec §4.2), including the SSO inclination-from-altitude formula and LTAN spread. *Tests:* SSO inclination(550 km) ≈ 97.6° ±0.3; generated SSO positions cluster about the terminator plane (mean |angle from plane| below the configured spread); 30°-shell latitudes never exceed 30.0°+ε; count conservation (requested N = generated N); determinism under seed.

1.5 **Geometry & shadow.** Observer-relative topocentric conversion (elevation, azimuth, range); Earth-shadow cone test. *Tests:* satellite directly overhead at 600 km → elevation 90°, range 600 km; satellite over the antipode → below horizon; shadow: satellite at anti-solar point at 600 km → eclipsed, at the subsolar point → sunlit; cone vs cylinder flag changes results only near the shadow boundary; shadow-exit altitude increases with shell height (property test: higher shell → sunlit later into the night).

1.6 **Photometry & sky brightness.** Magnitude model (spec §4.4), twilight sky-brightness interpolation, limiting-magnitude threshold. *Tests:* range doubling adds ~1.5 mag; extinction grows with airmass; population percentiles of m under defaults land in −2…+4; mitigation slider at max shifts median ≥ +4.5 mag; sky brightness monotonically darkens as sun depression grows; limiting magnitude ≈ 6.0–6.5 at −18° and ≤ 3 at −4° (table sanity).

1.7 **Aggregate counts API.** `summarize(state) → {aboveHorizon, sunlitAbove, visible, visibleStars, brightest}` — the function both the UI readouts and the acceptance tests consume.

### Acceptance scenario tests (from spec §2.4 — written before the UI exists)

| # | Scenario (lat, date, time) | Assertion |
|---|---|---|
| A1 | 0°, equinox, sunset+30 min | SSO band visible; visible satellites > visible stars for N=300k unmitigated |
| A2 | 0°, equinox, local midnight | SSO visible count ≈ 0; 30°-shell partially eclipsed, some visible early night, none deep night at low altitudes |
| A3 | 40°N, Jun 21, sunset+30 | band visible, oriented ~N–S |
| A4 | 40°N, Jun 21 vs Dec 21, same depression angle | comparable visible counts (twilight-pass latitude independence) |
| A5 | 65°N, Jun 21, local midnight | SSO satellites visible (all-night visibility) — count ≫ 0 |
| A6 | 65°S, Dec 21, local midnight | mirror of A5 |
| A7 | 50°N, any date | zero 30°-shell satellites above ~10° elevation beyond footprint bound |
| A8 | any, noon | visible count = 0 with default settings |
| A9 | N scaling | aboveHorizon(600k) ≈ 2× aboveHorizon(300k) ± 5% |
| A10 | footprint sanity | aboveHorizon fraction ≈ analytic cap-area fraction for a single shell ± 15% |

Golden-count regression: for 5 fixed (seed, state) tuples, `summarize` outputs are frozen in `test/golden/` and compared exactly; any model change that alters them must be intentional.

## 2. Phase 2 — Renderer

2.1 Projections: horizon panorama (az × alt, pan = rotate azimuth / tilt, zoom = FOV) and all-sky fisheye (equal-area). 2.2 PSF splatting: additive Gaussian core+skirt per point, parameters from `renderCalibration`, per chosen style; density-cap fallback for ultra-dense fields. 2.3 Sky background: per-pixel twilight gradient from the sky-brightness model (this makes the western glow physically driven, not painted). 2.4 Ground silhouette, cardinal labels, style-specific chrome.

*Tests (renderer):* mostly visual + a few automatable ones under node-canvas: (a) golden-image hash for 3 fixed states per style at 400×250 (loose perceptual-hash comparison, not byte equality); (b) no NaN pixels; (c) render time budget measured and logged. Manual visual checklist: no double-ring halos; stars absent at noon; band densest near horizon; extinction dimming visible at < 10° elevation.

## 3. Phase 3 — UI & interaction

Controls per spec §2.2 (plain HTML inputs, styled); readout strip; tooltips via nearest-point search in screen space (k-d bucket grid); quick-jump time buttons; play/animate; seed field; assumptions panel rendering `sbdc-data.json`; PNG snapshot button (canvas.toBlob). Keyboard: arrows pan, +/- zoom, all inputs tabbable.

*Tests:* Playwright (if available) or manual scripted checklist — slider events update readouts; pan/zoom bounds respected; offline mode (no network panel entries); tooltip correctness spot-check against model output for a clicked satellite.

## 4. Phase 4 — Build, validation pass, packaging

`build.js` inlines CSS/JS/JSON → `sbdc-sky-simulator.html`; asserts final size < 600 KB and that the file contains no `http(s)://` fetches. Full test suite re-run against the built file's extracted model block (guards against inlining drift). Cross-browser smoke: Chrome + Firefox + Safari (manual). Final deliverables: the HTML file, `sbdc-data.json` sidecar, and a 1-page README (how to open, how to change assumptions).

## 5. Validation beyond tests (credibility checks)

- Compare simulated visible-satellite counts at dusk against the conversation's calibration point (~2,600 satellites vs ~2,200 stars for several hundred thousand SBDCs) — should reproduce within ~30%.
- Compare a "today's Starlink" configuration (N≈7,000, 550 km, 53°) against the qualitative literature (dozens visible at dusk, not thousands) as an external sanity anchor.
- Reviewer pass over `sbdc-data.json` (this is where a domain expert audits the tool without reading code).

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Canvas 2D too slow at 1M points | Frustum + statistical density rendering first; WebGL point-sprite fallback is a contained change inside render.js |
| Magnitude model challenged by reviewers | All photometry constants isolated + confidence-flagged; UI banner "illustrative, not photometric" mirroring the report caveat |
| Sunset-slider expectation mismatch (open question 1) | Resolved at plan review before Phase 3 |
| BSC licensing/packaging | Yale BSC is public domain; script keeps a checksum of the source file |
| Single-file bloat | Size assertion in build; magnitudes quantized; JSON minified with a pretty sidecar |

## 7. Sequence & effort (rough)

Phase 1 model+tests ≈ 45% of effort → Phase 2 renderer ≈ 25% → Phase 3 UI ≈ 20% → Phase 4 build/validation ≈ 10%. Phases 1 and 2 can begin immediately after style selection and answers to the open questions; the style choice affects only `renderCalibration` and chrome, so it does not block Phase 1.
