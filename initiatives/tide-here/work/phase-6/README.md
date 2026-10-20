# Phase 6 page

This increment adds the host-neutral Tide Here page over the Phase 5 service.
The form accepts a general place name or decimal coordinates and preserves the entry.
Its two equal mobile-width actions show the typed selection or request one
browser geolocation fix through **Show here**. Normal page load requests the
same single fix, subject to browser permission, and feeds its coordinates
through the same reverse-geocoding and forecast path. Fixture pages and a
carried manual search keep their own input. The page never watches the device;
denial and timeout leave manual entry available, and a newer manual search
takes precedence over any older location or forecast request.
A result labels a collapsed identity disclosure with the coast name; opening it
shows **You entered**, **Resolved place**, the prediction station, and the
station's IANA time zone. Five equal cards keep high and low tides visible and
place sun and moon events in collapsed disclosures whose labels include each
day's moonrise time. A tide label is bold only while its absolute event instant
is still in the future. All event times are formatted with an explicit coast
time zone; neither their labels nor their past/future styling uses the device
zone. The cards omit the redundant tide-section heading beneath each date.

An ambiguous match immediately forecasts with the closest of up to three named
stations. A collapsed **Alternative coasts** disclosure follows the result and,
when opened, shows the other stations with distance and a small relative map.
Choosing one passes the in-memory candidate back to `forecast` without repeating
geocoding or catalogue work. Narrow layouts stack the cards and alternatives,
and all controls have visible keyboard focus and text labels. Phone rows size
to their own content rather than inheriting the busiest day's height. An iPhone Pro Max-width layout uses
two compact event columns, while narrower phones fall back to one; safe-area
padding keeps the page clear of device edges. At the iPhone Pro Max viewport,
the compact closed disclosures leave the complete first two tide days visible
without scrolling from the top of the result.

`src/page-view.mjs` maps the normalized forecast, the eight established
forecast state codes, and the two browser-location states to display models.
Resolution failures, location denial or unavailability, partial tide or astronomy
results, and valid no-rise/no-set days retain separate messages and actions.
Partial results keep the three names, station, available event family, and the
informational-not-for-navigation line.

The normal page uses the configured Nominatim, NOAA, and CHS adapters directly.
It also loads the Site's stored Australian Standard Ports catalogue and includes
those stations in the same coastal match. A selected Australian port is sent
through `src/stored-tide-client.mjs` to the Site's `/forecast` gateway; U.S. and
Canadian forecasts remain direct browser requests. Only when the official
catalogue declines coverage does the page ask the gateway's `/resolve` route for
an active FES2022 model point. A fixture descriptor cannot resolve through that
public route. An accepted model point uses the same stored-client forecast
contract and is always labelled approximate and not for navigation. Australian
and model responses are enriched with sun and moon events in the browser using
the selected point's IANA zone. Prediction source details show the provider's
attribution, disclaimer, source and licence links.

An FES result is labelled **FES2022 near** the resolved place; it does not call
the sampled model point an official station. FES heights are converted from
centimetres to metres around the model mean-sea-level harmonic datum, not chart
datum or lowest astronomical tide. They describe astronomical harmonic extrema,
not observed water level, and exclude weather, storm surge, river flow, waves,
and local harbour effects. The source/location disclosure and the general
safety notice carry those facts; the page deliberately does not repeat them in
a second fallback banner.

The direct NOAA/CHS catalogue and the stored Australian catalogue are separate
availability boundaries. If one source cannot load, matching continues with
the stations from the other; the page reports total catalogue failure only when
neither source supplies any station. This keeps a temporary direct-provider
failure from masking healthy Australian forecasts, and likewise keeps a stored
gateway failure from disabling U.S. and Canadian matching.

