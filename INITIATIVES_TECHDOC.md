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
    initiative.json        # required - stage, value, outputs, deployments, todo
    README.md              # optional guide, always rendered and listed when present
    wish.md                # the goal in the user's own words
    background.md          # optional research done before objectives
    objectives.md decisions.md spec.md plan.md test-plan.md log.md notes.md
    releases.md            # written by a production release, never by hand
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
| `propose [--json]` | Which `human:` questions a run should propose answers to |
| `select [--json]` | Which items a run should work on, ranked and budgeted |
| `add <slug> <item>` | Author a new todo item |
| `complete <slug> <item>` | Remove a finished item, unblock dependents, write the log; refuses to leave a live initiative with nothing to do |
| `check-scope <slug>` | Fail if changed files reach outside the write scope |
| `deployments <slug>` | Every deployment, both environment URLs each |
| `deployments <slug> plan --env test\|prod` | What a deployment would do; exit 1 if the release gate blocks it |
| `deployments <slug> record --env test\|prod` | Record a completed deployment |
| `previews` | Demo sources `build.sh` publishes as test previews |
| `brief [candidates]` | Initiatives whose brief is missing or stale |
| `brief <slug> [record]` | One initiative's brief state, or stamp a freshly written one |

Each subcommand prints a **page body**, not a whole page. `build.sh` wraps it
with `toc_page_open` / `toc_page_close`, the same shell the root and demos
indexes use, so page furniture stays defined in one place.

## Generated output

```text
gh-pages/initiatives/index.html              # the TOC
gh-pages/initiatives/<slug>/index.html       # overview
gh-pages/initiatives/<slug>/README.html      # rendered when README.md is present
gh-pages/initiatives/<slug>/wish.html        # one page per source .md
```

The overview page is derived entirely from `initiative.json` and the files
present - purpose, status, what's next, what's blocked, outputs, and links to
the documents - so displayed status cannot drift from recorded state. An
`overview.md`, if present, is rendered and appended.

An initiative `README.md`, if present, is always included in the rendered
documents and listed as **README** on the initiative overview page. It does not
depend on the initiative's lifecycle stage.

The root index gains an Initiatives card, and `shared/nav_bar/` includes an
Initiatives button, so the collection is reachable the same way decks and demos
are.

## Markdown rendering

Documents are rendered to HTML **at build time**, by a small renderer inside
`initiatives.mjs`. Supported: headings, paragraphs, lists, fenced and indented
code, blockquotes, tables, horizontal rules, links, bold, italic, inline code.
Wrapped list-item lines remain in their item, indented child lists remain
nested, and standard angle-bracket URL autolinks render as links.

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
- a leftover `sites` block, which `deployments` replaced
- a deployment with an unknown `kind`, an unrecognised key for its kind, or no
  `source`; a `source` that does not exist or contains `..`; a source missing
  what its kind needs (`index.html`, `package.json`, or the named `root_html`)
- a demo with no `destination`, or a `destination` that is a path
- a recorded environment the kind derives rather than deploys
- a Site environment missing its `slug` or `url`, or with a non-https `url`, an
  unknown access level, or an unrecognised key
- a deployment's `test` and `prod` resolving to the same target
- two initiatives declaring the same deployment target, or one initiative
  declaring two deployments of the same kind
- a blocked item with no `blocked_by`, or an unknown blocker prefix
- `blocked_by: todo:<id>` pointing at an item that does not exist
- `sweep.json` unparseable, or `max_items_per_initiative` > `items_per_run`

**Warnings** - the backlog needs attention, reported but never fatal:

- a non-dormant initiative with nothing actionable
- an initiative past its staleness threshold
- a document expected at the current stage that is missing - `objectives.md`,
  `spec.md`, `plan.md` and `test-plan.md`, each from the stage that adds it.
  `wish.md` has its own check because it is required at every stage;
  `decisions.md`, `log.md`, `releases.md` and `notes.md` are gated by nothing,
  so their absence says nothing
- an item blocked on a human decision
- a test Site slug that is the bare initiative slug, or a production Site slug
  that says "test"

Two error checks carry most of the weight. **Exclusive output ownership** is
what makes parallel sweep pull requests safe. **`todo:` references must
resolve**, so a forgotten unblock breaks the build instead of stranding an item
in `blocked` forever.

## The brief

`initiatives/<slug>/brief.md` is the short answer to "where does this stand?",
rendered at the top of the overview page under **Where this stands**. Four
optional `##` sections: `Done`, `Waiting on others`, `Remaining work`,
`Optional later`.

