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

## 2026-11-15 — Beta upgrade, unit 4: the Moon, moonlight, light ratios

Unit 3 merged as knovak/siteprep#654 and the site build published it to the
beta.

Unit 4 adds the Moon: off by default, as on a date in a chosen year, or at a
chosen phase. Its place comes from the Astronomical Almanac's low-precision
series, which the tests check against three eclipses. A Moon above the horizon
lights the sky by the model of Krisciunas and Schaefer (1991), which lowers
the limit and hides faint satellites and stars. The Moon is drawn with its
phase.

The readout has a new line with the summed light of all sunlit SBDCs above the
horizon and its ratio to a full Moon, to the Moon as set, and to a moonless
natural night sky. With the default constellation at 40° N on a December
evening the SBDC light is about an eighth of a full Moon's and 27 times the
natural night sky's; at midnight in June it is 1/758 and about a third.

Two faults corrected. Turning the view in the instant after a rebuild could
raise "Simulator error", because the picture paired the new constellation with
the old evaluation; this was in the simulator before the upgrade. And the
readout strip covered the horizon; it is now below the sky.

`test/golden/golden.json` gained the `light` block; no number already in it
changed. 137 tests pass in `beta/`, and the browser spec has eighteen. `lib/`,
`work/` and `demos/SBDC Night Sky/` are unchanged.

## 2026-11-15 — Beta upgrade, unit 5: hours of significant light, perspective view, aiming

Unit 4 merged as knovak/siteprep#655 and the site build published it to the
beta.

Unit 5 adds a "Night & year" group. For the chosen latitude and date it counts
the hours in which SBDC light is significant, under three definitions side by
side: at least 100 SBDCs visible to the naked eye, visible SBDCs outnumbering
visible stars, and SBDC light exceeding the sky's own light. It does the same
for a year from 24 sampled dates, and draws visible SBDCs and stars through
the night. Moonlight and ambient light are included when they are on.

With the default constellation at 40° N, at least 100 SBDCs are visible for
8.3 of the 8.9 hours of a June night and for 4,011 of a year's 4,304 night
hours. With the sdross0 optimistic-mitigation settings at 37.2° N the figure
is 1.5 hours on September 22 and 597 hours a year. The sdross0 hours match the
durations that project states.

Also added: a perspective view, which draws the sky as a camera records it and
is the other simulator's projection, and an "Aim at densest sky" button.
`beta/README.md` has a short guide to everything the upgrade added.

148 tests pass in `beta/`, and the browser spec has twenty-two. `lib/`, `work/`
and `demos/SBDC Night Sky/` are unchanged. This is the last of the five units
in `beta/PLAN.md`.

## 2026-11-16 — Beta: the page fits a phone again

Checking the sticky sky at phone size (iPhone 13, 390 px) found that the beta
page was 1,452 px wide, so the phone shrank it to fit and the controls were too
small to use. Unit 4 moved the readout strip out from over the sky and into the
page's flow; its lines do not wrap on a narrow screen, and the grid and flex
containers around it took their width from the longest line. The columns now
take the screen's width, and a long line is cut with an ellipsis. The released
simulator never had this fault. At that width the credit line takes two lines
and covered the compass points along the horizon, so on a narrow screen it is
now at the top of the readout strip, below the sky.

`beta/PLAN.md` lists it as fault 12, and the browser spec has a test at
390 × 844. The sticky sky itself is unchanged: on a phone the sky still scrolls
away in both the released simulator and the beta, and it stays the
`mobile-sky-follow-up` todo item.

## 2026-11-20 — Independent review of the published beta

The [beta evaluation and evidence](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/notes/beta-audit-2026-11-20.md) ranks eleven findings from the hosted desktop/phone experience, local browser measurements, model probes, and an external lunar ephemeris. The evidence and three screenshots live in `notes/`.

Recommended beta work, in order: **A** distinguish visible objects from members and correct brightness claims; **B** bind calculations to their starting settings and keep the interface responsive; **C** expose the counts on phones and restore standard keyboard behavior; **D** validate overnight dates and quantify uncertainty before citing annual estimates. Each package has an acceptance gate in the report. No beta code, production release authorization, dormant status, or sticky-sky decision changes here.

## 2026-11-20 — Implemented audit packages A–D on the beta line

The beta now distinguishes visible objects from satellites, runs cancellable analyses using captured inputs, exposes readable counts and keyboard controls, and records export provenance. The [verification record](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/notes/beta-audit-implementation-2026-11-20.md) includes sampling comparisons, a measured dark-sky reference, response timings and outstanding real-device checks. No change to the released simulator.


## 2026-11-26 — Beta: a shorter control panel, and presets with descriptions

The sidebar had every control showing, about fifty of them across six groups. Each group now shows one to three controls and keeps the rest under a "Details" section that starts closed; a closed section lists the names of the controls inside it, in small type and in its tooltip. The page opens with 11 controls showing and 20 under Details.

Presets now carry a one- or two-sentence `description` and an optional `category`, and the build refuses a preset without a description. A preset's `panel` section chooses which controls each group shows and whether each Details section is open; the sdross0 presets show the brightness model. The Preset drop-down is replaced by a preset browser, planned for 30 to 40 presets: each preset is listed with its description under its category, with a filter by words, category buttons and keyboard use, and the sidebar card shows the loaded preset's description with ‹ › buttons to step through the list. A scratch build with 40 presets was checked at desktop and phone widths.

Exports and links record the panel; the settings reference in file names and PNGs leaves it out, so it still names the sky. `beta/README.md` has "The control panel" and "The preset browser". The simulator, the model and its fixtures are unchanged, as are `lib/`, `work/` and `demos/SBDC Night Sky/`.
