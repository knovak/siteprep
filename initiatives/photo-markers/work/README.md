# Photo markers export comparison

This is Phase 1's development harness, not a marker editor or release. It compares
two real WASM export paths using the ten frozen 2000-pixel fixtures in
`fixtures.mjs`. No personal photos, user text, accounts or remote processing are
used. All generated files are fictional test markers.

## Reproduce

From the repository root, install its locked browser tools with `npm ci`. From
this directory:

```sh
npm ci --ignore-scripts
npm run prepare:assets
npm run compare
python3 test/verify_files.py
```

The final command needs a separately installed native Pillow. The receipt names
the interpreter/version actually used. Chromium and WebKit must already be
provisioned for the repository's Playwright version. `compare` serves the
harness beneath `/nested/photo-markers/`, uses three clean browser contexts
per candidate/engine for cold measurements, then five warm single exports and
three ten-row-plus-ZIP runs. Every response uses `Cache-Control: no-store` and
no transport compression. Fresh contexts do not reset operating-system caches
or browser-process WASM compilation caches; these are context-cold measurements,
not independent physical-device reboots.

`prepare:assets` copies locked npm packages locally, downloads Pillow from the
selected Pyodide distribution and checks the distribution's SHA-256, and fetches
Noto Sans Bold from a pinned commit. `asset-manifest.json` records exact local
file hashes and bytes. Generated `assets/` and `node_modules/` are ignored. This
is reproducible preparation for a comparison, not the final vendored release
directory. The selected runtime must be vendored with notices before graduation.

To use the small interactive surface, serve this directory with an ordinary
static HTTP server and open `index.html`. Choose A or B and Generate. Cancel
terminates the active worker. Generate / Retry creates another worker using the
same frozen fixtures. Download is a deliberate link to a ZIP containing the ten
verified JPEGs and manifest. The harness retains only its latest ZIP; save it
before another generation. It does not implement the later editor's full
retained-result/budget management or CSV workflow.

## Paths and verification

- A: module worker → Pyodide 314.0.7 / Python 3.14.2 → distribution Pillow 12.2.0
  → Pillow JPEG quality 95, 4:4:4 → Pillow `Image.Exif` serialization.
- B: module worker → loaded FontFace and OffscreenCanvas text/raster →
  `@jsquash/jpeg` 1.6.0's MozJPEG WASM → narrow TIFF/EXIF writer. Its explicit
  options are quality 95, baseline true, progressive false,
  auto_subsample false, chroma_subsample 1 (4:4:4); remaining defaults are in
  the pinned package's `meta.js`.
- Both use Noto Sans Bold, the same colors, geometry and resolved timestamps.
  Binary search fits text using each renderer's measured bounds and includes
  the outline. Rasterizers and codec defaults differ; pixel or byte equality
  between A and B is not required or claimed.
- The browser's separate exifr 7.1.3 reader checks final JPEG bytes against
  fixture constants for six date/offset tags and `Software`. A browser decoder
  checks dimensions. No download-ready result precedes those checks.
- fflate 0.8.3 stores original verified JPEG bytes in a ZIP. Extraction and
  SHA-256 comparison check byte preservation. The separate native Pillow
  oracle decodes all four archives, reads both TIFF IFDs, checks six date/offset
  tags plus `Software`, dimensions, representative interior colors and hashes.
- Tests terminate a hung worker, restart and retry the frozen now fixture,
  reject a missing glyph, corrupt an actual timestamp, block the actual WASM
  asset, and repeat single/batch export after all later network requests are
  blocked. Absence of the WASM module must fail initialization. There is no
  canvas JPEG export fallback.

Chromium also uses context-offline emulation. WebKit's context-offline setting
prevented local Blob decoding for both routes; that failed receipt is retained.
Its final checks deny HTTP requests without changing the context's offline
setting. This distinction does not establish physically disconnected Safari.

The OpenType parser checks glyph presence in both routes rather than accepting
browser fallback. The fixture `Café Å Ω` exercises non-ASCII coverage; `🦄` is
rejected. This does not establish all-script shaping, arbitrary local-font
acceptance or the final title-fit matrix. Frozen timestamps exercise metadata
serialization, not the future timezone resolver or its historical offset rules.

## Measurements and limits

`evidence/comparison.json` contains raw timings, engine versions, host details,
requests and worker resource timing. Cold time includes loading/parsing the
font, preparing the runtime and, for B, a 1-pixel encoder initialization probe.
The probe is explicitly part of cold initialization, not a hidden warm export.
Warm single timing includes rendering, encoding, metadata and independent
browser verification; hashing follows. Batch timing includes ten verified
exports, their hashes, manifest and ZIP creation. Post-ZIP hash auditing and
automation file retrieval are outside that batch timing.

Resource entries give decoded/encoded/served bytes. Sum unique paths for the
initial footprint; worker entries and document imports are listed separately.
No compression is used by this server. File inventory includes unused package
files such as the alternative decoder and is not the transfer footprint.
`performance.memory`, where available, is only a page JS-heap snapshot: it
excludes worker/WASM/process allocations and is neither peak memory nor a
device-capacity test. Total peak memory is unavailable; no memory-based winner
is asserted. One full-resolution render runs at a time.

Playwright Chromium/WebKit are supplementary engine evidence. Branded desktop
Chrome/Safari, physical iOS, Files retrieval, assistive technology, all sizes,
100 rows, advanced font inputs and production delivery remain unrun. The
standalone source is not published or registered as a demo by this increment.

## Dependencies and licenses

Exact package versions/integrities are in `package-lock.json`; runtime asset
hashes are in `asset-manifest.json`. No unpinned package runner is used.

| Input | License / provenance |
| --- | --- |
| Pyodide 314.0.7 | MPL-2.0 in the npm package metadata; npm gitHead `b1e4fcc2488962f6360a97f19b9982d6fdb5d16f`. Upstream runtime contains additional Python/Emscripten components and notices. [Source](https://github.com/pyodide/pyodide/tree/b1e4fcc2488962f6360a97f19b9982d6fdb5d16f). |
| Pillow 12.2.0 | MIT-CMU; wheel is pinned by Pyodide's package lock and retains its license metadata. [Source](https://github.com/python-pillow/Pillow/tree/12.2.0). |
| jSquash JPEG 1.6.0 | Apache-2.0 package wrapper; npm gitHead `1f62015f53e28bd18b2d7c8a3ca3326577efc445`. Derived Squoosh/MozJPEG components have their own notices, retained under the package's codec directory. [Codec source](https://github.com/jamsinclair/jSquash/tree/1f62015f53e28bd18b2d7c8a3ca3326577efc445/packages/jpeg). |
| exifr 7.1.3 | MIT; independent browser metadata reader. [Source](https://github.com/MikeKovarik/exifr). |
| OpenType.js 2.0.0 | MIT; local glyph coverage. Browser FontFace supplies shaping and text rasterization. [Source](https://github.com/opentypejs/opentype.js). |
| fflate 0.8.3 | MIT; ZIP packaging and hash-preserving extraction check. [Source](https://github.com/101arrowz/fflate). |
| Noto Sans Bold | SIL Open Font License 1.1. Commit `ffebf8c1ee449e544955a7e813c54f9b73848eac`; unmodified font and `assets/Noto-LICENSE`. [Source](https://github.com/notofonts/noto-fonts/tree/ffebf8c1ee449e544955a7e813c54f9b73848eac). |

Before shipping either route, assemble its complete transitive notices and
publish the selected runtime's pinned build/source provenance; the comparison's
lockfile and asset hashes identify the tested prebuilt codec, not a fresh
rebuild from the upstream C/C++ sources.
