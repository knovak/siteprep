# Spec

How the Repo Guide is built. `objectives.md` says what "done" means; this says
what gets made. Where a choice was already settled, `decisions.md` holds the
argument and this file records the conclusion and what follows from it.

Numbered references to **O1–O9** are the objectives; **§n** is a section of this
file unless it says otherwise.

## 1. What the first version is

**One account of the process, rendered three ways, produced on request.** A
generator reads this repository, extracts the facts that make up the process, and
substitutes them into composed narrative. Out of that come:

| Deliverable | What it is | Shape |
|---|---|---|
| **The description** | The long rendering | One self-contained `.html` file |
| **The deck** | 10–20 slides — the short rendering of the same source | One self-contained `.html` file |
| **The simulator** | A stepped animation of the lifecycle | One self-contained `.html` file |
| **The PDFs** | Renderings of the first two, made by hand by the user | Google Drive (`decisions.md`, 2026-08-17) |

Three properties, all settled on review 2026-08-17 and each of them a
simplification:

- **Self-contained.** Every artefact is one file with its own CSS, JavaScript and
  data inline. No shared assets, no sibling files, no origin required — it works
  from a `file://` URL, an attachment, or any static host.
- **Produced on request**, by a skill, not by `npm run build` (§9). The guide is
  not a page the site rebuilds on every commit.
- **Delivery is not this initiative's job.** Making the three artefacts is;
  getting them onto the site is separate work, and §11 records what that costs.

The generator is what makes this an initiative rather than an afternoon's
writing. `decisions.md` settled that the process content is **generated from the
repository's own sources**, which turns O9 from an aspiration into a mechanism:
the guide cannot state a stage list that disagrees with the code, because it does
not contain one.

**Two words, used precisely, because a review found them misleading.** Both
halves of every artefact are written by an agent — there is no "human-written"
part and no "machine-written" part, and this spec previously implied otherwise by
saying *hand-written*. The distinction that matters is about **where a sentence
gets its truth**, not who typed it:

- **Derived** — extracted from a repository source at generation time and
  substituted in. Cannot disagree with the repository, because it is not a copy.
- **Composed** — written as prose. True when written, and nothing but §4's
  checks and §10's dating keeps it true afterwards.

**What "the process content" covers, and what it does not.** The user's phrase is
narrower than "the guide", and the line this spec draws is §3's: a **fact** is
something the repository already asserts somewhere executable — a stage name, a
blocker class, a sweep budget, a workflow trigger. Everything else — why the
process is shaped this way, what a contributor is expected to bring, what a
forker should take — is composed, and §4 is what keeps it honest.

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
generation fails when a slide-marked section has no slide text — which is how the
compromise above is made visible rather than absorbed.

## 3. The fact set

The heart of the generator. A fact is a value extracted from a repository
source, addressed by a dotted key, and substituted into composed prose by §4.

### 3.1 The authority rule

`decisions.md` left open *which* source is authoritative for a given claim, and
called it "the real work this decision creates". The rule this spec adopts, in
priority order:

1. **Executable truth wins.** Where a fact is enforced by code, a workflow, or a
   configuration file the process itself reads, that file is authoritative and no prose
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

**By importing them, not by parsing the file as text.** `initiatives.mjs` keeps
`STAGES`, `STAGE_DOCUMENTS`, `BLOCKER_PREFIXES`, `HUMAN_BLOCKERS` and
`PROPOSABLE_BLOCKERS` as module-private constants, so each needs an `export`.

**And one thing this spec first got wrong, corrected here because the difference
is instructive.** The earlier draft said the change was "a one-line `export` on
each" — drafting it found that it is not. The module's CLI dispatch is
top-level, so importing it fell through the `switch` to `default:` and called
`process.exit(2)`: the importing process died before it saw a value. The exports
alone would have produced a generator that failed in a way that looks like the
generator's fault rather than a module that was never importable. The dispatch
now sits behind a run-as-a-program guard, and a test pins the guard, since an
ordinary refactor could drop it with every other test green — the CLI would keep
working and only the import would break.

