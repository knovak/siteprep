# Findings from the WASM experiment

Updated September 9, 2026. These are working applications and measured implementation checks, with the remaining limits stated below.

## What WebAssembly contributes

WebAssembly (WASM) is a portable format for compiled programs. In a web application, it runs within the browser's security boundaries and works alongside JavaScript. Here it lets established software do the database work and tidal calculations on the user's device. JavaScript still provides the interface and browser services. WASM by itself does not supply data, durable storage, an offline installation, or a speed improvement. [WebAssembly overview](https://webassembly.org/).

## Why Bookmark Sorter came first

Bookmark Sorter already accepted complete local bookmark exports and used SQLite queries through its hosted database. That made it the simpler first conversion. Tide Here also had suitable calculations, but a useful offline version needed its geographic and tide-model inputs as well as the software. The subsequent Tide Here conversion bundled the complete available coastal extract and a place catalogue.

| | Bookmark Sorter | Tide Here |
|---|---|---|
| Work performed in WASM | SQLite queries, storage operations, filtering, tags, verdicts and history | Original harmonic tide predictions with Schureman corrections |
| Runtime | SQLite compiled to WASM through sql.js | Original JavaScript predictor interpreted by QuickJS compiled to WASM |
| Inputs | The user's imported bookmarks; optional sample collection | 65,203 coastal model points, 34 harmonic constituents and 170,946 searchable places |
| Standalone file | About 1.1 MB | About 41.3 MB |
| Browser JavaScript | Interface, import parsing, expression preparation and persistence | Interface, place matching, local dates, decompression and sun/moon calculations |
| Optional online functions | URL imports, direct website metadata, picture downloads, Microlink details/screenshots | Online-first place/address search and NOAA/CHS forecasts, with clear-match selection and local fallback |

Tide Here's conversion preserves the existing predictor inside a WASM interpreter. It is not a new native numerical implementation. The experiment establishes that both applications can perform their central work locally; it does not establish that WASM made them faster.

## What “no backend” means here

This demo is a static website: hosting delivers files, and the browser runs each application. Its local workflows need no runtime network access. Bookmark Sorter's explicit online controls and Tide Here's normal Show tides action retrieve data through browser HTTP(S) requests. Following a bookmark or a source link opens an external website. Tide Here's optional location button uses the browser's location service, which may involve operating-system services.

For desktop use without a connection, download the application's HTML file and open it in a supported browser. The tests copied Tide Here to an unrelated directory and blocked networking. A web address still needs a connection to load unless the browser has retained it; these versions do not yet include a service worker or a guaranteed offline reopening installation. Adding a website to a Home Screen alone is not that guarantee.

## Will the data last?

**Bookmark Sorter:** the application file and your bookmark database are separate. Edits are saved in this browser's IndexedDB. Browser cleanup, storage eviction, private browsing, switching browsers, or moving between the downloaded file and the website can make that database unavailable. Use **Local tools → Download full backup** to keep all collections, attached pictures, selections and history in an independent SQLite file. The ordinary bookmark JSON export is portable too, but does not contain every part of the database.

Saving errors are visible, failed actions roll back, and stale tabs cannot overwrite newer saved changes. The database is copied as a complete snapshot on each change, so large picture collections increase memory and save costs. The current database limit is 100 MB.

**Tide Here:** the coastal model and place catalogue are embedded in the HTML. Clearing browser storage cannot remove them from a saved copy of that file. Optional forecast history and saved online responses use browser storage; it has download and restore controls. The model calculates dates from harmonic constants. The additional Bureau tables cover 2026 only; requests extending outside their coverage fall back to the model with an explanation. Coastlines, model accuracy, time-zone rules and browser support can change, so this is not a promise of perpetual accuracy or compatibility.

Both applications keep their databases on the current device and browser; they do not synchronize them across devices. Requested online searches and URLs are sent to the named services. Moving from a local file to this website does not automatically move a bookmark database. Export a backup from the old location and restore it in the new one. [WebKit's storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) explains why browser storage should not be the only copy.

## Tide coverage and meaning

The included harmonic calculator uses FES2022b. Automatic source selection also uses the included official Bureau annual tables at Australian Standard Ports, even offline. The normal Show tides action prefers official station forecasts with separately labelled provider datums. Fallback model heights are approximate astronomical harmonics in metres relative to model mean sea level, not local chart datum. Weather, storm surge, waves and river flow are excluded. These results are not for navigation or safety decisions.

The app offers sampled coastal points within 40 km of the selected place. Inland locations and uncovered coasts return a coverage message. A nearby point can be on a different side of a bay or island; its coordinates are shown and alternatives can be selected. The offline place catalogue supports town names, aliases and regions, not arbitrary street addresses; coordinates work independently of name coverage.

The bundled values come from the existing derived FES2022b coastal dataset, not synthetic tide fixtures. Source hashes, licences, prior transformations and attribution are retained in the applications and the [demo provenance](provenance.json). The large original native atlas and its access credentials are not distributed. [FES2022 source](https://doi.org/10.24400/527896/A01-2024.004), [AVISO licence](https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf), [GeoNames](https://www.geonames.org/), [GeoNames licence](https://creativecommons.org/licenses/by/4.0/).

## What has been checked

| Check | Evidence |
|---|---|
| Bookmark Sorter | Ten integration/transport tests and nine Chromium browser tests, including online controls |
| Bookmark workload | 5,600 generated bookmarks; indexed paging and a 2,800-item bulk verdict |
| Tide Here | Eleven integration/provider tests and fourteen Chromium browser tests |
| Numerical equivalence | Twelve comparisons with the original full-precision FES forecasts, across continents and a 2036 date; event types/counts match, times differ by less than one second and heights by less than 0.00001 metre |
| Offline operation | Copied standalone HTML, networking disabled, zero HTTP(S) requests during the tested application workflows |
| Recovery and limits | Backup/restore, reload, quota errors, missing WASM, invalid input, stale bookmark writes, and tide history loss |
| Dates and astronomy | Coast-local days, 23/25-hour daylight-saving days, date-line placement and polar no-event conditions |
| Online browser checks | Three Bookmark Sorter journeys and nine Tide Here journeys pass in Chromium, Firefox and WebKit |
| Layout | Chromium desktop and phone layouts checked |
| Desktop browser compatibility | Installed Safari 26.6.2 and Firefox 153.0.4 opened both downloaded apps; Safari retained and restored Bookmark Sorter data, and Firefox passed all automated direct-file suites |
| iPad-shaped compatibility | The static demo and both hosted workflows pass an iPad Pro 11 WebKit/touch emulation; no physical iPad result is claimed |

These are implementation and portability checks. They are not independent scientific validation of tidal accuracy, proof of indefinite persistence, or proof that every browser works. [Original verification record](verification.txt).

## iPad and Safari findings

Recent iPad Safari has the relevant browser capabilities. Tide Here's compression-stream API arrived in Safari 16.4. Both downloaded apps now work in installed desktop Safari 26.6.2, including local persistence and recovery. Both hosted workflows also pass an iPad Pro 11 WebKit/touch emulation, but neither app has been verified on an actual iPad; opening downloaded HTML from Files remains a distinct acceptance question. Tide Here's large embedded dataset may increase startup time and memory pressure on an older iPad. [Safari 16.4 features](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/).

A useful next increment would be a Home Screen installation with explicit offline caching, followed by real-device checks for touch controls, cold reopening in airplane mode, saving, and backup restoration. The examples here do not yet include that installation layer. A static download site can supply such an app without an application backend. [Apple's iPad web-app instructions](https://support.apple.com/guide/ipad/open-as-web-app-ipad8f1f7a29/ipados), [WebKit's offline service-worker support](https://webkit.org/blog/8090/workers-at-your-service/).

## Lessons learned

This experiment set out to demonstrate WASM applications and learn what building one is like. What it found:

WASM apps with relatively small data sets run extremely fast compared to a website. "Small" can mean 40 MB, as with the Tide Here coastal model and place catalogue, or under 10 MB even for large bookmark collections.

Internet access needs to be explicitly enabled. Nothing about compiling to WASM opens a network connection on its own; the first versions here disabled it outright with `connect-src 'none'`, and later revisions permitted HTTP(S) requests only after adding explicit controls for it, as described above.

Some web services enforce CORS, and a connection from a WASM container in a user's browser will fail against them. The CHS station and prediction adapters above are the example: their JSON responses were available to a direct API probe but blocked by browser CORS in the live test, even from a hosted loopback origin. Clients that need to reach such a service will need a lightweight server to proxy their calls.

Data can persist independently of code, so that an app update doesn't destroy local data — Bookmark Sorter's IndexedDB database and Tide Here's saved history both survive a new build of the application file. But it's best to make regular backups in case a major update does disturb the data; that's why both apps include an explicit backup/restore control rather than relying on browser storage alone.

Keeping both a website and a WASM version of an app in sync could be challenging. Having them in different initiatives almost guarantees functional drift between them, and this experiment already shows it: the Tide Here fork needed a dedicated website-parity pass to catch up to hosted behavior it had fallen behind on. Some functions also make more sense in WASM than on the website, such as Bookmark Sorter's "Online tools" menu. Somewhat like having separate versions for mobile or desktop, WASM presents an additional target for app deployment, with its own customizations.

## What remains open

Physical-iPad acceptance remains follow-up work. A reliable Home Screen offline installation, very large bookmark databases, broader performance measurements and any future model/data refresh need their own implementation and checks. The existing hosted Bookmark Sorter and Tide Here applications are separate from these experimental forks. A prioritized, non-binding menu is in [optional improvements](improvements.txt).

## Internet access and remaining service limits

WASM itself does not prohibit internet access. The first versions explicitly disabled it with `connect-src 'none'`; the September 8 revision permits HTTP(S) requests while keeping both offline workflows intact. No custom backend was added.

Bookmark Sorter can import export URLs, fetch website metadata directly, save picture URLs, and use explicit Microlink metadata or screenshot modes. The service receives the requested URL only when selected and invoked. Preview batches are limited to 12, run sequentially, can be cancelled and stop on quota errors. Existing user fields and local pictures are retained. Microlink’s unauthenticated endpoint has a small free quota and may fail on particular websites. [Microlink documentation](https://microlink.io/docs/api/basics/rate-limit).

Tide Here's Show tides action resolves names and addresses through Photon and prefers NOAA/CHS predictions. The top-ranked online place resolves automatically, preferring a settlement over a leading administrative boundary. A station within 25 km is accepted when its distance is at most 60% of the next nearest station; other nearby matches require a choice. Failed lookups or absent stations produce labelled local fallbacks, and Local model only disables normal online requests. Searches/catalogues cache for seven days and predictions for six hours; stale fallback after service failure preserves the retrieval timestamp and displays a notice. Station results are limited to 150 km and must be checked against the actual bay/coast. The station’s time zone comes from the nearby embedded coastline, or UTC where unavailable. [Photon usage](https://github.com/komoot/photon), [NOAA API](https://api.tidesandcurrents.noaa.gov/api/dev), [CHS web services](https://www.tides.gc.ca/en/web-services-offered-canadian-hydrographic-service).

Live Chromium checks submitted San Diego through Show tides, resolved it via Photon, and automatically loaded 20 NOAA events for September 8–12 from SAN DIEGO (Broadway), station 9410170. Earlier checks also saved a Microlink screenshot as a local PNG. CHS station/prediction requests returned JSON through an API probe but were blocked by browser CORS in the live test, even from a hosted loopback origin. Its adapters and failure/cached paths are covered with controlled responses; live Canadian access remains unverified. This is an upstream/browser restriction rather than an application policy denying connections. The original FES model remains usable when services fail. [Browser access rules](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

The standalone app also includes the same prepared 2026 Bureau of Meteorology tables as the website: 76 Australian Standard Ports and 103,597 extrema. Maroochydore resolves to Mooloolaba, with identical September 9 event times and heights. These official annual predictions work offline and are labelled “2026 tables”; they are not a live Bureau response. Source PDFs, attribution, disclaimer, LAT and station time zones are retained. A five-day window extending beyond 2026 visibly falls back to the harmonic model. Every forecast starts today in its coast’s zone, without date controls. [Bureau annual tide tables](https://www.bom.gov.au/oceanography/projects/ntc/tide_tables.shtml).
