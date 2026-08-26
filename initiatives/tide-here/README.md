# Tide Here

Tide Here shows five coast-local days of high and low tides, sunrise and
sunset, moonrise and moonset, and moon phase for a place or latitude/longitude.
It names the resolved place, the chosen coast and the official prediction
station. When several nearby coasts are plausible, it shows the closest
station first and keeps the other candidates available for review.

The two current Sites are separate deployments:

- **Test:** [tide-here-test.ken-novak.chatgpt.site](https://tide-here-test.ken-novak.chatgpt.site)
- **Production:** [tide-here-five-coast-local-days.ken-novak.chatgpt.site](https://tide-here-five-coast-local-days.ken-novak.chatgpt.site)

Both are currently public. The test Site can contain work that has not been
released to production yet. Tide Here supports official NOAA prediction
stations in the United States and its territories and Canadian Hydrographic
Service stations in Canada. A place outside that coverage receives a coverage
message rather than a prediction borrowed from a distant coast.

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

All headings and events use the selected coast's civil time zone, including
when the five-day range crosses a daylight-saving change. Heights are metres
relative to the datum named in the source details. Predictions are
informational and are not for navigation or safety decisions.

## Local history and privacy

Tide Here requests browser location only after **Show here** is chosen. The
browser and operating system handle that permission and return coordinates to
the page; a denied or unavailable location leaves the manual entry available.
Coordinates from **Show here**, or a place or coordinates submitted manually,
go directly from the browser to the configured Nominatim geocoder. The browser
then requests station lists, chosen-station details and tide predictions
directly from NOAA or CHS. There is no Tide Here application server, account,
analytics service or cloud history.

Up to 100 successful or partial forecast responses are kept in this browser.
Open **Debug record**, then choose **Show local history** to inspect them,
download them as JSON or clear them. Clearing the readable history leaves
short-lived provider caches alone. On a public or shared device, clear the
history when finished.

## Run and verify locally

Install the repository dependencies once, then run the deterministic unit and
browser suites from the repository root:

```sh
npm ci
node --test initiatives/tide-here/work/phase-{1,2,3,4,5,6,7}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/tide-here/work/phase-6/playwright.config.mjs
npm run build
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

Tide Here is a host-neutral static application with no build-time secret,
function or database. Its deployment configuration is in
[`initiative.json`](initiative.json), with `initiatives/tide-here/work` as the
source. That complete directory must be deployed because the page imports
runtime files across the `phase-0` through `phase-7` directories. The source's
root `index.html` redirects to the Phase 6 page.

Use the repository's `deploy-test` skill to refresh the test Site. Use
`release-initiative` only when a person explicitly asks to release the committed
source to production. Test and production are separate Sites, and replacing
either one preserves its URL and access setting. Merging a source or
documentation pull request does not deploy either Site.

After deployment, verify the root redirect, one NOAA result such as Half Moon
Bay, one CHS result such as Vancouver, an ambiguous result with its closest
forecast and collapsed alternatives, the coast and astronomy disclosures, the
safety/source/alternatives/debug order, the privacy/history controls, and a
430×932 phone viewport without horizontal overflow.

For the implementation contract and alternatives, see [`spec.md`](spec.md).
For the earlier production-deployment evidence, see
[`work/phase-8/README.md`](work/phase-8/README.md) and
[`work/phase-8/evidence.json`](work/phase-8/evidence.json).
