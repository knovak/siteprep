# EventDateFilter

A shared date selector beside event-list headings. Event pages in the Current,
Future, and Option decks use it; Past decks and reject pages retain their
unfiltered lists. Adoption is explicit in each page's markup, including
Vancouver's separate VIFF Live music schedule.

The enabled pages are Sydney, Brisbane, Cairns, Sunshine Coast, Stradbroke
Island, Boulder, Aspen, Carbondale, Snowmass, Vancouver, and Luxor. Pages without
event lists do not load the component. When adding a new event page in a
non-Past deck, use the markup below; when moving a deck to Past, remove its
selector asset tags and heading opt-ins so archived events stay visible.

## Behavior

- **Today and future** is selected on each page load. An event remains visible
  if any of its dates are today or later, including a run that started earlier.
- **Today only** shows events with at least one occurrence today. Range start
  and end dates are inclusive; gaps between separate occurrences are excluded.
- **All dates** restores all items in their existing order.

Today comes from the visitor's browser-local year, month and day, never UTC or
the event venue's timezone. Filtering uses whole calendar days, not show times.
The page refreshes the filter at local midnight (including daylight-saving
changes), on window focus, when a hidden tab becomes visible, and on `pageshow`.
The selection stays in place while the page is open; it is not saved in browser
storage. Each Events heading has its own selection.

Filtering hides whole list items. It does not rewrite date labels or performance
times within a visible item, reorder items, modify rejected items, or remove map
locations. Unknown or invalid dates remain visible in every mode to avoid
silently hiding content. An empty result shows a short message beneath the list.
With JavaScript unavailable, all original content remains visible. Printing
shows all events, matching CollapsibleTopics' behavior of printing all topics.

## Opting a page or deck in

Load these assets, adjusting the relative paths to the page:

```html
<link rel="stylesheet" href="../../../../shared/event_date_filter/event_date_filter.css">
<script defer src="../../../../shared/event_date_filter/event_date_filter.js"></script>
```

The script initializes itself when the DOM is ready. A deck can load the same
assets from its deck-wide loader, but **only explicitly marked headings** gain
controls. Mark the heading with its list's unique ID and give every direct list
item a machine-readable schedule:

```html
<h2 data-event-filter="city-events">Events</h2>
<ul id="city-events">
  <li data-event-dates="2026-10-16">A single-day event…</li>
  <li data-event-dates="2026-10-15/2026-10-17">A daily three-day run…</li>
  <li data-event-dates="2026-10-14,2026-10-16/2026-10-17">Separate performances…</li>
</ul>
```

Use `YYYY-MM-DD` dates, `/` for inclusive continuous ranges, and commas between
separate dates or ranges. Whitespace around dates is allowed. Do not describe
separate weekend performances as a continuous week. Invalid dates, reversed
ranges, incomplete ranges, and missing metadata all leave the item visible.

Dates describe the occurrences offered by the item, usually its bold label's
visit window. They do not include an exhibition's longer season or an unrelated
booking deadline mentioned in its description. Sydney's KOOZA item says "from
October 17" during an October 14–17 stay, so its filter date is October 17; it
is not treated as an event that continues forever.

For weekly markets, enumerate the relevant weekdays within the page's visit
window. For exhibitions, exclude stated closed days. Separate festival
weekends remain separate ranges. A venue-calendar item uses its advertised
planning window, as on Sydney, rather than claiming individual performance
dates. Leave dates unset for unscheduled experiences or incomplete selected-date
programs; the item then remains visible in all three modes. Do not infer an
exhibition's year or start date from an ambiguous "through April 18" label.

When adding, refreshing or changing event dates on an opted-in page, update
`data-event-dates` together with the visible text. Preserve the attribute when
promoting or rejecting an item so it can be restored with its schedule intact.
The library deliberately does not guess dates from prose.

## Header integration and accessibility

The controls use three native buttons in an `Event dates` group, with
`aria-pressed` identifying the selected choice and `aria-controls` referring to
the list. They support Tab, Enter and Space. On narrow screens the choices
scroll horizontally inside the heading row without widening the page; keyboard
focus scrolls the next button into view. Colors inherit the deck's palette.

The group is marked `data-topic-control`, which CollapsibleTopics ignores when
building its caret's accessible name and handling heading clicks. The two
libraries work in either initialization order. Changing the date selection
does not expand or collapse the topic, and collapsing a topic preserves its
selection. Empty messages sit beside the list inside the topic body.

## API and validation

- `EventDateFilter.init()` discovers marked `h2`/`h3` headings linked to a `ul`
  or `ol`. Repeated calls do not duplicate controls. Returns filter objects with
  `heading`, `list` and `refresh()`; list items are captured at initialization.
- `EventDateFilter.refresh()` reapplies all existing filters using the current
  browser date and schedules the next local-midnight refresh.

`tests/e2e/event-date-filter.spec.js` checks adoption across non-Past event pages,
unfiltered Past and reject pages, real Sydney modes, local dates,
inclusive boundaries and gaps, invalid metadata, midnight and tab wake-up,
collapse/keyboard interactions, and mobile layout. The Snowmass case checks the
Counterpoints exhibition across its December 24 closing boundary, Christmas and
weekend gap, and December 28–29 reopening, then verifies that All dates restores
the complete original item order without a fixed event count.
Run it and `tests/e2e/collapsible-topics.spec.js` after the final build:

```sh
npm test -- tests/e2e/event-date-filter.spec.js tests/e2e/collapsible-topics.spec.js --project=chromium
```
