# Test plan

The tests protect the claims and boundaries in `objectives.md` and `spec.md`,
not only whether a 3D scene renders. A visually impressive demo fails if its
layers drift, its instruction is flattened, its sources are untraceable, its
internal anatomy is presented as personalized, or its private assets are
publicly reachable.

## 1. Test layers

### 1.1 Static contract tests

Run on every movement and asset before a browser build:

- validate the movement JSON Schema and the tradition-specific instruction
  shape;
- resolve every anatomy, phase, source, and licence reference;
- require `provisional:` on first-version movement rights bases;
- require cautions, authorship, and a review state;
- reject force, load, activation-percentage, grading, and diagnosis fields;
- verify that CC BY-SA geometry is confined to its declared asset directory;
  and
- fail when a removed source or asset leaves a dangling reference.

### 1.2 Geometry and animation tests

For every movement, sample the start, midpoint, end, and each declared
joint-angle extremum. Transform the named muscle attachment landmarks through
the shared rig and compare them with their bone landmarks. The reference model
passes at no more than 8 mm separation; the allowed distance scales with the
stature control. Run the same samples after each supported body-control extreme.

Also assert that switching layers, isolating a joint, and pinning a layer leave
the camera transform, animation time, and skeleton pose unchanged.

### 1.3 Browser interaction and accessibility tests

Exercise an ordinary desktop and phone viewport with pointer, keyboard, and
touch. Cover orbit, zoom, play/pause, replay, scrubbing, frame stepping, every
layer state, joint isolation, layer pinning, cautions, sources, review status,
and flag export. Check labelled controls, focus order, visible focus, reduced
motion, color contrast, and a useful non-WebGL fallback.

No browser test may fetch a source lesson, anatomical viewer, or other live
third-party content. The built demo uses only packaged, ledgered assets.

### 1.4 Human claim review

Automation cannot decide whether an anatomical claim is correct or whether a
movement preserves its tradition. Use two explicit reviews:

- an anatomy reviewer checks joint actions, named muscles, group labels,
  shorten/lengthen/stabilise annotations, registration landmarks, and cautions;
- one practitioner familiar with each tradition checks the movement path,
  timing, non-geometric instruction, variations, and wording.

The allowed outcomes are `reviewed` and `disputed`. A disagreement is recorded;
it is never converted to a silent pass.

### 1.5 Deployment and privacy tests

Against the real validation URL, verify that an uninvited signed-out request
cannot retrieve the HTML or packaged assets, invited access works, `noindex` is
present, and no public Siteprep page links to the demo. Inspect browser storage
and network traffic to confirm that review reports and identity are not stored
or sent until the reviewer deliberately uses the chosen handoff.

## 2. Fixtures

Keep the smallest set that proves the model rather than a large mock catalogue:

- one Feldenkrais record with optional range, attention cues, and rest pauses;
- one yoga record with entry/exit transitions, a modification, and a prop;
- one Alexander record with an everyday activity, directions, inhibition, and
  the manual-guidance boundary;
- one intentionally malformed record for each forbidden flattening or missing
  source condition;
- one shoulder-and-spine rig with named bone and muscle landmarks;
- one deliberately drifting attachment fixture; and
- one static review report whose claim path points to a known movement field.

Fixtures use invented wording and local assets. They do not reproduce lesson
text, recordings, commercial anatomy, or reviewer personal data.

## 3. Phase exit tests

### Phase 0 — Asset and rights path

- The asset ledger records the exact licence variant, source, attribution,
  modification history, hosted-private permission, and public-use status.
- A build fails when any asset lacks a ledger entry or crosses its declared
  licence directory.
- The narrow shoulder-and-spine model renders on the shared rig.
- Start, midpoint, end, and extrema samples meet the 8 mm reference tolerance.
- The anatomy reviewer can accept or dispute every individually named muscle
  and every group label.

### Phase 1 — Movement contract

- All three tradition fixtures validate.
- Removing `instruction`, substituting another tradition’s shape, omitting a
  source, or adding an activation percentage fails.
- Deleting one movement or one source produces either a valid smaller build or
  a specific dangling-reference error; it never corrupts another record.

### Phase 2 — One vertical slice

- Orbit, zoom, playback, scrub, frame step, replay, all five layer states,
  isolate, and pin work without changing pose or time unexpectedly.
