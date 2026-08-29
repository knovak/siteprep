# Phase 5 resolve, forecast, and failure vocabulary

This increment composes the existing day model, coastal matcher, tide adapters,
and astronomy adapter behind the two-step boundary in the spec:

- `resolve(input)` preserves what the user entered, geocodes once, fetches the
  station catalogue once, and returns an accepted coast, an explicit choice, or
  a refusal.
- `forecast(resolution, chosenStation)` consumes that in-memory result without
  repeating geocoding or catalogue work, builds five station-local rows, and
  combines tides with sun and moon data.

`src/geocoder.mjs` implements the separately configured Nominatim adapter. A
submit makes a forward or reverse request, never autocomplete. Requests are
serialized to the public service's absolute one-per-second maximum, successful
lookups are cached for 24 hours under SHA-256 keys, the OpenStreetMap
attribution and licence travel with the result, and changing `data/geocoder-config.json`
switches endpoints without changing the application module. An empty reverse
lookup preserves the submitted coordinates instead of inventing a name.
For text searches, the adapter requests up to five ranked candidates but still
makes only one network request. When the top result is a broad administrative
boundary and Nominatim also returns a city, town, village, hamlet, or
municipality point, Tide Here uses that settlement point for coastal matching.
This prevents a locality such as Cooktown from being represented by the center
of its much larger administrative boundary.

The configuration and behaviour were checked on 2026-08-21 against the current
official Nominatim usage policy and Nominatim 5.3.2 search/reverse documentation.
The policy permits moderate, user-triggered website searches while requiring an
identifying Referer or User-Agent, visible attribution, caching where possible,
the ability to switch services, and an absolute maximum of one request per
second. It forbids client-side autocomplete and warns that the policy may
change without notice. The browser supplies the identifying Referer; a later
deployment review must re-check the policy against the real URL and traffic.

`src/resolve-forecast.mjs` owns the eight-state vocabulary. Invalid input,
not-found, provider failure, coverage refusal, and ambiguous coast remain
distinct resolution outcomes. Tide and astronomy failures remain warnings on a
partial forecast, and a valid no-rise/no-set day stays `no-event` rather than
becoming an error. Every adapter returns normalized data; provider payload
fields do not cross the seam.

When a model fallback resolver is configured, the service consults it after
official coverage is refused or the official match is too distant or ambiguous
to accept automatically. A nearby model point becomes the primary result in
that case while the named official candidates remain available as explicit
alternatives. A confident automatic official match still wins without calling
the fallback resolver.

## Verification

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-{1,2,3,4,5}/test/*.test.mjs
```

The Phase 5 suite covers text and coordinate parity, original-input
preservation, settlement-over-boundary selection, one request per submit,
one-per-second serialization, hashed
24-hour caching, configuration-only provider switching, reverse fallback,
not-found versus unavailable, official-first and model-first composition, chooser reuse,
all eight codes, and tide/astronomy partial-result isolation.