**It is a summary of the initiative's own documents**, not a new claim about
them - counts from `work/`, remaining work from `plan.md`, deferred items from
`spec.md`. That is what makes writing it a sweep phase rather than a chore: an
agent reading the record can produce it, and check it.

**It is agent-owned, the mirror image of `wish.md`.** The wish is the user's
words and may never be rewritten; the brief is rewritten in full whenever the
initiative moves, so a hand-edit is discarded by the next refresh. A correction
belongs in the document the brief summarised. The file carries a header saying
so, because a rule nobody reads does not stop anybody editing.

**Two rows are never in it.** What the initiative needs from the user comes from
the blocked todo items, and the deployment state from git. Both are rendered
around the brief rather than inside it: a summary that paraphrased a blocker
could soften or misstate what is owed, which is the one thing on the page that
has to be exact.

### Staleness is computed, not remembered

`initiative.json` carries the stamp, written only by `brief <slug> record`:

```json
"brief": {
  "generated_at": "2026-09-06T02:14:07Z",
  "commit": "1a69f28…",
  "digest": "c977302d23f28021…"
}
```

`digest` is a SHA-1 over `git ls-tree -r HEAD` for the initiative directory
**with `brief.md` removed** - otherwise writing the brief would invalidate its
own stamp. It changes exactly when there is something new to summarise, so a
comparison answers "is this brief still true?" without reading a word of it.

| `briefState` | Means |
| --- | --- |
| `absent` | No `brief.md`. A warning from `building` on; the sweep writes one |
| `current` | The digest matches - nothing has changed since it was written |
| `stale` | Files have moved since; `behind` counts the commits where the stamped commit survives |
| `unknown` | No stamp, or git cannot answer |

Reading from `HEAD` rather than the working tree is deliberate: a brief is
stamped against committed work, so it describes something a reader can go and
look at. The consequence is an ordering the skill states - commit the work, then
write and stamp the brief.

Only `building` and `refining` carry a brief (`BRIEF_STAGES`). Before that an
initiative's own documents *are* the summary; a resting stage keeps whatever
brief it had, which is exactly what you want when returning to a dormant one.

## Deployments

Most initiatives are not deployed at all, and an initiative may develop for
months before it is - so `deployments` is absent by default, added when there is
something to publish, and may change kind late without anything else in the
initiative moving. It is a list because nothing stops an initiative from having
both a demo and a Site.

```json
"deployments": [
  {
    "kind": "chatgpt-site",
    "build": "static",
    "source": "initiatives/tide-here/work/site",
    "test": {
      "slug": "tide-here-test",
      "url": "https://tide-here-test.ken-novak.chatgpt.site/",
      "access": "private",
      "deployed_at": "2026-08-26T14:03:11Z",
      "version": 7,
      "commit": "5e3f1c0..."
    },
    "prod": { "slug": "tide-here", "url": "…", "access": "public", "version": 3, "commit": "17f2136..." }
  },
  {
    "kind": "demo",
    "source": "initiatives/repo-guide/work/guide/out",
    "destination": "Guide to Initiatives",
    "root_html": "description.html",
    "prod": { "deployed_at": "2026-08-26T00:25:25Z", "commit": "3dd55f6..." }
  }
]
```

Only `kind` and `source` are required. `deployed_at`, `version`, `commit` and
`tree` are written by the deploy skills, not by hand.

### Kinds

A **kind** decides which environments exist, which of them are recorded rather
than derived, what the source directory has to contain, and which engine
deploys it. Adding a deployment scheme means adding a `KINDS` entry and a skill
- not touching the validator, the plan, the record, or the page.

| Kind | `build` | Source must have | Engine | Production is live |
| --- | --- | --- | --- | --- |
| `chatgpt-site` | `static` | `index.html` | `deploy-to-chatgpt-sites` | immediately |
| `chatgpt-site` | `sites-app` | `package.json` | the platform's `sites-hosting` workflow | immediately |
| `demo` | — | `index.html`, or the named `root_html` | `deploy-demo` | when the branch merges to `main` |

Bookmark Sorter's renderer also owns its browser-local Day/Night preference.
Its CSS palettes, pastel button washes and touch targets, before-paint
preference restoration, storage fallback, and selection/focus outlines are documented in
[`initiatives/bookmark-sorter/work/README.md`](initiatives/bookmark-sorter/work/README.md).
This preference does not change deployment access or persist bookmark data.

