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
