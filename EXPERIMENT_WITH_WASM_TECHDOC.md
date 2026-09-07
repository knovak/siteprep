# Standalone WASM Bookmark Sorter

`initiatives/experiment-with-wasm/work/` contains a local fork of Bookmark Sorter from commit `48c0f4b54a89480949ee86ffd04b3b67dcbb5dbf` (full SHA in `fork-provenance.json`). It is an initiative capability/output under development, not a reference dependency of any published deck or demo. Neither original app nor its hosting settings is changed.

## Source and execution

- `src/pile-page.mjs` retains the original card UI and its controls. Local calls replace network requests; export builds a downloadable Blob. Local tools expose full backup, restore, sample bookmarks and sitting/template controls. Cards accept locally chosen raster images.
- `src/bookmark-store.mjs` forks the D1 store's prepared SQL with local ownership. `selection-sql.mjs` compiles normalized boolean expressions into bound SQL. The store retains deduplication, stable indexed paging, tags/verdicts and history.
- `src/local-app.mjs` forks the route contracts into an in-process dispatcher. Request/Response are message envelopes with a synthetic origin; there is no HTTP listener or fetch transport. Identity, remote capture and cloud account routes are removed.
- `src/sqlite-adapter.mjs` implements prepared `bind`, `all`, `first`, `run` and atomic `batch` operations using actual SQLite/WASM. Statements are freed in finally blocks. Snapshot export restores the `foreign_keys` connection pragma that sql.js resets when reopening the database.
- `src/runtime.mjs` serializes requests. Every mutating action snapshots previous state, runs with a savepoint, commits, and awaits durable storage before reporting success. Dispatcher errors roll back the savepoint. Failed persistence restores the previous in-memory database. State never silently falls back to a JavaScript memory store.
- `src/persistence.mjs` writes the SQLite byte array into experiment-specific IndexedDB. A read/write transaction compares the expected revision before writing, preventing stale tabs from overwriting another tab. The initial database starts empty and schema version is explicit.
- `src/browser.mjs` instantiates the embedded WASM bytes, wires local persistence/backup/restore and pictures, and reports startup/save errors in the UI. SQL and the browser IndexedDB APIs require no service worker, OPFS, cross-origin-isolation headers, or network access.

DOM rendering, HTML/JSON parsing, Unicode normalization, expression compilation, proposal grouping and storage plumbing remain JavaScript. SQLite's native engine inside WASM performs the database work. This boundary is deliberate and is described to the user.

## Database and import boundaries

`schema.sql` is the ordered original SQL migration sequence with user allowlist migrations omitted and schema version 1. No real identities or bookmark data are copied. The full database format carries an application ID, `BSW1`. Restore checks that ID, version, the exact table/index schema (rejecting added triggers/views), SQLite integrity/foreign keys, HTTP(S) bookmark URLs, and allowed inline raster images before replacing state. A failed restore leaves the current database intact.

Original bookmark JSON import/export keeps the `bookmark-sorter/v1` contract. A subset import does not remove absent records; URL matches merge tags and preserve existing verdicts. Images, saved selections and sitting history travel only in a full `.sqlite` backup. HTML/JSON imports reject active-content and local-file URL schemes. Images are restricted to PNG/JPEG/WebP, decoded before storage and capped at 5 MB. Full databases are capped at 100 MB. The HTML's CSP denies connections, frames, objects and external scripts/assets; it permits the embedded WASM and inline UI. Following an explicit HTTP(S) bookmark link opens its website separately.

Snapshot persistence is designed for modest personal collections. Every action copies the entire database, including pictures, so memory and save cost increase with database size. Browser storage can be evicted and varies for file origins; explicit full backups are essential for transfer and recovery. Only Chromium direct-file behavior has been verified. A subsequent compatibility increment should test actual Safari/Firefox behavior before claiming it.

## Build and tests

The initiative package pins sql.js and esbuild in its own lockfile. `npm ci` at the root supplies the repository's pinned Playwright; `npm ci` in `work/` installs its build/runtime packages. `npm run build` there uses `scripts/build.mjs` to bundle source, CSS, schema and the WASM bytes into `dist/index.html`, alongside the sql.js license and a checksum manifest. The license is also embedded in the HTML for single-file redistribution. The distribution is intentionally committed so it can be opened without a compiler, package manager or server. SQLite is public domain; sql.js is MIT licensed.

`npm test` in `work/` runs actual WASM-backed integration tests and compares SQL selection membership to the original JavaScript evaluator. It covers deduplication/round trip, mutations/undo, reports, collections, backup/restore, invalid input, rollback, stale writers and a generated 5,600-item workload.

`npm run test:browser` opens the committed single file with network access disabled. It exercises visible import/paging/verdict/undo/select/tag/export controls, persistence across reload, local pictures, full backup/restore, phone behavior, conflicts between actual browser tabs and missing WASM/storage failures.

`.github/workflows/wasm-standalone.yml` installs the two lockfiles, rebuilds and checks the committed distribution for drift, then runs both suites. It is scoped to changes in this initiative, this technical document or that workflow. It does not deploy. The repository's normal build remains separately required. Screenshots are generated after that final build under `screenshots/` as described in BUILD_TECHDOC.md.
