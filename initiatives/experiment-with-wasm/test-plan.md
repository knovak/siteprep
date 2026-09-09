# Test plan

- Run actual WASM SQLite, checking SQL selection results against the original JavaScript reference across exact/prefix/contains/Unicode/boolean cases.
- Test HTML/JSON deduplication and round trip; collections; verdicts/tags/undo; saved/history selections; sitting reports; local images and database backup/restore.
- Import a mixed legacy HTML export containing web links, bookmarklets, local files, mail links and browser-internal bookmarks. Retain all entries through JSON export/import, reload and full backup/restore; verify only HTTP(S) titles link anywhere and non-web records execute nothing. Malformed URLs must still roll back the entire file.
- Verify invalid imports and failed saves are atomic; stale revisions cannot overwrite another window's changes; corrupt/wrong-schema backups are rejected.
- Open the generated HTML through file:// with all network blocked. Import, filter, tag, judge, undo, export, reload and verify data is retained. Exercise desktop and phone layouts and local pictures.
- Confirm the bundle contains a real validated WASM binary; remove/disable WebAssembly and require a clear startup failure rather than a JavaScript fallback.
- Measure a generated 5,600-bookmark workload and record actual timings.
- Run npm run build at repository root after the final source changes. Capture and inspect desktop and phone screenshots after that build.

## Tide Here

- Validate checksums of all 376 source tiles before packing and of committed data before each normal build. Confirm 65,203 points and 34 constituents without synthetic fixtures.
- Compare real WASM against recorded original full-precision FES forecasts for 12 cases covering the Americas, Europe, Africa, Asia, Oceania and a 2036 date. Require matching event types/counts, times within one second and heights within 0.00001 m. These are implementation parity checks, not new empirical model-accuracy validation.
- Exercise five coast-local days across 23/25-hour DST days and the date line; polar sun never-rise/set states; finite geographic coverage; invalid coordinates and unknown/ambiguous names.
- Copy only the HTML into an unrelated directory, disable networking, and calculate five different coasts. Require five cards, tide events, astronomy and zero HTTP(S) requests.
- Verify alternate-point selection, future dates, geolocation rejection, history reload/export/restore, storage-quota failure and startup failure without a tide fallback. Clear browser storage and require the embedded model still to calculate.
- Inspect desktop and phone screenshots after the final repository build. Chromium is the currently verified engine; Safari and Firefox acceptance remains an actionable follow-up.

## Static demo

Four website checks compare every release file against `work/site/` except `demo.json`, verify the complete wish and local links/anchors, follow both app links through a plain static HTTP server and exercise them after networking is disabled, and check a 390-pixel layout with contained table scrolling. App HTML hashes must remain unchanged. Capture the final landing, findings and Demo TOC screenshots after the root build, then verify the branch preview after CI publishes it.

Before a production release, CI sets `WASM_DEMO_ROOT` to the absolute `work/site/` directory to exercise the staged preview without requiring `demos/` to change. Use the default target for the complete release comparison when publishing to production.

## Browser compatibility follow-up

- Run all three Playwright suites with `WASM_BROWSER=firefox`; keep the default Chromium projects unchanged for CI.
- Run the static demo with `WASM_BROWSER=webkit WASM_DEVICE='iPad Pro 11'` to exercise its mobile user agent, 834 × 1194 viewport, touch input, offline post-load actions and reload persistence.
- Test downloaded files in the installed Safari and Firefox applications, including a separate-copy backup restore, before claiming direct-file compatibility.
- Treat Playwright WebKit as engine evidence, not as an installed Safari or physical-iPad result. Keep actual-iPad Files/Home Screen testing open until a person supplies that result.

## Online controls

- Import an export URL, fetch inert website metadata and a real image, and verify reload/full-backup retention without changing original fields or attached pictures.
- Exercise explicit Microlink screenshot mode, blocked direct websites, HTTP 429, cancellation and phone layout. Embedded remote HTML must not execute scripts or request tracking images.
- Search an online address, choose NOAA and CHS stations, verify five-day output and the correct provider/datum, then exercise cached fallback and return to the local model.
- Cancel a slow station request, choose a new coast, and verify the old request cannot replace the new location.
- Check transport timeouts, download limits, credential omission, malformed provider data, partial catalogue failure, cache limits and quota failures.
- Preserve all existing WASM parity and offline tests. Check live NOAA, Photon and Microlink separately from deterministic fixtures, and report provider/browser failures explicitly.


### Default online regression checks

- Submit San Diego through Show tides; verify Photon and NOAA requests, station 9410170, MLLW, and five days without clicking separate online controls.
- Resolve a beach/street address absent from the bundled catalogue through the same form.
- Distinguish city/county labels, use provider ranking for online places, retain choices for ambiguous offline names/stations, and preserve the 25 km / 0.6 automatic match thresholds.
- Verify CHS automatic selection with controlled responses, failed search/prediction fallback, no-network local-only use, and late/cancelled requests.
- Verify coordinates, deep links, geolocation, Today/history and return to the model use the intended source path. Offline tests explicitly disable online availability; they do not rely on the default being offline.

### Website parity corrections

- Submit plain San Diego with ranked California city, county, Texas city and university results; load NOAA Broadway automatically and keep alternative places in collapsed options.
- Confirm First day/Today controls are absent and old date fragments cannot move the forecast away from coast-local today.
- Submit Maroochydore online and offline; require Mooloolaba, Bureau attribution, LAT and Australia/Brisbane today. Compare all five days with the hosted provider, including additional Sydney DST and Cocos cases.
- Move the clock to a five-day window crossing December 31; require an explicit annual-coverage explanation and a full model forecast.


### Repeatable live-coast evidence

From `work/tide-here/`, run `node test/live-coasts.mjs /tmp/wasm-live-coasts.json`
after root `npm ci`. This opt-in network collector is outside deterministic CI.
It covers San Diego, Seattle, Boston, Pensacola, Honolulu, Anchorage, Victoria,
Halifax and St. John's in Chromium/Firefox, including provider event parity and
coast-local calendar placement. It records provider failures and explicit local
choices; a safe model result does not count as successful official coverage.
See the dated run in `verification.md` for limitations and evidence.
