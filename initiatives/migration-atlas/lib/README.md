# Atlas development package

The source the atlas is built from. `work/index.html` is the output: the file
the branch preview publishes and the file a release copies to
`demos/world_migration_atlas/`. Nothing here is published.

This package was supplied by the user on 2026-09-07, two months after the atlas
was written, and restores what the first adoption could not find. Before it
arrived the repository held only the built bundle, so the dataset could not be
changed except by editing a minified megabyte by hand.

## Build

```bash
python3 lib/tools/build.py      # from the initiative directory
```

It inlines `src/core.js`, `src/app.js`, the two vendored d3 modules, the
dataset, and both basemap resolutions into `src/index.html` at the
`<!--BUNDLE-->` marker, and writes `work/index.html`. It also renders
`notes/editorial-reconciliation-20260909.md` through the repository Markdown
renderer into `work/editorial.html`, using `lib/src/editorial.html` as its
page template. This requires Python 3 and Node.js; it uses no network or extra
packages. The app links to this companion report from About the data. Keep
both HTML files together for offline reading; the app itself remains
self-contained. Edit the Markdown or template and rebuild, rather than
editing the generated report.

The report can contain several tables (source checks, destination inspections
and the original 48-entry audit). Each table's scroll region has a general
editorial-evidence label rather than claiming that every table has 48 rows.
The September 10 source notes distinguish verified dated populations from
untraced allocations; numerical changes require a source locator and an
observation date in the entry and report. The 44 remaining destination
close-ups and their camera/input receipt are under
`notes/destination-inspection-20260910*`; inspection coverage does not imply
that a schematic multi-country endpoint is geographically accepted.

The build is deterministic: running it over an unchanged source rewrites the
same bytes. That is worth checking after any change, because it is what lets a
reader confirm the published bundle came from this source:

```bash
sha256sum work/index.html && python3 lib/tools/build.py && sha256sum work/index.html
```

## Adding a migration

1. Add the record to `lib/data/migrations.json`, following the schema in
   [`spec.md`](../spec.md) section 3. Every entry needs a cited source, a
   confidence rating, and a type from the coercion spectrum.
2. Run `node lib/tests/test_core.mjs`. `validateData()` enforces the schema and
   the semantic rules, and the same function runs in the browser, so a record
   the tests reject is a record the app rejects.
3. Run `python3 lib/tools/build.py` to rebuild `work/index.html`.
4. Push the branch. The build publishes the preview; a person releases.

The running app also accepts a `migrations.json` dropped onto the window, which
validates and loads it without a rebuild. That previews new research; it does
not persist it.

## Reproduce the endpoint geometry audit

From the initiative directory, run:

```sh
python3 lib/tools/audit_geography.py --output /tmp/atlas-geography.json
```

This read-only command needs Python 3 and Node.js, with no added packages or
network. It applies the vendored spherical `d3.geoContains` to every source and
destination against both bundled land files, recording input hashes and counts.
Without `--output` it writes JSON to stdout. It returns evidence for review;
outside-polygon flags do not fail a build or certify a historical location.
The plan's 300-km proximity requirement is a separate, still unimplemented
check. The map scale names mean 1:50 million and 1:110 million, not metre-level
accuracy; small islands and coasts can change classification between scales.

The September 10 receipt covers 140 endpoints. Seventeen distinct coordinates
(all flags plus the previously misdescribed Liberia point) were inspected at
world zoom and 6×, using the blank opening year to isolate the basemap. The
camera/application-hash receipt and contact sheets are under `notes/geography-*`.
Pink rings in those screenshots are test annotations, not shipped UI. This
corrects the report's offshore description of Liberia without changing any
coordinate or population; migration playback and regional allocations remain
separate T8 work.

## Tests

| Command | Gate | Needs |
|---|---|---|
| `node lib/tests/test_core.mjs` | T1 data validation, T2 scaling/clock/determinism, E2 and E6 spectra | nothing - 535 assertions, runs anywhere |
| `python3 lib/tests/test_browser.py` | T3 visual regression, T4 interaction, T5 performance, T6 accessibility | Python `playwright`, `numpy`, `Pillow` |
| `python3 lib/tests/test_crossbrowser.py` | T7 Chromium, Firefox and WebKit | the same, plus all three browsers |
| `python3 lib/verify.py` | screenshot smoke pass over the built bundle | Python `playwright` |
| [`lib/tests/T8_editorial_checklist.md`](tests/T8_editorial_checklist.md) | T8 sources, confidence and type, by hand | a reader |

