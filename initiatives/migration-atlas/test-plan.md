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
