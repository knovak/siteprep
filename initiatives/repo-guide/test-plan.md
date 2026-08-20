# Test plan

How we know it works. `plan.md` ends every phase at a section of this document,
so "phase complete" is something that passes rather than something somebody
decides.

Numbered references to **O1–O9** are the objectives; **§n** is a section of
`spec.md` unless it says `plan.md`.

## 1. What testing is for here

`objectives.md` names the failure this initiative is about: **a guide that is
beautiful on the day it ships and wrong a month later.** Not a crash and not a
blank page — a document that renders perfectly and describes a process that has
moved on, read by somebody who has no way to tell.

So the top-level rule is narrower than "test what matters": *a test earns its
place by making a wrong claim visible, or by making a stale copy detectable.*
Everything in §5 answers to one of those two.

Three consequences shape the rest of this document.

**Most of what could be wrong is not a bug.** The generator either resolves a
fact or fails; the interesting failure is a sentence that is true today, states a
value it should have taken from a token, and quietly stops being true. That is
checked by §4's third rule — a build check, not a test — and this document's job
is to pin the check rather than to re-implement it.

**The one test that matters most fails because of a change made somewhere else.**
Rename a stage in `scripts/initiatives.mjs` and the guide must fail to generate
rather than emit the old name. It is the only assertion here that is about the
repository rather than about this initiative, and it is the whole of O9.

**And one thing cannot be automated at all.** `objectives.md`'s own measure is
that somebody who has not worked in this repository reads the description and can
then say what stage an initiative is at and what would move it on. No suite
detects a guide that is accurate, complete and unreadable, so §4.3 asks for a
person and `plan.md` §4 gates on it.

## 2. Layers, and what goes in each

| Layer | What it covers | Why there |
|---|---|---|
| **Unit** | The fact resolver: each key from its one source, rule-4 uniqueness, an unresolvable key raising rather than defaulting. The text-derived readers against fixture files. The token substituter | Total functions of their input, and every place a plausible wrong answer is possible |
| **Check** | §4's three rules, run as part of every generation: unknown token, uncited fact, literal stage name or budget number | Not a separate suite — a generation that would violate one does not produce a file. Tested here by generating fixtures that violate each one |
| **Drift** | A fixture copy of `scripts/initiatives.mjs` with a stage renamed, and a fixture initiatives directory via `INITIATIVES_DIR` | O9. The only tests that fail because of a change elsewhere |
| **Browser** | The three generated files: they open from `file://` with no network, no console error, every authoritative link resolves, the deck advances, the simulator steps end to end and returns to its start | O4 and O7 are claims about a screen, so they cannot be checked below one |
| **Measured** | Composed words against resolved tokens per section; slides per section; the deck's total | Numbers that decide things (`plan.md` §5) rather than numbers that pass or fail |
| **Manual, once** | A reading by somebody who has not worked here; a walk-through of the simulator; a ten-minute presentation of the deck | `objectives.md`'s three measures, and none of them is automatable |

### 2.1 Why none of this runs in the repository's test suite

`plan.md` §3.3 argues it and this is the consequence: the browser checks live in
`initiatives/repo-guide/work/guide/test/` with their own Playwright config, and
`npm test` never sees them. Two reasons, and the second is why it is a decision
rather than a compromise.

Declaring `tests/repo-guide/` in `outputs[]` fails validation, because a declared
output may not reference a path under `initiatives/` and every browser check here
must open one. And a spec file under `tests/` would run on every pull request to
this repository against artefacts that are generated on request and never
committed — so it would fail on a change to an unrelated deck, which is the
coupling §9.1 removed from the build reappearing in the test suite.

**What this costs, stated plainly:** nothing catches a regression in the
generator except generating the guide. That is the same exposure §9.1 already
accepted for the guide itself, and it is why `plan.md` §4 makes each phase's exit
a run of these checks rather than a green CI badge.

### 2.2 The fixtures are a miniature repository, not a mock

The fact resolver's input is a repository. Mocking it — handing the resolver a
prepared object where the files would be — tests the substituter and nothing
else, and the failures worth catching are all in the reading.

