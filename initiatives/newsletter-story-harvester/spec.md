# Spec

How the Newsletter Story Harvester is built. `objectives.md` says what "done"
means; this says what gets made. Where a choice was already settled,
`decisions.md` holds the argument and this file records only the conclusion and
what follows from it.

Numbered references to **O1–O8** are the objectives.

`story-record.md` is the companion document and this spec assumes it: the
fields, identity, link unwrapping, and the many-harvesters rule are specified
there and are not restated here.

## 1. What the first version is

**A harvesting skill, a store, and a page.**

A skill searches the mailbox over a date range, extracts stories from the issues
it finds, writes them into a store, and generates a self-contained HTML page for
review. The reader opens the page, expands and sorts and judges, and exports the
verdicts as a small file the skill folds back into the store. A second command
renders the kept and emphasised stories as a page someone else can open.

That shape is the runtime decision of 2026-08-15 (§2), and the three parts have
sharply different lifetimes:

- **The store is durable.** It outlives every run, every version of the page,
  and — under the standing fallback — the page itself.
- **The page is disposable.** It is regenerated from the store whenever it is
  wanted, and nothing is ever only in the page.
- **The skill is replaceable.** It is one harvester among any number
  (`story-record.md` §5), and the store does not depend on which one wrote a
  record.

Sizing, so the design is not argued in the abstract: the wish names roughly
seven newsletters. At a link-list issue of 20–60 stories and a weekly cadence,
**a month is several hundred stories and a year is low thousands.** That number
is large enough that O7 needs a page rather than a conversation and small enough
that the store can be a file (§7).

### 1.1 The pieces, and how they connect

```
    the mailbox                    +--------------------------+
   +-------------+                 |     inventory (§4)       |
   |  issue      |                 |  per source: key, match, |
   |  issue      |                 |  shape, unwrap rule      |
   |  issue      |                 +------------+-------------+
   +------+------+                              |
          |                                     v
          |   read-only,        +---------------------------------+
          +------------------>  |       harvesting skill          |
              session-bound,    |  extracts under the contract    |
              nothing kept (§6) |  for the declared shape (§3.1)  |
                                +----------------+----------------+
                                                 |
                                                 |  story records
                                                 |  (story-record.md)
                                                 v
   +-------------------------------------------------------------------+
   |                            THE STORE                              |
   |                      one JSON file (§7)                           |
   |      stories | clusters | runs | vocabularies | source facets     |
   |            written by a skill, never by a page (§9)               |
   +--+-------------------------+----------------------------------+---+
      |                         |                                   ^
      |  generate               |  generate                         |
      v                         v                                   |
   +-----------------+   +-----------------+                        |
   |  review page    |   | published page  |                        |
   |  §8, disposable |   | §12, kept and   |                        |
   |  filter, sort,  |   | emphasised only |                        |
   |  verdict, sweep |   +-----------------+                        |
   +--------+--------+                                              |
            |                                                       |
            |  export()          +------------------+               |
            +-----------------> |  verdict file     | --------------+
                                |  ids, verdicts,   |   the skill
                                |  tag changes (§9) |   folds it in
                                +------------------+

   Later, needing no new fields and no change to any of the above:

     tagging skill (§10.3)  ---- reads the store, proposes
                                 theme: and about: tags ----> THE STORE
```

Two things the picture is meant to make obvious. **Every arrow into the store
starts at a skill** — the page's only output is a file, which is what keeps the
page disposable and the store authoritative. And **the mailbox appears once, at
the top left, with nothing flowing back to it**: no labelling, no archiving, and
no credential living anywhere below that first arrow.

Held out of the first version, from `objectives.md`: publication as an OpenAI
site, and writing back to the mailbox in any form.

## 2. Alternatives considered: where this runs

Settled 2026-08-15 as **skills harvest, a generated page reviews**, with the
bookmark sorter's web app as a standing fallback the user may take at any time.
Condensed here because the item asked for it; the full argument, and what would
reopen it, is in `decisions.md`.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. Agent skills, end to end** | Nothing to host. The two hard parts are model work, which is what a skill is | O7 fails: a few hundred keep-or-drop calls by conversation is slower than reading the newsletters would have been |
| **B. A website with its own store** | Strongest answer to O5 and O7; multi-device; publishing is a page it already renders | Needs a stored Gmail refresh token on a server — the heaviest liability in the design — and still has to call a model, so it adds a system rather than replacing one |
| **C. Skills harvest, a generated page reviews** *(chosen)* | Splits the problem where its halves differ: mailbox and model work in a skill, throughput in a page. No server ever holds mail credentials | Two artefacts to keep agreeing; the verdict round-trip is the fiddly part (§9); single-machine |
| **D. Skills harvest, the bookmark sorter's app reviews** *(standing fallback)* | One triage surface for both piles, and the phone case for free | That app does not exist yet, and it couples two initiatives before either has run |

