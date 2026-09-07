# Test plan

- Run actual WASM SQLite, checking SQL selection results against the original JavaScript reference across exact/prefix/contains/Unicode/boolean cases.
- Test HTML/JSON deduplication and round trip; collections; verdicts/tags/undo; saved/history selections; sitting reports; local images and database backup/restore.
- Verify invalid imports and failed saves are atomic; stale revisions cannot overwrite another window's changes; corrupt/wrong-schema backups are rejected.
- Open the generated HTML through file:// with all network blocked. Import, filter, tag, judge, undo, export, reload and verify data is retained. Exercise desktop and phone layouts and local pictures.
- Confirm the bundle contains a real validated WASM binary; remove/disable WebAssembly and require a clear startup failure rather than a JavaScript fallback.
- Measure a generated 5,600-bookmark workload and record actual timings.
- Run npm run build at repository root after the final source changes. Capture and inspect desktop and phone screenshots after that build.
