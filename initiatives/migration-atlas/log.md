# Log

## 2026-09-07 — Adopt the existing World Migration Atlas

Created the initiative around the existing working demo, following the user's migration-only request. Preserved the supplied wish and linked its prompt history. Adopted the original specification and implementation plan without changes and retained the complete supplied README with current context. Added objectives, decisions, provenance, and a test plan grounded in those records.

Copied all nine repository demo files unchanged into `work/` and registered the existing demo as the output and the destination for a later release. The adoption manifest records the source commit, hashes, and attachment provenance. The existing production demo, application behavior, research data, and deployment scripts are unchanged.

The initiative rests pending user testing and an explicit production-release decision. Historical build phases and prompts are not treated as fresh instructions to change code.

### Adoption verification

The nine source files and two adopted attachments passed byte-for-byte comparisons; the supplied README was confirmed intact within the new README. `npm ci` installed the repository dependencies successfully with no reported vulnerabilities.

A Chromium browser check of `work/index.html` via `file://` passed: 48 migration records; initial type coloring; legend and color toggles; identical canvas output after scrubbing away from and back to 1880; 48 table rows and an opening detail panel; Irish-migration search; playback; wheel zoom and drag pan. A 390×844 touch-emulated page rendered without horizontal overflow and its legend opened. No uncaught page errors were observed. This is migration verification, not a rerun of the historical T1–T8 suites.

The repository build passed, including generated initiative/README and deployment-preview checks. Visual inspection confirmed the atlas rendering. The generated-page link check identified Markdown document targets that needed the published `.html` suffix; those navigation links were corrected without modifying the adopted specification or plan.

### Adoption acceptance, as met

The conditions the adoption set itself, all satisfied and now history: the
supplied specification and implementation plan preserved byte for byte as
`spec.md` and `plan.md`; the wish left in the user's words with its prompt
history linked; every file from `demos/world_migration_atlas/` preserved and the
demo left intact as the released output; the supplied README retained in full;
the initiative documents and the test preview building; and production left for
a separate authorized release. They were listed in `objectives.md` until
2026-09-07, when that document went back to describing what a finished atlas
does.

## 2026-09-07 — The development package, and a buildable atlas

The user supplied `migrationatlascomplete2.zip` as the complete July 2026 code
base. It closed the gap the adoption had documented three times and left off the
todo list: the atlas could be looked at but not changed.

Committed under `lib/`: `src/core.js`, `src/app.js`, `src/index.html`, the two
vendored d3 modules, `data/` with the 48-record dataset and both basemap
resolutions, `tools/build.py`, `verify.py`, and `tests/` with T1-T7 and the
eight goldens. Its three markdown documents were already adopted; all three
match the package hash for hash, so the hashes recorded before it arrived are
now verified rather than merely recorded.

**The bundle is reproducible.** The package's build came out 195 bytes short of
the published file, differing in four places - the page title, one CSS rule, the
header line carrying the tutorial links, and a comment in `app.js`. Those
branding edits were ported into `lib/src/`, and `python3 lib/tools/build.py`
now rewrites `work/index.html` byte for byte at
`38f40ff2a445ce8c96896e4269ce981a76e0eb88aee24888b9fdebbe8ac8eb1e`. The build
writes the deployable artifact directly, so there is one bundle in the
repository rather than three.

**T1, T2, E2 and E6 pass**: `node lib/tests/test_core.mjs`, 535 assertions, 0
failures, with no dependency this repository does not already have. The browser
gates need the Python Playwright stack and a golden re-baseline, which is now a
todo item rather than a paragraph saying it would be separate work.

`work/` was trimmed to what is served - `index.html`, `prompts.html`,
`prompts.txt` - taking the published preview from 4.8 MB to 1.27 MB. The
duplicate `index-initial.html`, the stale `dist/`, the JavaScript-free
`src/index.html` and the build-input `data/` all left; `decisions.md` says why
and what that means for the next release.

Corrected while here: the source commit in `notes.md` and
`adoption-manifest.json`, which named an object that does not exist in this
repository; the wish's date heading and an agent-written sentence inside it; and
the stage, from `dormant` to `refining`, since the initiative has actionable
work and a graduated output. The manifest lost its per-file hash table, which
git already keeps, and gained the second package and the reproducibility record.