`sites-app` exists because Bookmark Sorter is a full Sites project - it brings
its own `.openai/hosting.json`, D1 and R2 bindings, and migrations, and builds
itself. The static-folder engine cannot deploy that, and pretending otherwise
was the reason it had no home under the first version of this schema.

A production Site is a **separate Site** from the test one: its own database,
its own storage, starting empty. Test data does not travel with a release.

**Access belongs to the user, and defaults to private.** Either environment may
be private or public. `plan` reports `access` - the recorded level, or `private`
as the default - and `confirm_access`, true when that environment has never been
deployed and the default has therefore not been agreed to. The skills tell the
user it will be private unless they say otherwise and take their answer; a
replacement keeps the access the Site already has, so refreshing a preview can
never quietly change who can see it. `record` also defaults to `private` when no
access is passed, so nothing becomes public by omission.

### Two environments, everywhere

`test` is overwritten as often as the work needs it, by whichever agent is doing
the work. `prod` moves only when a person runs the release skill. That asymmetry
is the whole feature, and three things protect it:

- `test` and `prod` may never resolve to the same target. That is a validation
  **error**, and `record` refuses it as well - so it holds whether the pair was
  written by hand or by a deployment.
- **`deployments <slug> plan --env prod` exits non-zero** when the source
  directory has uncommitted changes, or has never been committed. Production is
  released from committed files, so the `commit` recorded against a release is a
  reference you can go back to. Making this an exit code rather than an
  instruction is the point: a prompt can be talked out of refusing.
- The naming convention - `<slug>-test` and `<slug>` - means a Site URL itself
  says which environment you are looking at. The skills derive those names for
  new Sites; the validator only warns, because renaming a live Site is not free.

The dirty-source check is scoped to the deployment's `source`. Uncommitted work
elsewhere in the repository is none of a release's business.

### Currency: what each environment holds

`environmentCurrency(entry, env)` answers "is what I am about to open the
current work, or something older?", against main's source directory:

| Verdict | Means |
| --- | --- |
| `current` | The deployed content matches main's source |
| `behind` | Main has moved on; `behind` counts the commits since |
| `ahead` | Deployed from a branch that has not merged |
| `differs` | The content is not main's, and the recorded commit cannot place it |
| `unknown` | Nothing recorded, or the recorded commit is unreachable |
| `none` | Not deployed |

`currencySummary` turns the pair into the sentence that carries the actual
information - "main is on test, not released", "released, with newer work on
test" - because the relationship between the two is the thing a reader wants
and neither verdict states it alone.

**It is keyed on the source directory's tree hash, not the commit.** This
repository squash-merges: a deploy made on a branch records that branch's
commit, and the merge discards it. Six of the nine deployment commits recorded
before this existed are already unreachable, five of them test records - so a
currency check built on commit ancestry would have answered "unknown" for
almost every test environment. A tree hash depends only on file content, so the
same files give the same hash whether they arrived by squash, merge or rebase.

`record` writes `tree` alongside `commit` from that point on. Records that
predate it keep only a commit, fall back to resolving its tree, and degrade to
`unknown` when it has been squashed away - which is honest, and fixes itself on
the next deploy. The commit is still used, where it resolves, to say which
*direction* a difference goes; without it the answer is `differs`.

**A kind need not have an engine for both environments.** A demo has no test
copy for a skill to write: `scripts/build.sh` publishes it, by copying every
demo deployment's `source` into `preview/initiatives/<slug>/` on every build.
Pushing the branch is therefore the deploy, and the preview appears when that
branch's Pages build finishes. Recording a `test` entry on a demo is still an
error, and `record --env test` refuses it — there is nothing to record.

A demo's URLs are *derived* rather than stored, so neither can drift out of step
with what is published:

| Environment | Path | Changes when |
|---|---|---|
| `prod` | `demos/<destination>/` | someone runs `release-initiative` |
| `test` | `[branch/<branch-with-slashes-as-dashes>/]preview/initiatives/<slug>/<root_html>` | any build of that branch |

**The preview directory is why a demo has a test environment at all.** Before
it, a demo's test URL was `demos/<destination>/` under the branch preview — but
that directory holds the *last release*, and only a release changes it. The
preview URL either 404ed, before the first release, or served the previous
release forever after, while `plan` reported the environment as deployed. So
"deploy the test site" could not show a demo's work in progress, which is the
one thing a test environment is for. Publishing the source separately fixes
that, and incidentally stops a demo's two environments resolving to one URL on
`main`, which every other kind is forbidden from doing.

