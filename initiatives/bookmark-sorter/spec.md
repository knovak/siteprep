# Spec

How the Interactive Bookmark Sorter is built. `objectives.md` says what "done"
means; this says what gets made. Where a choice was already settled,
`decisions.md` holds the argument and this file records only the conclusion and
what follows from it.

Numbered references to **O1–O8** are the objectives.

## 1. What the first version is

A signed-in web app holding one or more **collections** of bookmarks. A
collection is imported from a browser export, captured for display, and then
triaged: every item ends up *keeper*, *junk*, *archive*, or *needs-more-time*,
and can be tagged and grouped along the way. The results export as JSON and
import back.

Sizing is not hypothetical: **5,000–10,000 items** in a real pile
(`decisions.md`, 2026-08-14). That number is the reason for three things that
would otherwise look like over-engineering — the virtualised grid (§7), the
deferred capture pipeline (§6), and judging items by the selection rather than
one at a time being the mechanism rather than a convenience (§8).

Held out of the first version, from `objectives.md`: harvesting open tabs from
other devices, pushing subsets back into a browser, and a general sharing
scheme.

## 2. Alternatives considered: where this runs

Settled 2026-08-14 as **a web app**, most likely hosted on an OpenAI site using
its database. The "most likely" is the user's and is kept: the shape is decided,
the host is a leaning. Condensed here because the item asked for it; the full
argument is in `decisions.md`.

| Option | Strengths | Weaknesses |
|---|---|---|
| **Web app** *(chosen)* | One codebase spans widescreen, tablet and phone, which O3 asks for directly; full control of a dense grid and keyboard triage; server-side storage makes backup and export straightforward | No direct access to browser bookmarks, so ingestion is a manual export; cannot capture page snapshots client-side; needs hosting and access control |
| **Local script** | Simplest to build; no hosting, no auth | Weakest at the thing that matters most — a fast visual grid across three form factors; single-machine, so no phone or tablet triage |
| **Browser extension** | Direct bookmark access, no export step; the only option where creating tab groups is natural; can capture pages as they are visited | Cramped for an 8×2 grid; per-browser implementation and review overhead; awkward on iOS |
| **Hosted service** | Most capable — server-side rendering, cross-device harvesting, scale | Most infrastructure to run and pay for; heaviest possible answer to a personal triage problem |

**The trade being made, restated so the spec does not forget it:** the web app is
the *weakest* option for the two capabilities the wish lists as extensions, and
the strongest for the triage experience the wish calls the point. Both extensions
are therefore specified as agent-side work if they ever arrive (§11), not as
things this app grows into.

**What follows for this spec.** Ingestion is a file upload, not an API into a
browser (§4). Captures happen server-side (§6). Identity comes from the host
(§10).

## 3. Alternatives considered: where snapshots come from

Settled 2026-08-14: **captured at ingestion — metadata first, a paid screenshot
API for the gaps.** The full comparison, including how iMessage, WhatsApp,
Google Chat and browser tab thumbnails each do it, is in `decisions.md`.

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. Metadata card** — fetch HTML, parse `og:image`/`twitter:image`, title, description, favicon | What every messaging app does. Two requests per item, trivially parallel — 10,000 items in minutes. Degrades in defined steps | Partial coverage; `og:image` is often a site-wide banner, so many links from one site produce identical cards |
| **B. Headless render we run** | Near-total coverage, faithful to O4 | 300–500 MB per browser process and real capacity planning; many captures are worthless anyway (cookie walls, paywalls, login screens) |
| **C. Paid screenshot API** | No infrastructure; ~$4–10 per thousand | Hands URLs to a third party; a recurring dependency |
| **D. Capture on visit** | Captures the logged-in, banner-dismissed page | Nothing for a years-old backlog; needs an extension, which §2 ruled out |
| **E. Metadata first, render the gaps** *(chosen, with C as the renderer)* | Cheap path for the majority, expensive path only where the cheap one failed the sight test. One pipeline, one fallback ladder | Two capture paths to keep working, and a rule for what counts as "failed" |

The reason E beats B is not cost. It is that **B's failure mode is invisible and
A's is loud**: a screenshot of a consent wall is a confident, wrong picture,
while a missing `og:image` is a hole you can see and queue work against.

Rules carried from the decision, all binding on §6:

- **Capture anonymously.** No cookies, no session, ever.
- **No JavaScript on the metadata path.** JS-rendered pages fall through to the
  render pass, which is where they belong.
- **Store the derivative, not the original** — downscale on capture.
- **Cache against the URL; never re-fetch on view.** Re-capture is an explicit
  action.
- **Record failures as data.** Dead links, timeouts and 404s become tags on the
  item; in a pile assembled over years they are among the best triage signals
  available.

## 4. Ingestion

