# Test plan

## What runs today

The development package restored on 2026-09-07 brought the original suites with
it, so the inherited gates are runnable rather than historical. `lib/README.md`
has the commands.

| Gate | Covers | State |
|---|---|---|
| T1 | Dataset schema, semantic rules, coordinates, references, invalid-record rejection | Runs. `node lib/tests/test_core.mjs` - 535 assertions, 0 failures on 2026-09-07 |
| T2 | Population scaling, clock boundaries, camera behavior, deterministic reverse scrubbing | Runs, in the same command |
| E2, E6 | Coercion spectrum and region spectrum ordering | Runs, in the same command |
| T3 | Fixed-year and fixed-camera visual regression, reduced motion | Runs with pinned Python dependencies; eight goldens re-baselined September 8, 2026 |
| T4 | Timeline, selection, filtering, zoom and pan, keyboard, legends, WebView guards, responsive controls | Runs with the same pinned packages |
| T5 | Playback frame time, first render, bundle size, memory stability | Runs with the same pinned packages |
| T6 | Accessibility automation, contrast, reduced motion; `tests/axe.min.js` is vendored | Runs with the same pinned packages |
| T7 | Chromium, Firefox and WebKit, local file against served | 24/24 inherited smoke checks pass on all three engines; broader packaging gates remain open |
| T8 | Cited-source review, justified confidence and type | 48-entry review recorded; T8 acceptance remains open |

T1, T2, E2 and E6 use the repository's Node installation. Browser dependencies
are pinned in `lib/tests/requirements.txt` and installed in a Python virtual
environment. Both browser suites read `work/index.html`.

On September 8, 2026, the core run passed 535 assertions, the golden-generation
run passed 79 checks, a fresh golden-comparison run passed 88 checks, and the
three-engine smoke suite passed 24 checks. See
[browser verification](notes.html) for reproducible
commands and exact limitations: the original plan's full T3/T4 cross-engine,
HTTP/file equivalence, Windows/Linux and manual screen-reader gates are not
established by the inherited scripts.

The new macOS arm64 goldens were inspected before a separate comparison run;
re-baselining is still an explicit action, not an automatic failure remedy.
The [48-entry editorial report](notes.html) documents
confidence, quantities, sources and map representation that need follow-up.

`validateData()` is shared between the test gate and the in-app loader, so a
record T1 rejects is a record the running app rejects when it is dropped onto
the window. That is the check that matters most for new research.

## The build is its own test

`python3 lib/tools/build.py` is deterministic: over an unchanged source it
rewrites the same bytes. Rebuilding and comparing hashes answers whether the
published bundle came from the committed source, and is worth doing after any
change to `lib/`. It was verified on 2026-09-07 against
`work/index.html` at `38f40ff2a445ce8c96896e4269ce981a76e0eb88aee24888b9fdebbe8ac8eb1e`.

## Adoption verification

Done on 2026-09-07 and recorded in [log.md](log.html): hashes compared against
both source packages, the repository build run with its own checks, and a
Chromium pass over the atlas covering initial render, timeline movement, legend
and color toggles, the data table and a detail panel, search, playback, wheel
zoom and drag pan, and a 390x844 touch viewport. That is a smoke check, not a
substitute for the gates above.

## User testing and release

The user tests the deployed preview - timeline navigation, zoom and pan, what
the flows and circles mean, legends, filters, details, and the touch layout -
and records findings. Any fixes belong in a later scoped change. Production
needs a separate explicit release instruction; see the `release-rebuilt-source`
item in `initiative.json` for what a release changes.


## September 9, 2026 extension

