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