Worth keeping in mind for the rest of this spec: **"just add an export" was a
guess about somebody else's file, and it was wrong on first contact.** The other
extraction targets in §3.2 — the workflow YAML, the skill frontmatter,
`build.sh`'s content areas — have had no such contact yet.

| Option | Strengths | Weaknesses |
|---|---|---|
| **Export the constants and import them** *(chosen)* | The guide reads the same values the code uses — not a copy that happens to match. Reformatting, renaming or restructuring cannot silently change what the guide prints | Touches `scripts/`, which is a protected path (§9.3), so it needs a change the sweep cannot make |
| **Scrape the source text with a strict parser** | Needs no change outside the initiative's own files | Reads a *rendering* of the values rather than the values. It is a second implementation of JavaScript's array literal, and its failure mode on an unfamiliar formatting is either a crash or, worse, a plausible wrong answer |
| **Re-declare the facts in the guide and test that they agree** | Simple, and the test is a real signal | This is `decisions.md`'s rejected option wearing a build step. It pins what somebody remembered to assert |

**An extraction that fails is an error, not a fallback.** If a fact key cannot be
resolved — the export is gone, the JSON key was renamed, the workflow file moved
— generation fails. There is no default value and no "leave it out" path,
because both of those hand somebody a guide that looks complete and is not, which is
precisely what O9 exists to prevent. §9.4 says what that failure costs.

## 4. The narrative, and what keeps it honest

Composed prose lives in `guide/content/*.md` and refers to facts by
token: `{{lifecycle.stages}}`, `{{sweep.budget.items_per_run}}`. The generator
substitutes them at generation time.

Three rules, and each one is a build check:

- **An unknown token fails generation.** A token naming a fact that does not exist
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
  guide slowly reverting to prose nothing checks, one convenient sentence at a
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
than derived, and the generator enforces it.

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
`structure.content_areas` and `sweep.protected_paths`, plus a maintained
`portable: true` marker in the guide's own config for files the generator cannot
classify. That marker is a fact the repository does not assert anywhere else,
which makes it exactly the kind of thing §10's dating exists to cover.

## 6. The deck

Generated from the same sections, filtered to `slide: true`, in `order`.

- **Length is checked, not hoped for.** The wish says 10–20 slides; fewer than 10
  or more than 20 marked sections fails generation. A deck that quietly grew to
  thirty slides is no longer the thing O5 says can be presented in ten minutes.
- **One idea per slide.** Enforced weakly, by a length limit on slide text rather
  than by judgement.
- **It is one file, not a `decks/` entry.** The site's deck machinery is built
  around `deck.json` and written section HTML, and registering there would put a
  generated artefact into a directory whose convention is that its contents are
  written. The guide's deck is a single self-contained HTML file with keyboard
  navigation and its styling inline.

The trade in the third point: the guide's deck will not automatically gain
whatever the deck system gains later, and it cannot share the site's styling by
reference. That is accepted for the first version — it is what makes the deck
something you can attach to an email — and `plan.md` should carry it as a known
divergence rather than a bug to be found later.

## 7. The simulator

`decisions.md` settled this as **an abstract lifecycle**, with an upgrade to the
real `initiative.json` held open if the animation is not adequate.

**Abstract in behaviour, generated in vocabulary.** The simulator does not read
the backlog and does not implement the sweep's rules. But its stage names,
blocker classes and phase names come from the same fact set as everything else
(§3.2), so the one thing it cannot do is teach a stage that does not exist. That
narrows the cost `decisions.md` recorded — a composed animation that "can, and
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

**One file, no dependencies.** The simulator is a single HTML document with its
markup, styling, animation and step data inline — no framework, no fetch, no
sibling assets. That is what makes it deployable anywhere or nowhere: it opens
from a `file://` path, survives being emailed, and needs no decision about
hosting before it can be looked at.

