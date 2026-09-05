# Axial anatomy and foot-direction audit

Requested 2026-09-05: count the vertebrae through the occiput and skull, check
ribs and collarbones and their movement, check the connecting muscles, and
investigate the feet facing away from the knees in the supplied screenshot.

## Inventory

| Structure | Model count | Result |
| --- | ---: | --- |
| Cervical vertebrae | 7: C1-C7 | All present and moving; C1 atlas ring and C2 dens distinguished. |
| Thoracic vertebrae | 12: T1-T12 | All present and moving, each with a rib pair. |
| Lumbar vertebrae | 5: L1-L5 | All present and moving. |
| Sacral segments | 5: S1-S5 | Represented as one moving, fused sacrum. |
| Coccygeal segments | 4: Co1-Co4 | Typical four-segment depiction moving with the pelvis. |
| Skull and occiput | 1 skull, 2 occipital condyles | Added explicit posed geometry and a head pivot at the atlas-occiput joint. |
| Ribs | 24: 12 per side | All present and moving; 1-7 direct cartilage, 8-10 costal arch, 11-12 floating ends. |
| Clavicles | 2 | Replaced generic rig links with curved sternum-to-shoulder geometry and shoulder-responsive binding. |

The vertebral total is **33 represented segments: 24 mobile vertebrae plus nine
fused segments**. Occiput is part of the skull, not an additional vertebra.
Coccygeal count varies between people; this reference uses four.

## Muscle coverage

The existing 40 named movement-claim groups remain. The display now has 180
surface patches, including subdivisions and contextual muscles. This is not a
claim of 180 distinct anatomical muscles or a complete muscle atlas.

- Skull/neck: paired sternal and clavicular sternocleidomastoid heads,
  splenius capitis, semispinalis capitis, rectus capitis posterior major/minor,
  obliquus capitis superior/inferior, and anterior/middle/posterior scalenes.
- Spine: existing erector spinae and multifidus surfaces, plus paired segmental
  intertransversarii patches between consecutive levels C1-L5.
- Ribs: 11 external-intercostal patches per side, scalenes at ribs 1/2,
  pectoralis minor, and existing serratus, oblique and back surfaces.
- Collarbone/shoulder: subclavius, the clavicular sternocleidomastoid head,
  levator scapulae and the existing trapezius, pectoralis and deltoid surfaces.

New attachment records name the bones they connect. Intercostal attachments are
tested against the actual posed rib points; subclavius and sternocleidomastoid
clavicular ends are tested against the posed clavicle. Skull insertions share
the bone's occipital-pivot transform. Every new attached patch must move during
at least one clip, and its landmarks must scale with stature.

## Foot correction and verification

The screenshot exposed a sagittal sign error: the seated thigh rotated toward
posterior -Z while the foot extended toward anterior +Z. Corrected hip/knee signs
across the seated collection, including standing-transition and weight-shift
overrides. The feet and knees now face forward together. Chair and fold
keyframes also keep the ankle and toe reference positions; the fold bends the
pelvis over the legs.

Regression checks cover all 13 clips and every authored keyframe. They count
each named level and bilateral structure, require movement within a clip rather
than merely comparing against the reference T-pose, check fixed sacral spacing,
verify skull motion about its occipital pivot with C1 stationary during an
isolated head nod, and test forward knees/toes in the pelvis coordinate frame.
Desktop and phone browser checks exercise playback, layer/camera changes,
isolation, accessibility and the generated private bundle.

## Scope of the model

The 27-control reference rig distributes motion over the illustrated bones;
it does not provide 24 independently controlled vertebral joints. The ribs
follow trunk motion; there is no separately authored breathing cycle. Sacrum
and coccyx move with the pelvis. Clavicle/shoulder skinning and interpolated foot
contact are illustrative rather than joint/contact simulations. All movement
and anatomy claims retain their existing unreviewed status.

The reference facts and links are recorded in [README.md](README.md). The
supplied screenshot was used diagnostically and is not bundled in the Site.
