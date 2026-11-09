# Phase 14: response-time comparison

Research and implementation dated 2026-11-09. The goal is faster first and
repeat forecasts, particularly for Australia, while preserving the selected
coast, official-source priority, forecast values, source metadata and privacy.

## Findings

The previous Australian gateway loaded the complete 19,218,452-byte annual
prediction object for each catalogue or forecast request: 103,597 events for
76 ports. Request-local reuse prevented duplicate storage downloads, but each
request still checked and parsed the full object. This also affected unrelated
FES requests because active-registry verification checked the Australian object.

The browser independently loaded its module graph and five fixture-only JSON
files during normal startup, then waited for geocoding before loading the
Australian catalogue. A repeat visit retained geocoder and hourly forecast
caches, but downloaded the catalogue again.

## Selected implementation

- Pre-process the existing licensed annual artifact into an immutable small
  catalogue and 76 annual port objects. The storage version becomes
  `2026-bom-v2-ports-r2`; displayed source version remains `2026-bom-v2` because
  the underlying Bureau predictions have not changed.
- Verify every Australian object before activating the new registry. On each
  runtime request verify the activated manifest and only the selected objects.
  Each port contains its station and source metadata beside its predictions, so
  forecasts need no separate catalogue read. Independent Australian and FES
  manifest reads overlap. Catalogue requests read no predictions. There is no
  cross-request server cache hiding missing or corrupted selected data.
- Bundle the browser entry point with the already-pinned Vite build dependency.
  The URL and relative configuration paths remain the same; source modules
  remain available for development and fixture checks.
- Load the five fixture JSON files only in fixture mode. Begin loading the
  public Australian catalogue while geolocation/geocoding proceeds.
- Cache validated public station metadata for five minutes in origin-local,
  provider-specific browser storage. Both in-memory and persisted entries
  expire; failures retry and unavailable storage falls through to the network.
  Fixture pages bypass this cache. No submitted locations or forecast history
  enter this cache.

The existing geocoder cache, hourly forecast cache, source selection, five-day
calculation and user-facing layout remain in use. A catalogue activation can
take up to five minutes to reach a returning browser. Forecasts still use the
server's active dataset, and an unavailable selected port fails explicitly.

## Experiments and evidence

The comparison has three separate measurement scopes. Local processing and
injected browser delays must not be described as measured Australian user
latency. The live HTTPS evidence records the responding Cloudflare edge; that
does not establish the physical client location.

- [Server comparison](evidence/server-benchmark.json): four options, three
  ports, 15 repetitions per forecast and catalogue. Complete normalized results
  must match, including source details, heights and `previousTide`. Sydney and
  Adelaide cases cross their daylight-saving transition. This uses the real
  prepared annual data and an in-memory object store, without network delay.
- [Final port-record comparison](evidence/server-benchmark-r2.json): the same
  four layouts plus the selected r2 layout with embedded port metadata and
  parallel manifest checks. Complete forecasts remain equal across all five.
- [Browser comparison](evidence-browser.json): four options, paired cold and
  repeat visits with five repetitions under 150 ms and 250 ms per-response
  delays. Chromium measures navigation until five forecast cards are visible
  and loading ends. All external API responses are mocked. Static HTTP cache is
  disabled so the application's own cache effects remain visible.
- [Live baseline](evidence/live-baseline.json): repeated read-only production
  and test requests for catalogue, Brisbane, Sydney and Fremantle forecasts,
  plus small static controls. Forecast dates are November 9–13, 2026. The
  baseline production catalogue median is 2,106 ms; nine production forecast
  requests have a combined median of 1,837 ms. Static catalogue median is
  64 ms. Requests reached the Sydney edge. Samples are small and include
  network and platform variation.

The measured options are full annual validation, manifest/selected verification
of the same annual file, cross-request raw-body caching of that file, per-port
objects, fixture-download removal, browser bundling, and the combined browser
preload/cache path. Raw-body caching is an experiment only: it retains the
hashing/parsing work and would conceal later storage changes. It is not shipped.

