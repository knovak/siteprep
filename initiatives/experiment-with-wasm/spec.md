# Specification

The output is `work/dist/index.html`, built from a vendored fork of Bookmark Sorter. The file embeds the CSS, application JavaScript, SQLite WASM bytes and schema. It opens from disk without a local web server and also works on an ordinary static origin.

## Architecture

Existing card UI → local in-process request dispatcher → forked BookmarkStore → SQLite binding adapter → SQLite/WASM. Local database requests do not cross the network; separate online controls use the browser transport described below. The adapter preserves prepared statement binding and atomic batches. Successful actions persist a complete SQLite snapshot to IndexedDB before the UI receives success. A serialized request queue prevents overlapping asynchronous actions from interleaving transactions. A stored revision rejects stale writes from another tab.

The saved database is an experiment-specific namespace, with no access to the original app or personal export files. New databases start empty. An explicit sample-data button adds a separate collection. Full backup/restore and the existing compatible JSON export/import serve different purposes. Restore validates the database format, schema, integrity, and image references before replacing local state.

## Parity

Retain HTML and JSON multi-file imports; source/folder tags and URL deduplication; collection creation/rename/erase; demo template copies; exact/prefix/contains boolean selection expressions and verdict filters; proposals and saved/previous selections; keyboard/card marking; all four verdicts; bulk/sweep actions; tag addition/removal; undo; collection/selection JSON export; sitting reports; day/night and responsive grid layouts.

Replace cloud identity with local ownership. Keep local raster image attachments, saved with the database, and add user-requested online previews. Do not expose nonworking cloud controls. Saved pictures work offline. Links open their original sites only when the user follows them.

HTML and JSON imports retain valid non-web URLs from older browser exports, including bookmarklets, local files and browser-internal bookmarks. They remain sortable/exportable records through reload and backup/restore. Only HTTP(S) URLs become clickable title links; all other titles render as text and their addresses remain available through Copy URL. Invalid URLs still reject the file atomically.

## Alternatives

See evaluation.md for the application comparison. SQLite/WASM was chosen over a fresh Rust rewrite to retain tested SQL and exact behavior. A JavaScript-only memory store would miss the requested WASM conversion. A fetch-driven WASM asset or OPFS-only build would complicate direct file opening; embedded bytes and IndexedDB are used instead. Code stays in this initiative until graduation is requested.

## Second application: Tide Here

`work/tide-here/dist/index.html` is a separate self-contained application. Its DOM retains the original five-day visual vocabulary. A Blob worker hosts QuickJS compiled to WebAssembly; the original pinned `@neaps/tide-predictor` 0.11.0 is evaluated exclusively inside that interpreter. It calculates harmonic high/low extrema with the same Schureman corrections as the original FES provider. Host JavaScript handles input, nearest-point selection, IANA local-day boundaries, SunCalc astronomy, history and DOM rendering. There is no JavaScript tide-engine fallback and no claim of compiling the UI or performing a native Rust/C numerical rewrite.

The file embeds the complete available FES2022b coastal extract (65,203 sampled water points, 34 constituents, 40 km maximum selection distance), packed as gzip with float64 coordinates and float32 amplitude/phase pairs. It retains source metadata and time zones; float32 reduction is checked against original full-precision forecasts. It also embeds the 170,946-place GeoNames cities1000 snapshot, aliases and regional context. Names can be ambiguous and are offered as explicit choices; coordinates work independently of name coverage.

The embedded offline provider always uses FES2022 model data, including where the hosted app prefers national predictions. Heights are metres relative to model mean sea level, not local chart datum. No fixed yearly table is required. Unsupported coastal/inland requests fail visibly; nearby points can be selected by their coordinates. Approximate nature, omitted environmental effects and no-navigation guidance remain visible. Model points cannot be erased through browser storage; only the optional last-100 forecast history uses localStorage, with export/restore and explicit failure messages.

## Static demo output

`work/scripts/build-demo.mjs` generates `work/site/` from `work/demo-src/`, the original `wish.md`, canonical `findings.md`, and recorded app artifacts. `release-initiative` copies that package to `demos/experiment-with-wasm/`. No runtime code loads from the initiative. Source initiative names, relative artifact names and commit records in `provenance.json` identify the copies without paths back into the mutable initiative tree. App snapshots are pinned as release inputs rather than recomputed from HEAD, preserving reproducibility after a squash merge.

The landing page explains WASM before linking to the two applications, downloads and examples. The findings page renders the entire original wish, selection rationale, WASM boundaries, storage/backup behavior, tide coverage, evidence and Safari/iPad limits. Prompt history preserves the user requests. The original direct-file paths remain intact, while the initiative records the demo as an output.

Static hosting delivers the website before the apps run locally. These versions have no service worker or guaranteed Home Screen offline reopening path. Personal bookmark data does not migrate automatically between a downloaded file and the website; the findings explain backup/restore.

## Optional internet access (2026-09-08)

Both single-file applications permit HTTP(S) connections in their Content Security Policy. External scripts, frames and objects remain disabled. No remote JavaScript is loaded: browser JavaScript handles downloads while the bundled WASM handles local computation.

Bookmark Sorter's Online tools imports HTML or Sorter JSON from a URL (20 MB maximum) into the collection selected when the operation starts. Fetch previews processes marked visible cards, or the visible page, up to 12 items sequentially. Direct website mode reads inert HTML metadata. Named Microlink modes request metadata or screenshots through its unauthenticated public API. Only explicitly selected URLs go to that service. Picture URL accepts remote rasterizable images. Images are downloaded with omitted credentials, decoded, reduced to at most 1200 pixels per side and saved as PNG; original title, URL, note, tags and verdict stay intact. Existing attached pictures are retained. Preview descriptions fill card text only when there is no user note. Preview text and pictures persist in full backups. Failed requests retain previous previews. Cancellation stops the current request and remaining batch; HTTP 429 ends a batch without retries.

Tide Here's Search online uses Photon on explicit clicks, with a one-second minimum between uncached searches. Find official tide stations retrieves independent NOAA and CHS catalogues and offers up to 12 stations within 150 km, with provider, coordinates and distance. The user chooses a station before fetching predictions. UTC provider events are placed into five local days; the nearby bundled coastline supplies the station time zone, with an explicit UTC fallback where absent. NOAA heights are MLLW; Canadian heights are chart datum; model heights remain mean sea level. CHS unlabeled extrema are sorted/deduplicated and must alternate before high/low labels are inferred. Live official forecasts identify the API rather than claiming WASM calculated their tides.

Searches/catalogues cache for seven days, predictions for six hours, with at most 32 cached responses. Stale responses are used only after a failed refresh and display their original retrieval time and a visible notice. Cache quota failure retains a window-only copy. Cancellation never substitutes a cached response. Forecast history/backups retain provider and datum. Both the initial offline workflows and explicit online controls remain available without a custom application server.
