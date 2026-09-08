# compare-tide-sources internals

`SKILL.md` covers running the skill and reading its report. This covers the
parts that break: the browser, the official-service adapters, and the shape of
the files the scripts pass between each other.

## The four scripts

| Script | Does |
|---|---|
| `run.mjs` | Runs the other three in order into one timestamped directory |
| `collect-apps.mjs` | Drives both Tide Here editions in Chromium, writes `apps.json` |
| `collect-official.mjs` | Reads each official service for the day the apps showed, writes `official.json` |
| `compare.mjs` | Pairs the readings, ranks findings, writes `report.md` and `report.json` |
| `lib.mjs` | Time, event and pairing helpers shared by the three |

Splitting collection from comparison matters: a collection is expensive and
depends on nine external services, while the comparison is instant. When a
threshold or a wording changes, re-run `compare.mjs` against the files a
previous collection already wrote instead of paying for the whole run again.

## Browser setup

Both apps are client-side, so there is no HTML to fetch - `collect-apps.mjs`
drives real Chromium through the Playwright installed at the repository root
(`npm ci`). `launchOptions()` in `lib.mjs` handles two environments:

- **A normal machine.** Playwright's own browser and no proxy.
- **A sandboxed agent session.** Chromium at `/opt/pw-browsers/chromium` is used
  when it exists, which avoids a version mismatch against the repository's
  pinned Playwright. When `HTTPS_PROXY` is set, that proxy is passed to Chromium
  and TLS is capped at 1.2, because some policy proxies re-terminate TLS and
  reset Chromium's 1.3 handshake. Without the cap every navigation fails with
  `ERR_CONNECTION_RESET`. This is a workaround for the proxy, not for the sites,
  and it is skipped entirely when no proxy is configured.

The hosted app gets a fresh browser context per location, because it caches
provider station catalogues and a reused context can serve the previous coast.
The offline app is loaded once and reused: it is a 39 MB single file and startup
dominates the run.

`collect-apps.mjs` also records every request the hosted app makes to a provider
host listed in `providerHosts`, with its status or failure. That is what lets the
report tell "the app chose the global model" apart from "this machine could not
reach NOAA".

Finally it hashes the published offline app and compares it with
`demos/experiment-with-wasm/tide-here/index.html` in the checkout, so a run
against a stale deploy is visible rather than silent.

## The official adapters

One function per service in `collect-official.mjs`. Each returns turning points
as `{ kind: 'H' | 'L', time: 'HH:MM', height }` in the location's own zone, and
throws on failure - a throw is recorded as `unavailable` for that location and
does not stop the run.

| Kind | Service | Route |
|---|---|---|
| `noaa` | NOAA CO-OPS | JSON `datagetter`, `interval=hilo`, metric, MLLW, `time_zone=lst_ldt` |
| `chs` | Canadian Hydrographic Service | IWLS: look up the station by code, then its `wlp-hilo` series. The API returns UTC instants and heights but does not label highs and lows, so the adapter reads them off the shape of the series and converts to the local zone |
| `bom` | Bureau of Meteorology | The printable tide page. Needs a browser user-agent or it answers 403. The markup is collapsed to pipe-separated cells and matched row by row; the day heading is checked against the requested date |
| `ukho` | UKHO ADMIRALTY EasyTide | `Home/GetPredictionData`. Times are GMT instants converted through the location's zone, which is more reliable than the site's own offset field across a DST boundary. Heights come back at full precision here; the rendered page rounds them to 0.1 m |
| `shom` | SHOM | Driven through `maree.shom.fr` in a browser, capturing the `hdm/spm/hlt` response the page requests. A direct call to that endpoint is answered 403 by SHOM's WAF |
| `jma` | Japan Meteorological Agency | The annual fixed-width table: 24 hourly heights, `YYMMDD`, station code, then four high and four low slots of `hhmm` plus height in centimetres, `9999` for an unused slot |

**When an adapter breaks.** The station identifiers live in `locations.json`, so
a renamed port is a config change. Two are more fragile:

- *SHOM* embeds an access key in the endpoint path. Nothing here depends on its
  value - the browser reads whatever the page asks for - but if SHOM restructures
  the page, load `https://maree.shom.fr/harbor/NICE/hlt` with the network panel
  open and look for the request the front end makes.
- *BOM* publishes HTML, not an API. If the parse starts returning no rows, print
  the collapsed text and look at the cell separators before touching the regex.

`shomApiKey` in `locations.json` is now only a fallback and is not used by the
browser path.

## File shapes

`apps.json`: `{ collectedAt, artifact, locations: { <id>: { expectProvider, hosted, offline } } }`.
Each app record carries `station`, `date`, `events[]`, and either `unavailable`
or `error` when nothing rendered. The hosted record also carries `providerCalls`
and `providerFailures`.

`official.json`: `{ collectedAt, locations: { <id>: { date, kind, station, datum, url, events[] | unavailable } } }`.

`report.json`: `{ findings[], report, artifact }`, where each finding is
`{ severity: 'problem' | 'warning' | 'note', location, code, message }`.

## How events are paired

`pairEvents()` matches a high to the nearest unclaimed high and a low to the
nearest unclaimed low, within three hours. Pairing by position instead would
shift every later comparison by one whenever a source resolves an extra turning
point - which is exactly what Osaka does, where JMA lists a shallow double low
water that the global model does not resolve. Events left unpaired on either side
become the `event-count` finding rather than a spurious timing error.

Heights are never compared directly across sources. `compare.mjs` works in
low-to-high swings and in the per-event offset between two sources; a constant
offset is a datum difference, a drifting one is a difference in the shape of the
tide.
