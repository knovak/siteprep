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
- `/init`, `/health`, `/providers`, `/stations`, and `/forecast` are handled by
  the Stage 4 gateway. The page continues to call NOAA and CHS directly, loads
  the stored Australian station catalogue, and uses `/forecast` only when an
  Australian reference port is selected.
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
- the indexed approximate fallback fixture and its safety warnings.

The source prepared for the next test deployment contains the normalized output
of all 76 Standard Port PDFs in the Bureau of Meteorology's 2026 state and
territory indexes. It carries the source attribution, disclaimer, and per-port
PDF URL into the browser. The fallback data remains a plainly labelled non-FES
fixture. This deployment path validates the licensed Australian path and the
fallback storage boundary; it is not evidence of FES2022 accuracy and does not
authorize a production release.

The expanded `2026-bom-v2` artifact and `stage-4-v5` registry are locally
verified but have not been deployed. The recorded test deployment below remains
version 8 with the earlier 23-port `2026-bom-v1` artifact until a separate test
deployment is requested.

## Recorded test deployment

Version 8 was published to the existing public test Site on 2026-08-28 UTC:
<https://tide-here-test.ken-novak.chatgpt.site>. The protected initializer
activated registry `stage-4-v4`, Australian dataset `2026-bom-v1`, and fallback
fixture `2026-08-27`. A second initialization wrote zero objects. Live storage
checks found 23 Australian stations and returned 449 Australian events across
the full catalogue. Browser checks for Brisbane, Cairns, Sydney, Melbourne,
Hobart, Adelaide, Perth, Broome, and Darwin rendered five local days, linked the
selected Bureau PDF, showed the Bureau attribution and disclaimer, and did not
show the synthetic fixture notice. The post-check log contained no Worker
execution errors.

The production Site was not changed.

## Local verification

```sh
npm test
npm run build
```
