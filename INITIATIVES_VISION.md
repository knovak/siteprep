# Initiatives — a vision

**Status: draft for discussion. Nothing in this document is implemented.**

This describes a proposed third top-level concept for this repo, alongside `decks/`
and `demos/`. It is written to be read and argued with, not followed.

---

## 1. Why

`decks/` and `demos/` hold *outputs*. Nothing in the repo holds the *work that
produces them* or the *intent behind them*. Today a body of thinking — why a deck
exists, what it still needs, what the next step is — lives in chat sessions, in the
user's head, and in scattered prompt histories. It evaporates between sessions.

An initiative is the missing container for that. It makes intent durable, gives
half-formed ideas a legitimate place to sit before they are good enough to publish,
and — critically — gives an automated agent something to read so it can answer the
question "what should be done next?" without a human framing it every time.

## 2. What an initiative is

> **An initiative is a durable unit of intent, together with the work that pursues
> it and the capability it develops along the way.**

An initiative is not a project. A project ends. An initiative goes **dormant** and
can be revisited — a year later, to produce the next version of the thing, using the
tooling it built the first time.

An initiative holds three kinds of thing:

| | What it is | Lifetime |
|---|---|---|
| **Intent** | The wish, objectives, spec, plan, test plan — the elaboration chain | Grows monotonically; never deleted |
| **Capability** | Skills, scripts, prompts, code libraries the initiative develops | Outlives any single output; reused on revisit |
| **Outputs** | Pointers to what it actually produced | Graduates out of the initiative |

### 2.1 What an initiative can produce

- **One or more decks** of content in `decks/`.
- **A demo** — code that runs as a published example in `demos/`.
- **Code that executes elsewhere** — AWS, a ChatGPT GPT/site, or any environment
  outside this repo. The initiative holds the source and a pointer to where it runs.
