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

## 2026-08-18 — Can `build.sh` authoritatively name the content areas?

**No. Drop `structure.content_areas` from the fact set rather than infer it.**

The live file has no array, function or other single construct that declares a
content area. Decks are copied unconditionally, demos and initiatives are each
guarded separately, and `shared/`, `shared_assets/` and `pwa/` are copied by
similar-looking commands without being content areas. Reading directory names
from those commands would therefore be a classification invented by the reader,
not a fact read from the build.

### What the probe established

- **Can it be read today?** Not from one authoritative construct. A reader can
  find plausible directory names, but cannot tell content from assets without
  reimplementing the script's intent.
- **What shape would it assume?** Any proposed shape would be an accidental
  combination of `cp`, `if` and index-card markup scattered through the file.
- **What happens on an unfamiliar shape?** There is no honest failure boundary:
  a new content area could use different commands and be silently omitted while
  the reader still returned a plausible list.

### What this settles, and what it does not

- The `structure.content_areas` row and the sentence that cited it are removed
  from `spec.md`.
- The guide may still explain decks, demos and initiatives in composed prose.
  It just cannot present that list as generated from `build.sh`.
- If the build later gains a declarative content-area registry, the fact can be
  restored against that registry without changing this decision's standard.

## 2026-08-18 — Can workflow triggers and job names be read without YAML?

**Yes, through a deliberately narrow block reader.**

All four current workflows use block-form top-level `on:` and `jobs:` keys.
The probe read only direct children indented by two spaces and found:

- `cleanup-pr-preview.yml`: `delete`; job `cleanup`
- `gh-pages.yml`: `push`, `workflow_dispatch`; jobs `build`, `deploy`
- `initiatives-digest.yml`: `schedule`, `workflow_dispatch`; job `digest`
- `sweep-scope.yml`: `pull_request`; job `scope`

### What the reader is allowed to assume

- The top-level keys are exactly `on:` and `jobs:` in block form.
- Trigger and job identifiers are unquoted YAML keys made from letters, digits,
  `_` and `-`, indented by exactly two spaces.
- Nested configuration is ignored only after its direct parent has been
  identified; a top-level key ends the block.

### What this settles, and what it does not

- An inline trigger such as `on: [push]`, a quoted key, a missing block or an
  unexpected direct-child line is an error. The odd-file probe replaced the
  block with `on: [push]` and failed with `missing on: block`; it did not return
  an empty trigger list.
- This is not a YAML parser and must not grow into one. If a workflow adopts a
  valid YAML shape outside this subset, generation fails until the reader is
  deliberately extended or `workflows.*` is dropped.
- Values below the trigger and job keys are not facts this reader may expose.

## 2026-08-18 — Can skill frontmatter be delimited reliably?

**Yes, for a strict frontmatter subset that includes folded multiline
descriptions.**

The probe read every current `.claude/skills/*/SKILL.md` from an opening `---`
through the next exact `---`, requiring one `name` and one `description`. It also
read a synthetic folded description (`description: >-` followed by indented
lines) as one value.

### What the reader is allowed to assume

- Frontmatter begins on line one and ends at the next line that is exactly
  `---`.
- `name` is a non-empty inline scalar.
- `description` is either a non-empty inline scalar or a `>`/`|` block scalar
  whose content lines are indented by two spaces.
- Unknown frontmatter fields or scalar shapes are errors rather than ignored
  metadata.

### What this settles, and what it does not

- A deliberately odd file with no closing delimiter failed with `missing
  closing delimiter`; no body text was mistaken for metadata.
- The reader does not promise general YAML support. Quoted scalars, anchors or
  another indentation style require a deliberate extension or cause generation
  to fail.
- Only `name` and `description` are guide facts. Skill instructions remain
  prose, not generated process data.

## 2026-08-18 — Can phase summaries and sweep rules be read from the prompt?

**Yes, by binding the reader to the prompt's heading and list contract and to
the configured phase set.**

The live probe found four `## Phase n — title` headings and seven bullets under
the exact `## Rules` heading. For each phase it captured the first non-empty
paragraph after the heading; for rules it joined indented continuation lines to
their preceding bullet.

### What the reader is allowed to assume

- Phase headings are exactly level two and use `Phase <number> — <title>`.
- The expected phase numbers come from the configured sweep phase set; every
  expected heading must appear once, in order.
- The phase summary is the first non-empty paragraph before the next heading.
- Rules are top-level bullets under an exact level-two `Rules` heading, with
  only indented continuation lines permitted.

### What this settles, and what it does not

- Renaming `## Phase 2 — ...` to `## Review — ...` in the odd-file probe failed
  with `phase headings were 1,3,4, expected 1,2,3,4`; the reader did not silently
  publish three summaries.
- A missing first paragraph, missing `Rules` heading, empty rules list or
  unexpected line in that list is likewise an error.
- The captured text is quoted. The guide may explain it separately, but may not
  paraphrase the prompt and call the paraphrase generated.

