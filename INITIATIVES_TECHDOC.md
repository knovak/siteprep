# Initiatives publishing techdoc

How `initiatives/` is validated and published. `INITIATIVES_VISION.md` is the
design; this is what the build actually does.

## Source layout

Each immediate subdirectory of `initiatives/` is one initiative. Only
`initiative.json` is required.

```text
initiatives/
  sweep.json               # optional sweep configuration
  <slug>/
    initiative.json        # required - stage, value, outputs, todo
    wish.md                # the goal in the user's own words
    objectives.md decisions.md spec.md plan.md test-plan.md log.md notes.md
    overview.md            # optional narrative, appended to the overview page
```

**There is no `index.html` in the source.** Unlike a deck, an initiative's pages
are generated - see below. Nothing generated is committed.

## `scripts/initiatives.mjs`

`build.sh` reads `deck.json` with `grep` and `sed`, deliberately avoiding a `jq`
dependency. That is fine for flat string fields and does not survive nested
`todo[]` and `outputs[]` arrays, so this part of the build is Node. It uses only
`node:` built-ins - no new npm dependency.

| Subcommand | Output |
|---|---|
| `validate` | Warnings on stdout, errors on stderr; exit 1 if any error |
| `list` | One slug per line |
| `toc` | The initiatives TOC page body |
| `page <slug>` | One initiative's overview page body |
| `docs <slug>` | `file|output|title` per renderable document |
| `doc <slug> <file>` | A rendered markdown document as a page body |
| `title <slug>` | The display title |
| `digest [--json]` | The sweep survey - what needs attention |
| `select [--json]` | Which items a run should work on, ranked and budgeted |
| `complete <slug> <item>` | Remove a finished item, unblock dependents, write the log |
| `check-scope <slug>` | Fail if changed files reach outside the write scope |

Each subcommand prints a **page body**, not a whole page. `build.sh` wraps it
with `toc_page_open` / `toc_page_close`, the same shell the root and demos
indexes use, so page furniture stays defined in one place.

## Generated output

```text
gh-pages/initiatives/index.html              # the TOC
gh-pages/initiatives/<slug>/index.html       # overview
gh-pages/initiatives/<slug>/wish.html        # one page per source .md
```

The overview page is derived entirely from `initiative.json` and the files
present - purpose, status, what's next, what's blocked, outputs, and links to
the documents - so displayed status cannot drift from recorded state. An
`overview.md`, if present, is rendered and appended.

The root index gains an Initiatives card, and `shared/nav_bar/` includes an
Initiatives button, so the collection is reachable the same way decks and demos
are.

## Markdown rendering

Documents are rendered to HTML **at build time**, by a small renderer inside
`initiatives.mjs`. Supported: headings, paragraphs, lists, fenced code,
blockquotes, tables, horizontal rules, links, bold, italic, inline code.

The design recommended a client-side widget, with build-time rendering as the
runner-up "if the build already grows a markdown dependency for another reason".
Validation made this part of the build Node anyway, which is that reason - and
rendering here means no client JS, no `fetch`, and no flash of an unrendered
page. The `.md` file remains the single source of truth and still renders on
GitHub, so the choice stays reversible.

## Decisions

`decisions.md` records questions the initiative was blocked on and how they were
settled - dated, appended, newest at the bottom. It is a rendered document like
any other, and the `answer-decision` skill writes it.

It is deliberately not `log.md`, which records *what happened*; a decision is
*why*, and would be buried among routine entries. It is deliberately not
`objectives.md`, which would get muddier with every amendment.

Keeping it separate gives two things the design already asked for a source for:
the **Alternatives considered** section `spec.md` is expected to carry, and the
protection against a revisit re-arguing a settled question.

## Validation

Two severities, and the split matters: `build_tests.sh` calls `exit 1` and is
invoked from `build.sh`, so a failed check aborts the build and blocks the
deploy of the **whole site**. An initiative's empty backlog must never stop an
unrelated deck from publishing.

**Errors** - the data is malformed or unsafe:

- `initiative.json` missing or unparseable
- unknown `stage`
- an `outputs[].path` that does not exist, or contains `..`
- two initiatives declaring the same `outputs[].path`
- a file under a declared output referencing a path under `initiatives/`
- a blocked item with no `blocked_by`, or an unknown blocker prefix
- `blocked_by: todo:<id>` pointing at an item that does not exist
- `sweep.json` unparseable, or `max_items_per_initiative` > `items_per_run`

**Warnings** - the backlog needs attention, reported but never fatal:

