# Objectives

The first useful version is a private, explorable 3D explanation of small
movements for validation with invited reviewers. It is not a pose catalog with
anatomy painted on top: it should show what moves beneath the surface while
preserving the different teaching intent of Feldenkrais, yoga, and the
Alexander Technique. A later version can become public only after a separate
rights and trademark review.

## Outcomes

1. **A movement can be understood from any angle.** The user can orbit, zoom,
   pause, scrub, and replay a 3D body throughout a small movement or posture.
   The view makes the starting position, path, and return legible rather than
   presenting only an endpoint.

2. **Anatomical layers can be dialled in and out without changing the
   movement.** A continuous or stepped control moves from the outer body to
   muscles and then bones, with useful combinations such as skin plus skeleton
   or isolated muscles around one joint. Layer changes preserve the camera,
   pose, and point in the animation so the structures can be compared directly.

3. **Bones, joints, and muscles explain rather than decorate.** A movement
   identifies the principal joint actions and the muscles that shorten,
   lengthen, or stabilise, while avoiding claims the model cannot support about
   exact force, load, pain, or an individual person's internal anatomy.
   Anatomical names and movement claims have sources and a review status.

4. **The three movement traditions remain recognisably different.** Yoga can
   describe a posture, transition, and modification; Feldenkrais can preserve
   slow exploration, attention, and optional range; Alexander Technique
   suggestions can preserve direction, inhibition, and an everyday activity.
   Reducing all three to joint coordinates would not meet this objective.

5. **The movement collection is attributable and correctable before it is
   public.** Every entry records its tradition, source, provisional rights
   basis, authoring or review date, intended context, and any modification or
   contraindication. The private demo limits access to invited validation; a
   reviewer can report an anatomical, movement, or attribution problem without
   changing the source record silently. A successor version must complete its
   rights and trademark review before any collection becomes public.

6. **The “visual twin” is useful and honest about what is personalised.** A
   user can adjust literal body properties such as stature, mass or build,
   proportions, and the available surface/anatomy presentation. The page names
   which visible dimensions change. It does not imply that weight, sex or gender
   predicts a person's bone geometry, muscle paths, mobility, or biomechanics,
   and it labels the internal anatomy as a fitted reference model unless it was
   built from subject-specific clinical data.

7. **Variations do not pretend there is one correct body.** A movement may
   offer smaller ranges, alternate supports, sides, or seated and standing
   forms. The model can show a reference path without grading a user against it
   or treating the surface avatar as a normative body.

8. **Safety boundaries travel with the movement.** The page distinguishes an
   educational visualization from diagnosis, treatment, or individualized
   instruction; shows relevant cautions before a movement begins; and tells a
   user when the source practice expects a qualified teacher or clinician.
   “Move gently” is not used as a substitute for a known contraindication.

9. **It is a private browser-based demo, not a workstation demo.** An invited
   first-time reviewer can open an example without special hardware, use the
   core camera and layer controls with pointer, keyboard, or touch, and
   understand what the controls reveal. Access control keeps the validation
   demo private, while loading and fallback states remain usable on an ordinary
   phone and desktop browser.

## Explicitly not the first version

- A medically personalized musculoskeletal model derived from scans, motion
  capture, or force measurements.
- Live camera tracking, comparison of the user's movement with the reference,
  automatic correction, scoring, or clinical assessment.
- A comprehensive archive of any tradition, or republication of protected
  lesson recordings and descriptions merely because they can be found online.
- Claims that a visualization treats a condition or that a movement is safe or
  effective for everyone.
- Virtual-reality hardware, multi-person movement, or realistic cloth and hair.

These are not denials of the long-term wish. They keep the first version focused
on the combination the background research did not find elsewhere: a
cross-tradition movement library with an explorable layered anatomy and an
explicitly approximate visual twin, first validated privately and only then
prepared for rights-cleared public release.

## How we will know

- At least one small example from each tradition can be played, scrubbed, and
  viewed from front, side, back, and a freely chosen angle without the layers
  drifting out of registration.
- A reviewer can identify the principal joint actions and relevant muscle
  behaviour in each example from the visualization and its source record, and
  can flag uncertainty rather than forcing a binary “accurate” label.
- Each example includes the non-geometric instruction its tradition needs — for
  example attention or optional range — and a practitioner familiar with that
  tradition says the entry is not merely a posture wearing the wrong name.
- Changing body controls visibly changes only the dimensions the interface
  names, while the page continues to label internal anatomy as a reference
  model.
- Every movement and anatomical asset in the private demo has a recorded
  provisional rights basis and attribution, and removing one source does not
  break the movement data model.
- A phone and desktop browser can load one movement, manipulate the camera and
  layers, pause or scrub the animation, and reach the safety and source notes.

## Questions for the spec

`spec.md` must compare the anatomy/animation asset paths, the representation of
a movement and its non-geometric instructions, the first useful personalization
controls, and the review workflow for anatomical claims. It must also draw a
hard boundary between assets that are technically accessible in a private
validation demo and assets or lesson content a later public site has a right to
republish.

The final rights and trademark review is not an engineering judgement. It is a
successor-version step and stays as a separate legal blocker before the private
demo can become a public collection, even if the first build uses only
apparently open material.
