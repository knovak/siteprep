# Phase 15: particularly high and low tide indicators — specification

Status: **specified, not built.** This document specifies the feature and records
the measurements behind it. No application code has changed. The user chose the
presentation, levels, thresholds and colours on 2026-11-24 (§8, and
`../../decisions.md`): Option B, two levels at 20% and 5%, blue and amber.

## 1. What the user sees

Each tide height in a day card is a plain number today ("3.86 m"). After this
change, a height that is unusually high for a high tide, or unusually low for a
low tide, at that station gets a coloured mark under the number:

- **blue** under a particularly high high tide;
- **amber** under a particularly low low tide;
- nothing under every other height.

A short legend under the cards says what the marks mean, and clicking or
tapping a marked height opens a small box with the exact statement, for example
*"Among the lowest 1% of 2026's low tides here (705 predicted low tides in
2026). Astronomical prediction only: wind, pressure and storm surge can make the
water higher or lower."*

Only extremes in the tide's own direction are marked. A high low tide or a low
high tide is not marked: the request is about high tides being particularly high
and low tides being particularly low.

## 2. What "particularly high" means

### 2.1 Chosen definition

A height is ranked against **every predicted tide of the same type (high or
low) at the same station during the same calendar year**, using the same
provider, datum and unit as the number on the page.

- **Particularly high:** among the highest 20% of that year's high tides
  (thin underline).
- **Particularly low:** among the lowest 20% of that year's low tides
  (thin underline).
- **Second level:** among the highest or lowest 5% (thick underline and bold
  number).

The rank shown to the user is *N* = the share of same-type tides in the year that
are at least as extreme, rounded up to a whole percent (minimum 1%). A height is
marked when *N* ≤ 20, and reaches the second level when *N* ≤ 5.

Reasons for this definition:

1. **It is local.** A 3.6 m high tide is ordinary in Seattle and impossible in
   Gibraltar. Ranking against the station's own year means the mark answers
   "is this unusual *here*?"
2. **The datum does not matter.** NOAA uses MLLW, CHS and the Bureau use chart
   datum, FES uses mean sea level. Because each height is compared only with
   other heights from the same series, no datum conversion is needed and no
   cross-provider error can arise.
3. **It works for every tidal regime.** In mixed tides (U.S. West Coast) the
   lower of the two daily highs falls naturally into the lower part of the
   distribution and is never marked. In diurnal places (parts of the Gulf of
   Mexico, Western Australia) the one daily high is compared with the other
   daily highs. No regime-specific rule is needed.
4. **It produces a useful number of marks.** With about 705 high tides a year
   at a semidiurnal station, the top 20% is about 140 high tides — the larger
   tides of most spring-tide periods, and no marks during neap weeks. The top 5%
   (about 35 a year) picks out the largest spring tides, including the perigean
   spring tides that people call king tides. Across a year about one tide in five
   is marked, unevenly: several a day around a big spring tide, none for days
   around a neap tide.
5. **It can be explained in one sentence**, which the tooltip uses verbatim.

A calendar year is used, not a rolling 365 days, so a station's threshold record
is computed once and reused for the whole year (§5). When the five displayed days
cross from December into January, the record for the year of the first
displayed day is used for all five; the difference between consecutive years'
thresholds is a few centimetres.

### 2.2 Worked example (measured)

NOAA Seattle (9447130), MLLW, 2026 — 705 highs and 705 lows:

| | 1% | 5% | 20% | median | 80% | 95% | 99% |
|---|---:|---:|---:|---:|---:|---:|---:|
| High tides (m) | 2.26 | 2.42 | 2.86 | 3.27 | **3.54** | **3.74** | 3.91 |
| Low tides (m) | −1.17 | **−0.80** | **−0.20** | 0.81 | 2.16 | 2.47 | 2.65 |

For this week (24–28 November 2026, a full-moon perigean spring tide), that
marks 7 of 10 high tides (4 at the 5% level) and all 4 nighttime low tides (all
at the 5% level), which is what `mockups/option-B.png` shows. A spring-tide week
is the busiest case; the 3.48 m high at 4:35 PM on Thursday is in the highest 29%
and is not marked, and in a neap week nothing is marked.

### 2.3 Alternatives considered

