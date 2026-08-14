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
    objectives.md spec.md plan.md test-plan.md log.md notes.md
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

## Build-time checks

`scripts/build_tests.sh` runs `initiatives.mjs validate` and then verifies:

- the initiatives index is generated
- every initiative has an overview page, and is linked from the index
- no raw `.md` is published under `initiatives/` - documents are rendered

`tests/e2e/initiatives.spec.js` covers the rendered result: the TOC explains
what an initiative is, entries link to overview pages, the nav bar carries the
Initiatives button, and document links never point at raw markdown.
