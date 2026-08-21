# Plan

This plan turns `spec.md` into a private validation demo in increments that
retire the largest risks before the interface grows around them. The first
useful result is three movements — one Feldenkrais, one yoga, and one Alexander
Technique example — on one shared body, with the shoulder girdle and spine as
the full-fidelity anatomical region. Six movements remain an expansion only
after the three-entry review loop works.

## 1. What decides the order

The work is ordered around four questions:

1. **May the chosen assets be used in an access-controlled hosted demo?** An
   attractive model with the wrong licence is not a prototype; it is a dead
   end.
2. **Can the shoulder-and-spine layers stay registered on one rig?** This is
   the technical premise of the layer control and should be proved with one
   movement before a collection is authored.
3. **Can one record preserve geometry, tradition-specific instruction,
   sources, review state, and safety without flattening them?** The data
   contract comes before a catalogue or polished page.
4. **Can an invited reviewer understand and correct the result on an ordinary
   browser?** Private deployment and practitioner review are the exit, not an
   afterthought.

Each phase leaves a testable artifact. A phase may narrow the asset or movement
set, but it may not relax the claim boundaries in `spec.md` merely to keep a
schedule.

## 2. Constraints that hold through every phase

- The validation site is private, invitation-only, and `noindex`; it is never
  linked from the public repository site.
- The page never claims diagnosis, treatment, individualized instruction,
  measured force, load, activation, or subject-specific internal anatomy.
- Surface, skeleton, and muscle layers share one hierarchy, pose, clock, and
  camera. A layer change is visibility, not a model swap.
- Movement descriptions are newly authored records, not copied lesson text or
  recordings. Each record owns its own source and provisional rights basis.
- Anatomy assets, movement records, and application code have separate licence
  manifests. Modified CC BY-SA geometry stays under
  `assets/anatomy/share-alike/` with its source, licence, and modification log;
  the application does not silently absorb that obligation.
- A review flag creates a separate report. It never edits a movement record.
- Accessibility and phone/desktop fallback are part of each vertical slice,
  not a final remediation phase.

## 3. Phases

### Phase 0 — Prove the asset and rights path

Keep the shoulder-girdle-and-spine choice from `spec.md`. The open lower-limb
geometry is richer, but moving regions would avoid rather than test the first
version’s intended movements. Build a narrow shoulder-and-spine slice by
authoring display geometry against public-domain Visible Human image data and
open anatomical references; do not redistribute source imagery or imply that
the resulting paths are measurements of one subject.

Before geometry enters the demo:

- record the exact SMPL/SKEL or SMPL-Body asset variant, licence text, account
  or agreement date, permitted hosted-private use, attribution, and public-use
  status in an asset ledger;
- stop if no recorded variant permits the access-controlled demo — do not
  substitute an asset merely because it can be downloaded;
- make a reference body with surface, skeleton, and a deliberately small deep
  set: the three parts of trapezius, serratus anterior, the rhomboids as a
  labelled group, the three deltoid portions, erector spinae as a labelled
  group, and multifidus as a labelled group;
- define attachment landmarks on the clavicle, scapula, humerus, and sampled
  thoracic and lumbar vertebrae; and
- prove one slow shoulder-and-spine motion at start, midpoint, end, and every
  joint-angle extremum. A landmark must remain within 8 mm at reference stature,
  scaled proportionally with stature. A miss fails the slice rather than being
  hidden by the surface.

**Exit:** the rights ledger permits private hosting, the files are separated by
licence, one animation stays registered, and the narrow muscle-set names have
an anatomical reviewer status. If any of those fail, revise the asset path
before viewer work begins.

### Phase 1 — Lock the movement contract and validator

Implement the per-movement record from `spec.md` as JSON Schema plus a small
fixture for each tradition. Validate:

- tradition-specific instruction shapes and shared timing anchors;
- phases, joint actions, muscle behaviour annotations, variations, and safety;
- per-record source, provisional rights basis, authorship, and review status;
- named anatomy references against the asset manifest; and
- the absence of force, load, activation percentages, or grading fields.

Keep geometry paths in the asset manifest rather than in sources or prose, so
removing one movement removes one record and removing one anatomy source does
not corrupt the rest of the collection.

**Exit:** all three fixtures validate; deliberately flattened, unsourced, or
over-claiming fixtures fail with useful messages.

### Phase 2 — Build one complete vertical slice

Render the reference body and the Phase 0 movement in a static browser page.
Add orbit, zoom, play/pause, replay, scrubbing, frame stepping, the five ordered
layer states, joint isolation, and layer pinning. Preserve camera, pose, and
time through every layer operation. Stream the muscle layer only when first
requested and provide a useful loading state and a non-WebGL explanation.

