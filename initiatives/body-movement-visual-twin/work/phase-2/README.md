# Phase 2 vertical slice

This private browser slice proves that the Phase 0 fitted reference body and the
Phase 1 movement contract can drive one interactive, reviewable experience. It
is deliberately not a public teaching product. The anatomy and movement remain
marked unreviewed, the safety boundary appears before playback, and flagging a
claim produces a separate report instead of changing the source record.

## Architecture

`scripts/package-assets.mjs` packages the Phase 0 rig into two local payloads.
`data/rig-core.json` contains the full-body surface, 27-node skeleton,
hierarchy, and five-frame motion clip loaded at startup. `data/muscles.json`
contains 40 paired named muscle
paths and attachment landmarks and is fetched only when a muscle layer is first
requested. The source rig remains canonical; rerun the packager after it changes.

`viewer.mjs` interpolates the five Phase 0 samples on the shared hierarchy and
projects surface geometry, shaped bones, joints, and muscle paths into the
canvas. Six anatomical views separate surface, transparent skeleton,
superficial muscle, deep muscle, combined muscle-and-skeleton, and skeleton
detail displays. Orbit, zoom,
playback time, layer state, a pinned layer, and joint isolation are independent
state dimensions. Layer operations therefore cannot reset the camera or pose.
Pointer Events provide mouse and touch orbiting; keyboard arrows and plus/minus
provide the equivalent keyboard path. A no-WebGL fallback keeps the movement
record, cautions, attribution, and review status readable.

`data/movement.json` is the one project-authored Feldenkrais feasibility record.
Its phrasing is original, its rights basis is provisional, and its practitioner
and anatomy review status is unreviewed. It contains no performance grading,
diagnosis, treatment, or individualized instruction.

## Verification

From the repository root:

```sh
node initiatives/body-movement-visual-twin/work/phase-2/scripts/package-assets.mjs
node --test initiatives/body-movement-visual-twin/work/phase-2/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-2/playwright.config.mjs
```

The data test reconstructs the full rig and reruns the Phase 0 eight-millimetre
registration and rights checks plus the Phase 1 movement contract. The browser
tests cover caution-gated playback, replay/scrub/frame controls, stable camera
and pose across layer operations, lazy muscle loading, pinning, isolation, the
separate review report, the WebGL fallback, desktop and phone layout, and serious
or critical accessibility findings.
