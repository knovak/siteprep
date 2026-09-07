# Log

## 2026-08-19 — Draft objectives.md - what "done" would mean

Drafted nine objectives for explorable layered anatomy, cross-tradition movement meaning, honest personalization, rights-aware source records, safety boundaries, and a public browser experience; kept publication rights as a legal blocker.

## 2026-08-19 — Respond to review: validate privately before public release

Reframed the first browser release as a private demo for invited validation. Public release now belongs to a successor version and remains blocked on a separate rights and trademark review.

## 2026-08-19 — Draft spec.md, including anatomy assets, movement representation, personalization, and review alternatives

Specified a private, invitation-only browser demo built on open anatomy sources, with hand-authored keyframe animation, a registration-tested layer control, tradition-shaped non-geometric instruction, surface-only personalization over a labelled reference anatomy, a flag-and-triage review workflow that never edits the source record, and a hard line between assets accessible privately and assets republishable publicly. Compared the anatomy asset, animation, and instruction-representation alternatives.

## 2026-08-19 — Before a successor public release, confirm the rights and trademark basis for the movement collection and anatomy assets

Recorded that rights, licensing, attribution, and trademark review applies only if a public successor release is prepared; private validation is not gated by it.

## 2026-08-20 — Draft plan.md and test-plan.md from the specification

Drafted a phased build plan and claim-focused test plan; kept the shoulder-and-spine region, reduced initial validation to three movements, and seeded the asset-rights feasibility and movement-contract phases.

## 2026-08-21 — Phase 0 - confirm private-demo asset licences and prove the shoulder-and-spine asset path

Excluded SKEL and SMPL-Model from hosted use under their current third-party restrictions; selected Open3DModel CC BY-SA and Visible Human reference sources, added a separated rights ledger and shared-rig preview, and passed 100 registration samples at 1.658 mm maximum against the 8 mm limit.

## 2026-08-21 — Phase 1 - lock the movement schema, validator, and one fixture per tradition

Locked the movement record as JSON Schema, added a dependency-free validator for tradition, timing, anatomy, provenance, rights and over-claiming boundaries, and committed one passing fixture per tradition with explicit negative tests.

## 2026-08-21 — Phase 2 - build one complete vertical slice

Built and verified the private one-movement browser slice with stable layer state, lazy muscle loading, safety and review context, separate flag export, phone and desktop interaction, no-WebGL fallback, and packaged registration checks.

## 2026-08-21 — Phase 3 - author one movement per tradition

Built the selectable three-tradition validation collection with distinct hand-authored clips, tradition-specific instruction, named claim sources, caution re-gating, and practitioner-review status.

## 2026-08-21 — Phase 4 - add honest visual-twin controls

Added stature, surface build, visible proportion, and presentation controls that name their visible effects, preserve the fitted-reference boundary, and scale anatomy registration only with stature.

## 2026-08-21 — Phase 5 - make review corrective without making it destructive

Added exact-claim review reports, local copy/download handoff, and a documented human correction, dispute, and removal path without editing or retaining the source record.

## 2026-08-22 — Phase 6 - deploy privately and run validation

Published an owner-only noindex validation site; desktop and phone technical checks pass, and human reviewer findings remain as an explicit data-blocked follow-up.

## 2026-08-22 — Refocus the validation site on realistic anatomy in motion

Replaced the shoulder-and-spine debug figure with a 27-node full-body fitted reference and 40 paired superficial and deep muscle paths; added six anatomical renderings with a coherent surface silhouette, shaped muscle bellies, tendons, paired long bones, joints, skull, pelvis, and rib landmarks. Reordered the page so Anatomical view precedes the playback boundary, timeline, Visual Twin controls, and every flaggable claim. Added five yoga and five Feldenkrais anatomical movement studies for a 13-record collection while keeping all geometry and movement claims explicitly unreviewed.

## 2026-08-22 — Tighten playback, camera, and viewport behavior

Moved the playback acknowledgement into the Educational visualization block above the animation and made one acknowledgement apply across movement changes for the page session. Renamed the timeline to Movement, constrained the animation to one browser-viewport height, repaired the camera presets so their buttons are not intercepted by orbit dragging, added distinct side and back rendering cues, and fixed each clip to one projection frame so yoga playback no longer pulses in and out.

## 2026-09-05 — Revise vertebrae, ribs, and muscle illustration detail from KRN feedback

Recorded KRN feedback relayed by the user, replaced the schematic spine and rib outlines with a complete authored axial display, and added shaped muscle surfaces, directional fibres, and tendon shading. Broader anatomy and tradition-practitioner validation remains open.

## 2026-09-05 — Deploy the KRN anatomy revision to test

At the user's request, replaced the existing private validation Site with version 4 from source commit `2f3051bf774bf57be18ee7acb074071659f6fcf2`. Verified the updated viewer and anatomy module live, preserved owner-only access, and recorded the deployment receipt in the Phase 6 validation record. The initiative remains on test, never released; PR #427 remains ready for review and unmerged.


## 2026-09-05 — Complete axial-motion audit and correct foot direction

The user requested an explicit count through the occiput/skull, rib and
collarbone movement, connected muscles, and correction of apparently backward
feet in a supplied side-view screenshot. Audited the current source: 24 mobile
vertebrae plus five fused sacral and four coccygeal segments and 12 rib pairs
were present; the head was a flat oval, the collarbones were generic rig links,
several connecting muscles were absent, and seated hip/knee signs faced the
knees away from the toes.

Corrected the pose generator and regenerated the collection; added posed skull
and occipital detail, curved moving clavicles and connected neck, intercostal,
clavicular and segmental muscle patches. Rebuilt the private static bundle from
its sources. Added per-structure motion, skull-pivot, fused-sacrum, foot-direction,
shoulder-response, muscle-attachment and scaling regressions. The audit is in
`work/phase-3/ANATOMY-AUDIT.md`. This is a software/display correction; the existing
anatomy/practitioner evidence item and unreviewed records remain open.

## 2026-09-05 — Release

Released to production — ChatGPT Site, version 1, `021648c`. <https://body-movement-visual-twin.ken-novak.chatgpt.site/> See releases.md.


## 2026-09-06 — Foot playback and thirty additional movements

- Responded to the user's foot-direction screenshot and request for fifteen more
  Feldenkrais movements and fifteen more yoga movements.
- Preserved the seated-direction correction from main and corrected interpolated
  foot placement in chair pose and standing forward fold, including stature changes.
- Added thirty original sourced studies, expanding the collection to 43 entries.
  Anatomy and tradition sign-off remain unreviewed; no teacher lesson is copied.
- Regenerated the complete private bundle and extended geometry and desktop/phone
  browser checks to the new movements and between-keyframe foot placement.

## 2026-09-06 — Release

Released to production — ChatGPT Site, version 2, `d2c85a3`. 1 commit(s) since the previous release. <https://body-movement-visual-twin.ken-novak.chatgpt.site/> See releases.md.

## 2026-09-06 — Release

Released to production — ChatGPT Site, version 2, `d2c85a3`. <https://body-movement-visual-twin.ken-novak.chatgpt.site/> See releases.md.

## 2026-09-07 — Implement the approved compact selector and 60 Feldenkrais, 60 yoga, 20 Alexander studies

Implemented the approved compact picker and exactly 60 Feldenkrais, 60 yoga, 20 Alexander studies without waiting for practitioner review. Added real smaller-range and mirrored displays, sources and timed context; 44 data/geometry tests, 28 collection browser checks, six private-bundle checks and four targeted framing checks passed. All 140 studies animate on desktop and phone; records remain unreviewed.
