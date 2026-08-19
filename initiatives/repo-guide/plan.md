# Plan

How the Repo Guide gets built, in order. `spec.md` says what is made; this says
what is made *first*, and why that order rather than another. `test-plan.md` is
its other half — every phase below ends at a named test there, which is what
stops "phase complete" from being a judgement call.

Numbered references to **O1–O9** are the objectives; **§n** is a section of
`spec.md` unless it says otherwise.

## 1. What decides the order

Four rules, applied in this priority, produce the sequence in §4:

1. **What has never touched a real file goes first.** §3.3 records the lesson
   this initiative already paid for once: "just add an export" was a guess about
   somebody else's file, and it was wrong on first contact. Four of §3.2's
   extraction targets — `build.sh`'s content areas, the workflow YAML, the skill
   frontmatter, and the two keys read out of `sweep-prompt.md` — have had no such
   contact. They are phase 0, and phase 0 is an afternoon.
2. **Then what everything else is written against.** The fact set and §4's
   honesty checks come before a word of narrative, because prose written before
   the checks exist is prose written to be rewritten. The third check — no
   literal stage name, no literal budget number — is a constraint on how every
   sentence in the guide is phrased, and finding that out after the sections are
   drafted means drafting them twice.
3. **Then one artefact end to end before the other two.** The description is
   built first and completely, including the browser checks that open it. The
   deck and the simulator then arrive against a renderer, a footer and a test
   harness that already work, and each is a rendering rather than a project.
4. **What needs the user goes last, and there is almost none of it.** Nothing in
   phases 0–7 waits on anybody. The two steps that do — installing the skill
   where Claude Code will find it, and linking the guide into the site — are both
   *delivery*, both outside a sweep's write scope, and both land together in one
   pull request the user makes at the end (§3.4, §11).

**What the order is deliberately *not* sorted by.** Not by what the initiative is
*for*: O2 and O3 are the description's content and the description is phase 3,
behind two phases of machinery that decide what its sentences may say. And not by
what is nicest to look at — the simulator is the most demonstrable artefact and
it is phase 5, because a walk-through built before the fact set can teach a stage
that does not exist, which is the one thing §7 says it must not do.

## 2. What the plan claims

**The whole build fits inside `initiatives/repo-guide/`.** That is not a
restatement of §9.3, which says the same thing about *protected* paths; it is
stronger, and it is the claim this ordering is arranged to keep. A sweep pull
request may write `initiatives/<slug>/` and that initiative's declared
`outputs[]`, and this plan declares no outputs at all — so every phase below is
buildable by a scheduled run with nothing to hand-land in between.

Two things had to be decided differently for that to be true, and both are in §3.
Neither is a workaround: in each case the arrangement that keeps the build in
scope is also the arrangement that is correct on its own terms.

## 3. Where things live, and the three constraints that hold across every phase

### 3.1 The tree

§9.2's `guide/` tree is rooted at `initiatives/repo-guide/work/`, so the
generator lives at `initiatives/repo-guide/work/guide/`:

```text
initiatives/repo-guide/work/guide/
  .gitignore           # out/
  content/*.md         # the sections of §5
  simulator/           # the walk-through's own source
  build/               # the generator: facts, tokens, renderers, checks
  test/                # the browser checks, and their Playwright config
  out/                 # the three generated files — git-ignored, never committed
```

`work/` is where AGENTS.md puts output under development, and the extra `guide/`
level keeps §9.2's paths readable verbatim and lets the whole tree move intact if
the generator ever graduates to `shared/`.

**The ignore rule is a nested `.gitignore`, not the root one.** Root
`.gitignore` is outside a sweep's write scope, so `out/` is ignored by a
`.gitignore` inside `work/guide/`. This is the smallest example of the §2 claim
and worth stating because the obvious move — add a line to the root file — is a
write-scope failure on the first phase that produces a file.

### 3.2 An unresolvable fact is an error from the first line of code

§3.3 states it and §9.4 prices it; the plan's contribution is *when*. The
resolver is built in phase 1 with no default value, no fallback, and no
leave-it-out path, because that is the one property that cannot be added
afterwards: a generator that has ever tolerated a missing fact has callers that
depend on tolerating it, and by phase 6 the code that would have to change is
every renderer.

### 3.3 The browser checks live in the initiative, not in `tests/`

§9.5 says the checks that open the generated files "belong in `tests/` and the
initiative must declare that path in its `outputs[]`". Drafting this found two
reasons that cannot work, and the second is the interesting one.

