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
