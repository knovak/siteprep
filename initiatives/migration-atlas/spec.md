# World Migration Atlas — System Specification

**An interactive, animated map of international migrations and diasporas, 1000 AD – present**

Version 0.1 — July 2026

---

## 1. Purpose and scope

The Migration Atlas is an interactive visualization that lets a viewer watch a millennium of human movement unfold on a world map. Each migration appears as an animated arrow from source to destination, sized by the number of people who moved, colored by origin region, and accompanied by a persistent "residual" circle at the destination whose size reflects the eventual settled or diaspora population. The viewer can let time play automatically, scrub backward and forward, zoom into any region, and pan freely with no fixed map boundaries.

The atlas covers all major categories of movement: forced enslavement, expulsions, refugee flight from war and imperial collapse, religious migration, indentured labor, colonial settlement, and voluntary economic migration. It begins at 1000 AD and runs to the present, and it is designed so that new movements can be added by editing a single data file, with no code changes.

## 2. The dataset

The companion file `migrations.json` contains the initial research: 44 movements with source, destinations, migrant counts, causes, type classification, settled/diaspora populations, confidence ratings, and scholarly references. A summary of the list follows (figures are consensus estimates; the JSON records ranges and caveats).

| # | Migration | Period | Type | Moved | Diaspora today |
|---|-----------|--------|------|-------|----------------|
| 1 | Turkic migration into Anatolia | 1040–1300 | Conquest migration | ~1M | ~60M (Turks of Anatolia) |
| 2 | Romani migration from India | c. 1000–1450 | Voluntary/uncertain | tens of thousands | 10–12M |
| 3 | Mongol conquest displacements | 1206–1300 | Refugee flight | 1–5M | — |
| 4 | Medieval Jewish expulsions (England, France) | 1290–1394 | Forced expulsion | ~120K | — |
| 5 | Sephardic expulsion from Iberia | 1492–1510 | Forced expulsion | 40–200K | ~2M Sephardim |
| 6 | Spanish emigration to the Americas | 1500–1810 | Colonial settlement | ~700K | (merged into Latin American populations) |
| 7 | **Transatlantic slave trade** | 1501–1866 | Forced enslavement | **12.5M embarked / 10.7M arrived** | ~200M Afro-descendants in the Americas |
| 8 | Trans-Saharan / Indian Ocean slave trades | 1000–1900 | Forced enslavement | ~6M (post-1000) | Afro-Arab & Siddi communities |
| 9 | Puritan Great Migration | 1620–1640 | Religious | ~21K | ~30M descendants |
| 10 | Huguenot exodus | 1685–1710 | Religious | ~200K | incl. ~1M Afrikaner descendants |
| 11 | Acadian expulsion | 1755–1764 | Forced expulsion | ~11.5K | ~900K Cajuns |
| 12 | Convict transportation to Australia | 1788–1868 | Forced expulsion | 162K | ~5M descendants |
| 13 | Trail of Tears / Indian Removal | 1830–1850 | Internal forced | ~60K | ~400K tribal citizens in Oklahoma |
| 14 | Irish Famine emigration | 1845–1855 | Refugee flight | ~1.8M | 31M+ Irish Americans |
| 15 | **European Age of Mass Migration** | 1846–1914 | Voluntary economic | **~55M** | 150M+ descendants across the Americas |
| 16 | Indian indentured labor | 1834–1920 | Indentured | ~1.6M | ~4M+ (Mauritius, Caribbean, Fiji, South Africa) |
| 17 | Chinese 19th–20th c. emigration | 1840–1940 | Indentured/voluntary | ~20M | 40–50M overseas Chinese |
| 18 | Chuang Guandong (Han → Manchuria) | 1860–1942 | Voluntary economic | ~25M | ~100M NE China |
| 19 | Circassian expulsion | 1859–1878 | Forced expulsion | 0.8–1.5M | ~4M (Turkey, Jordan, Syria) |
| 20 | Russian settlement of Siberia | 1861–1914 | Colonial settlement | ~5M | ~25M |
| 21 | Jewish flight from the Russian Empire | 1881–1914 | Refugee flight | ~2M | ~6M American Jews |
| 22 | Armenian Genocide dispersal | 1915–1923 | Refugee flight | ~500K survivors | ~7M diaspora |
| 23 | Greek–Turkish population exchange | 1919–1924 | Forced expulsion | ~2M | — |
| 24 | White émigré flight from Russia | 1917–1925 | Refugee flight | 1–2M | — |
| 25 | US Great Migration (African American) | 1916–1970 | Internal (flight from terror) | ~6M | ~25M |
| 26 | German expulsions from Eastern Europe | 1944–1950 | Forced expulsion | 12–14M | — |
| 27 | Holocaust survivors & DP emigration | 1933–1953 | Refugee flight | ~1M | — |
| 28 | **Partition of India** | 1947–1951 | Refugee flight | **14–18M** | — |
| 29 | Palestinian Nakba | 1947–1949 | Refugee flight | ~720K | ~6M registered refugees |
| 30 | Jewish exodus from Arab lands | 1948–1972 | Forced expulsion | ~850K | ~4M (mostly Israel) |
| 31 | Windrush / Commonwealth → Britain | 1948–1971 | Voluntary economic | ~1.2M | ~6M |
| 32 | Indochinese boat people | 1975–1995 | Refugee flight | ~2M | ~3.5M |
| 33 | Afghan refugee waves | 1979– | Refugee flight | ~8M cumulative | ~8M |
| 34 | Soviet Jewish emigration | 1970–2000 | Refugee flight | ~1.8M | ~2.2M |
| 35 | Mexican migration to the USA | 1965–2010 | Voluntary economic | ~16M gross | 37M Mexican Americans |
| 36 | Asian labor migration to the Gulf | 1973– | Voluntary economic | ~30M circular | ~24M current stock |
| 37 | Rwandan genocide flight | 1994–1997 | Refugee flight | ~2M | — |
| 38 | Yugoslav wars displacement | 1991–1999 | Refugee flight | ~4M | ~3M diaspora |
| 39 | Syrian civil war | 2011– | Refugee flight | ~6.8M peak (4.9M at end-2025 after returns) | — |
| 40 | Venezuelan exodus | 2014– | Refugee flight | ~7.7M | — |
| 41 | Rohingya exodus | 2012– (peak 2017) | Refugee flight | ~1.1M | ~1M in Bangladesh |
| 42 | Ukrainian refugee crisis | 2022– | Refugee flight | ~5.9M | — |
| 43 | Sudan civil war | 2023– | Refugee flight | ~13M (incl. internal) | — |
| 44 | Filipino overseas migration | 1974– | Voluntary economic | ~12M | ~10–12M |