**It fails validation.** A declared output is scanned for references to anything
under `initiatives/` — `checkOutputIndependence` in `scripts/initiatives.mjs` —
and the rule behind it is AGENTS.md's: a published output may never load code
from a mutable initiative. A browser check for this guide must open
`initiatives/repo-guide/work/guide/out/description.html`, which is precisely the
string the check forbids. Declaring `tests/repo-guide/` would make
`initiatives.mjs validate` fail on the commit that created it.

**And it would put the guide back in front of the site.** `playwright.config.js`
sets `testDir: './tests'` and matches `**/*.spec.js`, with a web server serving
the built site out of `gh-pages/`. A spec file under `tests/` therefore runs on
every pull request to this repository — against a guide that is generated on
request and never committed, so `out/` is empty on a fresh checkout and the check
fails on a change to an unrelated deck. That is the exact coupling §9.1 removed
from the build, reappearing one layer down in the test suite.

| Option | Strengths | Weaknesses |
|---|---|---|
| **Checks in `work/guide/test/`, run by the generator** *(chosen)* | The guide's correctness gates the guide, which is §9.4's rule applied to its own tests. Runs where the artefacts actually exist — immediately after generation, against files that are still there. Needs no output declaration, so the build stays in scope | The repository's default suite does not run them, so nothing catches a regression except generating the guide. That is the same exposure §9.1 already accepted for the guide itself |
| **Checks in `tests/`, output declared** *(§9.5 as written)* | One test suite, one command, the convention every other test in this repository follows | Fails validation, and fails CI on unrelated changes |
| **Checks in `tests/`, skipped when `out/` is absent** | Runs in the default suite when there is something to run | A check that skips itself when the thing it tests is missing passes forever in CI and is only ever exercised by the person who did not need it |

**What follows.** The checks are Playwright specs under `work/guide/test/` with
their own config, invoked as `npx playwright test --config
initiatives/repo-guide/work/guide/test/playwright.config.js`. They open `file://`
URLs with no server, which §1's self-contained files make possible. No npm script
is added, because `package.json` is outside the write scope too — the skill
carries the command, which is where a command belonging to one generator belongs
anyway.

**This is a spec correction, not a plan preference.** §9.5's second bullet and
the `outputs[]` sentence should be rewritten; §6 of this plan lists it with the
other two.

## 4. The phases

Each phase names what it produces, what it explicitly leaves out, and the exit
test in `test-plan.md` that ends it. A phase is over when that test passes and
`log.md` records what was learned — not when the code is written.

### Phase 0 — Prove the four unproven extractions reach

**Produces:** an answer, with evidence, for each of §3.2's four rows that are
read as text rather than imported — `structure.content_areas` from
`scripts/build.sh`, `workflows.*` from `.github/workflows/*.yml`, `skills.*` from
`.claude/skills/*/SKILL.md`, and `sweep.phase_summaries` and `sweep.rules` from
`initiatives/sweep-prompt.md`. A dated `decisions.md` entry per target, saying
what shape the reader has to assume and what it does when the file changes shape.

**Leaves out:** everything else. Nothing here survives into phase 1 except the
finding; the throwaway script is throwaway.

**Why it is first, in one sentence:** the five imported facts are proven and the
other four are guesses, and §3.3 is a written record of what a guess about
another file costs when it is discovered late.

**The one that is most likely to disappoint** is the workflow YAML. This
repository has no YAML parser and cannot acquire one — `package.json` is outside
the write scope — so `workflows.*` is either a narrow reader for the two fields
§3.2 actually wants, job names and `on:` triggers, or the fact is dropped. The
phase decides which, on evidence, and the decision is recorded rather than
absorbed: a hand-rolled reader for a general format is exactly the second
implementation §3.3's middle option warns about, and it is only acceptable
because the two fields it reads are shallow and it fails loudly.

**What a failure here means.** Much less than phase 0 usually does. A target that
cannot be read honestly is dropped from §3.2 and the sentences that would have
cited it are dropped with it — the guide is a little shorter and still cannot
disagree with the repository. The bad outcome is not "no fact", it is a reader
that returns a plausible wrong answer on an unfamiliar formatting, which is why
the exit is evidence rather than code that ran once.

**Exit:** `test-plan.md` §4.0.

### Phase 1 — The fact set