Local server medians (15 repetitions, milliseconds):

| Option | Mooloolaba forecast | Catalogue |
|---|---:|---:|
| Existing annual object, full validation | 252.86 | 284.34 |
| Annual object, selected-object verification | 147.78 | 120.43 |
| Annual object, cross-request raw-body cache | 212.37 | 306.31 |
| Catalogue plus selected port | **7.55** | **1.36** |

The selected port path reads 347,263 bytes rather than 19,237,573 bytes through
the measured gateway (98.2% less). Catalogue reads fall to 85,668 bytes
(99.6% less). The other selected-port forecast medians are 8.28 ms for Sydney
and 7.36 ms for Adelaide. These figures include registry/manifest reads; the
standalone catalogue object is about 49 KB.

That first split was tested live as Test version 17. Its quiet Sydney-edge
catalogue median was 1,176 ms, and forecast medians were 1,361 ms (Brisbane),
1,385 ms (Sydney), and 1,332 ms (Fremantle). The large local CPU reduction did
not remove the sequential storage waits. See
[quiet r1 measurements](evidence/live-sharded-r1.json). The separate
`live-sharded-r1-during-smoke.json` run overlaps initialization/verification
traffic and is retained only as an exploratory observation.

The final r2 layout embeds station and source metadata in the selected port.
In the second local comparison it reduces Mooloolaba from five object reads /
347,263 bytes / 11.36 ms to four reads / 316,062 bytes / 9.68 ms. Combined with
parallel manifest checks, this removes two sequential storage round trips when
both Australian and FES providers are active. The second local run has a noisy
r2 p95 of 259 ms, so its median is evidence of processing cost rather than a
tail-latency promise; the final live results are the deployment comparison.

Final quiet HTTPS measurements, through the Sydney edge (milliseconds):

| Endpoint | Existing Test | First split, r1 | Final port records, r2 |
|---|---:|---:|---:|
| Australian catalogue | 1,784 | 1,176 | **977** |
| Brisbane forecast | 1,610 | 1,361 | **927** |
| Sydney forecast | 1,556 | 1,385 | **892** |
| Fremantle forecast | 1,561 | 1,332 | **909** |

The combined forecast median falls from 1,561 ms to 921 ms, **41.0% faster**;
catalogue median improves **45.2%**. Final measurements use five calls per row
(15 forecasts total), while baseline/r1 use three. All return HTTP 200. The
final static configuration control median is 63 ms. These are small same-day
samples from one execution host, not a nationwide or mobile-carrier benchmark.
They exclude geolocation, geocoding and page startup. The final run started
after the smoke/initialization traffic ended and confirmed the same r2 registry
before and after measurement. See [final live evidence](evidence/live-candidate.json).

Controlled browser medians (five repetitions, milliseconds):

| Per-response delay | Baseline cold / repeat | No fixture downloads | Bundled browser | Bundle + preload/cache |
|---|---:|---:|---:|---:|
| 150 ms | 1,680 / 1,290 | 1,504 / 1,131 | 1,000 / 645 | **857 / 491** |
| 250 ms | 2,645 / 2,103 | 2,414 / 1,831 | 1,616 / 1,075 | **1,389 / 818** |

That is 48–49% faster for the cold browser path and 61–62% faster on repeat
visits in this controlled model. Requests fall from 25/23 to 8/5; the final
repeat path makes no geocoder, station-catalogue or forecast API requests.
These browser figures exclude the server processing improvement because all
variants use the same mocked API delay. They do not model bandwidth, DNS, TLS,
geolocation permission delays or a measured Australian internet connection.

A permanent parsed-data cache could avoid parsing, but would need an explicit
invalidation and memory policy. An edge response cache would need a privacy-safe
key excluding user context and a verified hosting contract; `/forecast` remains
a `POST` response containing caller context with `no-store`. Neither is needed for the selected
improvement. A static station snapshot is a useful latency control, but can
disagree with independently activated server datasets, so runtime selection
continues to use the active catalogue.