**What follows for this spec**, and these are binding rather than decorative:

- **The harvest runs on demand, never on a schedule** (§5.3). A schedule would
  need a credential held while nobody is present, which is precisely what B was
  rejected for. This is not a preference; it is the same decision seen from
  another angle.
- **Nothing the page knows is authoritative.** Every field it renders came from
  the store, and the only thing it produces is the verdict file (§9).
- **The store is specified so that another surface could read it** (§7), because
  D is a route the user may take, not a hypothetical.

## 3. Alternatives considered: how a newsletter becomes stories

This is the initiative's own hard problem and `decisions.md` does not settle it.
`objectives.md` states the constraint: the three newsletter shapes are three
different extraction problems, the unit of harvest is a per-newsletter decision,
and a long-form column yielding thirty footnotes is the failure that a
link-scraper produces **silently**.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. One universal rule — every link is a story** | Trivial to build, perfectly repeatable, no model cost. Correct on the two link-dense shapes, which are most of the volume | Wrong on exactly the case the objectives call the sharpest test, and wrong invisibly: thirty citations from one column look like a productive harvest. Contradicts "the unit is a per-newsletter decision" by making it a per-link one |
| **B. A hand-written parser per newsletter** | Deterministic, so O1's repeatability is free; cheap per run; a parser that breaks breaks loudly | Seven newsletters is seven parsers, and senders restyle without warning. Still cannot write the summary O2 asks for on long-form, so a model is needed anyway — this is extra machinery, not less |
| **C. A model reads the whole email, unguided** | One implementation for every shape; handles long-form natively; a new newsletter costs nothing | It decides the *unit* silently, which is the decision `objectives.md` says must be made per newsletter and written down. Non-deterministic where O1 wants repeatability, and its failure mode is the invisible one again |
| **D. Shape declared per source; the model extracts under that shape's contract** *(chosen)* | The per-newsletter decision is made once, recorded, and reviewable. The model does the reading — including the long-form summary — but not the deciding. Failure becomes visible, because a contract carries an expected story count and `shape` is recorded on every record | Needs an explicit inventory (§4). A mis-declared shape produces confidently wrong extraction, so §3.2 has to make disagreement loud |

### Why D

The choice is not "rules or a model". It is **which decision the model is
allowed to make.**

A and B fix the unit in code. C hands the model both the reading and the
deciding. D splits them: the *unit* is declared per source — that is the
sentence `objectives.md` wrote — and the model does the reading within it. The
model is asked "extract the items from this link list" or "summarise this
column", never "decide what a story is here", and those are questions with
reliably different answers.

The second reason is that it makes the sharpest test observable. Under C, a
column that yielded thirty stories is indistinguishable from a link list that
yielded thirty stories. Under D, the source declared `long-form`, the contract
expects one story, and thirty is a number the harvest can notice by itself.

### 3.1 The extraction contracts

One contract per shape. The shape comes from the inventory (§4); the contract
decides what the harvester asks for and what it checks.

| | `link-list` | `annotated-digest` | `long-form` |
|---|---|---|---|
| Named in the wish | Future Crunch, Fix the News, Americans of Conscience | Stanford energy, Yale | Yglesias, Roberts, other Substack columns |
| **One story is** | One link with its sentence or two | One item with its paragraph | **The whole column** |
| Expected per issue | 10–60 | 3–15 | 1 |
| `text` | Complete verbatim story text through 3,000 characters; summary only above the limit | Complete verbatim item text through 3,000 characters; summary only above the limit | Complete verbatim column through 3,000 characters; summary only above the limit |
| `text_is_summary` | Per finding: `false` for copied text, `true` for a summary | Per finding | Per finding |
| `url` | The link, unwrapped | The link, unwrapped | The column's own URL, or `null` where it exists only as an email |
| `source_anchor` | Position of the link in the document | Heading path, else position | The document itself |
| The failure to watch | A section heading harvested as a story | One item split into three by its paragraphs | Thirty citations harvested as stories |

Three rules that hold across all of them:

