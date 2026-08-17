# Decisions

Questions this initiative was waiting on, and how they were settled. Newest at
the bottom. Written so a later reader — including a later version of us — does
not re-argue something already decided.

## 2026-08-17 — What is authoritative, and how does the guide stay true to it?

**Generate the guide's process content from the repository's own sources, and
date the outputs.**

The user's words, answering on review: *"generate the guide's process content
from the repository's own sources. Also: Date the outputs to allow a manual
double-check that it's current."*

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Generate from the repository's own sources** *(chosen)* | The guide cannot disagree with the repository, because it is not a second copy. Drift stops being a risk to manage | The largest build of the three, and generation only reaches what is actually derivable — narrative and explanation are not |
| **Hand-write, assert the claims by test** | Cheap to write, and a test failing is a loud signal | Only pins the claims somebody thought to assert; the ones nobody wrote a test for drift silently |
| **Accept drift, date the material** | Costs nothing | Objectives 2, 3 and 6 acquire a shelf life, and a reader has no way to know they have passed it |

### What this settles, and what it does not

- **This initiative is a build, not a piece of writing.** That was the open half
  of the question, and it is now answered: `draft-spec` is unblocked and is a
  spec for a generator.
- **The dating is not the third option arriving through the back door.** The
  user took generation *and* the dating that belonged to accepting drift, which
  is a stronger position than either: generation is not assumed to be total, and
  a date is what lets a person check the part it did not reach. Read as a
  statement about trust rather than about freshness, it says the generated
  guide is expected to have hand-written material around it.
- **Left open:** which repository source is authoritative for a given claim.
  There are five candidates — `AGENTS.md`, the two vision and techdoc files, and
  the initiatives data itself — and they overlap. The spec has to choose per
  claim, and that is the real work this decision creates.
- **Left open:** how much of the guide is generated versus written. "The process
  content" is the user's phrase and it is narrower than "the guide".
- **Makes decidable:** whether the deck and the description share a source, which
  `objectives.md` said followed from this one. If the process content is
  generated, sharing a source is the cheap default rather than a choice.

## 2026-08-17 — How faithful does the lifecycle simulator have to be?

**Animate an abstract lifecycle for now**, with an upgrade to the real
`initiative.json` held open.

The user's words: *"animate an abstract lifecycle for now. we might upgrade to
the real json if the animation is not adequate"*.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **An abstract lifecycle that moves** *(chosen)* | A diagram that could be finished in a day, and enough to make the stages legible — which is what objective 4 actually asks for | Nothing stops it teaching something false, because nothing connects it to the rules it depicts |
| **Driven by the real `initiative.json` shapes and sweep rules** | Cannot quietly diverge from the thing it explains | A substantially larger build, and one that is hard to justify before anyone has said the simple version is not enough |

### What this settles, and what it does not

- **The trigger for the upgrade is the user's, and it is a judgement:** *"if the
  animation is not adequate"*. Not a metric, and not something the spec should
  convert into one. It stays a live option rather than a rejected one.
- **The cost, stated so it is not a surprise:** the simulator is now the one
  deliverable outside decision 1's guarantee. Generated process content cannot
  disagree with the repository; a hand-drawn animation can, and will, the first
  time a stage changes. That is the case the dating requirement is carrying.
- **Left open:** how much of the lifecycle the animation covers. "Abstract" says
  it need not read the data; it does not say whether it shows one initiative
  moving, several, or a sweep run.

## 2026-08-17 — Where do the PDFs come from?

**Made by hand and pushed to Google Drive.** Not built in the pipeline, and not
committed here.

Raised in `objectives.md` for the spec rather than as a blocker, and answered
before the spec was written. The user's words: *"I may have to make the PDFs by
hand and push them up to google drive. I'm ok with that."*

### What this settles, and what it does not

- **The repository-wide precedent is not tested after all.** The question was
  awkward because a PDF is both generated and binary, and this repository
  commits nothing generated. Putting them outside the repository entirely
  sidesteps it rather than arguing it, and no invariant has to bend.
- **It contradicts a sentence in `objectives.md` as first drafted**, and the
  objective has been corrected in the same change: objective 8 said the PDFs
  were "renderings of the same source, not separate documents maintained beside
  it". Hand-made PDFs on Drive *are* separate documents maintained beside it.
  What survives is the outcome the objective was for — that the material can be
  handed to someone who will not clone anything.
- **They are now the part of the guide most likely to be wrong**, being the only
  deliverable that is neither generated nor in the repository. This is precisely
  what decision 1's dating requirement is for, and it applies to them most of
  all.
- **Left open:** how often they are refreshed, and whether anything reminds
  anybody to. "I'm ok with that" accepts the staleness; it does not say how much.
