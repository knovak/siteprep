# Objectives

1. Evaluate Bookmark Sorter and Tide Here against a browser-only conversion.
2. Fork the better fit with a recorded source commit, retaining its useful web UI and domain behavior.
3. Run the database and its queries in a real WASM module in the browser; require no application server, cloud database, sign-in, or network access for local workflows.
4. Deliver a self-contained HTML file that opens directly from disk, plus reproducible source and tests.
5. Preserve bookmark HTML / bookmark-sorter/v1 JSON compatibility, deduplication, collections, selection expressions, tags, verdicts, undo, paging, and sitting reports.
6. Persist changes locally and expose portable backups; show storage failures instead of claiming a successful save.
7. Document the unavoidable differences in cloud account administration and automatic remote page capture. Verify the converted workflows with network access disabled.