- **Links inside a long-form story are never stories.** They are citations to an
  argument. If one is worth keeping on its own it is a bookmark, not a story,
  and this initiative is not where it goes.
- **Extraction never invents short text.** Through 3,000 characters, the entire
  story text is copied, not paraphrased; a harvester that improves or shortens
  it has destroyed the reader's ability to judge whether the source was worth
  reading. Above that limit the finding is explicitly marked as a summary.
- **A story with no link is still a story.** Long-form is the ordinary case, and
  `story-record.md` §3 already gives it an identity that does not need a URL.

### 3.2 When the shape is wrong

A declared shape is a claim about a newsletter, and newsletters change. The
awkward case is real rather than theoretical: a Substack author who writes a
column most weeks and a link roundup some weeks is `long-form` by declaration
and `link-list` that week.

So:

- **The declared shape may be overridden per issue**, and the override is what
  is recorded on the record. `shape` describes what was extracted, not what was
  expected.
- **A story count outside the contract's band is flagged, never suppressed.**
  The stories are written, and each carries an `err:count` tag. The harvest
  reports the flag at the end of the run.
- **A `long-form` source that yields more than one story is the loud case.**
  That is the exact silent failure `objectives.md` names, so it is reported
  first and by name, not as one line in a count.

The principle: a wrong shape must cost a visible flag rather than a plausible
page. Nothing here refuses to harvest — refusing loses material, and the point
of the flag is that a person can look.

### 3.3 Repeatability, given a model in the loop

O1 asks that re-running a harvest produce the same stories. A model does not
produce the same words twice, so the objective has to be met at the level it
actually matters:

**Repeatability is a property of identity, not of text.** A re-harvest must
arrive at the same set of ids. It is allowed to phrase a summary differently,
because it never gets to apply one:

- **First write wins.** A re-harvest that matches an existing record leaves
  `text`, `title`, `harvested_at` and `verdict` exactly as they were
  (`story-record.md` §3, case 1). Re-running is safe by construction rather than
  by care.
- **Identity is structural.** `source_anchor` is a heading path or a link
  position — something the document has, not something the model chose. An
  identity that depended on model output would not survive a re-run, which is
  the whole reason it is specified this way.
- **Re-extraction is an explicit action.** Wanting the new text means asking for
  it: a re-harvest with `--refresh` replaces `text` and `title` on matched
  records and still never touches `verdict`.

## 4. The newsletter inventory

Settled by the user on 2026-08-18. The private inventory contains exactly three
sources; `decisions.md` records the supplied Gmail queries, lookbacks and shapes.
This section specifies the form those answers require without committing a file
that names a person's mailbox.

One entry per newsletter:

| Field | What it is |
|---|---|
| `key` | Stable private configuration-row identifier. It is not displayed and need not be meaningful to a reader |
| `slug` | Stable lowercase hyphenated source identifier, written to `source` on every record and shown beside the source name |
| `name` | What to show a reader |
| `match` | One matcher or a list of matcher groups. Groups are a **union**; conditions inside `{ "all": [...] }` are an **intersection**. A condition is a from-address or from-token, Gmail label, or subject pattern. The union is one search, not several merged (phase 0). A `from` condition is a **pre-filter**: §5.1 checks the actual From value before attribution because Gmail may over-match |
| `shape` | `link-list`, `annotated-digest` or `long-form` — the §3 declaration |
| `unwrap` | Which redirector rule applies (`story-record.md` §4), where the sender uses one |
| `since` | The earliest issue worth reaching for, if the user has an opinion |
| `lookback_days` | A positive integer limiting this source to the last N days of the explicit run range. It may coexist with `since`; the later effective start wins |

The inventory is configuration held beside the store (§7), not code, and not
committed to this repository — it names a person's mailbox.

**A source not in the inventory is not harvested.** No sniffing for
newsletter-shaped mail: O1 asks that the set in scope be written down rather
than remembered, and a harvester that discovers its own sources cannot give the
same answer twice.

## 5. The harvest

### 5.1 Finding the issues

Search the mailbox for each inventory entry's matchers over the requested date
range, and take the message list as the run's input. The range is explicit —
never "since last time" — because an implicit range is what makes a re-run
unrepeatable. The connector's range is **half-open in local dates** (phase 0),
so the range a run resolves and the range a user typed are not the same string;
the run record writes the resolved one. For an entry with `lookback_days`, its
effective start is the later of the requested start and `before - N days`; a
`since` date may move it later again.

