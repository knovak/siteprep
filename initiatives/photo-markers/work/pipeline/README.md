# Verified export pipeline

Phase 2's browser export core. It provides frozen settings/time resolution,
serial WASM JPEG exports and independent final-byte verification. It has no
editor, CSV interface, download/ZIP manager or production deployment yet.

## Reproduce

Install the repository browser tools with `npm ci` at the repository root.
From this directory, using the already provisioned Playwright browsers:

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:browser
python3 test/verify-files.py
```

The last command needs an independent native Pillow installation. The receipt
records the version actually used. Build prepares only the selected runtime:
browser font/raster APIs plus jSquash/MozJPEG WASM. The parent directory retains
the earlier two-route comparison as development evidence; it is not a runtime
dependency of this pipeline.

`dist/` is generated and ignored. Runtime consumers need `client.js`,
`worker.js`, `mozjpeg_enc.wasm`, `NotoSans-Bold.ttf` and `notices/`. The build also
produces an internal test runner/probe; those are not the future release UI.
`build-inputs.json` records exact bundle/asset hashes and the lockfile hash.
All runtime dependencies are bundled locally, and the font comes from a pinned
commit with a checked SHA-256. Only build preparation may download assets.

## API

```js
import { ExportPipeline } from './dist/client.js';

const pipeline = new ExportPipeline({
  onProgress: ({ stage, runId, rowId }) => console.log(stage, runId, rowId)
});
await pipeline.ready();
const run = pipeline.createRun([
  { title: 'Baltics', date: '2026-10-21', timezone: 'Australia/Brisbane' }
]);
const result = await pipeline.export(run.jobs[0]);
// result.bytes is obtainable only after final JPEG verification succeeds.
// The later editor may offer it through a deliberate download action.
pipeline.close();
```

`createRun` captures now once, resolves each row, and deeply freezes the run and
its jobs. Date-only means midnight in the selected zone; both time fields
blank mean the captured instant. `pipeline.export(job)` queues one job behind
the previous one, returning bytes, SHA-256, verified dimensions/tags, resolved
settings, font identity, geometry and text bounds. Jobs belong to that pipeline
session. Preserve them in UI state to retry after `cancel()` or worker failure;
do not create a new run when retrying now-based rows.

`cancel()` terminates the worker and rejects active/queued work. Already
returned bytes are owned by the caller and remain available. New exports
restart the worker from retained local code/WASM/font bytes. An AbortSignal
passed as the second export argument cancels the active generation; queued
jobs from that worker epoch are also cancelled. `close()` additionally releases
the pipeline's runtime/font references. UI result ownership and compressed
output budgets belong to the later delivery layer.

`loadFont(key, arrayBuffer)` registers a local TTF/OTF under a new key, without
uploading or fetching a font URL. Keys cannot replace earlier fonts, so retries
keep the same file. Fonts are limited to 16 MiB and must parse, load and contain
every requested glyph. The font's name/hash are returned with each result.
Reloading the page loses session-local fonts. Unknown font keys and corrupt or
unsupported files fail before a successful export.

Input names follow the specification: `title`, `shape`, `size`, `font`,
`outline_width`, five `*_color` fields, `date`, `time`, `timezone`, and
`occurrence`. Unknown settings, non-integer/out-of-range sizes or outline
widths, invalid colors, control characters, missing glyphs and unfit titles
fail explicitly. Supported named colors are `friendlyColors` in `settings.mjs`;
opaque three/six-digit hex is normalized. Shape switches preserve unused
color values; supplied unused colors are still validated. Output remains
quality 95, baseline 4:4:4.

## Time, metadata and worker contract

Temporal polyfill 0.5.1 is bundled; timezone rules come from the host's Intl
implementation, not a fetched timezone service or universal native Temporal.
Years 1900–2099 are accepted only where the exact offset can be represented as
EXIF signed `HH:MM`. For example, Paris at 1900-01-01 has a seconds-bearing
offset and is rejected visibly. Nothing silently rounds that offset or shifts
the requested wall time. Gaps/skipped midnights fail; a repeated time returns
two explicit offset/instant choices until Earlier or Later is supplied.
Browser-zone detection failure returns a visible `timezoneFallback` flag.

The worker revalidates the frozen snapshot, checks glyph coverage and fit,
draws, encodes through the WASM codec, inserts EXIF, then verifies the resulting
bytes using exifr and the independent jpeg-js decoder. The verifier imports no
writer or serializer. It requires one EXIF block, a complete baseline JPEG,
expected square dimensions, six exact date/offset tags and Software. Duplicate
EXIF, missing/mismatched tags, invalid TIFF or truncated image data fail. There
is no canvas JPEG encoder fallback. Independent native Pillow provides another
decoder/tag oracle outside the application.

Progress includes run/row identifiers and stage. Errors identify validation,
font, drawing, encoding, metadata, verification, initialization, worker or
cancellation. Request IDs and worker epochs prevent stale messages from
becoming a result. The worker serializes its own requests as well as the
client's queue. Encoding/decoding stay off the main UI thread.

Initialization retains bundled worker source, WASM and font bytes. A module
data URL recreates the worker without a network request: WebKit's simulated
offline state rejects Blob workers. Hosts using CSP need to permit `data:` in
`worker-src` and self-hosted initial asset reads. No SharedArrayBuffer or
cross-origin-isolation headers are required. Both engines pass offline single
export, default-size worker restart and local-font export with zero later HTTP
attempts. This supplements, rather than replaces, physical-device testing.

## Evidence and limits

The 45 pure settings/time tests include independent expected instants for now,
midnight, seconds, half/quarter-hour zones, repeated times, year endpoints and
leap day, plus invalid dates/gaps and historical offsets. The browser suite
uses a different default timezone and retains 26 JPEGs per engine: all shapes
at 256/2000/4096, titles/glyphs/outlines, nine time cases, TTF/OTF and metadata.
Each engine rejects 27 deliberate failures plus missing-WASM and worker-timeout
probes, and exercises cancellation, stale messages and frozen retry.

`evidence/browser.json` has exact versions, timings, requests and outcomes.
`evidence/independent-files.json` decodes all 52 files, verifies six exact EXIF
fields against fixture constants, dimensions, 4:4:4, shape colors and custom
OTF pixels. The original 256 MiB decoder-accounting failure and WebKit Blob
worker failure/diagnosis are retained separately.

At 4096 pixels, the decoder's approximate accounting exceeded 256 MiB; its
explicit ceiling is now 512 MiB. That is an internal decoder limit, not a
measurement or cap of total browser/process memory. One full-resolution render
runs at a time and its source raster is released before decoding. The 4096
desktop functional result does not establish physical-iOS capacity; keep that
acceptance item open. Branded desktop browsers, physical iOS/Files, screen
readers, editor/CSV/ZIP behavior and final performance/memory acceptance remain.

Pinned runtime inputs/licenses: Temporal 0.5.1 (ISC), JSBI (Apache-2.0), jSquash
JPEG 1.6.0 (Apache-2.0 wrapper plus codec notices), exifr 7.1.3 (MIT), OpenType.js
2.0.0 (MIT), jpeg-js 0.4.4's decoder (Apache-2.0), and unmodified Noto Sans Bold
(SIL OFL 1.1). Build uses esbuild 0.28.2. The lockfile pins transitive versions;
`dist/notices/` retains package, codec and font licenses. jSquash npm gitHead is
`1f62015f53e28bd18b2d7c8a3ca3326577efc445`; Noto is pinned to
`ffebf8c1ee449e544955a7e813c54f9b73848eac`. The synthetic OTF fixture is generated
from authored triangle geometry, without modifying or copying the Noto font.