## 2026-09-09 — Run the T8 editorial checklist over the 48 dataset entries

Reviewed all 48 entries against T8 and recorded per-entry findings in notes.md (editorial review). References are present; numerical evidence, confidence, quantity and geographic issues remain explicitly open. Dataset unchanged.

## 2026-09-09 — Re-baseline the goldens and run the T3-T7 browser suites

Restored current-bundle paths, pinned Python dependencies and refreshed eight macOS goldens. Core 535/535, independent browser 88/88 and cross-browser smoke 24/24 passed. notes.md (browser verification) distinguishes implemented coverage from remaining T6/T7 gates.

## 2026-09-09 — Fixed the flow visibility window

The user reported that a migration recorded as running from year A to year B
only appeared on the map from A+1 through B+5. `flowEnvelope` in
`lib/src/core.js` ramped the arc's opacity up over `RISE_YEARS` (3) after the
start year and faded it back down over `FADE_YEARS` (5) after the end year, so
the arc was invisible at the exact start year and stayed partly visible for
five years past the end year. `flowEnvelope` now returns full opacity for the
exact `[start, end]` range and zero outside it; `RISE_YEARS` is gone, and
`FADE_YEARS` remains only for the unrelated camera-focus framing in `app.js`
that shows a few years of context after a focused migration ends. The
`"rising"`/`"fading"` phase branches in `app.js`'s renderer, which no longer
occur, were removed along with them. `lib/tests/test_core.mjs` was updated to
assert the exact cutoff, and `work/index.html` was rebuilt from source; it is
no longer byte-identical to `demos/world_migration_atlas/index.html`, so
`release-rebuilt-source` now also carries this fix, on top of the trim already
recorded in `decisions.md`. `node lib/tests/test_core.mjs` passes, 534
assertions, 0 failures.

## 2026-09-09 — Release

Released to production — Demo, `e567057`. <https://knovak.github.io/siteprep/demos/world_migration_atlas/> See releases.md.

## 2026-09-09 — Release the rebuilt source after testing and explicit approval

Released to production 2026-09-09 (e567057); see releases.md.


## 2026-09-09 — Reconcile editorial representation and extend acceptance

Corrected four greater-than-twofold confidence conflicts, separated stocks,
circular movements and internal-displacement totals in visible quantity labels,
qualified aggregate map points and unreconciled destination sums, and linked
the verified Census and SlaveVoyages passages. Preserved population values and
coordinates. The 48-entry reconciliation record retains outstanding source
requirements; the editorial todo remains actionable.

Fixed dialog focus containment/return and background timeline keys, added
same-engine local-file/HTTP comparisons and keyboard checks, and extended the
existing suite to Firefox/WebKit with separate reference images. Manual
screen-reader and Windows/Linux results are unavailable on this macOS host, so
the packaging item now records that explicit external blocker. Detailed results
are recorded in test-plan.md and notes. Production is unchanged.


## 2026-09-09 — Address four review threads on PR #487

Added README guidance on confidence labels, applied checks and finding source
references. The build now renders the full 48-entry editorial reconciliation
into a companion HTML page, linked from About the data, and includes the
earlier audit's seven source locators with their verification limits.

The user chose to move the two approximate 1000 start dates to 1001. The
timeline now includes the year before the earliest migration, preserving a
blank opening map at 1000 and a first event jump to 1001. This presentation
choice is recorded in decisions.md; it is not new source evidence.

Explained that the inherited 17 ms median threshold represents the 60 fps
target; 30 ms would represent about 33 fps and would relax that target. The
question does not itself change the recorded acceptance threshold.

Verification passed 551 core assertions and all 91 Chromium browser checks.
The final offline opening-year, first-event, Home, About-to-report and return
journeys passed at desktop and 390px widths in Chromium, Firefox and WebKit.
Each report has 48 rows, nine source links, no horizontal page overflow and
no serious or critical axe findings. The evidence receipt records the final
application and report hashes.

