# Phase 13: global coverage Stage 5

Stage 5 packages the Tide Here browser page together with the Stage 4 server
gateway as a ChatGPT Sites app. The existing public test Site remains a separate
environment from the current public production Site.

## Runtime shape

- `.openai/hosting.json` binds one R2 bucket as `TIDE_DATA`; no database is
  needed because immutable manifests and objects are addressed by version.
- The build stages only the browser files needed by the current page. Tests,
  initiative records, source fixtures, and preparation tools are not public
  assets.
- `/init`, `/health`, `/providers`, `/stations`, `/resolve`, and `/forecast` are
  handled by the Stage 4 gateway. The page continues to call NOAA and CHS
  directly, loads the stored Australian station catalogue, and uses `/forecast`
  when an Australian reference port or active FES2022 model point is selected.
  The page calls `POST /resolve` only after official catalogue coverage
  declines; coordinates stay in its request body, and the route serves only
  points within the active sparse FES2022 dataset's declared radius.
- Hosted `POST /init` requires the `INIT_TOKEN` secret. Initialization writes
  prepared data already included in the tested source to R2, verifies the exact
  licensed Australian and fallback versions, and activates the provider
  registry last.
- Operational logs contain only route, method, status, provider id, and elapsed
  time. They exclude URLs, request bodies, submitted names, coordinates, coast
  names, and station ids.

## Deployment and initialization

The test workflow builds and publishes the existing `tide-here-test` Sites
project without changing its public access. It configures `INIT_TOKEN`, calls
`POST /init`, verifies `/health`, calls `/init` again to prove zero repeat
writes, and runs HTTPS checks for:

- the browser page and live NOAA and CHS catalogues;
- the stored licensed Australian catalogue and forecasts;
- the indexed approximate FES2022 fallback, source/licence disclosure, and
  safety warnings.

Test version 9 contains the normalized output
of all 76 Standard Port PDFs in the Bureau of Meteorology's 2026 state and
territory indexes plus five validated FES2022b harmonic points. It carries each
source's attribution, disclaimer, version, and source/licence links into the
browser. The FES points passed the fixed Maroochydore/Mooloolaba and Bundaberg
official-port gates; they remain approximate model results and do not include
weather or storm surge. These local gates do not authorize a production
release.

The expanded `2026-bom-v2` artifact, FES2022b extract `2026-02-03`, and
`stage-4-v6` registry are active on the test Site. Production remains on its
previous committed source and registry until a separate production release is
requested.

## Recorded test deployment

Version 9 was published to the existing public test Site on 2026-08-29 UTC:
<https://tide-here-test.ken-novak.chatgpt.site>. The protected initializer
activated registry `stage-4-v6`, Australian dataset `2026-bom-v2`, and licensed
FES2022b extract `2026-02-03`. A second initialization wrote zero objects. Live
storage checks found all 76 Australian stations and returned 1,470 Australian
events across five local days per station. Maroochydore and Bundaberg each
returned 20 fallback extrema with only the `approximate-fallback` warning and
licensed-source provenance. NOAA, CHS, the hosted page, and the Galway fallback
also passed the live smoke sweep. Worker logs contained no execution failures;
the observed non-2xx responses were the smoke test's expected direct-provider
refusals, two deliberate official-resolver probes, and missing favicon requests.

The production Site was not changed.

## Local verification

```sh
npm test
npm run build
```
