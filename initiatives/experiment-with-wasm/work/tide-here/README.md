# Tide Here, online with offline fallback

Open **[dist/index.html](dist/index.html)** directly in a browser. It is a single 41.3 MB file with the tide model, place catalogue, interface and WebAssembly engine inside. No backend, static server, account, API key, installation or connection is needed. Chromium, Safari 26.6.2 and Firefox 153.0.4 direct-file use is verified. The hosted workflow passes an iPad Pro 11 WebKit/touch emulation; a physical iPad remains a compatibility follow-up.

Enter a town (optionally followed by its region or country), an address, or latitude and longitude. The highest-ranked online place is used automatically; other matches remain in the options panel. **Show here** asks the browser for location permission. Forecasts start today on that coast; there is no date control. Five days show high/low tides in metres, with expandable sun/moon information. Nearby model points can be selected explicitly. Download individual forecasts or the last 100 history entries; restore a history backup from JSON.

A local bookmark can prefill the app with `#place=Half%20Moon%20Bay%2C%20California` after the file URL. Dates always start today on the selected coast; old date fragments are ignored. Ambiguous offline place names still require a choice. The fragment starts the same online-first lookup as Show tides; Local model only and offline use keep it local.

## What is preserved and what changes

| Capability | Offline edition |
|---|---|
| Five coast-local days and DST-aware placement | Original local-day model retained |
| High/low tide times and heights | Original FES harmonic predictor runs inside WASM |
| Sun, moon and polar no-event states | Original SunCalc 2.0.1 and astronomy layer retained |
| Named locations and coordinates | Photon online search, with a 170,946-place GeoNames fallback |
| Nearby coastal selection | All 65,203 existing global-model points; maximum 40 km |
| National-provider preferences | Automatic NOAA/CHS internet predictions and included official Bureau tables for 76 Australian Standard Ports; FES fallback |
| History | Last 100 forecasts in browser storage, plus export/restore |
| Runtime data retrieval | Photon, NOAA and CHS when online; Bureau tables and model embedded |

Model heights are approximate harmonics relative to mean sea level; official predictions use their labelled station datum. Weather, storm surge, river flow and waves are omitted. The nearest sampled point may lie on a different side of a bay or island; choose a point that fits the coast. Inland and uncovered requests return an explicit message. This is not for navigation or safety decisions.

## Will the data last?

The HTML file carries the model, so clearing browser storage cannot erase it. The harmonic model has no annual expiry; it calculates today from its constants. The included Bureau annual tables cover 2026 only, so five-day windows extending outside that year use the model with an explanation. A 2036 calculation is tested for equivalence with the original algorithm, not for measured long-term accuracy. Coastal changes, model improvements and future time-zone rules may require an updated file. Continued support for the browser technologies cannot be guaranteed forever.

Forecast history and saved online responses live in browser storage. Browser cleanup, private mode or moving the HTML can affect that history. Download history for independent safekeeping; storage failure is reported while calculations remain available.

## Runtime boundary

`src/guest.mjs` bundles the pinned original `@neaps/tide-predictor` 0.11.0 with Schureman nodal corrections. `src/wasm-engine.mjs` evaluates it inside QuickJS compiled to WebAssembly (`quickjs-emscripten` 0.32.0). That interpreter executes the tidal mathematics; the host does not run a duplicate predictor. A Blob worker keeps computation off the interface thread and reports failure if the engine cannot start. This is an interpreted WASM conversion, not a claim of a native numerical port or increased speed.

Browser JavaScript handles the interface, place search, closest-point selection, IANA local-day boundaries, SunCalc astronomy, decompression and local history. Content Security Policy permits HTTP(S) data connections for explicit online controls, while external scripts and frames remain disabled. Opening attribution links is an explicit user navigation.

## Data and licensing

`data/manifest.json` records source identifiers, source and output hashes, counts, transformations and licence URLs. The compact harmonic package is derived from all 376 checksum-verified original coastal tiles, not from the synthetic test fixtures. Coordinates remain float64; amplitude and phase are float32. Twelve reference forecasts constrain resulting differences to under one second and 0.00001 metre.

