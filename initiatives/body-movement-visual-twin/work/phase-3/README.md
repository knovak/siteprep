# Phase 3 three-tradition collection

This increment turns the one-movement Phase 2 vertical slice into a selectable
three-entry validation collection. It remains private, `noindex`, educational,
and unreviewed. It does not claim that a project-authored animation can replace
a practitioner, a lesson, a class, or hands-on guidance.

## Records and clips

`data/collection.json` names exactly one record from each Phase 1 tradition:
Feldenkrais, yoga, and the Alexander Technique. The records keep their
tradition-specific shapes rather than flattening instruction into generic pose
copy. They now also name the primary practice-organization pages supporting the
general concepts used in the project-authored wording. Every record retains an
explicit caution, provisional rights basis, and `unreviewed` practitioner
status.

`data/movement-clips.json` holds three distinct, hand-authored keyframe clips
on the Phase 0 shared rig. The Feldenkrais clip alternates a small pelvic and
spinal exploration; the yoga clip separates supported entry, stay, and exit;
the Alexander clip preserves a pause before a small whole-torso incline and
stops before pretending to reproduce standing or manual guidance. These clips
are illustrative geometry, not motion capture, biomechanics, force, load, or
individual anatomy.

The collection page reuses Phase 2's packaged fitted-reference rig and lazy
muscle payload. Switching records changes the clip, cautions, timed cue,
instruction sections, sources, rights basis, and review status while preserving
the shared camera and layer controls. Playback is gated again for each record.

## Verification

From the repository root:

```sh
node --test initiatives/body-movement-visual-twin/work/phase-1/test/*.test.mjs
node --test initiatives/body-movement-visual-twin/work/phase-2/test/*.test.mjs
node --test initiatives/body-movement-visual-twin/work/phase-3/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-3/playwright.config.mjs
```

The data tests validate all three records and sources, prove that removing the
non-geometric instruction makes each entry incomplete, verify three distinct
bounded clips on known rig nodes, and rerun the eight-millimetre registration
check for every clip. Browser tests cover selection, caution re-gating,
tradition-specific copy, distinct clip motion, source links, WebGL fallback,
phone layout, and serious or critical accessibility findings.