**Input:** a browser bookmark export (Netscape bookmark HTML, which Chrome,
Safari, Firefox and Edge all produce) and a previously exported JSON file (§9).
Both land in the *current* collection. The visible Import panel accepts either
through the file chooser or a drag-and-drop target beside it; dropping chooses
the file and the explicit Import action submits it. The source name applies to
HTML imports only.

Parsing an export yields, per item: title, URL, `add_date` where the file
carries it, the enclosing folder path, and the `<DD>` description where one is
present — which lands in `note` (§5.1) rather than being dropped.

Tags written at ingestion (O1):

| Tag | Example | Why |
|---|---|---|
| `src:<source>` | `src:chrome-export` | Where the pile came from |
| `in:<yyyy-mm-dd>` | `in:2026-08-15` | When it arrived, so a later import can never be confused with an earlier one |
| `folder:<path>` | `folder:reading/rust` | The shelves the user already built, selectable by the same mechanism as everything else |

Folder paths become tags rather than a hierarchy the app models separately. That
is O1's explicit reading, and it means §8's tag expressions can select on folders
for free.

**Identity and de-duplication.** An item's identity within a collection is its
**normalised URL**: lowercase scheme and host, strip a default port, strip a
trailing slash on an empty path, drop the fragment, and remove known tracking
parameters (`utm_*`, `fbclid`, `gclid`). Nothing else is rewritten — query
strings are meaningful often enough that being clever here loses pages.

Re-importing an overlapping export therefore **merges rather than duplicates**:
tags union, the earliest `add_date` wins, and an existing verdict is never
overwritten by an import. The original URL is kept alongside the normalised one,
because it is what the user actually saved.

## 5. Data model

Core records, written as a relational sketch. The deployed schema also carries
the indexes and constraints required by the operations below (§10).

- **collection** — `id`, `name`, `owner_id`, `kind` (`personal` | `private` |
  `demo-template` | `demo-copy`), `template_id` (for a copy, which template it
  came from), `copied_at`, `created_at`. §10 says what the kinds do.
- **item** — `id`, `collection_id`, `url` (as saved), `url_key` (normalised,
  unique per collection), `title`, `note` (see §5.1), `added_at`,
  `ingested_at`, `verdict` (null = untriaged), `verdict_at`.
- **tag** — `item_id`, `tag`. **A free string; the schema is not fixed.** The
  `src:`, `in:`, `folder:`, `topic:`, `site:`, `kind:` and `err:` prefixes are a
  naming convention the app itself writes, not a vocabulary the user is confined
  to. A user's own `boring`, `archive` or `response-required` is an ordinary tag:
  same field, same autocomplete, matched by the same expressions, and a tag
  without a prefix simply has no prefix. Nothing is validated against a
  controlled list, because a controlled list is exactly what a pile like this
  does not have yet. Flat rather than hierarchical, because §8's selection is
  over tags and a hierarchy would need a second query language.
- **selection** — `id`, `name`, `collection_id` (null means cross-collection,
  §8), `expression`. A *saved* selection; §8 is the function that evaluates one.
- **selection history** — `(owner_id, expression)`, `used_at`. Recent expressions
  belong to the signed-in user rather than a collection, are de-duplicated, and
  are ordered newest first.
- **capture** — keyed by `url_key`, **not** by item: `image_ref`, `source`
  (`og` | `screenshot` | `none`), `captured_at`, `image_hash`, `state`.
- **capture queue** — one optional pass-2 job per `url_key`, with its reason,
  state, attempt count and last error.
- **triage session and action** — a collection-scoped sitting plus its append-only
  verdict and tag actions. An action has an optional `undone_at`, which is what
  lets a set operation reverse as one step.
- **app user** — the host's opaque `owner_id`, plus the retained legacy
  `can_edit_templates` capability.
- **authorized user** — normalized email, optional linked Site user id, and type
  (`admin` | `user`). A matching email or linked id admits a signed-in account;
  neither is an ownership key. The `admin` type additionally gates the Admin
  surface and APIs and grants template-edit permission (§10).

**Two structural constraints, both from decisions rather than taste:**

1. **The capture store is global and URL-keyed**, shared across collections. It
   is what makes seeded demo collections nearly free — twenty testers with the
   same demo cost one capture between them — and what makes re-import cheap.
2. **A collection's identity is separable from its owner.** `owner_id` is a
   column on the collection, and *nothing else joins through the user to reach an
   item*. This is the one live constraint `objectives.md` puts on the spec:
   sharing is planned, and this is the difference between adding it later and
   retrofitting it.

### 5.1 `note`, and why it is not a tag or a title

**`note` is free text on the item**, nullable, distinct from `title`. It arrives
in one of two ways: carried in on an import, or typed by the user against any
item at any time.

Two uses drive it, and they are different enough to be worth naming separately:

