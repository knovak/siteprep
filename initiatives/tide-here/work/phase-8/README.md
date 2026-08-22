# Phase 8 live validation

Tide Here version 1 is deployed as an owner-only private ChatGPT Site at
[tide-here-five-coast-local-days.ken-novak.chatgpt.site](https://tide-here-five-coast-local-days.ken-novak.chatgpt.site).
Deployment version 1 succeeded on 2026-08-22 at 09:59 PDT. The temporary Site
contains 41 static source files; Sites recorded a 1,331,200-byte archive with
92 packaged files. Deployment staging was removed after verification and did
not add hosting metadata to this repository.

## Live provider and page checks

Chromium loaded the normal page without fixture mode and made one
user-triggered lookup for each coast:

| Input | Geocoder | Tide provider | Result |
|---|---|---|---|
| Seattle | Nominatim HTTP 200, readable CORS | NOAA CO-OPS HTTP 200, readable CORS | Seattle station 9447130, `America/Los_Angeles`, five day cards |
| Halifax | Nominatim HTTP 200, readable CORS | CHS station 00490 HTTP 200, readable CORS | Halifax, `America/Halifax`, five day cards |

The real responses satisfied the existing normalized contracts; no difference
was patched around. Before deployment, all 49 phase 1–7 unit tests and all 14
desktop/phone browser tests passed.

The live owner-only URL was then checked at 1280×800 and at the 430×932 iPhone
Pro Max viewport. Desktop used five columns; the phone stacked content without
horizontal overflow. Both kept the three place names, station, coast time zone,
five day cards, history control, privacy statement, and safety line visible.
No location permission was requested.

## Threshold and policy review

The 25 km automatic distance, 60% clarity ratio, and 150 km maximum remain
unchanged. Clear Seattle and Halifax inputs accept; Bainbridge and the
U.S.–Canada border ask; Denver refuses coverage. The dated reasoning and what
would reopen it are recorded in `../../decisions.md`.

The [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
was re-read on 2026-08-22. The page remains within the intended private,
single-user use: one request per explicit submit, at least one second between
requests, a 24-hour cache, visible attribution, no autocomplete or background
requests, and a provider endpoint that can switch in configuration.

The structured request, layout, deployment, and threshold observations are in
`evidence.json`.
