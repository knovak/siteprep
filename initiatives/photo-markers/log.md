# Log

## 2026-10-20 — Draft objectives.md - what "done" would mean

Drafted objectives for interactive square JPEG markers, verified EXIF timing and photo-library placement, individual and batch delivery, substantive browser-local WASM processing, and eventual static demo graduation. Left implementation and compatibility choices for specification.

## 2026-10-20 — Objectives review on PR #609

Addressed the user's nine review comments: simplified image wording; allowed current date/time when both fields are blank and local midnight for date-only input; removed photo-library validation; set Chrome/Safari desktop and iOS coverage; fixed the first designs to donut, star, and solid color using legacy image parameters; chose CSV with optional columns; and left WASM selection to implementation. Recorded the user's decisions and the delegated browser-timezone default in decisions.md. Optional location-based timezone inference remains a convenience to assess. The lifecycle stage and next todo are unchanged.

## 2026-10-20 — Draft spec.md - define the browser experience and compare implementation options

Drafted the specification from reviewed objectives: three legacy-based designs, single/CSV workflows, explicit timezone and EXIF offset rules, verified downloads, resource/performance targets and alternative WASM approaches. Seeded draft-plan for plan.md and test-plan.md. Dated October 21, 2026 Australia/Brisbane; lifecycle log timestamp is UTC.

## 2026-10-21 — Draft plan.md and test-plan.md - compare WASM approaches, then plan the browser implementation and acceptance

Drafted plan.md and test-plan.md with a measured two-route WASM comparison first, verified JPEG/EXIF export, editor and CSV milestones, recovery/resource bounds, independent timestamp fixtures, physical iOS acceptance and explicit graduation authority. No runtime selected or implementation acceptance claimed.

## 2026-10-21 — Critique plan.md and test-plan.md before comparing WASM export paths

Critiqued the merged plan; clarified prototype scope, frozen timestamps and row IDs, packaging admission, output availability and per-part manifests. Added boundary checks; historical offset/range and physical iOS evidence remain gates. Seeded compare-wasm-exports; stage remains planned.

## 2026-10-21 — Compare measured WASM export prototypes and select a verified implementation path

Compared two pinned WASM export prototypes in Chromium and WebKit; independently verified 40 JPEGs and selected browser drawing/MozJPEG provisionally. Retained WebKit offline-emulation failure and physical-iOS acceptance gap; next serial pipeline seeded from Phase 2.

## 2026-10-21 — Build the selected serial WASM export pipeline with strict settings, time resolution and independent verification

Built the selected serial WASM export core with strict frozen time/settings, local fonts and independent read-back. 45 settings tests, both desktop engine suites and 52 native JPEG oracles pass, including offline restart. Seeded the single-image editor from Phase 3; physical-device evidence remains open.

## 2026-10-21 — Build the single-image editor with effective time, verified preview and deliberate JPEG download

Built the single-image editor with strict effective time, labeled drafts and verified JPEG previews/downloads. Two desktop engine UI suites, 16 native downloaded-file checks and the existing core regressions pass. Seeded Phase 4 CSV/batch delivery; physical-iOS and full accessibility remain open.

## 2026-10-22 — Add CSV review, frozen batch jobs, ZIP parts and manifests

Added CSV review and inheritance, immutable record IDs, frozen batch/retry, deliberate bounded JPEG/ZIP delivery and manifests/reports; 64 pure tests, both engine batch journeys and 220 independent JPEG checks pass. Phase 5 acceptance remains.

## 2026-10-22 — Desktop delivery acceptance evidence

Recorded repeated Chrome/WebKit desktop performance, actual default-size
100-row ZIP retrieval with space pauses and keyboard cancellation, native
Safari single/batch/local-font downloads, and 306 independently decoded JPEGs.
Preserved WebKit context-offline file-I/O failures separately from passing
HTTP-denial/native stopped-origin checks. Added a T1–T12 acceptance map and
reproduction techdoc. Phase 5 stays actionable; physical-iOS data and other
explicit acceptance gaps remain open. No application runtime, deployment,
graduation, stage or production release changed.