**The search is a pre-filter, and its results are checked.** A message is
attributed to an inventory entry only after its actual From value is checked
against that entry's `from` condition, because `from:` can over-match (§4). A
full address is checked as an address; a supplied token is checked against the
actual From text. An unattributed message is not harvested — and, since it never
matched an entry, gets no `source_doc` either.

Every message that matched is recorded as a `source_doc` whether or not it
yielded stories. An issue that produced nothing is a finding, and without the
record it is indistinguishable from an issue that was never fetched.

### 5.2 What a run does

1. Resolve the inventory and the date range.
2. Search, and list the issues found per source.
3. For each issue, extract under its shape's contract (§3.1), flagging count
   anomalies (§3.2).
4. Unwrap and normalise links, and compute identity (`story-record.md` §§3–4).
5. Merge against the store: new records inserted, matches left alone, same-URL
   stories across sources merged.
6. Propose tags, including themes (§10).
7. Report: issues per source, stories added, stories matched, merges, flags.

The report is written to the store as a run record — when it ran, over what
range (as resolved, §5.1), with which inventory, and what it produced. Three
runs later, "why does this month look thin" is answerable. Every count in it is
of things the run actually paged through: the connector's own result count is an
estimate that saturates on large result sets (phase 0), and a run record built
from it would answer that question wrongly.

`source_doc` accounting lives in that run record, as one small entry per matched
message: id, source key, issue date, extracted shape, story count, and whether it
was flagged. It is not a second top-level store collection. That is enough to
distinguish "matched and yielded nothing" from "never fetched" without retaining
a subject, From address, body, or any other mailbox content. The inventory named
on the run is likewise its id and source keys, not its private matchers.

### 5.3 On demand, not on a schedule

A run happens when a person asks for one. §2 explains why: a scheduled harvest
needs a credential held while nobody is present, and not holding one is the
reason the chosen option was chosen. Nothing in the wish asks for a schedule.

## 6. Mailbox access

Read-only, and session-bound. `objectives.md` already rules out writing back to
the mailbox — no labelling, no archiving, no marking read — and §2 rules out
storing a credential. What remains is the narrowest useful relationship: search
and read while the user is present, keep nothing.

Nothing of the message is retained beyond what a record carries
(`story-record.md` §1: no HTML, no attachments, no images). That is a storage
choice in that document and a **privacy** choice here, and it is what makes §12
safe: a published page cannot leak mail that was never kept.

## 7. The store

### Alternatives

| Option | Strengths | Weaknesses |
|---|---|---|
| **A single JSON file** *(chosen)* | Plain, portable, diffable, and readable by anything — which is exactly what the fallback to D requires. No driver, no schema migration, trivial to back up or hand to another tool | Rewritten whole on every change, and one bad write loses the file. Gets unwieldy somewhere in the tens of thousands of records |
| **JSONL append log** | Appending is cheap and crash-safe; a run is a contiguous block | Every reader must fold the log to learn the current state, which is a rule the page and any future surface both have to implement identically. Needs compaction |
| **SQLite** | Queries, indexes, and comfortable at any size this reaches | Binary, and needs a driver in every surface that reads it. "Plain and portable enough for another surface to read" is the constraint `decisions.md` set, and this is the option that strains it |

**Chosen: one JSON file.** At low thousands of records a year (§1) the rewrite
cost is irrelevant, and the property that matters is that a person, a skill, or
the bookmark sorter's importer can all read it without being taught how.

Three rules that make that choice safe:

- **Write atomically** — new file, then rename. A crash mid-write must leave the
  previous store intact, since the store is the only durable thing in the
  design.
- **Keep the previous version.** One generation is enough to recover from a bad
  run, and it costs a copy.
- **Splitting is by issue-month, and only if it is ever needed.** Same record
  format, several files, readers take the union. Recorded so that growth is a
  known step rather than a redesign.

### What is in it

- `stories` — records exactly as `story-record.md` specifies them.
- `clusters` — keyed by `about:<slug>`, with the cluster paraphrase, member
  story ids, and the tagging pass that wrote it. Membership remains an ordinary
  tag on each story.
- `runs` — the §5.2 run records.
- `vocabularies` — the open `shape` and `verdict` values currently *offered*
  (§11).
- `harvesters` and `sources` — names seen in the data, for display (§11).

### Where it lives

**A path the skill is given**, outside this repository, alongside the inventory.
Nothing derived from a personal mailbox is committed here. The repository holds
the skill, the page renderer, and a small fixture store for tests — synthetic
issues in all three shapes, which is also how §3.1's contracts get tested
without a mailbox.