## 8. The PDFs

Made by hand and kept on Google Drive (`decisions.md`, 2026-08-17). Nothing in
the generator produces them, and nothing in the repository stores them.

What the generator *does* carry is the one thing that keeps them honest: a
`guide/pdfs.json` holding, per PDF, a link and the date it was last refreshed by
hand. §10 uses that date.

## 9. How it is produced

### 9.1 On request, not on every build

**A skill runs the generator; nothing runs it automatically** (settled on review
2026-08-17). `npm run build` does not call it, no workflow calls it, and no
commit triggers it. Somebody — a person or an agent — asks for the guide, and the
three files of §1 are written.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A skill, on request** *(chosen)* | The guide is regenerated when somebody wants it, which is a handful of times a year, not on every commit to an unrelated deck. Needs no change to `scripts/`, `shared/` or `.github/`, so the whole initiative fits inside its own write scope. A failure costs the person who asked, not an unrelated deploy | Nothing prompts a regeneration, so a copy in circulation can be stale without anybody noticing. §10's dating is what covers that, and it matters more under this option than it would have under the other |
| **A step in `scripts/build.sh`** *(previous draft)* | The published guide is never stale, because it is rebuilt with the site | Regenerates on every commit to anything, to produce a document that changes a few times a year. Puts a fact-extraction failure in the path of an unrelated deck's deploy, and needs a protected-path change before anything can be seen at all |

The second option's real cost is the one that decided it: it makes the guide's
correctness a gate on publishing the whole site, for material nobody is waiting
on.

### 9.2 Layout

```text
guide/
  config.json          # PDF links and portable-file markers
  content/*.md         # the sections of §5
  simulator/           # the walk-through's own source
  build/               # the generator: facts, tokens, renderers, checks
  out/                 # the three generated files — git-ignored
```

Nothing generated is committed, which is the repository's existing rule. The
generated files are therefore not in the repository between runs: the skill
produces them, and whoever asked takes them from `guide/out/`.

### 9.3 What still touches a protected path, and what no longer does

**One change, not three.** The generator reads the fact set by importing
`scripts/initiatives.mjs` (§3.3): five constants there gain an `export`, and the
CLI dispatch gains a run-as-a-program guard so that importing the module does not
run a command. Nothing else in that file changes, and nothing that uses it
changes. **It is drafted** — see the pull request opened alongside this spec's
review round.

`initiatives/sweep.json` protects `shared/`, `scripts/` and `.github/`, so a
sweep pull request cannot make even that one edit — it has to arrive as an
ordinary pull request. It is a prerequisite for the generator running at all, so
`plan.md` should put it first and schedule nothing that imports facts until it
has landed.

**Two changes the previous draft asked for are gone**, both as consequences of
§9.1 and §1:

- **The `scripts/build.sh` invocation** — not needed once the guide is produced on
  request rather than by the site build.
- **A nav entry in `shared/nav_bar/`** — that was for reaching the guide *on the
  site*, which is delivery, and delivery is not this initiative's job. §11 says
  what that costs and what it means for O1.

### 9.4 What a failure costs

A fact that cannot be resolved fails the generation, and the person who asked
gets an error instead of a file. That is the whole blast radius: no build is
aborted, no deploy is blocked, and no unrelated deck is delayed.

This is a better failure than the previous draft's, and worth stating as a rule
rather than an accident: **the guide's correctness gates the guide, not the
site.** What has not changed is that there is no fallback value and no
"leave it out" path — handing somebody a document that states the process
incorrectly is what O9 rates as worse than handing them nothing.

### 9.5 Tests

