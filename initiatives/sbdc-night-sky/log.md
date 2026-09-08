# Log

## 2026-09-08 — Adopted the existing SBDC simulator

Created `sbdc-night-sky` using the new-initiative workflow, then adopted the
already completed implementation and supplied lifecycle documents as requested.
The supplied wish is unchanged. Added objectives, adoption decisions, a test
plan, provenance, navigation, and an overview around the preserved records.

Adopted all 29 nested source-package files unchanged under `lib/`, retained the
source zip, and mapped all 12 outer archive entries in the adoption manifest.
The nine original documents remain unchanged and their complete text is also
available through the initiative's rendered documents. `work/` contains the
two unchanged demo files and the supplied assumptions sidecar. No files in
`demos/` were changed.

The inherited 59 model/scenario/golden/renderer tests passed. Running the
original builder in a temporary copy produced 245,938 bytes, exactly matching
both the attached standalone HTML and the existing demo. Its validation report
ran successfully; external-source commentary in that report is historical.

The offline Chromium check exercised initial render, latitude/date and time
jumps, brightness, clustering, both projections, camera mode, French/English,
custom shells, twilight lock, both playback modes, assumptions, PNG export,
drag/wheel zoom, and phone controls. No uncaught page errors or network
requests occurred. The browser rendered 44 assumption data rows. Detailed
readouts are retained in `notes/browser-check.json`.

One inherited discrepancy was reproduced: at 390 × 844 the phone sky computes
to `position: relative` and scrolls out of view (canvas top −425 px after a
500 px scroll). The tutorial describes a sticky sky, but a later CSS rule
overrides it. Source and documentation remain unchanged; a follow-up item
requires separate authorization.

Repository-build and hosted-preview results are carried by the adoption PR's
checks and deployment receipt. Real-device user findings and production
release authorization remain open.

## 2026-09-08 — Verify adopted file integrity, source reproduction, and inherited behavior

All attached files and verbatim document inclusions verified; all 59 inherited tests passed; original source reproduced the existing demo exactly; offline Chromium check completed with the inherited mobile positioning discrepancy recorded. User testing, mobile-fix authorization, and production permission remain open.

## 2026-09-08 — Repository build and navigation

The repository build passed, including the preview-copy integrity checks.
Checking the generated pages identified authored links that needed `.html`
destinations; those navigation links were corrected outside the preserved
document text. The final build and hosted deployment are verified by the PR
checks and deployment receipt.
