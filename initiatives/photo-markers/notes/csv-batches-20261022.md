# CSV batches — October 22, 2026

Phase 4 adds import/review, inherited batch defaults and explicit row edits,
frozen generation jobs, progress/cancellation/selected retry, deliberate JPEG
and ZIP-part retrieval, immutable part manifests and a final run report.
See [BATCH_TECHDOC](../BATCH_TECHDOC.html) for ownership and reproduction.
Source hashes and the exact bundled Pillow interpreter are retained in
`work/pipeline/evidence/batch/tested-source.json`.

## Evidence

The locked root and pipeline installs passed. All 64 pure tests pass: the
existing 45 settings/time cases plus 19 CSV/batch cases. These cover exact
100-row and 1 MiB bounds, quoting/BOM/source-line identity, blank-cell records,
invalid headers/values, precedence and restoration, loaded font keys, safe
unique filenames, ten independent time expectations, frozen selected retries,
packaging failure, immutable manifests, and cancellation with a late result.
The actual 50 MiB accounting test uses injected 9 MiB outputs to force early
parts, a space pause, explicit acknowledgment and resume; another probe
rejects a 51 MiB output without an endless pause. A lower part target exercises
individual delivery above a part target. These are allocation/state tests,
not measurements of physical-device memory. An initial test caught inadequate
space for later download Blobs; final admission counts their copies up front.

Both Chromium 143.0.7499.4 and WebKit 26.0 pass nine browser scenario groups,
with no page exceptions. The UI serves under `/nested/markers/` and exercises
invalid imported values, explicit exclusion/correction/restoration without
renumbering, row-edit inheritance, imported HTML as text, the ten-row mixed
fixture at 2000 pixels, individual and ZIP downloads, previous-settings labels,
acknowledgment/release, and the complete report. Both engines then import and
generate offline without any HTTP attempts, cancel a 100-record 256-pixel run,
retry one selected record across a changed clock, and complete all remaining
records with the original frozen time. Every obtained part is extracted and
its membership/hashes checked; later parts preserve the earlier run/part IDs.

Native Pillow 12.3.0 independently decodes all 220 extracted JPEGs and checks
dimensions, hashes, Software, and all six exact EXIF timestamp/offset fields
against explicit expected fixture constants. The browser receipt retains the
actual downloaded ZIPs, individual JPEGs and reports; the native oracle receipt
is `work/pipeline/evidence/batch/independent-files.json`. The ten-record UI runs
observed 4.86 seconds in Chromium and 3.97 seconds in WebKit, including final
packaging; these are single regression observations, not T11's repeated cold/
warm benchmark. Automated axe and horizontal-overflow checks pass at 1280,
430 and 320 pixels in both engines. The existing single-editor browser journeys
are also rerun as regression coverage.

## Ownership limits and next work

No automatic download or assumed save occurs. Each accepted binary owns its
byte array and accounted delivery Blob. Stored ZIP packaging does not re-encode
JPEGs; header/UTF-8/manifest and temporary delivery allocations are reserved.
The 25 MiB payload target is an upper bound, with earlier splitting or a pause
when the 50 MiB compressed-output budget requires it. Files that cannot fit
with their delivery copy fail with a size correction. Total raster, WASM,
decoder and browser-process peak memory is not measured by this accounting.

Local T6–T8 coverage is established by these fixtures and injected faults;
complete device/branded-browser, real screen-reader, native keyboard/zoom,
performance and process-memory acceptance remains Phase 5. Physical iOS and
Files retrieval remain the existing user-owned data item. No photos were
imported into a library, no account or processing service is used, and no
production output or Test deployment was created. Photo markers has no
`deployments` declaration. Phase 5 is seeded from the existing plan; graduation
and release remain the user's choice.