### 7.1 Exporting and importing a store

**Export is a copy, and that is a property worth protecting rather than a
shortcut.** The store is already the interchange format — plain JSON, no
driver, self-describing — so exporting the whole thing is copying the file, and
a `store export` operation exists only to take a *subset*: a date range, a
source, a selection of tags, everything not yet judged. The rule is that a
subset export produces a file of exactly the same shape as the whole one, so
nothing downstream needs to know which it was handed.

**Import is the harder half, and the answer is that it is not a new
mechanism.** Importing a store is merging records, which is precisely what a
harvest already does when it meets a story it has seen before. So import runs
the same path with records as its input instead of emails:

| Situation | What happens |
|---|---|
| The same store imported again | Nothing. Every record matches itself, first-write-wins, and a re-import is a no-op — the same property that makes a re-harvest safe |
| A store from another machine, or a subset export | Records merge on the `story-record.md` §3 rules: case 1 identity for the same item, case 2 `url_key` merge across sources, `merged_from` recording what was absorbed |
| Both sides judged the same story | Later `verdict_at` wins, as in §9. Never a silent overwrite of a judged story by an unjudged one — a null verdict never displaces a real one |
| Both sides tagged it | Union. Tags are a set, so this needs no resolution rule at all, which is a third thing §10.1's structure buys |
| Vocabularies differ | Union them. §11 already requires an unrecognised value to load and round-trip, so an import cannot arrive with something unreadable |
| Ids collide but the records are plainly different | Report and skip, do not overwrite. Identity is derived rather than random (`story-record.md` §1), so this means one side's `url_key` or anchor rules differ — a bug worth seeing, not worth resolving silently |

Two rules over all of it:

- **Import never deletes.** There is no "sync": a story absent from the incoming
  file means nothing, since a subset export is a normal thing to be handed.
  Removing a story stays a separate, explicit act.
- **Import reports what it did** — added, matched, merged, conflicted — as a run
  record like any other (§5.2). A merge nobody can see afterwards is the failure
  mode `story-record.md` §3 already warns about for bad `url_key`s.

This is also what the D fallback needs. Moving review into the bookmark sorter
is that app importing this file, and the reason the importer is small is that
the format is one it can read and the merge rules are written down here.

## 8. The review page

Generated from the store, self-contained, opened from the filesystem. No server,
no build step, no network at open time — the store's contents are embedded in
the page, and the page is regenerated whenever it is wanted.

What it does, against O5 and O7:

| Function | Behaviour |
|---|---|
| `expand(story)` / `collapse(story)` | The wish's drop-down control. Collapsed shows title, source, date, verdict; expanded shows the text and the link |
| `sort(key)` | Date at minimum — story date, falling back to issue date — plus issue date, source, and unjudged-first |
| `filter(tag)` | Any tag, including `theme:` ones. This is how a theme is "a page" without themes being a structure |
| `verdict(story, v)` | Drop, keep, emphasise, or whatever else the vocabulary offers (§11) |
| `verdict-rest(v)` | Apply a verdict to matching, unjudged stories on the current page only; existing judgments and off-page stories stay unchanged |
| `undo()` | Reverses the last action, including a `verdict-rest`, as one action |
| `export()` | Produces the verdict file (§9) |
| `help()` | Lists each source's display name, slug, and configured Gmail search string |

Two properties every one of these keeps, because they are what a later
refinement could quietly break: **each applies to a set rather than to a click
target, and each is undoable as one action.**

`verdict-rest` deserves its name for the same reason the bookmark sorter gives
it: naming the four keepers out of fifty is quick, judging fifty is not, so the
cheap action is per-item and the sweep is one gesture. It is the single most
important thing on the page for O7.

The September 2026 presentation follows Bookmark Sorter's Cream-and-teal Day,
Dark-slate Night, and Pastel washes controls. Page Layout offers 1x1, 1x2,
1x3, 1x4, 2x3, and 2x4 (rows × columns), initially 2x3. Previous/Next page
through sorted, filtered story cards; a cluster occupies one card. Cards have
scrollable full text and fixed verdict controls. Below 1000px, at most two
columns fit; below 640px, one card is shown per page. The chosen layout remains
selected, and larger screens restore its full grid.

