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

## 2026-09-08 — Internet access increment

- Bookmark Sorter: 10 Node/WASM/transport tests and 9 Chromium browser tests pass. The 3 new online journeys also pass in Firefox and WebKit.
- Tide Here: 8 Node/WASM/provider tests and 8 Chromium browser tests pass. The 3 new online journeys also pass in Firefox and WebKit.
- The downloaded Bookmark Sorter fetched a real Microlink screenshot for `https://example.com/`, rasterized it to PNG and saved it in its local SQLite database. No real user bookmark collection was used.
- A real Chromium interaction selected SAN FRANCISCO (Golden Gate) through Find official tide stations and loaded 19 high/low events over September 8–12 from NOAA. The page showed NOAA CO-OPS, MLLW, five local-day cards and retrieval time. Photon returned a real Half Moon Bay result.
- CHS API probes returned station and prediction JSON, but Chromium reported missing CORS headers for both file and loopback-hosted origins. The app's CHS paths are verified with controlled responses and preserve local forecasts on failure. Live Canadian access is not marked verified.
- The image fixture was replaced with a valid generated PNG after Firefox rejected the original fixture's encoding. The WebKit persistence check blocks HTTP(S) requests before reloading the local file; WebKit's simulated offline network mode itself returned an internal error for file navigation. Existing Chromium tests continue to run the original workflows with networking disabled.


## September 8 correction: online first in the normal Tide Here flow

The earlier tests proved only the separate online buttons. The user's San Diego screenshot exposed that the main form still used the offline catalogue and FES2022. The corrected form now prefers online place lookup and official predictions.

- A real Chromium browser submitted `San Diego, California, United States` with Show tides and no additional online clicks. Photon resolved the place and NOAA station **9410170, SAN DIEGO (Broadway)** loaded automatically, 1.3 km away. Five local days (September 8–12) contained **20 events**, labelled NOAA CO-OPS and MLLW.
- Tide Here now has **9 Node tests and 13 Chromium browser tests**. The **8 online browser journeys also pass Firefox and WebKit**. These cover main-form name/address resolution, clear and ambiguous station selection, cached responses, local-only use, failed-provider fallback, cancellation and newer-place protection, geolocation, deep links and history.
- The five offline browser journeys still pass with networking disabled. The static-package Tide Here check explicitly sets offline availability before its initial deep link, so it verifies an actual fallback rather than assuming the default stays offline.
- Canadian live CORS limitations and physical-iPad acceptance remain as recorded above. FES model parity is unchanged.

## September 8 website-parity follow-up

- Plain `San Diego`, with California city/county, Texas city and university matches, now follows the provider ranking. A real Chromium file-origin submission resolved to San Diego, California and automatically loaded NOAA **9410170, SAN DIEGO (Broadway)**, 1.3 km away. September 8 times/heights were 02:14 / -0.20 m, 08:35 / 1.50 m, 13:54 / 0.54 m and 19:58 / 2.07 m, matching the supplied website screenshot. Alternatives remain in collapsed options.
- A real `Maroochydore` submission resolved online and selected **Mooloolaba**, 3.8 km away, **Bureau of Meteorology 2026 tables**, **LAT**, **Australia/Brisbane**. Its September 9 first day showed 00:49 / 0.32 m, 06:32 / 1.41 m, 12:30 / 0.16 m and 19:00 / 1.97 m. Only Photon was requested for this lookup: official Bureau tides come from the same prepared annual data used by the website, embedded here.
- The actual Bureau dataset contains **76 ports / 103,597 extrema**. New tests compare five days event-for-event and datum-for-datum with the unchanged hosted provider at Mooloolaba, Sydney across daylight saving, and Cocos. Another test verifies a Maroochydore match and rejects windows outside, or straddling the end of, 2026.
- The First day input and Today button are absent. All forecasts start today in the selected coast’s zone; old date fragments are ignored. Browser-clock tests cover future model operation and a year-boundary official-table fallback.
- Tide Here now has **11 Node tests and 14 Chromium journeys** (the existing copied-file model test explicitly selects Local model only, while the new Bureau journey verifies automatic official data offline). The **9 online/official browser journeys pass Firefox and WebKit**. Bookmark Sorter’s previously verified 19 tests are unchanged.


## 2026-09-09 — Live US and Canadian coast verification

The explicit `node test/live-coasts.mjs <report.json>` collector opens the
committed standalone file in Chromium and Firefox, submits public coordinates
through Show tides, downloads the resulting forecast, and compares its UTC
events against a separate direct provider response. It does not use fixtures,
change an application or deploy a Site. The [machine-readable evidence](https://github.com/knovak/siteprep/blob/15c0b77e8/initiatives/experiment-with-wasm/notes/live-coasts-20260909.json)
records the bundle SHA-256, time, station, source URL, IANA zone and failures.

All 18 journeys produced five coast-local days, correctly placed unique tide
events, the expected coast's IANA zone and no horizontal overflow or JavaScript
errors. All 15 official forecasts matched the provider's UTC timestamps and
heights; NOAA high/low labels also matched. The Canadian high/low labels remain
covered by the existing alternation tests rather than an upstream H/L field.

| Coast | Expected zone | Chromium | Firefox |
|---|---|---|---|
| San Diego | `America/Los_Angeles` | NOAA SAN DIEGO (Broadway) | NOAA SAN DIEGO (Broadway) |
| Seattle | `America/Los_Angeles` | NOAA SEATTLE (Madison St.), Elliott Bay | NOAA SEATTLE (Madison St.), Elliott Bay |
| Boston | `America/New_York` | NOAA BOSTON | NOAA BOSTON |
| Pensacola | `America/Chicago` | NOAA PENSACOLA | NOAA PENSACOLA |
| Honolulu | `Pacific/Honolulu` | NOAA HONOLULU | NOAA HONOLULU |
| Anchorage | `America/Anchorage` | NOAA ANCHORAGE, Knik Arm | NOAA ANCHORAGE, Knik Arm |
| Victoria | `America/Vancouver` | Explicit local model after incomplete station list | CHS Victoria Harbour |
| Halifax | `America/Halifax` | Labelled local model fallback | CHS Halifax |
| St John's | `America/St_Johns` | Labelled local model fallback | CHS St. Johns |

CHS catalogue requests failed in Chromium with `net::ERR_FAILED`; Firefox
retrieved Victoria Harbour, Halifax and St. Johns successfully. Victoria in
Chromium offered US stations across the strait and required a choice. The
collector deliberately chose the local model instead of treating one of those
stations as the Canadian coast. Halifax and St. John's fell back automatically.
The fallback's “no supported station” wording does not distinguish an empty
regional catalogue from this partial service failure; that product limitation
is recorded here, not passed off as Canadian official coverage.

This supersedes a blanket statement that Canadian browser requests fail: the
result depends on browser and service availability. It does not certify CHS in
Chromium, a physical iPad, other Canadian coasts, future availability or tide
model accuracy. The physical-iPad data blocker remains.
