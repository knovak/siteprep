# Specification

The output is `work/dist/index.html`, built from a vendored fork of Bookmark Sorter. The file embeds the CSS, application JavaScript, SQLite WASM bytes and schema. It opens from disk without a local web server and also works on an ordinary static origin.

## Architecture

Existing card UI → local in-process request dispatcher → forked BookmarkStore → SQLite binding adapter → SQLite/WASM. No request crosses the network. The adapter preserves prepared statement binding and atomic batches. Successful actions persist a complete SQLite snapshot to IndexedDB before the UI receives success. A serialized request queue prevents overlapping asynchronous actions from interleaving transactions. A stored revision rejects stale writes from another tab.

The saved database is an experiment-specific namespace, with no access to the original app or personal export files. New databases start empty. An explicit sample-data button adds a separate collection. Full backup/restore and the existing compatible JSON export/import serve different purposes. Restore validates the database format, schema, integrity, and image references before replacing local state.

## Parity

Retain HTML and JSON multi-file imports; source/folder tags and URL deduplication; collection creation/rename/erase; demo template copies; exact/prefix/contains boolean selection expressions and verdict filters; proposals and saved/previous selections; keyboard/card marking; all four verdicts; bulk/sweep actions; tag addition/removal; undo; collection/selection JSON export; sitting reports; day/night and responsive grid layouts.

Replace cloud identity with local ownership. Replace remote captures with local raster image attachments, saved with the database. Do not expose nonworking cloud controls. Saved pictures work offline. Links open their original sites only when the user follows them.

## Alternatives

See evaluation.md for the application comparison. SQLite/WASM was chosen over a fresh Rust rewrite to retain tested SQL and exact behavior. A JavaScript-only memory store would miss the requested WASM conversion. A fetch-driven WASM asset or OPFS-only build would complicate direct file opening; embedded bytes and IndexedDB are used instead. Code stays in this initiative until graduation is requested.

## Second application: Tide Here

`work/tide-here/dist/index.html` is a separate self-contained application. Its DOM retains the original five-day visual vocabulary. A Blob worker hosts QuickJS compiled to WebAssembly; the original pinned `@neaps/tide-predictor` 0.11.0 is evaluated exclusively inside that interpreter. It calculates harmonic high/low extrema with the same Schureman corrections as the original FES provider. Host JavaScript handles input, nearest-point selection, IANA local-day boundaries, SunCalc astronomy, history and DOM rendering. There is no JavaScript tide-engine fallback and no claim of compiling the UI or performing a native Rust/C numerical rewrite.

The file embeds the complete available FES2022b coastal extract (65,203 sampled water points, 34 constituents, 40 km maximum selection distance), packed as gzip with float64 coordinates and float32 amplitude/phase pairs. It retains source metadata and time zones; float32 reduction is checked against original full-precision forecasts. It also embeds the 170,946-place GeoNames cities1000 snapshot, aliases and regional context. Names can be ambiguous and are offered as explicit choices; coordinates work independently of name coverage.

The offline provider always uses FES2022 model data, including where the hosted app prefers national predictions. Heights are metres relative to model mean sea level, not local chart datum. No fixed yearly table is required. Unsupported coastal/inland requests fail visibly; nearby points can be selected by their coordinates. Approximate nature, omitted environmental effects and no-navigation guidance remain visible. Model points cannot be erased through browser storage; only the optional last-100 forecast history uses localStorage, with export/restore and explicit failure messages.