Only display mode and layout are remembered in browser storage, when available.
Filter/sort/layout changes and responsive resizing start at page one. Pagination,
display changes, and layout changes retain the sitting's verdicts and Undo;
Export includes judgments from every page. A page sweep filters cluster members
by the active tag; explicitly judging a cluster still judges its whole group.

Stories start expanded so the text and linked title are available without a
click; the title itself is the outbound link, rather than a second “Open story”
row. The backlog count — stories with no verdict — is shown at all times. O7 asks
that the system be able to say how large it is, and a number nobody is looking
at will not be believed later.

**Hosted judgments are durable.** The private hosted review saves each action
and Undo in D1, with revision checks against stale tabs. A database error is
shown before any success state. The downloaded self-contained page retains the
offline export/import workflow described below.
Source-search help is present only on the private judgeable review page. It is
not included in the provenance-safe published page.

## 9. Verdicts, back into the store

The fiddly part of the chosen option, as `decisions.md` said it would be.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. The page exports a file; the skill imports it** *(chosen)* | Works in every browser with no permission prompt and no helper process. The file is small — ids and verdicts, nothing else — and is itself a record of a sitting | Two explicit steps, and a sitting that is never exported is lost |
| **B. The page writes the store directly** | No steps at all | Needs the File System Access API, so it is browser-dependent, and it puts write access to the durable thing in the disposable thing |
| **C. A localhost helper the skill runs** | Immediate, and browser-independent | A process to start, a port to pick, and a second way into the store that has to stay consistent with the first |

**Chosen: A, with B as an enhancement** where the browser supports it — and even
then B writes the same file, not the store. The store is only ever written by
the skill. That is the rule that keeps the page disposable.

The file:

```json
{
  "store_id": "...",
  "exported_at": "...",
  "verdicts": [{ "id": "...", "verdict": "kept", "verdict_at": "..." }],
  "tags": [{ "id": "...", "add": ["theme:energy"], "remove": ["theme:health"] }]
}
```

Rules on import:

- **Idempotent.** Importing the same file twice changes nothing the second time.
- **Verdicts and tags only.** The file cannot create a story, delete one, or
  change its text. A reviewer's file arriving with story content in it is a bug,
  and the importer ignores it rather than trusting it.
- **Later wins, by `verdict_at`.** Two sittings out of order resolve by the
  timestamp on the verdict, not by the order of import.
- **An unrecognised verdict is stored as given** (`story-record.md` §1.2).
- **A mismatched `store_id` is refused**, with the two ids shown. Importing one
  store's verdicts into another silently would be unrecoverable.

## 10. Themes, and stories that should be read as one

### 10.1 Themes are tags, and the harvest proposes them

`story-record.md` §1.1 settles the structure: a theme is a tag,
`theme:<name>`, in the same set as everything else. So grouping is tag
production and correcting is tag editing, and O4's "the grouping can be
corrected" needs no mechanism beyond the page's `filter` and a tag edit.

Themes are **proposed by the harvest** and by any later pass over the store —
another skill, a rule, a person. A proposal is an ordinary tag write; nothing
distinguishes a theme a model suggested from one that was typed, which is what
makes the grouping intelligence replaceable.

### 10.2 What "closely related" means

O6 asks that stories covering the same event be readable as one, with the
individual links and dates surviving underneath. `objectives.md` flags the
judgement: too eager merges distinct stories, too shy leaves the duplication.

This is `story-record.md`'s case 3 — *two stories about one event* — and it is
deliberately **not** identity. Concretely:

- **A cluster is a tag**, `about:<slug>`, proposed by the same pass that
  proposes themes.
- **The signals for proposing one**: story dates within about two weeks of each
  other, and a strong overlap of the subject — the same named entities and event
  in the titles and text. Neither alone is enough; a fortnight of energy stories
  is a theme, not an event.
- **The page renders a cluster as one entry** with a combined paraphrase and its
  members listed underneath, each keeping its own link, source and date. That is
  O6, exactly as written.
- **A verdict applied to a cluster applies to each member.** The backlog counts
  stories, so a cluster must not become a second kind of object with a verdict
  of its own — and a member can still be judged individually.

**Err toward proposing.** This is only safe because clustering is tag production
rather than merging: a wrong cluster costs one bad grouping that a reader
dissolves by removing a tag, and nothing was destroyed. Had clustering been
implemented as a merge, the opposite bias would be correct — which is the reason
`story-record.md` keeps identity at case 2 and stops there.

### 10.3 The tagging skill