- **A note the user writes to make an item recognisable.** Some items never get
  a useful picture — §6's gap items, PDFs, login-walled pages — and for those a
  sentence in the owner's own words does what the capture could not.
- **A note that already existed when the link was saved.** A link shared in a
  chat message usually arrives with a comment attached, and browser bookmark
  exports carry a description field of their own: Netscape bookmark HTML puts it
  in the `<DD>` element beneath the link. Ingestion reads it into `note` rather
  than discarding it, since that text is often the only record of *why* the thing
  was saved.

**Why not a tag.** Tags are for selecting (§8) — short, repeated, and compared
against each other. A note is prose, unique to one item, and never usefully
matched with `and`/`or`. Putting it in the tag set would pollute autocomplete
with strings nobody will ever type twice.

**Why not the title.** The title is what the page calls itself; the note is what
you or the sender said about it. Overwriting one with the other loses the
distinction precisely when it matters — an untitled or badly titled page is
exactly the case where a note earns its place.

**Rules.** It shows in the grid cell alongside the capture (§7), truncated to fit
and full on the focused item. It travels in the export (§9). On import it follows
the same principle as a verdict: an existing note is never overwritten, an empty
one is filled, and where both exist and differ the existing text wins — a note is
the user's own writing, and an import must not silently edit it.

## 6. The capture pipeline

Two passes. Ingestion never waits on either — an item is usable (title, site,
tags, verdict buttons) the moment it lands, and its picture improves later.

**Pass 1, at ingestion.** For each new `url_key` with no capture: fetch the HTML
with a short timeout, no cookies, no JavaScript; parse `og:image`,
`twitter:image`, `<title>`, `<meta name=description>`, favicon; fetch and
downscale the one image. Ladder: `og:image` → `twitter:image` → none. Store the
image hash.

**Pass 2, deferred and resumable.** Renders through the paid API only the items
pass 1 could not make distinguishable:

1. **No image found.**
2. **A duplicated image** — where one image hash covers **30 or more items**,
   every one of them is treated as having no image. The threshold is a starting
   value to be moved once there is data. This is the case worth naming: fifty
   links to one documentation site inheriting one banner is *worse* than fifty
   blanks, because it looks like it worked.

Everything else keeps its metadata card.

**What drives the queue: an explicit action** (`decisions.md`, 2026-08-17). Pass
2 is deferred, and deferred work needs something to run it. The candidate host
supports no background workers, no scheduled jobs and no cron, so the first
version has **no automatic trigger at all**: a "capture the gaps" action
processes the queue while the user watches, and stops when it is done.

That is a decision about measurement rather than about effort — automating it
first would hide whether pass 2 is worth having, which is the one thing §12 says
should be measured rather than assumed. Two alternatives stay live and are cheap
to adopt later: a bounded batch processed per request, or the open tab polling
during a sitting. Both call the same processor, so choosing one is a caller
change.

**Pass 1 is unaffected.** It runs at ingestion because it is part of landing the
pile, not because it is deferred.

**Sizing.** Grid cells are ~300 px wide on a widescreen layout, so captures are
downscaled to a fixed size at capture time. Ten thousand items at that size is a
few hundred megabytes — not the constraint. Only pass 2 costs money, and only for
the minority of items that reach it.

**Failure is data.** A fetch that 404s, times out, or resolves to a parked domain
writes an `err:` tag on every item sharing that `url_key` (`err:404`,
`err:timeout`, `err:tls`). A dead link is often an instant verdict.

**Third-party disclosure, recorded as an accepted cost.** Pass 2 sends URLs to a
vendor. Metadata-first means only gap items go, not the whole pile — a fraction,
not all of it — but it is a real disclosure and is written down here rather than
argued away.

**Current configuration: no vendor.** On 2026-08-18 the user chose none at
present, so pass 2 stays off. `decisions.md` records three candidates and a
conditional recommendation; neither that shortlist nor the stubbed integration
authorises an account, a key, or spend.

### The API key, and why pass 2 ships switched off

A paid screenshot API means a secret, and a secret in a web app is only as safe
as the place it is kept. **Pass 2 therefore ships behind a switch that is off
until key custody is resolved**, and the resolution is a hosting question rather
than a coding one: the host either provides a server-side secret store and a
server-side place to call from, or it does not.

What this means concretely:

- **The key never reaches the browser.** No configuration, no proxying through a
  page, no "temporary" client-side call. If the only way to call the vendor is
  from the client, pass 2 does not ship at all.
- **The code is complete either way.** The queue, the gap rules of §6, the
  storage and the `err:` tagging are built and testable with the vendor call
  stubbed. Turning pass 2 on is configuration, not development.
