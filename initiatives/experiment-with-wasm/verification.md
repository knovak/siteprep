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

## Tide Here — 2026-09-07

The second package passes five integration tests and five Chromium browser tests. Numerical evidence is recorded from the original server code and full-precision retained FES2022b dataset, independently of the compact binary and WASM wrapper.

| Check | Result |
|---|---|
| Original algorithm parity | 12 cases: Half Moon Bay, Galway, Cooktown, Cape Town, Auckland, Vancouver, Mumbai, Rio, Tromsø, Suva, Nice and Galway in 2036; event types/counts match, times differ by less than one second and heights by less than 0.00001 m |
| Real global model | All 65,203 coastal points, 34 constituents and 376 verified source tiles included |
| Offline place search | 170,946 GeoNames records; native/ASCII names, aliases and region/country disambiguation |
| Single-file portability | Only the HTML copied to an unrelated directory; five regions calculated with networking disabled and zero HTTP(S) requests |
| Local day and astronomy behavior | Five days, 23/25-hour DST boundaries, date-line placement, polar always-up/no-rise case |
| Honest unavailable states | Inland/no-coverage, unknown/invalid locations, denied geolocation and engine startup failure |
| History and embedded data | History survives reload, exports/restores; clearing browser storage removes history while the embedded model still calculates; quota failure is visible |
| Phone layout | 390 × 844 viewport, no horizontal overflow |

One direct engine measurement including VM initialization and a five-day Half Moon Bay forecast completed in 75 ms on this machine. It excludes HTML loading, data decompression, place indexing and astronomy; it is not a benchmark promise. The full artifact is about 39.5 MB, larger than Bookmark Sorter because it carries the global dataset and gazetteer. Exact size and hash are in `work/tide-here/dist/build.json`.

The source package is the existing derived FES2022b coastal extract, not the synthetic feasibility fixtures or the original 3.95 GB atlas. AVISO licence, source metadata, checksums, transformations and attribution are retained. Runtime and build details are in the Tide Here README and root technical documentation.

Tide Here screenshots are written after the final repository build to `screenshots/wasm-tide-here-desktop.png` and `screenshots/wasm-tide-here-phone.png`. These tests establish implementation parity and offline behavior in Chromium; they do not establish new empirical model accuracy, perpetual forecast accuracy, or Safari/Firefox acceptance. The offline app always uses global-model predictions, with visible mean-sea-level datum and coverage limits.

## Static demo package — 2026-09-07

Four additional Chromium website checks cover complete file equality, the original wish, local links/anchors, Bookmark Sorter sample editing, Tide Here sample/second-coast calculations, and phone layout. Both app workflows produce no HTTP(S) requests after loading. This is separate from guaranteed offline reopening, which the website does not implement.

The package preserves the standalone app hashes. Source is `work/site/` and the release copy is `demos/experiment-with-wasm/`; CI checks generated-package drift and release equality. Final post-build screenshots are `screenshots/wasm-demo-desktop.png`, `screenshots/wasm-demo-phone.png`, `screenshots/wasm-demo-findings.png` and `screenshots/wasm-demo-toc.png`. Actual iPad/Safari use remains unverified.
