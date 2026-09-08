# Tide Here, offline

Open **[dist/index.html](dist/index.html)** directly in a browser. It is a single 39.5 MB file with the tide model, place catalogue, interface and WebAssembly engine inside. No backend, static server, account, API key, installation or connection is needed. Chromium, Safari 26.6.2 and Firefox 153.0.4 direct-file use is verified. The hosted workflow passes an iPad Pro 11 WebKit/touch emulation; a physical iPad remains a compatibility follow-up.

Enter a town (optionally followed by its region or country), choose a matching place, or enter latitude and longitude. **Show here** asks the browser for location permission. Choose the first local date or leave it blank for today on that coast. Five days show high/low tides in metres, with expandable sun/moon information. Nearby model points can be selected explicitly. Download individual forecasts or the last 100 history entries; restore a history backup from JSON.

A local bookmark can prefill the app with `#place=Half%20Moon%20Bay%2C%20California&date=2026-09-07` after the file URL. Omit the date for today; ambiguous place names still require a choice. The fragment is processed locally.

## What is preserved and what changes

| Capability | Offline edition |
|---|---|
| Five coast-local days and DST-aware placement | Original local-day model retained |
| High/low tide times and heights | Original FES harmonic predictor runs inside WASM |
| Sun, moon and polar no-event states | Original SunCalc 2.0.1 and astronomy layer retained |
| Named locations and coordinates | 170,946-place GeoNames catalogue and aliases replace live Nominatim |
| Nearby coastal selection | All 65,203 existing global-model points; maximum 40 km |
| National-provider preferences | FES model by default; explicit NOAA/CHS station requests are available online; no annual BoM tables |
| History | Last 100 forecasts in browser storage, plus export/restore |
| Runtime data retrieval | None; data and software are embedded |

Heights are approximate astronomical harmonics relative to model mean sea level, not chart datum. Weather, storm surge, river flow and waves are omitted. The nearest sampled point may lie on a different side of a bay or island; choose a point that fits the coast. Inland and uncovered requests return an explicit message. This is not for navigation or safety decisions.

## Will the data last?

The HTML file carries the model, so clearing browser storage cannot erase it. There is no annual prediction-table expiry: the engine calculates the selected date from harmonic constants. A 2036 calculation is tested for equivalence with the original algorithm, not for measured long-term accuracy. Coastal changes, model improvements and future time-zone rules may require an updated file. Continued support for the browser technologies cannot be guaranteed forever.

Only personal forecast history lives in browser storage. Browser cleanup, private mode or moving the HTML can affect that history. Download history for independent safekeeping; storage failure is reported while calculations remain available.

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

The normal build verifies the committed data checksums and embeds it without downloading anything. `dist/build.json` records the final artifact hash and counts. Root `npm run build` and the post-build screenshot workflow remain separate repository requirements.

Data regeneration is an explicit maintainer operation; it is not needed to run, rebuild or test this app. With the retained original package and downloaded source archives:

```sh
python3 scripts/pack-data.py /path/to/global-coast-r1 /path/to/cities1000.zip /path/to/admin1CodesASCII.txt
node scripts/record-reference.mjs /path/to/global-coast-r1
```

The latter records regression evidence using the original server implementation and full-precision data. Do not refresh those reference results merely to make a failed test pass. The fork and hashes are documented in `fork-provenance.json`; original apps and deployments are not modified.

## Online data

Search online uses Photon / OpenStreetMap for addresses and smaller places. Find official tide stations offers nearby NOAA and CHS stations, with coordinates and distance. Choosing a station downloads five days of predictions. Sources, retrieval time and the station height datum are shown separately from model output. Responses are cached locally with bounded retention and labelled stale fallback. No internet request is needed for the original search/model workflow. Live NOAA and Photon requests were verified in Chromium; CHS returned API data but browser access failed in this environment and remains subject to provider CORS behavior.