So the fixtures are **real files in the shapes the real ones have**: a cut-down
module with the five exported constants, a `sweep.json`, a workflow file, a
`SKILL.md`, a `build.sh`, and an initiatives directory with two initiatives in
it. `INITIATIVES_DIR` already exists as an override in `scripts/initiatives.mjs`,
so the two facts read from the initiatives directory need no new seam; the rest
do, which is a design requirement rather than a testing preference:

> **The resolver takes its source paths as configuration.** A generator that
> hard-codes `scripts/initiatives.mjs` cannot be pointed at a fixture copy, and
> the drift test — the one test O9 is made of — cannot then exist at all.

## 3. Fixtures

Committed under `work/guide/test/fixtures/`. Small enough to read and diff.

**The miniature repository**

- **`repo-ok/`** — every source in its real shape, with values chosen to be
  obviously not the real ones: three stages, two blocker classes, a two-phase
  sweep. Nothing in an assertion should be a value that would also be right by
  accident.
- **`repo-renamed-stage/`** — `repo-ok` with one stage renamed. The drift test.
- **`repo-missing-export/`** — the module with an export removed, for the
  unresolvable-fact path.
- **`repo-two-sources/`** — a fact key wired to two sources, for §3.1's rule 4.
- **`repo-odd-yaml/`** — a workflow file in a shape the reader was not written
  for: a folded `on:` block and a job name in quotes. Whatever phase 0 concludes,
  this fixture is what says the reader fails rather than guesses.

**The content**

- **`sections-ok/`** — three sections, one marked for slides, exercising the
  page/slide split and a resolving token.
- **`sections-unknown-token.md`** — a token naming a fact that does not exist.
- **`sections-literal-stage.md`** — a stage name in backticks, a run of three
  stage names, and a bare occurrence in ordinary English. One file, three
  outcomes: error, error, warning.
- **`sections-literal-budget.md`** — a budget value written as a digit, and a
  date containing the same digit. One must fail and the other must not.
- **`sections-slide-missing.md`** — `slide: true` with no slide text.
- **`sections-uncited-fact.md`** — a valid set that cites nothing, for the
  warning tier.

## 4. Phase exit tests

Each section is the gate for the matching phase in `plan.md` §4.

**Rows beginning `Measured:` or `Manual:` need a person**, and a phase can be
entirely written, fully green, and still not exit. "Code complete" and "phase
complete" are two states.

### 4.0 — The four unproven extractions

Not software, so the exit is evidence rather than a passing suite: a dated
`decisions.md` entry per target, each answering the same three questions.

| Target | What has to be established |
|---|---|
| `structure.content_areas` from `scripts/build.sh` | Which construct names a content area, and whether it can be read without executing the script |
| `workflows.*` from `.github/workflows/*.yml` | Whether job names and `on:` triggers can be read without a YAML parser — there is none in this repository and `package.json` is outside the write scope |
| `skills.*` from `.claude/skills/*/SKILL.md` | That frontmatter `name` and `description` are reliably delimited, including a description spanning lines |
| `sweep.phase_summaries` and `sweep.rules` from `initiatives/sweep-prompt.md` | Which heading level and which list are being read, and what happens when a `## Phase n` heading is renamed |

Three questions per target, and the third is the exit condition:

1. Can the value be read from the file as it stands today?
2. What shape is the reader assuming?
3. **What does it do when it meets a file that does not have that shape?** The
   answer must be *fail*, demonstrated against a deliberately odd file, not
   *return something*. A target whose reader cannot be made to fail loudly is
   dropped from §3.2, and the guide loses the sentences that would have cited it.

### 4.1 — The fact set

| Test | Pass condition | Protects |
|---|---|---|
| Every key resolves | Each key in §3.2 returns a value from `repo-ok/`, and the value is the fixture's, not the real repository's | §3.2 |
| One source per key | The registry rejects `repo-two-sources/` at load, naming both | §3.1 rule 4 |
| **Unresolvable is an error** | `repo-missing-export/` raises; no default, no empty list, no partial file written | §3.3, §9.4 |
| Imported, not parsed | The five constants come from an import; corrupting the file's *formatting* without changing its values changes nothing | §3.3 |
| The CLI guard holds | Importing the module runs no command and exits nothing | §3.3, and it pins #235 |
| **Drift: a renamed stage** | Generation against `repo-renamed-stage/` fails, and the old name appears in no output | **O9** |
| Drift: a removed sweep phase | A `phases` value absent from the fixture is absent from every artefact | O9 |
| `initiatives.live` stays shallow | Slug, title and stage only; no todo item, no blocker, no summary reaches an artefact | §3.2 |