The user then changed the performance requirement to “60 fps is preferred,
30 fps is acceptable”. Updated the specification, README, test plan and T5
checks to use a 33.33 ms acceptance limit while reporting measured cadence
against the 60 fps preference. This supersedes the threshold explanation above.

The final suites pass 91/91 Chromium checks and 90/90 each in Firefox and
WebKit. Median cadence was 16.7 ms (59.9 fps), 20 ms (50 fps), and 20 ms
(50 fps), respectively; p95 was 16.8, 21 and 21 ms. All three meet the
revised acceptance limit. Existing goldens were compared without updates.

## 2026-09-09 — Make the editorial report link readable

Addressed the follow-up on PR #487: modal links now use the atlas gold accent
for both unvisited and visited states, with a light hover color and the shared
keyboard focus outline. Rebuilt `work/index.html` from the source template.

Six local-file report-and-return journeys passed in Chromium, Firefox and
WebKit at 1280px and 390px widths. Verification covered the gold color,
hover styling, keyboard focus and activation, all 48 report rows, and return
to the link after visiting. The link has at least 9.25:1 contrast even if the
translucent modal is composited over white; the actual backdrop is darker.
The targeted axe contrast scan reported no violations; the numeric check
also covers engines where axe could not classify the translucent background.
WebKit used macOS Option-Tab to reach the link. These focused checks cover
the styling revision; the earlier full-suite evidence remains tied to its
recorded application hash. Production is unchanged.

## 2026-09-10 — Trace recent stocks and finish remaining destination inspections

Continued `reconcile-editorial-findings` with dated source locators and explicit
population definitions for Syria, Venezuela, Rohingya, Ukraine, Sudan and
Filipino overseas migration. Corrected the Bangladesh destination to the
1,005,520 registered population at December 31, 2024, qualified regional/global
coverage, attributed the Rohingya violence finding to the UN fact-finding
mission, and lowered the untraced Filipino estimate's confidence. Recorded the
Sudan retrieval limit rather than claiming a direct source-table check.

Captured and inspected all 44 remaining destination close-ups at 6×; their
findings, contact sheets and camera/input receipt are committed under `notes/`.
The report now includes six source rows, 44 destination observations and the
original 48-entry audit. Rebuilt both HTML outputs from their sources.

Validation passed 551 core assertions, 91 Chromium and 90 each Firefox/WebKit
browser checks, 78 file/HTTP packaging checks, 36 detail checks and six offline
report journeys. Explicitly refreshed only the Chromium 2015 region-legend
golden for the intended uncertainty styling and independently rechecked it;
the original threshold is unchanged. T8 and the original reconciliation todo
remain open for the unsupported fields and geographic corrections. This is
an increment, not completion of the editorial acceptance gate.

## 2026-09-10 — Historical headline and confidence continuation

Reviewed all four inherited high-confidence entries whose periods begin before
1800. Aligned the English Great Migration headline and name with American
Ancestors' approximately 20,000-person cohort and reduced confidence to medium;
reduced the untraced Acadian total to low confidence. Added source-specific
rationales for the retained transatlantic and Australian convict headline
confidence. Preserved all destination values, coordinates and periods, recorded
the baseline/revised hashes, and extended the editorial report to 102 rows.

Core checks passed 551/551; Chromium 91/91, Firefox 90/90 and isolated WebKit
90/90 passed with all reference images and thresholds unchanged. The initial
concurrent WebKit run exceeded the frame-time limit; the same suite passed
alone. Desktop/phone detail and report checks passed on all three engines with
network requests blocked. T8 remains actionable for the source and geographic
findings still recorded as unresolved.

## 2026-09-10 — Audit endpoint geometry and correct the Liberia finding

Added a reproducible, read-only audit of all 140 endpoints against the two
bundled land datasets, with hashed inputs and explicit containment limits.
Fifteen endpoints fall outside the coarse polygons, sixteen outside the
detailed polygons, and seven differ between scales. Inspected all 17 distinct
flagged/correction coordinates at world zoom and 6× in 34 local-file Chromium
captures, with no page errors and network access blocked.

