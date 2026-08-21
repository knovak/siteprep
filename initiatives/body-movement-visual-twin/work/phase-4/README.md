# Phase 4 honest visual-twin controls

This increment adds a deliberately narrow visual profile to the Phase 3
collection: stature, surface build, visible torso-to-limb proportion, and a
surface presentation. These are appearance controls, not a claim that the
reference body has become an individualized musculoskeletal model.

`src/visual-twin-controls.mjs` keeps the boundary mechanical. Stature scales the
shared skeleton, muscle attachment coordinates, and the eight-millimetre
registration tolerance by one factor. Build and proportion alter only the
authored surface representation. Presentation changes only its colour and
finish. Every change produces visible explanatory copy stating what changed and
that mobility, muscle behaviour, force, biomechanics, and internal anatomy were
not inferred.

The Phase 3 page hosts the controls because it remains the active validation
collection. Its fitted-reference label and educational boundary stay visible,
and no control names sex, gender, ethnicity, diagnosis, or a supposedly correct
body. The movement animation and tradition-specific instruction do not change
with the profile.

## Verification

From the repository root:

```sh
node --test initiatives/body-movement-visual-twin/work/phase-{0,1,2,3,4}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-3/playwright.config.mjs
```

The Phase 4 unit tests prove control bounds, surface-only build/proportion
changes, proportional anatomy and tolerance scaling with stature, registration
at the largest stature, honest explanatory copy, and the absence of correctness
scoring or internal-truth selectors. Browser tests exercise every control on
desktop and phone and verify that the fitted-reference disclaimer persists.
