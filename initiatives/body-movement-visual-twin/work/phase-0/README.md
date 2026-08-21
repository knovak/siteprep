# Phase 0 — asset rights and shared-rig feasibility

This phase answers two questions before viewer work starts:

1. Which body and anatomy assets may be packaged in an access-controlled hosted
   validation demo?
2. Can the shoulder-and-spine layers share one hierarchy while every declared
   muscle attachment remains within the plan's 8 mm reference tolerance?

The answer is a revised open path: **do not package SKEL or SMPL-Model**;
select AnatomyTOOL Open3DModel skeleton and upper-limb geometry under CC BY-SA,
use NLM Visible Human public-domain image data only as a reference, and keep the
Phase 0 surface, rig and deep-spine paths project-authored. A concrete
CC BY 4.0 SMPL-Body asset remains eligible later, but the licence page alone is
not an asset and none is present here.

## Rights finding

Checked 2026-08-20 against official sources:

- [SKEL's licence](https://skel.is.tue.mpg.de/license.html) is personal,
  single-user and non-transferable. It prohibits making the Data & Software
  available to third parties without prior written permission. Invited
  reviewers are third parties, so SKEL is excluded from this hosted path.
- [SMPL-Model's licence](https://smpl.is.tue.mpg.de/modellicense.html) has the
  same distribution problem and is also excluded.
- [SMPL-Body](https://smpl.is.tue.mpg.de/bodylicense.html) is a distinct asset
  class under CC BY 4.0. A concrete asset carrying that licence can be hosted
  with attribution, but this phase did not invent or relabel an SMPL-Model
  download as SMPL-Body.
- AnatomyTOOL describes Open3DModel as
  [CC BY-SA](https://anatomytool.org/open3Dmodel-about) and its
  [source-model page](https://anatomytool.org/open3dmodel-create) explicitly
  permits hosting the models when the Creative Commons conditions are followed.
  The June 2025 skeleton and July 2025 upper-limb archives are the selected
  upstream geometry. The latter includes shoulder/pectoral joints,
  axio-appendicular muscles and scapulohumeral muscles.
- NLM calls the [Visible Human Project](https://www.nlm.nih.gov/research/visible/visible_human.html)
  a public-domain image library, and its
  [current access page](https://www.nlm.nih.gov/research/visible/getting_data.html)
  says no registration has been required since July 2019. Phase 0 ships no
  source image, scan, segmentation or subject-specific reconstruction.

`rights-ledger.json` records the exact variants, agreement state, private-host
status, public-use status, attribution and repository paths. Share-alike
material is contained below `assets/anatomy/share-alike/`; the application and
project-authored rig are outside that directory.

## What the fixture proves

`assets/original/reference-rig.json` is a deliberately small, anatomically
unreviewed feasibility model:

- surface, skeleton and muscle paths use one hierarchy and animation clock;
- the rig includes clavicles, scapulae, humeri, sampled thoracic/lumbar spine
  and the narrow ten-muscle/group set required by `plan.md`;
- each muscle/group has exactly two named attachment landmarks and an explicit
  `unreviewed` anatomy status;
- one slow bilateral shoulder-and-thoracic motion declares start, midpoint,
  end, a shoulder-angle extremum and a thoracic-angle extremum; and
- every attachment is checked at every sample, producing 100 registration
  comparisons.

The check's maximum separation is **1.658 mm**, under the required **8 mm** at
the 1700 mm reference stature. The negative fixture moves one attachment by
12 mm and proves the check fails rather than hiding drift under the surface.

The browser preview is a front-projected debug renderer, not anatomical proof.
It demonstrates that surface, skeleton and muscles consume the same transformed
rig. Real Open3DModel meshes still need selection, retopology, skinning,
modification records and anatomical review before Phase 2 may claim a credible
anatomy layer.

## Run and inspect

From the repository root:

```bash
node initiatives/body-movement-visual-twin/work/phase-0/scripts/check-registration.mjs
node --test initiatives/body-movement-visual-twin/work/phase-0/test/registration.test.mjs
```

Serve `work/phase-0/` over HTTP and open `preview.html` to inspect the layer and
sample controls. Loading from `file:` does not work because the page fetches the
JSON fixture.

## File responsibilities

- `rights-ledger.json` — authoritative packaging decision per source.
- `assets/anatomy/share-alike/open3dmodel/manifest.json` — selected upstream
  archives and the containment rule for later derived geometry.
- `assets/anatomy/public-domain/visible-human/manifest.json` — reference-only
  boundary; no source data is packaged.
- `assets/original/reference-rig.json` — project-authored hierarchy, layers,
  motion samples, landmarks and review status.
- `scripts/rig-math.mjs` — dependency-free hierarchy, transform and attachment
  calculations shared by the CLI and preview.
- `scripts/check-registration.mjs` — rights, layer, review-status, sampling and
  8 mm checks.
- `test/registration.test.mjs` — positive fixture plus drift and licence-
  contamination regressions.
- `preview.html` / `preview.mjs` — private Phase 0 debug visualization.

## What remains open

- Every anatomical landmark and muscle path is `unreviewed`; Phase 2 may not
  present it as anatomically accurate until an anatomy reviewer accepts or
  disputes it.
- The Open3DModel archives are selected, not vendored. When real meshes enter,
  record archive hashes, copied node names, attribution and every modification.
- SMPL-Body may replace the procedural surface only when a concrete asset is
  supplied with its own CC BY provenance. SKEL and SMPL-Model remain excluded
  unless Max Planck gives written third-party-hosting permission.
