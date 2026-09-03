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

## 2026-08-18 — Phase 5: fixed choreography, selective facts, and six visible states

The simulator keeps the six-step abstract choreography settled in the
specification and derives only the vocabulary that can drift: lifecycle stages,
the proposable blocker class, configured sweep phases, and the per-run item
budget.

### The derived boundary

The fact registry now supports resolving a named subset. Simulator generation
asks for exactly four keys and never resolves `initiatives.live`, so it neither
opens nor embeds any `initiative.json`. That is stronger than reading a real
initiative and discarding its details: generation still succeeds when the
initiatives directory is absent, while an inconsistent lifecycle constant still
fails as drift.

The fixed sequence uses the first three derived lifecycle stages for wish,
shaping, and the post-merge advance; draws the complete derived stage track;
uses the first derived proposable blocker class; displays every configured sweep
phase; and reads the displayed budget from `items_per_run`. No stage name,
blocker namespace, phase name, or budget number is typed into the animation.

### What this settles, and what it does not

- **Settled:** one self-contained HTML file presents all six states with Back,
  Step, and interruptible Play controls. Step 4 visibly passes an item over at
  the budget boundary; step 6 removes completed work, unblocks its dependent,
  and advances the stage.
- **Settled:** Play visits the exact same six states as manual stepping. It does
  not introduce a second choreography.
- **Settled:** the browser harness opens the file offline, walks both directions,
  checks harmless boundary actions, interrupts and resumes Play, verifies the
  budget and cascade states, and reports no network or console failures.
- **Not settled:** whether the abstract animation is adequate to teach the
  lifecycle. The user's earlier decision keeps a real-JSON upgrade open if a
  person watches this version and finds it inadequate, so that walkthrough
  remains a separate data blocker.

## 2026-08-19 — Output quality: structure renders as structure, and the simulator simulates

The first complete set of outputs was reviewed and rejected on two grounds: the
wording read as stilted, and the simulator was not appealing. Both turned out to
have single mechanical causes rather than being matters of taste, and both are
fixed at the cause.

### Why the prose read like a machine

`sections.mjs` flattened *any* fact into a sentence — arrays joined with `; `,
objects rendered `key: value; key: value`. Because a token could expand into a
scalar, a list, a map, or a whole multi-sentence skill description, every
sentence carrying one had to be phrased to survive any of those, which forces
one frame: plural noun phrase, copula, dumped value.

> The current budget is items_per_run: 4; max_items_per_initiative: 2;
> max_open_prs: 8; max_effort: large.

Three lint rules made it worse rather than better. `literal-budget` bans any
integer matching a budget value and `literal-stage-*` ban naming stages, so an
author is *forbidden* from writing the plain sentence and must reach for a
token; and `uncited-fact` requires every registered fact to appear somewhere,
which turns the prose into a quota to be discharged. That is why the portability
section had crammed three entire skill descriptions — trigger phrases and
parenthetical examples included — into a single sentence.

So the register was not a drafting failure. It was the price being paid for
objective 9's generation guarantee, and it was being paid in the wrong currency.

### What replaced it

Facts are split by shape and rendered accordingly.

- **Scalars stay inline.** `{{sweep.budget.items_per_run}}` inside "a run
  handles at most 4 items" reads as English and always did.
- **Structured values become blocks.** A section names `@fact <key> [as <view>]`
  or `@figure <name>` on its own line and the value arrives as a rail, a table,
  a chip row, a list, or a set of cards. `build/blocks.mjs` owns the views.
- **Inlining a structured value is now an error** (`structured-inline`), the way
  a literal stage name already was. That single lint flip is what forces the
  prose to be prose: the old frame is no longer expressible.
- **A block cites its facts**, so structure discharges `uncited-fact` and the
  quota stops pushing values into sentences that do not want them. A `prefix.*`
  glob lets one block cite a whole registered collection.
- **`skills.<name>.summary`** is a new derived fact: the first sentence of a
  skill's own description. A card shows the summary; the full description with
  its trigger phrases is still available and is no longer inlined anywhere.

Objective 9 is unaffected. Every value still resolves from the repository at
generation; only its presentation changed. The guarantee is now paid for in
layout, which is where it belongs.

### Why the simulator was not appealing

It was a slideshow of six states. `show()` called `replaceChildren` on the item
list every step, so an item that persisted across a step was a *different DOM
element with the same words*. Nothing ever visibly happened to anything, which
is why each step read as a new screen rather than as a consequence — and why the
left-hand "changes" list existed at all: it was narrating what the picture
failed to show. It also stopped three stages into an eight-stage lifecycle.

### What replaced it

- **Items are keyed and the DOM is reconciled.** An item that survives a step is
  the same element: it recolours in place, slides when a neighbour leaves, and
  collapses out of the list when it merges. A browser test tags live nodes and
  asserts the tags survive a step, which is precisely what the old renderer
  could not do.
