# Verification

Verified locally on 2026-09-07 using the pinned dependencies and Chromium installed for this repository. Test data is generated or inline; no personal bookmark exports were used.

| Check | Result |
|---|---|
| SQLite WASM integration | 6 tests passed |
| Offline direct-file browser workflows | 5 tests passed |
| Real WASM | Embedded binary validates as WebAssembly; browser reports SQLite 3.49.1 and executes prepared SQL |
| Network independence | Tested journeys generated zero HTTP(S) requests with network disabled |
| Local saving | Imports, tags, verdicts and reports survive reload; full backup restores pictures and collections |
| Failure handling | Invalid URLs, SQL batch errors, quota/save failure, corrupt/altered backups, stale writes, missing storage and missing WASM covered |
| Device layouts | Desktop 1440 × 1000 and phone 430 × 932 inspected; phone document has no horizontal overflow |
| Generated workload | 5,600 items imported; 2,800 matches bulk-archived and counted correctly |

One measured integration run imported 5,600 bookmarks in 277 ms and completed the subsequent indexed page query, session creation, 2,800-item bulk judgment and count in 198 ms. These are local WASM engine timings with an in-memory persistence test double, not an IndexedDB/browser benchmark or a promise for other devices. The browser tests separately exercise real IndexedDB persistence.

The application is built as `work/dist/index.html` with the 658,410-byte WASM module embedded. Exact final HTML size and SHA-256 hashes are in `work/dist/build.json`. The standalone CI workflow rebuilds that artifact and fails if it differs from the committed distribution.

## Limits of this evidence

Only Chromium was exercised. Safari, Firefox, private browsing and browser storage eviction require separate compatibility/use checks. The complete database is held in memory and snapshotted for each action; the 100 MB cap is a guard, not a claim that 100 MB picture-heavy databases have been benchmarked. No automatic website capture, cloud account management or cross-device synchronization is claimed.

The repository build and final post-build screenshots are required before handoff; the pull request's checks report validation of its exact head. No existing deployment or live bookmark database was changed.
