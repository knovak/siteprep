# Spec

How Tide Here is built. `objectives.md` says what “done” means; this document
chooses the first version and the boundaries that keep its answers honest.
Numbered references to **O1–O8** are the objectives.

## 1. What the first version is

A compact web page with a manual location form and a five-day result. A person
enters a place name or latitude/longitude. The page resolves the input, makes
the coastal match explicit, and then shows high and low tides, sunrise and
sunset, moonrise and moonset, and moon phase for five civil days at that coast.

The first version has deliberately limited tide coverage: **NOAA CO-OPS
prediction stations in the United States and its territories.** Arbitrary place
strings are accepted as input, but a place outside that coverage receives a
coverage message rather than a tide table borrowed from a distant station.
Global coverage is an alternative considered in §2, not an implication of the
form.

The browser serves the interface; a small server-side function performs
geocoding, station selection, tide retrieval, and astronomical calculation.
There is no account, saved-place list, browser-location prompt, or custom domain
in this version (O7–O8).

## 2. Alternatives considered: tide coverage and source

| Option | Strengths | Weaknesses |
|---|---|---|
| **NOAA CO-OPS predictions** *(chosen)* | Official station metadata and high/low predictions; reference and subordinate stations are identified; no account or key; local daylight-aware or GMT output is supported | Limited to NOAA-supported U.S. regions; station proximity alone does not establish coastal relevance |
| **A commercial global tide API** | One integration can cover many countries; usually offers a nearby-station endpoint and support | Key, quota, cost, vendor dependence, and redistribution terms become part of the first demo; “global” coverage still needs validation coast by coast |
| **A local harmonic engine and constituent dataset** | No runtime tide provider; repeatable and potentially global | The constituent dataset, datum, station updates, and validation become our responsibility; weather effects remain outside the prediction |
| **Scrape published tide pages** | Broad apparent coverage with little modelling work | Brittle, difficult to attribute, often disallowed, and incapable of a stable response contract |