`preview/` is build output, not a directory in the repository, and it carries no
injected footer, so a preview page renders exactly as the released copy will.
The build fails if a deployment's `root_html` is missing from the copy. The
Pages base comes from the `origin` remote, so a fork or a rename needs no edit
here.

### The subcommands

```text
previews [--json]                       demo sources the build publishes as test previews
deployments SLUG                        every deployment, both environment URLs each
deployments SLUG plan --env test|prod [--kind KIND] [--since REF]
                                        what a deployment would do; exits 1 if blocked
deployments SLUG record --env test|prod [--kind KIND]
    chatgpt-site: --site-slug S --url U [--access private|public] [--version N]
    demo:         (no target arguments - the URL comes from the destination)
    both:         [--commit SHA]
```

`previews` is what `build.sh` reads, as tab-separated
`slug<TAB>source<TAB>path<TAB>root_html`, so the preview path is defined once in
`initiatives.mjs` rather than parsed out of `initiative.json` by the build.
Deployments whose source cannot be published are omitted; `validate` is what
reports those, since one broken deployment must not fail the whole build.

`--since REF` adds a `since` block to the plan: the commits that have touched
this deployment's `source` between `REF` and `HEAD`, and whether there are any.
The sweep's deploy phase uses it to skip an initiative whose run only edited
`log.md` and `initiative.json` — nothing a reader would see changed, so a
redeploy would say nothing. `since.known` is false when git cannot compare (an
unknown ref, a shallow clone), which is a different answer from "nothing
changed" and the caller is expected to treat it as such.

`--kind` is needed only when an initiative has more than one deployment;
guessing which one a release meant is exactly the mistake this arrangement
exists to prevent. `plan` returns the kind, the engine to use, `new` or
`replacement`, the target, the file count, the source commit, whether the
environment is `deployable` at all, and **both** environment URLs.

Every one of them reports both URLs whether or not both environments exist, so a
deployment receipt never leaves you hunting for the other one. The overview page
shows the same pairs as a Deployments card, with a "not released yet" row rather
than a missing one.

The superseded `sites` block is a validation **error**, not an ignored key: a
record left half-migrated must not quietly stop being deployed.

### Release history

Two questions, answered from git rather than from anybody's memory.

**Is production the latest?** `releaseState()` compares the commit recorded
against `prod` with the source directory's current commit, and reports one of:

| Summary | Means |
| --- | --- |
| `not released yet` | no production environment |
| `on test, never released` | test exists, production does not |
| `production is current` | the released commit is the source's latest |
| `N commit(s) unreleased` | that many commits have touched the source since |
| `released, but the released commit is unknown` | nothing to compare against |

It also reports `test_ahead` when the test environment's commit is a genuine
descendant of production's - "different" is not "ahead". The summary appears
under each deployment on the overview page, in `deployments <slug>`, and in
`plan`, whose `release.changes` lists the commit subjects a release would carry.

**What shipped, and when?** `record --env prod` writes two records. The detailed
one is `initiatives/<slug>/releases.md`, newest first, created on the first
release: date, kind, version, URL, released commit, the commits since the
previous release, and where the test environment stood at that moment. The
narrative one is a one-line `— Release` entry appended to `log.md`, so the
initiative's story shows that a release happened and points at the detail.

**Every part of it is scoped to the deployment's own `source`.** The change list
is `git log … -- <source>`, the released commit is `git log -1 … -- <source>`,
and the unreleased count is the length of that same list - so a deck edit, a
change to another initiative, or an edit made directly under `demos/` never
appears in this initiative's release notes. A commit that touched the source
*and* other paths does appear, with its own subject: it genuinely changed the
source, so listing it is right even when the subject is broader than this
release. Each entry names the source it summarizes, so the scope is visible in
the file rather than only in this document.

That last item is the deliberate answer to recording test deploys: a release is
worth a durable record and the dozens of preview pushes before it are not, so
one test observation is captured at the moment it becomes interesting. A test
deploy writes no history of its own.

**All of it is best-effort, and none of it can block a release.** The commits
recorded against the two environments are the only inputs, so a deployment made
before this existed, a rewritten history, or a source moved to a new path
degrade to "unknown" rather than to a wrong answer. `appendReleaseHistory` never
throws: a failed write costs the entry, not the release, and `record` reports
whether the file was updated.