- **With pass 2 off, nothing else breaks.** Gap items have no image and say so.
  That is the degraded state the metadata path was chosen for — visibly missing
  rather than confidently wrong — and it is triageable, if less pleasant.

Recorded in §10's host table as a requirement with a stated consequence, and in
§13 as the first thing the plan sequences.

## 7. The triage surface

The screen O3 and O4 describe: a screenful of items, each showing its capture,
title, tags and `note` where it has one, judged without scrolling or leaving the
keyboard.

**Layout.**

| Form factor | Layout |
|---|---|
| Widescreen | User-selectable 3×3, 2×6, 2×8 (default), or 3×12 grid |
| Tablet | 4×3 or 3×3, depending on orientation |
| Phone | One item at a time, with horizontal swipe navigation |

The grid is **virtualised**: only the visible screenful plus a small buffer
exists in the DOM. Ten thousand cells with images rendered naively is not
something to attempt, and this follows directly from the size finding. Changing
the wide-screen density redraws the current window immediately; tablet and phone
layouts stay automatic so cards remain readable. Three-row layouts reserve more
card height for text, and the 3×12 view gives its compact cards as much title
space as possible.

The default Day palette is Cream and teal; Night is Dark slate. A compact
Day/Night selector beside Help changes colors without changing navigation,
layout, collection, or selection. The browser remembers the mode locally.
Marked cards have a contrasting border (light grey at night); focus has its
own teal outline so verdict stripes cannot hide it. Junk cards remain opaque.

Above the grid, Import, Select, and Export are mutually exclusive panels in one
row. None or exactly one may be open, and the open panel receives most of the
available width. Collection and Admin controls stay separate because they set
the scope and authority for those three operations.

**Interaction is specified as functions, not as keys.** The keys below are a
first cut and are expected to be refined — very likely toward more pointer-driven
controls, since one click per item is the natural gesture for the flow in §7.1.
So the **functions** are the stable part of this spec and the bindings are one
implementation of them; a later revision may rebind everything without this
section changing.

| Function | Operates on | Key (first cut) |
|---|---|---|
| `verdict(v)` | the focused item, or the marked set if any | `k` / `j` / `a` / `n` |
| `focus(direction)` | the grid | arrows |
| `mark(item)` | one item, toggling | `space`, or a click on the item |
| `tag-apply(tags)` | the focused item, or the marked set | `t` |
| `sweep-untriaged(v)` | untriaged items on the visible page (§7.1) | — |
| `sweep-all-selected(v)` | every item in the open selection, after confirmation (§7.1, §8.3) | — |
| `undo()` | the last function applied | `u` |
| `advance()` | the grid | `⏎` |

Two properties hold for every function above, and they are the reason to name
them at all: each applies to *a set* rather than to a click target, and each is
undoable as one action. A pointer refinement that keeps both is a free change.

`undo` is not a convenience. At the speed O3 asks for, misfires are certain, and
a verdict that cannot be taken back makes the user slow down to avoid them —
which costs more than the mistakes would have.

### 7.1 Mark the exceptions, then sweep what remains untriaged

Selections are paged rather than placed into an unbounded DOM. The default
workflow operates on what the user can see:

1. Review one visible page of the current collection or selection.
2. Mark the exceptions that share a verdict and apply that verdict to the marked
   set as one action.
3. Choose the common verdict and use `sweep-untriaged` on the visible page. It
   changes only cards that still have no verdict, clears the marks, and advances
   one page.

The asymmetry is still the point. In a page of near-identical links, naming the
few worth keeping is quick; once they have been judged, the untriaged sweep can
dispose of the remainder in one gesture without overwriting those exceptions.
The selected verdict is not privileged — the exceptions can be keepers, junk,
archive, or needs-time.

The neighboring split control exposes a deliberately broader
`sweep-all-selected` mode. It applies one verdict to every item matched by the
open expression, including items on pages that are not visible, and therefore
shows the full count for confirmation first (§8.3).

**`undo` reverses every set action as one action**, not item by item. A sweep or
marked-set verdict that could only be unwound repeatedly is one nobody will
risk.

**Tagging is part of the pass** (O6): the tag field autocompletes over tags
already in the collection, applies to the current selection, and returns focus to
the grid on commit. Adding a tag is never a separate screen.

**Progress is always visible.** Untriaged count for the collection, and for the
current selection. That is O2's backlog, and it is the number that says whether a
sitting was worth it.

## 8. Selections

**A selection is one function, used everywhere.** Viewing a group of items,
exporting them, tagging them all at once, sweeping a verdict across them, seeding
a demo — every one of those takes a set of items, and there should be exactly one
thing that produces a set. It is pulled out as its own component rather than
living inside the triage screen, because it is reused more than anything else in
the app.

That also fixes the vocabulary: this document says **selection**, not cluster. A
"cluster" is a *named selection* — the word describes what the result looks like
to a person, not a separate kind of object.