- **The interesting moments are choreographed, not presented finished.** The
  sweep step runs its phases in sequence with the budget meter filling, and the
  passed-over item greys at the moment the allowance runs out. Steps expose
  `settle()` so tests need not wait on wall time.
- **The whole lifecycle is covered** — fourteen steps reaching every derived
  stage, including one deliberate backward move when an assumption breaks, and
  the quiet stages at the end.
- **The record accumulates.** `stage_documents` says what a stage *expects*, and
  the quiet stages expect nothing new; showing the record empty out at the end
  would have contradicted the reason it is kept. Documents now only ever grow.
- **Play is paced to be readable** — derived from narrative length rather than a
  flat 700ms — and the Step button names what is about to happen.

### Graphics

Six fact-derived inline SVG figures (`build/figures.mjs`) now appear in both the
description and the deck: the lifecycle rail with its accumulating documents,
the division of labour, one sweep run and its allowance, blocker triage, the
fork boundary, and the three content areas. They are pure functions of resolved
facts and declare the keys they consume, so a diagram cannot drift from the
repository — the same guarantee the prose has. Deck slides now take their layout
from what they carry, so a diagram slide, a data slide, and a statement slide no
longer look identical.

### What this settles, and what it does not

- **Settled:** no output flattens a structured value into prose; a browser
  assertion fails the description if any paragraph does.
- **Settled:** the simulator reconciles rather than replaces, covers all eight
  derived stages, and its record never shrinks.
- **Settled:** slides are no longer one shape repeated, and no slide overflows
  its frame at a 16:9 viewport.
- **Not settled:** whether a newcomer finds the result adequate. The three
  observation blockers on `initiative.json` are unchanged and still need people
  rather than assertions — this work makes them worth running, it does not
  answer them.
- **Unaffected:** the abstract-versus-real-JSON decision of 2026-08-17. The
  simulator still reads no initiative data; it covers more of the lifecycle
  abstractly, which is a different axis from fidelity.

## 2026-08-19 — Keep the latest generated guide in the repository

**Commit the three files under `guide/out/` and keep the latest successful
generation there from now on.**

The user's words: *"commit the 'out' folder. and make a PR. (in future, we
shall keep the contents of the latest generation of the guide in the folder.)"*

### What this settles, and what it does not

- **Settled:** `description.html`, `deck.html`, and `simulator.html` are tracked
  derived artifacts. A guide source change includes any regenerated outputs in
  the same commit after all three offline browser checks pass.
- **Settled:** the generator skill no longer proves that `out/` is ignored or
  clean. It reports the tracked artifacts that changed and includes them in the
  resulting change set.
- **Unchanged:** generation remains on request rather than part of every site
  build. Tracking the latest copy does not add a workflow or build hook.
- **Still open:** tracking the files makes them available in the repository but
  does not link them into the published site. The existing `link-the-guide`
  permission blocker remains the route to satisfying that part of O1.

## 2026-08-19 — Skills are discoverable by default, so `generate-guide` is installed

**`generate-guide` moved from this initiative's `skills/` to
`.claude/skills/generate-guide/`, as part of a repository-wide change to how
skills are organized.**

The user's words: *"skills are graduated by default, and are in an initiative
only if explicitly meant for just that initiative... the reason is that most
skills are meant for direct invocation by an interactive user."*

### What this settles, and what it does not

- **Settled:** the skill is installed where Claude Code and Codex discover it.
  Phase 7 of `plan.md` no longer "leaves out installing it".
- **Settled:** the `link-the-guide` item's permission blocker narrows to the
  site-navigation half. Installing the skill is no longer part of it.
- **Unchanged:** the guide's generated artifacts are still not linked into the
  published site, which is what `link-the-guide` still needs permission for.
- **Note:** the skill runs `initiatives/repo-guide/work/guide/build/cli.mjs`,
  so a repo-wide skill now depends on this initiative's code. That is allowed —
  the rule against depending on `initiatives/` covers *published outputs*, which
  are served silently to readers; a skill is invoked deliberately by someone who
  sees it fail. Moving or renaming that CLI now breaks the skill, so keep them
  in step.

## 2026-08-19 — Are portable document copies part of the current Repo Guide?

**No. They are removed from the current scope.**

The user's words: *"Remove all mentions of PDF, we won't need them at this
time. And you can remove the json file that keeps info about PDF."*

### What this settles, and what it does not

- The current deliverables are the self-contained web description, slide deck,
  and simulator. No portable-document links, metadata, refresh dates, panels,
  tests, or active todo item remain.
- The metadata configuration file is removed. The simulator's independent
  watched-date check remains in code and needs no configuration file.
