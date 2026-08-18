---
name: update-deck-events
description: Refresh the Events topic of every current or future deck page that has a date range, by searching for festivals, fairs, religious celebrations, concerts, and theater happening in that place during that window and reconciling them against the events already on the page and on its reject page. Use when the user asks to update, refresh, or check deck events ("update the deck events", "find new events for the Rockies deck", "any new festivals for our October dates"), and for a scheduled sweep of upcoming decks.
---

# Refreshing deck events

Event listings go stale between the day a deck page is written and the day the
trip happens: programs are published late, dates move, and things get added. This
walks the decks that still lie ahead, finds what is newly known, and folds it
into the page without disturbing the choices the user has already made there.

The two rules that matter most are subtractive. **Never reorder what is on the
page** - a list that is out of date order is out of date order because the user
promoted something. **Never re-add a rejected event** - the reject page is the
record of what they already turned down.

Read `AGENTS.md` ("Item numbers", "Editing by number: promote and reject",
"Locations", "URLs", "Merged list items") before writing anything;
`DECK_ITEMS_TECHDOC.md` has the markup and reject-page reference.

## 1. Resolve the scope

Default scope, with no argument: every deck whose `deck.json` has
`"group": "Current"` or `"group": "Future"`.

```bash
grep -l '"group": "\(Current\|Future\)"' decks/*/deck.json
```

| Argument | Scope |
|---|---|
| *(none)* | All `Current` and `Future` decks |
| `rockies` | That deck only, whatever its group |
| `rockies/santa-fe` | That section page only |
| `--include-option` | Adds `Option` decks to the default scope |
| `--dry-run` | Search and report, change nothing |

`Option` decks are excluded by default because an option is not yet a trip. They
are one word away when the user wants them, and naming a deck explicitly always
wins over its group.

## 2. Find the pages with a date range

Within each deck in scope, consider every page under `sections/`, excluding
`*-reject.html`. A page qualifies when it carries a date range in either place:

- the header card's `<p class="meta">`, e.g. `Thursday, October 1–Thursday, October 15, 2026`
- the `Dates:` bullet of the Basic Info topic

```bash
grep -o '<p class="meta">[^<]*' decks/*/sections/*/*.html
grep -o '<strong>Dates:</strong>[^<]*' decks/*/sections/*/*.html
```

A page can carry more than one range - `October 1–8 and December 23–30, 2026` is
two windows, and both are searched. Skip a page whose every range ends before
today, even in a `Current` deck, and say so in the report rather than silently
passing over it.

The place is the section's own subject: its `<h1>`, the Basic Info topic, and the
map's marker names. A section covering two towns is searched for both.

## 3. Search

For each page and window, look for festivals, fairs, religious and civic
celebrations, markets, concerts, theater, dance, film programs, and sporting
events open to visitors. Search the sources a local would use, not just the
first aggregator:

| Source | Query shape |
|---|---|
| Official tourism calendar | `<city> what's on October 2026`, `visit <city> events calendar` |
| Festivals | `<city> festival October 2026`, `<region> fair <month> 2026` |
| Religious calendar | `<city> feast day <month> 2026`, `<region> temple festival <month> 2026` |
| Major venues | `<concert hall|theater|opera|arena> <city> schedule October 2026` |
| Free and street events | `<city> free concerts <month> 2026`, `<city> street market <month> 2026` |
| Local press listings | `<city> events guide <month> 2026` |

Rules for what may leave the search and reach the page:

- **A source must give a date inside the window.** No date, no item. An event
  that is expected but whose program is unpublished belongs in the report, not
  on the page - unless the page already has a "check this calendar" entry, in
  which case confirm the link still resolves.
- **Prefer the organizer or venue** over an aggregator, and link what you used.
- **Never invent** a date, an address, a price, or a URL. A detail that is not in
  a source is left out.
- Recurring weekly things (a Saturday market) count when they fall in the window.

## 4. Reconcile against the page and its reject page

Read both files before deciding anything: `overview.html` and, if it exists,
`overview-reject.html`.

Two entries are the same event when the organizer and the window substantially
match, including a renamed annual edition - "35th Santa Fe Wine & Chile Fiesta"
and "Santa Fe Wine and Chile Fiesta 2026" are one event. When it is genuinely
unclear, treat them as the same and merge: a duplicate entry is worse than a
slightly over-full one, and `AGENTS.md` asks for merged list items anyway.

| Found event | Action |
|---|---|
| On the page, nothing new | Ignore |
| On the page, adds significant detail | Merge into that item, keeping its number |
| On the page, contradicts it - date moved, venue changed, canceled | Correct that item, keeping its number, and name the change in the report |
| On the reject page, nothing new | Ignore |
| On the reject page, adds significant detail | Update the item **on the reject page**, leave the page alone, and report it so the user can promote it back |
| Nowhere | Add to the Events topic with a new number |

**Significant detail** is a confirmed date or time where the page said "to be
announced", a venue or address, a program or lineup, a ticket link, a booking
deadline or price, a cancellation, or a date change. Rewording, marketing copy,
and a second source for something already stated are not significant - if the
only change is how it reads, leave the item alone.

A rejected event never returns to the page on this skill's initiative, however
good the new detail is. Rejection is a standing instruction; promotion is how
the user reverses it.

## 5. Write the changes

New items follow the same conventions as any hand-written one:

- A three-digit number, random, unique across the page and its reject page,
  shown as `<span class="item-id">{nnn}</span>` at the end of the bold label.
  Create the Events topic if a dated page somehow lacks one.
- Location detail per `AGENTS.md`: name, one-line summary, street address (in
  both scripts where the country uses a non-Roman one), concise hours, and a
  Google Maps link.
- Every URL found is linked from the text, per `AGENTS.md`.
- A new venue gets a marker in the page's map locations array, with a color and
  icon consistent with the markers already there.

Placement, which is where this skill can most easily do damage:

- **Do not move an existing item.** Not to sort, not to group, not to tidy.
- Insert a new item in date order **within the run of items that is still in
  date order** - the tail. Never above an item that is out of date order,
  because that item is there by promotion.
- If the whole list is out of date order, append new items at the end.

Keep a run proportionate: roughly eight new items per page is a full pass. When
the search turns up more, add the largest, the free, and the ones unique to that
place, and list the remainder in the report for the user to ask for.

## 6. Report

Per page, in one table:

| Page | Added | Updated | Rejects updated | Ignored | Skipped |
|---|---|---|---|---|---|
| `rockies/santa-fe` | 3 (`{712}`, `{188}`, `{406}`) | 1 (`{104}` - dates confirmed) | 1 (`{592}` - new venue) | 6 | - |

Then, in prose: anything found whose dates are not yet published, anything that
contradicts what was on the page, and anything trimmed for length. Name the
reject-page updates explicitly - they are the items the user may want to promote
back, and they are invisible on the page itself.

## 7. Finish the run

- Run `npm run build` once, after the last edit.
- Screenshot each changed page with `npm run screenshot`, per the build and
  visual verification workflow in `AGENTS.md`.
- Commit on the session's branch and open a pull request describing which decks
  were swept and what changed, per the repository's git workflow.

## Guardrails

- Never delete an event from a page. Removal is the user's `reject`.
- Never renumber an item, and never reuse a retired number.
- Never touch a `Past` deck, a deck outside the resolved scope, or anything under
  `initiatives/`.
- Never edit a topic other than Events, except to add a map marker for an event
  being added.
- A second run straight after the first should change nothing. If it does, the
  matching in step 4 was too strict - most often a renamed annual edition that
  got added twice.
