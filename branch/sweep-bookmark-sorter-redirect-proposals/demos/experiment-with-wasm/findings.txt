# Findings from the WASM experiment

Recorded September 7, 2026. These are working applications and measured implementation checks, with the remaining limits stated below.

## What WebAssembly contributes

WebAssembly (WASM) is a portable format for compiled programs. In a web application, it runs within the browser's security boundaries and works alongside JavaScript. Here it lets established software do the database work and tidal calculations on the user's device. JavaScript still provides the interface and browser services. WASM by itself does not supply data, durable storage, an offline installation, or a speed improvement. [WebAssembly overview](https://webassembly.org/).

## Why Bookmark Sorter came first

Bookmark Sorter already accepted complete local bookmark exports and used SQLite queries through its hosted database. That made it the simpler first conversion. Tide Here also had suitable calculations, but a useful offline version needed its geographic and tide-model inputs as well as the software. The subsequent Tide Here conversion bundled the complete available coastal extract and a place catalogue.

| | Bookmark Sorter | Tide Here |
|---|---|---|
| Work performed in WASM | SQLite queries, storage operations, filtering, tags, verdicts and history | Original harmonic tide predictions with Schureman corrections |
| Runtime | SQLite compiled to WASM through sql.js | Original JavaScript predictor interpreted by QuickJS compiled to WASM |
| Inputs | The user's imported bookmarks; optional sample collection | 65,203 coastal model points, 34 harmonic constituents and 170,946 searchable places |
| Standalone file | About 1.1 MB | About 39.5 MB |
| Browser JavaScript | Interface, import parsing, expression preparation and persistence | Interface, place matching, local dates, decompression and sun/moon calculations |
| Online functions replaced | Cloud ownership and remote pictures become local ownership and attached pictures | Live geocoding becomes a local catalogue; national-provider forecasts become global-model predictions |

Tide Here's conversion preserves the existing predictor inside a WASM interpreter. It is not a new native numerical implementation. The experiment establishes that both applications can perform their central work locally; it does not establish that WASM made them faster.

## What “no backend” means here

This demo is a static website: hosting delivers files, and the browser runs each application. After its HTML loads, the app makes no network requests for its calculations, data or interface. Following a bookmark or a source link opens an external website. Tide Here's optional location button uses the browser's location service, which may involve operating-system services.

For desktop use without a connection, download the application's HTML file and open it in a supported browser. The tests copied Tide Here to an unrelated directory and blocked networking. A web address still needs a connection to load unless the browser has retained it; these versions do not yet include a service worker or a guaranteed offline reopening installation. Adding a website to a Home Screen alone is not that guarantee.

## Will the data last?

**Bookmark Sorter:** the application file and your bookmark database are separate. Edits are saved in this browser's IndexedDB. Browser cleanup, storage eviction, private browsing, switching browsers, or moving between the downloaded file and the website can make that database unavailable. Use **Local tools → Download full backup** to keep all collections, attached pictures, selections and history in an independent SQLite file. The ordinary bookmark JSON export is portable too, but does not contain every part of the database.

Saving errors are visible, failed actions roll back, and stale tabs cannot overwrite newer saved changes. The database is copied as a complete snapshot on each change, so large picture collections increase memory and save costs. The current database limit is 100 MB.

**Tide Here:** the coastal model and place catalogue are embedded in the HTML. Clearing browser storage cannot remove them from a saved copy of that file. Only optional forecast history uses browser storage; it has download and restore controls. There is no yearly prediction table that runs out: the engine calculates dates from harmonic constants. Coastlines, model accuracy, time-zone rules and browser support can change, so this is not a promise of perpetual accuracy or compatibility.

Both applications keep personal data on the current device and browser; they do not synchronize it across devices. Moving from a local file to this website does not automatically move a bookmark database. Export a backup from the old location and restore it in the new one. [WebKit's storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) explains why browser storage should not be the only copy.

## Tide coverage and meaning

The offline edition uses the FES2022b global model everywhere, including where the online Tide Here prefers official national predictions. Heights are approximate astronomical harmonics in metres relative to model mean sea level, not local chart datum. Weather, storm surge, waves and river flow are excluded. These results are not for navigation or safety decisions.

The app offers sampled coastal points within 40 km of the selected place. Inland locations and uncovered coasts return a coverage message. A nearby point can be on a different side of a bay or island; its coordinates are shown and alternatives can be selected. The offline place catalogue supports town names, aliases and regions, not arbitrary street addresses; coordinates work independently of name coverage.

The bundled values come from the existing derived FES2022b coastal dataset, not synthetic tide fixtures. Source hashes, licences, prior transformations and attribution are retained in the applications and the [demo provenance](provenance.json). The large original native atlas and its access credentials are not distributed. [FES2022 source](https://doi.org/10.24400/527896/A01-2024.004), [AVISO licence](https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf), [GeoNames](https://www.geonames.org/), [GeoNames licence](https://creativecommons.org/licenses/by/4.0/).

## What has been checked

| Check | Evidence |
|---|---|
| Bookmark Sorter | Six integration tests and five offline Chromium browser tests |
| Bookmark workload | 5,600 generated bookmarks; indexed paging and a 2,800-item bulk verdict |
| Tide Here | Five integration tests and five offline Chromium browser tests |
| Numerical equivalence | Twelve comparisons with the original full-precision FES forecasts, across continents and a 2036 date; event types/counts match, times differ by less than one second and heights by less than 0.00001 metre |
| Offline operation | Copied standalone HTML, networking disabled, zero HTTP(S) requests during the tested application workflows |
| Recovery and limits | Backup/restore, reload, quota errors, missing WASM, invalid input, stale bookmark writes, and tide history loss |
| Dates and astronomy | Coast-local days, 23/25-hour daylight-saving days, date-line placement and polar no-event conditions |
| Layout | Chromium desktop and phone layouts inspected |

These are implementation and portability checks. They are not independent scientific validation of tidal accuracy, proof of indefinite persistence, or proof that every browser works. [Original verification record](verification.txt).

## iPad and Safari findings

Recent iPad Safari has the relevant browser capabilities. Tide Here's compression-stream API arrived in Safari 16.4. However, neither app has been verified on an actual iPad or in Safari, and opening downloaded HTML from Files is a separate compatibility question from running a normal website. Tide Here's large embedded dataset may increase startup time and memory pressure on an older iPad. [Safari 16.4 features](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/).

A useful next increment would be a Home Screen installation with explicit offline caching, followed by real-device checks for touch controls, cold reopening in airplane mode, saving, and backup restoration. The examples here do not yet include that installation layer. A static download site can supply such an app without an application backend. [Apple's iPad web-app instructions](https://support.apple.com/guide/ipad/open-as-web-app-ipad8f1f7a29/ipados), [WebKit's offline service-worker support](https://webkit.org/blog/8090/workers-at-your-service/).

## What remains open

Safari, Firefox and real iPad acceptance remain follow-up work. A reliable Home Screen offline installation, very large bookmark databases, broader performance measurements and any future model/data refresh need their own implementation and checks. The existing hosted Bookmark Sorter and Tide Here applications are separate from these experimental forks.