Corrected the report's inaccurate offshore description of the Lebanese
West Africa point: the unchanged coordinate is inland in Liberia. Recorded
coastal and island ambiguities rather than moving endpoints to force a pass.
The data, all coordinates and populations, application sources and application
bundle remain byte-identical to the baseline. The report now has 119 evidence
rows. The audit output reproduced byte-for-byte; the original T8 reconciliation
item stays actionable for quantitative sources, regional allocations and
remaining geographic acceptance. Polygon containment does not implement the
plan's separate 300-km proximity check.

## 2026-09-10 — Reconcile Indochinese and Afghan headline evidence

Corrected the Indochinese headline and cohort label against two directly read
UNHCR texts, with an explicit lower-bound note and medium confidence. Retained
the unverified Afghan cumulative estimate with low confidence and an explicit
indexed-source access limitation. All periods, coordinates, destination
allocations and descendant values remain unchanged. The report has 121 rows;
the source receipt records changed fields and dataset hashes. The original T8
reconciliation item remains actionable for its unresolved evidence.

Core checks passed 551/551; the existing browser suites passed Chromium 91/91,
Firefox 90/90 and WebKit 90/90 without changing reference images or thresholds.
Six offline desktop/phone pointer/detail/report/return journeys passed on all
three engines. Visual inspection also reproduced a pre-existing Enter-selection
defect against main and the revised bundle in Chromium/Firefox; WebKit passed.
Recorded the exact observations and queued `fix-table-keyboard-activation`
without changing application code or claiming complete keyboard acceptance.

## 2026-09-10 — Fix Enter activation of a data-table row reopening the table over the selected detail

Consume Enter before restoring toolbar focus; add a full keyboard activation/close/reopen regression.

## 2026-09-10 — Keyboard activation and Partition source continuation

Fixed data-table Enter activation reopening the table after focus returns to
its toolbar button. The regression covers real press/release, selected detail,
focus return, Escape close and a later deliberate reopen on all three engines.

Read the Partition entry's cited research directly and recorded exact locators.
The dataset now uses its 14.5M census-based population with an explicit
post-migration label, medium confidence and a note that includes subsequent
births. The existing headline formatter rounds to 15M; the note retains 14.5M.
Removed the untraced range, superlative and numeric death claim. All destination
values, dates and coordinates remain unchanged. The report has 122 evidence
rows; the receipt preserves prior fields and hashes. This is an increment of
`reconcile-editorial-findings`, which remains actionable for the unresolved
sources, allocations, descendants and geography.

Validation: 552 core assertions; 96 Chromium, 95 Firefox and 95 WebKit browser
checks with unchanged goldens and thresholds. Six final offline desktop/phone
keyboard/detail/report/return journeys passed with network requests blocked
and no page errors. Full T6/T7 still require manual screen-reader observations
and Windows/Linux packaging evidence. T8 is not complete.

## 2026-09-11 — Measure all endpoint distances to bundled land

Added a reproducible 300-km proximity audit for all 140 endpoints using both
bundled land surfaces. Two records are flagged: the Indian Ocean regional
destination at both scales, and Mauritius only on the coarse map that omits
it. Recorded the distinction, nearest points and input/tool hashes without
changing data, coordinates, application code or the atlas bundle. The editorial
report now has 124 evidence rows.

Seven geometry tests pass, including independent dense interpolation checks;
the receipt repeats byte-for-byte, and all 552 core assertions pass. The
original editorial reconciliation todo remains actionable for unverified
quantities, allocations and historical placement. No production release or T8
completion is claimed.


## 2026-09-11 — Qualify Irish Famine quantities and ancestry evidence

Read the Library of Congress arrival account, NARA passenger-record discussion
and Census Bureau ancestry article directly. Reduced the untraced Irish
Famine headline from high to low confidence and explained why US arrivals,
worldwide departures and ancestry responses cannot verify the inherited
allocations or famine-cohort descendants. Preserved all numeric values, dates
and coordinates; recorded exact field changes, source limits and dataset hashes.
The report now contains 127 evidence rows.

Validation passed 552 core assertions and 96/95/95 Chromium/Firefox/WebKit
checks without changing reference images or thresholds. The original editorial
reconciliation todo remains actionable; T8 is not complete.
