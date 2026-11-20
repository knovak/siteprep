# SBDC beta: implementation and verification

**20 November 2026 · Beta only.** The [audit](beta-audit-2026-11-20.md) records what users saw on the published version. This record covers the changes proposed for merge. Use the simulator to compare scenarios. Neither a synthetic satellite population nor agreement with a dark-sky measurement establishes how bright an actual constellation would be.

| Package / audit ranks | Change | Evidence |
| --- | --- | --- |
| **A · Correct the claims** (1, 2, 9, 10) | Count an unresolved group once in the picture, field of view, chart and significance rows. Keep member inventory and camera trails separate. Remove the +7 compliance cue. Explain the camera selection and whole-sky flux. | A June 21 fixture has **3 points, 300 satellites and 44 stars**: neither count threshold is met. The UI and keyboard chart show both units in English and French. Crossing camera segments no longer disappear simply because both endpoints are outside. The validation script prints actual counts, including **425** in the faint 1M scenario. |
| **B · Protect results and inputs** (3, 4) | Reuse the frame’s evaluated sky and stars. Move night and year analysis to a cancellable offline worker using the same model. Label each completed column from its captured observer; mark only affected results stale. | A browser test moves from 40°N to 15°N after annual progress begins. The retained result says 40°N, is marked stale, and matches a fresh 40°N calculation in every row. Cancelling a replacement preserves the prior result. Timing below. |
| **C · Expose the answer** (5, 6, 11) | Put in-view and whole-sky totals and the aim action together; allow details to wrap. Restrict sky shortcuts to the focused canvas. Use a native modal, a keyboard chart-time slider and a text equivalent of its sampled values. | Opening view: **2 of 546 objects** and **0 of 2 stars** in view. Chromium checked English and French at 320 and 390 px and at 200% CSS zoom in a 640 px viewport. Keyboard checks cover Space, Tab, Shift+Tab, Escape and chart navigation. WebKit 26 at 390 px completed the night calculation from a local file, switched language and closed the dialog. Real-device acceptance remains open. |
| **D · Qualify estimates** (7, 8, 10, 11) | Advance the model date at midnight, including New Year. Compare the unrounded summed flux using strict `>`. Put time steps, thinning and annual weighting beside results. Add an observational fixture. Save a build identifier and settings reference in the PNG caption and embed the YAML, exact solar hours and orbit propagation time in PNG metadata. | Model tests cover midnight, polar conditions and ratios just above, at and below unity. The browser test checks the decoded PNG metadata against the separately exported settings. The published build supplies the channel label; an unstamped offline build identifies itself as standalone. |

## Responsiveness

The published beta blocked the main thread for **3,409 ms** in the audit’s 4× CPU profile. On the revised standalone build, Chromium 143 at 390 × 844, nominal 300k satellites, five cancellation trials took **27, 30, 31, 32 and 31 ms** from the scheduled input to a painted acknowledgement (target: under 200 ms). Each trial scheduled Cancel for 50 ms after starting the night calculation, so a blocked main thread counts against the result. One uninterrupted night took **1.38 s** with no main-thread task reported at or above the browser’s 50 ms threshold. These are local emulation results; they do not measure touch latency on a physical phone.

## Sampling sensitivity

Each cell gives minutes satisfying **at least 100 visible objects / more objects than stars / satellite flux greater than sky flux**. Each row uses the same simulated population across all four columns: nominal 300k plus the default launch train, reference magnitude +0.5, eye limit 6, Moon off. Columns 1 and 2 use the annual and nightly sampling methods on **one night**; columns 2→3 isolate population sampling, and 3→4 isolate time resolution. The full simulation is a numerical reference, not an observation.

| Observer / evening / seed | ~30k, 15 min | ~100k, 5 min | Full, 5 min | Full, 2.5 min |
| --- | ---: | ---: | ---: | ---: |
| 40°N · Jun 21 · 12345 · independent | 495 / 315 / 75 | 500 / 315 / 75 | 500 / 315 / 55 | 500 / 315 / 57.5 |
| 30°S · Dec 21 · 54321 · independent | 585 / 345 / 225 | 575 / 360 / 245 | 575 / 345 / 235 | 577.5 / 350 / 235 |
| 40°N · Mar 20 · 54321 · compact groups | 330 / 90 / 135 | 335 / 95 / 150 | 340 / 95 / 145 | 342.5 / 97.5 / 142.5 |

In the June case, changing only the population sample shifts the flux result by **20 minutes**; halving the full-population time step shifts it by **2.5 minutes**. The direction and size differ by scenario. These cases do not bound the error of 24 equally weighted nights used to estimate a 365-day year. The model calendar omits February 29; the dated Moon uses solar time as a proxy for UT and does not use observer longitude.

## Independent observational check

[Patat (2008), section 3 and Table 3](https://arxiv.org/pdf/0801.2270) reports **21.71 mag/arcsec²**, RMS **0.24**, from **692** dark-time, zenith-corrected V-band measurements at Cerro Paranal. Compare the simulator’s moonless, unpolluted zenith well after twilight: **21.90 mag/arcsec²**, **0.19 mag fainter** than the observed mean. The regression accepts a difference within one observed RMS; that scatter is neither uncertainty of the mean nor a forecast error bar. This checks one background component only. It does not validate satellite brightness, cluster resolvability, individual trails or annual hours.

## Reproduce and decide

- **Repeat the checks:** From the beta directory, `npm test`, `npm run validate`, and `node tools/sensitivity.mjs`. With the repository’s locked browser dependencies installed, `node build.js && node tools/response-check.mjs` repeats the slowdown experiment. After the repository build, run `npm test -- tests/e2e/sbdc-beta.spec.js --project=chromium` from the repository root. Verification: **153 model, rendering and settings tests; 30 Chromium browser tests**.
- **P1 · Accessibility acceptance:** On a physical phone, use VoiceOver or TalkBack to read both counts, aim, enter and leave Assumptions, select a chart sample, and cancel analysis. Record device, browser, language, focus order and any delay. Automated focus and reflow checks do not substitute for this session.
- **P2 · Before citing estimates externally:** Have a domain reviewer assess reference magnitude, scattering, the cluster resolution limit and whether 24 nights suffice for the intended claim. Publish the settings, seed, build, and sensitivity alongside any quoted hours. More seeds or a measured satellite light curve can address questions this background fixture cannot.
- **Publication:** Merging this PR updates the beta through the normal build. It does not authorize or perform a production release. The initiative remains dormant and this work does not change the separate mobile sticky-sky decision.