**The expression** is a boolean over tags, which is what the wish asks for
literally:

```
folder:reading-research* and not topic:rust
(src:chrome-export or src:safari-export) and err:404
verdict:keep or verdict:needs-time
```

Grammar: `and`, `or`, `not`, parentheses, bare tags, `*` as a trailing prefix
wildcard, and paired wildcards around a value for contains matching. Empty
contains values and unmatched or embedded wildcards are syntax errors.
Deliberately small — a selection tool, not a language. A saved selection (§5)
is this expression plus a name.

Title, source, folder, and ordinary-tag search keys share one normalization
rule: lowercase the text, replace punctuation and symbols with spaces, collapse
whitespace, and replace the remaining spaces with dashes. A tag's first colon
remains as its conventional namespace separator, so `Topic:Modern Art` becomes
`topic:modern-art`; folder and source keep their synthetic `folder:` and `src:`
prefixes. One trailing `*` makes the normalized key a prefix match. Paired
wildcards around the value match it anywhere, as in `title:*court-drama*`,
`folder:*research*`, `src:*safari*`, or `topic:*modern-art*`. Stored tags are
unchanged, and their raw and percent-encoded exact keys remain available so
existing saved selections continue to evaluate as before.

The evaluator also exposes the current verdict as a synthetic tag, using the
same words as the interface: `verdict:keep`, `verdict:junk`,
`verdict:archive`, `verdict:needs-time`, and `verdict:untriaged`. These values
are derived from the item verdict; they are not stored in the ordinary tag
table and therefore cannot drift when a verdict changes.

**The visible Select panel has four entry routes into that evaluator:** a typed
expression, an automatic proposal, a named saved selection, and the signed-in
user's recent expression history. Opening any route records the expression in
history, newest first, without duplicates. Automatic proposals are grouped from
the current collection's normalized source, tag, folder, and title keys, plus
verdicts, capture errors, sites, and image state. Proposal, saved-selection, and history choosers
all retain a placeholder option; their adjacent Open action is neutral
until a real option is chosen and white on teal afterward, so the intended
target is visible before the action runs.

### 8.1 Scope: one collection by default, all of them for administration

The evaluator can select across the whole store; the ordinary UI does not let it.

- **In the user interface**, every selection is implicitly wrapped as
  `collection:<current> and ( … )`. The wrapping is applied by the app, not typed
  by the user, so a user's expression can never reach another collection's items
  by accident or by construction.
- **Administrative use** — maintenance, migration, seeding a demo template,
  measuring the capture cache — evaluates unwrapped, across collections. That is
  the `collection_id: null` case in §5.

Making this a property of *how the selection is invoked* rather than of the
grammar is what keeps one implementation. The alternative — a separate
"admin query" path — is a second evaluator that will drift from the first.

### 8.2 Tags are how clusters come to exist, and there are three ways to write them

Automatic clustering is not a separate mechanism sitting beside selections. It is
**tag production**: something adds tags, and a selection over those tags is the
cluster. Three routes, and all three end in the same place:

| Route | How it works | Notes |
|---|---|---|
| **In the app** | Make a selection, apply a tag to all of it | The direct case, and the fast path during a triage pass (§7) |
| **Round trip through a file** | Export a selection (§9), have a program or a skill add tags to the items in the file, import it back | Tags union on import, so this adds without disturbing anything already there. The most open-ended route: whatever can read JSON can tag |
| **A skill or app, on a selection** | Hand a selection to an agent and ask it to propose tags that represent a meaningful clustering, at the user's request | The wish's own suggestion that some capabilities may arrive "initially or exclusively through an LLM agent". Proposals, not writes: what comes back is a set of suggested tags the user accepts or discards |

Three consequences worth stating, because they are the payoff for defining it
this way:

- **The app does not need clustering intelligence of its own** to satisfy O5. It
  needs selections, tag-apply, and a round trip — and the intelligence can arrive
  later, or from three different directions, without a schema change.
- **Nothing here is privileged.** A tag written by a skill is the same as one
  typed by the user, which is what §5's "the schema is not fixed" is for.
- **Cheap in-app proposals still earn their place** — same site, normalized
  source, tag, or folder key, and near-identical titles are signals the app
  already holds, and offering them as pre-filled selections costs almost
  nothing. They are a convenience on top of the three routes, not a fourth one.

### 8.3 Judging a selection as one

Selecting a group and applying a verdict applies it to every item in the group,
with `undo` reversing the whole thing as one action. §7.1 applies the same set
semantics at two bounded scopes: a marked set and the untriaged items on the
visible page. The explicit Sweep all selected mode is the unbounded form.
Judging fifty near-identical links as a few page actions rather than fifty
isolated decisions is the difference between an afternoon and a month.

