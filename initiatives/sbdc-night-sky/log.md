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

## 2026-09-08 — Removed the redundant source ZIP

At the user's request, compared all 29 source-archive files with their adopted
`lib/` copies and manifest hashes, then removed the 161,551-byte duplicate
`notes/sbdc-sim-final-source.zip`. Preserved the original archive metadata and
extracted-file inventory in the manifest, and updated the adoption guidance.
The source, original documents, and simulator snapshots remain unchanged.
Confirmed the initiative is already `dormant` and retained that status.

## 2026-09-11 — Review the test preview on real devices and record findings

The user reports that user-test-preview had a satisfactory outcome and is complete. No device-by-device findings were supplied. The initiative remains dormant; no additional releases are requested.

## 2026-09-11 — Deferred mobile follow-up; retained dormancy

Converted `mobile-sky-follow-up` to an optional later todo and recorded it in
`notes.md`. It remains blocked on explicit user permission to resume the work.
Recorded the user's direction in `decisions.md`: keep the initiative dormant
and make no additional releases. The release item remains permission-blocked;
no application, preserved source, or production demo files were changed.

## 2026-11-11 — Added the beta line

Created `beta/` from the code in `lib/` (`src/`, `data/`, `test/`, `tools/`,
`build.js`, `package.json`), with two additions: `build.js` accepts an output
directory, and `publish.mjs` runs the tests and then builds. Declared it as the
demo deployment's `beta` in `initiative.json`. The site build now publishes it
at `demos/SBDC Night Sky/beta/` and labels the released and beta pages.

Checked that the beta builds a page byte-identical to
`demos/SBDC Night Sky/index.html`, that the 59 tests pass in `beta/`, and that
removing the build's label from the published released page gives back the
committed file byte for byte. `lib/`, `work/` and `demos/SBDC Night Sky/` are
unchanged. The reasoning is in `decisions.md`.

## 2026-11-11 — Beta: settings export, import and presets

At the user's request, added a "Presets & settings" panel to the beta only. It
exports every setting as a YAML text file, imports such a file, and offers
three presets: New York City 30 minutes after sunset on October 20, Taos 30
minutes before sunrise on March 15, and Alice Springs 60 minutes after sunset
on June 20. Each preset is one file in `beta/presets/`; adding or deleting a
file adds or removes a preset.

`beta/src/settings.js` is new and `beta/src/ui.js` gained the panel's code.
`beta/src/model.js` and `beta/src/render.js` are unchanged, and so are `lib/`,
`work/` and `demos/SBDC Night Sky/`. `beta/README.md` describes the file format
and how to add a preset.

Checked in Chromium: an export, a page reload and an import of that file give
the same readouts and the same canvas pixels; importing an export of the
opening view gives the opening view back; a file with mistakes changes
nothing. 75 tests pass in `beta/`, 16 of them new.

Found while testing, in the released simulator as well as the beta, and left
as it is: choosing "Custom…" for shell altitudes and then typing the shells
has no effect until another shell option is chosen and "Custom…" is chosen
again.
