# Test plan

- Run actual WASM SQLite, checking SQL selection results against the original JavaScript reference across exact/prefix/contains/Unicode/boolean cases.
- Test HTML/JSON deduplication and round trip; collections; verdicts/tags/undo; saved/history selections; sitting reports; local images and database backup/restore.
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
