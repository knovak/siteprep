# Phase 8 live validation

Tide Here version 2 is deployed as an owner-only private ChatGPT Site at
[tide-here-five-coast-local-days.ken-novak.chatgpt.site](https://tide-here-five-coast-local-days.ken-novak.chatgpt.site).
The replacement succeeded on 2026-08-22 at 10:47 PDT without changing access.
The temporary Site contains 44 static source files; Sites recorded a
1,351,680-byte archive with 95 packaged files. Deployment staging was removed
after verification and did not add hosting metadata to this repository.

## Live provider and page checks

Chromium loaded the normal page without fixture mode and made one
user-triggered lookup for each requested place. The normal page used the
complete live station catalogues and chosen-station metadata rather than the
trimmed validation catalogue:

| Input | Geocoder | Tide provider | Result |
|---|---|---|---|
| half moon bay | Half Moon Bay, California | NOAA station 9414131, Pillar Point Harbor | `America/Los_Angeles`, five day cards, no warning |
| vancouver | Vancouver, British Columbia | CHS station 07710, False Creek | `Canada/Pacific`, five day cards, no warning |

The real responses satisfied the normalized contracts. Before deployment, all
52 phase 1–7 unit tests passed; the desktop/phone browser run passed 13 tests
with its one intentional duplicate viewport-matrix case skipped.

The live owner-only URL was then checked at 1280×800 and at the 430×932 iPhone
Pro Max viewport. Neither layout had horizontal overflow. Both kept five day
cards and placed the history control and privacy statement below the result.
The three removed entry slogans were absent.

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
