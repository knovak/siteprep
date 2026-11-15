# Test plan

## Adoption checks

1. Compare every entry in `adoption-manifest.json` against its adopted bytes.
   Verify all 12 outer entries (11 adopted files and one archive represented
   by its extracted contents), 29 nested source files, two demo snapshot files,
   the two lifecycle copies, and every verbatim document inclusion. The archive
   checksum identifies the original input; its binary is intentionally omitted.
2. Verify `work/index.html` matches the supplied standalone file and the
   production demo source, `work/index-initial.html` matches the earlier demo
   snapshot, and the sidecar matches `lib/data/sbdc-data.json` and the HTML's
   embedded assumptions after JSON parsing.
3. Run the inherited model, scenario, golden, and renderer tests together.
   `npm test` in the supplied package omits the renderer file; use the complete
   command in [README.md](README.html). Never regenerate golden fixtures here.
4. Run the original builder in a temporary copy and compare its output with
   `work/index.html`. Run the inherited validation report as a reproducibility
   check, without treating its external-source commentary as fresh research.
5. Use the repository's installed Playwright Chromium to open the standalone
   file with network access blocked. Check initial canvas/readouts, time jumps,
   latitude/date changes, brightness response, clustering, both views, camera
   mode, French/English switching, custom shells, twilight lock, playback,
   assumptions, PNG export, pan/zoom, and phone layout. Capture uncaught errors
   and attempted network requests.
6. Run `npm ci`, then the repository build once after the final source change.
   Check the rendered initiative/document links and preview byte identity.
   Capture the built simulator under `screenshots/` using `npm run screenshot`.
7. Push the branch and open a ready-for-review PR. Wait for the build, browser
   checks, and GitHub Pages deployment to finish. Verify the hosted preview
   returns the same application bytes and its initiative documents are usable.

## Beta checks

These apply to `beta/`, added on 2026-11-11. The site build runs the first two
on every build.

1. Every `beta/test/*.test.js` suite passes. `beta/publish.mjs` runs them
   before it builds, and a failure fails the site build.
2. The published beta page carries exactly one "Beta" label, the published
   released page carries exactly one "Released" label, and removing the label
   from the released page gives back `demos/SBDC Night Sky/index.html` byte
   for byte (`BUILD-13` and `BUILD-22` in `scripts/build_tests.sh`).
3. While the beta is meant to equal the release, `node beta/build.js <dir>`
   produces a page identical to `work/index.html`. This held on 2026-11-11 and
   stops applying at the first beta change.
4. `tests/e2e/sbdc-beta.spec.js`, at the repository root, drives the published
   beta page in Chromium. The site workflow runs it on every push, after the
   build. It asserts no page errors and no network requests in every test.
   Each change to the beta adds the checks for its own controls there.
5. `beta/test/fixtures/paired-comparisons.json` holds the 16 cases of the
   12 October 2026 comparison document: this simulator's whole-sky counts on
   that date, and the other simulator's for the same cases.
   `beta/test/paired.test.js` reproduces the first set. A change that is
   meant to move those counts, or `beta/test/golden/golden.json`, regenerates
   the fixture in the same pull request and says why; any other change leaves
   both files as they are.
6. After a beta change, open the beta in the pull request's branch preview and
   look at what the change affects. The checks in step 5 of the adoption list
   that the spec does not cover - physical devices, PNG export, the feel of
   drag and pinch - still need a person.

`beta/PLAN.md` describes how the November 2026 upgrade uses these.

## What the inherited suite covers

The 59 tests cover solar geometry, seeded constellation generation, Earth
shadow, brightness, sky visibility, acceptance scenarios, golden counts,
projection/rendering helpers, orbital propagation, and clustering. The original
`test/smoke-browser.mjs` uses jsdom and canvas, which its package manifest does
not declare. That simulated-browser suite is preserved; this adoption uses a
real Chromium smoke instead and records it separately.

The preserved documents include earlier test totals and superseded control
descriptions. [Notes](notes.html) explains those differences without editing them.
Test results from July remain historical; September verification belongs in
[log.md](log.html).

## User testing before production

**Known inherited discrepancy:** the mobile sky is not sticky in the adopted
Chromium check, despite the tutorial's description. The later CSS rule overrides
the mobile positioning rule. [Notes](notes.html) records the finding; correction
requires a separately authorized application change.

- Follow the tutorial on the test preview: dusk, midnight, latitude changes,
  brightness, clustering, both playback modes, and the assumptions table.
- Check drag and pinch on physical Safari, Chrome, and Firefox, including a
  phone or tablet. Browser emulation does not establish physical-device feel.
- Check Save PNG in the actual browser or app preview used for distribution.
- Assess performance on older phones and at high satellite counts; the
  supplied documents describe reducing the count as the existing relief.
- Record findings before requesting a production release. Any fixes belong
  in a separately scoped change; changes to supplied documents need permission.

Production approval and scientific validation are not implied by a passing
build or a browser smoke check.