FES2022 Tide product funded by CNES, produced by LEGOS, NOVELTIS and CLS, made available by AVISO. Tide Here previously transformed the native atlas into coastal harmonic samples; this edition packs those derived values for offline use. [FES2022 source](https://doi.org/10.24400/527896/A01-2024.004), [AVISO licence](https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf). The reviewed licence is retained in `data/AVISO-LICENSE.pdf` and its extracted text. Section 3.2 distinguishes original mass redistribution from sharing adapted material. This bundle carries the transformed extract, not the original 3.95 GB atlas or source access credentials.

Names, aliases and coordinates: [GeoNames](https://www.geonames.org/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), downloaded and compacted 2026-09-07. Regional labels are joined from its administrative-name file. The source coastal sampling used Natural Earth public-domain coastlines and [timezone-boundary-builder](https://github.com/evansiroky/timezone-boundary-builder) time-zone boundaries under ODbL; the source dataset metadata retains their hashes. All model source attributions, changes and licence links are also in the standalone interface. Software licences are in `vendor/THIRD-PARTY-LICENSES.txt` and embedded in the HTML.

## Rebuild and verify

Install the repository's pinned test tools with root `npm ci`, then in this directory:

```sh
npm ci
npm run build
npm test
npm run test:browser
```

The normal build verifies the committed data checksums and embeds it without downloading anything. The prepared Bureau gzip snapshot is committed so builds on different platforms embed identical bytes; the build also checks its full decompressed content against the hosted source. After a reviewed Bureau source change, run `node scripts/build.mjs --refresh-australia` to update that snapshot and its checksum, then commit and repackage the application. `dist/build.json` records the final artifact hash and counts. Root `npm run build` and the post-build screenshot workflow remain separate repository requirements.

Data regeneration is an explicit maintainer operation; it is not needed to run, rebuild or test this app. With the retained original package and downloaded source archives:

```sh
python3 scripts/pack-data.py /path/to/global-coast-r1 /path/to/cities1000.zip /path/to/admin1CodesASCII.txt
node scripts/record-reference.mjs /path/to/global-coast-r1
```

The latter records regression evidence using the original server implementation and full-precision data. Do not refresh those reference results merely to make a failed test pass. The fork and hashes are documented in `fork-provenance.json`; original apps and deployments are not modified.

## Online data

Show tides uses Photon / OpenStreetMap for normal place/address input, then requests nearby NOAA/CHS predictions. The top-ranked online place resolves automatically; a station within 25 km is accepted only when its distance is at most 60% of the next nearest station. Otherwise the app opens a chooser. A failed online lookup or absent supported station uses the bundled catalogue/model with a visible explanation. The same flow handles location, coordinates, history and deep links. Data sources and station options offers alternate stations and an explicit Local model only mode. Sources, retrieval time and the station height datum are shown separately from model output. Responses are cached locally with bounded retention and labelled stale fallback. Local model only and browser-reported offline use make no network requests in the normal search/model workflow. Live NOAA and Photon requests were verified in Chromium; CHS returned API data but browser access failed in this environment and remains subject to provider CORS behavior.

## Australian official tables and website parity

The build uses the same validated `2026-bom-v2` annual source and importer as the hosted Tide Here application: 76 Standard Ports and 103,597 high/low events. It embeds the compressed prepared dataset with source PDF checksums, attribution, conditions, station datums and IANA time zones. Maroochydore selects Mooloolaba; the website and standalone providers are compared event-for-event, including Sydney daylight saving and the Cocos half-hour zone. No live Bureau API or additional backend is implied: the badge says “2026 tables”, and the link opens that station’s original PDF. Refreshing annual coverage requires rebuilding from reviewed source data and distributing a new app file.


### Live provider verification

`node test/live-coasts.mjs /tmp/wasm-live-coasts.json` runs 18 opt-in public
coordinate journeys in Chromium and Firefox against the committed staged app.
The report separates official retrieval from fallback, checks IANA zones and
local-day membership, and compares official event times/heights with the source
API. It is a network observation rather than deterministic CI. September 9
results are in the initiative's `verification.md`: US NOAA passed in both
engines; Canadian CHS passed in Firefox while Chromium retained catalogue
failures. Physical-iPad acceptance remains open.
