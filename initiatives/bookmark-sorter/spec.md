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
Both land in the *current* collection.

Parsing an export yields, per item: title, URL, `add_date` where the file
carries it, and the enclosing folder path.

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

Six things. Written as a relational sketch; the host's database decides the
literal form (§10).

- **collection** — `id`, `name`, `owner_id`, `kind` (`personal` |
  `demo-template` | `demo-copy`), `template_id` (for a copy, which template it
  came from), `copied_at`, `created_at`. §10 says what the kinds do.
- **item** — `id`, `collection_id`, `url` (as saved), `url_key` (normalised,
  unique per collection), `title`, `added_at`, `ingested_at`, `verdict` (null =
  untriaged), `verdict_at`.
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
- **capture** — keyed by `url_key`, **not** by item: `image_ref`, `source`
  (`og` | `screenshot` | `none`), `captured_at`, `image_hash`, `state`.
- **user** — supplied by the host (§10), referenced by `owner_id`, plus one
  app-level capability: `can_edit_templates` (§10).

**Two structural constraints, both from decisions rather than taste:**

1. **The capture store is global and URL-keyed**, shared across collections. It
   is what makes seeded demo collections nearly free — twenty testers with the
   same demo cost one capture between them — and what makes re-import cheap.
2. **A collection's identity is separable from its owner.** `owner_id` is a
   column on the collection, and *nothing else joins through the user to reach an
   item*. This is the one live constraint `objectives.md` puts on the spec:
   sharing is planned, and this is the difference between adding it later and
   retrofitting it.

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
title and tags, judged without scrolling or leaving the keyboard.

**Layout.**

| Form factor | Layout |
|---|---|
| Widescreen | 8×2 grid, 16 items |
| Tablet | 4×3 or 3×3, depending on orientation |
| Phone | Carousel, one item at a time |

The grid is **virtualised**: only the visible screenful plus a small buffer
exists in the DOM. Ten thousand cells with images rendered naively is not
something to attempt, and this follows directly from the size finding.

**Interaction is specified as functions, not as keys.** The keys below are a
first cut and are expected to be refined — very likely toward more pointer-driven
controls, since one click per item is the natural gesture for the flow in §7.1.
So the **functions** are the stable part of this spec and the bindings are one
implementation of them; a later revision may rebind everything without this
section changing.

| Function | Operates on | First-cut binding |
|---|---|---|
| `verdict(v)` | the focused item, or the marked set if any | `k` / `j` / `a` / `n` |
| `focus(direction)` | the grid | arrows |
| `mark(item)` | one item, toggling | `space`, or a click on the item |
| `tag-apply(tags)` | the focused item, or the marked set | `t` |
| `verdict-rest(v)` | the current selection **minus** the marked set (§7.1) | — |
| `undo()` | the last function applied | `u` |
| `advance()` | the grid | `⏎` |

Two properties hold for every function above, and they are the reason to name
them at all: each applies to *a set* rather than to a click target, and each is
undoable as one action. A pointer refinement that keeps both is a free change.

`undo` is not a convenience. At the speed O3 asks for, misfires are certain, and
a verdict that cannot be taken back makes the user slow down to avoid them —
which costs more than the mistakes would have.

### 7.1 Mark the exceptions, then sweep the rest

The flow that makes a large selection finishable, and the reason `verdict-rest`
exists as a function of its own:

1. Display every member of a selection (§8), not a screenful at a time.
2. Mark the exceptions — one click per item, no keyboard, no dialogue. Typically
   a handful out of dozens.
3. Apply a verdict to **everything that was not marked**.

The asymmetry is the point. In a selection of fifty near-identical links, naming
the four worth keeping is quick and judging all fifty is not, so the cheap action
should be the one done per item and the sweep should be the single gesture. Two
consequences for the implementation:

- **The marked set is a selection too**, so the same three steps also run
  inverted — mark the keepers, then junk the rest, or mark the junk and keep the
  rest. Nothing in the flow privileges a particular verdict.
