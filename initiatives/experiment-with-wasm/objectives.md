# Objectives

1. Evaluate Bookmark Sorter and Tide Here against a browser-only conversion.
2. Fork the better fit with a recorded source commit, retaining its useful web UI and domain behavior.
3. Run the database and its queries in a real WASM module in the browser; require no application server, cloud database, sign-in, or network access for local workflows.
4. Deliver a self-contained HTML file that opens directly from disk, plus reproducible source and tests.
5. Preserve bookmark HTML / bookmark-sorter/v1 JSON compatibility, deduplication, collections, selection expressions, tags, verdicts, undo, paging, and sitting reports.
6. Persist changes locally and expose portable backups; show storage failures instead of claiming a successful save.
7. Document the unavoidable differences in cloud account administration and automatic remote page capture. Verify the converted workflows with network access disabled.

## 2026-09-07 follow-up: Tide Here

The user asked, "can you do the same for tide-here?" Add a second standalone application without moving or replacing the Bookmark Sorter file. Retain five coast-local days, high/low tide heights and times, sun/moon information, location selection, alternative coastal points, local history and export. Run the existing harmonic engine inside WebAssembly with all required data embedded. Explain the use of global-model predictions in place of live national services, offline place-search limits, coverage boundaries and data longevity.

## 2026-09-07 follow-up: a static demo

Extend PR #467 with the original wish, findings and both sample applications as a static website under `demos/`. The first page briefly explains WASM before linking to Bookmark Sorter and Tide Here. The published demo carries its runtime files in full, preserves source provenance, explains data persistence and iPad findings, and remains ready for review without merging automatically.
