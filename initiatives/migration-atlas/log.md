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
