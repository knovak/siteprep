# Body Movement: status and next steps

Status as of 2026-09-06. The initiative is **building**. The compact selector
and expanded collection now contain **60 Feldenkrais, 60 yoga, and 20 Alexander
Technique studies**. The user authorized this expansion without waiting for
practitioner review; each record retains its actual review status.

The compact selector and all 140 studies are live in **private production
version 3**, released September 6 at 18:36 PDT (September 7 at 01:36 UTC).
Production remains owner-only. The test Site remains on its earlier version 5;
`initiative.json` records the source commit and version for each environment.

- **Production:** [Body Movement Visual Twin](https://body-movement-visual-twin.ken-novak.chatgpt.site/).
- **Test:** [Private validation Site](https://body-movement-visual-twin-validation.ken-novak.chatgpt.site/).

Further anatomy and practitioner findings can be incorporated when available.
They are not a prerequisite for the authorized collection expansion. A public
release remains a separate decision.

## What is already done

| Area | Current result |
| --- | --- |
| Movement library | 140 authored studies: 60 Feldenkrais, 60 yoga, 20 Alexander Technique. Searchable names/aliases, tradition/body-region filters, grouped results, and compact range/side controls. |
| Interactive viewer | Playback, pause, replay, scrubbing, frame stepping, orbit/zoom, front/side/back views, six anatomy views, joint isolation and layer pinning. |
| Skeleton | 7 cervical, 12 thoracic and 5 lumbar vertebrae; five fused sacral and four coccygeal segments; skull/occiput, all 12 rib pairs, and both clavicles. |
| Muscle illustration | 40 named movement-claim groups represented with 180 surface patches, including contextual neck, rib, spinal and collarbone connections. Patch count is not a count of distinct muscles. |
| Latest corrections | Forward-facing seated knees and feet; moving skull about the occiput; shoulder-responsive clavicles; added connecting muscles and attachment checks. |
| Body controls | Stature and surface build/proportion/presentation controls, with reference-anatomy boundaries retained. |
| Review tools | Claim-specific flags, JSON download/copy, and a documented correction/dispute process. Reports do not silently edit the source. |
| Technical verification | Schema and registration checks cover all 140 records. Desktop/phone checks exercise the picker, variants, source reports and every animation; see the Phase 3 and Phase 6 verification instructions. |

## When practitioner review resumes

The expansion proceeds under your September 6 authorization. For future
practitioner findings, the remaining context is:

1. **Identify reviewers covering four roles:** anatomy, Feldenkrais, yoga and
   Alexander Technique. Supply a name or code, the role they cover, and an
   invitation email address. If KRN covers one of those roles, identify that
   role; the recorded display feedback alone does not establish qualifications
   or acceptance.
2. **Choose the feedback destination:** an inbox or shared folder for the
   exported JSON reports, outside the source repository. The current Site
   does not collect reports centrally. An email handoff can be configured after
   an inbox is chosen.
3. **Authorize the invitations when ready.** Production is currently
   owner-only; publishing it did not invite anyone. Reviewer access can be
   granted once the people and intended audience are settled.
4. **Return or arrange the review findings.** Include accepted claims, disputed
   claims and concrete corrections. Also try the corrected model yourself and
   report visible problems; your display feedback remains useful even when it
   is separate from professional review.

A useful reply can be as short as: reviewer name/code, review role, email;
repeat for the other roles; feedback inbox/folder; whether invitations should
be sent. There is no expectation that you personally certify all three
traditions or the anatomy.

## What the reviewers need to do

| Review | Expected evidence |
| --- | --- |
| Anatomy | Check bone and joint relationships, named muscles and groups, attachments, movement annotations and cautions. Pay particular attention to the skull/upper neck, shoulder girdle, ribs, spine and feet after the latest corrections. |
| Each tradition | Check the movement path and timing, its wording and context, variations and support options, and whether it preserves that tradition's intent. |
| First-time usability | Open on an ordinary phone/desktop, use playback, camera and layers, locate sources/cautions, and export a useful correction report. |

The review scope is the current collection. Acceptance of one example does not
silently mark all 140 studies reviewed. Uncertain claims can remain explicitly
disputed instead of being forced into a pass.

## Work left for the implementation/review loop

After the reviewer information and findings arrive, the remaining work is to:

- configure the chosen review handoff and grant only the authorized access;
- trace each report to its exact movement/claim and preserve the original report;
- correct geometry, movement records, wording or attribution as needed;
- record the reviewer, finding and supported review status, or an explicit dispute;
- rerun the relevant checks and publish the resulting corrections;
- finish the Phase 6 validation record and close the current blocked todo only
  when the human evidence actually exists.

The current todo is `phase-6-practitioner-review`. Deployment alone does not
complete it. KRN's earlier feedback and the user's latest visual corrections
have been implemented, but formal acceptance remains open.

## Model limits and optional later work

The viewer is an authored illustration, not a scanned or measured body. Its
27-control rig distributes motion across the vertebrae; it does not give each
vertebra its own control. Ribs follow trunk motion without a separate breathing
cycle. Muscle coverage is representative; clavicle motion and foot contact are
illustrative. These limits are documented in the
[anatomy audit](https://github.com/knovak/siteprep/blob/9ba71aeb9fb2be3c2ba6650eb9408e12c8e0a5c9/initiatives/body-movement-visual-twin/work/phase-3/ANATOMY-AUDIT.md#axial-anatomy-and-foot-direction-audit).

Independent vertebral control, breathing, more complete muscle geometry,
measured motion or growth beyond the current 140 studies are further choices,
not hidden tasks you must supply before the current review can happen. Review
findings may identify which improvements matter most.

A public release would require a separate decision about audience plus the
rights/licensing/attribution/trademark review already reserved for a public
successor. That is not a current gate for private use. Clinical personalization,
movement scoring and treatment claims remain outside this version's scope.

## Evidence and project records

- [Objectives](objectives.html), [original implementation plan](plan.html), and
  [test plan](test-plan.html)
- [Recorded decisions](decisions.html), including KRN feedback and the private/public boundary
- [Anatomy and foot-direction audit](https://github.com/knovak/siteprep/blob/9ba71aeb9fb2be3c2ba6650eb9408e12c8e0a5c9/initiatives/body-movement-visual-twin/work/phase-3/ANATOMY-AUDIT.md#axial-anatomy-and-foot-direction-audit)
- [Validation record](https://github.com/knovak/siteprep/blob/9ba71aeb9fb2be3c2ba6650eb9408e12c8e0a5c9/initiatives/body-movement-visual-twin/work/phase-6/VALIDATION.md#phase-6-validation-record) and [review triage](https://github.com/knovak/siteprep/blob/9ba71aeb9fb2be3c2ba6650eb9408e12c8e0a5c9/initiatives/body-movement-visual-twin/work/phase-5/TRIAGE.md#human-review-triage)
- [Release history](releases.html)
