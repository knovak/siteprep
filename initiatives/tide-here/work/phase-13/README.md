# Phase 13: global coverage Stage 5

Stage 5 packages the unchanged Tide Here browser page together with the Stage 4
server gateway as a ChatGPT Sites app. The existing public test Site remains a
separate environment from the current public production Site.

## Runtime shape

- `.openai/hosting.json` binds one R2 bucket as `TIDE_DATA`; no database is
  needed because immutable manifests and objects are addressed by version.
- The build stages only the browser files needed by the current page. Tests,
  initiative records, source fixtures, and preparation tools are not public
  assets.
- `/init`, `/health`, `/providers`, `/stations`, and `/forecast` are handled by
  the Stage 4 gateway. The current page continues to call NOAA and CHS directly.
- Hosted `POST /init` requires the `INIT_TOKEN` secret. Initialization writes
  prepared data already included in the tested source to R2, verifies the exact
  Australian and fallback versions, and activates the provider registry last.
- Operational logs contain only route, method, status, provider id, and elapsed
  time. They exclude URLs, request bodies, submitted names, coordinates, coast
  names, and station ids.

## Deployment and initialization

The test workflow builds and publishes the existing `tide-here-test` Sites
project without changing its public access. It configures `INIT_TOKEN`, calls
`POST /init`, verifies `/health`, calls `/init` again to prove zero repeat
writes, and runs HTTPS checks for:

- the unchanged browser page and live NOAA and CHS catalogues;
- stored Australian Standard Ports catalogue and forecast fixture;
- the indexed approximate fallback fixture and its safety warnings.

The Australian and fallback data remain fixtures. This deployment validates
storage, routing, initialization, and failure behavior; it is not evidence of
official Australian or FES2022 accuracy and must not be promoted to production.

## Recorded test deployment

Version 4 was published to the existing public test Site on 2026-08-27:
<https://tide-here-test.ken-novak.chatgpt.site>. The protected initializer
activated registry `stage-4-v1`, Australian fixture `2026-sample-v1`, and
fallback fixture `2026-08-27`. A second initialization wrote zero objects. The
live smoke check passed for the NOAA and CHS catalogues, Australian and fallback
forecasts, and the browser page; the post-check Worker error log was empty.

The production Site was not changed.

## Local verification

```sh
npm test
npm run build
```
