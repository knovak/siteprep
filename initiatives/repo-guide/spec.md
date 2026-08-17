# Spec

How the Repo Guide is built. `objectives.md` says what "done" means; this says
what gets made. Where a choice was already settled, `decisions.md` holds the
argument and this file records the conclusion and what follows from it.

Numbered references to **O1–O9** are the objectives; **§n** is a section of this
file unless it says otherwise.

## 1. What the first version is

**One account of the process, rendered four ways.** A generator reads this
repository, extracts the facts that make up the process, and substitutes them
into hand-written narrative. Out of that come:

| Deliverable | What it is | Where it lives |
|---|---|---|
| **The description** | A web page — the long rendering | `gh-pages/guide/` |
| **The deck** | 10–20 slides — the short rendering of the same source | `gh-pages/guide/deck/` |
| **The simulator** | A stepped animation of the lifecycle | `gh-pages/guide/simulator/` |
| **The PDFs** | Renderings of the first two, made by hand | Google Drive (`decisions.md`, 2026-08-17) |

The generator is what makes this an initiative rather than an afternoon's
writing. `decisions.md` settled that the process content is **generated from the
repository's own sources**, which turns O9 from an aspiration into a build step:
the guide cannot state a stage list that disagrees with the code, because it does
not contain one.

**What "the process content" covers, and what it does not.** The user's phrase is
narrower than "the guide", and the line this spec draws is §3's: a **fact** is
something the repository already asserts somewhere executable — a stage name, a
blocker class, a sweep budget, a workflow trigger. Everything else — why the
process is shaped this way, what a contributor is expected to bring, what a
forker should take — is **narrative**, written by hand, and §4 is what keeps it
honest.

## 2. Alternatives considered: do the deck and the description share a source?

`objectives.md` left this to the spec rather than to the user. **They share one
source**, rendered at two lengths.

| Option | Strengths | Weaknesses |
|---|---|---|
| **One source, two renderings** *(chosen)* | The deck cannot contradict the description, which is half of O9's problem removed by construction. Writing happens once. A process change flows into both | The source must carry length metadata, so it is a document with structure rather than prose. Slide-shaped and page-shaped writing are not identical, and one of them is always slightly compromised |
| **Two documents, both generated from the fact set** | Each is written for its form; the deck can be genuinely slide-shaped | The facts agree and the narratives drift. That is the failure mode `objectives.md` names — six copies of every rule, five of which will be wrong first — reduced in count but not in kind |
| **The deck is a rendering of the description's headings** | Almost free | A deck of headings is not a deck. It presents as an outline, and O5's ten-minute presentation is not something an outline supports |

**What follows.** The source is not prose but a **section list**, and every
section carries a `slide` field (§5.1). The description renders every section;
the deck renders those marked for it, at slide length. One consequence is worth
naming because it constrains the writing: **a section's slide text is not a
truncation of its page text.** It is written separately, in the same section, and
the build fails when a slide-marked section has no slide text — which is how the
compromise above is made visible rather than absorbed.

## 3. The fact set

The heart of the build. A fact is a value extracted from a repository source,
addressed by a dotted key, and substituted into narrative by §4.

### 3.1 The authority rule

`decisions.md` left open *which* source is authoritative for a given claim, and
called it "the real work this decision creates". The rule this spec adopts, in
priority order:

1. **Executable truth wins.** Where a fact is enforced by code, a workflow, or a
   configuration file the build reads, that file is authoritative and no prose
   document can override it. The stage list is what `scripts/initiatives.mjs`
   accepts, not what any document says it is.
2. **Configuration beats code where the code reads it.** `initiatives/sweep.json`
   is authoritative for the sweep's phases and budgets even though
   `initiatives.mjs` enforces them, because the file is the thing a person
   changes.
3. **Prose is authoritative only for intent**, never for a value — and where the
   guide uses it, it is **quoted and linked, not paraphrased**. A paraphrase of
   `INITIATIVES_VISION.md` is a sixth copy of the rule, which is what
   `objectives.md` is against.
4. **Nothing is authoritative twice.** Every fact key names exactly one source.
   Where two sources could supply it, this spec picks one and the other is
   ignored, even when it agrees today.

Rule 4 is the one that does the work. Two agreeing sources are not redundancy,
they are a future disagreement with no rule for settling it.

### 3.2 The facts, and where each comes from