The sweep **reports** unreleased work in its digest and never acts on it -
releasing is a person's decision, and a sweep that appended to `releases.md` on
every run would turn a list of releases into churn.

### The skills

Two engines, and two skills above them that decide which target is written:

| Skill | Writes | Run by |
| --- | --- | --- |
| `deploy-test` | the test environment of any kind | any agent, as often as the work needs |
| `release-initiative` | production, whatever the kind | a person, explicitly, and nothing else |

`deploy-to-chatgpt-sites` and `deploy-demo` are engines: each deploys exactly the
target it is told to and has no opinion about environments. Splitting the
decision from the mechanism is what makes a release deliberate - an agent
refreshing a preview reaches for the skill that cannot reach production, and
"release this" is a thing the user has to say. It is also why `deploy-demo` is
never called by `deploy-test`: copying into `demos/` *is* the production release.

## Last activity

Derived from git - `git log -1 --format=%cI -- initiatives/<slug>/` - rather
than a field in `initiative.json`. A hand-maintained timestamp can be forgotten
or left behind by an edit that touched only markdown; git already knows.

An initiative whose files are not yet committed reports "not yet committed",
which is accurate rather than an error.

## The sweep survey

`initiatives.mjs digest` prints the survey the sweep's first phase calls for:
decisions waiting on a person, blockers now satisfied, items awaiting review,
unreleased work,
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

`INITIATIVES_NOW` overrides the digest's current date for deterministic tests.
The fixture suite pins it so committed fixture activity does not become stale as
the wall clock advances. Normal runs leave it unset and use the actual time.

### Configuration and the prompt

`initiatives/sweep.json` holds the run configuration; `phases` controls what a
run may do, and must always include `"survey"`. It is now
`["survey", "respond", "propose", "work", "deploy", "brief"]` - every capability
on, at the configured budget of four items per run. Narrowing it is the same kind of
reviewable commit that widening it was.

`deploy` and `brief` are the two phases that take no budget. It publishes what the run has
already done rather than starting anything, and refusing to show finished work
because the budget ran out would be the wrong economy. It writes the **test**
environment only, from the branch the run just pushed, and only when
`deployments <slug> plan --env test --since <base>` reports the source actually
changed - an item that touched nothing but `log.md` has changed nothing a reader
would see. A first deploy of an environment goes out private, because
`confirm_access` asks a question no unattended run can answer. Production never
moves without a person running `release-initiative`.

`brief` rewrites `brief.md` on any `building` or `refining` initiative whose
digest no longer matches, through the `write-brief` skill. Selection is a
digest comparison, so an initiative nobody has touched is skipped and a quiet
run costs nothing.

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

### Proposing answers

`propose` picks the questions a run should answer with a pull request. It ranks
them exactly as `select` does and shares the same caps, so a proposal is
ordinary work that happens to produce a decision rather than a document.

Three things are specific to it:

- **Only `human:` blockers are selected.** `permission:`, `cost:` and `legal:`
  need the user's authority rather than reasoning, and `data:` needs a fact only
  they have; proposing one would be an invention wearing the costume of an
  answer. Those are returned in a separate `notProposable` list, which is also
  what the digest issue is left carrying.
- **`max_effort` does not apply.** It caps the work the sweep may attempt
  unattended, and composing a proposal is not doing the item - a large item's
  question is often the one most worth answering first.
- **The branch is `sweep/<slug>/propose-<item-id>`**, not the item's work
  branch. Once a proposal merges the item becomes actionable and `select` may
  pick it up under `sweep/<slug>/<item-id>`, so the two must not be the same
  name. `sweep-scope.yml` reads the slug from the second segment either way.

The digest marks each waiting decision `proposable`, so the same list says both
what needs the user and which entries will arrive as a pull request.

### The shared budget

`items_per_run` is one number covering review responses, proposals, and new
work, consumed in phase order. `propose` and `select` both take `--spent <n>`,
the count earlier phases used, and subtract it from the budget - so precedence
is arithmetic rather than something the prompt has to remember. A run that
spends everything on revisions and starts nothing new is the correct run.

`complete` performs the §6.3 mechanics in one step: remove the item, flip
anything blocked on `todo:<id>` to actionable, and append a dated `log.md`
entry. It changes `stage` only when given `--stage`, and warns when a
stage-advancing item is completed without one.

### Authoring items, and never running dry

