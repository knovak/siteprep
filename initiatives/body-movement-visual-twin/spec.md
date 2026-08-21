# Spec

How the Body Movement Visual Twin is built. `objectives.md` says what "done"
means; this document chooses the first version and the boundaries that keep its
claims honest. Numbered references to **O1–O9** are the objectives, and
`background.md` is the research the alternatives below are drawn from.

## 1. What the first version is

A **private, invitation-only browser page** holding a small number of movements
— at least one from each of Feldenkrais, yoga, and the Alexander Technique —
each played as a 3D animation the reviewer can orbit, zoom, pause, scrub, and
replay, with a layer control that moves between the outer body, the muscles,
and the skeleton (O1, O2).

Three things it is deliberately not:

- **Not a pose catalog with anatomy painted on it.** Each movement carries the
  non-geometric instruction its tradition needs, and the page fails review if
  that instruction can be deleted without the entry looking incomplete (O4).
- **Not a personalized musculoskeletal model.** The surface responds to a few
  body controls; the internal anatomy is a fitted reference and is labelled as
  one everywhere it appears (O6).
- **Not a public site.** Access control, not obscurity, keeps the validation
  demo private, and public release is a successor version gated on the separate
  rights and trademark review (O5).

The deliverable is a **static page plus a data directory**: one HTML entry
point, a WebGL/WebGPU viewer, a per-movement JSON record, and the geometry and
animation files that record names. No account system, no database, no server
rendering. That is right for a handful of invited reviewers and keeps the
first version free of infrastructure whose cost would outlive the validation.

Scope for the first build: **three to six movements**, one shared body model,
and a **shoulder-girdle-and-spine anatomical region rendered at full fidelity**,
with the rest of the body present as surface and skeleton only. Picking one
region deep rather than the whole body shallow is what makes O3 — "explain
rather than decorate" — achievable at all within the first version.

## 2. Alternatives considered: the anatomy asset path

This is the decision the rest of the spec depends on, because it fixes both what
can be shown and what may later be republished (§9).

| Option | Strengths | Weaknesses |
|---|---|---|
| **Open3DModel anatomy plus a project-authored rig and surface** *(chosen in Phase 0)* | The official source permits hosted use under CC BY-SA; its July 2025 upper-limb model covers the intended shoulder region; share-alike can be contained; no per-seat cost | Assembly, retopology, skinning, and deep-spine path authoring are real work; the procedural Phase 0 surface is not a production body |
| **BioDigital embed** | Largest structure count, browser-ready, authoring tools for guided views | Its media-use policy limits publication and commercial reuse, so validation would prove a page we could not later ship; plan limits (ten model views/month on the free tier) do not survive review sessions; layer control is theirs, not ours |
| **Commercial anatomy asset packs** | Whole-body muscle geometry available immediately, usually rigged | Redistribution in a web page is the exact term such licences restrict; the rights question moves from "can we clear it" to "we already cannot", and it moves *before* validation rather than after |
| **OpenSim musculoskeletal models** | Genuinely biomechanical: muscle paths, moment arms, and joint definitions are the model, not decoration | Research toolkit output, not display geometry; visual quality is far below what O1 needs, and its simulation strengths address force estimation the first version explicitly disclaims |
| **Model a body from scratch** | Total control of topology, layering, and licence | Months of anatomical modelling before the first reviewer sees anything; the initiative's risk is whether the *idea* validates, and this defers that question the longest |

**Chosen because the licence must survive the validation.** A demo built on
assets we cannot republish would answer "is this useful?" while leaving "may we
ship it?" untouched — and the second question is the one with a standing legal
blocker. The concrete sources:

- **Surface and skeleton:** Phase 0 excludes SKEL and SMPL-Model. Their official
  single-user licences prohibit making their data available to invited third
  parties without prior written permission. The separately defined SMPL-Body
  asset class is CC BY 4.0 and remains eligible when a concrete ledgered asset
  is supplied, but none is present. The first slice instead uses a
  project-authored procedural surface and shared rig, with the Open3DModel
  skeleton selected as the later display-geometry source.
- **Muscles:** AnatomyTOOL's June 2025 skeleton and July 2025 upper-limb
  selection models are CC BY-SA. The upper-limb source includes shoulder and
  pectoral joints, axio-appendicular muscles and scapulohumeral muscles, which
  resolves the earlier assumption that only lower-extremity open geometry was
  rich enough. Erector spinae and multifidus remain honest grouped,
  project-authored paths against NLM Visible Human public-domain image data as
  reference; source imagery is not redistributed and all Phase 0 paths remain
  anatomically `unreviewed`.
- **CC BY-SA is load-bearing.** If AnatomyTOOL geometry is used and modified,
  the derivative geometry carries share-alike. The plan must keep share-alike
  geometry in a directory whose licence is declared separately from the
  application code, so the obligation is visible rather than discovered.