The page shows cautions before playback, the standing educational-use boundary,
the fitted-reference label whenever anatomy is visible, and the movement’s
source and review status. Controls have pointer, keyboard, and touch paths.

**Exit:** one movement is understandable from arbitrary angles on phone and
desktop, and the automated registration check runs against its packaged assets.

### Phase 3 — Author one movement per tradition

Add the three-entry validation collection. Use hand-authored keyframes and
newly written descriptions:

- Feldenkrais preserves exploration, timed attention, optional smaller range,
  and rest pauses;
- yoga preserves entry, posture, exit, modifications, and props; and
- Alexander preserves the everyday activity, directions, inhibition, and the
  note that manual guidance is not reproduced.

Each entry gets a provisional rights basis, explicit cautions, named claim
sources, and an initial `unreviewed` state. Have a practitioner familiar with
each tradition review the entry before it can be marked `reviewed`; uncertainty
may remain explicitly `disputed`.

**Exit:** deleting every non-geometric instruction makes each entry visibly
incomplete, and a practitioner for each tradition says it is not merely a pose
wearing that tradition’s name.

### Phase 4 — Add honest visual-twin controls

Add stature, build/mass, torso-to-limb proportion, and presentation controls.
Every change says which visible dimensions changed and that muscle paths and
internal anatomy did not. Scale the skeleton and registration tolerance with
stature, but do not infer mobility, muscle behavior, or biomechanics from any
surface control. A reference path may be displayed but never scored or colored
as correct.

**Exit:** the named visible dimensions change, the anatomy disclaimer persists,
layer registration still passes, and no presentation option selects a claimed
internal anatomical truth.

### Phase 5 — Make review corrective without making it destructive

Add a flag control to every joint action, muscle annotation, attribution, and
safety claim. Because the site is static, construct the report locally as JSON
and offer download, copy, and an optional pre-addressed email handoff. The page
does not store reviewer identity or reports in browser persistence. The report
contains movement id, claim path, reviewer-supplied identifier, date, kind,
severity, and note; the movement record remains byte-for-byte unchanged.

Document the human triage step that edits a source record and assigns
`reviewed` or `disputed`. Test correction, dispute, and asset/source removal
before inviting reviewers.

**Exit:** a reviewer can report a problem and a maintainer can trace the report
to one claim without the application silently rewriting its evidence.

### Phase 6 — Deploy privately and run validation

Deploy the static bundle behind real invited-access control with `noindex` and
no public navigation. Verify the access gate in a signed-out browser, then run
the complete review script on an ordinary phone and desktop. Record load and
interaction timings, browser fallbacks, practitioner findings, disputed claims,
and any assets removed because their licence or attribution could not be
confirmed.

**Exit:** invited reviewers can use and correct all three movements, the access
boundary holds, and the objectives’ private-validation evidence is recorded.
Public release remains a separate successor decision and legal review.

## 4. What each phase leaves behind

| Phase | Durable result |
|---|---|
| 0 | Rights ledger, separated asset directories, reference rig, narrow anatomy slice, registration fixture |
| 1 | Movement schema, validator, and one fixture per tradition |
| 2 | Accessible one-movement browser vertical slice |
| 3 | Three reviewed or explicitly disputed movement records |
| 4 | Honest surface-personalization controls |
| 5 | Static report export and documented human triage path |
| 6 | Private deployment and validation record |

## 5. What this plan does not decide

- Whether a successor should become public. That remains the user’s decision,
  followed by the separate rights and trademark review already recorded in
  `decisions.md`.
- Whether the collection should expand from three movements to six. The first
  review evidence should decide whether another entry teaches more than it
  costs to source and review.
- Whether subject-specific clinical data should ever replace the fitted
  reference anatomy. That would be a different product and claim surface.
- Which private host or report inbox to use. The implementation may choose
  among available access-controlled options without weakening the contract.

## 6. Principal risks

- **No usable private-hosting licence:** stop Phase 0 and replace the body
  asset path; do not hide the problem in a deployment note.
- **Shoulder muscle geometry is not credible at the chosen depth:** reduce the
  individually named set or mark groups honestly; do not fill gaps with
  decorative anatomy.
- **Registration survives one pose but not motion or scaling:** add landmarks
  and corrective shapes before adding entries.
- **A tradition’s instruction becomes generic prose:** fail schema validation
  and practitioner review rather than accepting a visually complete entry.
- **The static report handoff discourages reviewers:** simplify copy/download
  and email handoff before considering a backend.
- **Phone load is too large:** reduce geometry and textures within the chosen
  region before dropping controls or shipping an unusable fallback.
