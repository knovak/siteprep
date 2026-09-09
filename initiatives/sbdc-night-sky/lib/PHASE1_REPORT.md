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