The core suite passes 548 assertions after the editorial corrections. All
population values and coordinates were compared against the prior dataset and
preserved. The [48-entry reconciliation](https://github.com/knovak/siteprep/blob/6bb9c23bf4d800695883221392e97de1e8569a16/initiatives/migration-atlas/notes/editorial-reconciliation-20260909.md)
distinguishes the corrections from unresolved numeric and geographic sources;
T8 remains open and the original editorial todo remains actionable.

The new [packaging evidence](https://github.com/knovak/siteprep/blob/dfa53eed4ac81948a8840602bd251c69ed925cde/initiatives/migration-atlas/notes/packaging-20260909.json) records six identical
file/HTTP screenshots in each of Chromium, Firefox and WebKit, plus 60 keyboard
checks: 78 checks passed on macOS. Dialog focus now stays inside the dialog,
returns to its opener, and does not let reading keys scrub the map. Keyboard
selection opens stock-labelled detail, which explains schematic geography.
The report's SHA-256 matches the current bundle.

The full T3/T4/T6 suites passed 91 checks in Chromium and 88 each in Firefox and WebKit. Separate Firefox/WebKit
reference images were explicitly generated and visually inspected before
independent comparison runs; the Chromium goldens remain unchanged. The pixel
threshold remains 0.5%. T6 now includes About, legend and stock detail as well
as the original main/table/filter views.

At the original September 9 run, Firefox/WebKit measured about 20 ms and did
not establish the then-current 17 ms median target. The revised target below
supersedes that threshold. Actual manual screen-reader speech and Windows/Linux
file/HTTP comparison remain external blockers on `extend-packaging-acceptance`.


## September 9 review follow-up verification

The [review follow-up receipt](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings/initiatives/migration-atlas/notes/review-followup-20260909.json)
records 551 core assertions, 91 Chromium suite checks, and six final offline
journeys across three engines at desktop and 390px widths. These verify the
blank 1000 opening view, first event at 1001, Home, the About link, all 48
report rows, nine source links, accessibility and return navigation.

The earlier packaging receipt applies to its recorded bundle hash; its
file/HTTP screenshot comparison was not repeated for these follow-up edits.
The user revised the requirement to **60 fps is preferred, 30 fps is acceptable**.
T5 now accepts median and p95 frame times up to 1000/30 ms (33.33 ms) in each
engine, and reports the observed median fps against the 60 fps preference.
The existing bundle-size and Chromium heap limits remain. These are results
for the test machine, not a guarantee for every physical device.

Final reruns under that requirement passed 91 Chromium checks and 90 each
in Firefox and WebKit. Median frame times were 16.7, 20 and 20 ms, with
p95 of 16.8, 21 and 21 ms respectively. All three meet the acceptable target
on this test machine; no golden images were changed.

## September 10, 2026 source and destination continuation

Six records have revised source/quantity notes. The Rohingya Bangladesh
destination's two population fields now use the same registered December 2024
stock, 1,005,520; all other population values and every coordinate are preserved.
The Filipino confidence change intentionally draws its routes as uncertain.
T8 remains open for untraced allocations, historical descendant figures,
confidence exceptions and corrections to the schematic geography.

The 44 remaining destination records were captured at 6× and inspected in
four contact sheets; the original 48 first-destination checks remain the
earlier run's evidence. The [new observation receipt](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/destination-inspection-20260910.json)
records the baseline dataset hash, sample years, cameras and findings. No
geographic acceptance is inferred from the absence of rendering errors.

Verification on macOS arm64 with Playwright 1.57.0:

- 551 core assertions passed.
- 91 Chromium, 90 Firefox and 90 WebKit browser checks passed, including the
  existing interaction, accessibility, performance and visual gates.
- [Packaging receipt](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/packaging-20260910.json):
  all 18 same-engine file/HTTP screenshot comparisons were identical; all 60
  keyboard checks passed.
- [Detail and report receipt](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/detail-and-report-20260910.json):
  36 detail checks and six report journeys passed at 1440px and 390px across
  all three engines with HTTP/HTTPS requests blocked. Source dates, population
  caveats, the low-confidence badge, report links and all 98 rows (6 source,
  44 destination, 48 original audit) were present without horizontal page or
  detail-panel overflow or uncaught JavaScript errors.

Only Chromium's `g8_2015_region_legend.png` was refreshed, explicitly, after
inspection. The old golden already differed from unchanged main by 0.430%
(including the previously changed legend and Venezuelan route); the intended
Filipino uncertainty styling brought the difference to 0.519%, above the
unchanged 0.5% limit. The new frame was inspected and a separate full Chromium
run passed against it. The other 23 reference images and all thresholds were
left alone. Actual screen-reader observations and Windows/Linux packaging
remain outside these macOS checks.

## September 10, 2026 historical headline review

Four entries beginning before 1800 were reviewed against the high-confidence
exception rule. The source receipt records their old/new confidence values,
the single changed population field (New England 21,000 to 20,000), and the
preservation of every coordinate and destination value. The editorial report
contains four new evidence rows, bringing its total to 102.

Verification on macOS arm64, using the existing pinned Playwright 1.57.0 suite:

- 551 core assertions passed.
- Chromium passed 91/91 and Firefox 90/90 browser checks. WebKit passed 90/90
  when run alone. Its first concurrent run passed 89/90, missing only the
  33.33 ms p95 frame-time limit at 40.0 ms while all three browser suites ran
  together; the isolated rerun measured 21.0 ms with the same unchanged limit and code.
- All 24 existing golden images passed comparison without replacement.
- Four revised detail-to-report journeys at desktop and phone sizes in each
  of the three engines passed with HTTP/HTTPS requests blocked: 24 journeys,
  every new source row/link present, no page or detail horizontal overflow,
  and no uncaught page errors. The review receipt is in
  `notes/historical-browser-review-20260910.json`.

The reviewed title, count and confidence badges are visible in the details;
Acadian uncertainty uses the existing dashed-flow treatment. The geography and
unverified descendant estimates are disclosed, not accepted. These macOS
checks do not settle T8, manual screen-reader observations or Windows/Linux
packaging acceptance. The prior packaging receipt remains evidence for its
recorded dataset, not a new run on this revision.