**Confirmation is asked for the unbounded action, not the large visible one**
(`decisions.md`, 2026-08-17). An earlier draft confirmed above a count — "say 25
items" — which fires on nearly every useful group operation and becomes a
dialogue people dismiss without reading. The current rule instead:

- **No confirmation for a verdict on the focused bookmark, a marked set, or the
  untriaged cards on the visible page.** The affected records are in front of
  the user, and `undo` reverses the action as one step.
- **Confirm, showing the count, for Sweep all selected.** A selection may span
  many virtual pages, so most affected records are not visible even though the
  expression is open. The broader mode is an explicit choice beside the default
  page sweep and never inherits the visible-page assumption.

The discriminator is therefore **visibility, not cardinality**. It costs one
question when the action reaches beyond the visible page and none in the path
§7.1 exists to make fast.

**What would change this:** a sweep turning out to be regretted often enough
that `undo` is not sufficient recovery — which would be an argument for a
confirmation on the visible path too, and phase 4 measures it rather than
assuming either way (`test-plan.md` §4.4).

## 9. Export and import

O7 is a round trip, not a download. An export is JSON:

```json
{
  "format": "bookmark-sorter/v1",
  "exported_at": "2026-08-15T00:00:00Z",
  "collection": "personal",
  "selection": "folder:reading/*",
  "items": [
    {
      "url": "https://example.com/page?x=1",
      "title": "Example page",
      "note": "the section on lifetimes is the useful bit",
      "added_at": "2019-03-04",
      "tags": ["src:chrome-export", "in:2026-08-15", "folder:reading"],
      "verdict": "keeper",
      "verdict_at": "2026-08-15T00:00:00Z"
    }
  ]
}
```

- **Export takes a selection** — the §8 function, not a separate "choose what to
  export" mechanism. Whole collection, one folder, everything tagged `keeper`,
  everything a skill just proposed a tag for: all the same call with a different
  expression. The expression is recorded in the file as `selection`, so a partial
  export is self-describing.
- **No captures.** They are a rebuildable convenience; the judgement is what must
  not be trapped. This also keeps the file small enough to move around.
- **Import is the merge of §4**, keyed by normalised URL: tags union, earliest
  date wins, and an existing verdict or `note` is not overwritten. Re-importing
  what you exported is a no-op, which is the test that makes O7 mean something.
- **This export is the only one.** There is no platform-native dump beside it
  (`decisions.md`, 2026-08-17), which is what keeps O7 independent of the host —
  and what puts the whole weight of getting the data out on this format. A
  whole-collection export is the §8 selection with no filter, not a second
  mechanism.
- **Import carries the cost of that choice, at scale.** The merge semantics are
  §4's and do not change; what changes is that a full 10,000-item document goes
  through the same path as a small one. Whether either side needs chunking is a
  question for phase 0 rather than an assumption here.
- **The visible Export panel names the scope before download.** Current
  collection emits every item; Current selection supplies the open expression.
  The file is named from the collection. The same visible Import panel accepts
  the result through its chooser or drop target, so portability is an ordinary
  user workflow rather than an undocumented API capability.

Because the capture store is URL-keyed and global, a re-import gets its pictures
back from cache rather than paying the API again.

### 9.1 Exporting from one collection into another

The round trip is not only a backup: **the destination may be a different
collection, including someone else's.** The case that matters is building a demo
— select the part of a personal collection worth showing, export it, and import
it into a demo template (§10):

1. In the personal collection, select the subset — say `topic:rust and keeper`.
2. Export. The file carries items, tags and verdicts, and no captures.
3. Switch to the destination collection and import the file there.

What the destination gets, and what it does not:

- **Items, tags and verdicts arrive**; nothing else does. Since captures are
  keyed by URL globally (§5), the imported items show their pictures immediately
  without a single new capture — which is what makes seeding a demo nearly free.
- **The source collection is unchanged.** Export reads; it never moves an item
  out.
- **Verdicts travel, which is a decision rather than an accident.** A demo built
  from a triaged collection arrives pre-judged, so anyone triaging the copy is
  re-doing work. Strip them with a selection on import, or accept them as a
  worked example — the spec's position is that the file carries them and the
  person seeding chooses, because a format that silently dropped verdicts would
  fail O7 for every other use.
- **Everything crosses as a file**, so nothing here needs cross-collection
  *access*. The general sharing scheme stays deferred (§10), and this scenario
  works without it — which is exactly why it is worth writing down as the
  supported path.

## 10. Collections, identity, and what the host must supply

Collections are owned and **private by default** (O8). Identity comes from the
host — the decision presumed an OpenAI surface where user IDs are built in.

The Site itself is public so anyone can reach the entry page. The application
has two server-side gates before it creates or reads user data:

