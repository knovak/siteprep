# Spec

How Tide Here is built. `objectives.md` says what “done” means; this document
chooses the first version and the boundaries that keep its answers honest.
Numbered references to **O1–O8** are the objectives.

## 1. What the first version is

A compact web page with a manual location form and a five-day result. A person
enters a place name or latitude/longitude. The page resolves the input, makes
the coastal match explicit, and then shows high and low tides, sunrise and
sunset, moonrise and moonset, and moon phase for five civil days at that coast.

The first version has deliberately limited but multi-country tide coverage:
**NOAA CO-OPS prediction stations in the United States and its territories,
plus Canadian Hydrographic Service IWLS prediction stations.** Arbitrary place
strings are accepted as input, but a place outside that coverage receives a
coverage message rather than a tide table borrowed from a distant station.
The provider audit in §2 shows the wider path; it does not imply coverage the
configured adapters have not earned.

The deliverable is a **static page**. The browser performs geocoding, station
selection, provider retrieval, normalization, and astronomical calculation.
That is appropriate for one user making a few requests per month, and it keeps
the first version free of a function, database, account, or deployment secret.
There is no saved-place list, automatic browser-location prompt, or custom
domain in this version (O7–O8). The local diagnostic history in §7 is deliberate
and user-visible; it is not a saved-place feature or remote analytics.

## 2. Alternatives considered: tide coverage and source

| Option | Strengths | Weaknesses |
|---|---|---|
| **A registry of official national providers** *(chosen)* | Keeps attribution, datum, station metadata, and coverage honest per authority; lets free public services be added independently | Each country has a different contract, licence, format, authentication rule, and browser-access story |
| **NOAA CO-OPS plus CHS IWLS first** | Both are official, documented JSON services with no application key; both allow browser cross-origin reads; together cover U.S. and Canadian coasts | Still not global; the normalized adapter contract and cross-border station selection need tests |
| **A commercial global tide API** | One integration can cover many countries; usually offers a nearby-station endpoint and support | Key, quota, cost, vendor dependence, and redistribution terms become part of the first demo; “global” coverage still needs validation coast by coast |
| **A local harmonic engine and constituent dataset** | No runtime tide provider; repeatable and potentially global | The constituent dataset, datum, station updates, and validation become our responsibility; weather effects remain outside the prediction |
| **Scrape published tide pages** | Broad apparent coverage with little modelling work | Brittle, difficult to attribute, often disallowed, and incapable of a stable response contract |

