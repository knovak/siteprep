# Deck item numbers, promotion, and reject pages

How a numbered item on a deck page is written, how the user reorders and
discards items by quoting its number, and where the rejected ones are kept.

`AGENTS.md` carries the working rules ("Item numbers", "Editing by number:
promote and reject"). This file is the reference behind them: the markup and
style contract, the anatomy of a reject page, and what the build does with one.

## Why items are numbered

Deck pages are edited conversationally, and the thing being edited is usually
one entry in a list of twenty near-identical entries. "Move the artisan market
above the wine fiesta" is ambiguous once two markets are on the page, and it
stops working as soon as the wording of an entry changes. A short number
attached to the entry when it is written gives the user a handle that survives
rewording, and gives an agent an unambiguous target.

The number is deliberately small and visible rather than a hidden `id`
attribute: the user reads the page in a browser and quotes numbers back from
what they see.

## Markup contract

An item is a list entry whose bold label ends with the number, wrapped in
`<span class="item-id">`, immediately before the label's colon:

```html
<li><strong>Railyard Artisan Market, September 27 <span class="item-id">{361}</span>:</strong>
  A Sunday indoor market of juried local art and crafts.
  <strong>Address:</strong> Farmers' Market Pavilion, 1607 Paseo de Peralta, Santa Fe, NM 87501.
  <strong>Hours:</strong> Su 10-3; confirm the event calendar.
  <a href="https://www.artmarketsantafe.com/" target="_blank" rel="noopener">Official site</a> |
  <a href="https://www.google.com/maps/search/?api=1&amp;query=Santa+Fe+Farmers+Market+Pavilion" target="_blank" rel="noopener">Google Maps</a>.</li>
```

Rules that make the number usable by both a reader and an agent:

| Rule | Why |
|---|---|
| Three digits, `100`-`999` | Short enough to read aloud and to type in a follow-up message |
| Drawn at random, not in sequence | Sequential numbers read as a ranking, and `promote` breaks that ranking on the first edit |
| Unique within the page, counting its reject page and any number that has been retired | A stale reference from the user should fail loudly, not silently match a different item |
| Braces around the digits | Distinguishes an item number from a date, a price, or a street number in the same sentence |
| The number never changes | It is the item's identity across rewording, promotion, rejection, and restoration |

Braces are literal text, so a screen reader announces "brace 361 brace". That is
correct: the number is content the user is meant to perceive and quote, not
decoration.

## The `.item-id` style

Every deck's `assets/styles.css` carries the rule, directly after `.highlight`:

```css
.item-id {
  color: var(--muted);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
```

- `var(--muted)` is `#6b7280` against `--text` `#1f2937`: lighter than the
  surrounding text, and still 4.8:1 on the card background, so it passes the
  axe-core contrast check the Playwright suite runs.
- `font-weight: 400` is what does most of the work, because the number sits
  inside the item's bold label.
- `tabular-nums` keeps every number the same width, so a column of items does
  not jitter.
- `white-space: nowrap` stops `{361}` breaking across a line end.

Per the deck asset convention in `shared/README.md`, this lives in each deck's
own stylesheet rather than in `shared/`: it is styling, not a widget that is
easy to get wrong, and a deck is free to render its numbers differently. A new
deck inherits the rule by copying an existing deck's `assets/styles.css`, as it
already does for everything else. Do not write a color into the page markup.

## Reject pages

Rejecting an item does not delete it. It moves to a **reject page**: a sibling
file named for the page it came from, with a `-reject` suffix.

| Edited page | Reject page |
|---|---|
| `decks/rockies/sections/santa-fe/overview.html` | `decks/rockies/sections/santa-fe/overview-reject.html` |
| `decks/india2/sections/excursions/vagamon-day-trip.html` | `decks/india2/sections/excursions/vagamon-day-trip-reject.html` |

The suffix is a plain ASCII hyphen. The instruction that introduced the
convention wrote it as "- reject" with a space; a literal space and dash in a
filename survives neither URLs nor shell tooling comfortably, so the file uses
`-reject` and the page title says "Rejected items".

### Anatomy

A reject page is the edited page's shell with nothing in it but rejected items:

```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Santa Fe: Rejected items | Rockies Deck</title><link rel="stylesheet" href="../../assets/styles.css"><link rel="manifest" href="../../../../manifest.webmanifest"><script src="../../assets/scripts.js"></script></head>
<body><article class="card"><div class="card-header"><a href="overview.html" class="tag">&larr; Santa Fe</a><h1>Santa Fe: Rejected items</h1><p class="meta">Items removed from <a href="overview.html">the Santa Fe overview</a>. Kept so they are not offered again.</p></div><div class="card-content">
<h2>Events</h2><ul>
<li><strong>The Magic School Bus: Lost in the Solar System, September 28 <span class="item-id">{592}</span>:</strong> ...unchanged markup from the edited page...</li>
</ul>
</div></article>
</body></html>
```

What matters:

- **Items are moved verbatim**, number included, so restoring one is a copy back
  rather than a rewrite. Addresses, hours, and links stay with the item.
- **Topic headings are preserved.** An item rejected from Events sits under an
  `<h2>Events</h2>`; one rejected from Attractions gets its own `<h2>`. That is
  how a restore knows where the item goes back to, and it gives
  `CollapsibleTopics` the ordinary markup it expects.
- **No map, no TOC entry, no nav link.** It is a holding page. When an item is
  rejected, its marker comes off the edited page's map, and no map is added
  here.
- **Nothing is ever deleted from it**, and no number on it is ever reassigned.

### What the build does with one

`scripts/build.sh` copies `decks/` wholesale, so a reject page is published like
any other page, and `inject_version_footer` treats it as a section page: it
matches `^decks/([^/]+)/sections/([^/]+)/`, so the injected footer's `Deck` link
goes to the deck index and its `Section` link goes to `overview.html` - the page
the rejects came from. Nothing else in the build knows about reject pages: they
are not linked from the deck TOC (which is hand-written), not counted as
sections, and not validated by `scripts/build_tests.sh`.

Published but unlinked is deliberate. Rejected content is content the user chose
not to show, so the edited page does not link to it; the file stays in the deck
folder because that is where the next edit will look for it.

## How this is used by `update-deck-events`

`.claude/skills/update-deck-events/SKILL.md` refreshes the Events topic of
current and future deck pages that have a date range. It reads both files:

- The **page** tells it which events are already covered, and which numbers are
  taken.
- The **reject page** tells it what the user has already turned down. A found
  event that matches a rejected item is not re-added, even when the search turns
  up new detail about it; the detail is recorded on the reject page instead and
  reported, so the user can promote it back if they want it.

New events it adds get numbers under the rules above, and existing items keep
theirs when it merges new detail into them.

## Checking a page

Duplicate numbers are the one failure mode worth checking mechanically:

```bash
# Duplicates across a page and its reject page
grep -ho '{[0-9]\{3\}}' decks/rockies/sections/santa-fe/overview.html \
                        decks/rockies/sections/santa-fe/overview-reject.html \
  | sort | uniq -d

# Every number currently in use in a deck
grep -rho 'class="item-id">{[0-9]\{3\}}' decks/rockies | sort
```

Both are checks to run while editing. Neither runs in the build: a duplicate
number is a content mistake on one page, and `scripts/build_tests.sh` validates
the shape of the published site rather than the content of a deck.
