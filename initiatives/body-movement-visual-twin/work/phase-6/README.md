# Phase 6 private validation

This increment assembles the Phase 3 collection and its Phase 0, 1, 2, 4, and
5 dependencies into one self-contained static directory at `site/`. The
deployed page has a root `index.html`, retains `noindex`, and does not depend on
mutable parent paths under `initiatives/` at runtime.

Run `node scripts/build-site.mjs` whenever an earlier phase changes. The builder
copies the reviewed records and modules, rewrites only their deployment paths,
and fails if the active viewer gains an unknown cross-phase dependency.

## Automated validation

From the repository root:

```sh
node --test initiatives/body-movement-visual-twin/work/phase-{0,1,2,3,4,5,6}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-3/playwright.config.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-6/playwright.config.mjs
```

The Phase 6 browser checks run the movement, anatomy, visual-profile, and
separate-report paths on desktop and phone. They also verify the no-WebGL
fallback, no serious accessibility findings, same-origin asset loading, and no
browser persistence of reviewer identifiers or reports.

`VALIDATION.md` records the real private deployment boundary and observed
timings. Practitioner and anatomy review remain human evidence: automation may
exercise the workflow but may not promote an `unreviewed` claim.