**Data caveats the UI must surface.** Pre-1800 numbers are order-of-magnitude estimates; the schema carries a `confidence` field (high / medium / low) and optional `migrants_range`, and the UI must display these honestly (e.g., dashed arrow outlines for low-confidence flows, ranges in the detail panel). "Diaspora today" mixes two different concepts — surviving migrant stock vs. descendant populations — and the detail panel must label which is meant. Several movements (Gulf labor, Filipino, Mexican) are circular; the schema's `migrants_note` records this.

## 3. Data model

All content lives in one human-editable JSON file. Adding a newly researched migration means appending one object — no code changes.

```
Migration {
  id: string (kebab-case, unique)
  name: string
  period: { start: year, end: year, peak?: year }   // negative years = BC if ever extended
  type: enum (forced-enslavement | forced-expulsion | refugee-flight |
              voluntary-economic | religious | colonial-settlement |
              indentured-labor | internal-forced | conquest-migration)
  cause: string (one-sentence narrative)
  migrants: integer            // total who moved
  migrants_range?: [lo, hi]    // uncertainty band
  migrants_note?: string       // caveats (mortality, circularity, etc.)
  source: { name, lat, lon }
  destinations: [ { name, lat, lon, settled: int, diaspora_today: int|null } ]
  confidence: high | medium | low
  references: [string]
}
```

Validation rules (enforced by a schema + CI test, section 7): unique ids; `start ≤ end`; lat ∈ [−90, 90], lon ∈ [−180, 180]; `migrants ≥ Σ settled` is *not* required (multi-generation growth), but `settled ≤ migrants` per destination is warned when violated without a note; every enum value must be from the legend; every entry needs ≥ 1 reference.

## 4. Visual encoding

**Arrows (flows).** Each migration renders as a curved great-circle-ish arc from source to each destination.
- *Width* ∝ √(migrants to that destination) — square-root scaling so the transatlantic slave trade (12.5M) doesn't render 600× wider than the Acadian expulsion (11.5K); a legend shows the scale. Min width 1.5 px, max ~28 px at world zoom.
- *Color* keyed to **source region** (a fixed palette of ~10 world regions: Western Europe, Eastern Europe/Russia, Middle East & N. Africa, Sub-Saharan Africa, South Asia, East Asia, SE Asia & Pacific, North America, Latin America & Caribbean, Central Asia). Color-blind-safe palette (Okabe–Ito derived). An alternate mode colors by *type* (forced vs. voluntary etc.) — toggleable.
- *Animation*: while a migration is "active" (current time inside its period), particles or a moving-dash pulse travel along the arc, with pulse rate ∝ intensity (migrants ÷ duration). Before its start year the arc is absent; after its end year the arc fades over ~5 animation-years, leaving only the residual circle.
- *Uncertainty*: low-confidence flows render with a dashed/ghosted stroke.

