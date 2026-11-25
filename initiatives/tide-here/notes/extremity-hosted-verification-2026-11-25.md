# Hosted extremity verification — 2026-11-25

The Bureau and FES paths pass on the existing public test Site. NOAA's annual
record also works in the browser when requested directly. Full acceptance
remains open: CHS currently omits the CORS response header needed by the
browser, and the combined NOAA/CHS catalogue request also hides NOAA when CHS
fails.

## Deployment checked

- Test: <https://tide-here-test.ken-novak.chatgpt.site>, public version 19,
  successfully deployed at 2026-11-25T10:03:00.221437Z. Sites source commit:
  `53a3c941125c2a314db22b418631e30a09946548`.
- Siteprep source: `231641a5a5f0e341bf607ea8ba4178e9a606aa94` (PR #680).
  The pending deployment record points to the equivalent source tree
  `9ec8fc539c8793788035cd6e632fe138f7f295ee`.
- The browser bundle, stylesheet, extremity module and annual-source module
  served by Test matched a fresh local build byte for byte.
- The waiting `deploy-record/tide-here` branch was folded into this verification
  branch, preserving its test version 19 and production version 10 receipts.
  Production URL: <https://tide-here-five-coast-local-days.ken-novak.chatgpt.site>.
  This run did not deploy, change access, initialize storage or release anything.

The existing deployment already contains the selected source, so a duplicate
deployment would not improve verification. The earlier "not yet deployed"
notes in Phase 15 describe the implementation handoff before version 19.

## Live results

Checked from the normal hosted page, without fixture mode or substituted
provider responses. Browser results use 25–29 November 2026. API durations are
client wall time including networking and storage, not measured worker CPU.

| Provider and place | Annual record | Browser result |
|---|---|---|
| NOAA Seattle, `9447130`, MLLW | 705 highs / 705 lows; deployed annual-source module fetched and ranked the live year in 1,271 ms | Direct browser request passes; normal cold-start search falls back to FES because the shared catalogue load fails on CHS |
| CHS Halifax, `5cebf1df3d0f4a073c4bbcbb`, chart datum | 705 highs / 705 lows when fetched in Node | Catalogue and annual-data requests both fail browser CORS; Node success is not browser acceptance |
| Bureau Brisbane Bar, `au-qld-brisbane-bar`, LAT | 704 highs / 705 lows; `/extremity` HTTP 200 in 872 ms | Five cards, eight marked tides, both mark levels, same-source count and year shown |
| FES Galway, `fes2022-coast-n532744-w0090323`, model mean-sea-level datum | 706 highs / 705 lows; three annual `/extremity` requests returned HTTP 200 in 1,528 / 1,126 / 1,528 ms | Five cards, twelve marked tides, both mark levels and model-specific explanation |

For Brisbane and Galway, clicking a marked height opened its explanation;
Escape closed it and restored focus. At 1280 × 900 and 430 × 932 there was no
horizontal overflow. The phone explanation box stayed inside the viewport.
Both pages cached a record keyed to the actual provider, station, datum and
year, and had no JavaScript page errors. No physical-phone claim is made.

The three FES requests completed a whole year of prediction on the deployed
worker without a CPU-limit response. This establishes feasibility for this
point/year in these samples; it does not measure CPU headroom, concurrency or
every model point. Worker-log queries returned no events, so they supplied no
additional CPU telemetry.

## Blocking evidence and retry

At about 19:05–19:07 UTC, CHS returned HTTP 200 outside the browser, but omitted
`Access-Control-Allow-Origin`. Chromium on the test origin rejected both:

- Catalogue: <https://api-sine.dfo-mpo.gc.ca/api/v1/stations?time-series-code=wlp-hilo>
- Annual Halifax predictions: <https://api-sine.dfo-mpo.gc.ca/api/v1/stations/5cebf1df3d0f4a073c4bbcbb/data?time-series-code=wlp-hilo&from=2026-01-01T00%3A00%3A00Z&to=2027-01-01T00%3A00%3A00Z>

The browser reported: `No 'Access-Control-Allow-Origin' header is present on
the requested resource.` NOAA's catalogue returned HTTP 200 with
`Access-Control-Allow-Origin: *` and 3,502 stations in the same browser.

`work/phase-2/src/station-catalogue.mjs` currently combines both providers with
`Promise.all`. A CHS rejection therefore discards the usable NOAA catalogue.
Normal Seattle and Halifax searches both rendered FES fallback, so those
searches cannot count as official-provider indicator acceptance. This run did
not change the provider architecture or disguise the failure with fixtures.

Keep `verify-extremity-on-test-site` open with an `external:` blocker. Retry
normal Seattle and Halifax searches when CHS browser access is restored or an
explicit provider-access remedy is implemented. Check independent catalogue
failure handling as part of that remedy. Completion still requires the actual
NOAA/CHS station, matching annual record, visible marks where eligible, and
working explanation controls on the hosted page.

## Local validation

- `npm ci` at the repository root and in `initiatives/tide-here/work`.
- Initiative `npm test`: 172 passed, no failures or skips.
- Initiative `npm run build`: passed; used for the deployed-asset comparison.
- Existing extremity browser regressions: six passed across desktop and phone
  Chromium. They cover a neap week, delayed background marks without layout
  movement, explanation controls, cached reuse, and failed annual requests.
- Repository build and sweep scope checks are recorded in the pull request.

The live browser checks and HTTP probes were temporary verification scripts;
no application code changed. These results supersede the Phase 15 handoff's
unverified FES-runtime concern, but do not close full hosted acceptance.