## 2026-08-18 — Phase 3: the first description baseline and its source links

The description is one self-contained HTML file with inline styling and no
runtime data load. An authoritative Markdown link uses the explicit
`source:<repository-path>` form. Generation first proves that path exists in the
working tree, then renders a GitHub blob link pinned to the same short commit SHA
shown in the footer. The browser harness checks both halves: the local file
exists, and the outgoing URL contains that SHA.

This makes a broken source reference a generation error while keeping a copy of
the guide useful away from the checkout. Ordinary prose cannot accidentally
become an authoritative link merely because it looks like a path.

### Composed prose against resolved facts

The first complete description measured:

| Section | Composed words | Resolved tokens |
|---|---:|---:|
| What this repository is | 132 | 1 |
| The initiative lifecycle | 122 | 2 |
| Who supplies what | 152 | 3 |
| How work gets picked up | 100 | 5 |
| When a person is required | 129 | 3 |
| Decks, briefly | 95 | 1 |
| Demos, briefly | 96 | 1 |
| Taking this elsewhere | 123 | 7 |
| Where the real answers are | 127 | 0 |
| **Total** | **1,076** | **23** |

That is about 47 authored words per resolved token. It is a baseline, not a
threshold. The last section intentionally has no fact token: its facts are the
six explicit, SHA-pinned source links rather than values substituted into prose.

### What the honesty checks found on the first real draft

- The bare-stage warning fired twice, both on the ordinary-English word
  "wish". Both occurrences genuinely describe the first lifecycle record and
  were kept after review; the warning did its job without becoming a false
  build failure.
- The backticked-stage, stage-list, and budget-literal error rules fired zero
  times.
- The blocker rule initially matched ordinary words and paths because the live
  constants contain namespace names without their colon. That was a real false
  positive in the check, not in the prose. The rule now looks for namespace
  notation; its existing colon-shaped fixture still pins the intended error.
- One uncited-fact warning remains for the preview-cleanup workflow. The guide
  cites the workflows that explain generation, deployment, and sweep behavior;
  the cleanup job adds no newcomer-facing process fact.

### What this settles, and what it does not

- **Settled:** nine sections render in objective order and audience is always a
  visible hint, never a filter.
- **Settled:** the generated copy opens from `file://` with zero console errors,
  failed requests, or network requests, and every authoritative link resolves
  locally at generation time.
- **Not settled:** whether the explanation works for a newcomer. That manual
  test cannot be replaced by the browser harness and remains a separate data
  blocker.
- **Next:** the same section records can gain separately authored slide text;
  the description renderer does not need to change for phase 4.

## 2026-08-18 — Phase 4: an ordered slide list, a 90-word ceiling, and the first deck baseline

The specification's nine fixed sections and ten-slide floor cannot both hold if
each section has exactly one slide. The plan proposed an ordered slide list;
phase 4 makes its text format explicit: the first `---` after frontmatter still
separates page text from slide text, and each later `---` starts another slide
for that same section. Slide copy remains in the section file, while layout and
navigation remain in the renderer, so a later PowerPoint rendering can consume
the same records.

The first deck contains **13 slides**:

| Section | Slides |
|---|---:|
| What this repository is | 2 |
| The initiative lifecycle | 2 |
| Who supplies what | 2 |
| How work gets picked up | 2 |
| When a person is required | 1 |
| Decks, briefly | 1 |
| Demos, briefly | 1 |
| Taking this elsewhere | 1 |
| Where the real answers are | 1 |

The split follows the learning progression rather than equal allocation. The
opening section establishes the repository and the initiative idea separately;
the lifecycle, division of labour, and sweep each need two claims. The brief
content-area sections stay brief by requirement, and the source section closes
by handing the reader back to the authoritative files.

### The length limit the specification left open

**Ninety visible words per rendered slide.** The deck is intended to stand on
its own in a ten-minute presentation, so a tiny caption limit would make it
depend on expert narration. Ninety is still a hard ceiling: with the title and
body counted together, it prevents a section's page prose from being poured
onto one screen. The first deck sits below the ceiling on every slide. A
separate guard rejects any slide body that is a prefix of its page text, which
pins the stronger rule that slide copy is authored rather than truncated.

### What this settles, and what it does not

- **Settled:** the deck is one self-contained HTML file with inline styling and
  script, no network dependency, SHA-pinned source links, and forward, back,
  first, and last keyboard navigation.
- **Settled:** generation counts rendered slides, not marked sections, and
  fails outside the configured 10–20 range or above the 90-word ceiling.
- **Measured:** the first mapping is 13 slides across nine sections, as recorded
  above. All 13 rendered without horizontal, vertical, or copy overflow at a
  16:9 presentation viewport.
- **Not settled:** whether somebody unfamiliar with the material can present it
  end to end in ten minutes. That is observed evidence and remains a separate
  data blocker rather than a browser assertion.
- **Unaffected:** the description renderer. It still consumes only page text;
  the ordered slide list is additional source, not a fork of the description.