`add <slug> <item-id> --title "..."` is the counterpart to `complete`, with
`--value`, `--effort`, `--blocked-by <prefix:text>` and `--advances-stage`. It
refuses a duplicate id, an unknown blocker prefix, and a `todo:` reference that
does not resolve. Use it rather than hand-editing `initiative.json`: the fields
it fills in are the ones `select` ranks on and the validator checks.

`complete` then **refuses to leave a live initiative with an empty todo list**,
naming both ways out - seed the next item with `add`, or declare the initiative
finished with `--stage dormant`. Only `dormant` and `archived` may have nothing
to do.

The check runs after the removal, the unblocking and any stage change are
applied in memory but before anything is written, so a refused completion leaves
no trace: the JSON is untouched and no log entry appears.

This is the enforcing half of a rule the validator could previously only warn
about. `nothing actionable, and not marked dormant` is still emitted, but it now
catches drift from hand edits rather than being the only line of defence.

### Recording something you might do later

`notes.md` is already a rendered document (it is in `DOCUMENTS`), and that is
where an optional idea belongs — a "maybe", a nice-to-have, a thought worth
keeping that nobody has committed to.

**Do not record one as a todo item.** `select` does not filter by stage: an
actionable item is ranked and picked up wherever it lives, including inside a
`dormant` initiative, so adding one there quietly wakes the initiative and puts
the sweep to work on something nobody asked for. The todo list is for work that
is meant to happen; `notes.md` is for work that might.

Nothing enforces this and nothing needs to. A note is inert by construction: no
tooling reads it, so it cannot be selected, proposed, counted, or nagged about.
Promote one by writing it as a real item with `add` when it stops being
optional, which is also when someone has to decide its value and effort.

This is deliberately not GitHub issues. Initiatives keep their whole record in
the repository so a fork carries it, and the sweep already maintains exactly one
issue - the digest (§8.4) - which is a report, not storage.

### What `--stage refining` seeds

Entering `refining` - and only entering it, not re-completing an item while
already there - appends two items, unless ids of the same name already exist:

| id | Item |
|---|---|
| `refining-readme` | A user-facing README: how to use it, and how to deploy it |
| `refining-improvements` | A standing pull request of optional improvements |

Both are `actionable` with `advances_stage: false`. Together with the empty-list
rule above they mean a refining initiative always has an open invitation to
improve it until someone declares it dormant. See INITIATIVES_VISION.md §6.5.

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

`tests/initiatives-rendering.test.mjs` covers wrapped and nested lists, code
blocks, and URL autolinks. `tests/initiatives-digest.test.mjs` covers the survey, and
`tests/initiatives-sweep.test.mjs` covers selection, proposal selection,
completion, and the scope check - the latter two against fixtures in
`tests/fixtures/initiatives/`, using `node:test`. The completion tests copy the
fixtures to a temporary directory, since they mutate state.

The proposal tests pin the two rules that make the phase safe rather than
merely useful: that a `permission:` blocker is never selected, and that a
proposal branch cannot collide with the work branch for the same item.

`initiatives/sweep-setup.md` documents how to schedule a run and what any
scheduler has to provide.

`tests/e2e/initiatives.spec.js` covers the rendered result: the TOC explains
what an initiative is, entries link to overview pages, the nav bar carries the
Initiatives button, and document links never point at raw markdown.


## Newsletter review presentation

`initiatives/newsletter-story-harvester/work/src/review-page.mjs` emits a
self-contained story matrix for review and provenance-safe publication. Six
row-by-column layouts paginate the existing sorted/filtered rows; clusters stay
one row. Only the current page's matching unjudged members enter a bulk verdict.
The sitting's complete verdict/Undo/export state remains independent of the
rendered page. Day/Night and layout preferences use guarded localStorage access;
judgments are never persisted there. CSS uses Bookmark Sorter's Cream/teal and
Dark-slate palettes and Pastel washes, with visible selected borders at Night.

Browser coverage in `work/test/review-page.test.mjs` and
`work/test/publish-page.test.mjs` checks grid geometry, paging completeness,
mobile behavior, storage denial, verdict/export isolation, and published-field
withholding. `work/measure-review-rate.mjs` sorts Unjudged first and measures the
whole fixture backlog rather than the current page. Private test generation and
the existing Site pointer are documented in the initiative's `work/README.md`;
the ignored generated HTML is separate from the committed renderer. The committed
Sites build project points its static output at `private/site`. Its
`build-private-site.mjs` requires protected local inputs and writes mode-0600
HTML atomically, refusing missing data and symlinked paths. Repository validation
checks the committed package rather than requiring private artifacts in CI.