| Method | Accuracy and meaning | Cost | Disposition |
|---|---|---|---|
| **Rank within the year's predictions at this station** *(chosen)* | Local, datum-free, regime-free; directly answers "unusual here" | One extra request per station per year for NOAA/CHS (§4); free for stored sources | Chosen |
| Rank within the five displayed days | Always marks something, even in a neap week; says nothing about the year | Zero | Rejected: does not answer the question |
| Moon phase and lunar distance (spring/perigee heuristic) | Right in broad terms, wrong in detail: the largest tides lag the moon by 0–3 days depending on the place, and diurnal places follow the moon's declination instead of its phase | Zero, computed locally with SunCalc | Rejected as the indicator; unreliable where it matters |
| Compare with published tidal datums (NOAA MHHW/MLLW/HAT, CHS HHWLT/LLWLT) | Official and meaningful ("above mean higher high water") but each provider publishes different levels, subordinate stations often lack them, and FES has none | One small datums or metadata request per station | Rejected as the main method; may be shown as extra context in source details later |
| Rank within a 19-year (nodal-cycle) span | The most stable definition; the 18.6-year lunar nodal cycle moves annual extremes by a few percent | 19× the data; only practical by precomputing on the server | Not now: one year is enough for "unusual this year" and needs no server work for NOAA/CHS |
| Rank against the nearest FES2022 model point for every source | One method everywhere | FES heights at a model point differ from a harbour station's, so the rank could disagree with the number shown | Rejected: the mark must describe the number beside it |

## 3. The threshold record

Every source produces the same small record for a station and year:

```json
{
  "schema": "tide-here/extremity/v1",
  "provider": "noaa",
  "stationId": "9447130",
  "datum": "MLLW",
  "unit": "m",
  "year": 2026,
  "computedAt": "2026-11-24T20:31:05Z",
  "probabilities": [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 0.75, 0.8, 0.9, 0.95, 0.98, 0.99],
  "high": [2.26, 2.302, 2.42, 2.594, 2.856, 2.933, 3.265, 3.501, 3.542, 3.649, 3.741, 3.84, 3.907],
  "low": [-1.165, -1.074, -0.801, -0.493, -0.196, -0.057, 0.81, 1.972, 2.155, 2.378, 2.473, 2.591, 2.653],
  "highCount": 705,
  "lowCount": 705
}
```

About 450 bytes. The page uses the 0.8 high and 0.2 low quantiles (20%) and
the 0.95 high and 0.05 low quantiles (5%) for the marks, looked up by
probability rather than by array position, and interpolates between quantiles for the "among
the highest N%" sentence. Quantiles are computed from the sorted heights with
the same index rule as `mockups/build-data.mjs`. The record never carries
coordinates, place names or user input.

A record is only valid for the exact `provider`, `stationId`, `datum`, `unit`
and `year` it names. If any of these differs from the displayed forecast, the
page shows no marks.

## 4. Where the year of predictions comes from

Measured on 2026-11-24 from this container.

| Source | How the year is obtained | Measured cost | Where the record is computed |
|---|---|---|---|
| **NOAA CO-OPS** (browser-direct) | The existing prediction request with `begin_date=YYYY0101&end_date=YYYY1231`, same station, datum, `interval=hilo`, `units=metric`, `time_zone=gmt` | 1 request; 70 KB JSON, **11.6 KB compressed**; 0.36–1.2 s; sorting and quantiles **8 ms** | Browser, in the background |
| **CHS IWLS** (browser-direct) | The existing `wlp-hilo` request with `from=YYYY-01-01T00:00:00Z&to=(YYYY+1)-01-01T00:00:00Z`; one request returned the full year | 1 request; 179 KB JSON; 0.44 s; counts once against CHS's 3/s and 30/min limits | Browser, in the background, through the existing CHS throttle |
| **Bureau of Meteorology** (stored, 76 ports) | Already stored as one annual object per port in R2 | No runtime request | Once per port at import/activation; record stored beside the annual object and returned inside the `/forecast` response |
| **FES2022** (stored, 65,203 model points) | Generated from the point's 34 constituents with the same `@neaps/tide-predictor` engine the gateway already uses | **40–80 ms per point** for a full year (measured on the 7 validation points) | Precomputed per tile as a sidecar object at preparation time (~1 hour on one core for all points, parallelisable); returned inside the `/forecast` response |

Notes:

- NOAA and CHS return the year using exactly the request shape the adapters
  already build, so the existing parsers (including CHS's alternating high/low
  typing) are reused unchanged. Only the date range differs.
- The NOAA one-year `hilo` range worked in practice. The documented range limit
  for `hilo` predictions must be confirmed during implementation; if a request is
  refused, the adapter splits the year into two half-year requests.
- For FES, an on-demand alternative is to compute the record in the gateway on
  the first request for a point (one 40–80 ms computation) and store it in R2.
  It avoids re-preparing the dataset but adds that time to the first forecast
  for each point. The sidecar is preferred; the on-demand path is an acceptable
  first increment if regenerating sidecars is deferred.
