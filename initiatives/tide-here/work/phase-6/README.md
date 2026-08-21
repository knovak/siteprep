# Phase 6 page

This increment adds the host-neutral Tide Here page over the Phase 5 service.
The form accepts a place name or decimal coordinates and preserves the entry.
A result displays **You entered**, **Resolved place**, and **Coast** together,
then names the prediction station and the station's IANA time zone. Five equal
cards separate tide, sun, and moon events. All event times are formatted with
an explicit coast time zone; the device zone is never read.

An ambiguous match pauses before forecasting. It shows up to three named
stations with distance and a small relative map, then passes the selected
in-memory candidate back to `forecast` without repeating geocoding or catalogue
work. Narrow layouts stack the cards and chooser, and all controls have visible
keyboard focus and text labels.

`src/page-view.mjs` maps the normalized forecast and the eight established
state codes to display models. Resolution failures, partial tide or astronomy
results, and valid no-rise/no-set days retain separate messages and actions.
Partial results keep the three names, station, available event family, and the
informational-not-for-navigation line.

The normal page uses the configured Nominatim, NOAA, and CHS adapters directly.
`?fixture=1` selects the committed validation catalogue and recorded provider
responses, fixes the clock, and makes browser tests deterministic without
network access. This Phase 6 page intentionally does not store history; local
history, cache tiers, and their privacy statement are Phase 7.

## Verification

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-{1,2,3,4,5,6}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/tide-here/work/phase-6/playwright.config.mjs
```

The browser suite runs desktop and phone Chromium against recorded fixtures. It
checks the three names, five equal cards, explicit zone, chooser and map, all
eight page states, focus movement, narrow-screen clipping, text labels, datum
details, safety line, and serious accessibility findings.