## 3. Alternatives considered: how a movement is animated

| Option | Strengths | Weaknesses |
|---|---|---|
| **Hand-authored keyframes on a shared rig, reviewed by a practitioner** *(chosen)* | Full control of range, speed, and pauses — which is what the somatic traditions are about; no subject's likeness or recording is captured; cheap to correct after review | Accuracy is an authoring claim, not a measurement, so §8's review workflow is what backs it |
| **Motion capture of a practitioner** | Real human timing and coordination; defensible provenance if consented | Introduces a performer's rights, a consent scope, and possibly a tradition's licensing question into the asset layer; equipment and cleanup cost; a captured *lesson* may be exactly the protected content §9 excludes |
| **Physics/muscle simulation (OpenSim-driven)** | Muscle activation would be derived rather than asserted | Claims force and load the objectives explicitly disclaim (O3); solver cost and failure modes are unsuited to a browser page; validating the simulation becomes a second initiative |
| **Video reference with a 3D overlay** | Fast; visually convincing | Reintroduces the recording-rights problem §9 exists to avoid, and the overlay cannot be orbited — failing O1 outright |

Keyframes are chosen because the first version's honest claim is *"this is a
careful illustration, reviewed by someone who knows the practice"*, not *"this
is measured"*. Every other option quietly upgrades the claim past what the
review workflow can back.

**Muscle behaviour is annotation, not simulation.** Each movement declares, per
phase, which muscles shorten, lengthen, or stabilise, as an authored list with
a source and a review status. The viewer shades those muscles from the
annotation. It never displays a force, a load, a percentage of activation, or a
colour ramp that could be read as one — a gradient implies a measurement.

## 4. The layer control, and why registration is a hard requirement

A single control moves through ordered layers:

```text
0  surface (opaque)
1  surface (translucent) + skeleton
2  muscles (superficial)
3  muscles (deep)
4  skeleton
```

Plus two independent toggles: **isolate around a joint** (show only structures
crossing a chosen joint) and **pin a layer** (hold one layer visible while the
control moves the other).

The binding constraint from O2 is that a layer change must preserve **camera,
pose, and animation time**. That makes it a shader/visibility change over one
shared skinned hierarchy — never a model swap, never a second scene, never a
reload. All layers are skinned to the same skeleton and posed by the same
animation clip; if a muscle layer arrives with its own rig, it is retargeted to
the shared skeleton at build time, not at runtime.

**Registration is a test, not an aspiration.** A build-time check samples each
movement at several frames and asserts that named attachment landmarks on the
muscle geometry stay within a fixed tolerance of their bone landmarks. Drifting
layers are the specific failure O1's "without the layers drifting out of
registration" names, and a demo that drifts is worse than one with fewer layers.

## 5. The movement record

One JSON file per movement. The geometry and the meaning are separated because
they have different rights, different review paths, and different authors.

```jsonc
{
  "id": "seated-pelvic-clock",
  "tradition": "feldenkrais",          // feldenkrais | yoga | alexander
  "title": "...",                       // our wording, not a lesson title
  "summary": "...",
  "phases": [                           // the geometric spine of the entry
    {
      "id": "start",
      "t": [0.0, 1.5],
      "joint_actions": [ { "joint": "lumbar-spine", "action": "flexion" } ],
      "muscles": [ { "id": "...", "behaviour": "shortens|lengthens|stabilises" } ]
    }
  ],
  "instruction": { /* see §6 — tradition-shaped, not a shared schema */ },
  "variations":  [ { "id": "...", "kind": "range|support|side|position", "note": "..." } ],
  "safety":      { "cautions": ["..."], "expects_teacher": false, "notes": "..." },
  "source":      {
    "tradition_basis": "...",           // how we came to describe this movement
    "rights_basis": "provisional: ...", // §9
    "authored_by": "...", "authored_on": "2026-..-..",
    "review": { "status": "unreviewed|reviewed|disputed", "by": "...", "on": "...", "notes": "..." }
  }
}
```

Two properties are deliberate. **`source` is per movement, and removing one
source deletes one file** — O5's "removing one source does not break the
movement data model" is a schema requirement, so nothing outside a record may
reference a source. And **`review.status` has a `disputed` value**, because O3
and the objectives' "flag uncertainty rather than forcing a binary accurate
label" require that a reviewer's doubt be representable in the data, not just
in an email.

## 6. Alternatives considered: representing non-geometric instruction