| Fact key | Source | Extracted as |
|---|---|---|
| `lifecycle.stages` | `scripts/initiatives.mjs` → `STAGES` | Ordered list |
| `lifecycle.stage_documents` | `scripts/initiatives.mjs` → `STAGE_DOCUMENTS` | Stage → documents expected |
| `blockers.prefixes` | `scripts/initiatives.mjs` → `BLOCKER_PREFIXES` | List |
| `blockers.human` | `scripts/initiatives.mjs` → `HUMAN_BLOCKERS` | The classes needing a person |
| `blockers.proposable` | `scripts/initiatives.mjs` → `PROPOSABLE_BLOCKERS` | The one class a sweep may answer |
| `sweep.phases` | `initiatives/sweep.json` | List, in run order |
| `sweep.budget` | `initiatives/sweep.json` | `items_per_run`, `max_items_per_initiative`, `max_open_prs`, `max_effort` |
| `sweep.protected_paths` | `initiatives/sweep.json` | List |
| `sweep.phase_summaries` | `initiatives/sweep-prompt.md` | The `## Phase n` headings and their first paragraph, **quoted** |
| `sweep.rules` | `initiatives/sweep-prompt.md` → the `## Rules` list | Quoted verbatim |
| `agent.commands` | `package.json` → `scripts` | Name → command |
| `workflows.*` | `.github/workflows/*.yml` | File → job names and `on:` triggers |
| `skills.*` | `.claude/skills/*/SKILL.md` | Frontmatter name and description |
| `structure.content_areas` | `scripts/build.sh` | Which top-level directories become site sections |
| `initiatives.live` | `initiatives/*/initiative.json` | Slug, title, stage — the real backlog, as an example |

**`initiatives.live` is the one fact drawn from data rather than rules**, and it
is deliberately shallow: slug, title and stage only. It exists so the guide can
show a real initiative at a real stage rather than an invented one, and it stops
short of anything a reader might mistake for the backlog itself — which is one
click away, at `/initiatives/`, and does not need repeating here.

### 3.3 How the facts are read

**By importing them, not by parsing the file as text.** `initiatives.mjs`
currently keeps `STAGES`, `STAGE_DOCUMENTS`, `BLOCKER_PREFIXES`, `HUMAN_BLOCKERS`
and `PROPOSABLE_BLOCKERS` as module-private constants; the change this spec asks
for is a one-line `export` on each, and the generator imports the module.

| Option | Strengths | Weaknesses |
|---|---|---|
| **Export the constants and import them** *(chosen)* | The guide reads the same values the code uses — not a copy that happens to match. Reformatting, renaming or restructuring cannot silently change what the guide prints | Touches `scripts/`, which is a protected path (§9.2), so it needs a change the sweep cannot make |
| **Scrape the source text with a strict parser** | Needs no change outside the initiative's own files | Reads a *rendering* of the values rather than the values. It is a second implementation of JavaScript's array literal, and its failure mode on an unfamiliar formatting is either a crash or, worse, a plausible wrong answer |
| **Re-declare the facts in the guide and test that they agree** | Simple, and the test is a real signal | This is `decisions.md`'s rejected option wearing a build step. It pins what somebody remembered to assert |

**An extraction that fails is an error, not a fallback.** If a fact key cannot be
resolved — the export is gone, the JSON key was renamed, the workflow file moved
— the guide build fails. There is no default value and no "leave it out" path,
because both of those publish a guide that looks complete and is not, which is
precisely what O9 exists to prevent. §9.3 says where that failure surfaces.

## 4. The narrative, and what keeps it honest

Narrative lives in `guide/content/*.md`, hand-written, and refers to facts by
token: `{{lifecycle.stages}}`, `{{sweep.budget.items_per_run}}`. The generator
substitutes them at build time.

Three rules, and each one is a build check:

- **An unknown token fails the build.** A token naming a fact that does not exist
  is a typo or a fact that was removed; either way the sentence around it is
  wrong.
- **A fact no narrative cites is a warning.** Not an error — the fact set is
  allowed to be richer than the guide. But a fact that nothing mentions is the
  most common shape of drift: the process grew something and nobody wrote about
  it.
- **A number or a stage name written as a literal is a build error.** The check
  is mechanical: the narrative source may not contain any string in
  `lifecycle.stages` or `blockers.prefixes` outside a token, and may not contain a
  digit sequence matching a `sweep.budget` value. This is the rule that stops the
  guide slowly reverting to hand-maintained prose one convenient sentence at a
  time.

