---
name: update-deck-events
description: Refresh the Events topic of every current or future deck page that has a date range, by searching for festivals, fairs, religious celebrations, concerts, and theater happening in that place during that window and reconciling them against the events already on the page and on its reject page. Also checks the calendar of every entertainment venue listed for that place in venues.json, and maintains that list when the user adds, removes, or corrects a venue ("add the Tivoli to the Brisbane venues"). Use when the user asks to update, refresh, or check deck events ("update the deck events", "find new events for the Rockies deck", "any new festivals for our October dates"), and for a scheduled sweep of upcoming decks.
---

# Refreshing deck events

Event listings go stale between the day a deck page is written and the day the
trip happens: programs are published late, dates move, and things get added. This
walks the decks that still lie ahead, finds what is newly known, and folds it
into the page without disturbing the choices the user has already made there.

Some places have venues the user follows closely - a performing arts centre, a
concert hall, a pub with live music. Those are listed in
[`venues.json`](venues.json), with the URL of each venue's events calendar, and
every listed venue is checked for every window in its place (step 3).

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
| `--dry-run` | Search and report, change nothing - `venues.json` included |

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

## 3. Check the listed venues

[`venues.json`](venues.json) groups venues into areas. A page is in an area when
its `<h1>` names one of the area's `places`: `Boulder, Colorado` is in the
`Colorado` area, and `Sunshine Coast, Queensland` is in the `Sunshine Coast`
area. A page in no area skips this step.

Every venue in the page's area is checked for every window, before the general
search and whatever that search turns up. The user asked for these venues by
name, so their events are included even when the page is already full:

1. **Read the calendar.** Open the venue's `calendar` URL and collect every
   event whose dates fall in or overlap the window. Follow its `notes`: they say
   when a date filter, a ticketing site, or a data feed reads better than the
   page itself. When none of those works (a script-only page, a 403), search
   `<venue> <city> <month> <year>` instead, and say in the report that the
   calendar was not read directly.
2. **Count distinct events, not performances.** A production with twenty
   performances in the window is one event, and so is an exhibition that is
   open throughout it.
3. **Five or fewer:** each event is a found event, and goes through step 5 like
   one from the general search.
4. **More than five:** the venue gets **one** calendar item for that window, and
   none of its events is added on its own - by this step or by the general
   search.

A calendar item names the venue and the window in its label, says that more
than five events fall within the dates, may name up to three of the largest in
the same sentence, and links the calendar - filtered to the window when the
calendar supports it - with the address and a Google Maps link:

```html
<li><strong>QPAC calendar, October 16–November 21 <span class="item-id">{574}</span>:</strong> More than five events at the Queensland Performing Arts Centre fall within these dates, including <em>The Lion King</em> and Opera Queensland's <em>Into the Woods</em>. <a href="https://www.qpac.com.au/whats-on/this-season" target="_blank" rel="noopener">QPAC calendar</a>. <strong>Address:</strong> Cnr Grey and Melbourne Streets, South Brisbane QLD 4101, Australia. <a href="https://www.google.com/maps/search/?api=1&amp;query=..." target="_blank" rel="noopener">Google Maps</a>.</li>
```

It is a numbered item like any other: promote and reject work on it, and its
number is permanent. Once a page has a calendar item for a venue and window,
it stands for all of that venue's events in that window on later runs, even if
the count later falls to five or fewer. Events at the venue that were already
on the page as their own items stay where they are; removing them is the user's
`reject`.

The venue's map marker uses the `lat` and `lng` from `venues.json` and the venue's
name, and is added once per page however many items point at the venue. If the
map already has a marker at that venue, do not add another. When `lat` and `lng`
are `null`, look the position up and write it back to `venues.json`. A venue
whose `address` is `null` has no fixed site - a caterer that cooks at partner
venues - so each of its events takes the address and marker of the place where
it is held.

### Keeping `venues.json` current

