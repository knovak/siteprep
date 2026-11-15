# Existing simulator, adopted with its history

SBDC Night-Sky Simulator is a standalone exploration of how a large assumed
space-based data-center constellation might appear in the sky. The supplied
July 2026 package includes its tutorial, specification, implementation and
upgrade plans, phase reports, full source, tests, and assumptions.

The adoption preserves the working demo and all supplied material. Start with
the [README and tutorial](README.html), then use the
[test simulator](../../preview/initiatives/sbdc-night-sky/index.html).

Since 2026-11-11 there is also a
[beta simulator](../../demos/SBDC%20Night%20Sky/beta/), published from its own
copy of the code in `beta/` on every merge. The released simulator and its
source do not change when the beta does. Each copy shows "Released" or "Beta"
and the date it last changed at the end of its credit line. The
[README](README.html) describes the arrangement.
The [notes and reports](notes.html) retain the development history; the
[test plan](test-plan.html) separates adoption checks from real-device testing.

The user reports a satisfactory test-preview outcome as of 2026-09-11, and
`user-test-preview` is complete. The mobile sky positioning follow-up is an
optional later todo, recorded in the [notes](notes.html). The initiative
remains dormant, with no additional releases planned at the user's request.

In November 2026 the beta was upgraded in five units, following a comparison
with another simulator of the same constellation: faults corrected, presets
for that simulator's setups, a corrected twilight sky, ambient light, the
Moon, the ratio of SBDC light to the Moon's, and the hours in a night and a
year for which that light is significant. The [README](README.html) points to
the plan, and [Decisions](decisions.html) has the reasons. The released
simulator did not change.
