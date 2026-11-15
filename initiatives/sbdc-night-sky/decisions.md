# Decisions

## 2026-09-08 — Adopt the existing SBDC simulator as an initiative

The user requests an initiative for the working SBDC Night-Sky Simulator in
`demos/`, with its attached code, markdown documents, and tutorial materials.
The request says: "It should not require code changes, just file migrations."
The reference to "migration map" is interpreted as referring to the named
SBDC simulator and the supplied SBDC wish and archive.

The supplied wish is retained verbatim. `sbdc-night-sky`, medium value, and the
index summary are implementation defaults for review, not answers attributed
to the user. The existing demo is recorded as a published output. Once the
adoption checks finish, the initiative rests at `dormant` pending user testing
and production authorization; no new development work is inferred.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Preserve a development package and an independent preview snapshot | Retains the working demo, makes its source and history discoverable, and permits testing before release; chosen for this adoption. |
| Move or replace the production demo now | Would publish before the testing requested by the user; excluded. |
| Rewrite the supplied documents into new lifecycle prose | Would risk altering historical content and requires permission; excluded. |

## 2026-09-08 — Preserve all supplied documentation

The user instructs: "all the attached documentation files should be adopted
with minimal modification. ask me for permission if you need to modify them."
They also permit changing the README provided its contents are preserved in
the appropriate documents.

All nine originals remain byte-identical under `lib/`. The supplied
specification and implementation plan are copied unchanged to `spec.md` and
`plan.md`. The initiative README adds navigation, then includes the original
README and tutorial verbatim. `notes.md` adds provenance and reading context,
then includes the phase reports, final report, and upgrade plan verbatim.
This uses the existing document renderer without changing application or
repository code. Historical inconsistencies remain visible and are explained
outside the originals. No document modification permission is needed or assumed.

Instructions and open questions inside the supplied documents belong to the
historical record. They do not authorize upgrades, new research, changed
defaults, source downloads, or rewritten documentation in this PR.

## 2026-09-08 — Test preview first; production only after testing

The user instructs: "proceed to do a test deployment as part of this PR.
we'll do a prod deployment only after testing".

The existing output uses the repository's demo hosting, so `deploy-test`
publishes the adopted `work/` snapshot through the branch preview. This is a
public GitHub Pages preview under the existing hosting arrangement. No new
hosting service is introduced. The existing production files are untouched.

The two existing demo files are preserved in `work/`; the supplied assumptions
sidecar is added there. A later release would publish that sidecar alongside
the unchanged simulator and earlier demo snapshot. Production's empty `prod`
record acknowledges the pre-initiative release without inventing deployment
dates or currency metadata.

### What remains open

- User findings from real devices, including pointer/pinch feel, PNG downloads,
  and performance on older phones.
- Explicit production-release authorization after testing.
- Any application or document corrections discovered during that testing,
  which need a separately agreed scope.

## 2026-09-08 — Remove the duplicate archive and keep the initiative dormant

The user asks to remove `notes/sbdc-sim-final-source.zip` if it is unnecessary,
"to limit the use of binary files and duplicate files", and to set the
initiative's status to dormant.

All 29 regular files in the source ZIP were compared with their adopted
`lib/` destinations and found byte-identical, with matching manifest hashes.
The ZIP contains no additional source or documentation, so its 161,551-byte
binary copy is removed. Its original size, checksum, and complete file inventory
remain recorded in `adoption-manifest.json`. The original documents and all
extracted source files remain unchanged.

The initiative was already `dormant` and remains so, now explicitly confirmed
by the user. User testing, any separately authorized fixes, and production
release remain open under their existing blockers.

## 2026-09-11 — Satisfactory user testing; optional mobile follow-up; remain dormant

The user reports that `user-test-preview` had a satisfactory outcome and
instructs that the item is complete. This settles the pending user-test
outcome; no device-by-device findings were supplied.

