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
