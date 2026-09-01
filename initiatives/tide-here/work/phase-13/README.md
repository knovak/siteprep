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
  The page calls `POST /resolve` after official catalogue coverage declines or
  only distant, ambiguous official choices remain; coordinates stay in its
  request body, and the route serves only points within the active sparse
  FES2022 dataset's declared radius. A nearby model result remains approximate
  while the official choices stay available as explicit alternatives.
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

The current test deployment contains the normalized output
of all 76 Standard Port PDFs in the Bureau of Meteorology's 2026 state and
territory indexes. It carries the source attribution, disclaimer, and per-port
PDF URL into the browser. The fallback data remains a plainly labelled non-FES
fixture. This deployment path validates the licensed Australian path and the
fallback storage boundary; it is not evidence of FES2022 accuracy and does not
activate FES2022 or change the production Site.

The expanded `2026-bom-v2` artifact and `stage-4-v5` registry are active on the
test Site. Direct NOAA/CHS station catalogues and the stored Australian
catalogue are separate availability boundaries in the browser: either can fail
without masking healthy coverage from the other.

## Recorded test deployment

Version 13 was published to the existing public test Site on 2026-08-30 UTC:
<https://tide-here-test.ken-novak.chatgpt.site>. The protected initializer
activated registry `stage-4-v5`, Australian dataset `2026-bom-v2`, and fallback
fixture `2026-08-27`. A second initialization wrote zero objects. Live storage
checks found 76 Australian stations and returned 1,470 Australian events across
the full catalogue. Browser checks for Port Douglas and remote Cocos Islands
rendered five local days, linked the selected Bureau PDF, showed the Bureau
attribution and disclaimer, and did not show the synthetic fixture notice. The
post-check log contained no Worker execution errors.

## Recorded FES2022 validation deployment

Version 11 was published to the same public test Site on 2026-08-29 UTC before
version 13 superseded it. It activated registry `stage-4-v7`, Australian dataset
`2026-bom-v2`, and licensed FES2022b extract `2026-02-03-r2`. A second
initialization wrote zero objects. The FES points passed the fixed
Maroochydore/Mooloolaba and Bundaberg official-port gates; Cooktown and
Gibraltar each returned 20 fallback extrema with licensed-source provenance and
the `approximate-fallback` warning. NOAA, CHS, the 76-port Australian catalogue,
the hosted page, and the Galway fallback also passed. The browser showed the
FES2022 source and safety copy without a duplicate banner, fixture caches stayed
tab-scoped, unknown fixture names did not become Seattle, and a manual
`nice,france` search left fixture mode and returned the honest
`coverage-unavailable` state. Worker logs contained no execution failures.

That version 11 evidence remains the validation record for the FES2022 source
in this branch, but FES2022 is not active on the current version 13 test Site.
Review and a new test deployment are required before any production release.

## FES2022 pre-production review

The 2026-09-01 [source and evidence review](fes2022-production-review.md)
confirmed that the current branch preserves the exact FES source and comparison
blobs exercised by version 11, that the fixed comparison still regenerates
without a diff, and that the current AVISO product and licence references fit
the transformed seven-point tide-height boundary and its disclosure. The local
suite and production build pass.

The review does not make the fallback production-ready. Version 13 superseded
version 11 and does not activate FES2022, so the current FES-capable source must
be separately authorized, deployed, initialized, and live-checked on the
existing public test Site before any explicit production release request.

The production Site was not changed. Its existing version 6 already serves the
same `stage-4-v5` registry and 76-port `2026-bom-v2` dataset.

## Local verification

```sh
npm test
npm run build
```