- Cautions appear before first playback.
- The fitted-reference label is present whenever anatomy is visible.
- Muscle assets load on first request with a visible state; initial load does
  not download them eagerly.
- Desktop and phone viewports complete the core path, and the no-WebGL fallback
  explains what is unavailable.

### Phase 3 — Three traditions

- Each practitioner can distinguish the entry’s tradition without relying on
  its label alone.
- Removing the non-geometric instruction makes the entry demonstrably
  incomplete in review.
- Every anatomical and movement claim is sourced and has `unreviewed`,
  `reviewed`, or `disputed` status.
- No record contains copied lesson wording or an unrecorded rights basis.

### Phase 4 — Visual-twin controls

- Stature, build/mass, torso-to-limb proportion, and presentation change only
  the dimensions the interface names.
- Every control change states what changed and that internal anatomy did not.
- Registration passes at minimum and maximum supported stature and proportion.
- No control changes muscle behaviour, mobility, or a correctness score.
- Presentation labels never use sex or gender as a proxy for internal anatomy.

### Phase 5 — Corrective review

- A flag for anatomy, movement, attribution, and safety exports the right
  movement id and claim path.
- Creating, downloading, copying, or handing off a report does not modify the
  source movement fixture.
- Reviewer-supplied identity is optional and is not retained in local storage.
- A maintainer can apply a correction or mark a claim `disputed` while keeping
  the original report as separate evidence.

### Phase 6 — Private validation

- Signed-out and uninvited requests cannot retrieve the page or assets.
- An invited first-time reviewer completes the core path on phone and desktop.
- One anatomy reviewer and three tradition reviewers complete the review script.
- Loading, fallback, disputed claims, removals, and unresolved licence facts are
  recorded in the validation result.
- The repository’s public output contains no link or copied asset from the
  private demo.

## 4. Decision-drift tests

These checks exist because a later convenience refactor could quietly change
the product:

| Contract | Regression caught |
|---|---|
| One hierarchy and one animation clock | Layers become separate scenes that drift or reset |
| Muscle behaviour is a named annotation | A gradient or percentage implies measured activation |
| Instruction schema follows tradition | All entries collapse into generic timed captions |
| Review flags produce separate reports | A flag silently edits the source record |
| Anatomy remains a fitted reference | Surface controls are described as internal personalization |
| No grading | A reference path becomes a score or “correct” body |
| Rights are per asset and movement | Downloadability is treated as permission to host or republish |
| The first site is access-controlled | An unlisted but public URL is mistaken for private validation |
| Safety precedes playback | Cautions become footer copy after the movement has started |

## 5. What is not tested, and why

- **Medical efficacy or individual safety.** The demo makes neither claim; a
  browser test cannot establish either.
- **Subject-specific anatomy or biomechanics.** The first version explicitly
  uses a fitted reference model.
- **The final public-republication or trademark basis.** That requires the
  separate successor legal review, not an engineering assertion.
- **Exhaustiveness of the traditions.** The authorized collection has exactly
  60 Feldenkrais, 60 yoga, and 20 Alexander studies; it is not an exhaustive
  taxonomy or a claim that each tradition has a fixed number of movements.
- **Exact rendering parity across GPUs.** Functional fallbacks, registration,
  legibility, and interaction are tested; vendor pixel identity is not.
- **A backend report service.** The first version deliberately uses local
  export and an explicit handoff.


## 6. September 6 compact collection acceptance

- Exactly 140 unique record IDs and animation clips, split 60/60/20; no variants
  counted as independent entries. Navigation metadata covers every record.
- English/Sanskrit search, diacritics, combined filters, empty-state reset,
  current-selection feedback, keyboard navigation and Escape work.
- The closed collection card remains below 200 px on tested desktop/phone
  sizes. Opening the popup does not move neighboring controls or overflow the
  viewport. Closed variations use no additional space.
- Smaller range changes the rendered movement; mirroring reflects landmarks
  and left/right readout while canonical reports still flag original claims.
- Every clip produces finite, distinct motion including terminal-head rotation.
  All 140 render and animate on both desktop and phone; pauses and rests match
  the new records' timed phases.
- User authorization removes review as a prerequisite for this expansion;
  automated success does not change any source claim to `reviewed`.
