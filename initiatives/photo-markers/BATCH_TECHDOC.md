# Photo markers CSV batches

Phase 4 adds `work/pipeline/batch.html` alongside the single-image editor. Both
pages use the existing serial WASM pipeline and strict settings/time resolver.
The mode links navigate between pages: save output and settings first. There
is no backend, project persistence, deployment declaration or graduation here.

## Reproduce

From the repository root, run `npm ci`. In `initiatives/photo-markers/work/pipeline`:

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:batch
python3 test/verify-batch.py
npm run test:editor
```

The independent verifier requires native Pillow; use the interpreter named in
the receipt. Provision the repository's locked Playwright browsers only if
they are unavailable. Serve `dist/` on a local HTTP server and open `batch.html`.
The build packages pinned fflate 0.8.3 and retains its MIT notice. The font and
all export assets remain local after initial preparation.

## Import, review and freezing

`csv.mjs` parses UTF-8 CSV after the UI checks bytes and rejects invalid UTF-8.
The parser accepts BOM, CRLF/LF, commas/escaped quotes in quoted fields and
quoted newlines; title validation subsequently rejects multiline titles.
Headers are exact lower-case names from `columns`. Duplicate/unknown headers,
malformed quoting and column-count errors fail import. At most 100 data
records / 1 MiB are admitted. Physical empty lines are ignored and counted;
blank-cell records, including `""` in a one-column file, remain real records.
Logical IDs are assigned before validation and exclusion; physical source
lines are separate. Restoring/excluding a row cannot renumber its neighbors.

The row-edit layer overrides nonblank CSV cells, which override displayed
batch style/zone defaults. Empty style edits inherit; explicit blank title,
date, time or occurrence edits clear those fields. Restore inheritance removes
the edit. Title/date/time never inherit the other editor. Loaded font keys are
checked locally; URLs and filesystem paths cannot be fetched. Unused colors
are still validated, and unused design/occurrence fields are identified.

Review shows every resolved filename and time; repeated times expose both
offsets/instants in the record detail. Draft previews remain provisional.
Generate refuses any included invalid row, freezes one current instant and
all resolved jobs, and remaps pipeline IDs to immutable imported record IDs.
Original CSV values and edits travel in the final report, including excluded
invalid records. Subsequent review changes label the old run as previous
settings. Retry selected failed/cancelled records reuses the original jobs.
Successful rows are not rerendered. New runs require releasing old output.

## Output ownership and accounting

`batch.mjs` owns run states, JPEG bytes, download Blob URLs, ZIP parts and the
lightweight report. Only the existing verified pipeline can make a row
successful. Progress/cancel preserve completed files. Worker cancellation and
generation tokens reject late completions, including interrupted packaging.

The 50 MiB compressed-output budget counts each owned JPEG byte array and its
download Blob, each ZIP array and its Blob, plus admission reservations. URLs
are created with successful admission so an accepted result has a retrievable
download without needing an unbudgeted later copy. Repeated clicks reuse the
same URL. Before generation, reserve up to two copies of an explicit
`3 * side² + 65536` JPEG allowance, capped by the total budget. This allowance
is an application admission ceiling, not a universal JPEG size theorem. An
output exceeding it or unable to fit its delivery copies fails with a size
correction; it cannot create an endless save/resume loop. Raster/decoder/WASM
allocations are separate from compressed-output accounting; this is not a
measurement or cap of total browser-process memory.

fflate `zipSync` uses `level: 0`: its pinned source stores the original JPEG
arrays directly, computes CRCs and allocates one final ZIP array. JPEGs are
not re-encoded. Admission reserves twice the exact stored-ZIP upper bound for
that array and its delivery Blob, four manifest-byte lengths for text/encoding,
and 64 KiB of headroom. The bound includes UTF-8 filename bytes, local/central
headers and the end record. Parts contain at most 25 MiB of JPEG payload and
split earlier when the output budget requires it. The next generation can
trigger a flush/pause before consuming packaging space. If a part cannot fit,
individual retained JPEGs remain downloadable. Files above the part target
are handled individually when their bytes and delivery copy fit the budget;
otherwise they fail with a size correction. Packaging exceptions retain all
verified individual files and can be retried explicitly.

No browser download is automatic. The user deliberately retrieves each ZIP or
JPEG, checks their saved file, and chooses an acknowledgement or discard.
Acknowledgement records only the user's report. Releasing a part revokes both
its URL and its included individual URLs; released rows cannot be downloaded
or repackaged from this page. Status, hashes, size, settings and part assignment
remain in the final report. An excluded/ungenerated row is never relabeled as
a successfully saved or discarded binary.

Each immutable part manifest contains run ID, timestamp, part number and only
that part's verified filenames/settings/time/hashes. Later retries produce new
parts and cannot revise an earlier obtained manifest. The final report adds
all original records, failures/cancellations/exclusions, current availability
and memory accounting. Settings export is a separate JSON artifact containing
defaults, original CSV cells, edits and exclusions, without binary output or
local font files. A single small auxiliary URL is reused for template,
settings and report downloads, separately from the compressed-image budget.

## Verification and limits

Pure tests cover CSV syntax/bounds, exact time fixtures, inheritance, IDs,
font-key rejection, frozen retries, packaging failure, byte-preserving ZIP
extraction, synthetic output limits and late cancellation. Resource faults use
injected byte sizes/packaging; they do not establish physical-device capacity.
Browser journeys generate and retrieve actual 2000-pixel mixed batches and
100-record 256-pixel batches in Chromium/WebKit, through cancellation, selected
retry, offline operation and multiple obtained parts. Native Pillow checks
retrieved JPEG dimensions and all six EXIF date/offset fields against explicit
fixture expectations. Automated accessibility/layout checks cover 1280/430/320
pixels. Full branded-browser, physical-iOS/Files, screen-reader, keyboard/zoom,
performance and process-memory acceptance remain Phase 5 work.
