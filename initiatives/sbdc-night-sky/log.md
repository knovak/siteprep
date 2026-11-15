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

## 2026-11-15 — Beta upgrade, unit 1: faults found by a comparison, and checks

The user supplied a paired comparison of this simulator with
`sdross0/orbital-datacenter-brightness` and asked for the beta to be upgraded
in five units. `beta/PLAN.md` is the plan and `decisions.md` has the reasons.

The beta model, run with the document's settings, gave the document's count
for this simulator in all 16 cases.

Unit 1 corrects eight faults in `beta/`, none of which changes a number the
model produces: custom shells typed after choosing "Custom…" are now used; the
time control is labelled solar time and the readout gives minutes from sunset
or sunrise; a time just under the hour is written with the right hour; the
compass label matches the view on first load and follows the arrow keys; the
hills no longer change when the view pans past north; the Satellites slider
reaches 500,000 and other round totals; one plane per shell sits at the centre
of the spread; and the readout gives the count in view beside each whole-sky
total. `beta/src/format.js` is new.

Added `beta/test/paired.test.js` with the 16 documented cases as a fixture,
`beta/test/format.test.js`, and `tests/e2e/sbdc-beta.spec.js`, which drives
the published beta in Chromium in the site workflow. The spec fails on the
code before this unit in five of its six tests and passes after it. 93 tests
pass in `beta/`; `test/golden/golden.json` is unchanged. `lib/`, `work/` and
`demos/SBDC Night Sky/` are unchanged.

## 2026-11-15 — Beta upgrade, unit 2: settings and presets for the sdross0 setups

Unit 1 merged as knovak/siteprep#652 and the site build published it to the
beta.

Unit 2 adds the settings needed to reproduce the other simulator's setups:
latitude to a tenth of a degree, the 54 filed Sun-synchronous levels as a shell
option, an "as filed" plane layout with two planes per level and evenly spaced
satellites, the plane spread, the scatter in brightness between satellites, and
the measured Starlink Gen2 Mini phase curve beside the Lambertian sphere. The
SBDC brightness slider now moves in steps of 0.1. Each default is the earlier
behaviour: `test/golden/golden.json` and the Site 1 counts of the paired
fixture are unchanged.

Three presets set that project's constellation with its two brightness models,
and a "Copy link" button writes the settings into the page address. The three
place presets now use the places' latitudes to a tenth of a degree.

With the new settings the picture shows distinct bands, as the other
simulator's does. For the documented cases with a dark sky the no-mitigation
count is 0.85 to 1.00 of the other simulator's, and the December optimistic
count is 0.98 of it. In the two twilight cases this simulator counts three to
four times as many faint satellites; that is the twilight-table fault, which
unit 3 corrects. `beta/PLAN.md` has the table.

113 tests pass in `beta/`, and the browser spec has ten. `lib/`, `work/` and `demos/SBDC Night Sky/` are
unchanged.

## 2026-11-15 — Beta upgrade, unit 3: the twilight sky, ambient light, the threshold

Unit 2 merged as knovak/siteprep#653 and the site build published it to the
beta.

Unit 3 corrects the twilight sky-brightness table to the V-band measurements
of Patat et al. (2006), which the table cited and did not match: it was 3.2
magnitudes too dark with the Sun 6° down. The naked-eye limit at the end of
civil twilight goes from 3.8 to 1.5. The opening view, 30 minutes after
sunset, now shows 546 visible SBDCs and 2 stars where it showed 3,290 and 67;
from an hour after sunset the counts are within about 15% of what they were.
`test/golden/golden.json` and the Site 1 counts of the paired fixture were
regenerated, and the fixture keeps the documented counts beside the new ones.
The sky color ramp's anchors moved with the table.

Added ambient light by Bortle class, 1 to 9, which brightens the sky and
lowers the limit, and a choice of naked-eye threshold: the simulator's table,
or the Schaefer closed form the other simulator uses. The sdross0 presets use
the second. The readout gives the zenith sky brightness and the limit.

With those settings the no-mitigation counts in the two twilight cases are
1.00 and 1.04 of the other simulator's (1.11 and 1.17 before), and the
optimistic counts 1.8 and 1.25 of it (3.9 and 3.1 before). With the Schaefer
threshold and the Bortle table this simulator reproduces the limits the other
project publishes for five Bortle classes to within 0.03 magnitude.

125 tests pass in `beta/`, and the browser spec has thirteen. `lib/`, `work/`
and `demos/SBDC Night Sky/` are unchanged.