**Residual circles (diasporas).** At each destination, a translucent filled circle grows during the migration and settles at *area* ∝ diaspora_today (or `settled` when no diaspora figure exists). Circles persist for the rest of the timeline — the map at 2026 is a portrait of the world's diasporas. Clicking a circle or arc opens the detail panel.

**Anti-clutter.** Overlapping simultaneous flows (e.g., 1846–1914 has ~8 active) are handled by: arc curvature offsets for shared endpoints, opacity ~0.75 with `screen`/`lighter` blending on dark themes, and a hover-highlight that dims all but the hovered flow's family.

## 5. Time system

- Timeline spans 1000–2026, extensible via data (the axis derives its bounds from the dataset).
- **Nonlinear time scale option**: at 1 year/tick, the 11th–18th centuries are dead air. Default playback uses a piecewise clock — e.g., 10 yrs/sec before 1800, 4 yrs/sec 1800–1900, 2 yrs/sec after 1900 — with a linear mode toggle. The scrubber shows era density (a mini histogram of active migrations under the track).
- Controls: play/pause, speed (0.5×–8×), step ±1 year, jump to next/previous event start, draggable scrubber, and keyboard equivalents (space, ←/→, Home/End).
- The current year displays prominently; entering a year directly is supported.
- Deterministic rendering: the scene at year Y is a pure function of (dataset, Y, camera) — scrubbing backward must reproduce identical frames (this is also the key testability property, section 7).

## 6. Map, camera, and interaction

- **Projection**: Natural Earth or Equal Earth projection at world view for honest area comparison (important when circle *area* encodes population). Rendered from bundled Natural Earth vector data (110m for world zoom, 50m swapped in beyond ~3× zoom) — no tile server needed.
- **Pan/zoom**: free pan with no clamped boundaries; the world wraps horizontally (pan past the antimeridian and the map repeats) so no region is ever "at the edge." Zoom range ~0.7× (whole world with margin) to ~40× (country level). Mouse wheel / pinch / double-click zoom, drag to pan, all animated with inertia. Arrow widths and circle sizes rescale sensibly with zoom (perceptual compensation: sizes grow with √zoom, not linearly, so world-scale comparisons survive zooming).
- **Selection & detail**: hover shows a tooltip (name, years, count); click pins a detail panel with full narrative, numbers with ranges, confidence, references, and a "focus" button that zooms to the flow's bounding box and constrains the timeline to its period.
- **Filters**: by type (checkboxes with the type color chips), by source region, by size threshold slider, and a text search.
- **Legend**: always-visible width scale (e.g., strokes for 100K / 1M / 10M), region color key, circle-area key.
- **Accessibility**: full keyboard operation, ARIA labels on controls, prefers-reduced-motion honored (particles replaced by static arrows + year-stepped fades), and a data-table view of all migrations as a non-visual equivalent.

## 7. Quality requirements