The user asks to convert `mobile-sky-follow-up` to an optional later todo and
record it in `notes.md`. The inherited mobile sky positioning observation
remains available for a later revisit. The item is retained as requested, but
stays blocked on explicit user permission to resume it, so it cannot be
selected by the sweep. No mobile correction is currently committed to.

The user instructs: "remain in dormant state, no additional releases".
The initiative remains `dormant`. Completing testing does not authorize a
release; `release-after-testing` remains permission-blocked, with no release
currently planned. Any later mobile work or release requires a new explicit
instruction from the user.

## 2026-11-11 — Add a beta version beside the released simulator

The user asks to "introduce another released version of SBDC as a beta
version", whose "code would exist side-by-side with the prod version, in the
main branch", deployed "with every merge". The stated purpose: "I could
guarantee that source and code would be stable in the current URLs, and the
beta version could progress and be substantially modified without destabilizing
the current version. Some day, months from now, I could copy the beta code into
the released version, and continue to make further modifications to the beta
version."

The user also asks that the beta be "easy to access, from both the demos page
and the SBDC initiative page", that it "be identical to the current version",
and adds: "It would be nice if the simulator itself had a subtle annotation of
whether it's beta or released, and when it was last changed."

**Decided:** the beta's code is `beta/`, a copy of the code in `lib/`. The site
build builds it and publishes it at `demos/SBDC Night Sky/beta/` on every
build. `lib/`, `work/` and `demos/SBDC Night Sky/` are unchanged. The build adds
the "Released" or "Beta" label and the last-changed date to each copy's credit
line at publish time.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Build the beta from `beta/` during the site build, and commit no built page | The published beta always matches its source, and a beta pull request shows only source changes. The site build runs the beta's tests and builder (about two seconds). Chosen. |
| Commit a built beta page, as `work/` does for the release | A third 245 KB copy of the page in the repository, and it can fall behind its source unless a check rebuilds it anyway. |
| Commit the beta under `demos/SBDC Night Sky/beta/` | `demos/` holds releases, and `deploy-demo` replaces the demo folder as a whole, so the next release would delete the beta. |
| Treat `work/` as the beta, since the build already publishes it as the test preview | The released source would no longer be at its current paths once the beta changed, which is the stability the user asks for. |
| Write "beta" and a date into the simulator's code | The label would have to be changed by hand at promotion, and a released page could ship reading "Beta". The date would be typed rather than derived. |

### What this settles, and what it does not

- The 2026-09-11 instruction "remain in dormant state, no additional releases"
  still governs the released copy. Publishing the beta does not release
  anything to `demos/SBDC Night Sky/`, and `release-after-testing` stays
  blocked.
- The released page as served now ends its credit line with "Released ·
  changed 2026-07-20". The file in `demos/SBDC Night Sky/` is byte-identical to
  before; the build adds the label when it publishes. This is the one visible
  change to the released URL, made because the user asked for the annotation
  on both copies.
- The beta is identical to the released simulator on 2026-11-11 apart from its
  label. No beta change is planned or authorized by this decision; the
  initiative stays `dormant` until the user asks for one.