### 4.2 — The section format and the three checks

| Test | Pass condition | Protects |
|---|---|---|
| Frontmatter and split | `sections-ok/` yields page text and slide text as separate strings; the `---` rule is the boundary | §5.1 |
| Slide text is required | `sections-slide-missing.md` fails generation, naming the section | §2, §5.1 |
| **Unknown token fails** | `sections-unknown-token.md` produces no file, and the error names the token and the section | §4 |
| Uncited fact warns | `sections-uncited-fact.md` generates, and the report names the uncited keys | §4 |
| **Stage name in backticks fails** | The backticked occurrence in `sections-literal-stage.md` is an error | §4, `plan.md` §6 |
| **Three stage names in a row fails** | A spelled-out stage list is an error even without backticks | §4 |
| A bare stage word warns | The ordinary-English occurrence generates, and is reported | `plan.md` §6 |
| Budget digit fails, date does not | `sections-literal-budget.md`: the budget value is an error, the date containing the same digit is not | §4 |
| Blocker prefix fails | `human:` written as a literal is an error | §4 |
| Substitution is total | No `{{` survives into any output, in any artefact | §4 |
| **Measured: the check's own false-positive rate** | How many times each rule fired on the first real drafting pass, and how many of those were the rule being right | `plan.md` §8 |

That last row is not a metric for its own sake. `plan.md` §8 names "the literal
check gets disabled rather than obeyed" as the realistic failure, and the number
that predicts it is how often a writer meets the check while writing something
true.

### 4.3 — The description

| Test | Pass condition | Protects |
|---|---|---|
| Self-contained | Opens from a `file://` path with the network disabled and renders fully — no fetch, no external stylesheet, no sibling asset | §1 |
| No console error | Zero errors and zero failed requests at open | §9.5 |
| **Every authoritative link resolves** | Each "the real answer is here" link points at a file that exists at the sha in the footer | **O7** |
| Provenance footer | The generation date and the short sha are present, and the sha is the one the sources were read at | §10 |
| Nine sections, in order | Every section of §5.2 is present, and `audience` is visible on each | §5.2 |
| Audience is a hint, not a filter | The description renders `forker` and `contributor` sections alike | §5.1 |
| **Measured: composed against derived** | Composed words and resolved tokens, per section, written to `decisions.md` as the first baseline | `plan.md` §6.1 |
| **Manual: somebody who has not worked here reads it** | They can say what stage a given initiative is at and what would move it on, without opening `INITIATIVES_VISION.md` | O2, O3 |

The manual row is the initiative, and it is the one no automated test replaces.
It is also the row most likely to be quietly skipped, which is why `plan.md` §4
makes it part of the exit rather than a follow-up.

### 4.4 — The deck

| Test | Pass condition | Protects |
|---|---|---|
| Self-contained, no console error | As §4.3, for the deck file | §1, §6 |
| **Length is enforced** | Below ten or above twenty rendered slides fails generation, with the count in the message | §6 |
| Slide text is written, not truncated | No slide's text is a prefix of its section's page text | §2 |
| One idea per slide | Slide text over the length limit fails | §6 |
| Keyboard navigation | Forward, back, first and last, from the keyboard alone | §6 |
| Order is `order` | Slides appear in section order, with none of the unmarked sections | §6 |
| The deck cannot contradict the description | Every fact token in a slide resolves to the same value as in the page text — one source, two renderings | §2 |
| **Measured: slides per section** | The mapping actually chosen, and the total, recorded in `decisions.md` | `plan.md` §6, §7 |
| **Manual: ten minutes** | Presented end to end in ten minutes by somebody who does not already know the answers | O5 |

### 4.5 — The simulator

