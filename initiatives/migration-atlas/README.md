# World Migration Atlas initiative

This initiative adopts the working atlas from `demos/world_migration_atlas/` without changing its application files. The entry page is `work/index.html`; `work/dist/migration-atlas.html` is the original self-contained offline artifact. Open either locally in a browser. Do not open `work/src/index.html` as the app: it is the original development shell, whose companion JavaScript and build tools were not present in the repository demo.

## Documents and history

- [Wish and original prompt history](wish.md)
- [Objectives and adoption acceptance](objectives.md)
- [Specification](spec.md) — supplied `SPECIFICATION.md`, unchanged
- [Implementation plan](plan.md) — supplied `IMPLEMENTATION_PLAN.md`, unchanged
- [Test plan](test-plan.md) — inherited gates and adoption verification
- [Decisions](decisions.md) and [log](log.md)
- [Provenance and file inventory](notes.md)

The original [tutorial slideshow](https://docs.google.com/presentation/d/1vz00gVdnHLOoDSidRLFgxo-UEWw4NLPZ/edit?usp=drivesdk&ouid=111064312747417346604&rtpof=true&sd=true) and [tutorial PDF](https://drive.google.com/file/d/1PYjSLdRR1BZqGvhX4xSr-tbhfGU4liV6/view?usp=drivesdk) remain linked from the demo collection. These links are carried over from its existing metadata; this adoption does not revise the tutorials.

## Test and production

From the repository root, use `node scripts/initiatives.mjs deployments migration-atlas plan --env test --json` to obtain both current URLs. Invoke `deploy-test` to push the initiative source preview. The repository build copies `work/` to `preview/initiatives/migration-atlas/` under the current branch's Pages build; publication completes after the branch workflow finishes.

Production remains [the existing demo](../../demos/world_migration_atlas/index.html). After user testing and a separate release instruction, use `release-initiative`; it is the workflow that copies the committed source to `demos/world_migration_atlas/`. No production deployment is part of adoption.

## Scope of the preserved README

The supplied README is reproduced in full below, including its feature descriptions, extension history, test-result table, contribution instructions, and layout. Its relative code paths refer to the original development package, not the initiative root. In this adoption, the files actually present live under `work/`; see [the inventory](notes.md).

In particular, the README's `src/core.js`, `src/app.js`, `tools/build.py`, and `tests/` are absent from the repository demo. Its build and test commands are retained as historical instructions and cannot currently be run from this snapshot. Drag-and-drop of a dataset can still preview research in the running app; making permanent data changes requires the original build package or separate authorized maintenance. The original test numbers below are July 2026 reports, not newly verified results.

---

## Supplied README — preserved in full

# World Migration Atlas — complete build + extensions (Ocean Blueprint)

**To run:** double-click `dist/migration-atlas.html`. One self-contained 1.25 MB
file — no server, no internet, no installation. Tested on Chromium, Firefox,
and WebKit engines.

## What's implemented — all phases of the plan

**Phase 0 — data foundation.** `data/migrations.json` is the single source of
truth (48 migrations). `validateData()` in `src/core.js` enforces the schema
and is shared by the test gate and the in-app loader, so contributors see the
same errors everywhere.

**Phase 1 — map.** Equal Earth projection; bundled Natural Earth basemap with
LOD (110m world view, 50m past 3× zoom); free geo-anchored pan with horizontal
world rotation (no boundaries); cursor-anchored wheel/pinch/double-click zoom,
0.7×–40×. Flows are tapered great-circle ribbons, width ∝ √(people moved);
residual diaspora circles, area ∝ present-day population; dashed edges mark
low-confidence estimates and fading (ended) flows.

**Phase 2 — time.** 1000–2026 timeline; adaptive piecewise clock
(10/4/2 yr/s) with linear toggle; play/pause, 0.5×–8×, ±1-year steps,
prev/next-event jumps, scrubber with era-density histogram, type-a-year.
Arcs rise over ~3 years and fade over ~5; rendering is a pure function of
(data, year, camera), so scrubbing backward reproduces identical frames.

**Phase 3 — interaction.** Hover any arrow or circle for a tooltip; click for
the full detail panel: cause, counts with ranges and caveats, per-destination
settled/diaspora figures, confidence badge, and the sources. "Focus on this
migration" flies the camera to it and constrains playback to its period (chip
to clear). Filters: type, source region, minimum size, and text search. Toggle
arrow coloring between source region and migration type. An accessible data
table lists all 48 entries (click a row to open + focus). "About the data"
documents caveats, keyboard shortcuts, and how to contribute.

