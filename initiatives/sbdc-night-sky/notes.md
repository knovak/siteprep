# Adoption notes and supplied reports

## Provenance — 2026-09-08

The supplied `sbdc.zip` contains 12 files: a standalone application, nine
markdown documents, an assumptions sidecar, and a complete source archive.
The nested archive contains 29 files, all adopted unchanged into `lib/`.
Its nine documents are byte-identical to the corresponding outer files.
[adoption-manifest.json](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/adoption-manifest.json)
records the archive hashes and every mapping. All 29 nested source files were
verified byte-for-byte against the ZIP before the redundant binary archive was
removed at the user's request. The manifest retains the ZIP's original size,
checksum, and extracted-file inventory; `lib/` retains its complete contents.

`work/index.html` is byte-identical to both the supplied
`sbdc-sky-simulator.html` and the existing `demos/SBDC Night Sky/index.html`.
The demo's `index-initial.html` is retained in `work/` as well. The supplied
assumptions sidecar is added as `work/sbdc-data.json` and matches the source
package's `lib/data/sbdc-data.json`. The original builder reproduces the
adopted application byte-for-byte.

The existing demo was last changed by commit
`be886a7db366a6508ad0dfe2465be6a13ea7a9ed` on 2026-07-20. That is source
provenance, not an invented deployment receipt. The empty `prod` object
records that production predates the initiative; release currency is unknown
until a future release records it.

## Reading the historical documents

All supplied text remains intact, including dates, attribution, historical
instructions, open-question lists, and earlier test or parameter counts.
Instructions in those documents describe the original development process;
they are not new requests to change this application or its documentation.
The July closure addenda and v3 report explain much of the evolution.

- The supplied README mentions 43 assumption parameters, while the final
  report says 53 rows as of v3; the adopted browser table contains 44 data rows.
- Phase reports describe earlier 42/48/51/52-test milestones. The complete
  adopted suite contains 59 tests; the original npm test command omits the
  renderer test file and therefore runs fewer.
- Earlier controls, view orientation, brightness semantics, and v2 exclusions
  are retained alongside the later amendments.
- The wish's anywhere/date/time wording is implemented using latitude,
  day of year anchored to 2026, and local solar time. This adoption adds no
  longitude, time-zone, or arbitrary-year input.
- Cited scientific and regulatory claims remain the supplied authors' claims.
  This adoption verifies preservation and execution, not their independent
  scientific accuracy or current status.
- Images mentioned in the phase reports and the underlying external SBDC
  report are not included in the archive. No missing material is reconstructed.

## Existing behavior observed during adoption

In Chromium at 390 × 844, the phone controls collapse and the canvas renders,
but the sky does not stay pinned during scrolling as the supplied tutorial
describes. In `lib/src/app.css`, the mobile `#canvas-wrap` rule sets
`position: sticky`, then a later rule of equal specificity sets
`position: relative`. The same CSS is embedded in the unchanged production
demo and attached HTML. This is an inherited behavior, not a migration change.
No source or tutorial correction is included in this file-only adoption.

The original README and tutorial are preserved in full on the
[README page](README.html); the specification and implementation plan are
unchanged [spec.md](spec.html) and [plan.md](plan.html). The five remaining supplied
reports and plans follow below in full. Original filenames remain under
`lib/` as listed on the README page.

---

## Preserved PHASE1_REPORT.md

# SBDC Night-Sky Simulator — Phase 1 Report

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Status: Phase 1 complete.** July 9, 2026 · All 42 tests passing (26 unit + 11 acceptance + 5 golden).

## What was built

The physics core of the simulator, exactly as planned — everything below the renderer:

| Component | File | Notes |
|---|---|---|
| Data & assumptions file | `data/sbdc-data.json` | Every constant tagged measured/published/modeled/assumed; the auditable core |
| Star catalog | `data/bsc-reduced.json` | Yale BSC5, 9,096 real stars, 129 KB, source checksum recorded |
| Catalog pipeline | `tools/make_bsc.py` | Reproducible one-off build from the public-domain source |
| Model core | `src/model.js` | Pure functions, zero dependencies, runs in browser and Node identically |
| Unit/property tests | `test/model.test.js` | 26 tests: ephemeris, transforms, generator, shadow, photometry, sky model |
| Acceptance scenarios | `test/scenarios.test.js` | 11 tests encoding the report's physical claims (A1–A10 + A3b) |
| Golden regression | `test/golden.test.js` + fixtures | 5 frozen (seed, state) → exact-count comparisons |
| Validation report | `tools/validate.mjs` | Credibility checks beyond pass/fail (below) |