## Reproduce

Install root dependencies with `npm ci` and the app's dependencies with `npm ci`
from `initiatives/tide-here/work`. Use the repository-provisioned Chromium.
From the app directory:

```sh
node phase-14/scripts/benchmark-server.mjs --iterations 15
node phase-14/scripts/browser-benchmark.mjs --repetitions=5 --latencies=150,250 \
  --output=phase-14/evidence-browser.json
node phase-14/scripts/benchmark-live.mjs \
  --url https://tide-here-test.ken-novak.chatgpt.site \
  --samples 5 --at 2026-11-09T05:50:00.000Z \
  --output phase-14/evidence/live-candidate.json
```

The live command only reads public endpoints; it never initializes or imports.
It records active registry/dataset snapshots before and after the timings and
fails if activation changed them during the run.
The browser comparison reads baseline source from Git commit `195cf6435`, so
that commit must be available locally. Provider behavior is deterministic in
that experiment; it does not load-test Nominatim, NOAA or CHS.

## Activation and rollback

Deploy this source to Test, then call the existing token-protected `POST /init`.
It writes the new immutable Australian version and checks its complete
inventory before switching the registry. A previously activated global FES
dataset is preserved. Repeat initialization writes no objects. Re-importing a
global FES package uses a distinct registry version containing the new
Australian reference, avoiding an immutable-registry collision.
The reader supports the original annual object, the first split layout (v2 /
ports-r1), and the selected embedded-record layout (v3 / ports-r2).

Until initialization, the new code can read the previous annual Australian
object. Old datasets and registries are retained. Production requires the
usual separate release and protected initialization; merging the PR does not
deploy either Site. Rolling code back also requires restoring the matching
previous registry, since the old code does not understand the new port layout.

## Verification and test deployment

The existing public Test Site was refreshed twice during this investigation:
version 17 tested the first split and version 18 contains the selected port
records plus parallel manifest reads. The final deployment succeeded on
2026-11-09 at 16:17:34 AEST (06:17:34 UTC), from Site source commit
`b2118d6260663fb0051ae419070699cc2133b080`. Its archive contains 78 files and
2,529,280 uncompressed bytes. Public access was preserved. The Test initializer
secret was rotated through Sites and retained as a runtime secret.

- **Test version 18:** <https://tide-here-test.ken-novak.chatgpt.site>.
- **Production version 8, unchanged:**
  <https://tide-here-five-coast-local-days.ken-novak.chatgpt.site>.

The protected hosted migration and a zero-write repeat initialization passed.
The [live smoke result](evidence/live-smoke-final.json) verifies all 76 official
Australian ports / 1,470 events, direct NOAA/CHS boundaries, and Galway,
Cooktown, Gibraltar, Nice and Amsterdam FES forecasts with the existing source
and warning checks. The original global FES dataset remains active.

Local validation passed 152 unit tests, 49 browser checks (one intentional
duplicate viewport-matrix skip), the repository build including its build
tests, and the Sites app build. An independent review checked both migrations,
activation checks, cache isolation and bundle behavior. The raw-source browser
test server now has a larger connection queue: default Python queue overflow
caused connection resets during its parallel module downloads. The staged
bundle also rendered five cards without console or network errors.

Screenshots of the final staged bundle were captured after the build at
`screenshots/tide-here-performance-desktop.png` and
`screenshots/tide-here-performance-phone.png` in the primary checkout. They are
local verification artifacts rather than committed provider data.

## References

Cloudflare documents that the
[Cache API is local to a data centre](https://developers.cloudflare.com/workers/runtime-apis/cache/)
and that its
[R2 caching example requires a supported domain/route](https://developers.cloudflare.com/r2/examples/cache-api/).
That availability is not assumed for Sites hosting. The existing geocoder
continues to follow its configured
[Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/),
including caching and throttling; this work adds no external bulk geocoding.