- a non-dormant initiative with nothing actionable
- an initiative past its staleness threshold
- a document expected at the current stage that is missing
- an item blocked on a human decision

Two error checks carry most of the weight. **Exclusive output ownership** is
what makes parallel sweep pull requests safe. **`todo:` references must
resolve**, so a forgotten unblock breaks the build instead of stranding an item
in `blocked` forever.

## Last activity

Derived from git - `git log -1 --format=%cI -- initiatives/<slug>/` - rather
than a field in `initiative.json`. A hand-maintained timestamp can be forgotten
or left behind by an edit that touched only markdown; git already knows.

An initiative whose files are not yet committed reports "not yet committed",
which is accurate rather than an error.

## The sweep survey

`initiatives.mjs digest` prints the survey the sweep's first phase calls for:
decisions waiting on a person, blockers now satisfied, items awaiting review,
initiatives waiting on other initiatives, stale initiatives, initiatives with
nothing to do, and a state table.

**It is code, not a prompt.** Every part of that list is derived from
`initiative.json`, the files present, and git - none of it needs judgement - so
it runs in milliseconds, costs nothing, cannot hallucinate a blocker or miss a
stale initiative, and is unit-testable. A model becomes necessary only when the
sweep starts doing work.

The one thing it cannot settle alone is a `review:` blocker, since clearing that
means asking GitHub whether a pull request closed. Those are listed for a caller
that can check rather than guessed at.

`INITIATIVES_DIR` overrides which directory is read, which is how the tests run
against fixtures instead of live work.

### Configuration and the prompt

`initiatives/sweep.json` holds the run configuration; `phases` controls what a
run may do, and must always include `"survey"`. Widening it to `"respond"` or
`"work"` is a reviewable commit rather than an edit to a prompt.

`initiatives/sweep-prompt.md` is the instruction a sweep follows. It lives in
the repo so a manual run and a scheduled run are the same text.

### Selecting and completing work

`select` ranks actionable items the same way every time:
`(initiative value x item value) / effort`, plus a bonus for advancing the
lifecycle and one that grows with staleness. It then applies `items_per_run`,
`max_items_per_initiative`, `max_effort`, and `max_open_prs`, and drops anything
whose `sweep/<slug>/<item-id>` branch is already open.

Like the survey, none of that needs judgement - so leaving it to a model would
only mean the definition of "most important" drifting between runs. **`select`
returns nothing when `phases` omits `"work"`**, so the config, not the prompt,
decides what a run may do.

`complete` performs the §6.3 mechanics in one step: remove the item, flip
anything blocked on `todo:<id>` to actionable, and append a dated `log.md`
entry. It changes `stage` only when given `--stage`, and warns when a
stage-advancing item is completed without one.

`check-scope` compares a list of changed files against
`initiatives/<slug>/**` plus that initiative's declared `outputs[]`, rejecting
protected paths.

### Enforcing the write scope

`.github/workflows/sweep-scope.yml` runs on pull requests from `sweep/*`
branches, reads the initiative slug out of the branch name, and runs
`check-scope` over the diff.

This is the invariant that lets several sweep pull requests merge in any order.
It was previously only a sentence in a prompt; now a violation fails CI whether
or not the agent remembered the rule.

### Scheduled digest

`.github/workflows/initiatives-digest.yml` runs twice daily and keeps a single
`Initiatives digest` issue current. It needs no model and no secrets beyond the
default `GITHUB_TOKEN`.

Because noise is the failure mode of a twice-daily job, the issue **body** is
refreshed silently - editing a body does not notify - and a **comment**, which
does notify, is posted only when the set of decisions waiting on a person
changes. If nothing is waiting on anyone and no issue exists, it does nothing at
all.

The checkout uses `fetch-depth: 0`; last activity comes from git history, and a
shallow clone would report every initiative as touched today.

## Build-time checks

`scripts/build_tests.sh` runs `initiatives.mjs validate` and then verifies:

- the initiatives index is generated
- every initiative has an overview page, and is linked from the index
- no raw `.md` is published under `initiatives/` - documents are rendered

`tests/initiatives-digest.test.mjs` covers the survey, and
`tests/initiatives-sweep.test.mjs` covers selection, completion, and the scope
check - both against fixtures in `tests/fixtures/initiatives/`, using
`node:test`. The completion tests copy the fixtures to a temporary directory,
since they mutate state.

`initiatives/sweep-setup.md` documents how to schedule a run and what any
scheduler has to provide.

`tests/e2e/initiatives.spec.js` covers the rendered result: the TOC explains
what an initiative is, entries link to overview pages, the nav bar carries the
Initiatives button, and document links never point at raw markdown.