- 60 fps target during playback with ≤ 200 simultaneous animated flows on a 2020-era laptop; graceful degradation (particle count reduction) below 30 fps.
- Initial load ≤ 3 MB (basemap ~1 MB gzipped, code ~500 KB, data ~100 KB); first render < 2 s from local disk.
- Runs entirely offline from local files (see implementation plan for the file:// nuance).
- Works in current Chrome, Firefox, Safari, Edge; degrades to static map + table without WebGL.

## 8. Editorial requirements

Because the subject includes atrocities, the presentation must be sober: no celebratory motion flourishes on forced migrations; type legend language reviewed ("forced enslavement," not euphemism); death tolls in transit noted in detail panels where documented (Middle Passage, Circassian deportation, boat people); and an "About the data" page explaining estimate uncertainty and inviting corrections — which doubles as the contribution guide for adding new research.

---

## Extension requirements (2026-07-05)

**E1 — Legend on demand.** The legend is hidden by default. A clearly labeled
toolbar button toggles it on and off; the button reflects its state
(pressed/unpressed) and is keyboard-accessible. Legend visibility is part of
the shareable permalink state.

**E2 — Coercion-spectrum type coloring.** The existing color-by-type mode maps
migration types onto the visible spectrum ordered by degree of coercion:
**blue = most voluntary → red = most coerced**. The canonical ordering
(most voluntary first):
voluntary-economic, colonial-settlement, conquest-migration, religious,
indentured-labor, refugee-flight, internal-forced, forced-expulsion,
forced-enslavement.
When the user selects type coloring, the legend (subject to E1's toggle)
presents the types in this spectrum order with their colors, styled like the
region legend, and states the blue→red convention. Filter checkboxes use the
same colors and ordering.

**E3 — Vivid residual circles.** Diaspora circles must read as distinctly
colored marks, not gray ghosts: each circle takes the color of the flow that
created it under the *current* color mode (region or type), with fill and ring
opacity high enough to be unmistakably that color over both land and ocean.
Switching color mode recolors existing circles immediately.

**Acceptance criteria.** (E1) legend absent at load; one click shows, another
hides; `lg=1` round-trips through the permalink. (E2) legend rows appear in
the canonical order; hue decreases monotonically from ≥200° (blue) to ≤15°
(red); adjacent colors remain visually distinct. (E3) a circle's most
saturated pixels sit within ±35° of its palette color's hue and differ from
the underlying basemap by ≥140 L1 RGB units (the previous rendering measured
≈104, i.e. it would fail this gate); the same circle's hue tracks the color
mode when toggled.

## Extension requirements (2026-07-06)

**E4 — Hostile-WebView robustness.** The app must produce zero uncaught errors
inside sandboxed WebViews (e.g. the Claude iOS app's file viewer) where
`history.replaceState` throws SecurityError and `setPointerCapture` can throw
for already-released touch pointers. Permalink writing degrades gracefully
(disabled after first failure); all interaction continues to work.

**E5 — Type coloring is the default.** The atlas opens in color-by-type mode
(the coercion spectrum); the toggle switches to region coloring and back, and
permalinks restore either mode.

**E6 — Geographic region spectrum.** Region colors follow an organized sweep
rather than arbitrary hues: continents form contiguous blocks in color space,
ordered west → east — Americas in blues (N America deep blue, Latin America
sky blue), Europe in greens (W deep green, E/Russia yellow-green), MENA gold,
Sub-Saharan Africa brown, then Asia through orange, red, crimson to SE Asia
violet. The region legend presents regions in this order and states the
convention. (Adapted from the user's sketch; MENA moved from bright green to
gold so the Europe block stays contiguous and the hue sweep stays monotonic.)

**E7 — Device-adaptive layout.** The UI adapts by *capability and geometry*,
not user-agent: touch devices get ≥40px targets; narrow (portrait-phone)
screens get a wrapped timebar with the scrubber on its own row and compacted
chrome; short (landscape-phone) screens get a slim single-row timebar and
reduced header; iOS safe-area insets are respected. Desktop/tablet layouts are
unchanged.

**Acceptance criteria.** (E4) with replaceState and setPointerCapture stubbed
to throw, a full interaction pass produces zero page errors and scrubbing
still changes the year. (E5) the mode button reads "Color: type" at load;
`cm=region` permalinks restore region mode. (E6) region hues, unwrapped for
the red–violet crossover, decrease strictly monotonically along the canonical
order; continent members are adjacent; adjacent colors differ ≥40 L1.
(E7) at 390×844 and 844×390 with touch emulation: no horizontal overflow, all
timebar controls inside the viewport, play button ≥40px tall, map keeps ≥45%
of viewport height.


## September 2026 editorial representation and keyboard corrections

The optional `quantity_kind` is `movers` (the backward-compatible default),
`stock`, `circular`, or `displacement`. Core validation rejects other values.
Details, tooltips and the accessible table label these different measures;
figures, stock dates and source/descendant attribution remain subject to the
field-level T8 review. Circle growth is illustrative, and regional points are
schematic. The dated reconciliation report under `notes/` records each finding
and what remains unverified. No population or coordinate was substituted.

Table and About dialogs retain Tab/Shift+Tab focus inside the dialog and return
focus to the opener on close. Reading keys do not run the background timeline;
native button Space behavior remains available. These automated keyboard checks
do not substitute for manual assistive-technology acceptance.


## September 9 review follow-up

The editorial reconciliation is rendered as a companion HTML page in the
published package and linked from About the data. It preserves the full
48-entry report, source locators, and unresolved-evidence qualifications.

The timeline includes one year before the earliest migration, allowing a blank
opening view. At the user's request, the two approximate starts previously
recorded as 1000 (Romani migration and the Indian Ocean slave trades) are
recorded as 1001, leaving the opening year at 1000. This display convention
does not claim new historical precision.
