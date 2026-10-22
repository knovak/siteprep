# Desktop delivery acceptance — October 22, 2026

This is partial Phase 5 evidence for Photo markers. Runtime source is unchanged
from merged PR #627, commit `4d5bdb1d99db1db4dfdefe2678b2bac402241fe3`.
Exact source/harness hashes are in `work/pipeline/evidence/delivery/tested-source.json`;
reproduction and measurement ownership are in [DELIVERY_TECHDOC](../DELIVERY_TECHDOC.html).
`verify-browser-delivery` stays actionable and the physical-iOS data item stays
blocked. No Phase 5 completion, graduation or release is claimed.

## Repeated desktop observations

Locked installs and all 64 pure settings/batch tests pass. The final automated
journeys pass in installed Google Chrome 155.0.8059.85 (isolated headless
profile) and Playwright WebKit 26.0 on macOS 26.6.2 arm64. Median seconds are
followed by minimum–maximum; raw samples, requests and cases are retained.

| Browser | Context-cold ready (3) | Draft update (5) | Verified warm single (5) | Ten verified markers + ZIP (3) |
| --- | --- | --- | --- | --- |
| chrome 155.0.8059.85 | 0.513 (0.433–1.355) | 0.137 (0.116–0.346) | 0.668 (0.630–0.800) | 5.848 (5.385–7.377) |
| webkit 26.0 | 0.477 (0.412–0.554) | 0.127 (0.111–0.137) | 0.489 (0.466–0.623) | 4.179 (4.054–4.339) |

All measured draft, warm single and ten-row samples meet the desktop targets
of 500 ms, 2 seconds and 30 seconds respectively. Cold means a new context and
no-store responses, not a physical restart or cleared OS/WASM caches. Timings
include UI/driver overhead and the application's independent byte reader;
post-download native verification is separate. Other desktop activity was
not isolated, including native Safari validation during parts of this run.

- **chrome**: 100 default-size markers take 56.29 s approximate active time plus 1.19 s retrieval/acknowledgement handling; 2 space pauses and 5 saved ZIP parts. Peak accounted compressed output is 52,080,864 bytes, below 50 MiB. Keyboard Cancel responds in 17.78 ms; maximum sampled event-loop gap is 79.80 ms with a 25 ms interval.
- **webkit**: 100 default-size markers take 43.46 s approximate active time plus 0.88 s retrieval/acknowledgement handling; 2 space pauses and 5 saved ZIP parts. Peak accounted compressed output is 52,011,080 bytes, below 50 MiB. Keyboard Cancel responds in 19.97 ms; maximum sampled event-loop gap is 61.00 ms with a 25 ms interval.

These bounds count owned compressed arrays, Blobs and admission reservations;
they do not measure total renderer, decoder, WASM or browser-process peak
memory. A 4096-pixel file is independently checked per engine. The 100-row
observations are not a repeated worst-case device-capacity benchmark.

## Native Safari and offline qualifications

Native Safari 26.6.2 (21624.5.1.11.3) generated and downloaded a dated 2000-pixel
star using native controls (including keyboard shape selection). A ten-row
mixed-shape CSV initially had one invalid color; native row editing corrected
record 0005 without renumbering. After both pages prepared, stopping the asset
server still allowed batch generation and deliberate ZIP/report retrieval.
Acknowledging the actually saved part changed retained output from 6.99 MiB
to zero and disabled its binary links while retaining outcomes.

A further native run loaded the public bundled Noto font through Safari's real
file chooser after server shutdown, then generated and downloaded a valid
local-font JPEG. Native Pillow independently verifies these 12 native JPEGs
alongside 294 automated downloads: 306 files, exact six EXIF time/offset tags,
dimensions, Software and hashes. ZIPs and individual files are retained without
redundant extracted copies. Visual native Safari samples reached 200% and
300%; 400% was not established. Test drafts/tabs were closed and the normal-
size command issued afterward. Native visual samples were viewed during the
run; standalone native zoom PNGs are not retained.

The first keyboard harness timed out when Tab left the DOM; its failure is
retained. A second probe showed WebKit's default Tab policy skipping buttons
and file input; Option-Tab reaches them in the final supplementary focus list,
without changing system settings. This does not establish a complete native
keyboard or screen-reader journey.

WebKit's `context.setOffline(true)` rejects file-input reads with “The I/O read
operation failed”, both for disk paths and in-memory payloads passed through
the file input. The application retains the previous font and remains usable.
The failed full receipt and focused probe are retained. The final WebKit
network check denies all HTTP without that emulation flag; Chrome uses both.
Both final runs retrieve a local-font JPEG and ten-row ZIP with zero later
HTTP attempts. Native Safari's stopped-origin result supports local processing,
but OS networking remained on. Physical disconnection and iOS are unrun.

## Acceptance map

| Check | Evidence and status |
| --- | --- |
| T1 — WASM comparison | Existing measured comparison; unchanged runtime selection, not repeated here. |
| T2 — Rendering/fonts/bounds | Existing core receipt plus new real 2000/4096 downloads and native Safari font/shape samples; desktop pass for tested cases. |
| T3 — Time resolution | 64 pure suite includes prior exact resolver cases; new downloads use independent explicit midnight/+10 constants. Broader time matrix remains in prior receipts. |
| T4 — Metadata integrity | 306 new native-decoded files, six exact time/offset fields; existing corruption receipt retained. |
| T5 — Editor lifecycle | Repeated warm/maximum-size and native downloads; prior editor lifecycle receipt unchanged. Full native accessibility is partial. |
| T6 — CSV review | Pure cases plus ten-row and native invalid-row correction; tested local cases pass. |
| T7 — ZIP retrieval | Real multi-part 100-row downloads, hash-preserving extraction, saved-part release and reports pass locally. |
| T8 — Cancellation/resource bounds | Actual space pauses, recorded response/gaps and existing pure failure injections pass; physical-device limits remain unrun. |
| T9 — Browser/accessibility | Partial: installed Chrome automation, native Safari samples, supplementary WebKit, Tab/Option-Tab, four viewport axe/reflow scans. Physical iOS, real screen reader, full native keyboard/text zoom and 400% remain unrun. |
| T10 — Local/offline/path behavior | Qualified local pass: nested static origin, relative assets, local-only initial requests, missing-WASM failure/retry, final HTTP-denial/offline runs. WebKit simulated file-I/O failure remains visible; physical disconnection is unrun. |
| T11 — Speed/limits | Desktop targets pass for recorded samples, with 100-row pause/response observations. Physical iOS, total process peak memory and repeated worst-case capacity remain unrun. |
| T12 — Graduation | Partial evidence only. Full acceptance, standalone graduation preparation and explicit release authority are outstanding. |
