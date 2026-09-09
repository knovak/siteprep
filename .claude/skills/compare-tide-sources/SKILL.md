---
name: compare-tide-sources
description: Run an end-to-end check of both Tide Here editions against official hydrographic services. Drives the ChatGPT Sites app and the single-file WASM app in a browser for a fixed set of coastal places, reads the same day from NOAA, CHS, UKHO, SHOM, BOM and JMA, and reports timing, tidal-range and event-count differences with the problems first. Use when the user asks to test, check, verify or compare the tide apps, or asks whether the tide predictions are still right.
---

# Comparing the tide apps against official sources

Two editions of Tide Here answer the same question by different routes. The
hosted edition calls national services where it has an adapter and falls back to
the global FES2022 model where it does not; the offline single-file edition uses
FES2022 everywhere. This runs both against the hydrographic service that owns
each coast and says where they disagree.

Run it when something has changed - a deploy, a provider outage, a new adapter -
or on no particular occasion, to see whether the answers still hold.

## Running it

```bash
npm ci                                                  # once per checkout
node .claude/skills/compare-tide-sources/scripts/run.mjs
```

That drives both apps, reads every official service, and writes
`report.md`, `report.json`, `apps.json` and `official.json` into a timestamped
directory under the system temp directory. The path is printed at the start and
the end. A full run takes 10-20 minutes, most of it spent loading the 39 MB
offline app once.

Useful flags, all optional:

| Flag | Effect |
|---|---|
| `--only=osaka-jp,nice-fr` | Restrict to some location ids while iterating |
| `--date=2026-09-08` | Force the official-source day instead of following the apps |
| `--out=<dir>` | Write the run somewhere you choose |
| `--baseline=<apps.json>` | Compare station and model-point choices against an earlier run |
| `--repo=<path>` | Repository root, if not the working directory |

The three steps also run on their own - `collect-apps.mjs`, then
`collect-official.mjs`, then `compare.mjs` - which is what to do when one
official service is having a bad day and you want to re-read just that one.
The app collector supports both older offline files with a date control and
the current interface, whose searches start today on the selected coast.

## Reading the report

The report leads with **Problems**, then **Warnings**, then the readings for
each location. Report them to the user in that order, and do not bury a problem
under a table.

**Problems** are answers a reader would act on and be wrong:

| Code | What it means |
|---|---|
| `provider-fallback` | The hosted app used a different source than expected - usually the global model where a national service should have answered |
| `time-error` | An app is 30 minutes or more from the official time for a turning point |
| `range-error` | A low-to-high swing differs by 15% **and** 0.10 m - the app predicts a different amount of water moving, which no datum correction fixes |
| `event-mismatch` | The app and the official table do not list the same turning points for the day - a different count, or the same count made of different events |
| `day-mismatch` | The two apps disagree about which coast-local day is today |
| `apps-disagree` | Both apps used FES2022 but produced different answers; two editions of one model on one point should be identical |
| `artifact-drift` | The published offline app is not the file this checkout committed, so the run measured a different build |
| `app-unavailable` / `official-unavailable` | A source could not be read at all |

**Warnings** are differences worth knowing that sit inside what a ~15 km global
model can be expected to do: `time-drift` (15-30 min), `range-drift` (5-15%),
`station-change` against a baseline, and `datum-spread`.

`datum-spread` is the one to understand. Every service publishes heights against
its own datum - MLLW, chart datum, LAT, mean sea level - so raw heights are never
comparable and the scripts never compare them. What is comparable is the offset
between two sources at each turning point. If that offset is the same all day,
the two agree about the tide and differ only about where zero is, which is not an
error. If the offset drifts across the day, the shapes genuinely differ, and the
`range-*` findings say by how much.

## Interpreting what comes back

Say what is wrong before saying what is fine, and be specific about which
location and which turning point. Beyond that:

- **A fallback to FES2022 is not automatically an app fault.** The finding text
  says whether any provider endpoint failed during the run. A `FAILED` line
  against a provider host usually means the machine running the test could not
  reach that service - a proxy, a CORS block, an outage - and the app behaved
  reasonably. Every provider answering normally while the app still falls back is
  the app's own selection changing, which is worth raising.
- **Percentages mislead on microtidal coasts.** Nice has a daily range of
  10-25 cm, so a 2 cm difference reads as 14%. That is why every range check needs
  both a percentage and an absolute floor to fire, and why a Nice range finding
  deserves the absolute number in the sentence.
- **A big timing gap up an inlet is expected, not a bug.** Inverness, California
  sits well up Tomales Bay, which lags the open coast by around 90 minutes.
  A global model has no inlet to lag in. Report it as a real limitation of the
  offline edition rather than a defect to fix.
- **Check the day before comparing anything.** Locations east of the date line
  are often a day ahead of the rest of the set. Each reading in the report carries
  the coast-local day it belongs to.
- Do not commit a run. The output is a measurement, not repository content.

## Changing the location set

`locations.json` holds the nine places, the thresholds, and one official source
per place. Each entry records `expectProvider` - which source should answer -
and `why` the place is in the set. Keep that reasoning current: the set is chosen
so that each entry tests something different (an open coast, a lagging inlet, a
large range, a microtidal coast, a diurnal tide, a double low water, each of the
three national adapters). Adding a tenth place that duplicates an existing one
makes the run slower without making it say more.

`README.md` in this directory covers the adapters, the browser setup, and what to
do when an official service changes its endpoint.