O4 is the objective most easily lost to convenience: attention, inhibition, and
optional range are what distinguish the traditions, and none of them is a joint
angle.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A tradition-shaped `instruction` block, with a shared timing anchor** *(chosen)* | Each tradition keeps its own fields, so nothing is flattened away; still time-anchorable to phases, so the viewer can surface a cue at the right moment | Three shapes to author, validate, and render; a fourth tradition later means a fourth shape |
| **One shared schema for all three** | Simplest to build and render | This *is* the failure O4 names — it produces "a posture wearing the wrong name". Rejected on the objective, not on cost |
| **Free prose only** | Nothing is lost; fastest to author | Cannot be time-anchored, cannot be validated, cannot be checked for presence; the entry silently degrades to a caption |
| **Prose plus timed cue markers, no per-tradition structure** | Cheap middle ground; gets cues on the timeline | Loses the distinction *between* a Feldenkrais attention cue and an Alexander direction — they render identically, which is the flattening again one level down |

The three shapes:

- **`feldenkrais`** — `exploration` (what to notice), `attention[]` (timed
  cues), `range: "optional"` with an explicit smaller reference path,
  `rest_pauses[]`. Speed and pause are part of the content; the viewer must not
  offer a "skip to the end" that discards them.
- **`yoga`** — `posture`, `transitions[]` (entry and exit as first-class, not
  the endpoint alone), `modifications[]`, `props[]`.
- **`alexander`** — `activity` (the everyday act: sitting, reaching, speaking),
  `directions[]`, `inhibition` (what is *not* done), and an explicit note that
  manual guidance is part of the source practice and is not reproduced here.

**Validation:** a record whose `instruction` block is absent, or whose block
does not match its `tradition`, is a build error. That is what stops the
non-geometric content being quietly dropped when a movement is added in a hurry.

## 7. Personalization: what the visual twin actually is

The first controls, chosen because each maps to a visible dimension we can
honestly name:

| Control | What visibly changes | What it does **not** change |
|---|---|---|
| Stature | Overall height, limb segment lengths | Muscle paths, joint geometry, mobility |
| Build / mass | Surface volume and soft-tissue depth | Bone geometry, muscle attachment sites |
| Proportion (torso : limb) | Segment ratios within the surface | Which muscles act, or how |
| Presentation | Which anatomical presentation the surface uses | Any internal structure |

Three rules the interface enforces:

1. **The page names which dimensions changed.** A visible line — "stature and
   build changed; internal anatomy is unchanged" — accompanies any control
   change. O6's "names which visible dimensions change" is a UI requirement,
   not a documentation one.
2. **Internal anatomy is labelled a fitted reference model, persistently.** Not
   in a footnote, not once at load — a standing label wherever anatomy is
   visible. Body controls reshape the surface and scale the skeleton; they do
   not personalize muscle paths, and the background research (generic-scaled vs
   subject-personalized models producing different biomechanical estimates) is
   why that distinction is load-bearing rather than pedantic.
3. **Presentation is not a proxy for anatomy.** The control is a body
   presentation choice, worded as such. It does not carry an implication about
   bone geometry, muscle paths, mobility, or biomechanics (O6), and no copy
   anywhere may read "male anatomy" / "female anatomy" as though the choice
   selected a different internal truth.

**No grading.** The reference path may be shown alongside the twin, but never
scored, never coloured by deviation, and never described as correct (O7).

## 8. The review workflow for anatomical claims

O3 requires that anatomical names and movement claims have sources and a review
status; O5 requires a reviewer be able to report a problem **without silently
changing the source record**.

The flow, and it is deliberately one-directional:

1. An entry is authored with `review.status: "unreviewed"`. The viewer displays
   that status — an unreviewed entry looks unreviewed to the reviewer.
2. A reviewer opens the movement, and every claim surface (a joint action, a
   named muscle, a behaviour annotation, a safety note) carries a **flag**
   control.
3. A flag writes a **separate report**, not the record: `{movement, claim
   path, reviewer, date, kind: anatomy|movement|attribution|safety, severity,
   note}`. The private demo may collect these to a file or an inbox; what it
   may **not** do is edit the JSON.
4. Reports are triaged by a person, who edits the record and sets
   `review.status` to `reviewed` or `disputed` with a note. **`disputed` is a
   publishable state** — an entry with recorded, unresolved doubt is more
   honest than one silently corrected or silently removed.

The separation is the point. If flagging edited the record, the source of a
claim and the objection to it would be the same field, and the initiative would
lose the ability to say who said what, when.

## 9. Rights: the boundary between accessible and republishable

This section exists because the objectives require a hard line, and because
being able to *fetch* something is the most common way projects get this wrong.

**The line.** An asset may be used in the private validation demo only if we
hold a licence permitting that use. An asset may enter a **public** successor
only if we hold a licence permitting **republication in a public, potentially
commercial site**. These are different questions, and the first never implies
the second.

**Excluded from the first build outright** — not deferred, excluded:

- Feldenkrais lesson recordings and archived lesson texts. The International
  Feldenkrais Federation states its archived lessons may not be copied or
  posted online without the rights holder's permission; the UK Guild's free
  audio archive is marked non-commercial. "Publicly downloadable" is not a
  licence.