**A second skill reads a store, reads the content, and proposes tags — themes
and clusters — using a model's judgement about what the stories are actually
about.** Phase 7 implements it as `tag-newsletter-stories`: a model writes a
strict proposal, and a deterministic script applies only additive tags and
cluster records.

It is worth naming separately from the harvest even though both write tags,
because they have different information. A harvester sees one issue at a time
and can only propose a theme from what is in front of it. **A pass over the
store sees everything**, which is the only position from which "these nine
stories are one category" is a judgement rather than a guess — and it improves
as the pile grows, where a per-issue guess does not.

The contract it relies on, all of which §§1.1, 7 and 10.1 provide:

- **The store is readable on its own**, without the skill that wrote it. That is
  the §7 choice of a plain JSON file, and this is the second thing it buys after
  the D fallback.
- **Tags are open free strings**, so a new theme costs nothing and needs no
  migration. A controlled vocabulary would have made this skill a schema change.
- **Nothing distinguishes a tag by origin.** A theme a model proposed and one a
  reader typed are the same field, so the page needs no knowledge of this skill
  to display its output.

Three rules it inherits rather than invents:

- **It never writes a verdict** (`story-record.md` §5). Judging is the reader's,
  and a pass that pre-judged stories would shrink the backlog O7 counts.
- **It writes tags and nothing else** — never text, title, identity, or a merge.
  Retagging is always recoverable; the things it may not touch are the things
  that are not.
- **It is one pass among any number.** Re-running it, or running a different one
  beside it, adds tags rather than replacing them, so removing a bad tag is the
  reader's edit and not a re-run.

Its output lands as tags directly, as `plan.md` phase 7 settles. Every pass
records exactly what it added and a fingerprint of tag-and-cluster state, so an
unchanged pass can be undone as a set while a later edit makes an inexact undo
fail loudly.

## 11. Open vocabularies, and who may harvest

Both questions `story-record.md` §6 left open, answered the same way.

**Vocabularies are configuration for what is *offered*, never for what is
*legal*.** The store's `vocabularies` block lists the `shape` and `verdict`
values the page shows buttons for. Adding `to-be-shared` is an edit there.
Nothing validates a record against the list: a value that is not in it still
loads, still displays, and still round-trips, exactly as `story-record.md` §1.2
requires. Configuration that could reject data would turn an open vocabulary
back into a closed one.

**There is no harvester registry.** A harvester records the name it claims, and
the store keeps the set of names seen in the data for display. A registry would
be a gate, and §5 of the record document exists to say that any number of skills
may write here.

## 12. Publishing

O8's shareable output is the review page's renderer with the verdict controls
removed and the selection narrowed to kept and emphasised stories. Same
generator, same self-contained file, no store embedded beyond the stories shown.

Two rules:

- **The published page carries only what a story carries.** Since no mail is
  retained at all (§6), this costs nothing to honour — which is the point of
  having decided it early.
- **`source_doc` and `source_anchor` do not travel.** They are provenance for
  debugging an extraction, and they name a message in someone's mailbox.

Where such a page is hosted is out of scope; `objectives.md` holds publication
as an OpenAI site out of the first version.

## 13. What is shared with the bookmark sorter, and what is not

`objectives.md` asked that this be weighed deliberately, including the answer
that they stay separate.

**Shared: the data conventions. Not shared: any code.**

The two piles agree on flat free-string tags with prefixes by convention, on one
single-valued verdict per item with an open vocabulary, and on judging a visible
set with a sweep rather than one item at a time. That agreement is worth having
on purpose, because D — moving review into that app — is a standing fallback,
and under D the store is imported rather than rewritten.

They do not share an implementation, and should not try to:

- That app is a hosted, signed-in, multi-collection web application with a
  server-side capture pipeline. This is a static file generated by a skill.
  Nothing in the first version of either is reusable in the other without
  building the app first, which is the coupling `objectives.md` warned about.
- Their inputs differ in the way that matters: a bookmark arrives discrete, a
  story is manufactured out of an email and the manufacturing can be wrong.
  §§3.1–3.2 exist for that and have no counterpart there.
- This page needs `filter` and `sort`; that app needs a boolean selection
  language over 5,000–10,000 items. Building the larger one here would be
  building it twice.

**What would change the answer**: the bookmark sorter shipping with a grid that
takes items from an import rather than from its own ingestion. Then D is a
configuration of that app plus an importer for this store, and the tag and
verdict agreement is what makes the importer small.

### 13.1 Keeping tags aligned, so the selection system can be adopted later

