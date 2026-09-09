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
`<!--BUNDLE-->` marker, and writes `work/index.html`. No network access, no
package installation, and no build dependencies beyond Python 3.

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