The third rule will occasionally be annoying — a sentence that legitimately says
"four" when the budget happens to be 4 has to be rewritten. That is the cost, and
it is accepted: the alternative is a check that only catches the careless case,
which is not the case that causes the harm.

## 5. The source document

### 5.1 Section shape

`guide/content/` holds one markdown file per section. Frontmatter:

```yaml
id: lifecycle-stages
title: The stages an initiative moves through
order: 30
slide: true              # does this section appear in the deck?
slide_title: Stages      # optional, defaults to title
audience: both           # both | forker | contributor
```

The body has two parts, separated by a `---` rule: the **page text** and, when
`slide: true`, the **slide text**. §2 requires the second to be written rather
than derived, and the build enforces it.

`audience` exists because `objectives.md` names two readers wanting different
things from the same material. It is a rendering hint, not two documents: the
description shows everything with the audience marked in the margin, and the deck
takes a path through it (§6).

### 5.2 What the sections are

Fixed by the objectives rather than left to the writer, so that O2, O3 and O6
each have a section that is theirs:

1. **What this repository is** — the site, the content areas, and why there is a
   process at all. `audience: both`.
2. **The initiative lifecycle** — the stages, what changes at each, and what
   document is expected when. O2. The spine of everything else.
3. **Who supplies what** — per stage, what the person brings and what the agents
   bring. O3, and the section `objectives.md` says is hardest to assemble from
   the existing documents because it is spread across all of them.
4. **How work gets picked up** — the sweep: its phases, its budget, what it may
   never do. Facts from `sweep.*`, rules quoted from `sweep-prompt.md`.
5. **When a person is required** — the blocker classes, and why only `human:` may
   be answered by a proposal. This is where the division of labour becomes a rule
   rather than a convention.
6. **Decks, briefly** — how a deck is modified. O5, and short by requirement.
7. **Demos, briefly** — how a demo is added. O5, same.
8. **Taking this elsewhere** — which files carry the process and which are this
   repository's own content. O6, `audience: forker`.
9. **Where the real answers are** — the five source documents, what each is for,
   and when to open it. O7.

Section 8 is generated more than written: the file list comes from
`structure.content_areas` and `sweep.protected_paths`, plus a hand-maintained
`portable: true` marker in the guide's own config for files the generator cannot
classify. That marker is a fact the repository does not assert anywhere else,
which makes it exactly the kind of thing §10's dating exists to cover.

## 6. The deck

Generated from the same sections, filtered to `slide: true`, in `order`.

- **Length is checked, not hoped for.** The wish says 10–20 slides; fewer than 10
  or more than 20 marked sections fails the build. A deck that quietly grew to
  thirty slides is no longer the thing O5 says can be presented in ten minutes.
- **One idea per slide.** Enforced weakly, by a length limit on slide text rather
  than by judgement.
- **It is a page, not a `decks/` entry.** The site's deck machinery is built
  around `deck.json` and hand-authored section HTML, and registering there would
  put a generated artefact into a directory whose convention is that its contents
  are written. The guide's deck is one generated HTML page with keyboard
  navigation, styled from the site's shared assets by reference.

The trade in the third point: the guide's deck will not automatically gain
whatever the deck system gains later. That is accepted for the first version, and
`plan.md` should carry it as a known divergence rather than a bug to be found
later.

## 7. The simulator

`decisions.md` settled this as **an abstract lifecycle**, with an upgrade to the
real `initiative.json` held open if the animation is not adequate.

**Abstract in behaviour, generated in vocabulary.** The simulator does not read
the backlog and does not implement the sweep's rules. But its stage names,
blocker classes and phase names come from the same fact set as everything else
(§3.2), so the one thing it cannot do is teach a stage that does not exist. That
narrows the cost `decisions.md` recorded — a hand-drawn animation that "can, and
will, disagree the first time a stage changes" — to the choreography, which is
the part a person has to check.

**The walk-through**, a fixed sequence with Step, Back and Play:

1. A wish is written. One initiative appears at `wish`.
2. Objectives are drafted; the stage advances, and the todo list gains items.
3. An item is blocked on a `human:` question. It goes amber; the digest column
   shows it.
4. A sweep run: the survey picks the highest-scoring actionable item, opens a
   pull request, and the item shows as in flight. Another item is passed over
   because the budget is spent — **which is a step, not a footnote**, since the
   budget is the part of the sweep newcomers do not expect.
