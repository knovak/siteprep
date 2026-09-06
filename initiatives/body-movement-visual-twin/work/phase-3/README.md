# Phase 3 anatomical movement collection

This increment is a selectable 43-entry validation collection: the original
Feldenkrais, yoga, and Alexander Technique records plus twenty additional yoga
and twenty additional Feldenkrais anatomical studies. It remains private,
`noindex`, educational, and unreviewed. Its primary purpose is to display the
changing fitted-reference bones, joints, and muscle paths rather than guide a
viewer through performing a movement.

## Records and clips

`scripts/build-movement-library.mjs` generates the forty added records under
`records/`, the complete `data/collection.json`, and the complete
`data/movement-clips.json`. The yoga studies cover Tadasana with an arm sweep,
Virabhadrasana II, Utthita Trikonasana, Utkatasana, and Uttanasana. The
Feldenkrais studies cover a seated chair clock, shoulder clock, sliding hand
with rib response, seated head-rib-pelvis counter-turn, and seated weight shift
with foot response. Source links establish the named practice or lesson family;
all anatomical wording and keyframes are project-authored estimates. Every
record retains an explicit caution, provisional rights basis, and `unreviewed`
practitioner and anatomy status.

`data/movement-clips.json` holds 43 distinct project-authored keyframe clips on
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

The data tests validate all 43 records and sources, prove that removing the
non-geometric context makes each entry incomplete, verify 43 distinct
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
arch, and 11-12 have free anterior ends. The sternum, scapular blades, and two curved clavicles complete
the immediate chest context. The skull has a posed cranium, an explicit occipital
region and paired condyles, nasal and jaw landmarks, and orbital recesses. Head
rotation is re-anchored at the atlas-occiput articulation; the skull and its
surface silhouette rotate in three dimensions instead of remaining flat ovals. The reference widths, curves, proportions, and
skin weights are illustrative estimates awaiting anatomy review.

Muscles use 180 shaped surface patches rather than identical two-point bellies.
These include chest fans, shoulder portions, separate abdominal blocks,
oblique fibres, three visible quadriceps bundles per side, paired calf heads,
and distinct front/back arm and back surfaces. Curved surface fibres, tonal
strips, fascia/tendon fades, and fine claim outlines give anatomy-drawing detail
without replacing the animated viewer with a fixed image. Contextual neck, intercostal, segmental back, collarbone,
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


## Spine, skull, collarbone and foot audit (2026-09-05)

[ANATOMY-AUDIT.md](ANATOMY-AUDIT.md) records the explicit counts and remaining
reference-model limitations. Every vertebral level, every rib, both clavicles,
and the skull is tested for motion *within* a clip. Fused sacral segments keep
constant separation. Cervical deformation reaches C1; a separate head rotation
pivots at the occiput without dragging the atlas along with a nod. C1 has no
vertebral body, disc or spinous process.

The illustrated muscle set includes two sternocleidomastoid heads per side,
splenius/semispinalis capitis, four suboccipital pairs, three scalene pairs,
levator scapulae, subclavius, pectoralis minor, 11 external-intercostal patches
per side, and 23 paired intertransversarii patches along C1-L5. These are authored
surface estimates, not an exhaustive individual-muscle atlas. New patches retain
null movement-claim IDs and have named attachment landmarks. Skull insertions use
the same corrected head transform as the bones. Clavicular and scapular ends
follow the shoulder; intercostal borders use the same rib geometry and torso
binding as the skeleton. The clavicle curve blends the clavicle and scapular
controls and is not a rigid-body sternoclavicular/acromioclavicular simulation.
Small contextual patches use fewer fibres and strips to bound rendering cost.

The movement generator uses +Z as anterior. Negative X hip rotation brings the
downward reference thigh forward; positive X knee rotation returns the shin
downward. The former seated keyframes reversed both signs, placing the knees
behind the body while the toes still pointed forward. All seated variants now
use the corrected signs. Chair-pose and forward-fold keyframes compensate at the
ankles and root to preserve reference foot positions at those keyframes; the
forward fold rotates the pelvis with compensating hip rotation to keep the legs
beneath the body. Linear interpolation remains illustrative, not contact-solving
inverse kinematics. Counter-turn includes a small independent head nod/turn;
shoulder-clock and arm-sweep keyframes include clavicular response.

Additional anatomical references checked on 2026-09-05:

- [11.3 Axial Muscles of the Head, Neck, and Back](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back)
- [11.4 Axial Muscles of the Abdominal Wall, and Thorax](https://openstax.org/books/anatomy-and-physiology/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax)
- [11.5 Muscles of the Pectoral Girdle and Upper Limbs](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs)
- [University of Utah: Deep back and suboccipital muscles](https://anatomy.med.utah.edu/diganat/PT/2014_lecture/L08_deep_back_suboccipital.pdf)


## Thirty-study expansion (2026-09-06)

`additional-studies.mjs` adds fifteen Feldenkrais themes: ankle flexion,
ankle circles, foot-edge tilts, wrist flexion, wrist clocks, elbow folding,
shoulder glides, forward reach, head nods, head side bends, spinal rounding and
arching, back-lying knee tilts, heel slides, diagonal lengthening, and knee
extension with a forward-facing foot. Fifteen yoga additions cover tree,
Warrior I, extended side angle, wide standing fold, pyramid, half moon, eagle
arms, cow-face arms, prayer position, upward prayer, chair twist, staff,
seated forward fold, seated wide angle, and legs up the wall.

Every addition has original keyframes, three timed phases, tradition-specific
context, per-record sources, and explicit unreviewed muscle-behaviour estimates.
Source links identify postures and movement families; they do not validate the
project's angles or muscle annotations. Finger articulation, exact hand binds,
props, and general floor/contact constraints remain outside the reference rig.
Folded-arm keyframes derive local rotations from torso-space segment directions.

The new themes were checked against the linked Iyengar Level I curriculum,
Feldenkrais Guild sample and hands/feet pages, the Guild article
[Building Better Sitting Habits](https://feldenkrais.com/building-better-sitting-habits-even-in-your-car-by-nick-strauss-klein/),
and [Focus on Knees and Ankles II](https://feldenkraisresources.com/products/knees-and-ankles-2).
Muscle-function categories were checked against OpenStax
[upper limbs](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs)
and [lower limbs](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs).

`src/movement-pose.mjs` is shared by playback and regression tests. Clips with
`planted_sagittal_feet` cancel inherited ankle pitch and correct root translation
at each interpolated time, using the scaled reference ankle as the anchor.
This fixes the foot drift left between the previously corrected chair-pose and
standing-fold keyframes. Ankle explorations and raised feet retain their authored
rotation. Tests sample both planted clips at 101 times and three statures, check
seated forward toe direction, and interpolate all 43 clips. The private browser
suite loads and visibly animates every addition on desktop and phone.
