# World Migration Atlas — Implementation Plan

Version 0.1 — July 2026

---

## 1. Architecture decision

**Recommended stack: a single-page web application, D3.js + HTML5 Canvas, no server required.**

Rationale, weighed against the alternatives:

| Option | Verdict |
|--------|---------|
| **D3 + Canvas (chosen)** | D3 provides projections (Equal Earth), great-circle interpolation, zoom/pan behavior, and time scales natively. Canvas handles hundreds of animated arcs at 60 fps where SVG chokes past ~100 animated paths. Zero runtime dependencies on servers or tiles: the basemap is bundled TopoJSON (~250 KB for 110m, ~800 KB for 50m). |
| Leaflet / MapLibre + deck.gl | Superb for slippy-map UX and WebGL scale, but built around tile servers; offline vector tiles add a build pipeline (tippecanoe, PMTiles) and MB of assets for detail we don't need. Worth revisiting only if street-level zoom becomes a requirement. |
| Desktop app (Electron/Tauri) | Solves the file:// problem elegantly and gives a double-clickable local product, but adds packaging burden. Offered as an optional wrapper in Phase 5, not the core. |
| Python (Plotly/Bokeh) | Fast to prototype, but animation smoothness and free-pan cartography are much weaker. Used only for the data-validation toolchain. |

**Repository layout**

```
migration-atlas/
├── index.html              # single entry point; app shell
├── src/
│   ├── main.js             # bootstrapping, state store
│   ├── data.js             # load + validate migrations.json
│   ├── time.js             # clock, piecewise time scale, playback
│   ├── projection.js       # Equal Earth, world-wrap, zoom camera
│   ├── layers/
│   │   ├── basemap.js      # land/coast rendering, LOD swap
│   │   ├── flows.js        # arcs, particles, fades
│   │   └── residuals.js    # diaspora circles
│   ├── ui/                 # timeline, filters, detail panel, legend
│   └── a11y/table-view.js  # accessible data table
├── data/
│   ├── migrations.json     # THE dataset — the only file editors touch
│   ├── schema.json         # JSON Schema for validation
│   └── basemap/            # ne_110m + ne_50m TopoJSON (bundled)
├── tools/
│   └── validate.py         # schema + semantic checks, run in CI and locally
├── tests/                  # see §4
└── dist/                   # single-file build output (see §2, Phase 4)
```

**State model.** One immutable app-state object `{year, playing, speed, camera:{x,y,k}, filters, selection}`; every frame is a pure render of (dataset, state). This determinism is what makes scrubbing backward exact and makes visual regression testing possible.

## 2. Phased build

**Phase 0 — Data foundation (week 1).**
Finalize `schema.json`; write `tools/validate.py` (schema conformance + semantic rules from the spec §3 + coordinate sanity: every source/destination point must fall within 300 km of land or be flagged); wire it into a GitHub Action so a bad edit to `migrations.json` fails the PR. Deliverable: green validation on the initial 44-entry dataset. *This phase is deliberately first — the promise that "new research = one JSON edit" is only safe if validation is airtight before any rendering exists.*

**Phase 1 — Static map (week 2).**
Equal Earth projection, bundled basemap, free pan/zoom with horizontal world wrap and inertia, LOD swap at zoom > 3. Render all migrations for a fixed year as static arcs + circles with the √ scaling and region palette. Deliverable: a frozen 1850 snapshot that matches the chosen draft style.

**Phase 2 — Time (week 3).**
Clock with piecewise speed, play/pause/step/scrub, era-density histogram under the scrubber, arc grow-in/fade-out envelopes, residual circle growth curves. Deliverable: full 1000→2026 playback, deterministic in both directions.

**Phase 3 — Interaction & polish (weeks 4–5).**
Hover/click hit-testing on Canvas (color-picking buffer), detail panel with references and uncertainty display, filters, search, "focus on migration" camera+timeline constraint, legend, reduced-motion mode, keyboard map, accessible table view, About-the-data page.

**Phase 4 — Packaging (week 6).**
Build step (esbuild/Vite) emitting `dist/migration-atlas.html` — a **single self-contained HTML file** with code, basemap, and dataset inlined. This sidesteps the one genuine local-file obstacle: browsers block `fetch()` of sibling files under `file://` (CORS), so a multi-file build needs `python -m http.server`; a single inlined file just double-clicks open. Both outputs are produced: the single file for distribution, the multi-file dev layout for editing. Optional: a Tauri wrapper for a native app feel.

**Phase 5 — Content iteration (ongoing).**
Add movements as research lands (e.g., splitting the European Mass Migration into national streams, adding the Highland Clearances, Korean diaspora, Lebanese diaspora, Italian internal north-south migration). Each addition is a JSON PR gated by Phase-0 validation.