For resolved places between 45°S and 8°S, 90°E and 175°E, the page loads only
the Australian catalogue. This region includes all 76 configured Standard Ports,
including Cocos, Christmas and Norfolk islands, and excludes NOAA/CHS coasts.
It avoids waiting for unrelated North American catalogue requests (up to their
10-second timeout) without changing coastal-match distances or official-source
priority. If the Australian catalogue is unavailable, the existing FES fallback
can still resolve a model point. Other regions retain combined independent
catalogue loading. Selected-station metadata is loaded only when needed. The prepared Australian catalogue contains all 76 Standard Ports in the
Bureau's 2026 state and territory indexes across 10 IANA zones. The deterministic
browser fixture remains a bounded 23-port synthetic catalogue so its disclosure
and failure tests stay independent of the licensed artifact.
The safety notice precedes the collapsed **Prediction source details**
disclosure. When the match is ambiguous, **Alternative coasts** follows the
forecast and starts collapsed. A separate collapsed **Debug record** disclosure
comes afterward and contains the local-history control and the visible-on-open
`What leaves this device` explanation.
`?fixture=1` selects the committed validation catalogue and recorded provider
responses, fixes the clock, and makes browser tests deterministic without
network access. Its synthetic Australian response is deliberately retained as
a disclosure test: the exact synthetic-data notice appears only inside the
opened selected-location card and never appears for the licensed Bureau data.
Fixture catalogues and forecasts use tab-scoped session storage so they cannot
replace the normal page's disposable provider caches. A shared validation URL
with an explicit recorded `place` may render that one fixture, but the next
manual **Show selection** returns to the clean normal page and carries the entry
without putting it in the URL. Unknown fixture names fail explicitly instead of
silently resolving to Seattle.
Phase 7 extends this page with its device-local history,
disposable cache tiers, download and clear controls, and privacy statement; its
implementation and additional checks are documented in `../phase-7/README.md`.

## Current-state indicators and request ownership

The initial HTML contains a visible animated status before module startup.
Preparation, location, coast resolution, forecasts, and alternative selection
share the status; readable labels remain when reduced motion disables spinning.
A monotonically increasing request identifier prevents obsolete asynchronous
results from changing the current result or ending a newer operation's status.

`tideProgress` combines the five displayed days with nullable
`forecast.previousTide`. It sorts absolute instants, points toward the next
high/low, and interpolates elapsed time between surrounding opposite extrema.
The bottom-up fill is full at high and empty at low in either arrow direction.
It is explicitly timing-based, not a measured height. Missing prior context,
non-alternating events, or missing next events do not fabricate a fill.
NOAA/CHS request the preceding 24 hours in the same fetch; Australian annual
data supplies the preceding stored event; harmonic adapters calculate preceding
context without changing the five displayed rows.

Moon icons use SunCalc's current phase for today and the existing local-noon
phase for later dates. Southern Hemisphere icons reverse the lit side.
Visible-page minute/focus updates refresh the indicators without provider calls
or new history entries. A coast-local date change reloads the five-day forecast;
the page never takes another location fix automatically while open.

## Verification

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-{1,2,3,4,5,6}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/tide-here/work/phase-6/playwright.config.mjs
```

The browser suite runs desktop and iPhone 15 Pro Max-sized Chromium against
recorded fixtures. It checks the folded coast identity, always-visible tides,
past/future emphasis in coast time, the two search actions and their permission
fallback, moonrise-labelled astronomy disclosures, five equal desktop cards,
content-sized phone cards, explicit zone, closest-first alternatives and map,
all eight service states, the approximate-model label without a duplicate
banner, focus movement, text
labels, datum details, safety line, and serious accessibility findings. A
separate viewport matrix covers widths from 320 to 1600 pixels and fails on
horizontal clipping, an unexpected card count, or the
first two tide days not fitting in the Pro Max viewport. It verifies both
Australian boundaries: the deterministic Brisbane fixture preserves
`Australia/Brisbane` and keeps its synthetic-data disclosure inside the
selected-location card, while a recorded licensed response is labelled
**Bureau of Meteorology**, links the selected annual PDF, shows the attribution
and disclaimer, and contains no fixture notice.
It also verifies that a declined or ambiguous official match can resolve an
active FES2022 model point, submits the model coordinates to the stored forecast
route, preserves official alternatives, and shows both the DOI and AVISO
licence. Validation-link checks prove that a later manual search leaves fixture
mode, hides the old result, uses the normal geocoder, and cannot leak fixture
catalogue or forecast caches into normal local storage.
