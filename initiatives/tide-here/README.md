# Tide Here

Tide Here shows five coast-local days of high and low tides, sunrise and
sunset, moonrise and moonset, and moon phase for a place or latitude/longitude.
It names the resolved place, the chosen coast and the official prediction
station. When several nearby coasts are plausible, it shows the closest
station first and keeps the other candidates available for review.

The two current Sites are public, separate deployments of the same merged
FES2022-capable source:

- **Test:** [tide-here-test.ken-novak.chatgpt.site](https://tide-here-test.ken-novak.chatgpt.site)
  version 15.
- **Production:** [tide-here-five-coast-local-days.ken-novak.chatgpt.site](https://tide-here-five-coast-local-days.ken-novak.chatgpt.site)
  version 7.

Both use direct NOAA and CHS forecasts, licensed Bureau of Meteorology
forecasts for all 76 Australian Standard Ports, and the licensed global coastal
FES2022b fallback. Official configured sources win whenever Tide Here can make
a confident official match. FES is considered only after official coverage
declines or the official choices are too distant or ambiguous; those named
official choices remain available as alternatives.

NOAA prediction stations cover the United States and its territories, Canadian
Hydrographic Service stations cover Canada, and the stored Bureau catalogue
covers its 76 Australian Standard Ports. Elsewhere, Tide Here can select a
derived FES2022 water point from its sampled global coastline only when that
point is within 40 km of the resolved place. A place without a suitable official
station or initialized FES point receives a coverage message rather than a
prediction borrowed from a distant coast.

## Where the tide data lives

The Sites app has no database. Test and production each have a separate private
`TIDE_DATA` R2 object store. Each store holds the active versioned Bureau
catalogue plus the derived FES2022 tile index and 376 non-empty harmonic tiles:
377 checksum-addressed JSON objects, 65,203 coastal points, and 146,330,220
bytes. These are runtime data, not publicly downloadable Site assets and not
application code.

The complete global package is retained outside Git at
`../siteprep-data/tide-here/fes2022/global-coast-r1`, so either Site can be
reloaded without downloading or extracting the atlas again. Git contains the
preparation and verification code plus a small seven-point validation extract,
not the global package. The original 3.95-GB FES2022 NetCDF is neither in the
Site nor in Git. It is retained outside the repository at
`../siteprep-data/tide-here/fes2022/FES2022b_OceanTide_NSgrid.nc` for reuse.

## Interpreting FES2022 results

A location labelled **FES2022 near _place_** is a prediction from the nearest
initialized sampled water point, not an official tide station and not a claim
that the point is inside that town or harbour. The coastal package was sampled
at approximately 15 km intervals and Tide Here will not select a point more
than 40 km from the resolved location.

FES2022 is an approximate astronomical harmonic model. It is useful for an
estimate of the tide pattern and high/low timing, but it does not include wind,
air pressure, river flow, waves, storm surge, local harbour effects, or later
observations. Those effects can materially change actual water level and event
time. Tide Here therefore marks the source approximate and keeps the general
not-for-navigation-or-safety warning; the source details inside the location
block are the complete disclosure, with no second FES banner.

FES harmonic amplitudes are in centimetres around the model's mean-sea-level
harmonic datum. Tide Here calculates extrema, converts their heights to metres,
and groups them into five civil days using the selected model point's IANA time
zone. A displayed FES height is therefore metres relative to model mean sea
level—not depth, chart datum, lowest astronomical tide, or predicted clearance.
Do not compare its absolute height directly with a Bureau, NOAA, CHS, chart, or
harbour value unless the datum relationship has been established. The fixed
Australian comparison removed one constant datum offset before evaluating
timing and tidal shape for exactly this reason.

## Use the Site

1. Enter a place such as `Half Moon Bay` or `Vancouver`, or decimal coordinates
   such as `47.61, -122.33`, then choose **Show selection**. Or choose **Show
   here** and approve the browser's one-time location request to use the
   device's current coordinates.
2. If several nearby coasts are plausible, Tide Here immediately shows the
   closest result. Open **Alternative coasts** below the forecast to choose a
   different named prediction station.
3. Read each day's high and low tides. Past tide labels are lighter than the
   upcoming tides. Open the day's **Sun and moon** row for sunrise, sunset,
   moonrise, moonset and phase.
4. Open the coast name for the original entry, resolved place, station and time
   zone.
5. Below the safety notice, open **Prediction source details** for the provider,
   station type, units and datum. **Alternative coasts**, when needed, appears
   after the results and before **Debug record**. Open **Debug record** for
   local history and a description of what leaves the device.

All headings and events use the selected coast or FES model point's civil time
zone, including when the five-day range crosses a daylight-saving change.
Heights are metres relative to the datum named in the source details.
Predictions are informational and are not for navigation or safety decisions.

## Local history and privacy

Tide Here requests browser location only after **Show here** is chosen. The
browser and operating system handle that permission and return coordinates to
the page; a denied or unavailable location leaves the manual entry available.
Coordinates from **Show here**, or a place or coordinates submitted manually,
go directly from the browser to the configured Nominatim geocoder. The browser
requests NOAA and CHS station data and forecasts directly from those providers.

The browser also loads the Australian station catalogue from Tide Here. When an
Australian Standard Port is selected, it sends the original display value,
resolved place and coast context, selected port, time zone and five-day bounds
to the Site's `/forecast` gateway. If official coverage declines or only
distant, ambiguous official choices remain and an active FES2022 artifact is
available, the browser sends the coordinates in the body of a `POST /resolve`
request and then sends the selected model point through the same forecast
gateway. The official choices remain available as alternatives. Coordinates
are not placed in a URL. The
gateway reads versioned provider data from its object store. Its operational
logs contain only route, method, status, provider and elapsed time—not request
bodies, place names, coordinates or station identifiers. Tide Here has no
account, analytics service or cloud forecast history, and the object store
contains provider data rather than user history.

Up to 100 successful or partial forecast responses are kept in this browser.
Open **Debug record**, then choose **Show local history** to inspect them,
download them as JSON or clear them. Clearing the readable history leaves
short-lived provider caches alone. On a public or shared device, clear the
history when finished.

## Run and verify locally

Install the repository dependencies and run the repository build from the root:

```sh
npm ci
npm run build
```

Then verify the current Tide Here Sites app and its deterministic browser page:

```sh
cd initiatives/tide-here/work
npm ci
npm test
npm run build
cd ../../..
./node_modules/.bin/playwright test --config initiatives/tide-here/work/phase-6/playwright.config.mjs
```

If Chromium has not already been provisioned, run `npm run setup:browsers`
before the Playwright command. To inspect the page without live provider calls,
serve the repository root and open the fixture URL:

```sh
python3 -m http.server 4179 --bind 127.0.0.1
```

<http://127.0.0.1:4179/initiatives/tide-here/work/phase-6/index.html?fixture=1>

Remove `?fixture=1` for a live provider smoke test. Live checks are separate
from the gating suite because provider availability and CORS can change.

## Deploy

The current Tide Here source is a ChatGPT Sites app. Its
[`initiative.json`](initiative.json) deployment record points to
`initiatives/tide-here/work`, while [`.openai/hosting.json`](work/.openai/hosting.json)
binds the object store used for immutable provider registries and tide datasets.
The browser still calls NOAA and CHS directly; the Site serves the Australian
catalogue and forecasts plus active FES2022 model-point resolution and
forecasts. A protected initializer loads and verifies the exact stored data
before activating a registry.

Use the repository's `deploy-test` skill to refresh the test Site. Use
`release-initiative` only when a person explicitly asks to release the committed
source to production. Test and production are separate Sites, and replacing
either one preserves its URL and access setting. Merging a source or
documentation pull request does not deploy either Site.

After a deployment, verify the root page, registry health, one NOAA result such
as Half Moon Bay, one CHS result such as Vancouver, representative Australian
results with the Bureau source, disclaimer and dataset version, and FES results
such as Galway, Cooktown, Gibraltar, Nice, or Amsterdam. Maroochydore and
Bundaberg must continue to select their official Bureau ports before FES.
Also verify an ambiguous result with its closest forecast and collapsed
alternatives, the coast and astronomy disclosures, the
safety/source/alternatives/debug order, the privacy/history controls, and a
430×932 phone viewport without horizontal overflow.

For the implementation contract and alternatives, see [`spec.md`](spec.md).
For the current Sites app, stored-provider boundary and recorded test version,
see [`work/phase-13/README.md`](work/phase-13/README.md).
For the earlier production-deployment evidence, see
[`work/phase-8/README.md`](work/phase-8/README.md) and
[`work/phase-8/evidence.json`](work/phase-8/evidence.json).