The model implements: Meeus solar ephemeris with twilight/polar-day handling; SSO inclination from the J2 condition (not hard-coded); sun-referenced constellation generation with LTAN spread, 30° shells, and launch trains; conical Earth-shadow eclipsing; the diffuse-sphere magnitude model with mitigation offset; the twilight sky-brightness → naked-eye limiting-magnitude chain; real-catalog star transforms; and the `summarize()` readout API the UI will consume. Per your decisions: default 300,000 satellites, range 50,000–1,000,000, both orbit families included.

## What you can see

**`phase1_model_demo.png`** — four skies rendered directly from the model (unlike the earlier style drafts, which were hand-built mockups). Every point's position, brightness, shadowing, and visibility is computed: equatorial equinox dusk (19,579 satellites visible vs 300 stars); 40°N June dusk (band displaced west — see below); 55°N June midnight (1,105 satellites visible all night); equatorial midnight (zero satellites — SSO below horizon, 30° shell fully eclipsed — 1,653 stars).

## Two things the model surfaced that the static figures couldn't

**Seasonal band displacement.** The report figures implicitly assume dusk finds the observer under the band. That's exact at the equinoxes. But at 40°N at the June solstice, sunset (local time ~19:40) comes almost two hours after the band's ~18:00 overpass — so at "30 minutes after sunset" the band sits well into the western sky, not through the zenith (model: 641 visible SSO satellites west of the meridian, 0 east). This is real solstice geometry, now locked in as acceptance test A3b, and it's exactly the kind of thing the sliders will let a reader discover.

**The white-night ceiling on the high-latitude story.** At 55°N on June 21 the sky reaches nautical darkness at midnight and ~700 SSO satellites are naked-eye visible all night. At 65°N, 14,457 satellites are sunlit and above the horizon at midnight — the astronomy-impact fact — but the civil-twilight sky (sun only −1.6°) hides all of them from the naked eye. "All-night illumination" and "all-night naked-eye visibility" peak at different latitudes; the simulator distinguishes them (test A5 encodes both).

## Validation against anchors

Against the conversation's calibration point (~2,600 satellites vs ~2,200 stars drawn at sunset+45): the model separates what that illustration merged. Geometrically ~37,800 satellites are above the horizon (the dawn–dusk concentration multiplies the uniform-shell footprint estimate — expected); photometrically ~21,500 beat the twilight naked-eye threshold vs ~1,120 stars, so "more satellites than stars" holds by a factor of ~19 rather than parity — the drawn figure showed a subsample against a dark-sky star count. Against the Starlink-scale external anchor (7,000 sats, 550 km, 53°, mitigated): the model gives ~70–106 visible at dusk — tens, not thousands, matching the qualitative record and confirming the pipeline isn't inflating counts. Mitigation at scale: for 1M satellites, full (+5 mag) mitigation cuts dusk visibility ~23× (62,066 → 2,727) but does not eliminate it — "reduce, not eliminate," as in the report caption.

## Deviations from plan

Four acceptance tests were re-specified during development — in every case because the model exposed correct physics the original test statement oversimplified (the two discoveries above, plus reframing "latitude independence" as an equinox cross-latitude comparison: visible counts 14.5k–19.3k from 0° to 55°, ratio 1.33). No model code was changed to make tests pass; the golden fixtures were frozen after these corrections.

## Next: Phase 2 (renderer)

Ready to start. One input still needed from you: **which draft style(s) for the v1 renderer — A (twilight photographic), B (planetarium chart), C (print light), or a combination?** (D, long-exposure, is deferred to v2 per your answer on the telescope mode.) Multiple styles are cheap to carry since they're just render calibrations over the same model.

---

## Preserved PHASE23_REPORT.md

