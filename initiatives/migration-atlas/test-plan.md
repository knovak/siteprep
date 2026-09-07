# Test plan

## Inherited product requirements

[Implementation plan, section 4](plan.md) remains the authoritative T1–T8 plan, together with its E1–E7 test extensions and the acceptance criteria in [spec.md](spec.md). No acceptance threshold is changed by adoption.

| Gate | Coverage retained from the original plan |
| --- | --- |
| T1 | Dataset schema, semantic rules, coordinates, references, and invalid-record rejection |
| T2 | Population scaling, clock boundaries, camera behavior, and deterministic reverse scrubbing |
| T3 | Fixed-year/camera visual regression, reduced motion, and explicit golden updates |
| T4 | Timeline, selection, filtering, zoom/pan, keyboard interaction, legends, color spectra, WebView guards, and responsive controls |
| T5 | Playback frame time, first render, bundle size, and memory stability |
| T6 | Accessibility automation, screen-reader walkthrough, contrast, and reduced motion |
| T7 | Chromium, Firefox, WebKit, and local-file versus served packaging |
| T8 | Cited-source review, justified confidence/type, and visual inspection of new entries |

The supplied README's July 2026 results are preserved in [README.md](README.md). Those figures are historical reports, not test results from this adoption. The repository demo lacks `src/core.js`, `src/app.js`, `tools/build.py`, and the original `tests/` directory. Therefore its original unit, golden, performance, accessibility, cross-browser, and editorial suites cannot be rerun from this source snapshot. Recovering the development package is separate work if future changes require it.

## Adoption verification

- Compare SHA-256 hashes of the two renamed attachments with their originals.
- Verify that the supplied README is retained in full and that the wish matches the provided text, including its prompt-history link.
- Compare all nine files in `work/` with the original demo and the provenance manifest; confirm the PR has no changes under `demos/`.
- Run `npm ci`, then the final `npm run build`, including its repository checks.
- Check the generated initiative page, all adopted document links, the wish's prompt-history link, and the dedicated test preview. Capture the built initiative page and atlas with the repository screenshot command.
- Open the self-contained preview via `file://` and after Pages publication. Check initial rendering, timeline movement, legend and color toggles, table entries and a detail panel, filtering, playback, zoom/pan, and a narrow touch viewport. Report any uncaught browser errors.
- Wait for the branch build and Pages deployment to complete; verify the live preview serves the adopted source.

Record observed outcomes in [log.md](log.md). These checks establish migration integrity and a browser smoke check; they do not replace the full inherited acceptance suite.

## User testing and release gate

The user tests the deployed preview, particularly timeline navigation, zoom/pan, flow and circle meaning, legends, filters, details, and the desired touch layouts. Record findings before considering release. Any requested fixes belong in a later scoped change. Production requires a subsequent explicit release instruction using the repository's release workflow; this adoption PR does not release the atlas.
