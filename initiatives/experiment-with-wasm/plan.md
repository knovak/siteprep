# Plan

1. Record the wish and evaluate the two existing applications.
2. Vendor the selected UI, domain modules and SQL, with source hashes and commit provenance. Remove server bindings and identity/capture services.
3. Add SQLite/WASM bindings, transactional local dispatch, durable snapshot storage, backup/restore, and local image attachment.
4. Build a self-contained HTML distribution with pinned dependencies.
5. Exercise parity, failure cases, offline direct-file use, persistence/reload and responsive UI. Run the repository build, review screenshots, and open a ready-for-review PR.

## Plan critique

The hardest risks are silent persistence failure, multiple tabs overwriting data, security of imported links/images/databases, and claiming offline feature parity while retaining network calls. Address these with atomic save-and-rollback, revision checks, validated import surfaces, a restrictive content security policy, and browser tests which deny network requests. A full snapshot per action favors portability over very large database performance; measure a representative 5,600-item collection and record the limitation.

## After the first experiment

Verify direct-file persistence and recovery in Safari and Firefox before claiming those engines are supported. Human use and a later graduation decision follow the verified Chromium implementation; neither is evidence this automated run can provide.

## Second conversion requested by the user

1. Verify the retained full FES coastal package and redistribution terms; preserve provenance.
2. Package the 65,203 points plus an offline place catalogue and the existing harmonic engine in a self-contained Tide Here file.
3. Preserve coast-local dates, astronomy, location selection, alternative points, forecast history and portable exports; disclose provider differences.
4. Compare actual WASM forecasts with original full-precision server results across world regions and a future date. Verify direct-file operation with networking disabled, storage failures, backup/restore, DST, polar conditions and phone layout.
5. Extend this initiative's CI and ready-for-review PR, run the repository build, inspect final screenshots, and open the local app. Other browser acceptance and production graduation remain separate work.

## Static demo requested for PR #467

1. Preserve the wish and record findings in a canonical document.
2. Generate a landing page, wish/findings page and complete app copies with downloads, licences and provenance.
3. Verify static-hosted navigation, both app workflows after going offline, complete copying and phone layout; commit the package and release it through the demo workflow.
4. Record the output and release, refresh the brief, run the final repository build, inspect demo/Demo TOC screenshots, update the existing PR, and verify its branch preview.

Production followed a separately authorized merge. Desktop Safari and Firefox verification is complete; physical-iPad verification remains blocked on device findings. Home Screen installation with explicit offline caching is a possible later increment, not part of this static publication request.

## Internet access requested September 8, 2026

1. Verify browser-accessible services and record the change from mandatory offline operation.
2. Add bounded, cancellable browser transport and separate online controls to both applications.
3. Preserve local data, offline behavior, source/datum labels, and backup compatibility; cache online tide responses.
4. Check controlled success/failure/rate-limit/cancellation cases and live public-service requests. Document any provider that cannot be verified in a browser.
5. Rebuild the committed single-file artifacts and staged website, run the repository build and visual checks, then open a ready-for-review PR with its branch preview. Production awaits a separate release request.