**Phase 4 — packaging.** Single-file build (`tools/build.py`); URL-fragment
permalinks encode year, camera, color mode, and selection (work from file://);
drag-and-drop a modified `migrations.json` onto the window to load it after
validation — instant preview of new research without rebuilding.

**Extensions E1–E3 (2026-07-05).** The legend is now hidden by default and
toggled with the Legend button (state travels in permalinks as `lg=1`).
Color-by-type uses a coercion spectrum — blue = most voluntary through red =
most coerced, in the canonical order voluntary-economic → colonial-settlement
→ conquest-migration → religious → indentured-labor → refugee-flight →
internal-forced → forced-expulsion → forced-enslavement — with the legend and
filter checkboxes presented in that order. Residual diaspora circles render
vividly in the color of the flow that created them under the active color
mode, and recolor instantly when the mode switches. Requirements and the
implementation plan for these live in SPECIFICATION.md and
IMPLEMENTATION_PLAN.md (extension sections).

**Extensions E4–E7 (2026-07-06).** Hardened for sandboxed WebViews (the
Claude iOS viewer denies `history.replaceState` and throws on
`setPointerCapture` for released touch pointers — both now guarded, with
permalink writing disabled gracefully on first denial). Color-by-type is the
default mode. Region colors follow a geographic spectrum — continents
contiguous in hue, sweeping west→east from N America deep blue and Latin
America sky blue through European greens, MENA gold, Sub-Saharan brown, and
Asian orange/red/crimson to SE Asia violet. The layout adapts by capability
and geometry (not user-agent): ≥40px touch targets on coarse pointers, a
wrapped timebar with full-width scrubber on narrow screens, a slim compact
bar on short (landscape-phone) screens, and iOS safe-area support. Options
considered and rationale are in IMPLEMENTATION_PLAN.md §E4–E7.

**Phase 5 — content workflow.** Four entries added purely through the data
pipeline to prove it: Highland Clearances, Korean migration under Japanese
rule, Lebanese (Mount Lebanon) emigration, Cuban exodus. Editorial standards
in `tests/T8_editorial_checklist.md`.

## Test results (this build)

| Gate | Result |
|---|---|
| T1+T2 data & unit incl. both spectrum properties (node) | 535/535 |
| T3 visual regression (8 golden states incl. reduced-motion & type-legend) | 16/16 |
| T4 interaction battery incl. E1–E7 gates (hostile-WebView + responsive emulation) | 64/64 |
| T5 performance | mean frame 16.5ms, p95 <33ms @1890s; first render <2s; bundle 1.25MB ≤3.5MB; heap growth <5% over 3 timeline sweeps |
| T6 accessibility (axe-core) | 0 serious/critical on main, table, filter views |
| T7 cross-browser (Chromium/Firefox/WebKit) | 24/24 |
| T8 editorial | checklist applied to all new entries |

Run them: `node tests/test_core.mjs` · `python3 tests/test_browser.py`
(`--update-goldens` to re-baseline) · `python3 tests/test_crossbrowser.py`.
Browser suites need `pip install playwright` + `playwright install`.

## Adding a migration

1. Append an object to `data/migrations.json` (copy any entry as template).
2. Preview instantly: drag the file onto the running app.
3. Make permanent: `node tests/test_core.mjs && python3 tools/build.py`.
4. Apply `tests/T8_editorial_checklist.md`.

## Repo layout

    dist/migration-atlas.html      ← the app (open this)
    src/{index.html, core.js, app.js}
    data/migrations.json           ← edit this to add research
    data/basemap/{land110,land50}.json
    tools/build.py
    tests/{test_core.mjs, test_browser.py, test_crossbrowser.py,
           T8_editorial_checklist.md, goldens/, axe.min.js}