## 3. Local vs. online server — the honest comparison

**Local-first (recommended, and what this plan builds):** everything above runs from one HTML file with no network access at all. Reasons to prefer it: privacy, permanence (no dependency rot or dead endpoints), works on a plane, trivially shareable as an email attachment, and the dataset is small enough (tens of KB) that a server buys nothing for data delivery.

**Reasons a server version could be preferred — offered as an alternative, not the default:**
1. *Basemap richness.* Street/terrain detail at high zoom needs a tile server (or very large bundled PMTiles). Only relevant if city-level storytelling becomes a goal.
2. *Live dataset.* A hosted JSON endpoint would let every user see new migrations without redistributing the file. Mitigation in local mode: the app accepts drag-and-drop of an updated `migrations.json`.
3. *Collaboration.* Multi-editor curation with review queues implies a backend (or simply GitHub, which provides this for free with the repo model above — the middle path: static hosting on GitHub Pages, data edited by PR, no custom server).
4. *Analytics & sharing.* Shareable permalinks encoding {year, camera, selection} work locally via URL fragments, but link unfurls/social cards need hosting.
5. *Very large future datasets* (e.g., per-decade county-level flows, 100K+ records) would justify a vector-tile pipeline and server-side filtering.

The middle path — a static site on GitHub Pages built from the same repo — captures benefits 2–4 with zero server code, and the single-file build remains available for fully offline use. That is the recommended eventual posture: **same codebase, two artifacts.**

## 4. Test plan

Testing is integrated per phase; nothing ships from a phase until its gate passes.

**T1. Data tests (Phase 0, run on every commit).**
- Schema validation of every record (types, enums, required fields, unique ids).
- Semantic rules: period sanity (1000 ≤ start ≤ end ≤ current year+1), coordinate bounds, coordinates-near-land check, `settled ≤ migrants` warnings, reference presence.
- Regression fixtures: known-bad records (missing lat, negative migrants, duplicate id, unknown type) must each be rejected with a specific error message — this protects future contributors.

**T2. Unit tests (Phases 1–2, Vitest).**
- Scaling functions: width(√migrants) and circle area(diaspora) return expected px for fixture values incl. min/max clamps; monotonicity property test.
- Time scale: piecewise clock maps (wall-seconds → year) correctly at segment boundaries; step ±1 exact; play-to-end stops at dataset max year.
- Projection/camera: world-wrap math (panning +360° returns identical scene), zoom limits, focus-on-migration produces a bounding box containing all its endpoints.
- Determinism: render-state hash at year Y equals hash after playing to Y+50 and scrubbing back to Y.

**T3. Visual regression tests (Phases 1–3, Playwright + pixelmatch).**
- Golden screenshots at fixed (year, camera) tuples: 1100 world, 1500 world, 1750 Atlantic, 1880 world, 1948 South Asia, 2024 world — each in every shipped theme. Diff threshold 0.5%; goldens regenerated only by explicit command.
- Reduced-motion mode golden set (no particles).

**T4. Interaction tests (Phase 3, Playwright).**
- Scrub to 1848 → Irish Famine arc visible; scrub to 1830 → absent.
- Click transatlantic arc → detail panel shows "12.5M embarked" and SlaveVoyages reference.
- Filter to forced-enslavement only → exactly the two slave-trade flows render (hit-test count).
- Wheel-zoom at cursor keeps the cursor's geographic point fixed (±2 px).
- Keyboard-only session: play, pause, step, select a flow, open panel, close — no mouse events.
- Pan 3× around the world: no NaN camera, arcs still hit-testable.

**T5. Performance tests (Phases 2–4, automated in CI on a fixed runner).**
- Playback 1840–1920 (densest era): mean frame time < 16.7 ms, p95 < 33 ms.
- Load-to-first-render < 2 s from disk; single-file build ≤ 3.5 MB.
- Memory: heap stable (< 5% growth) over 3 full timeline loops (leak check).

**T6. Accessibility tests (Phase 3).** axe-core automated pass on all UI states; manual screen-reader walkthrough of the table view; contrast checks per theme; prefers-reduced-motion honored (asserted in T3).

**T7. Cross-browser / packaging tests (Phase 4).** T3+T4 suites on Chromium, Firefox, WebKit; single-file build opened via `file://` on macOS/Windows/Linux renders identically to the served build (screenshot diff).

**T8. Editorial QA (Phase 5, checklist per data PR).** New entry reviewed against its cited source; confidence rating justified; type classification sanity-checked; rendered result eyeballed at the entry's peak year.

