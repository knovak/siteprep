# Verification

Verified locally on 2026-09-07 using the pinned dependencies and Chromium installed for this repository. Test data is generated or inline; no personal bookmark exports were used.

## Cross-browser follow-up — 2026-09-07

The downloaded files were also exercised in the installed desktop browsers, not just a test-engine substitute:

| Browser or device | Result |
|---|---|
| Safari 26.6.2 | Both `file://` applications opened. Bookmark Sorter created a sample, retained an edited verdict across reload, downloaded a full SQLite backup, and restored that backup into a fresh copy with 18 items and the edited 17-item backlog intact. Tide Here calculated five days from the embedded model and retained its local history across reload. |
| Firefox 153.0.4 | Both downloaded applications opened and reached their ready WASM states. The pinned Playwright Firefox 144.0.2 build then passed all 6 Bookmark Sorter direct-file cases, all 5 Tide Here direct-file cases, and all 4 static-demo cases. |
| WebKit 26.0 automation | The static demo and both hosted application workflows passed. Playwright WebKit reports an internal engine error when it navigates directly to either large `file://` artifact, although the installed Safari opens those same files successfully. This automation limitation is recorded rather than treated as a Safari failure. |
| iPad Pro 11 emulation | All 4 static-demo cases passed with Playwright WebKit at 834 × 1194, touch enabled, a mobile iPad user agent, offline post-load actions, and persistence across reload. This is layout and engine evidence, not a physical-iPad acceptance result. |

The Firefox run exposed a bad CRC in the browser test's generated one-pixel PNG. Chromium had decoded that malformed fixture; replacing it with a valid PNG made the same picture, backup, and restore path pass in Firefox. No application image-validation rule was relaxed.

| Check | Result |
|---|---|
| SQLite WASM integration | 7 tests passed |
| Offline direct-file browser workflows | 6 tests passed |
| Real WASM | Embedded binary validates as WebAssembly; browser reports SQLite 3.49.1 and executes prepared SQL |
| Network independence | Tested journeys generated zero HTTP(S) requests with network disabled |
| Local saving | Imports, tags, verdicts and reports survive reload; full backup restores pictures and collections |
| Failure handling | Invalid URLs, SQL batch errors, quota/save failure, corrupt/altered backups, stale writes, missing storage and missing WASM covered |
| Device layouts | Desktop 1440 × 1000 and phone 430 × 932 inspected; phone document has no horizontal overflow |
| Generated workload | 5,600 items imported; 2,800 matches bulk-archived and counted correctly |

One measured integration run imported 5,600 bookmarks in 277 ms and completed the subsequent indexed page query, session creation, 2,800-item bulk judgment and count in 198 ms. These are local WASM engine timings with an in-memory persistence test double, not an IndexedDB/browser benchmark or a promise for other devices. The browser tests separately exercise real IndexedDB persistence.

The application is built as `work/dist/index.html` with the 658,410-byte WASM module embedded. Exact final HTML size and SHA-256 hashes are in `work/dist/build.json`. The standalone CI workflow rebuilds that artifact and fails if it differs from the committed distribution.

## Limits of this evidence

Chromium, installed desktop Safari and installed desktop Firefox have now been exercised. A physical iPad, private browsing and browser storage eviction still require separate compatibility/use checks. The complete database is held in memory and snapshotted for each action; the 100 MB cap is a guard, not a claim that 100 MB picture-heavy databases have been benchmarked. No automatic website capture, cloud account management or cross-device synchronization is claimed.

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

Four additional website checks cover complete file equality, the original wish, local links/anchors, Bookmark Sorter sample editing and persistence, Tide Here sample/second-coast calculations and history persistence, and phone layout. They pass in Chromium, Firefox, WebKit and an iPad Pro 11 WebKit/touch emulation. Both app workflows produce no HTTP(S) requests after loading. This is separate from guaranteed offline reopening, which the website does not implement.

The package preserves the standalone app hashes. Source is `work/site/` and the release copy is `demos/experiment-with-wasm/`; CI checks generated-package drift and release equality. Final post-build screenshots are `screenshots/wasm-demo-desktop.png`, `screenshots/wasm-demo-phone.png`, `screenshots/wasm-demo-findings.png` and `screenshots/wasm-demo-toc.png`. Installed Safari is verified; actual iPad use remains unverified.
