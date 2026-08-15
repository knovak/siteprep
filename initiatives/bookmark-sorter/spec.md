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
deferred capture pipeline (§6), and clusters being the mechanism rather than a
convenience (§8).

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

- **collection** — `id`, `name`, `owner_id`, `created_at`.
- **item** — `id`, `collection_id`, `url` (as saved), `url_key` (normalised,
  unique per collection), `title`, `added_at`, `ingested_at`, `verdict` (null =
  untriaged), `verdict_at`.
- **tag** — `item_id`, `tag`. A flat string namespaced by convention (`src:`,
  `in:`, `folder:`, `topic:`, `site:`, `kind:`, `err:`). Flat because O5's
  selection is over tags, and a hierarchy would need a second query language.
- **cluster** — `id`, `collection_id`, `name`, `kind` (`saved-query` |
  `automatic`), `expression` (for saved queries).
- **capture** — keyed by `url_key`, **not** by item: `image_ref`, `source`
  (`og` | `screenshot` | `none`), `captured_at`, `image_hash`, `state`.
- **user** — supplied by the host (§10), referenced by `owner_id` only.

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

**Interaction.** Every triage action has a key. A verdict applies to the focused
item, or to the whole selection when several are selected:

| Key | Action |
|---|---|
| `k` / `j` / `a` / `n` | keeper / junk / archive / needs-more-time |
| arrows | move focus within the grid |
| `space` | toggle selection |
| `t` | open the tag field for the focused item or the selection |
| `u` | undo the last action |
| `⏎` | advance to the next screenful |

`u` is not a convenience. At the speed O3 asks for, misfires are certain, and a
verdict that cannot be taken back makes the user slow down to avoid them —
which costs more than the mistakes would have.

**Tagging is part of the pass** (O6): the tag field autocompletes over tags
already in the collection, applies to the current selection, and returns focus to
the grid on commit. Adding a tag is never a separate screen.

**Progress is always visible.** Untriaged count for the collection, and for the
current cluster. That is O2's backlog, and it is the number that says whether a
sitting was worth it.

## 8. Clusters

Two ways in, one presentation (O5).

**Saved queries** — a boolean expression over tags, which is what the wish asks
for literally:

```
folder:reading/* and not topic:rust
(src:chrome-export or src:safari-export) and err:404
```

Grammar: `and`, `or`, `not`, parentheses, bare tags, and `*` as a trailing
wildcard on a tag. Deliberately small — it is a selection tool, not a language.

**Automatic clusters** — proposed by the app, from signals it already has: same
site, same folder path, near-identical titles, and shared topic tags. They are
proposals; naming one saves it as a cluster, and a cluster can always be edited
into a saved query.

**Judging a cluster as one** is the point: selecting a cluster and pressing a
verdict key applies it to every item in it, with a confirmation above a
threshold (say 25 items) and `u` still undoing the whole thing. Judging fifty
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

- **A subset can be chosen by tag** — the same expression grammar as §8, recorded
  in the file as `selection` so a partial export is self-describing.
- **No captures.** They are a rebuildable convenience; the judgement is what must
  not be trapped. This also keeps the file small enough to move around.
- **Import is the merge of §4**, keyed by normalised URL: tags union, earliest
  date wins, and an existing verdict is not overwritten. Re-importing what you
  exported is a no-op, which is the test that makes O7 mean something.

Because the capture store is URL-keyed and global, a re-import gets its pictures
back from cache rather than paying the API again.

## 10. Collections, identity, and what the host must supply

Collections are owned and **private by default** (O8). Identity comes from the
host — the decision presumed an OpenAI surface where user IDs are built in.

**Demo collections are seeded per-user copies.** A tester signs in and receives
their own collection populated from fixed content; it is an ordinary private
collection that happened to arrive pre-filled. Not one shared demo collection —
that would be the sharing model this project deliberately deferred, and it would
have testers overwriting each other's verdicts, which is precisely the thing
being tested.

**The menu** the wish's amendment asks for: choose collection, import bookmarks,
import from an export file, export (with an optional tag selection).

**What the host has to provide, and what happens if it cannot.** Both remaining
uncertainties in `objectives.md` are here, and they are the first thing the plan
should resolve:

| Requirement | Used by | If the host lacks it |
|---|---|---|
| Signed-in user identity | O8, §5 | Sign-in becomes something to build — not a small piece of work |
| A database with per-user rows | All state | Substitute any hosted store; the model in §5 is portable |
| Outbound HTTP to arbitrary URLs | §6 pass 1 | Metadata capture cannot run in-platform; captures move behind the same vendor as pass 2, at real cost |
| Bulk data export | O7 | O7 fails outright — this is the hard requirement |
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
integration**: the export format of §9 is the interchange, and a tag-selected
export is exactly what "create a tab group from this subset" needs as input.
Nothing more is specified now — but the export is the seam, and it should not be
narrowed to fit only the download button.

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

- Which OpenAI surface, judged against the table in §10.
- Which screenshot vendor, and what its retention terms are — the disclosure in
  §6 is easier to accept from a vendor that does not keep the images.
- Whether a user may hold several collections of their own. The wish's "one per
  user" implies not; the "choose collection" menu has to render either way, and
  §5 does not prevent it.
- What seeds the demo collection, and where that content lives.
- Whether automatic clustering runs at ingestion or on demand. It is the one
  place in §8 where cost and freshness pull against each other.