## 5. Risks

- *Number contestation* (e.g., Partition, Circassian tolls): mitigated by ranges, confidence flags, and visible references — the design treats uncertainty as content, not noise.
- *Visual clutter 1846–1914*: mitigations specified (curvature offsets, blending, hover isolation); fallback is destination-aggregation of the European mass migration entry.
- *Canvas hit-testing complexity*: the offscreen color-picking buffer is a known, testable technique; budgeted in Phase 3.
- *Scope creep toward a GIS*: the spec's bundled-basemap decision is the guardrail; street-level detail explicitly deferred to the server alternative.

---

## Extension plan E1–E3 (2026-07-05)

### Design
- **E1**: `#legendBtn` joins the toolbar with `aria-pressed`; `#legend`
  defaults to `display:none`. A `setLegend(v)` function owns state and writes
  `lg=1` into the URL fragment; `applyHash` restores it. The legend loses
  `aria-hidden` since it is now explicit user-requested content (the data
  table remains the accessible equivalent of the map itself).
- **E2**: the spectrum ordering is a *tested requirement*, so it lives in
  `src/core.js` as exported constants: `TYPE_ORDER` (canonical
  voluntary→coerced array) and `TYPE_SPECTRUM` (type → hex, hues descending
  ~211°→0°: #5aa2f0, #47c9d6, #4fd6a3, #6fd457, #b4d94a, #f2ca45, #f59e42,
  #f26e45, #ee4747). `app.js` replaces its ad-hoc `typePalette` with
  `TYPE_SPECTRUM`; `buildLegend` and the type filter checkboxes iterate
  `orderedTypes(data)` = TYPE_ORDER ∩ dataset legend, plus any novel types a
  dropped-in dataset defines (fallback color, appended last). Legend title in
  type mode states the convention.
- **E3**: residual circle rendering changes from fill α 0.20 / ring α 0.75 /
  1.2px to **fill α 0.45 / ring α 0.95 / 1.6px**, keeping `flowColor(m)` so
  the color follows the active mode automatically. Hover-dimming factors are
  unchanged.

### Test integration
- **Unit (test_core.mjs)**: TYPE_ORDER is a permutation of the dataset's
  type_legend keys; endpoints are voluntary-economic and forced-enslavement;
  hue(TYPE_SPECTRUM[t]) is strictly decreasing along TYPE_ORDER, starting
  ≥200° and ending ≤15°; adjacent colors differ by ≥40 L1 RGB.
- **T4 additions (test_browser.py)**: legend hidden at load → button shows →
  button hides; `lg=1` appears in the permalink and restores visibility in a
  fresh page. In type mode with legend open: exactly 9 rows, first swatch
  computes to rgb(90,162,240), last to rgb(238,71,71). Circle vividness: at
  1900 (slave-trade arcs long gone, circles persist) locate the atlantic
  circle via the picking hook, sample a small disk from a screenshot, take the
  most saturated pixel, assert hue ≈ 42°±35 (Sub-Saharan sand, region mode)
  and ≥140 L1 from land/ocean; toggle to type mode, relocate, assert hue is
  red (≤20° or ≥345°).
- **T3**: all seven goldens regenerate (legend removal + brighter circles are
  intentional visual changes), plus a new golden `g8_2015_type_legend`
  capturing type-spectrum coloring with the legend open. Determinism is then
  re-proven by an independent re-render compare.
- **T7**: unchanged assertions re-run on Chromium/Firefox/WebKit.

### Sequencing
core.js constants → unit tests → app.js/index.html changes → build →
regenerate goldens → full T3–T6 → T7 → docs/package.

## Extension plan E4–E7 (2026-07-06)

### E7 design options considered

**A. Capability-based responsive CSS** — media queries on viewport width
(≤620px: wrap the timebar, scrubber on its own full-width row, compact
header/toolbar), viewport height (≤520px: slim single-row timebar, reduced
chrome — the real landscape-phone constraint is *height*), and
`(pointer: coarse)` for ≥40px touch targets per Apple HIG; plus
`viewport-fit=cover` with `env(safe-area-inset-*)` padding. One codebase, no
device sniffing; testable via viewport/touch emulation.

**B. JS device detection with per-device layouts** — classify phone/tablet/PC
(user-agent + heuristics) and swap layout classes. Rejected: UA sniffing is
brittle (iPadOS reports as macOS; the Claude app WebView reports neither
truthfully), it multiplies layouts to maintain, and it answers the wrong
question — an iPad in Split View *is* a phone-width surface, a phone in
landscape *is* a short surface. Geometry and pointer type are the truth.

**C. Separate builds per device** — maximal tailoring, but triples
maintenance, breaks the single-file promise, and permalinks stop being
universal. Rejected.

**D. Uniform scale transform** (zoom the whole UI by devicePixelRatio class)
— crude; enlarges the map chrome without fixing overflow, and text/hit
targets scale past usability. Rejected.

**Decision: A.** It directly fixes the observed failures (timebar overflow at
390px, cramped landscape), degrades gracefully on surfaces we haven't seen,
requires no JS beyond the existing resize handler (the timebar height is
already measured, so a wrapped two-row bar reflows the map automatically),
and is honestly testable in CI via emulation. The one thing A cannot do —
distinguish a large tablet from a small laptop — turns out not to matter:
what differs between them is pointer coarseness, which A handles directly.

### E4 design
`safeCapture()` wraps both `setPointerCapture` call sites (iOS throws
NotFoundError for released touch pointers). `writeHashSoon` wraps
`history.replaceState` in try/catch and latches `permalinkOk=false` on first
failure (sandboxed viewers deny cross-document history writes); `applyHash`
is likewise guarded. No behavior change in normal browsers.

### E5/E6 design
`colorMode` initializes to `"type"`; the button ships pre-pressed reading
"Color: type"; `applyHash` now toggles in *either* direction. Region colors
move to `core.js` as tested constants `REGION_ORDER`/`REGION_SPECTRUM`
(namer #4a7de8, lamer #62c4ee, weur #37b070, eeur #a7cf4d, mena #e8cf4e,
afr #b5793f, casia #f0925f, sasia #ee5d5d, easia #e8478a, seasia #c86ee8 —
unwrapped hues 222° → −75°, strictly decreasing). Legend and region filter
checkboxes iterate `orderedRegions()`; region legend title states the
west→east convention.

### Test integration
Unit: REGION_ORDER is a permutation of the dataset's regions; endpoints
namer/seasia; unwrapped-hue monotonicity; adjacent L1 ≥ 40; continent blocks
contiguous. Browser: E4 hostile-environment run (both APIs stubbed to throw →
zero page errors, scrub still works); E5 default-mode assertions and the E3
vividness test inverted (red first, brown after toggle); E6 region-legend
rows/order/endpoint swatches; E7 emulated 390×844 and 844×390 with touch:
overflow, control-visibility, target-size, and map-height gates. T7's 1880
pixel check switches from region-gold to voluntary-blue (new default). All
goldens regenerate; g8 becomes the region-legend state.


## September 2026 acceptance continuation

The editorial reconciliation is an increment of Phase 5. Its original todo
remains open for source tables, destination allocations, observation dates,
confidence exceptions and the remaining destination-specific visual checks.
Use `notes/editorial-reconciliation-20260909.md` as the entry-by-entry record.

The browser suite accepts `ATLAS_BROWSER` and `ATLAS_URL`, with separate explicitly
created Firefox/WebKit goldens. `test_packaging.py` compares six same-engine
file/HTTP scenes and keyboard paths across three engines on the current host.
A named screen-reader walkthrough and actual Windows/Linux packaging results
remain external acceptance inputs; they cannot be certified from macOS runs.

The September 10 continuation completed the 44 remaining destination close-up
inspections and added exact source locators for six recent entries. Phase 5
still requires the numerical and geographic corrections identified by those
inspections: coverage of the checklist is not acceptance of its findings.
The original reconciliation todo remains actionable for that work.

The later September 10 historical pass reviewed the four remaining high-confidence
entries whose periods begin before 1800. The English Great Migration headline
now follows the American Ancestors cohort estimate; Acadian confidence is lower,
and the two retained high-confidence headlines have specific source rationales.
This completes that exception inventory. T8 still needs the unverified
settlement and descendant sources, other historical quantities and geographic
corrections recorded in the report. The source review receipt preserves the
baseline and revised dataset hashes and each changed field.


## September 10 keyboard and population-label follow-up

Consume Enter's default action before returning data-table focus to the opener.
The keyboard test must cover the complete press/release, selected detail,
Escape close and a later deliberate reopen. Keep the existing focus return.
The shared quantity labels also distinguish a post-migration population from
unique movers; the Partition report records the census definition. Continue
T8's remaining field-level source and geography work after this increment.

## September 11 land-proximity continuation

The separate 300-km proximity measurement now exists as a reproducible audit
of all 140 stored endpoints against both bundled land scales. The Indian Ocean
regional destination is flagged on both; Mauritius is flagged only on the
coarse map that omits the island. The report records the distinction and leaves
coordinates unchanged. This supplies the missing distance evidence; it does
not complete regional allocation, historical placement or all of T8. The
original reconciliation item remains actionable for those recorded findings.