NOAA is chosen because the first version needs a defensible answer more than a
wide one. The [CO-OPS Data API](https://api.tidesandcurrents.noaa.gov/api/prod/)
provides `predictions` with `interval=hilo`; subordinate prediction stations use
the MLLW datum. The app requests GMT and converts the returned instants itself,
so one explicit IANA time zone controls tides, astronomy, headings, and date
boundaries (O5).

The page says “NOAA-supported U.S. coasts” beside the form. Unsupported does
not mean broken: it is a first-class result with a short explanation of the
coverage boundary and no events.

## 3. Alternatives considered: resolving a place and coast

### 3.1 Geocoder

| Option | Strengths | Weaknesses |
|---|---|---|
| **Public Nominatim, behind an adapter** *(chosen for the low-traffic first demo)* | Handles forward and reverse geocoding; no account; returns a standard display name and coordinates | Shared service: absolute maximum one request per second, identifying headers and attribution required, no autocomplete, and the app must be able to switch providers |
| **Commercial geocoder** | Contracted quota and support; often stronger structured address data | Key, billing, and another account before the product shape is validated |
| **Browser-only place lookup** | No server boundary | Cannot reliably supply an identifying application header or shared rate limit; leaks provider details into the client and makes switching harder |

The first demo makes exactly one geocoder request when the user submits. It has
no typeahead. The server sets the identifying header, serialises requests to at
most one per second across the deployment, caches successful query-to-place
results, displays OpenStreetMap attribution, and keeps the provider behind a
`Geocoder` interface. These are requirements of the current
[public Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/),
not optional politeness. Before usage grows beyond a small demo, deployment
must switch the adapter to a hosted or commercial service.

A coordinate input uses reverse geocoding so O1 can still show a standard place
name. A failed reverse lookup preserves and displays the coordinates rather
than inventing a name.

### 3.2 Coastal relevance

“Nearest seafront” is represented by a **coastal match**, not by silently
taking the first station after sorting by straight-line distance.

1. Maintain a cached catalogue of active NOAA tide-prediction stations from the CO-OPS metadata API: station id, name, latitude/longitude, state or territory, and reference/subordinate kind.
2. Rank candidates by great-circle distance to the resolved input.
3. Automatically accept a candidate only when it is within 25 km and is clearly closer than the next candidate (no more than 60% of the next distance).
4. Otherwise return up to three candidates with station name, jurisdiction, distance, and a small map. The user must choose one before events are shown.
5. Refuse the match when the closest candidate is over 150 km away. The result may name that coverage is unavailable, but it must not call the station the user’s coast.

The selected station name is the first version’s standard coastal-place name;
the response labels it **Coast** and separately labels the precise **Prediction
station** and its id. If a subordinate station is backed by a reference station,
that relationship is shown in source details. This is intentionally
conservative. Distances cannot prove that a station across an island, inlet, or
watershed is relevant, so the ambiguous case costs one explicit choice (O2,
O6).

The 25 km, 60%, and 150 km values are configuration, not hidden facts. The test
plan must challenge them with islands, estuaries, and inland places before a
global provider or automatic browser location is added.

## 4. Alternatives considered: sun and moon data

| Option | Strengths | Weaknesses |
|---|---|---|
| **Calculate with SunCalc 2.x** *(chosen)* | No second runtime provider or key; supplies sunrise, sunset, moonrise, moonset, and illumination from one location | The caller must construct the correct civil-day window and represent polar/no-event cases; library upgrades can change conventions |
| **Astronomy API** | Provider may return already-labelled local events | A second quota and failure domain; the tide and astronomy locations or time zones can drift |
| **Hand-written formulas** | Total control | Re-implements specialist, test-sensitive astronomy for no product advantage |

The server calculates astronomy at the selected station’s coordinates with a
pinned SunCalc version. The current
[SunCalc documentation](https://github.com/mourner/suncalc/blob/master/README.md)
states that returned `Date` values are absolute instants and must be formatted
with an explicit time zone; it also documents always-up and always-down states.
The app therefore never formats an event in the server or device default zone.

For each coast-local date, the server builds the UTC instants bounding local
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

NOAA predictions are requested in GMT for a range wide enough to cover all five
local days, converted to the station zone, and included only when their local
date matches a row. Astronomy follows the same midnight boundaries. This rule
prevents a device in Los Angeles from moving a New York event into the wrong
day (O3–O5).

## 6. Server boundary and provider adapters

### 6.1 Why there is a server function

| Option | Strengths | Weaknesses |
|---|---|---|
| **Static page calling providers directly** | Cheapest deployment; no application server | Provider CORS and identifying-header rules become browser constraints; no shared throttling or cache; provider changes leak into the UI |
| **Static page plus one serverless function** *(chosen)* | Central rate limiting, caching, normalisation, and provider switching; still deploys as a small site | Requires a host with HTTPS functions and logs that can be configured not to retain raw queries |
| **Long-running application server** | Maximum operational control | More infrastructure than a five-day read-only page needs |

One serverless endpoint is enough. The logical API may be implemented as two
requests so an ambiguous coast can be confirmed without repeating geocoding:

- `POST /api/resolve` with `{ "input": "..." }` returns the preserved input, resolved place, coverage state, and one accepted or up to three candidate coasts.
- `POST /api/forecast` with the opaque resolution token and chosen station id returns the five-day forecast. The token is signed and short-lived; it is not a database record or location history.

Adapters isolate `Geocoder`, `StationCatalogue`, `TideProvider`, `Astronomy`,
and `TimeZoneLookup`. Provider responses never flow directly to the browser.
Each adapter maps its failures to §8’s small error vocabulary and records a
source name and retrieval time.

### 6.2 Caching and privacy

- Normalised forward queries and rounded reverse coordinates may be cached for 24 hours; NOAA station metadata may be cached for seven days; forecasts may be cached until the next coast-local hour.
- Cache keys use a one-way hash of the normalised query. Application logs omit raw location strings, coordinates, resolution tokens, and provider URLs that contain them.
- There is no analytics event containing the input or selected station. The page explains that the submitted place is sent to a geocoding service (O8).
- The server does not store a user id, saved place, or history.

## 7. Response and page shape

The forecast response has one stable shape:

```json
{
  "input": { "display": "what the user entered" },
  "place": { "name": "resolved standard name", "lat": 0, "lon": 0 },
  "coast": { "name": "coastal place", "distanceKm": 0 },
  "station": { "id": "NOAA id", "name": "station name", "kind": "reference" },
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

## 8. Failure states

The API returns machine-readable codes and user-facing safe summaries:

| Code | Meaning | Page action |
|---|---|---|
| `invalid-input` | Neither a place nor valid coordinates | Keep the input; show accepted examples |
| `place-not-found` | Geocoder found no match | Edit and retry |
| `geocoder-unavailable` | Provider timeout, throttle, or error | Retry later; do not call it not found |
| `coverage-unavailable` | No NOAA prediction candidate within 150 km | Explain first-version coverage |
| `coast-choice-required` | Candidate is not unambiguous | Show candidate names, distances, map, and explicit choice |
| `tides-unavailable` | Selected station returned no valid prediction | Preserve place and station; show no tide rows and retry guidance |
| `astronomy-unavailable` | Calculation failed | Preserve tide result; mark astronomy unavailable |
| `no-event` | A valid day has no rise or set | Show “does not rise” or “does not set”, not an error |

Partial data stays partial. A tide-provider failure does not erase resolved place
or astronomy, and an astronomical failure does not turn into an empty tide
table. Every result ends with: “Predictions are informational and are not for
navigation or safety decisions” (O6).

## 9. Deployment

The deliverable is host-neutral static assets plus one JavaScript serverless
function. It requires HTTPS, environment configuration for the geocoder
identity, a shared rate limiter/cache, and no persistent application database.
The first temporary host is whichever available host meets those properties;
the code must not contain its URL.

The eventual `tidehere.info`-style domain is a later routing change. Browser
geolocation is also later and enters only through the same coordinate-input
path after explicit permission. Neither change alters the provider adapters,
coastal match, five-day model, or result component (O7–O8).

## 10. Validation contract

Implementation is not complete until fixtures and live smoke tests cover:

- two NOAA coasts in different time zones and with different tide regimes;
- the same coast entered as coordinates and text;
- an ambiguous station choice, an inland input, and a place outside NOAA coverage;
- a five-day span crossing a daylight-saving transition;
- zero-event and polar always-up/always-down astronomy cases;
- reference and subordinate tide stations;
- each provider failure independently, proving partial results stay visible;
- phone and desktop layouts from a temporary HTTPS URL.

Provider fixtures are recorded responses with retrieval dates and attribution.
Live tests confirm adapters still speak to their services; deterministic tests
run only against fixtures. Thresholds in §3.2 and provider policies are reviewed
after those tests rather than silently tuned in code.
