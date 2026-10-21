# WASM export comparison — October 21, 2026

## Result and scope

Use browser drawing plus the pinned jSquash/MozJPEG WASM encoder for the next
implementation increment. This is a provisional desktop implementation choice
under the user's delegated discovery, not physical-iOS acceptance or release
readiness. Both routes produce real JPEGs with all six required EXIF tags;
Pyodide exports faster once warm, while B has a substantially smaller static
footprint and initialization cost. Both meet the desktop export-time targets.

The reproducible harness, locks, dependency/license record and commands are in
`../work/README.md`. `../work/evidence/comparison.json` preserves every final
timing sample, engine/host version, request path, verification result, retry and
network-denial observation. `source-sha256.json` identifies the tested inputs
alongside base commit `d4d03b0c2`; it distinguishes the new uncommitted prototype
from that base. The PR's implementation commit preserves those exact files.

## Measurements

Host: Apple M1, arm64 Darwin 25.6.0; Chromium 143.0.7499.4 and WebKit 26.0.
Exact host and engine details are in the raw receipt. These are Playwright Chromium and
WebKit, not branded Chrome/Safari or a physical iOS device. Each route/engine
has three fresh-context initializations, five warm single exports, and three
ten-row exports including verification, hashes, manifest and ZIP creation.

| Engine / route | Cold initialization median (range), ms | Verified warm single median (range), ms | Ten JPEGs plus ZIP median (range), ms |
| --- | --- | --- | --- |
| Chromium / A: Pyodide + Pillow | 1439 (1422–1465) | 84 (82–230) | 819 (818–820) |
| Chromium / B: browser + MozJPEG | 44 (40–52) | 270 (267–328) | 2507 (2483–2535) |
| WebKit / A | 1602 (1561–1646) | 181 (95–252) | 948 (915–1031) |
| WebKit / B | 52 (50–53) | 263 (257–302) | 2470 (2454–2534) |

Unique requested local static body bytes are **15,823,228 for A** and
**1,545,663 for B**, including the common harness, reader, font and packager.
The server uses no compression and `no-store`; totals are from the union of
observed request/resource paths and the exact served file inventory, not a
whole-package folder size. WebKit reports zero Resource Timing byte fields,
which are unavailable measurements, not zero-byte transfers. Cold contexts do
not reset process/OS caches. No total peak-memory observation was available;
the page-only JS heap snapshot excludes worker/WASM allocations and does not
select a winner or establish supported device limits.

The ten frozen 2000-pixel records cover a titled default donut, blank solid,
star, `Café Å Ω`, Brisbane midnight/frozen now, both Los Angeles repeated-hour
offsets, UTC, Kolkata and Kathmandu. Times are already resolved fixture
constants: this does not test a timezone resolver. Both routes use unmodified
Noto Sans Bold and quality 95 / 4:4:4. Rasterization and encoder defaults differ;
no pixel/byte equivalence between encoders is claimed.

## Export and recovery evidence

- Four ten-JPEG ZIP archives and four default JPEGs are retained in
  `../work/evidence/`. The native Pillow 12.3.0 oracle independently decoded all
  40 archived JPEGs, checked 2000 × 2000 dimensions, six exact date/offset tags,
  Software, representative interior colors, and hashes after ZIP extraction.
  `independent-files.json` contains every result. The browser's exifr reader is
  independent of both Pillow's writer and B's narrow TIFF writer.
- All four route/engine combinations reject an unavailable actual WASM asset,
  a missing-font glyph and a corrupted timestamp. Terminating a deliberately
  hung worker preserves the frozen now fixture across worker recreation/retry.
  No canvas JPEG fallback exists. The missing-asset probe has a 10-second
  timeout; ordinary worker requests have a 30-second timeout.
- Chromium passed single and ten-row export with context offline and HTTP
  denied after initialization. WebKit passed both with all HTTP denied and
  zero attempted later HTTP requests. WebKit context-offline emulation failed
  local `createImageBitmap(Blob)` decoding for both routes; the complete failed
  receipt is `webkit-offline-emulation-failure.json`. HTTP denial is distinct
  from that emulation and from physically disconnecting a Safari/iOS device.
  Carry this verifier/offline compatibility check into the selected pipeline.
- Initial OpenType vector shaping failed on the supplied font's substitution
  table. B now loads the actual FontFace for native browser text drawing, while
  OpenType glyph inspection rejects absent characters. WebKit errors now retain
  their message even when the stack omits it. The initial failed receipt is
  preserved in `initial-failures.json`. A further attempted MozJPEG sampling
  factor of zero was invalid; the corrected explicit factor is one (4:4:4),
  following the codec's sampling-factor implementation. These failures are not
  passed acceptance results.

## Next work and acceptance limits

Phase 1 establishes a measured provisional implementation path and advances to
`building`. Phase 2 builds the production serial worker with strict inputs,
timezone resolution, full font validation, independent read-back and recovery.
Keep the two-route harness as development evidence; the application output must
include only the selected runtime. No second runtime is to ship in the app.

| Checks | Current evidence |
| --- | --- |
| T1 | Desktop engine comparison and retained artifacts complete; physical iOS and branded browsers unrun. |
| T2–T4 | Representative shapes/glyphs and final tags verified; full size/font/timezone/corruption matrices remain. |
| T5–T8 | Minimal harness start/cancel/retry, ZIP hashes and one corruption case; editor, CSV, parts/budgets and full failure matrix remain. |
| T9–T11 | Two desktop engines, nested path and the precisely stated network modes measured; branded browsers, physical devices, full accessibility, peak memory and final limits remain. |
| T12 | Development reproduction and source hashes retained; repository validation is recorded in the PR. No graduation or release. |

No performance target or 256–4096 / 100-row / memory limit is revised by these
default-size desktop samples. Physical Safari/Chrome on iOS, Files retrieval,
branded desktop Safari and actual disconnected-device decoding remain unrun.
The corresponding physical-device item remains `data:` work; no result is
inferred from WebKit or from this provisional choice.