5. The blocked item is answered. The blocker clears and the item becomes
   actionable.
6. The pull request merges. The item disappears, its dependants unblock, and the
   stage advances.

Step 4's passed-over item and step 6's cascade are the two moments a stage table
cannot convey, and they are why O4 asks for this at all.

**What it is not:** a sandbox. `objectives.md` puts free play out of the first
version explicitly.

## 8. The PDFs

Made by hand and kept on Google Drive (`decisions.md`, 2026-08-17). Nothing in
the build produces them, and nothing in the repository stores them.

What the build *does* carry is the one thing that keeps them honest: a
`guide/pdfs.json` holding, per PDF, a link and the date it was last refreshed by
hand. §10 uses that date.

## 9. How it is built

### 9.1 Layout

```text
guide/
  config.json          # nav placement, PDF links, portable-file markers
  content/*.md         # the sections of §5
  simulator/           # the walk-through's own source
  build/               # the generator: facts, tokens, renderers, checks
```

Output mirrors `initiatives/`: `gh-pages/guide/index.html`, `.../deck/`,
`.../simulator/`. Nothing generated is committed, which is the repository's
existing rule.

### 9.2 The one change outside the initiative

The generator runs from `scripts/build.sh`, which means **one line in a protected
path**. `initiatives/sweep.json` protects `shared/`, `scripts/` and `.github/`,
so a sweep pull request cannot add it.

Named here because it is a scheduling fact, not a detail: the guide can be built,
tested and reviewed entirely inside `guide/`, but it cannot be *published* until
a human-authored change lands three things — the `build.sh` invocation, the
`export` keywords of §3.3, and a nav entry in `shared/nav_bar/`. `plan.md` should
put those together as one small hand-landed change rather than three, and should
not schedule work that depends on them before that.

### 9.3 Severity

The guide's build failing aborts the site build, the same way an unparseable
`initiative.json` does — and unlike the initiatives *backlog* warnings, which are
never fatal because one initiative's empty todo list must not stop an unrelated
deck from publishing.

The distinction is between a backlog needing attention and **data being wrong**.
A guide that cannot resolve a fact key is the second: publishing it means
publishing a page that states the process incorrectly, which O9 rates as worse
than not publishing at all.

### 9.4 Tests

Owned by this initiative, so they have to be declared in its `outputs[]`:

- **Build-time, in the generator:** every token resolves; every `slide: true`
  section has slide text; the deck is 10–20 slides; no literal stage name or
  budget number in narrative source (§4); every fact key resolves to exactly one
  source (§3.1's rule 4).
- **Browser-driven, in `tests/`:** the guide is reachable from the root index and
  the nav bar (O1); every "the real answer is here" link resolves (O7); the
  simulator steps end to end and returns to its start (O4).
- **The drift test**, which is O9's and the only one that fails on a change made
  somewhere else: rename a stage in `initiatives.mjs` in a fixture, and the guide
  build must fail rather than publish the old name.

## 10. Dating, and how drift surfaces

Two mechanisms, from `decisions.md`: generation for what can be derived, dating
for what cannot.

- **Every page carries its provenance in the footer:** the build date, and the
  short commit sha the sources were read at.
- **`pdfs.json` carries a hand-set refresh date per PDF** (§8).
- **The guide compares the two.** When the newest commit touching any source in
  §3.2's table is later than a PDF's refresh date, the guide's own page shows the
  PDF as **possibly stale**, next to the link, with both dates.

That last one is the whole of O9 for the deliverable O9 applies to most: the
PDFs are the only part that is neither generated nor in the repository, and a
warning a reader sees is worth more than one only a maintainer would.

**Deliberately not done:** failing the build on a stale PDF. The build would then
break because somebody edited `AGENTS.md`, which trains people to bypass it —
and the staleness is `decisions.md`'s accepted cost, not a defect.

## 11. Open questions this leaves

- **How much narrative there is** — §3 draws the fact/narrative line, but not how
  long the written half runs. That is a drafting judgement and belongs to the
  work, not to a decision.
- **Whether the simulator's choreography needs its own review cadence.** It is
  the piece generation does not reach (§7), and nothing currently prompts anyone
  to re-watch it after a stage change. The dating covers detection; it does not
  schedule a look.
- **Whether section 8's `portable: true` markers survive contact with a real
  fork.** Nobody has done one. The list is a claim about what carries the
  process, and the only test of it is somebody trying.