- Bureau data currently covers 2026. When the window reaches 2027 before 2027
  predictions are imported, the 2026 record is used (the year-boundary rule in
  §2.1) and the tooltip names 2026.

## 5. Keeping the page fast

The rule: **the indicator is never on the path to the first forecast.** The
page renders exactly what it renders today, as fast as it does today, and the
marks are added to that rendering when their data is available.

### 5.1 Order of work on a forecast

1. The forecast is fetched and rendered with no change to timing.
2. While building the day cards, the page looks up the threshold record
   synchronously in local storage (stored providers: in the forecast response).
   If found, the marks are part of the **first** render.
3. If not found and the provider is NOAA or CHS, the page schedules one
   background request for the year with `requestIdleCallback` (fallback
   `setTimeout(…, 0)`) after the cards are painted, using `fetch(…, {priority:
   'low'})`.
4. When the record arrives it is stored and the marks are applied to the cards
   already on screen. Nothing else is re-rendered.

### 5.2 Cache

- Key: `tide-here.extremity.v1.<provider>.<stationId>.<datum>.<year>`.
- Value: the §3 record, about 450 bytes.
- Lifetime: until the end of its year plus 31 days (so the year-boundary rule
  can still use it). A record never changes during its year, so there is no
  refresh.
- Bound: at most 50 records; on overflow the oldest by `computedAt` is removed.
  50 records are about 23 KB.
- Like every other Tide Here cache, reads and writes are wrapped so a full or
  blocked local storage only means no marks.
- The raw year of predictions is never stored, only the record.

A second forecast for the same station in the same year — the common case for
someone who checks their own beach — therefore shows the marks immediately with
no extra network request.

### 5.3 Concurrency and cancellation

- At most one year request per station is in flight; a second forecast for the
  same station reuses the pending promise.
- The request uses the page's existing request-generation check: if the user
  starts a new search or picks an alternative coast, the pending year request is
  aborted with an `AbortController` and its result is discarded.
- CHS year requests go through the existing CHS rate limiter and are never
  issued while a forecast request is waiting on it.
- No request is made at page load or for stations the user has not displayed,
  and there is no service-worker or periodic refresh.

### 5.4 No layout movement

The marks are applied after the first paint on a cold cache, so they must not
move anything:

- Underlines use `text-decoration` (straight) and do not change layout.
- A wavy underline (Option C) needs a few pixels; that space is reserved under
  **every** height from the first render, so applying a mark changes no line
  height.
- Option D's word label and Option E's bar add width or height; with D the
  label space cannot be reserved without leaving gaps, so D would move text
  when a cold-cache mark arrives. Option E reserves its bar for every height
  from the start. This is a reason to prefer A, B, C or F (§8).

### 5.5 Time budget

| Situation | Added time to first forecast | Marks visible |
|---|---|---|
| Australian Bureau port or FES point | ≈0 (≈450 bytes added to `/forecast`) | With the forecast |
| NOAA or CHS, record cached | 0 | With the forecast |
| NOAA or CHS, first view of the station this year | 0 | About 0.4–1.5 s after the forecast |
| Year request fails or times out (10 s) | 0 | Never; source details say "Extremity marks unavailable for this station" |

## 6. Presentation

**Chosen: Option B** (2026-11-24). The candidate designs are kept in
`mockups/` for the record, all re-rendered at the chosen 20% / 5% levels. All use
real NOAA Seattle predictions for 24–28 November 2026 and the live page's own
stylesheet.

| Option | Image | Levels | Summary |
|---|---|---|---|
| A | `mockups/option-A.png`, `mockups/option-A-phone.png` | 1 | Solid 2.5 px underline, blue or amber. The simplest. |
| B | `mockups/option-B.png`, `mockups/option-B-explanation.png` | 2 | **Chosen.** Thin underline at 20%; thick underline and bold number at 5%. |
| C | `mockups/option-C.png` | 2 | Wavy underline; pale at 20%, strong and bold at 5%. Reads as water. |
| D | `mockups/option-D.png` | 2 | Underline plus a small label: "Very high", "Top 5%", "Very low", "Lowest 5%". Self-explaining but busier, and moves text on a cold cache (§5.4). |
| E | `mockups/option-E.png` | 1 | A small bar under every height showing where it falls in the year's range; the dot turns blue or amber when marked. Most informative, most visual weight. |
| F | `mockups/option-F.png` | 2 | Highlighter tint behind the number instead of an underline. |

Rules for the chosen design:

