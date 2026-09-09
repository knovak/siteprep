# SBDC Night-Sky Simulator

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

An interactive, physics-based simulation of how a very large constellation of space-based data centers (SBDCs) would appear in the sky — from any latitude, on any date, at any time of day. Built to accompany the SBDC report; scenario grounded in the January 30, 2026 FCC filing (up to 1,000,000 satellites, 500–2,000 km, Sun-synchronous and 30°-inclination shells).

## Using it

Open **`sbdc-sky-simulator.html`** in any modern browser. It is a single self-contained file: no installation, no internet connection, nothing else to download. On a phone, the sky stays pinned at the top of the screen while the controls scroll and collapse beneath it, so every slider change is visible immediately.

**Looking around:** the default view faces north, with east on the right like a map; drag to pan, scroll or pinch to zoom (20°–140° field of view), or switch to the all-sky fisheye (zenith at center, horizon at the rim, north up, east right). A small labeled crosshair marks the celestial pole — the point the whole sky rotates around (altitude equals your latitude); switch it off under Sky & display. Hover or tap a bright point to identify it — satellites report family, range, shell, and magnitude; stars report their names. Keyboard: arrows pan, `+`/`−` zoom, space toggles Play.

**Controls:** latitude, date (sunset/sunrise shown live, including polar day/night), and local solar time with quick jumps (Sunset, +30, +60, Midnight, Dawn−30) and a Play animation. Constellation size runs 10,000–1,000,000 (default 300,000, the report's "several hundred thousand"); further sliders set the SSO/30°-shell split, shell-altitude preset, the **SBDC brightness** reference (−7 to +7 mag, anchors at +0.5 unmitigated / +5.5 strong mitigation / +7 IAU target), recent launch trains, and the eye/sky-quality limit. **Data-center clustering** (v3, off by default) packs satellites into tight formations; the readout then counts visible *objects* versus the satellites they contain. Playback offers **Real time** (true orbital propagation — satellites traverse the sky against near-still stars) and **Fast forward** with a shimmer toggle; a **twilight lock** holds sunset/dawn-relative time across latitude and date changes. Seed, tint, pole marker, the fast-forward shimmer toggle, and cluster-variation dials live in the **Advanced** group. Every view and exported PNG carries the attribution line. The seed makes every rendered sky exactly reproducible.

**Save PNG** exports the current view with the readout burned in — report-ready. The readout strip always shows sun depression, satellites above the horizon / sunlit / naked-eye visible, visible stars, and the brightest satellite with a plain-language anchor.

**Long-exposure camera mode** (Sky & display) renders the astronomy-impact view: one 30-second exposure in which every sunlit satellite becomes a 12–27° streak and the star field deepens to the full catalog. **Custom shell mixes** can be typed as `altitude:share` pairs under Shell altitudes → Custom. The **FR** button switches the interface to French (the assumptions table stays in English, mirroring the data file verbatim). See `TUTORIAL.md` for a guided walkthrough and the user-relevant limitations.

## Auditing the physics

Click **Assumptions & data**. Every constant the simulation uses — 43 parameters — is listed with its value, units, source, and a confidence rating (measured / published / modeled / assumed). The photometry section is deliberately flagged as the least certain: the FCC filing gives no satellite sizes or albedos, so the magnitude distribution is calibrated to the report annex's −2 to +4 envelope. The renders are illustrative, not photometric predictions.

To change an assumption, edit the `<script type="application/json" id="sbdc-data">` block inside the HTML file (or `data/sbdc-data.json` in the source tree and rebuild). No code changes are needed — the model reads everything from that block.

Documented simplifications: spherical Earth, no atmospheric refraction (~0.5° at the horizon), circular orbits, local solar time as the clock (longitude therefore irrelevant), no Moon, penumbra ignored. None materially affect the questions the tool answers.

## For developers

```
npm test                 # 59 unit + acceptance + golden-regression tests
node build.js            # inline everything -> dist/sbdc-sky-simulator.html
node test/smoke-browser.mjs  # boots the BUILT file headlessly, 3 layouts
node tools/validate.mjs  # credibility checks vs external anchors
node tools/make-golden.mjs   # refreeze golden fixtures (intentional changes only)
```

Layout: `data/` (assumptions + Yale Bright Star Catalog, 9,096 stars), `src/model.js` (pure physics — the tested core), `src/render.js` (Style A twilight-photographic renderer), `src/ui.js`, `build.js`. Node is used only for tests and the build; the artifact itself has zero dependencies.

## Manual checks before wide distribution

Automated coverage is strong (the headless smoke test boots the real built file at desktop, phone, and pathological layouts), but three things only real devices confirm: pointer/pinch feel in Safari, Chrome, and Firefox; the Save PNG download flow (in-app preview panes sometimes sandbox downloads — use "open in browser" if it fails); and performance on older phones, where lowering the satellite slider is the intended relief valve.

## v2 status

Long-exposure/telescope streak mode: **implemented**. Second language (French): **implemented**. Live TLE overlays of real tracked satellites: **not implemented by design** — it inherently requires network access, which contradicts the standalone requirement; the served-version trade-off is documented in SPECIFICATION.md §6 and the architecture (data + pure model + UI) ports without rework if it is ever wanted.