# SBDC Night-Sky Simulator — Phase 2 & 3 Report

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Status: Phases 2 and 3 complete — the simulator is usable.** July 9, 2026 · All 48 automated tests passing, plus a headless browser smoke test of the built artifact.

## The deliverable

**`sbdc-sky-simulator.html`** — one 196 KB file, no installation, no network. Download it, double-click it, it runs (verified against a hard build assertion: zero active network references). Everything is inside: the physics model, the Style A renderer, the full Yale Bright Star Catalog, and the `sbdc-data.json` assumptions block, still isolated and replaceable as a single labeled `<script type="application/json">` element.

## What the app does

The sky renders in the chosen **Style A twilight-photographic** aesthetic: a background computed per-pixel from the model's twilight sky-brightness field (so the western glow is physics, not paint), satellites as smooth warm point-spread profiles with saturating cores and gentle skirts (no double rings), stars in cool white. Controls cover everything you specified: latitude, date (with live sunset/sunrise readout, including polar day/night), local solar time with quick jumps (Sunset / +30 / +60 / Midnight / Dawn−30) and a Play animation; constellation size on a log slider from 50,000 to 1,000,000 (default 300,000); the SSO / 30°-shell split; shell-altitude presets; the brightness-mitigation slider; launch trains (0–10); the eye/sky-quality limit; and the reproducibility seed with a randomize button.