The first pair is chosen because the first version needs a defensible answer
more than a wide one. The [NOAA CO-OPS Data API](https://api.tidesandcurrents.noaa.gov/api/prod/)
provides `predictions` with `interval=hilo`; subordinate prediction stations use
the MLLW datum. The [Canadian Hydrographic Service IWLS API](https://tides.gc.ca/en/web-services-offered-canadian-hydrographic-service)
is a free licensed REST/JSON service with predictions and station metadata
across Canada, limited to 3 requests per second and 30 per minute. Browser smoke
checks on 2026-08-19 confirmed cross-origin JSON reads from NOAA and CHS. Each
adapter requests or derives UTC instants and carries its provider datum, so one
explicit IANA time zone still controls tides, astronomy, headings, and date
boundaries (O5).

### 2.1 International provider audit

There are enough official public sources that “global” should be a provider
registry, not a commercial-API synonym. This is the initial audit; every future
adapter must still verify licence, attribution, station/datum semantics, stable
machine access, CORS, limits, and a five-day high/low contract.

| Coverage | Official source found | Disposition |
|---|---|---|
| United States and territories | [NOAA CO-OPS](https://api.tidesandcurrents.noaa.gov/api/prod/) documented JSON, no key | First version |
| Canada | [CHS IWLS](https://tides.gc.ca/en/web-services-offered-canadian-hydrographic-service) documented JSON, free under licence | First version |
| Australia, Antarctica, South Pacific | [Bureau of Meteorology tide service](https://www.bom.gov.au/australia/tides/about/index.shtml), over 380 locations and seven-day predictions | First v2 target. The public page is authoritative, but no supported prediction API was found; BOM blocks automated page access and publishes reproduction conditions. Do not scrape it. Add only after BOM confirms a stable machine feed and terms |
| United Kingdom and Ireland | [UKHO Tidal API Discovery](https://www.api.gov.uk/ukho/uk-tidal-api-discovery/), 607 UK stations and current day plus six days | v2; free one-year subscription still means registration, a client credential, and licence review |
| New Zealand | [LINZ annual CSV predictions](https://www.linz.govt.nz/products-services/tides-and-tidal-streams/tide-predictions/tide-predictions-list-view) for many standard ports, with offset files for secondary locations | v2; build a versioned annual-file adapter and test offset stations |
| Norway | [Kartverket water-level API](https://www.kartverket.no/en/api-and-data/tides-and-water-level-data), open without registration under CC BY 4.0 | Strong v2 browser-adapter candidate |
| France and serviced overseas ports | [Shom official predictions](https://diffusion.shom.fr/portail-horaires-des-marees.html) and [Shom APIs](https://diffusion.shom.fr/services-numeriques/api-shom.html) | v2; prediction API key/subscription and reproduction terms need review |
| Japan | [JMA astronomical tide tables](https://ds.data.jma.go.jp/kaiyou/shindan/index_tide.html) | v2 research; public predictions exist, but a stable documented application contract was not confirmed |
| Other European and OECD coasts | National hydrographic services plus Copernicus/EMODnet regional products | Audit every coastal OECD member country by country; gridded sea-level products do not automatically satisfy the station high/low contract |

Australia stays first in the v2 queue rather than being forced into v1 through
an undocumented endpoint. Canada enters v1 because its official service already
has the stable machine contract Australia still needs. The page names its
configured U.S./Canadian coverage beside the form. Unsupported does not mean
broken: it is a first-class result with a short explanation and no events.

## 3. Alternatives considered: resolving a place and coast

### 3.1 Geocoder

| Option | Strengths | Weaknesses |
|---|---|---|
| **Public Nominatim, called by the static adapter** *(chosen for the one-user first version)* | Handles forward and reverse geocoding; no account; returns a standard display name and coordinates; a website Referer identifies the app | Shared service: absolute maximum one request per second, attribution and local caching required, no autocomplete, and the app must be able to switch providers |
| **Commercial geocoder** | Contracted quota and support; often stronger structured address data | Key, billing, and another account before the product shape is validated |
| **Coordinates only** | No third-party geocoding or place-query privacy concern | Fails O1's ordinary place-name input and makes the page less useful than the tiny amount of traffic warrants |

The first version makes exactly one geocoder request when the user submits. It
has no typeahead. The browser's HTTPS page supplies the identifying Referer,
serialises its own requests to at most one per second, caches successful
query-to-place results in local storage, displays OpenStreetMap attribution,
and keeps the endpoint in a separately deployed provider configuration behind
a `Geocoder` interface. That configuration can switch the service without
changing the application bundle. These are requirements of the current
[public Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/),
not optional politeness. The policy permits user-triggered requests from a
moderate-usage website; a one-user app used a few times per month is well inside
that shape. Before usage grows beyond it, deployment must switch the adapter to
a hosted or commercial service, potentially adding the proxy v2 may need for
credentialed tide providers.

A coordinate input uses reverse geocoding so O1 can still show a standard place
name. A failed reverse lookup preserves and displays the coordinates rather
than inventing a name.

### 3.2 Coastal relevance

“Nearest seafront” is represented by a **coastal match**, not by silently
taking the first station after sorting by straight-line distance.

1. Maintain cached catalogues of active NOAA and CHS prediction stations, normalized to provider, country, station id, name, latitude/longitude, jurisdiction, datum, and reference/subordinate kind where the provider supplies it.
2. Rank candidates by great-circle distance to the resolved input.
3. Automatically accept a candidate only when it is within 25 km and is clearly closer than the next candidate (no more than 60% of the next distance).
4. Otherwise return up to three candidates with station name, jurisdiction, distance, and a small map. The user must choose one before events are shown.
5. Refuse the match when the closest candidate is over 150 km away. The result may name that coverage is unavailable, but it must not call the station the user’s coast.

The selected station name is the first version’s standard coastal-place name;
the response labels it **Coast** and separately labels the precise **Prediction
station**, provider, country, and id. If a subordinate station is backed by a
reference station, that relationship is shown in source details. This is intentionally
conservative. Distances cannot prove that a station across an island, inlet, or
watershed is relevant, so the ambiguous case costs one explicit choice (O2,
O6).

The 25 km, 60%, and 150 km values are configuration, not hidden facts. The test
plan must challenge them with islands, estuaries, inland places, and the
U.S.–Canada border before another provider or automatic browser location is added.

## 4. Alternatives considered: sun and moon data

| Option | Strengths | Weaknesses |
|---|---|---|
| **Calculate with SunCalc 2.x** *(chosen)* | No second runtime provider or key; supplies sunrise, sunset, moonrise, moonset, and illumination from one location | The caller must construct the correct civil-day window and represent polar/no-event cases; library upgrades can change conventions |
| **Astronomy API** | Provider may return already-labelled local events | A second quota and failure domain; the tide and astronomy locations or time zones can drift |
| **Hand-written formulas** | Total control | Re-implements specialist, test-sensitive astronomy for no product advantage |

The page calculates astronomy at the selected station’s coordinates with a
pinned SunCalc version. The current
[SunCalc documentation](https://github.com/mourner/suncalc/blob/master/README.md)
states that returned `Date` values are absolute instants and must be formatted
with an explicit time zone; it also documents always-up and always-down states.
The app therefore never formats an event in the device default zone.

For each coast-local date, the page builds the UTC instants bounding local
midnight-to-midnight in the station’s IANA zone, calculates events for that
window, and returns arrays for `sunrise`, `sunset`, `moonrise`, and `moonset`.
Arrays preserve zero, one, or more events without changing the response shape.
Moon phase is calculated at local noon for each row; the page gives the current
phase extra emphasis but does not imply that a phase changes at midnight.

## 5. Time and date model

The selected prediction station is authoritative for location and time zone.
Its coordinates resolve once to an IANA zone using a pinned, offline
coordinate-to-zone dataset. Device time zone and geocoder time zone are never
used for event grouping.

The five rows are the coast-local date containing “now” plus the next four
dates. Internally, every event is an ISO UTC instant. The response also carries
the IANA zone and numeric UTC offset used for each displayed instant, because a
five-day range may cross a daylight-saving transition.

Each tide-provider adapter requests or derives a UTC range wide enough to cover
all five local days. It converts provider events to canonical UTC instants;
the page includes them only when their station-local date matches a row.
Astronomy follows the same midnight boundaries. This rule prevents a device in
Los Angeles from moving a New York event into the wrong day (O3–O5).

## 6. Static boundary and provider adapters

### 6.1 Why the first version is static

| Option | Strengths | Weaknesses |
|---|---|---|
| **Static page calling providers directly** *(chosen)* | Fewest moving parts; no function, secret, server log, or application data store; NOAA, CHS, and Nominatim passed browser-access smoke checks | CORS and provider policies are hard constraints; throttling and caching are per browser; credentialed providers wait for a later boundary |
| **Static page plus one serverless function** | Central rate limiting, caching, normalisation, and credential protection; still deploys as a small site | More infrastructure than one infrequent user needs, and it creates location-bearing server logs unless carefully controlled |
| **Long-running application server** | Maximum operational control | More infrastructure than a five-day read-only page needs |

The page keeps the same two-step logical boundary even though both steps are
local functions. This prevents an ambiguous coast choice from repeating
geocoding or provider catalogue work:

- `resolve(input)` returns the preserved input, resolved place, coverage state, and one accepted or up to three candidate coasts.
- `forecast(resolution, chosenStation)` returns the normalized five-day forecast. The resolution is an in-memory object, not a token or stored server record.

Adapters isolate `Geocoder`, `StationCatalogue`, `TideProvider`, `Astronomy`,
and `TimeZoneLookup`. Provider payloads arrive in the browser but never flow
directly into components: each adapter maps them to the §7 shape, maps failures
to §8’s small vocabulary, and records provider, source URL, licence/attribution,
and retrieval time.

### 6.2 Caching and privacy

- Normalised forward queries and rounded reverse coordinates may be cached in local storage for 24 hours; NOAA and CHS station metadata may be cached for seven days; forecasts may be cached until the next coast-local hour.
- Cache keys use a one-way hash of the normalized query. There is no application server log, service worker background refresh, or periodic provider request.
- There is no analytics event containing the input or selected station. The page explains that the submitted place is sent directly from the browser to a geocoding service and, after selection, to the named tide authority (O8).
- The separately visible diagnostic history described in §7 is the only durable usage record. It stays in this browser, has explicit view/download/clear controls, and is never transmitted by the application.

## 7. Response and page shape

The forecast response has one stable shape:

```json
{
  "input": { "display": "what the user entered" },
  "place": { "name": "resolved standard name", "lat": 0, "lon": 0 },
  "coast": { "name": "coastal place", "distanceKm": 0 },
  "station": { "provider": "noaa", "country": "US", "id": "provider id", "name": "station name", "kind": "reference", "datum": "MLLW" },
  "timeZone": "Area/City",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "tides": [{ "type": "high", "at": "UTC instant", "height": 0, "unit": "m" }],
      "sunrise": ["UTC instant"],
      "sunset": ["UTC instant"],
      "moonrise": ["UTC instant"],
      "moonset": ["UTC instant"],
      "moonPhase": { "fraction": 0, "name": "Waxing crescent" }
    }
  ],
  "sources": [],
  "warnings": []
}
```

The page begins with a labelled form accepting place text or decimal
coordinates. Results keep three names visible together: **You entered**,
**Resolved place**, and **Coast**. Station and time zone sit immediately below.
Five equal day cards follow; each separates tides, sun, and moon but uses one
time format throughout. Tide heights are secondary to high/low time and state
their datum and unit in source details.

On narrow screens, days stack rather than becoming a horizontally clipped
table. Keyboard focus, form errors, coast choices, and retry actions are visible.
The cheerful tone comes from colour and small sun/moon/tide marks, never from
replacing labels with unexplained icons (O7).

After every successful or partial forecast, the page appends the complete
normalized response above to `localStorage["tide-here.history.v1"]`. The value
is a JSON array capped at the most recent 100 entries. A **Show local history**
button opens a readable list with the response time, input, resolved coast,
provider, warnings, and an expandable raw response. **Download JSON** and
**Clear local history** sit in that view. This is useful for debugging and
single-user usage tracking without inventing telemetry; the page states plainly
that location history remains on the device until cleared.

## 8. Failure states

The page uses machine-readable codes and user-facing safe summaries:

| Code | Meaning | Page action |
|---|---|---|
| `invalid-input` | Neither a place nor valid coordinates | Keep the input; show accepted examples |
| `place-not-found` | Geocoder found no match | Edit and retry |
| `geocoder-unavailable` | Provider timeout, throttle, or error | Retry later; do not call it not found |
| `coverage-unavailable` | No configured NOAA or CHS prediction candidate within 150 km | Explain first-version coverage and name the supported countries |
| `coast-choice-required` | Candidate is not unambiguous | Show candidate names, distances, map, and explicit choice |
| `tides-unavailable` | Selected station returned no valid prediction | Preserve place and station; show no tide rows and retry guidance |
| `astronomy-unavailable` | Calculation failed | Preserve tide result; mark astronomy unavailable |
| `no-event` | A valid day has no rise or set | Show “does not rise” or “does not set”, not an error |

Partial data stays partial. A tide-provider failure does not erase resolved place
or astronomy, and an astronomical failure does not turn into an empty tide
table. Every result ends with: “Predictions are informational and are not for
navigation or safety decisions” (O6).

## 9. Deployment and later browser location

The deliverable is host-neutral static HTML, CSS, JavaScript, pinned local
libraries/data, and a small provider-configuration JSON file. It requires HTTPS
for the eventual geolocation feature, but no function, environment secret,
database, or custom domain. The first temporary host is whichever available
static host can serve those files; the code must not contain its URL.

The eventual `tidehere.info`-style domain is a later routing change. A future
**Use my current location** button calls
`navigator.geolocation.getCurrentPosition` only after that explicit user
gesture and explains the browser permission before prompting. Success feeds the
returned coordinates into exactly the same coordinate-input, reverse-geocoding,
coastal-match, provider, history, and display path as typed coordinates.
Denial or timeout leaves the manual form untouched. The page never requests
location on load, watches position, or runs in the background. This later
feature therefore needs a secure context and permission-state tests, but no new
forecast contract (O7–O8).

## 10. Validation contract

Implementation is not complete until fixtures and live smoke tests cover:

- two NOAA coasts and two CHS coasts in different time zones and with different tide regimes;
- the same coast entered as coordinates and text;
- an ambiguous station choice, an inland input, and a place outside configured coverage;
- a five-day span crossing a daylight-saving transition;
- zero-event and polar always-up/always-down astronomy cases;
- reference and subordinate tide stations, provider-specific datums, and a U.S.–Canada border case;
- direct browser access, CORS, attribution, throttling, and cache expiry for NOAA, CHS, and Nominatim;
- each provider failure independently, proving partial results stay visible;
- response-history append, 100-entry cap, display, download, clear, and proof that no application request transmits it;
- phone and desktop layouts from a temporary HTTPS URL.

Provider fixtures are recorded responses with retrieval dates and attribution.
Live tests confirm adapters still speak to their services; deterministic tests
run only against fixtures. Thresholds in §3.2 and provider policies are reviewed
after those tests rather than silently tuned in code.
