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
