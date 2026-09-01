# Phase 7 local history, caches, and privacy

This increment adds the local-data boundary promised by the specification. A
successful or partial normalized forecast is appended to
`localStorage["tide-here.history.v1"]` with its response time. The chronological
array keeps only its newest 100 entries and is separate from every disposable
cache. The page can show the readable history, expand its complete response,
download the array as JSON, and clear only that history key.

`src/local-data.mjs` owns both the visible history and the forecast cache so the
separation is testable. Forecast keys hash the normalized input, station, zone,
and coast-local hour; the response is reused only while that hour is unchanged.
Writing a later hour removes the preceding forecast-cache entry. The existing
geocoder cache keeps its hashed 24-hour keys, and the existing station-catalogue
read-through cache keeps its seven-day lifetime.
Transient `tides-unavailable` responses are deliberately never cached. Reading
an entry left by an older page version removes it and performs a fresh provider
request, so the retry action cannot replay a stale service failure.

The page says exactly what leaves the browser: a typed place goes directly to
the configured geocoder; prediction-station lists, chosen-station details, and
the selected time range go directly to NOAA and CHS as needed. History remains
on the device until the user clears it. The disclosure and history button are
below the data display. There is no application analytics, service-worker
refresh, periodic request, or history upload.

## Verification

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-{1,2,3,4,5,6,7}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/tide-here/work/phase-6/playwright.config.mjs
```

The Phase 7 unit checks cover append, malformed storage, the 100-entry cap,
download serialization, history-only clearing, hashed forecast keys, and
coast-local-hour expiry. The page checks cover readable view, download, clear,
cache separation, visible privacy language, no history-bearing request, and no
idle background request.