**Produces:** the resolver behind §3.2 — a registry mapping each dotted key to
exactly one source (§3.1's rule 4, enforced rather than intended), the five
imported constants from `scripts/initiatives.mjs`, the JSON reads from
`sweep.json`, the shallow `initiatives.live` read, and whichever text-derived
targets phase 0 approved. Plus the CLI entry point every later phase runs
through, and the drift test of §9.5.

**Leaves out:** every renderer, every token, every word of narrative.

This is the phase O9 is actually made of. Everything else in the initiative is
downstream of the claim that the guide cannot state a stage list that disagrees
with the code, and this is where that claim is either true or a story we tell.

**The drift test is the phase's point, not its afterthought.** Rename a stage in
a fixture copy of `initiatives.mjs` and generation must fail rather than emit the
old name. It is the only test in this initiative that fails because of a change
made somewhere else, which is the whole of "drift is detectable rather than
discovered".

**Exit:** `test-plan.md` §4.1. Advances the stage to `building`.

### Phase 2 — The section format and the three checks

**Produces:** the `guide/content/*.md` reader — frontmatter of §5.1, the `---`
split between page text and slide text — token substitution, and §4's three
checks: an unknown token is an error, an uncited fact is a warning, a literal
stage name or budget number is an error.

**Leaves out:** the sections themselves. The phase ships with two or three
fixture sections that exist to exercise the checks and are deleted in phase 3.

**The third check has to be pinned down before it can be built**, because §4
states it as an intention and it can be implemented three ways. Two of them make
the guide unwritable:

- **Budget numbers.** The check is a whole-token digit match against the current
  values of `sweep.budget` — the four keys §3.2 names, not every number in
  `sweep.json`. Token boundaries matter: a date must not trip the match on a
  single-digit budget value. §4 accepts that a
  sentence legitimately saying "4" has to be rewritten, and that cost stands.
- **Blocker prefixes.** Strict, and easy — `human:`, `data:`, `cost:` with their
  colons are not words anybody writes by accident.
- **Stage names.** Strict is unwritable, and this is the finding. The stages are
  `wish`, `shaped`, `specified`, `planned`, `building`, `refining`, `dormant` and
  `archived` — ordinary English words that a guide *about* a lifecycle made of
  them cannot avoid. "The wish behind a piece of work" is a sentence O2 needs and
  a strict check rejects. So: an **error** for a stage name in backticks (which
  is how this repository writes a stage when it means the stage), an **error**
  for three or more stage names in a row anywhere (a stage list, spelled out),
  and a **warning** for a bare occurrence, which the writer reads and decides.

The warning tier is not a softening. §4 already uses one for an uncited fact, on
the same reasoning: the check that fires on a judgement call belongs in front of
a person rather than in a build gate they will learn to work around. This is the
third of the plan's proposed spec corrections (§6).

**Exit:** `test-plan.md` §4.2.

### Phase 3 — The description, and the harness that opens it

**Produces:** the nine sections of §5.2, page text only; the description
renderer — one self-contained HTML file, styling and script inline; §10's
provenance footer with the generation date and the short sha of the sources; and
`work/guide/test/`, the browser checks of §3.3 above, with the config that runs
them against `file://`.

**Leaves out:** slide text, the simulator, and simulator review dating.

**This is the largest phase and it is deliberately not split.** The nine sections
are one document with one argument; drafting five of them and stopping produces
half an explanation, which is not an increment of anything. Section 3 — who
supplies what, per stage — is the one `objectives.md` calls hardest, because it
is the only section whose material is spread across all five existing documents
rather than derivable from one.

**What arrives here rather than later:** the footer, because §10 says a guide
generated on request travels and the footer is what lets somebody holding a copy
work out whether it still describes the repository; and the browser harness,
because "opens with no console error and every authoritative link resolves" is
this phase's exit and not a nicety to be added once three artefacts exist.

**Exit:** `test-plan.md` §4.3, including the first count of composed words
against derived tokens (§6.1).

### Phase 4 — The deck

**Produces:** slide text in the sections marked for it, the deck renderer, the
10–20 length check of §6, and keyboard navigation — one self-contained file.

**Leaves out:** any change to the description. If the deck needs a section to say
something the description does not, that is §2's compromise surfacing, and it is
resolved in the section file rather than by forking the source.

**The arithmetic does not work as specified**, which is the second of §6's
corrections and is settled here because this is the phase that trips over it:
§5.2 fixes the section list at **nine**, §6 fails generation below **ten slides**,
and a rendering of nine sections is nine slides however they are marked. The plan
proposes that a section carries an *ordered list* of slide texts rather than
exactly one, and that the check counts rendered slides rather than marked
sections. That keeps everything §2 and §6 were protecting — slide text is
written, never truncated; one idea per slide; the source is still one document —
and it makes the lifecycle section — one section covering eight stages — able to
be the several slides it obviously is.

**Exit:** `test-plan.md` §4.4.

### Phase 5 — The simulator

**Produces:** §7's six-step walk-through with Step, Back and Play, in one
self-contained file, with its stage names, blocker classes and phase names taken
from the phase 1 fact set.

**Leaves out:** free play, the real backlog, and any implementation of the
sweep's rules. `objectives.md` puts the first out of the first version and
`decisions.md` settled the second.

**Why after the deck and not before.** The simulator is the one deliverable
outside decision 1's guarantee — the choreography is composed and can disagree
with the repository the first time a stage changes. Building it last means it is
composed against a fact set that already exists, so the vocabulary is derived
from the first line rather than retrofitted, and the part that can drift is
narrowed to the sequence of steps.

**The two steps that carry the phase** are §7's own: the passed-over item in step
4, because the budget is the part of the sweep newcomers do not expect, and the
cascade in step 6, when a merge unblocks something else. A version that shows one
initiative moving cleanly through its stages is a stage table with animation, and
it is not what O4 asks for.

**Exit:** `test-plan.md` §4.5.

### Phase 6 — Simulator review dating

**Produces:** a hand-set last-watched date in `build/dating.mjs` and §10's
comparison with the newest commit touching the lifecycle and sweep sources the
simulator uses. When those sources are newer, generation reports that another
walkthrough may be due without refusing to generate.

**Small, and that is the payoff for the order.** The simulator and its exact
source list already exist, so the comparison adds no metadata file and no
second source registry.

**Exit:** `test-plan.md` §4.6.

### Phase 7 — Package it as a skill

**Produces:** `.claude/skills/generate-guide/SKILL.md` — a
description that triggers on a request for the guide, the command that generates
all three artefacts, the command that runs the browser checks against what it
just generated, and what to do when a fact fails to resolve (report it; §9.4).

**Installed.** The skill lives at `.claude/skills/generate-guide/`, which is
where both Claude Code and Codex discover it. It was originally written under
this initiative's `skills/` and moved when AGENTS.md changed to put skills in
`.claude/skills/` by default — a skill nobody can invoke is not a delivered
skill. `.claude/skills/` is outside a sweep's write scope, so a later change to
this skill is landed by the user rather than by a sweep.

**Thin by construction.** Every command it names exists and is tested by the time
this phase starts, which is why it is a small item at the end rather than the
scaffolding at the beginning.

**Exit:** `test-plan.md` §4.7. This is the **last build item**, and
`link-the-guide` is blocked on it.

### Then: delivery, which is the user's

`link-the-guide` (§11) is the last item in the backlog and the first thing in
this initiative that a sweep cannot do. It needs a nav entry in `shared/nav_bar/`
and a line in `scripts/build.sh`, both protected paths, and it should carry the
skill install of phase 7 in the same pull request — two out-of-scope steps, one
change, made once when there is something to link. **Until it lands, O1 is not
met**, which §11 records and this plan does not soften.

## 5. What each phase leaves behind

Every phase ends with three things, and the third is the one that is easy to skip:

- the exit test passing;
- a `log.md` entry saying what happened;
- **a `decisions.md` entry for anything the phase settled that the spec left
  open** — the shape each text-derived reader assumes, the exact form of the
  literal check, the composed-to-derived ratio, the slide count per section. A
  rule learned in an afternoon and then buried in a regular expression is a
  decision nobody can revisit, and the next person to read it has no way to tell
  whether it was reasoned or guessed.

## 6. The questions §12 left, answered

Four were open. Three are answered here by reasoning; one cannot be answered by
anybody yet, and this plan says who produces the evidence rather than guessing.

### 6.1 How much composed prose there is — *a ratio, measured from phase 3*

§3 draws the derived/composed line but not how long the written half runs, and
calls it a drafting judgement. It is, but an unmeasured one drifts in a
predictable direction: composed prose is faster to write than a fact is to
extract, so the guide gets longer and less checkable one convenient sentence at a
time.

So the plan asks phase 3 for a number rather than a limit: **the count of
composed words and of resolved tokens, per section, recorded in `decisions.md` as
the first baseline.** A section with no token in it is not forbidden — section 8,
"taking this elsewhere", is mostly composed by nature — but it is visible, which
is enough. There is nothing to compare against until the number exists, and
inventing a threshold now would be inventing the wrong one.

### 6.2 What invokes the skill, and how often — *two occasions, neither scheduled*

**After a process change that a section describes, and before handing the guide
to somebody.** Not on a schedule, and nothing automates it: §9.1 made generation
deliberate on purpose, and a scheduled regeneration would quietly re-acquire the
thing that decision removed — a guide being rebuilt for nobody, failing for
nobody, on a repository nobody is reading it from.

What makes that safe is §10's footer, and it is worth being precise about the
division. The footer does not keep a copy fresh; it makes a stale copy
*detectable by the person holding it*, which is the property that matters for an
artefact that travels as an attachment. Regeneration is cheap, so the answer to
"is this current?" is always "generate it again and compare the sha", and that is
a better arrangement than a schedule that guesses how often the process changes.

### 6.3 Whether the simulator needs its own review cadence — *yes, using §10's mechanism*

§12 notes that the simulator is the piece generation does not reach and that
nothing prompts anyone to re-watch it after a stage change. Dating covers that
detection directly.

`build/dating.mjs` carries the last-watched date, set by hand when somebody steps
through the simulator. Generation compares it against the newest commit touching
`lifecycle.*` or `sweep.phases` — the facts the choreography depends on — and
when the sources are newer, the generation report says so. A report line rather
than a failure keeps review visible without training people to work around the
generator.

The alternative considered and rejected was pinning the step sequence with a
test. It cannot be done honestly — the steps are a *narrative* about the rules,
not a consequence of them, and a test asserting that step 4 shows a passed-over
item pins the words rather than their truth.

### 6.4 Whether the `portable: true` markers survive a fork — *nobody can say, and the plan will not pretend*

§5.2's section 8 is generated from `structure.content_areas` and
`sweep.protected_paths`, plus a maintained marker for files the generator cannot
classify. §12 is right that the marker list is a claim about what carries the
process, and that the only test of it is somebody forking.

What the plan can do is make the list cheap to correct and self-documenting:
**every marker carries a one-line reason, and the list starts empty.** A file
appears in it only when somebody found it was needed and said why, so the list
grows into a record of what a fork actually took rather than a guess made in
advance. The first fork is the evidence; until then section 8 says what it knows
and the marker list is short, which is the honest state.

## 7. What this plan does not decide

- **The exact section-to-slide mapping.** §6 above proposes that a section may
  carry several slides; which sections carry how many is phase 4's, measured
  against the 10–20 band rather than assigned in advance.
- **Whether `workflows.*` survives.** Phase 0 decides it on evidence, and the
  outcome is a `decisions.md` entry either way.
- **The order of the nine sections in the deck.** §6 renders them in `order`;
  whether the deck's path through them is the description's path is a question
  the deck's first draft answers.
- **Anything held out of the first version** — a `.pptx` rendering, a
  `CONTRIBUTING.md`, the tutorial, the simulator sandbox.

And three things this plan proposes that belong to the spec rather than here.
Each is written where it was found, above; collected so the next revision of
`spec.md` has them in one place:

1. **§9.5's `tests/` instruction cannot be followed** (§3.3). The browser checks
   go in `work/guide/test/` and no `outputs[]` path is declared.
2. **§5.2's nine sections and §6's ten-slide floor contradict each other**
   (phase 4). A section carries an ordered list of slide texts, and the check
   counts rendered slides.
3. **§4's literal ban is unwritable as stated for stage names** (phase 2). Error
   in backticks and in a run of three or more; warning for a bare occurrence.
   Budget numbers and blocker prefixes stay strict.

## 8. The risks worth naming

- **Phase 0 comes back badly on the workflow YAML.** The likeliest single
  failure, and the cheapest: the fact is dropped, the guide loses two sentences,
  and nothing else moves. It becomes expensive only if the answer is "a reader
  that mostly works", which is the option §3.3 already argued against and which
  will look tempting for exactly as long as it takes to meet a workflow file
  written in a shape it did not expect.
- **The literal check is disabled rather than obeyed.** The realistic failure
  mode of §4's third rule: a writer hits it four times in an afternoon, adds an
  exemption, and by the next draft the guide is prose nothing checks. Phase 2's
  warning tier exists to make that unnecessary, and the drift table in
  `test-plan.md` §5 pins the error tiers so that removing one is a test failure
  rather than a config edit.
- **The description is written to the sections rather than to the reader.** Nine
  fixed sections make O2, O3 and O6 each somebody's job, and they also make it
  possible to fill all nine and explain nothing. The check is not automatable:
  `test-plan.md` §4.3 asks for a reading by somebody who has not worked here,
  which is `objectives.md`'s own test and the only one that measures whether any
  of this worked.
- **The simulator is built and then never watched again.** §6.3's dated marker
  makes it detectable; nothing makes it happen. This is a real residual risk and
  it is accepted, on the grounds that the alternative — a test over composed
  choreography — pins the wrong thing.
- **The guide is finished and never linked.** `link-the-guide` is the last item
  and it is the user's to land, so the plausible end state is three good files in
  a git-ignored directory and O1 unmet indefinitely. Pairing it with the skill
  install is the mitigation — one pull request, made once, when there is finally
  something worth linking.
