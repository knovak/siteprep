# Phase 3 anatomical movement collection

This increment is a selectable 13-entry validation collection: the original
Feldenkrais, yoga, and Alexander Technique records plus five additional yoga
and five additional Feldenkrais anatomical studies. It remains private,
`noindex`, educational, and unreviewed. Its primary purpose is to display the
changing fitted-reference bones, joints, and muscle paths rather than guide a
viewer through performing a movement.

## Records and clips

`scripts/build-movement-library.mjs` generates the ten added records under
`records/`, the complete `data/collection.json`, and the complete
`data/movement-clips.json`. The yoga studies cover Tadasana with an arm sweep,
Virabhadrasana II, Utthita Trikonasana, Utkatasana, and Uttanasana. The
Feldenkrais studies cover a seated chair clock, shoulder clock, sliding hand
with rib response, seated head-rib-pelvis counter-turn, and seated weight shift
with foot response. Source links establish the named practice or lesson family;
all anatomical wording and keyframes are project-authored estimates. Every
record retains an explicit caution, provisional rights basis, and `unreviewed`
practitioner and anatomy status.

`data/movement-clips.json` holds 13 distinct project-authored keyframe clips on
the Phase 0 shared rig. They are illustrative geometry, not motion capture,
biomechanics, force, load, or individual anatomy.

The collection page defaults to the superficial-muscle view and adds six
anatomical renderings over a coherent full-body silhouette: surface,
transparent surface with skeleton, superficial muscles, deep muscle groups,
muscles with skeleton, and skeleton detail. Muscle bellies, tendon endpoints,
paired forearm and lower-leg bones, joint landmarks, skull, pelvis, and rib-cage
landmarks remain tied to the same animated rig. Switching records changes the
clip, cautions, timed anatomical readout, context, sources, rights basis, and
review status while preserving the shared camera and layer controls. Playback
requires one acknowledgement per page session; changing records does not ask
again. The educational boundary and acknowledgement appear above the animation.
The animation stage is one browser-viewport tall. Front, Side, and Back are
explicit camera presets with active-state feedback and view-aware surface and
muscle rendering. A clip-wide projection frame remains fixed through playback,
so a movement cannot create an unintended zoom pulse. Below the animation,
Anatomical view and its pin/isolation controls precede Movement, Visual Twin,
and the remaining flaggable claims.

## Verification

From the repository root:

```sh
node --test initiatives/body-movement-visual-twin/work/phase-1/test/*.test.mjs
node --test initiatives/body-movement-visual-twin/work/phase-2/test/*.test.mjs
node --test initiatives/body-movement-visual-twin/work/phase-3/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-3/playwright.config.mjs
```

The data tests validate all 13 records and sources, prove that removing the
non-geometric context makes each entry incomplete, verify 13 distinct
bounded clips on known rig nodes, and rerun the eight-millimetre registration
check for every clip. Browser tests cover selection, single-session
acknowledgement, viewport-height animation, fixed projection, named camera
presets, six renderings, source links, WebGL fallback, desktop and phone layout,
and serious or critical accessibility findings.


## Detailed anatomy illustration (KRN revision)

`src/anatomy-geometry.mjs` owns authored display geometry. The original 27-node
motion rig, 40 named muscle groups, record sources, and registration fixtures
remain intact. Render detail does not add clinical claims or independently
controlled vertebral joints.

The axial display includes 24 individual vertebrae (C1-C7, T1-T12, L1-L5),
vertebral bodies and posterior processes, the atlas ring, axis dens,
intervertebral disc seams below C2, a connected sacrum with five fused segments,
and a typical four-segment coccyx. Twelve rib pairs curve in three dimensions:
ribs 1-7 connect through cartilage to the sternum, 8-10 connect to the costal
arch, and 11-12 have free anterior ends. The sternum and scapular blades complete
the immediate chest context. The reference widths, curves, proportions, and
skin weights are illustrative estimates awaiting anatomy review.

Muscles use 86 shaped surface patches rather than identical two-point bellies.
These include chest fans, shoulder portions, separate abdominal blocks,
oblique fibres, three visible quadriceps bundles per side, paired calf heads,
and distinct front/back arm and back surfaces. Curved surface fibres, tonal
strips, fascia/tendon fades, and fine claim outlines give anatomy-drawing detail
without replacing the animated viewer with a fixed image. Contextual neck,
forearm, adductor and shin groups have no movement claim ID; they cannot be
highlighted as if the record supplied a new claim. All existing claim IDs and
review statuses are preserved.

Reference points carry weights on existing rig nodes. A cached template stores
those weights and fibre topology; each new pose deforms the template. Stature
invalidates the template and scales the complete reference geometry. Camera or
layer changes reuse the same posed geometry. Neither surface build nor surface
presentation changes internal anatomy. The original packaged muscle data still
loads lazily; it remains the claim/attachment contract rather than the source
of the new display contours.

The viewer depth-sorts projected geometry and filters front/back surfaces. This
is a Canvas illustration of posed 3D points, not a watertight volumetric mesh or
a clinical atlas; limb overlap and extreme poses still require human visual
review. Joint isolation now filters the selected joint's immediate region,
fixing the prior lookup that inadvertently accepted every node.

The anatomy facts and illustration conventions were checked against OpenStax
*Anatomy and Physiology 2e* on 2026-09-05:

- [7.3 The Vertebral Column](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-3-the-vertebral-column)
- [7.4 The Thoracic Cage](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-4-the-thoracic-cage)
- [11.1 Muscle shapes and fascicle arrangement](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-1-interactions-of-skeletal-muscles-their-fascicle-arrangement-and-their-lever-systems)

These references establish structural categories, not the accuracy of this
project's geometry. No external atlas mesh, bitmap, or source text is bundled.

`test/anatomy-geometry.test.mjs` checks complete regional and bilateral counts,
rib connection classes, three-dimensional curvature, finite surfaces and
fibres at every authored clip frame, rib-root attachment, proportional stature
scaling, movement of the detailed spine, and preservation of all muscle claim
IDs. Browser coverage checks that posed anatomy and joint isolation actually
change the rendered image while layers preserve time, camera, and framing.

Physical anatomy dimensions use the projection scale once. Device-pixel ratio
applies only to screen-space line detail; the earlier surface and skull code
multiplied it twice. Clip-wide fitting now reserves room for the camera controls
and full head/feet extents on phones while remaining constant through playback.