The venue list belongs to the user. Add, remove, or rename a venue or an area
only when the user asks ("add the Tivoli to the Brisbane venues", "drop the
Riverstage"). A request like that is handled on its own, without a full run.

| Field | Holds |
|---|---|
| `area` | The user's name for the area |
| `places` | Names matched against a page's `<h1>` |
| `name` | The venue's own name |
| `aliases` | The user's shorthand for it, such as `qpac`, so later requests can name it the same way |
| `summary` | One line on what the venue is and what it hosts |
| `address` | Street address, in both scripts where the country uses a non-Roman one; `null` for a venue with no fixed site |
| `lat`, `lng` | Map marker position, from OpenStreetMap (Nominatim) or an existing marker - never estimated; `null` until looked up |
| `website` | The venue's home page |
| `calendar` | The page that lists dated upcoming events, and the one a calendar item links |
| `notes` | How to read that calendar: a date filter, a ticketing site or data feed that can be fetched when the page cannot, a season, a JavaScript-only page |

To add a venue, find its official calendar - the venue's own site first, its
ticketing platform when that is where it lists events - and fetch it to confirm
it shows dated events before writing the URL down. Fill in every field from a
source. If a venue name is ambiguous, ask the user which one they mean.

During a run, when a `calendar` URL has moved or no longer lists events, find
the venue's current calendar, update `calendar` (and `notes` if how to read it
changed), and name the change in the report. Apart from that and filling in
`null` coordinates, make no change to the file during a run, and none at all
under `--dry-run`.

## 4. Search

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

## 5. Reconcile against the page and its reject page

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

A venue calendar item from step 3 matches an existing item for the same venue
and window:

| Calendar item | Action |
|---|---|
| On the page | Ignore, unless `venues.json` now has a different `calendar` URL - then update the link, keeping the number |
| On the reject page | Add nothing for that venue in that window, neither a calendar item nor its events, and say so in the report |
| Nowhere | Add it with a new number |

**Significant detail** is a confirmed date or time where the page said "to be
announced", a venue or address, a program or lineup, a ticket link, a booking
deadline or price, a cancellation, or a date change. Rewording, marketing copy,
and a second source for something already stated are not significant - if the
only change is how it reads, leave the item alone.

A rejected event never returns to the page on this skill's initiative, however
good the new detail is. Rejection is a standing instruction; promotion is how
the user reverses it.

## 6. Write the changes

Keep each complete `<li>...</li>` on its own line in the HTML source, including
existing items in a list being updated. Keep list wrapper tags off the item
lines. Apply this on both the page and its reject page so later diffs can track
individual items; preserve each item's content, number, and position.

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
- A venue calendar item has no single date. Append it at the end of the list,
  after the last dated item, in the order the venues appear in `venues.json`.
  When deciding where a new dated item goes, ignore the calendar items at the
  end of the list: the item goes above them.

Keep a run proportionate: roughly eight new items per page from the general
search is a full pass. When the search turns up more, add the largest, the free,
and the ones unique to that place, and list the remainder in the report for the
user to ask for. Events from the listed venues in step 3 do not count toward
the eight and are never trimmed; the five-event rule there keeps each venue to
a few lines.

## 7. Report

Per page, in one table:

| Page | Added | Updated | Rejects updated | Ignored | Skipped |
|---|---|---|---|---|---|
| `rockies/santa-fe` | 3 (`{712}`, `{188}`, `{406}`) | 1 (`{104}` - dates confirmed) | 1 (`{592}` - new venue) | 6 | - |

For a page in a venue area, a second table with one row per listed venue:

| Page | Venue | Events in window | Result |
|---|---|---|---|
| `australia-october-2026/brisbane` | QPAC | 9 | Calendar item `{574}` added |
| | Brisbane Jazz Club | 4 | 2 added (`{233}`, `{870}`), 2 already on the page |
| | The Tivoli | - | Calendar did not load; searched instead, 1 added (`{419}`) |

Then, in prose: anything found whose dates are not yet published, anything that
contradicts what was on the page, anything trimmed for length, and any change
made to `venues.json`. Name the
reject-page updates explicitly - they are the items the user may want to promote
back, and they are invisible on the page itself.

## 8. Finish the run

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
- Never add, remove, or rename a venue in `venues.json` unless the user asked
  for it. A run may only replace a `calendar` URL that has moved, with its
  `notes`, and fill in `null` coordinates.
- Never edit a topic other than Events, except to add a map marker for an event
  being added.
- A second run straight after the first should change nothing. If it does, the
  matching in step 5 was too strict - most often a renamed annual edition that
  got added twice.