- **In the generator, every run:** every token resolves; every `slide: true`
  section has slide text; the deck is 10–20 slides; no literal stage name or
  budget number in composed source (§4); every fact key resolves to exactly one
  source (§3.1's rule 4). These are not a separate suite — a generation that
  would violate one of them does not produce a file.
- **Against the generated files:** each opens with no network access and no
  console error, every "the real answer is here" link resolves (O7), and the
  simulator steps end to end and returns to its start (O4). These need a browser,
  so they belong in `tests/` and the initiative must declare that path in its
  `outputs[]`.
- **The drift test**, which is O9's and the only one that fails because of a
  change made somewhere else: rename a stage in a fixture copy of
  `initiatives.mjs`, and generation must fail rather than emit the old name.

## 10. Dating, and how drift surfaces

Two mechanisms, from `decisions.md`: generation for what can be derived, dating
for what cannot.

- **Every artefact carries its provenance in the footer:** the generation date, and the
  short commit sha the sources were read at.
- **`pdfs.json` carries a refresh date per PDF**, set when the user makes one (§8).
- **The guide compares the two.** When the newest commit touching any source in
  §3.2's table is later than a PDF's refresh date, the guide's own page shows the
  PDF as **possibly stale**, next to the link, with both dates.

That last one is the whole of O9 for the deliverable O9 applies to most: the
PDFs are the only part that is neither generated nor in the repository, and a
warning a reader sees is worth more than one only a maintainer would.

**Deliberately not done:** refusing to generate when a PDF is stale. Generation
would then fail because somebody edited `AGENTS.md`, which trains people to work
around it — and the staleness is `decisions.md`'s accepted cost, not a defect.

**Dating carries more weight under §9.1 than it would have otherwise**, and the
reason is worth stating where somebody will see it. A guide rebuilt with the site
is fresh whenever it is looked at. A guide generated on request is fresh *when
generated* and then travels — as a file, an attachment, a copy on Drive. The
footer is what lets somebody holding one work out whether it still describes the
repository, so it is a requirement rather than a nicety.

## 11. Delivery, and the objective it leaves short

Delivery is out of scope on review (2026-08-17): *"No need for this initiative to
do deployment, just make the simulator, slides, and documents."* This spec takes
that literally, and §1's self-contained files are what make it safe to — an
artefact that needs no origin can be delivered later by almost any means, so
nothing here forecloses a choice.

**One objective is left short by it, and this spec will not quietly reword it.**
O1 says a newcomer finds the entry point without being told where it is — the
guide reachable from the site and the repository's front door, the way decks,
demos and initiatives are. A file in `guide/out/` is not reachable by anybody. On
what is specified here, **O1 is not met**.

That is the user's call to make rather than the spec's, so it is recorded rather
than resolved. The two ways it can go:

- **Amend O1** to be about the artefacts existing and being sendable, and let
  reachability be a later initiative.
- **Keep O1** and add a delivery item to this one — which needs the `build.sh`
  invocation and the `shared/nav_bar/` entry §9.3 removed, both protected paths,
  both landed by an ordinary pull request.

What is *not* an option is leaving O1 stated and unmet without saying so, which
is why this section exists rather than a quiet edit to `objectives.md`.

## 12. Open questions this leaves

- **How much composed prose there is** — §3 draws the derived/composed line, but
  not how long the written half runs. That is a drafting judgement and belongs to
  the work, not to a decision.
- **What invokes the skill, and how often.** §9.1 makes generation deliberate;
  nothing yet says whether that is after a process change, before showing the
  guide to somebody, or on a schedule. §10's footer makes a stale copy
  detectable, which is what lets this stay unanswered for now.
- **Whether the simulator's choreography needs its own review cadence.** It is
  the piece generation does not reach (§7), and nothing currently prompts anyone
  to re-watch it after a stage change. The dating covers detection; it does not
  schedule a look.
- **Whether section 8's `portable: true` markers survive contact with a real
  fork.** Nobody has done one. The list is a claim about what carries the
  process, and the only test of it is somebody trying.