The view is a draggable, scroll-zoomable horizon panorama (20°–140° field of view, compass readout), with an all-sky fisheye toggle — zenith at center, horizon at the rim, in proper astronomical orientation (east to the left, since you're looking up). Hovering any bright point identifies it: for a satellite, its family, altitude-azimuth, range, shell, and magnitude; for a star, its name (Sirius, Vega, Polaris…) and magnitude. The readout strip continuously reports sun depression, satellites above the horizon, sunlit, naked-eye visible, visible stars, and the brightest satellite with a plain-language anchor ("Venus-class", "brighter than Sirius"). **Save PNG** exports the current sky with the readout burned in — ready to paste into the report. **Assumptions & data** opens the audit table: all 43 parameters rendered live from the embedded data block with their units, sources, and confidence ratings, and the photometry caveat stated up front.

Two display aids worth knowing about: **Tint by orbit family** colors SSO vs 30°-shell vs launch-train points differently for analysis (off by default — Style A keeps everything warm and naturalistic), and **Show stars** can isolate the constellation alone.

## Verification

The suite grew to 48 tests: the 42 from Phase 1 plus 6 renderer tests (projection round-trips, fisheye orientation, color-ramp monotonicity, flux law). On top of that, a headless smoke test loads the *built* HTML in a simulated browser, boots it for real, drives the controls, and checks the outputs — the readouts it produces match the Phase 1 golden numbers exactly (equatorial equinox dusk: 19,579 visible satellites vs 300 stars; full mitigation drops it to 1,017), and screenshots of the app's actual canvas are captured for review (`app_screenshot_equator_dusk.png`, `app_screenshot_allsky.png`).

The smoke test caught one real bug during this phase: sprite sizes weren't rescaling with the fisheye view's much smaller pixels-per-degree, so the all-sky disk bloomed toward the over-exposed white blob you rejected in the report review. Fixed, and the smoke test now permanently asserts the fisheye center stays below an over-exposure threshold (it renders at 0.32 mean luminance, down from 0.81).

Performance at the extremes: generating a 1,000,000-satellite constellation takes ~250 ms (happens on slider release), re-evaluating the sky for a new time or latitude ~150–220 ms (throttled while dragging), and pan/zoom never recomputes physics — it redraws cached results, which is what keeps the interaction fluid.

## What remains (Phase 4 hygiene)

Cross-browser manual smoke (Chrome/Firefox/Safari — the headless test approximates but doesn't replace real browsers, particularly pointer/wheel feel and PNG download), a quick pass on a tablet, and the final README. One honest limitation to note: on phones the 300k default is heavy; the graceful path is lowering the satellite slider, which the spec anticipated. The long-exposure/telescope mode and additional languages remain deferred to v2 as agreed.

---

## Preserved PHASE4_REPORT.md

# SBDC Night-Sky Simulator — Phase 4 Report (project closure)

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Status: all planned phases complete.** July 9, 2026

## Phase 4 checklist

**Build & packaging.** `build.js` inlines CSS, both data blocks, and the three JS layers into one 200 KB file, asserting the size budget and zero active network references on every build. The final artifact is `sbdc-sky-simulator.html`; the auditable `sbdc-data.json` ships alongside as a readable sidecar, plus `README.md` and the full source tree.

**Validation against the built file.** The headless smoke test executes the *built* artifact (not the source) end to end, now across three layouts: desktop (1280×760), phone (390×430 — asserting a real canvas, a rendered non-black frame, and correct control-group collapse), and a pathological zero-height layout (asserting the size-guard fallback engages with no errors). Readouts from the built file match the Phase 1 golden fixtures exactly. The module script is additionally imported under Node's strict module mode on each verification run, which is what a real browser executes (the earlier jsdom-only path had masked this).

**Final validation numbers** (unchanged from Phase 1, re-run against the final build): equatorial dusk with 300k satellites → 21,525 naked-eye visible vs 1,120 stars at sunset+45; Starlink-scale sanity anchor → ~69–106 visible (tens, matching reality); 1M satellites → 62,066 visible unmitigated, 2,727 at full mitigation ("reduce, not eliminate").

**Remaining manual items** (documented in README, cannot be automated here): pointer/pinch feel on physical Safari/Chrome/Firefox; the Save PNG download flow inside app preview panes; performance on older phones.

## Mobile always-visible sky (this phase's feature request)

On screens under 900 px the sky is now **sticky at the top of the viewport (46% of screen height)** — it stays on screen no matter how far you scroll into the controls, so every slider movement is visible in real time. The three control groups (Observer, Constellation, Sky & display) became **tap-to-collapse accordions**: on a phone, only Observer starts expanded, keeping latitude/date/time and the sky together on one screen; the others are one tap away. On desktop everything stays expanded and the layout is unchanged. Supporting touches: larger slider hit-targets on mobile, pinch-to-zoom on the sky, orientation-change handling, and `prefers-reduced-motion` now slows the Play animation to gentle discrete steps.

The collapse behavior is asserted in the automated mobile smoke pass, so it can't regress silently.

## Final test status

48 automated tests (26 unit, 11 acceptance scenarios, 5 golden regressions, 6 renderer) + 3-layout headless smoke of the built artifact + strict-module execution check + external-anchor validation: **all passing**.

## Change log this phase

Collapsible control groups (native `<details>`, keyboard-accessible); sticky mobile sky; touch-target and header compaction on mobile; reduced-motion support in Play; smoke-test coverage for the collapse behavior; README; final packaging.

---

## Preserved FINAL_REPORT.md

# SBDC Night-Sky Simulator — Final Report

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Project complete through the v3 upgrade release.** July 18, 2026 · 59 automated tests + 3-layout headless smoke of the built artifact (incl. clustering, playback, and timelock passes) + strict-module execution check + external-anchor validation with flux conservation — all passing. Deliverable: `sbdc-sky-simulator.html`, 239 KB, fully offline. Sections below are the chronological record; the v3 release log at the end describes the current feature set.

## What was delivered, phase by phase

**Phase 1 — physics core.** Solar ephemeris with twilight and polar-day handling; constellation generator (SSO inclination from the J2 condition, LTAN spread, 30° shells, launch trains) in a sun-referenced frame that makes "the swarm rides the terminator while Earth turns beneath it" exact; conical Earth-shadow eclipsing; diffuse-sphere magnitude model with mitigation; the twilight sky-brightness → naked-eye limiting-magnitude chain; the real Yale Bright Star Catalog (9,096 stars). Ten acceptance scenarios written before any UI existed; golden-count regression fixtures under fixed seeds.

**Phases 2–3 — renderer and app.** Style A twilight-photographic renderer with a per-pixel physically driven sky background; draggable/zoomable horizon panorama plus all-sky fisheye; full control set (latitude, date, time with quick jumps and Play, 50k–1M satellites, family split, shells, mitigation, trains, eye/sky limit, seed); tooltips; readout strip; live-rendered assumptions audit table; PNG export. One real bug caught by the headless smoke (fisheye over-exposure from unscaled sprites) — fixed and permanently asserted against.

**Phase 4 — hardening and packaging.** The iPhone failure (mobile CSS collapsing the canvas to zero height, tripping Safari's zero-dimension canvas errors) fixed with a sticky always-visible sky, size-guard fallbacks, pinch zoom, an on-page error reporter, and three-layout smoke coverage (desktop / phone / pathological). Collapsible control groups keep the sky and the sliders on one phone screen together. Reduced-motion respected; build asserts size budget and zero network references.

**v2 items — implemented this phase.** *Long-exposure camera mode*: per-satellite velocities added to the generator (zero change to golden physics — verified), streak endpoints computed as 30-second chords, rendered as flux-spread trails with the star field deepened to the camera limit; streak lengths verified at 12–27° for low shells, matching the report's numbers, and streak structure confirmed by gradient-anisotropy analysis of the rendered frame. *French interface*: full EN/FR toggle covering every control, hint, readout, and tooltip (the assumptions table intentionally stays in English as the verbatim mirror of the data file). *Custom shell mixes*: `altitude:share` input with normalization and clamping to the filing's 500–2,000 km envelope, parser unit-tested. The only v2 candidate not implemented is live TLE overlays of real satellites, which inherently requires a network service and therefore contradicts the standalone requirement — documented as the served-version alternative in SPECIFICATION.md §6.

## Verification summary (as of v2 closure, July 9 — superseded by the v3 release log below)

51 tests: 29 model unit/property (ephemeris, transforms, generator, shadow, photometry, sky model, velocities, streaks, shell parser), 11 acceptance scenarios encoding the report's physical claims, 5 golden regressions, 6 renderer. Headless smoke boots the built file and exercises: five observer states with readouts matching golden numbers exactly; fisheye over-exposure guard; long-exposure mode (non-black frame + camera-mode readout); language round-trip EN→FR→EN; custom shells end to end; phone layout (real canvas, rendered frame, correct group collapse); collapsed-layout fallback. External anchors: Starlink-scale configuration yields tens of visible satellites (matches reality); 1M satellites at full mitigation drop from 62,066 to 2,727 visible — "reduce, not eliminate."

## Document map

`TUTORIAL.md` — user walkthrough with limitations and assumptions (start here). `README.md` — reference: usage, auditing the physics, developer commands, manual-check list. `SPECIFICATION.md` — requirements, with a closure addendum listing all deltas. `IMPLEMENTATION_PLAN.md` — the plan, marked complete. `PHASE1/PHASE23/PHASE4_REPORT.md` — historical phase records. `sbdc-data.json` — the auditable assumptions (53 rows in the rendered audit table as of v3, including the reference-brightness, clustering, and propagation entries). `UPGRADE_PLAN.md` — the reviewed and implemented v3 plan with the seven recorded review decisions.

## Remaining items (cannot be closed from here)

Only the manual real-device checks: pointer and pinch feel in physical Safari/Chrome/Firefox, the Save PNG download flow inside app preview panes (use "open in browser" if sandboxed), and performance on older phones (the satellite slider is the relief valve). Everything else is done.

## Post-release review changes

Five refinements after user review of the shipped artifact, all test-covered: **(1)** mitigation slider extended to +7 mag, with +5 relabeled "strong mitigation" (the demonstrated Starlink-class record) and +6–7 marked as beyond-demonstrated engineering — data file, hint text (EN/FR), and validation wording updated; **(2)** satellite slider lower bound extended down to 10,000; **(3)** rolling-hills ground silhouette in the horizon view (deterministic in azimuth, stable under panning — verified by boundary-variance analysis of rendered frames); **(4)** default orientation now faces north in both views, with the fisheye flipped from the astronomical looking-up mirror to map convention (east on the right) — projection, inverse, and orientation tests updated; **(5)** a labeled crosshair at the celestial pole (altitude = |latitude|, toward the visible pole) makes the sky's rotation center explicit, with a "Mark celestial pole" checkbox under Sky & display, on by default, translated in both languages. Test count: 52 + extended smoke. Golden physics fixtures unchanged.

## v3 upgrade release (July 18, 2026)

Five reviewed upgrades implemented (approved plan in UPGRADE_PLAN.md; semantics in SPECIFICATION.md §v3): direct **SBDC brightness** slider with anchors replacing mitigation (legacy golden values reproduced exactly under migrated states); **Advanced** control group; **dawn −60**, **twilight-locked time**, and dual playback — **Real time** with true orbital propagation (satellites sweep at 0.2–0.9°/s against near-still stars, verified ≥15× the stellar rate) and **Fast forward** with a shimmer toggle (default on, per review); and **hierarchical data-center clustering** (off by default, per review) with cluster-aware combined-magnitude visibility and an objects-vs-satellites readout. Headline physics from the new fixtures: the same 300k-satellite dusk sky collapses from ~19,600 scattered visible points to ~345 knots, the brightest at magnitude −7.9 — twenty times Venus; frame analysis shows 4,830 bright blobs becoming 97 knots. Population flux conserved to 0.05%; cluster-level night-to-night lumpiness identified and documented. Tests: 59 (from 52) plus new smoke passes; goldens regenerated once, schema-driven, legacy preservation verified programmatically.

## Post-v3 refinements (2026-07-20)

Four small reviewed changes: attribution ("Developed by Ken Novak and David Sandalow, draft for review 2026-07-20") added in the simulator's bottom-right corner, as the bottom line of every exported PNG, as a small-font subtitle on all nine documents, and as header comments in every source file; the twilight-lock label clarified to "Hold time relative to sunset/dawn as latitude changes" (EN and FR); the fast-forward shimmer toggle relocated to the Advanced group; and the time label simplified to "Local time" (the underlying clock remains local solar time, as the tutorial's limitations explain). All label changes carried through both languages, the smoke tests, and the documents.

---

## Preserved UPGRADE_PLAN.md

# SBDC Night-Sky Simulator — Upgrade Plan (v3)

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Status: APPROVED AND IMPLEMENTED.** July 18, 2026 · Review answers: (1) brightness semantics approved; (2) clustering **off** by default; (3) 100 sats / 1 km defaults confirmed; (4) derived cluster count + inherited distribution confirmed; (5) twilight-lock behavior approved; (6) fast-forward motion behind a **shimmer checkbox, default on**; (7) Advanced group contents as proposed.

This plan evaluates the five requested upgrades, proposes designs, and lays out implementation phases with the documentation updates and test expansion built into each. Open questions for review are collected at the end.

---

## Evaluation of the five requests

### 1. "Brightness" slider replacing "Brightness mitigation" — sound, with one definitional subtlety

The current design (hidden baseline distribution + mitigation offset) buries the most-challenged assumption two layers deep. Exposing brightness directly is a genuine auditability improvement. The subtlety: *apparent* magnitude varies per satellite with range, phase angle, and extinction, so one number cannot literally be every satellite's apparent magnitude. **Proposed definition:** the slider sets the **reference brightness** — the median satellite magnitude at a standard condition (1,000 km range, 90° phase, zenith), range **−7 to +7**. The population keeps its ±1.3-mag scatter (satellites differ in size/attitude/albedo); range, phase, and extinction then vary each satellite around that, exactly as now. Mitigation is reframed as *interpretation*, not mechanism: the slider gains labeled anchors — **+0.5 "unmitigated large platform"** (the report-annex envelope, and the proposed default so all published figures remain reproducible), **≈ +5.5 "strong mitigation (Starlink-style darkening record)"**, **+7 "IAU recommendation"** — with a hint explaining that darkening coatings and attitude control are the engineering that moves a design along this scale. −7 (≈ 60× Venus at reference) is retained as an exploration bound, flagged in the data file as beyond any plausible design.

Internals: `state.brightnessRefMag` replaces `state.mitigationMag`; generation stores each satellite's *deviation* from the reference, so moving the slider stays evaluation-cheap (no constellation rebuild). **This changes the state schema → golden fixtures will be regenerated intentionally, with an equivalence test proving the default reproduces today's default population exactly.**

### 2. Advanced settings group — straightforward

New fourth collapsible group **Advanced**, collapsed by default on all screen sizes, containing Seed + Randomize, Tint by orbit family, and Mark celestial pole — plus (proposed) the cluster-*variation* sliders from item 5, which are exactly the kind of second-order knob that belongs there. Mobile boot logic and the group-collapse smoke assertions update from 3 groups to 4.

### 3. Local solar time — the easy parts, plus one that reaches into the physics core

**Dawn −60** button: trivial. **Twilight-locked time:** a checkbox — *"Hold time relative to sunset/dawn"*. When on, the app stores the current time as an offset from its nearest twilight reference (sunset or dawn); changing latitude or date then recomputes the clock so "sunset + 30 min" stays sunset + 30 min at the new location. Dragging the time slider while locked re-anchors at the new offset. Polar day/night (no sunset exists): fall back to absolute time with a brief hint, lock resumes when a sunset exists again.

**Two playback modes** — here is the buried technical issue: the model is currently a *statistical snapshot*. Satellites never move along their orbits; advancing time only rotates the frame, so in a naive "real time" mode satellites would drift with the stars at 15 arcsec/s — precisely failing the stated goal. Real-time play therefore requires **orbital propagation**: each satellite advances along its circular orbit analytically from its stored position and velocity (`P(τ) = P·cos nτ + rV̂·sin nτ` — two trig calls per satellite, cheap even at 1M). With that in place: **▶ Real time** advances simulated time at wall-clock speed with re-evaluation at ~3 Hz (adaptive, lower on phones), and satellites visibly cross the sky at their true 0.4–0.9°/s while the stars sit almost still — the exact contrast requested. **▶▶ Fast forward** keeps today's accelerated sweep; satellites shimmer statistically (they cross the sky many times per tick), which is honest. Propagation defaults to τ = 0, so all existing golden fixtures and published figures are untouched. New physics tests: radius conservation under propagation, full-period return, overhead angular rate in the 0.4–0.9°/s window, and the headline integration test — over 10 s of real time, median satellite displacement ≥ 3° while star displacement ≤ 0.05°.

### 4 & 5. Hierarchical clustering — the most consequential change, and worth doing carefully

**Physics evaluation: plausible and illuminating.** Tight clusters serve the architecture the FCC filing emphasizes (high-bandwidth optical intra-links for compute traffic; longer links between clusters and to Starlink relays), though the filing itself is silent on clustering — this enters the data file as a new *assumed* section with that motivation stated. The ground-view consequences are dramatic and the additive renderer already does half the work: a 1-km cluster at 600 km range subtends ~6 arcmin (1–2 pixels at default zoom), so members blend into a single knot *automatically* at the pixel level. The part that needs real modeling is **visibility**: 100 satellites of magnitude 6 (each individually invisible) sum to magnitude 1 — a prominent object. Per-satellite visibility testing would wrongly hide such clusters, so the model gains cluster-aware aggregation: combined magnitude m꜀ = −2.5·log₁₀ Σ10^(−0.4mᵢ) over sunlit above-horizon members, flux-weighted centroid position, and angular extent. The readout distinguishes **visible objects** (what the eye counts — knots plus singles) from **visible satellites** (what they contain); tooltips on a knot report members, extent, and combined magnitude. Streak mode inherits correctly (parallel close trails).

**Generator design:** cluster *centers* are placed by the existing shell/plane/anomaly machinery — so the constellation stays distributed across planes and around Earth exactly as now, and the "number and orbital distribution of clusters" (item 5's last bullet) is inherited from the existing family/shell controls rather than duplicated. Members are strewn around each center with along-track spacing plus small cross-track/radial offsets. Parameters (new `clustering` section of the data file, every value confidence-tagged):

| Parameter | Proposed control | Proposed default |
|---|---|---|
| Clustering on/off | Constellation group, checkbox | **open question** |
| Satellites per cluster (typical) | Constellation group, log slider 10–1,000 | 100 |
| Cluster diameter (typical) | Constellation group, slider 0.2–10 km | 1 km |
| Membership variation (lognormal σ) | Advanced group | 0.35 |
| Diameter/density variation (lognormal σ) | Advanced group | 0.35 |
| Cluster count | derived = total ÷ per-cluster, displayed live | — |

One physical note recorded in the data file: members at slightly different radii shear apart slowly (~1 km per 10 min at 1-km radial spread); real clusters would station-keep, and the model treats clusters as rigid over display timescales.

**Test expansion for clustering:** generator statistics (member counts and diameters match the configured lognormals; members share their center's plane and shell); flux conservation (clustered vs unclustered total flux identical for the same population); combined-magnitude math against hand-computed cases; the invisible-members/visible-knot scenario as an acceptance test; angular-extent geometry (1 km @ 600 km ≈ 5.7′); band-geometry scenarios A1–A10 re-run in clustered mode (large-scale distribution must be statistically unchanged); new golden fixtures for two clustered states alongside the retained unclustered ones; smoke coverage for the new controls and the objects-vs-satellites readout.

## Implementation phases

**U1 — Brightness refactor** (model + data + UI + i18n; goldens regenerated with change note; equivalence test). **U2 — Advanced group** (UI + mobile collapse + smoke updates). **U3 — Time controls** (dawn −60, twilight lock, orbital propagation, dual play modes; new physics tests). **U4 — Clustering model** (generator, aggregation, visibility, counts API; the largest test batch). **U5 — Clustering UI & rendering** (controls, knot tooltips, objects-vs-satellites readout, both view modes, streak mode check). **U6 — Documentation, validation, packaging** (below). Order: U2 first (Advanced group must exist before U1's relocated pieces and U5's variation sliders land in it), then U1, U3, U4, U5, U6. Estimated effort split: U4+U5 ≈ half the work.

## Documentation updates (integrated, not an afterthought)

`sbdc-data.json`: brightness anchors replace the mitigation entry; new clustering section; propagation and station-keeping notes — every value confidence-tagged as usual. `SPECIFICATION.md`: a "v3 upgrades" section specifying the brightness semantics, playback modes, and clustering model, plus addendum updates. `TUTORIAL.md`: rewritten brightness explanation (anchors instead of mitigation), the real-time-vs-fast-forward experiment, a new "clusters" walkthrough (why knots, objects vs satellites), updated control map. `README.md`: feature list, control groups, updated developer test counts. `FINAL_REPORT.md`: v3 change log. Both languages for every new UI string. `tools/validate.mjs`: re-anchor the Starlink sanity check under the new brightness semantics; add a clustered-vs-unclustered flux-conservation validation line.

## Risks

Golden regeneration (U1) is deliberate schema-driven churn — mitigated by the equivalence test and an explicit change-log entry. Real-time re-evaluation at 1M satellites on phones may not hold 3 Hz — mitigated by adaptive cadence and a hint suggesting lower counts. Cluster-aware visibility is the most intricate logic (double-counting risk between object and satellite tallies) — mitigated by conservation tests written before the implementation, per the project's usual order.

---

## Open questions before implementation

1. **Brightness semantics and default.** Confirm: slider = median magnitude at the 1,000 km / 90°-phase / zenith reference, population scatter retained, default +0.5 so every published figure stays reproducible, with the three labeled anchors (unmitigated / strong mitigation / IAU +7)?
2. **Clustering default state.** On or off when the file opens? *Off* preserves continuity with the report's published figures; *on* leads with the new hypothesis. My recommendation: off by default, with the tutorial pointing straight at the toggle.
3. **Cluster defaults.** 100 satellites per cluster, 1 km typical diameter — acceptable starting values?
4. **Cluster count and distribution.** Agreed that cluster *count* is derived (total ÷ per-cluster, displayed) and cluster *distribution* is inherited from the existing shell/family controls rather than adding a separate control?
5. **Twilight-lock behavior.** Checkbox as described; slider-drag while locked re-anchors at the new offset; polar day/night falls back to absolute time. Any changes?
6. **Fast-forward motion.** With propagation in place, fast-forward will show satellites shimmering through the band (physically honest). Prefer that, or freeze along-track motion in fast-forward (today's calmer look)?
7. **Advanced group contents.** Seed, Tint, Celestial pole, plus the two cluster-variation sliders — anything else you'd like moved there (e.g., the eye/sky-quality limit)?