- Prior decision and log entries remain as the append-only history of what was
  once planned. This decision supersedes them for all current work.
- A portable-document format could be reconsidered later, but there is no
  current requirement or placeholder for it.

## 2026-08-20 — Did the three newcomer tests pass, and how does the guide get linked into the site?

**Yes to all three tests. And the guide is published by hand to `demos/`, not
linked into site navigation.**

The user's words, on the three testing items: *"Yes to all these."* On linking:
*"I have done a manual release to demos, with a skill for the purpose. I will
continue to do manual releases when I think something significant has changed.
So that is done."*

### What this settles

- **The phase 3 newcomer reading test passed** — someone unfamiliar with the
  repository can read the description and identify a live stage and its next
  move.
- **The phase 4 ten-minute presentation test passed** — someone unfamiliar with
  the material can present the deck end to end inside ten minutes.
- **The simulator walkthrough passed** — it accurately explains the sweep and
  the whole lifecycle, and the abstract treatment of the lifecycle is adequate.
- **Publication is manual and already done.** `link-the-guide` asked for
  permission to write into protected site navigation and build paths. That
  permission is not granted and is no longer needed: the `deploy-demo` skill
  copies the built guide into `demos/`, and the user runs it when something
  significant has changed. The item is complete by a different route than the
  one it was written for.

### What this leaves open

- **Refresh is a human trigger, not a schedule.** Nothing detects that the
  guide has drifted from the repository it describes; the user decides when a
  change is significant enough to re-release. If the guide is later found stale
  in a way that matters, the answer is a staleness check, not automation of the
  release.
- **The generated artifacts are still absent from site navigation.** A reader
  who does not know the demo exists will not stumble onto it. That is accepted
  for now rather than solved.

### Consequence

With these four items closed the initiative has no remaining work, and the user
has declared it **dormant** rather than seeding another round — the §5.1
distinction made explicitly instead of by neglect.

## 2026-09-02 — How is the second version of the guide written, organized, and styled?

The user asked for a fresh start on the description and the deck: plain prose
for a developer seeing the repository for the first time, better graphics,
and complete coverage of the lifecycle and of what an initiative produces.
Four questions were put to the user as multiple choice, and answered in one
turn.

**How is it produced?** Keep the generator and rewrite everything in it. The
content sections were started over, the figures and both renderers were
rewritten, and the fact-derivation and lint rules stay so that stage names,
document lists, labels, budgets, skills, and workflows still cannot drift.
The alternatives were hand-written HTML (faster, but the live values go stale
silently) and relaxing the literal-value rules (more natural sentences at the
cost of drift). Neither was taken.

**How is it organized?** Follow one initiative from wish to archive. The
document opens with what the repository is and what an initiative produces,
then walks the lifecycle in four sections (starting; shaping and specifying;
planning and critiquing; building, graduating, and resting), then who supplies
what, the sweep, review and merge, decks, demos, deployment, forking, and
sources. Fourteen sections. The alternatives were reader-question sections and
a reference-first layout.

**What voice?** Plain second person. "You" when it is the reader's action,
"the person" and "the agent" for the roles, no first-person narrator, no
anecdotes. The alternatives were impersonal third person and keeping an
occasional narrator voice.

**What look?** Documentation style: white page, left sidebar with numbered
section links, wide figures, restrained navy accent. The deck gets a matching
clean 16:9 layout with a navy title bar and full-width diagrams, and no
diagonal wedge. The alternatives were tidying the previous navy-and-orange
design or copying the site's shared styling.

Four smaller choices from the same review: the fourteen-section outline stands
as proposed; the live table of initiatives stays in the first section, dated by
the footer; the title is "SitePrep Repo Guide"; and this work is recorded as a
new version of the initiative rather than a silent edit to the guide files.

Two notes from the user on wording, applied throughout: decks are static
content organized into collections, used here for travel information, rather
than "travel decks"; and the phrase "at the same gate" is replaced with plain
language about which documents a stage expects. The user also allowed the deck
to grow past twenty slides if sections needed it, with a ceiling of
twenty-five; the generator's ceiling is now twenty-four and the deck renders
twenty.

### What this settles, and what it does not

- **Settled:** the description has fourteen sections and twelve fact-derived
  figures; the deck has twenty slides; both carry the new title and layout.
- **Settled:** the sweep phase cards are no longer rendered from the prompt's
  first paragraphs, because the survey phase's first paragraph is a numbered
  list and reads badly as a card. The phase meanings are drawn in the sweep
  figure instead. The `sweep.phase_summaries` fact is now uncited, which the
  generator reports as a warning and not an error.
- **Not settled:** the simulator. A list of proposed changes is in
  `notes.md`; none of it is built.
- **Not settled:** whether to release. The generated copy under `out/` is
  ahead of the released copy under `demos/`, and releasing is the user's call.