| Test | Pass condition | Protects |
|---|---|---|
| Self-contained, no console error | As §4.3 | §1, §7 |
| **Steps end to end and returns** | Step through all six and back to the start; Back at step 1 and Step at step 6 do nothing harmful | **O4** |
| Play runs the same sequence | Play produces the same states as stepping, and can be interrupted | §7 |
| Vocabulary is derived | Every stage name, blocker class and phase name it shows comes from the fact set — against `repo-renamed-stage/`, the simulator shows the renamed stage or generation fails | §7, O9 |
| The budget step exists | Step 4 shows an item passed over because the budget is spent | §7 |
| The cascade step exists | Step 6 shows a dependent item unblocking and the stage advancing | §7 |
| It reads nothing | No `initiative.json` is read at generation or at open; the choreography is fixed | §7, `decisions.md` |
| **Manual: it is watched** | Somebody steps through it and agrees the six steps describe what the sweep does | O4 |

### 4.6 — Simulator review dating

| Test | Pass condition | Protects |
|---|---|---|
| Current walkthrough stays quiet | A watched date on or after the newest relevant source commit produces no diagnostic | §10 |
| Outdated walkthrough is visible | An older watched date produces a report line with both dates, not a failure | `plan.md` §6.3 |
| The comparison uses only simulator sources | Editing an unrelated file does not advance the comparison; editing `sweep.json` does | §10 |

### 4.7 — The skill

| Test | Pass condition | Protects |
|---|---|---|
| It generates all three | One invocation writes the description, the deck and the simulator into `out/` | §1 |
| It runs the checks | The browser checks run against what was just generated, and their failure is the skill's failure | `plan.md` §3.3 |
| A fact failure reports | An unresolvable fact reaches the person who asked, naming the key and its source; no file is written | §9.4 |
| Nothing generated is committed | After a run, `git status` is clean | §9.2 |
| It names no protected path as a write | The skill's commands read `scripts/` and write only under `work/guide/` | §9.3, `plan.md` §2 |

## 5. The tests that exist to stop a decision drifting

Most of the rows above check that something works. These check that something
stayed *true* — each pins a decision that an ordinary, reasonable change would
undo, and each names the change it is guarding against.

| Pinned | The drift it prevents |
|---|---|
| A renamed stage fails generation | The guide keeps printing a stage that no longer exists, which is the whole failure O9 names |
| An unresolvable fact raises, never defaults | A "sensible default" is added for a missing key, and the guide states it with a straight face |
| The five constants are imported, never parsed | Someone reformats `initiatives.mjs`, the parser copes, and the day it stops coping the guide is silently wrong |
| The CLI dispatch stays behind its guard | An ordinary refactor drops the guard; the CLI keeps working and only the import breaks (§3.3, and it already happened once) |
| Every fact key has exactly one source | A second source is added "because it agrees", and the guide acquires a disagreement with no rule for settling it |
| The literal-stage error tiers stay errors | The check is loosened to a warning after it fires on a true sentence, and the guide reverts to prose nothing checks |
| Slide text is never a prefix of page text | The deck starts truncating, and O5's presentable deck becomes an outline |
| Every artefact carries the sha it was read at | The footer is dropped as clutter, and a copy in circulation becomes uncheckable — which is the whole cost §9.1 accepted |
| The simulator's vocabulary comes from the fact set | Stage names get typed into the animation "just for now", and the one deliverable outside the guarantee stops being merely composed and starts being wrong |
| Nothing generated is committed | `out/` gets checked in so somebody can link to it, and the repository acquires a stale copy with authority |
| The published site never serves `work/` | Delivery is done by copying rather than by §11's nav entry, and O1 is met by something no build reproduces |

## 6. What is not tested, and why

- **The prose itself.** Whether a section explains anything is `objectives.md`'s
  manual measure, and no assertion substitutes for a reader who has not worked
  here. Measured instead, as a composed-to-derived ratio, so that it is at least
  visible when the written half grows.
- **The simulator's choreography.** `plan.md` §6.3 argues it: the six steps are a
  narrative *about* the rules rather than a consequence of them, so a test
  asserting step 4's content pins the words and not their truth. The dated
  watched-marker covers detection; a person covers the rest.
- **The repository's own sources.** This initiative tests that it reads them
  faithfully, not that they are right. A wrong stage list in
  `scripts/initiatives.mjs` produces a guide that faithfully states it, and that
  is correct behaviour.
- **Delivery.** `link-the-guide` is the user's pull request and touches protected
  paths; the row in §5 above is a statement about what this initiative must not
  do instead of it.
- **Anything held out of the first version** — a `.pptx` rendering, the
  simulator's free-play mode, a `CONTRIBUTING.md` entry point.
