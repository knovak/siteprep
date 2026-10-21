# Verified export pipeline — October 21, 2026

Phase 2 produces the selected standalone export core under `work/pipeline/`.
Its [README](../work/pipeline/README.md) documents the API, reproduction,
worker/data ownership and dependency notices. It does not build the editor,
CSV/download manager or publish a demo.

## Passed local evidence

- **45 settings/time tests** pass. Literal expected instants cover frozen now,
  local midnight, explicit seconds, UTC, half/quarter-hour offsets, both Los
  Angeles repeated-hour occurrences, leap day and 1900/2099 UTC endpoints.
  Invalid dates, gaps/skipped dates, missing occurrence, unsupported historical
  second offsets, size/color/font-key/outline errors and snapshot tampering fail.
- **Chromium 143.0.7499.4 and WebKit 26.0** pass the complete pipeline suite
  under a nested HTTP path with the browser default set to America/New_York.
  Each engine exports 26 representative JPEGs, covers all three shapes at
  256/2000/4096 pixels, verifies centered glyph/outline bounds and local TTF/OTF,
  and rejects 27 deliberate malformed inputs/files. Startup missing-WASM and
  worker-timeout probes fail explicitly. Request/epoch/run/row checks,
  cancellation of active/queued work and retry preserve the frozen timestamp
  and byte hash while earlier successful results remain owned by the caller.
  Concurrent font registration cannot replace a key already queued for loading,
  and late errors from a terminated worker cannot cancel its replacement.
- **52 JPEGs** pass the independent native Pillow 12.3.0 oracle: full decode,
  exact square size, baseline 4:4:4, all six date/offset fields against fixture
  constants, Software, SHA-256, shape interiors and the synthetic OTF's pixels.
  The browser uses exifr plus jpeg-js, independently of its TIFF writer and
  the MozJPEG encoder; neither oracle shares the writer's serializer.
- Both engines pass **context-offline export, default-size worker restart and
  local-font generation**, with zero later HTTP attempts. The module data-URL
  loader retains the previously loaded code/codec/font bytes. It replaces the
  Blob loader rejected by WebKit offline emulation; a pure-byte decoder avoids
  the earlier Blob-image decode dependency. No server or remote processing is
  used, and a missing actual WASM asset prevents initialization.

Raw results and exported files are in `work/pipeline/evidence/`; exact bundle,
asset and lock hashes are in `build-inputs.json`. The source-hash receipt and
the PR's implementation commit identify the tested code relative to base
`3f830b7fc1b6ecd9e1543b9d668e2532f25aa2dd`. Root build/scope/whitespace outcomes
are recorded in the PR.

## Findings carried forward

The first full 4096-pixel verification exceeded the independent decoder's
256 MiB accounting limit; that failed receipt is retained. With an explicit
512 MiB decoder accounting ceiling, all desktop size/design cases pass.
This is not measured total peak memory or a physical-iOS capacity claim.
The original Blob-worker offline failure and the minimal data/Blob loader
diagnosis are retained; final offline success is recorded separately.

Representative pre-format-run verified default-size titled exports were about
0.35–0.46 seconds; 4096-pixel blank-shape exports about 1.3–1.9 seconds on the
local desktop engines. Final per-case elapsed times are retained in the raw
receipt. These functional samples are not a replacement for Phase 5's full
cold/warm, batch, physical-device and responsiveness measurements, and no
performance target has been revised. Runtime files total about 2.12 MB before
compression, excluding internal test scaffolding/notices; one WASM codec ships.

The bundled Temporal polyfill uses host Intl timezone data (Node test runtime
reports 2025a; browser data revision is unavailable). Years remain 1900–2099,
with an explicit error for zone/date combinations whose exact historical
offset contains seconds, such as Paris at 1900-01-01. No time is rounded or
normalized to hide that representation limit. Browser/OS timezone rules can
change; retain literal fixture checks and the chosen offset/instant in results.

Physical Safari/Chrome on iOS, Files retrieval, branded desktop browsers,
screen-reader/accessibility journeys, 100-row budgets and ZIP/CSV acceptance
remain unrun or belong to later phases. The existing `data:` item stays open.
Phase 3's single-image editor is the next planned actionable increment.