- The protected marks. *Feldenkrais*, *Awareness Through Movement*, and related
  terms are listed as service marks by FGNA. The first version may state, as
  descriptive fact, that a movement **draws on the Feldenkrais tradition**; it
  may not brand itself with the marks, imply certification or affiliation, or
  present an entry as an authorised lesson.
- STAT website text and graphics, whose republication is restricted.
- Any content captured from BioDigital or another viewer we merely have access
  to. Access to a viewer is not a right to republish its anatomy.

**How a movement gets described without the excluded sources.** Entries are
**authored descriptions of a movement pattern**, informed by the tradition and
reviewed by a practitioner familiar with it — not transcriptions. A movement
pattern is not itself the copyrightable work; a particular lesson's text and
recording is. `source.tradition_basis` records how the entry came to be
described, so the distinction is auditable per entry rather than asserted once.

**`rights_basis` is provisional and says so.** Every entry's value is prefixed
`provisional:` in the first version. Only the successor's rights and trademark
review can promote it, and that review is not an engineering judgement — it
stays a legal blocker on the `confirm-publication-rights` item regardless of how
open the first build's material looks.

**The private demo must actually be private.** Invited access, not an
unadvertised URL. `noindex` and access control both; a page that is merely
unlinked is a public page. And an asset licence that permits "private" use is
only satisfied if the deployment is genuinely access-controlled — which makes
§11's access mechanism a licence-compliance component, not a convenience.

## 10. Safety

Per O8, and worth stating plainly because the failure mode is a page that reads
as instruction:

- A standing statement that this is an educational visualization, not
  diagnosis, treatment, or individualized instruction.
- **Cautions appear before a movement plays**, not after or beside it.
- Where the source practice expects a qualified teacher or clinician,
  `expects_teacher: true` and the page says so before playback.
- **"Move gently" may not stand in for a known contraindication.** A record
  whose `safety.cautions` contains only a generic gentleness phrase, for a
  movement whose tradition documents a specific contraindication, fails review.
- No claim that a visualization treats a condition, or that any movement is
  safe or effective for everyone. The evidence base summarised in
  `background.md` — heterogeneous trials, mixed reviews, uncommon but sometimes
  serious yoga adverse events — does not support stronger wording.

## 11. The private demo: delivery and access

- **Static hosting with access control in front of it.** The reviewer set is
  small and known; an invited-access gate is enough, and it is a licence
  requirement (§9), so it cannot be the thing that slips.
- **`noindex`, and no public link** from the repository's site.
- **Loads on an ordinary phone and desktop browser** (O9). Concretely: geometry
  is decimated and compressed per layer, muscle layers stream on first use
  rather than at load, and there is a visible loading state and a stated
  fallback when WebGL is unavailable. The full-fidelity region of §1 is what
  makes this budget achievable.
- **Pointer, keyboard, and touch** all reach orbit, zoom, scrub, play/pause, and
  the layer control. Keyboard is not an afterthought: a reviewer stepping frame
  by frame is the primary validation gesture.
- **The controls are labelled with what they reveal**, not just what they are —
  "show muscles around the shoulder", not "layer 3".

## 12. What the environment must supply

- The Phase 0 rights ledger and its selected Open3DModel sources; SKEL and
  SMPL-Model stay excluded unless written third-party-hosting permission is
  recorded, and a later SMPL-Body surface needs concrete CC BY provenance.
- A place to host a private, access-controlled static site.
- A practitioner reviewer for each of the three traditions (O4's check is that
  a practitioner says the entry is not a posture wearing the wrong name — this
  cannot be self-assessed).
- A destination for review reports (§8) that is not the repository.

## 13. Phase 0 resolutions and what remains

1. **The region mismatch is resolved for feasibility.** Open3DModel's July
   2025 upper-limb source covers the shoulder structures; the two deep-spine
   groups remain authored paths against Visible Human reference data.
2. **The licence path is resolved.** SKEL and SMPL-Model are excluded; a
   concrete CC BY SMPL-Body remains eligible but is not assumed to exist.
3. **Share-alike containment is fixed** below
   `assets/anatomy/share-alike/`; real imported geometry must stay there with
   attribution and modifications recorded.
4. **Registration is fixed at 8 mm** for 1700 mm reference stature, sampled at
   start, midpoint, end and every declared joint-angle extremum. Phase 0's 100
   samples max at 1.658 mm and a deliberately drifting fixture fails.
5. **The narrow muscle set is fixed** in `plan.md`, including which structures
   are named individually and which are grouped. Every name/group carries
   `unreviewed` until an anatomy reviewer accepts or disputes it, so grouping
   does not silently over-claim fidelity.
6. **How review reports are collected** without a backend, given §11 is static.
7. **Whether three movements or six** is the right first count, given each needs
   a practitioner review pass.
