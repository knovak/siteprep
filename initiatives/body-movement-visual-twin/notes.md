# Notes

Optional ideas for possible future work. These notes are not active todo items
or instructions for the sweep to begin implementation.

## Future option: more realistic anatomical imagery

The user suggested the following sources and asked to retain the findings for
possible future action only. No implementation is requested at this time.

- [AnatomyTOOL Open3DModel](https://anatomytool.org/open3dmodel)
- [Z-Anatomy](https://www.z-anatomy.com/)

The viewer currently draws project-authored, simplified bone geometry and
muscle surfaces. The Phase 0 Open3DModel manifest selects source archives for
later use, but their actual meshes have not been imported. Using anatomical
meshes could substantially improve shape, depth, surface detail, and the
relationships between visible structures.

### Source assessment

Open3DModel is the suggested starting point. It builds on Z-Anatomy, with
further anatomical review and modelling work. Its team describes smoother bone
surfaces, corrected muscle attachments, added cartilage, and more natural
muscle and tendon textures. See the
[description of changes](https://anatomytool.org/open3dmodel-about).
The [source downloads](https://anatomytool.org/open3dmodel-create) include
Blender files and browser-ready GLB models for the skeleton, upper limb, and
lower limb.

Z-Anatomy provides the broader editable Blender atlas underlying that work.
It could help with additional structures and anatomical relationships; see its
[model repository](https://github.com/Z-Anatomy/Models-of-human-anatomy).
The two sources share a lineage and should not be treated as independent
anatomical validation.

### Possible first experiment, if revisited

Compare one shoulder-and-arm movement with the current viewer, using detailed
shoulder-blade, collarbone, upper-arm, and surrounding muscle models. This would
test the visual gain and behaviour during motion before expanding to the body.

The work would include selecting and simplifying the meshes, adding a 3D
renderer with lighting and correct overlap, and connecting the anatomy to the
movement controls. Existing movement records could provide the starting
animation, but joint pivots and muscle deformation would need adaptation.
Bones must move coherently, and muscles must remain attached as their shapes
change. Check paused views and the full movement from multiple angles, along
with browser performance and anatomical review.

Detailed shapes alone do not establish realistic shoulder mechanics, muscle
bulging, tendon behaviour, or muscle activity. Those remain separate animation
and validation tasks; activity highlights would still be estimates.

Before importing assets, recheck the exact downloads and record their source,
licence, attribution, and modifications in the rights ledger. The projects
describe attribution and share-alike requirements, while some supplied textures
and incorporated assets have additional noncommercial terms. Consult the
[Open3DModel source notes](https://anatomytool.org/open3dmodel-create) and
[Z-Anatomy attributions](https://github.com/Z-Anatomy/Models-of-human-anatomy#attributions)
for the selected assets.