- **`undo` reverses the sweep as one action**, not item by item. A sweep across
  fifty items that could only be unwound fifty times is a sweep nobody will risk.

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
folder:reading/* and not topic:rust
(src:chrome-export or src:safari-export) and err:404
```

Grammar: `and`, `or`, `not`, parentheses, bare tags, and `*` as a trailing
wildcard. Deliberately small — a selection tool, not a language. A saved
selection (§5) is this expression plus a name.

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
- **Cheap in-app proposals still earn their place** — same site, same folder
  path, near-identical titles are signals the app already holds, and offering
  them as pre-filled selections costs almost nothing. They are a convenience on
  top of the three routes, not a fourth one.

### 8.3 Judging a selection as one

Selecting a group and applying a verdict applies it to every item in the group,
with a confirmation above a threshold (say 25 items) and `undo` reversing the
whole thing as one action. §7.1's mark-then-sweep is the same operation with an
exception set, and it is the common case in practice. Judging fifty
near-identical links as one group is the difference between an afternoon and a
month.

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
  date wins, and an existing verdict is not overwritten. Re-importing what you
  exported is a no-op, which is the test that makes O7 mean something.

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

**The menu** the wish's amendment asks for: choose collection, import bookmarks,
import from an export file, export (taking a selection, §8).

### 10.1 Demo collections: a template, and copies of it

A personal collection is simple — one owner, private, nothing else to say. A demo
is where the detail lives, and it splits into two kinds of collection:

- **`demo-template`** — the source. Created and edited by a maintainer, and
  **readable by every signed-in user** so that they can copy it. Nobody but a
  maintainer writes to it.
- **`demo-copy`** — what a tester actually uses. An ordinary private collection,
  owned by them, populated from a template at copy time, and thereafter
  completely independent: their verdicts, their tags, their mess.

Copying is the only relationship. A copy never syncs back, and editing the
template never disturbs an existing copy — which is what makes a template safe to
improve while people are using copies of it.

**Operations, which is what the review asked for:**

| Operation | Who | What happens |
|---|---|---|
| Create or edit a template | a user with `can_edit_templates` | Ordinary editing, in a collection of kind `demo-template`. Seeded like any other collection — including by importing an export from a personal one (§9.1) |
| List templates | any signed-in user | Templates are the one thing visible across owners |
| Take a copy | any signed-in user | New `demo-copy`, owned by them, `template_id` and `copied_at` recorded, name defaulting to the template's and editable |
| Take a *fresh* copy | any signed-in user | The same operation again. A dirtied copy is not repaired in place; a second copy is made, and the name must differ from the first, which is why the name is editable at copy time |
| Delete a copy | its owner | Deletes that collection and its items. Captures are untouched — they are URL-keyed and shared (§5) |

**What this requires us to know.** Exactly three things beyond a personal
collection, which is the point of writing it out:

1. **About the user** — one capability, `can_edit_templates`. Not a role system:
   a single boolean separating "can publish a demo" from "can use one".
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
readable by all signed-in users** — otherwise nobody could copy it. That is a
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

| Requirement | Used by | If the host lacks it |
|---|---|---|
| Signed-in user identity | O8, §5 | Sign-in becomes something to build — not a small piece of work |
| A database with per-user rows | All state | Substitute any hosted store; the model in §5 is portable |
| Outbound HTTP to arbitrary URLs | §6 pass 1 | Metadata capture cannot run in-platform; captures move behind the same vendor as pass 2, at real cost |
| Bulk data export | O7 | O7 fails outright — this is the hard requirement |
| A server-side secret store, and a server-side place to call from | §6 pass 2 | The screenshot API key cannot be held safely, so pass 2 stays switched off and gap items keep no image. Everything else still works |
| Read access across owners for one collection kind | §10.1 | Templates cannot be listed or copied, and a demo has to be seeded per tester by a maintainer instead |
| Control over layout density | O3 | The 8×2 grid degrades; triage speed is the first casualty |

Anything that fails this table is a reason to revisit §2 before building, not
after.

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

- **Where the screenshot API key lives**, which §6 makes the gate on pass 2. It
  is the first thing to sequence: the pipeline is built and tested with the
  vendor call stubbed, and shipping it is a configuration change once the answer
  exists.
- Which OpenAI surface, judged against the table in §10.
- Which screenshot vendor, and what its retention terms are — the disclosure in
  §6 is easier to accept from a vendor that does not keep the images.
- Whether a user may hold several collections of their own. The wish's "one per
  user" implies not; the "choose collection" menu has to render either way, and
  §5 does not prevent it.
- What seeds the demo collection, and where that content lives.
- Whether the app's own cheap cluster proposals (§8.2) are computed at ingestion
  or on demand. It is the one place in §8 where cost and freshness pull against
  each other.
- What a skill hands back in §8.2 — a list of proposed tags, or tags already
  attached to item ids — and how the user accepts or discards them.