- **Capability applied to existing content** — a skill, script, or library that gets
  embedded into a demo, or that *operates upon* decks (e.g. an auditor that checks
  every deck's map markers, or a generator that rebuilds a section).

That last one matters: **an initiative can produce no published artifact at all.**
Its output is capability. Those are still initiatives and still belong here.

## 3. Relationship to decks and demos

**Born inside, graduate out, capability stays.**

```
initiatives/night-sky/            decks/ , demos/                external
  wish.md                                                        (AWS, GPTs)
  spec.md
  work/            ──graduates──▶ demos/SBDC Night Sky/  ──┐
  lib/star-chart/  ──embedded in──────────▲                │
  skills/                                 │                │
  initiative.json  ────pointer to─────────┴────────────────┴──▶ recorded in outputs[]
```

1. Work-in-progress output is built under `initiatives/<name>/work/`. It is not
   published and not subject to deck/demo conventions while it lives there.
2. When it is good enough, it **graduates** — moves to `decks/<name>/` or
   `demos/<name>/`, and from then on follows the normal conventions in `AGENTS.md`.
   The initiative keeps a pointer in `outputs[]`, not a copy.
3. **Capability does not graduate with it.** `lib/`, `skills/`, and `prompts/` stay
   in the initiative, because that is what makes the initiative revisitable. When the
   initiative wakes up to produce version 2, the tooling is right there.
4. If a library becomes broadly useful to *other* initiatives or decks, it graduates
   a second time — into `shared/`, under the existing opt-in-library convention.

| Output kind | Lives during development | Graduates to | Pointer recorded as |
|---|---|---|---|
| Deck content | `work/` | `decks/<name>/` | `{"kind":"deck","path":"decks/<name>"}` |
| Demo | `work/` | `demos/<name>/` | `{"kind":"demo","path":"demos/<name>"}` |
| External code | `work/` or `src/` | stays in initiative; deployed out | `{"kind":"external","url":"..."}` |
| Shared library | `lib/` | `shared/<lib>/` when widely used | `{"kind":"capability","path":"shared/<lib>"}` |
| Skill / prompt | `skills/`, `prompts/` | stays in the initiative | `{"kind":"capability","path":"initiatives/<n>/skills/x"}` |

Nothing about existing decks or demos changes, and no migration is required.

## 4. Folder layout

```
initiatives/
  <initiative-name>/
    initiative.json      # required — the machine-readable state
    wish.md              # required — the original vague goal, in the user's words
    objectives.md        # what "done" would mean, once it can be said
    spec.md              # what it is
    plan.md              # how it gets built, in steps
    test-plan.md         # how we know it works
    log.md               # append-only record of what happened and when
    prompts/             # reusable prompts for ongoing work on this initiative
    notes/               # research, references, dead ends
    work/                # in-progress output, pre-graduation
    lib/                 # code libraries this initiative develops
    skills/              # skills this initiative develops
```

**Only `initiative.json` and `wish.md` exist at birth.** Every other document appears
as the lifecycle advances. This is deliberate: **the absence of a document is itself
the signal for the next step.** An initiative with a wish and no objectives has an
obvious next action, and the sweep job (§7) can see it without being told.

## 5. Lifecycle

| Stage | What exists | What advances it | Typical next step |
|---|---|---|---|
| `wish` | `wish.md` — a vague goal, possibly one sentence | Turning desire into stated outcomes | Draft `objectives.md` |
| `shaped` | + `objectives.md` | Deciding what the thing actually *is* | Draft `spec.md` |
| `specified` | + `spec.md` | Breaking it into ordered work | Draft `plan.md` (and `test-plan.md`) |
| `planned` | + `plan.md` | Doing the first step | Build the first increment in `work/` |
| `building` | `work/` has real content | Reaching publishable quality | Next plan step, or graduate |
| `refining` | Output has graduated | Feedback, polish, follow-on versions | Work the todo list |
| `dormant` | Nothing actionable, by choice | A new wish, or an external trigger | Nothing — this is a resting state |
| `archived` | Explicitly retired | — | Nothing, ever |

Two rules make the lifecycle useful rather than decorative:

- **Stages are declared in `initiative.json` and cross-checked against files present.**
  A validator flags `"stage": "specified"` with no `spec.md`.
- **Stages can move backwards.** A `refining` initiative that gets a new wish for
  version 2 goes back to `shaped`. Regression is normal and is not failure.

## 6. `initiative.json`

Mirrors the existing `deck.json` convention — small, optional-where-possible, one file
per directory. Humans read the markdown; the job reads this.

```json
{
  "title": "Migration Atlas",
  "summary": "Interactive map of historical human migration, as a demo and a reusable map library.",
  "stage": "refining",
  "value": "high",
  "updated": "2026-08-12",
  "outputs": [
    { "kind": "demo",       "path": "demos/migration_map",     "status": "published" },
    { "kind": "capability", "path": "initiatives/migration-atlas/lib/basemap", "status": "internal" }
  ],
  "todo": [
    {
      "id": "add-1500-1800-layer",
      "title": "Add the 1500-1800 migration layer",
      "state": "actionable",
      "value": "high",
      "effort": "medium",
      "advances_stage": false
    },
    {
      "id": "test-plan",
      "title": "Write test-plan.md covering layer toggling and basemap fallback",
      "state": "actionable",
      "value": "medium",
      "effort": "small",
      "advances_stage": true
    },
    {
      "id": "source-african-data",
      "title": "Source pre-colonial African migration dataset",
      "state": "blocked",
      "blocked_by": "human:need a decision on which academic source to license",
      "value": "high"
    }
  ]
}
```

### Field notes

- `stage` — one of the §5 values.
- `value` — `high` / `medium` / `low`. The initiative's own worth, used to rank across
  initiatives.
- `todo[].state` — `actionable` or `blocked`. (Completed items are removed and recorded
  in `log.md`, so the file stays short and always reads as "what's left".)
- `todo[].blocked_by` — **required when blocked**, and namespaced so the blocker is
  legible: `todo:<id>` (waiting on another item), `human:<question>` (waiting on a
  decision only the user can make), `external:<thing>` (waiting on the world).
- `todo[].advances_stage` — true when doing this item moves the initiative to the next
  lifecycle stage. These get a ranking boost, because a stalled lifecycle is the
  specific failure this system exists to prevent.
- `todo[].effort` — `small` / `medium` / `large`. Combined with `value` for ranking.

## 7. The sweep job

A scheduled agent — Claude or ChatGPT — runs **twice daily** across all initiatives.
Two phases, in order.

### Phase 1 — Survey (always)

Read every `initiative.json`, derive state, and produce a **digest**:

- every initiative, its stage, and days since last activity
- its single top-ranked actionable item
- **every `human:` blocker, gathered into one list** — this is the most valuable part
  of the digest, because it is the only thing the job genuinely cannot resolve alone
- initiatives that are stale (no activity in N days) but not marked dormant
- initiatives with zero actionable items that are not marked dormant — a defect

### Phase 2 — Do one (each run)

Pick the **single highest-ranked actionable item across all initiatives**, do the work,
and open **one PR**. Never more than one per run; never self-merged.

Ranking, roughly:

```
score = value(initiative) × value(item) ÷ effort(item)
        + stage_gate_bonus     (item advances the lifecycle)
        + staleness_bonus      (initiative untouched for a long time)
```

The stage-gate and staleness bonuses exist to keep the job from grinding on one active
initiative's easy wins while three others sit at `wish` forever.

### Guardrails

- **One PR per run.** Never merges its own work.
- **Never touches published outputs it does not own.** Only paths inside the initiative,
  plus that initiative's declared `outputs[]`.
- **Never closes its own todo item.** An item is removed when the PR merges — so the
  human review *is* the completion signal.
- **Never invents a wish.** It elaborates existing intent; it does not create new
  initiatives.
- **No actionable work anywhere → it does nothing** and says so in the digest. A quiet
  run is a correct run.
- **Blocked-on-human is escalated, not guessed at.** The digest asks the question, as
  multiple choice wherever the options are enumerable.
- Every run appends to each touched initiative's `log.md`.

### Where it runs

Two plausible hosts, both worth trying:

- a scheduled GitHub Actions workflow invoking Claude Code, alongside the existing
  Pages workflow, or
- a Claude Code on the web Routine on a cron, which needs no repo CI changes.

*(Open question — see §11.)*

## 8. The dashboard

Per the decision that initiatives are **published as a dashboard only**: the individual
documents stay repo-only (readable on GitHub, not on the public site), and
`scripts/build.sh` generates a single `gh-pages/initiatives/index.html` from every
`initiative.json`.

One row per initiative:

| Initiative | Stage | Next actionable | Blocked | Last activity | Outputs |
|---|---|---|---|---|---|
| Migration Atlas | refining | Add 1500–1800 layer | 1 (human) | 2 days ago | [demo](#) |
| Night Sky | building | Fix mobile star labels | 0 | 9 days ago | [demo](#) |
| Deck Auditor | wish | *Write objectives.md* | 0 | 34 days ago | — |

Stale rows and rows with zero actionable items are visually flagged. The dashboard is
the at-a-glance answer to "what is going on across everything", readable on a phone.

## 9. Validation

Extend `scripts/build_tests.sh`, in the spirit of the existing demos checks:

- every directory under `initiatives/` has an `initiative.json` that parses
- `stage` is a known value, and required documents for that stage exist
- every `outputs[].path` actually exists in the repo
- every `blocked_by: todo:<id>` resolves to a real item in the same initiative
- every blocked item has a `blocked_by`
- every non-`dormant`, non-`archived` initiative has at least one actionable item
- the generated dashboard lists every initiative

The last two are the ones that keep the system honest. They convert "we forgot about
this" from an invisible condition into a build failure.

## 10. `AGENTS.md` additions

A terminology block, parallel to the existing Demos one:

- **Initiative collection** — the `initiatives/` directory and its generated dashboard.
- **Initiative** — one immediate subdirectory of `initiatives/`.
- **Initiative document** — a markdown file in an initiative (`wish.md`, `spec.md`, …).
- **Initiative capability** — a skill, script, or library developed by an initiative.
- **Initiative output** — a deck, demo, or external deployment an initiative produced.
- **Sweep** — one scheduled run of the job.
- **Digest** — the survey output of a sweep.

Plus the mirror of the existing rule: do not call an initiative a "deck" or a "demo",
and do not apply deck/section conventions to content under `work/` until it graduates.

## 11. Adoption path

Deliberately slow, because the schema should be proven by hand before it is automated.

| Phase | What happens | Done when |
|---|---|---|
| 0 | This document, revised until it's right | You're happy with it |
| 1 | `initiatives/` exists; **one real initiative written by hand**, no automation | The schema survives contact with a real case |
| 2 | Validation in `build_tests.sh` + dashboard in `build.sh` | Dashboard renders on Pages |
| 3 | Sweep job, **survey phase only** — digest, no changes | Digests are useful for a week |
| 4 | Enable Phase 2 "do one" with PR review | First agent PR merges |

Phase 1 is the important one. Writing a real initiative by hand will expose whichever
part of §6 is wrong, at a point where changing it costs nothing.

## 12. Open questions

1. **Retrofit or forward-only?** Do existing demos (`migration_map`, `SBDC Night Sky`,
   `RMD calculator`) get initiatives written retroactively, or do initiatives only apply
   to new work from here?
2. **Where does the job run** — GitHub Actions on a cron, or a Claude Code on the web
   Routine? (Actions is more visible and repo-native; a Routine needs no CI changes and
   is easier to change.)
3. **Do decks get initiatives too**, or are initiatives mostly for demos and capability?
   A trip deck has a real lifecycle — wish → research → book → refine — and might be the
   best fit of all.
4. **Digest destination** — a GitHub issue that gets rewritten each run, a committed
   `DIGEST.md`, or the dashboard page only?
5. **Is `wish.md` verbatim?** I'd suggest it holds the user's original words unedited,
   permanently, and that elaboration only ever happens in later documents. That preserves
   the initiative's *why* against months of drift.
6. **Staleness threshold** — how many days of no activity before an initiative is flagged?