- Promotion (copying the beta's code into `lib/` and `work/`, then releasing)
  needs a new explicit instruction. `beta/README.md` has the steps. It will be
  the first change to `lib/` since adoption, so the adoption manifest's hashes
  for those code files stop matching from then on.
- The nine supplied documents are not copied into `beta/`. Whether the beta
  gets its own tutorial or specification is open until the beta differs enough
  to need one.

## 2026-11-15 — Upgrade the beta in five units, from a comparison with another simulator

The user supplies "Visual Comparison of Two Orbital Data Center Sky
Simulators", 16 paired scenarios captured on 12 October 2026, and asks: "Plan a
set of upgrades to the beta version of SBDC. Study this doc, and compare the
code and the display to
https://github.com/sdross0/orbital-datacenter-brightness. Correct any bugs you
discover in SBDC." The features asked for are presets that correspond to that
project's default setups, an option to include moonlight and its effects, an
approximate ratio of SBDC light to the Moon's, an option to simulate ambient
light, and "perhaps" the number of hours in a night or a year in which SBDC
light is significant at a location, plus any improvement the document
suggests.

The user adds: "Consider the testing strategy when make the plan, to
streamline the process. Break the entire plan into 5 units of work, and
immediately start to execute the first unit. Each unit should involve
deployment to beta, and a corresponding PR." A later message in the same
session asks that the decisions made and the plan to be executed be
documented.

**Decided:** the work is five units, each one pull request, in this order.
The full plan, the fault list and the testing strategy are in `beta/PLAN.md`.

| Unit | Content |
| --- | --- |
| 1 | The eight faults that do not change the model's numbers, and the checks the later units reuse |
| 2 | Constellation and brightness settings that let the sdross0 setups be reproduced, presets for them, and a link that carries the settings |
| 3 | The twilight sky-brightness correction, and ambient light by Bortle class |
| 4 | Moonlight, and SBDC light compared with the Moon |
| 5 | Hours of significant SBDC light per night and per year, a perspective view, and aiming at the densest sky |

### What was decided, and why

**The plan is in `beta/PLAN.md`.** `plan.md` and `spec.md` are the supplied
July 2026 documents, byte for byte, and `adoption-manifest.json` records them
as such. A beta plan appended to `plan.md` would break that record.

**The initiative stays `dormant`, and the units are not todo items.** The work
is done in the session that was asked for it. An actionable todo item in a
non-dormant initiative is work the scheduled sweep may pick up, so listing the
units there would let a sweep run start a unit the session is already in. This
follows the 2026-11-11 settings work, which was also done at the user's request
with the stage unchanged. `release-after-testing` and `mobile-sky-follow-up`
keep their blockers.

**Each unit's pull request is merged when the site workflow has passed.** The
beta is published by the site build from `main`, so a merge is the only way a
unit reaches the beta, and the user asked that each unit include that
deployment. The units also build on each other, and the session has one branch,
so unit 2 cannot be opened until unit 1 has merged. Nothing here releases the
simulator: `lib/`, `work/` and `demos/SBDC Night Sky/` are not changed, and the
2026-09-11 instruction "no additional releases" still governs them.

**The other project's code is read, not copied and not run.** The checks use
the numbers it has published: the 16 whole-sky counts in the comparison
document and the tables in its README. The formulas this simulator needs from
it are from the papers it cites (Boley, Lawler and Rein 2026; Mallama et al.
2023; Patat et al. 2006; Schaefer 1990), written here from those descriptions.

**Every new model setting defaults to the current behaviour.** A person who
opens the beta and changes nothing sees the same constellation and the same
brightness as before. The two fixture files are the check: a unit that adds a
setting may not change `test/golden/golden.json` or the Site 1 column of
`test/fixtures/paired-comparisons.json`.

**The twilight table is the one exception, because it is a fault.**
`skyBrightness.table` in `sbdc-data.json` cites Patat et al. (2006) and gives
16.5 mag/arcsec² at the zenith with the Sun 6° below the horizon. That paper's
V-band fit gives 13.30 there, 17.00 at 9° and 19.67 at 12°; the table has 16.5,
18.2 and 19.5. The sky at the end of civil twilight is therefore drawn about 19
times darker than measured, and stars and satellites are counted as visible too
early. Unit 3 corrects the table. This lowers the counts at dusk and dawn, which
includes the opening view and the three existing presets, all 30 to 60 minutes
from sunset or sunrise. The fixtures are regenerated in that pull request and
the change is listed there.

**The naked-eye threshold table is left as it is.** The other project uses a
closed form from Schaefer (1990), which is stricter under a bright sky: with the
Sun 6° down it gives a limit near magnitude -0.6, where this simulator's table,
once the sky is corrected, gives about 1.5. The brightest stars are in practice
visible at the end of civil twilight, which the table matches more closely. The
two limits agree to about 0.2 magnitude once the sky is dark.

**"In view" and "whole sky" are separate numbers in the readout.** The document
compares whole-sky totals and notes that the other site also prints a smaller
count for its picture. The readout now gives both in the horizon view.

**Ambient light is a second control beside the eye limit.** The existing "Eye /
sky quality limit" is a cap on the faintest magnitude seen. Ambient light is a
sky brightness, by Bortle class, added to the twilight sky. They are different
things, so both stay and the first is relabelled.

**The Moon needs a year, and is placed for longitude 0.** The simulator has a
latitude, a date and a local solar time, and no longitude. The Moon moves about
half a degree an hour, so taking the solar time as universal time places it
within about 7° for any longitude. A phase can also be set by hand, which needs
no date.

**"Significant" is reported under three definitions.** The request does not
define it. Unit 5 reports the hours for each of: at least 100 SBDCs visible to
the naked eye; visible SBDCs outnumber visible stars; SBDC light exceeds the
natural moonless night sky. All three include moonlight and ambient light when
those are on.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Five units ordered as above: faults and checks first, then settings, sky, Moon, hours | Each later unit has the checks and the settings it needs. The fault that moves the numbers is isolated in Unit 3. Chosen. |
| One pull request for everything | One review of a change that touches the model, the sky, the page and the tests, with no beta deployment until the end. The user asked for five. |
| Correct the twilight table in Unit 1 with the other faults | The first unit would move every dusk number while also adding the fixtures that are meant to show nothing moved. |
| Keep the old twilight table as a selectable option | A setting whose only purpose is to reproduce a fault. |
| Move the stage to `refining` and add the units as todo items | The overview page would show the work, and the sweep could start a unit in parallel with the session doing it. |
| Add the other project's layout file and physics to the beta | Its counts would match to the satellite. The page would grow by about 2.9 MB against a 600 KB budget, and the beta would carry a second model. |
| Run the other project's code in the checks | Not available: the session may read that repository and may not execute it. |
| Replace the naked-eye threshold table with the Schaefer closed form | Closer agreement with the other project in twilight, and a limit at dusk that is stricter than what observers report. |

### What this settles, and what it does not

- The user's fifth feature was asked for with "perhaps". It is planned as
  Unit 5; the user may drop or change it before then.
- The document refers to a "main evaluation" that was not supplied. Faults it
  lists that are not in the paired-comparison document are not covered. The
  phrase "the known Site 1 twilight behavior" is taken to be fault 9, the
  twilight table; that reading is this session's, not the document's.
- The sticky sky on phones is still not corrected. Its todo item needs the
  user's explicit choice to resume it, and "correct any bugs you discover"
  is not read as that choice for an item the user parked by name.
- Whether the beta gets its own tutorial is still open. Unit 5 adds a short
  guide to the new controls to `beta/README.md`.
- Promotion of the beta to the released simulator is not part of this work.

## 2026-11-15 — Beta upgrade, unit 3: a threshold option, the color ramp, and the opening view

Three things came up while unit 3 was done that the entry above did not
settle. They are recorded here because one of them revises it.

**The Schaefer threshold becomes an option.** The entry above left the
naked-eye threshold table as it was and listed the Schaefer closed form as an
alternative not taken. Correcting the twilight sky was expected to bring this
simulator's twilight counts close to the other simulator's. It moved the
optimistic-case ratio at 55° N only from 3.9 to 3.3. The larger part of the
difference is the threshold relation, which the other simulator takes from
Schaefer (1990): with the Sun 10° down it gives a limit about a magnitude
lower than the table. The table stays the default, because with the corrected
sky it matches when stars are seen to appear in twilight. The closed form is
added as `advanced.naked_eye_threshold: schaefer`, and the three sdross0
presets use it, since those presets exist to correspond to that project's
setups. With it the same ratio is 1.8, and the no-mitigation ratios in
twilight are 1.00 and 1.04.

**The sky color ramp's anchors moved with the table.** The ramp maps sky
brightness to color, with anchors that were values of the old table. With the
corrected table and the old anchors, the whole sky half an hour after sunset
drew in the peach meant for the minutes around sunset. The anchors are now the
corrected table's values at the same Sun altitudes, so each color stays with
its stage of twilight, and a test ties the two together.

**The opening view stays 30 minutes after sunset.** With the measured sky that
view shows 546 visible SBDCs and 2 stars, where it showed 3,290 and 67. An
hour after sunset it shows 3,899 and 286. Moving the opening time to 60
minutes would give a fuller first picture. It is left where it is: the
opening time is the simulator's own default, the user did not ask for it to
change, and the "+60 min" button is one click away. The three place presets
are likewise unchanged in time, and two of them, at 30 minutes from sunset or
sunrise, now show about half the SBDCs they did.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Table as the default threshold, Schaefer as an option used by the sdross0 presets | The default view keeps a threshold that fits twilight observation; the presets correspond to the other project. Chosen. |
| Schaefer as the default | Closer to the other simulator everywhere, and a default that shows no first-magnitude star until the Sun is 7° down. |
| No option | The sdross0 presets differ from that project by a factor of three in twilight for a reason a person cannot change. |
| Leave the color ramp's anchors | A peach sky for the whole of civil twilight. |
| Move the opening view to 60 minutes after sunset | A fuller first picture, and a changed default the user did not ask for. |

### What this settles, and what it does not

- Whether the opening view and the place presets should move later in the
  evening is the user's to decide. Nothing in the remaining units depends on
  it.
- The two twilight curves still differ by about half a magnitude with the Sun
  10° to 11° down. This simulator keeps the one its data file cites.

## 2026-11-15 — Beta upgrade, unit 4: what "the light of the SBDCs" and "the Moon" mean here

The user asked for "an option to include moonlight and its effects" and to
"calculate an approximate ratio of the SBDC light to that of the moon". Unit 4
had to fix what is compared with what.

**SBDC light is every sunlit satellite above the horizon, added up.** The
visible ones alone would leave out most of the light when the satellites are
faint, and the question is about light, which the satellites give whether or
not each one can be picked out. The total is written as one magnitude.

**It is compared with three things.** A full Moon overhead, which is the
figure a person can picture and does not change with the date. The Moon as
set, when it is up, with its phase and its dimming near the horizon. And a
moonless natural night sky summed over the hemisphere, about magnitude -6.7 or
a thousandth of a lux, because for much of the month there is no Moon and that
is the light the satellites add to. All three are ratios of apparent
brightness. They are not illuminance on the ground, which would also weight
each source by its altitude.

**The year moves the Moon and nothing else.** The Sun and stars are computed
for 2026 throughout the model, and changing that would move every frozen
number by a little for no visible gain. The Moon's phase depends on the year
completely, so the Moon is placed by its angle from the Sun for the year asked
for.

**The Moon is off by default.** With it off the simulator is as it was. A
person who wants the sky of a particular night turns it on.

**The readout moved below the sky.** It had grown to three lines and covered
the horizon. Putting it under the sky costs a strip of sky height and shows
the part of the sky where the constellation is densest.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Total light of all sunlit satellites, against a full Moon, the Moon as set, and a natural night sky | Three numbers that answer "how much light is this" on any night. Chosen. |
| Only the naked-eye-visible satellites | A total that falls to nothing under mitigation while the satellites still light the sky. |
| Illuminance on the ground, each source weighted by the sine of its altitude | Closer to what a light meter reads, and a ratio that changes with the Moon's altitude in a way a reader has to work out. |
| A Moon that is always on | The default view would depend on the date's Moon, and every earlier screenshot and count would need one stated. |
| Add a longitude so that the Moon's place is exact | A control the rest of the model has no use for, for a gain of a few degrees. |

### What this settles, and what it does not

- The ratios are approximate, as asked. Their largest uncertainty is the
  satellites' brightness, not the Moon's.
- Moonlight scattered when the Moon is just below the horizon is not modelled.
- Unit 5's count of hours uses these totals for one of its three definitions.