Not building the boolean selection language now is a decision about **scope**,
not about data. Adopting it later is expected, so the tag format is specified to
be the same one, and this section is the binding list — if a later change would
break a row of it, that is a change to be argued rather than made.

| Must stay identical | Why it is the part that matters |
|---|---|
| A tag is a **free string**, and the set is unordered with no duplicates | An expression evaluates `tag in tags`. Any other structure — objects, weights, per-tag metadata — is a different evaluator |
| **Prefixes are convention, not schema**, separated by `:` | `theme:energy` and `about:cop30` must parse as ordinary tags there, and a bare `boring` must remain legal here |
| **Case and whitespace handled the same way** | The one silent breaker. A tag that matches in one system and not the other looks like a missing story, not a mismatch |
| **Nothing distinguishes a tag by origin** | An expression cannot ask who wrote a tag, so a model-proposed tag must be indistinguishable — which §10.3 already requires for its own reasons |
| **One `verdict` field, single-valued, open vocabulary** | Selections there treat the verdict as a field rather than a tag. Folding verdicts into `tags` here would need unpicking on import |

The consequence for §8 is the useful one: **this page's `filter` must be a
subset of that expression language, not a different one.** A tag filter is
`tag:x`; adding `and`, `or`, `not` later is then reach rather than migration,
and the stored data does not move. A filter designed on its own terms — a
special "theme mode", a fixed set of facets, a UI-shaped query object — would
cost a rewrite of the same feature, which is exactly the second build this
section exists to avoid.

What deliberately stays out until then: named and saved selections, selections
as first-class stored objects, and cross-collection scope. This store has no
collections, and a name for a filter is worth having only once the filter is
worth naming.

## 14. What the environment must supply

| Needs | What breaks without it |
|---|---|
| A read-only Gmail connector that can search by sender, label and date | Everything. There is no other input. **Confirmed** by the phase 0 probe (`plan.md` §3, `decisions.md` 2026-08-17): sender, label and range all work, and several matchers union in one query as §4 requires. Three conditions came with it — `from:` ignores the plus-tag and so over-matches sibling publications, the range is half-open in local dates, and the result count is an estimate — carried into §4, §5.1 and §5.2 below |
| A model the skill can call | Long-form yields no summary (O2), and theme proposals stop (O4) |
| A writable path for the store and inventory | Nothing persists; O3 and O8 both fail |
| A browser to open a local file | Review falls back to conversation, which is option A and fails O7 |
| Outbound HTTP for redirect-following | Only the optional unwrap step (`story-record.md` §4, step 2); links that cannot be unwrapped are kept and marked, so the cost is missed merges, not lost stories |

## 15. Open for the plan

- **The unwrap rules for the actual senders**, which cannot be written until the
  inventory names them.
- **The prompt and its evaluation for each contract in §3.1** — in particular
  how the long-form summary is judged good enough, which is the one place the
  model's output is the deliverable rather than an intermediate.
- **The fixture set**: synthetic issues per shape, plus the two adversarial ones
  worth having from the start — a long-form column dense with citations, and a
  link list whose section headings look like items.
- **How the page's paraphrase for a cluster (§10.2) is produced**, given the
  page cannot call a model: written at harvest into the cluster's tag metadata,
  or generated on request by a second skill pass.
- **Whether `--refresh` (§3.3) is worth building in the first version** or is
  simply a re-harvest into an empty store.
- **Where the tagging skill (§10.3) sits in the build order**, and whether its
  tags land directly or as proposals a reader accepts. It comes after the
  harvester works, but the plan should say how far after — it is the piece that
  turns a judgeable pile into a themed one, so "eventually" is the wrong answer.
- **Which subset selectors `store export` (§7.1) needs on day one.** Whole-file
  copy covers backup; the subsets earn their place only when something is
  actually being handed somewhere.

### September 2026 hosted review persistence

The user requested automatic database storage on 2026-09-06. The hosted Site now
uses D1 for verdict state; the earlier file handoff remains available for offline
review and synchronizing the local harvesting store. A versioned snapshot per
store makes individual, cluster, sweep, and Undo updates atomic. Store and story
IDs survive re-harvests; persisted verdicts take precedence over bundled seeds.
Drop, Keep, and Emphasize are action labels for the existing dropped/kept/emphasised
values. The chosen action is outlined, including when loaded from the database.
The Help dialog explains loading through an LLM with repository and Gmail access,
optional tagging, and the private test refresh. See work/README.md for the API,
migration, failure handling, and private-input details.
