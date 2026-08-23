# Tide Here

Tide Here shows five coast-local days of high and low tides, sunrise and
sunset, moonrise and moonset, and moon phase for a place or latitude/longitude.
It names the resolved place, the chosen coast and the official prediction
station instead of treating the nearest station as automatically correct.

The current public Site is
[tide-here-five-coast-local-days.ken-novak.chatgpt.site](https://tide-here-five-coast-local-days.ken-novak.chatgpt.site/).
It supports official NOAA prediction stations in the United States and its
territories and Canadian Hydrographic Service stations in Canada. A place
outside that coverage receives a coverage message rather than a prediction
borrowed from a distant coast.

## Use the Site

1. Enter a place such as `Half Moon Bay` or `Vancouver`, or decimal coordinates
   such as `47.61, -122.33`, then choose **Show five days**.
2. If the nearest coast is ambiguous, choose one of the named prediction
   stations. Tide Here will not decide silently between similarly plausible
   coasts.
3. Read each day's high and low tides. Open the day’s **Sun and moon** row for
   sunrise, sunset, moonrise, moonset and phase.
4. Open the coast name for the original entry, resolved place, station and time
   zone. Open **Prediction source details** for provider, station type, units and
   datum.

All headings and events use the selected coast's civil time zone, including
when the five-day range crosses a daylight-saving change. Heights are metres
relative to the datum named in the source details. Predictions are
informational and are not for navigation or safety decisions.

## Local history and privacy

The Site does not request browser location. A submitted place or coordinates
go directly from the browser to the configured Nominatim geocoder. The browser
then requests station lists, chosen-station details and tide predictions
directly from NOAA or CHS. There is no Tide Here application server, account,
analytics service or cloud history.

Up to 100 successful or partial forecast responses are kept in this browser.
Use **Show local history** below the forecast to inspect them, download them as
JSON or clear them. Clearing the readable history leaves short-lived provider
caches alone. On a public or shared device, clear the history when finished.

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
function or database. The app root is
`initiatives/tide-here/work/phase-6/index.html`, but it imports runtime files
from the sibling `phase-0` through `phase-5` and `phase-7` directories. A
deployment must therefore preserve the complete `initiatives/tide-here/work/`
tree and its repository-relative paths; publishing `phase-6/` alone will break
those imports.

The verified ChatGPT Sites package uses this layout:

```text
index.html  -> redirects to /initiatives/tide-here/work/phase-6/index.html
initiatives/tide-here/work/phase-0/
initiatives/tide-here/work/phase-1/
...
initiatives/tide-here/work/phase-7/
```

Create that layout in an isolated staging directory, add the root redirect,
and deploy the staging directory with the repository's
`deploy-to-chatgpt-sites` skill. For a new Site, choose public or private access
before deployment. For the existing Site, replace it rather than creating a
new one so its URL and access setting are preserved. Hosting metadata,
credentials and temporary staging files do not belong in this repository.

After deployment, verify the root redirect, one NOAA result such as Half Moon
Bay, one CHS result such as Vancouver, the coast and astronomy disclosures, the
privacy/history controls, and a 430×932 phone viewport without horizontal
overflow.

For the implementation contract and alternatives, see [`spec.md`](spec.md).
For the live-deployment evidence, see
[`work/phase-8/README.md`](work/phase-8/README.md) and
[`work/phase-8/evidence.json`](work/phase-8/evidence.json).