1. Both the opaque user id and normalized email must be present in the identity
   headers supplied by Sign in with ChatGPT. Otherwise `/` shows a polite
   sign-in action and API requests return `401`.
2. The identity must match `authorized_user` by normalized email or linked
   Site-specific user id. Otherwise `/` names the signed-in email and politely
   says it is not yet authorized, while API requests return `403`.

The first authorized email match records that Site's opaque user id on the row,
so later requests can match either value. A failed allowlist check creates no
`app_users` row and no personal collection.

**The collection and file controls** the wish's amendment asks for: choose,
create, or rename a private collection; import bookmark HTML or an export file;
copy a demo template; export the collection or current selection; and erase the
current collection only after confirmation. Import, Select, and Export are the
mutually exclusive row specified in §7.

The separate **Admin** surface is rendered only when the matched authorized
user has `type = admin`. The same server-side check gates
user-list changes, sitting inspection/end, capture actions, and template
creation. The table may also contain `type = user`; that row records an allowed
user without granting Admin. Ownership continues to use the host's opaque id,
never email.

### 10.1 Demo collections: a template, and copies of it

A personal collection is simple — one owner, private, nothing else to say. A demo
is where the detail lives, and it splits into two kinds of collection:

- **`demo-template`** — the source. Created and edited by a maintainer, and
  **readable by every authorized signed-in user** so that they can copy it.
  Nobody but a maintainer writes to it.
- **`demo-copy`** — what a tester actually uses. An ordinary private collection,
  owned by them, populated from a template at copy time, and thereafter
  completely independent: their verdicts, their tags, their mess.

Copying is the only relationship. A copy never syncs back, and editing the
template never disturbs an existing copy — which is what makes a template safe to
improve while people are using copies of it.

**Operations, which is what the review asked for:**

| Operation | Who | What happens |
|---|---|---|
| Create or edit a template | an administrator, or a user with the retained legacy `can_edit_templates` capability | Ordinary editing, in a collection of kind `demo-template`. Seeded like any other collection — including by importing an export from a personal one (§9.1) |
| List templates | any authorized signed-in user | Templates are the one thing visible across owners |
| Take a copy | any authorized signed-in user | New `demo-copy`, owned by them, `template_id` and `copied_at` recorded, name defaulting to the template's and editable |
| Take a *fresh* copy | any authorized signed-in user | The same operation again. A dirtied copy is not repaired in place; a second copy is made, and the name must differ from the first, which is why the name is editable at copy time |
| Delete a copy | its owner | Deletes that collection and its items. Captures are untouched — they are URL-keyed and shared (§5) |

**What this requires us to know.** Exactly three things beyond a personal
collection, which is the point of writing it out:

1. **About the user** — the host's opaque owner id and normalized email. The
   email or a previously linked Site user id must match `authorized_user` before
   any collection is opened. Administrator status grants template editing and
   the Admin operations above; the older `can_edit_templates` boolean remains
   supported for template editing only after allowlist admission.
2. **About the collection** — its `kind`, and for a copy, `template_id` and
   `copied_at`. Enough to answer "where did this come from" and "is this stale
   relative to its template", without any syncing machinery.
3. **Nothing about sharing.** No reader lists, no ACLs, no revocation.

### 10.2 How this sits with the decision to defer sharing

`decisions.md` (2026-08-14) settled demo collections as **seeded per-user copies**
and deferred a general sharing scheme, while flagging the reading that would
undo it: *one system-owned demo collection that many users read is sharing.*

What §10.1 specifies is the per-user-copy reading, with the template that
decision implied made explicit. The one thing it adds is that **a template is
readable by all authorized signed-in users** — otherwise nobody could copy it. That is a
real cross-user read, and it is worth naming rather than glossing:

- It is **read-only and one-way**. No user can write to a template, and no user
  can see another user's copy.
- It applies **only to `demo-template`**, which exists to be copied. Personal
  collections remain invisible to everyone but their owner.
- It is **not the general scheme** — there is no way to share a personal
  collection with a named person, which is still deliberately later.

So the deferral holds. If a future need is "show my collection to one colleague",
that is the general scheme and this is not a substitute for it.

**What the host has to provide, and what happens if it cannot.** Both remaining
uncertainties in `objectives.md` are here, and they are the first thing the plan
should resolve:

| Requirement | Used by | If the host lacks it | Observed on ChatGPT Sites, 2026-08-18 |
|---|---|---|---|
| Signed-in user identity | O8, §5 | Sign-in becomes something to build — not a small piece of work | **Pass, with one test still deferred.** Server code received a stable opaque user id, email and full name from Sign in with ChatGPT without returning their values to the browser. One signed-in account was exercised; two-account stability remains an O8 test rather than a platform assumption |
| A database with per-user rows | All state | Substitute any hosted store; the model in §5 is portable | **Pass for host capability.** D1 stored 10,003 probe rows. An owner-scoped insert and read returned the caller's 10,001 rows while the shared table also held two synthetic template-owner rows. Isolation is application query logic, as §5 assumes; a hostile second-user read remains a phase 6 test |
| Outbound HTTP to arbitrary URLs | §6 pass 1 | Metadata capture cannot run in-platform; captures move behind the same vendor as pass 2, at real cost | **Pass.** Server-side `fetch` returned 200 and 404 responses as expected, a 100 ms abort was observed as a timeout, and ten concurrent requests completed in 151 ms |
| A response large enough to stream the whole pile out | O7 | O7 is served by **the app's own export** (§9), not by any platform facility (`decisions.md`, 2026-08-17), so no host can fail this outright. What a host can do is cap a response or a request duration — in which case export and import chunk, which is work rather than a wall | **Pass at the target size.** The app seeded and exported 10,000 items as a complete `bookmark-sorter/v1` JSON document: 1,525,841 bytes, parsed in the browser after a 1,786 ms response |
| A server-side secret store, and a server-side place to call from | §6 pass 2 | The screenshot API key cannot be held safely, so pass 2 stays switched off and gap items keep no image. Everything else still works | **Pass.** A 43-character secret was read only in server code, an outbound call from that code succeeded, and the response exposed only presence and length, never the value |
| Read access across owners for one collection kind | §10.1 | Templates cannot be listed or copied, and a demo has to be seeded per tester by a maintainer instead | **Pass by construction.** The app inserted two rows owned by a synthetic template owner and could return them when its own query requested cross-owner data. The host imposed no row-level barrier, so `demo-template` access can remain an explicit application rule |
| Control over layout density | O3 | The 8×2 grid degrades; triage speed is the first casualty | **Pass on the deciding layout.** Sixteen 300 px cells rendered as 8×2 at a 2,600×1,200 viewport with no horizontal page scroll. Tablet and phone behavior remain phase 2 product tests |
| Metered storage and usage | All phases; R2 in §6 | A limit that binds at the real pile changes the host, while an unacceptable price needs the user's authority | **Approved 2026-08-19 for this build.** The user accepted the Sites costs and plan-specific limits for the intended 10,000-item pile, D1 state, and up to a few hundred MB of derived captures. That approval does not include a paid screenshot vendor |

Anything that fails this table is a reason to revisit §2 before building, not
after.

**One row left this table on 2026-08-17.** It used to read *"Bulk data export —
O7 fails outright — this is the hard requirement"*, and it was the row phase 0
existed to answer first. Deciding that the app streams its own export dissolved
it: any host that can run the app can run the endpoint. What remains is the
milder question above, and it is worth recording that the largest risk in the
plan was removed by a choice rather than by a finding.

## 11. The extensions, if they arrive

`objectives.md` holds tab harvesting and pushing subsets back into a browser out
of the first version, and notes the wish's own suggestion that they may come
*"initially or exclusively through an LLM agent"*. Taking that seriously here,
because §2's choice made it the cheap path:

An agent with browser access can read open tabs and create tab groups; the app
cannot. So the app's part is to **be scriptable rather than to grow a browser
integration**: the export format of §9 is the interchange, and a selection-based
export is exactly what "create a tab group from this subset" needs as input.

This is why §8 pulls selection out as a function and §9 defines export as taking
one. **Export is a function with a selection argument, not a menu action** — the
menu is one caller. The others are already in this spec: a skill proposing tags
over a round trip (§8.2), seeding a demo template (§9.1), and whatever an agent
does with a subset later. Anything that narrows export to fit the download
button closes all three.

## 12. How fast is fast enough

`objectives.md` declines to set a rate target, on the grounds that setting one
now would be a guess dressed as a requirement. This spec keeps that and specifies
**the instrument instead**:

- The app records, per triage session, items judged and elapsed time, so a real
  rate exists after the first sitting rather than being estimated.
- The first measured baseline is taken on a few hundred real items, and the
  target is written into this section then.
- What is specified now is the *shape*: the grid must never wait on a capture,
  and no triage action may cost a page load.

## 13. Open for the plan

- Whether pass 2 ever proves valuable enough to reopen the current no-vendor
  decision, accept target-URL logging, and authorize its separate cost. Its
  server-only key custody and explicit switch are already settled.
- The throughput target in §12, which remains intentionally unset until the
  optional sitting data is used directly.
- Anything explicitly held out of this version: general sharing, harvesting
  open tabs, and pushing selected subsets back into a browser.

The earlier questions about the Sites host and cost, multiple private
collections, demo seeding mechanics, proposal timing, and the proposals-file
shape were settled during phases 0–6 and are recorded in `decisions.md` and
`plan.md` rather than left open here.
