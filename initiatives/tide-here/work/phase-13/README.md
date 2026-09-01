# Phase 13: global coverage Stage 5

Stage 5 packages the Tide Here browser page together with the Stage 4 server
gateway as a ChatGPT Sites app. The public test and production Sites run the
same merged application source but remain separate environments, source
repositories, secrets, deployments, and R2 object stores.

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
  request body, and the route serves only points within the active global
  FES2022 dataset's 40 km selection limit. A nearby model result remains approximate
  while the official choices stay available as explicit alternatives.
- Hosted `POST /init` requires the `INIT_TOKEN` secret. Initialization writes
  prepared data already included in the tested source to R2, verifies the exact
  licensed Australian and fallback versions, and activates the provider
  registry last.
- `POST /import/object` and `POST /import/activate` use the same secret. The
  resumable host-side importer verifies each local and remote SHA-256, activates
  the complete immutable inventory, then switches the provider registry. A
  later `/init` preserves an already-active global FES dataset instead of
  silently downgrading it to the seven-point validation extract.
- Operational logs contain only route, method, status, provider id, and elapsed
  time. They exclude URLs, request bodies, submitted names, coordinates, coast
  names, and station ids.

## Deployment and initialization

Each environment workflow builds and publishes its existing Sites project
without changing public access. It configures that environment's `INIT_TOKEN`,
imports or verifies the global package in that environment's private R2 store,
calls `POST /init`, verifies `/health`, calls `/init` again to prove zero repeat
writes, and runs HTTPS checks for:

- the browser page and live NOAA and CHS catalogues;
- the stored licensed Australian catalogue and forecasts;
- the indexed approximate FES2022 fallback, source/licence disclosure, and
  safety warnings.

Both current deployments contain the normalized output
of all 76 Standard Port PDFs in the Bureau of Meteorology's 2026 state and
territory indexes. It carries the source attribution, disclaimer, and per-port
PDF URL into the browser. It also activates the licensed global coastal
FES2022b package as the approximate fallback after configured official coverage
declines or is too distant or ambiguous.

The expanded `2026-bom-v2` artifact and
`stage-4-global-2026-08-29-global-coast-r1` registry are active on the test
and production Sites. Direct NOAA/CHS station catalogues, the stored Australian catalogue, and
the FES tile inventory are separate availability boundaries in the browser:
one can fail without masking healthy coverage from the others.

## Current deployment parity

- **Test:** public Site version 15 at
  <https://tide-here-test.ken-novak.chatgpt.site>.
- **Production:** public Site version 7 at
  <https://tide-here-five-coast-local-days.ken-novak.chatgpt.site>.
- **Merged source:** initiative source commit `424926d`, carrying the global
  FES2022 fallback, earlier FES activation/validation, and expanded Australian
  catalogue.
- **Active stored versions in each environment:** Australian
  `2026-bom-v2`; FES dataset `fes2022b-global-coast` version
  `2026-08-29-global-coast-r1`; registry
  `stage-4-global-2026-08-29-global-coast-r1`.

On 2026-09-01 UTC, both environments passed the same protected import,
zero-write repeat initialization, NOAA, CHS, 76-port/1,470-event Australian,
Galway, Cooktown, Gibraltar, Nice, Amsterdam, and hosted-page sweep.
Maroochydore/Mooloolaba and Bundaberg continued to resolve to official Bureau
data before FES.

## Recorded global FES2022 test deployment

Version 14 was published to the existing public test Site on 2026-09-01 UTC:
<https://tide-here-test.ken-novak.chatgpt.site>. The protected importer uploaded
and verified all 377 immutable package objects, then activated dataset
`fes2022b-global-coast` version `2026-08-29-global-coast-r1`; a later protected
initialization preserved that dataset and wrote zero objects. The live sweep
returned 1,470 official Australian events across all 76 ports and 19–20 FES
events for Galway, Cooktown, Gibraltar, Nice, and Amsterdam. NOAA, CHS, and the
hosted page also passed.

Browser checks showed FES2022 results for Nice, Amsterdam, and Cooktown,
official Mooloolaba for the supplied Maroochydore coordinates, and official
Bundaberg for `bundaberg,qld`. None reused Seattle or Cooktown for another
search, and FES results showed no duplicate standalone fallback banner. The
post-check Worker log contained no execution failures; its non-2xx entries were
only expected favicon requests and the smoke test's direct-provider boundary
checks.

## Recorded Australian catalogue deployment

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

That version 11 evidence remains the validation record for the original sparse
FES2022 source. Version 14 superseded it with global coastal coverage; version
15 republishes the merged source now shared with production version 7.

The dated [sparse source and pre-production evidence review](fes2022-production-review.md)
records the AVISO product and licence boundary, exact source and comparison
blobs, fixed official-port results, and local verification that were checked
before the global package was deployed. Its test and production gates were
subsequently completed by versions 14, 15, and 7; it is historical evidence,
not the current deployment record.

## Global FES import

After the retained atlas has produced a package, import it without copying the
package into `site-public` or the Git repository. Run the importer separately
for test and production because their R2 stores are isolated:

```sh
INIT_TOKEN=<secret> node phase-13/scripts/import-fes-dataset.mjs \
  ../../../../siteprep-data/tide-here/fes2022/global-coast-r1 \
  https://tide-here-test.ken-novak.chatgpt.site
```

The original 3.95-GB atlas and the resumable derived package remain in the
local `siteprep-data` folder. The deployed Site stores the derived immutable
tile JSON and manifests in its private `TIDE_DATA` R2 binding; it uses neither
a database nor publicly downloadable static data files.

Production version 7 now stores the same global package and active registry as
test version 15. The objects are duplicated intentionally across the two
private R2 environments; neither deployment depends on the local retained copy
after import.

## Local verification

```sh
npm test
npm run build
```