The repository installs Node Playwright. The Python browser dependencies are
pinned separately in `tests/requirements.txt`; use a virtual environment:

```bash
python3 -m venv /tmp/migration-atlas-tests
/tmp/migration-atlas-tests/bin/python -m pip install -r lib/tests/requirements.txt
# Only when the matching browser builds are missing:
/tmp/migration-atlas-tests/bin/python -m playwright install chromium firefox webkit
/tmp/migration-atlas-tests/bin/python lib/tests/test_browser.py
/tmp/migration-atlas-tests/bin/python lib/tests/test_crossbrowser.py
```

Both suites read the current `work/index.html` bundle. On September 8, 2026,
the eight goldens were deliberately re-baselined on macOS arm64 / Playwright
1.57.0, followed by an independent 88/88 comparison run and 24/24 cross-browser
smoke checks. A baseline refresh is explicit: pass `--update-goldens`, inspect
the eight images, then rerun without that flag. Do not update images simply to
make an unexplained difference pass.

[Browser verification](../notes.md) records the
machine, exact coverage and broader T6/T7 gates the inherited suites do not
implement. [Editorial review](../notes.md) records
findings for all 48 entries; passing schema tests does not establish T8.

## Layout

```
lib/
  src/index.html        shell and styles, with the <!--BUNDLE--> marker
  src/core.js           projection, scales, clock, validateData()
  src/app.js            rendering, camera, timeline, panels, filters
  vendor_d3array.js     vendored d3-array
  vendor_d3geo.js       vendored d3-geo
  data/migrations.json  the dataset - 48 movements, the source of truth
  data/basemap/         Natural Earth land at 110m and 50m, plus the raw
                        50m GeoJSON the simplified copy came from
  tools/build.py        the build
  tests/                T1-T8 as described above
  verify.py             screenshot smoke pass
```

`data/basemap/ne_50m_land_raw.geojson` is an upstream input. Nothing reads it -
`land50.json` is the simplified copy the build inlines - and no script in this
package regenerates one from the other. It is kept because it is the only copy
of where the basemap came from.


## Extended macOS browser and packaging checks

Run the full interaction/visual/accessibility suite in each engine:

```sh
ATLAS_BROWSER=chromium python3 lib/tests/test_browser.py
ATLAS_BROWSER=firefox python3 lib/tests/test_browser.py
ATLAS_BROWSER=webkit python3 lib/tests/test_browser.py
python3 lib/tests/test_packaging.py
```

Use the pinned Python environment above. `ATLAS_URL` can target a served copy,
`ATLAS_RESULTS_DIR` separates temporary screenshots, and
`ATLAS_PACKAGING_REPORT` chooses the packaging JSON output. The packaging test
starts its own loopback-only HTTP server and closes it after comparing six
file/HTTP scenes and both dialog keyboard paths in all three engines.

Chromium keeps the original eight images under `tests/goldens/`. Firefox and
WebKit have separate directories below it, created explicitly with that
engine's `--update-goldens`, inspected, then compared in a separate run. Do not
raise thresholds or regenerate a baseline to conceal unexplained differences.
Firefox does not expose Playwright's `is_mobile` option, so its narrow-viewport
checks use geometry and touch capability without claiming mobile-browser emulation.

T5's performance and heap thresholds retain the original fixed Chromium runner.
Other engines report frame cadence without claiming those thresholds, and cannot
use Chromium-only `performance.memory` or forced GC. About, legend and stock
detail states join the existing axe checks. Actual assistive-technology speech
and Windows/Linux remain separate acceptance evidence.

## September 10 keyboard and Partition continuation

Data-table Enter activation consumes the browser's default key action before
closing the modal restores focus to its toolbar button. The T4 regression uses
real key presses, checks the selected detail and restored focus, closes it,
and verifies that a later Enter still opens the table normally.

The `post-migration-population` quantity kind labels a census cohort that can
include children born after arrival. The Partition source receipt records its
field changes; the report explains the population definition and unresolved
allocations. This label is shared by detail, tooltip and table presentation.
