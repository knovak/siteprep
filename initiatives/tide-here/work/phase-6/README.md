# Phase 6 page

This increment adds the host-neutral Tide Here page over the Phase 5 service.
The form accepts a general place name or decimal coordinates and preserves the entry.
Its two equal mobile-width actions show the typed selection or, only after the
person chooses **Show here**, request one browser geolocation fix and feed those
coordinates through the same reverse-geocoding and forecast path. The page
never asks for location on load, watches the device, or changes the manual entry
when permission is denied or location times out.
A result labels a collapsed identity disclosure with the coast name; opening it
shows **You entered**, **Resolved place**, the prediction station, and the
station's IANA time zone. Five equal cards keep high and low tides visible and
place sun and moon events in collapsed disclosures whose labels include each
day's moonrise time. A tide label is bold only while its absolute event instant
is still in the future. All event times are formatted with an explicit coast
time zone; neither their labels nor their past/future styling uses the device
zone. The cards omit the redundant tide-section heading beneath each date.

An ambiguous match pauses before forecasting. It shows up to three named
stations with distance and a small relative map, then passes the selected
in-memory candidate back to `forecast` without repeating geocoding or catalogue
work. Narrow layouts stack the cards and chooser, and all controls have visible
keyboard focus and text labels. Phone rows size to their own content rather
than inheriting the busiest day's height. An iPhone Pro Max-width layout uses
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
It loads the complete NOAA and CHS prediction-station catalogues on the first
uncached search, then loads metadata only for the selected station so matching
and civil-time formatting are not limited to the recorded validation places.
The safety notice precedes the collapsed **Prediction source details**
disclosure. A separate collapsed **Debug record** disclosure follows the
forecast and contains the local-history control and the visible-on-open
`What leaves this device` explanation.
`?fixture=1` selects the committed validation catalogue and recorded provider
responses, fixes the clock, and makes browser tests deterministic without
network access. Phase 7 extends this page with its device-local history,
disposable cache tiers, download and clear controls, and privacy statement; its
implementation and additional checks are documented in `../phase-7/README.md`.

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
content-sized phone cards, explicit zone, chooser and map, all eight page
states, focus movement, text labels, datum details, safety line, and serious
accessibility findings. A separate viewport matrix covers widths from 320 to
1600 pixels and fails on horizontal clipping, an unexpected card count, or the
first two tide days not fitting in the Pro Max viewport.
