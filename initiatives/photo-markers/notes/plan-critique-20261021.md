# Plan critique — October 21, 2026

Reviewed the merged planning baseline `57525f891` against the wish, reviewed objectives and decisions, specification and T1–T12. This is a document review; no runtime, browser prototype, file export or device acceptance was performed.

| Finding | Correction and verification obligation |
| --- | --- |
| The comparison risked growing into two applications before choosing a runtime. | Bound Phase 1 to frozen export fixtures, a minimal cancellation/retry and packaging harness, independent output checks and the already required measurements. Keep UI and full batch delivery in their later phases. T1 now makes this boundary explicit. |
| A final filename shown before Generate could disagree with the actual current timestamp captured at Generate. | Mark the earlier display provisional, then freeze and show the actual timestamp/name before processing. T3 crosses a clock/day boundary between those actions and keeps retries tied to the frozen run. |
| Stable suffixes did not say whether exclusion or multiline CSV changed record identity. | Assign IDs to parsed records before validation/exclusion; empty physical lines do not count and quoted multiline fields stay one record. T6 checks exclude, correct and restore without renumbering. |
| Payload limits alone left packaging overhead and an impossible-to-fit single result underspecified. | Account for headers, manifest and temporary copies before packaging; split early and fail a result that cannot fit an empty budget. T7 adds boundary and non-progress-loop cases. No measured memory capacity is claimed. |
| Releasing saved bytes conflicted with later individual downloads and a single mutable run manifest. | Separate outcome from availability and user-reported saving. ZIP manifests are immutable part snapshots; a final run report reconciles every original row. T7 covers release, later failure/retry and reconciliation. |

## Checks retained and remaining limits

The plan already separates the metadata writer, browser read-back parser and external oracle; tests must check fixture constants as well as tag agreement. It already requires stale worker replies to be ignored, font load and glyph coverage errors to fail, actual output previews, offline generation and deliberate downloads. Those requirements remain.

T3 identified a potential historical-offset mismatch with the advertised 1900–2099 range. The comparison must now explicitly examine it and record actual timezone-library/data behavior. No historical case, compatible library or revised date range is invented by this critique. Exact timestamp/offset preservation remains required; silent rounding is prohibited.

Physical iOS performance, memory and Files retrieval remain unrun. Desktop prototypes may justify a provisional implementation choice, but cannot certify the supported browser matrix. The planned data gate and separate user authority for graduation remain intact. No library, additional design, photo-library test or production release is selected here.

Phase 0 is complete at the document level. The next item is the existing plan's `compare-wasm-exports`; the initiative stays `planned` until its first executable increment.