- **Colour.** Blue (`#1f6fb2`) for high and amber (`#c27c0e`) for low, added to
  the stylesheet as `--extreme-high` and `--extreme-low`. Both are at least 3:1
  against the white card, the contrast required for a non-text mark. A marked
  number switches from the muted grey to the normal ink colour, so the number
  itself is easier to read.
- **Colour is not the only signal.** Each marked height carries an accessible
  description (the §1 sentence) for screen readers, and the legend explains the
  colours in words.
- **Explanation on click or tap.** A marked height is a button. Clicking or
  tapping it opens the explanation box beside it
  (`mockups/option-B-explanation.png`); clicking it again, clicking elsewhere, or
  pressing Escape closes it, and only one box is open at a time. Keyboard users
  reach it with Tab and open it with Enter or Space. On a device with a mouse,
  hovering also shows it. A native `title` attribute alone is not enough because
  it does not appear on touch screens. Unmarked heights stay plain text.
- **Legend.** One line under the cards, shown only when at least one height is
  marked, plus the record's year and that the ranking uses predicted tides at
  this station.
- **Past tides** in today's card keep their marks; the existing past-event
  styling (lighter label) is unchanged.
- **Today's rising/falling arrow** is unchanged.
- **Source details** gain one sentence: how the marks are computed, the year,
  and the number of high and low tides in the record — or that they are
  unavailable.
- **FES results** use the same marks. The existing approximate-model disclosure
  already covers them; the tooltip says "at this model point" instead of
  "here".
- **Local history** entries are not changed. The threshold record lives in its
  own cache so the existing history format stays as it is.

## 7. Edge cases

| Case | Behaviour |
|---|---|
| Fewer than 100 events of a type in the record (partial year, damaged response) | Record rejected; no marks |
| Station has only one tide type in the window (rare diurnal days) | Only that type can be marked |
| Two equal heights straddling a threshold | Both treated the same (the rule is "at least as extreme") |
| Forecast datum or unit differs from the record | No marks (§3) |
| Fixture mode | A committed fixture record per fixture station; no live year request |
| Alternative coast selected | Record for that station; the previous station's pending request is aborted |
| Storm surge or wind | Not included; stated in the tooltip and covered by the existing safety line |
| Year boundary | Record for the year of the first displayed day (§2.1) |
| Local storage unavailable | Marks still appear for stored providers; NOAA/CHS make the year request each time a station is shown, still in the background |

## 8. Decisions

Settled by the user on 2026-11-24 and recorded in `../../decisions.md`:

1. **Presentation:** Option B, two underline weights. The explanation opens
   when a marked number is clicked or tapped (§6).
2. **Levels:** two.
3. **Thresholds:** 20% and 5%. The proposal had been 10% and 2%.
4. **Colours:** blue for high and amber for low, as mocked.

## 9. Validation

- Unit tests for the quantile rule, the *N*% sentence, the 20%/5% boundaries and
  ties, using a committed one-year NOAA fixture and a committed CHS fixture.
- Record rejection for a datum, unit, station or year mismatch, and for a
  short record.
- Cache read/write, the 50-record bound, expiry after the year plus 31 days, and
  behaviour with storage blocked.
- Browser tests: first render unchanged and marks absent on a cold cache; marks
  present on first render on a warm cache; no layout shift when marks arrive
  (bounding boxes of every height before and after); a new search aborts the
  pending year request; CHS throttle respected.
- Bureau and FES: the `/forecast` response carries the record; FES sidecar
  values match an on-the-fly computation for the 7 validation points.
- Timing: the existing Phase 14 response-time comparison is rerun and shows no
  change to time-to-first-forecast for any provider.

## 10. Increments, when building starts

1. Shared quantile and ranking module with tests; NOAA and CHS background record
   and cache; chosen presentation, legend and explanation.
2. Bureau records at import/activation, returned in `/forecast`.
3. FES record: on demand in the gateway with an R2 cache, then sidecars at the
   next FES preparation.

## Files

- `mockups/build-data.mjs` — builds `mockup-data.json` from a NOAA one-year
  response, using the live page's own day-model, astronomy and formatting code.
- `mockups/mockup.html` — renders the six options with `../../phase-6/styles.css`.
- `mockups/render.mjs` — writes the PNGs with the pre-installed Playwright; set
  `CHROMIUM_PATH=/opt/pw-browsers/chromium` when the installed Playwright does
  not find its own browser.
- `mockups/*.png` — the mockups listed in §6.

This folder is not staged into the deployed Site (`phase-13/scripts/stage-static.mjs`
copies named folders only).
