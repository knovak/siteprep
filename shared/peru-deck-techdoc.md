# Peru deck technical notes

The Peru deck is a conventional static deck under `decks/peru/`. Its deck-owned
`assets/styles.css` supplies the earth-and-gold visual theme. Its
`assets/scripts.js` registers the site service worker and loads the shared
`SiteNav` and `CollapsibleTopics` libraries, resolving paths from the script URL
so both the deck index and nested section pages work under deployment prefixes.

The Machu Picchu section uses Leaflet 1.9.4 and the shared `StandardMap` library
to render paired OpenStreetMap and OpenTopoMap displays. Location data remains
inline in the page because it is specific to that section.

## Machu Picchu packages

The package comparison and the research holding page live in
`decks/peru/sections/machu-picchu-packages/`. Their shared source is
`packages.json`. During the site build, `scripts/render_machu_picchu_packages.mjs`
renders the table, detailed entries, holding records and route locations in
the copied HTML. The published comparison can be read without JavaScript.
The notes renderer also converts `decks/peru/machu-picchu-research-notes.md`
into a linked page in the build output.

Each itinerary has one permanent three-digit ID, a travel style, locations,
review evidence and an array of dated departures. Enter start and end dates
in ISO format. A departure records its original currency, per-adult amount,
fare basis, general stock, room evidence, check date and sources. Optional
`departureDefaults` on the itinerary supplies repeated fields. A field on a
specific departure overrides that default. Keep a group's exact checkout total
in its evidence when it differs from four times the rounded per-adult rate.

A departure with a public room quote can set `roomQuote` to an object with
`seller` and the exact four-person `total` in the departure currency. The
renderer lists these dates before the comparison. Use the fare from the same
seller in that row and record any alternative direct quote in the evidence.
Distinguish an explicit two-room selection from four people in a category
whose terms pair travel partners. For an explicit double-room quote, use “Two double rooms priced together” and record any later operator confirmation in the dated evidence. A price for one pair does not qualify.

The table opens grouped by style and sorted by start date. Selecting the date
heading orders departures across styles. The browser script in
`decks/peru/assets/machu-picchu-packages.js` handles column sorting and uses
`shared/package_table_filters.js` for checkbox dropdowns. They match any
selected value within a column and combine columns. Fare bands use the per-adult
amount converted to USD at the ECB rates linked in the menu. When adding a new
room-evidence label, add its definition to the party filter’s `explanations` map
for hover, screen readers and the **Show explanations** button. Visible route markers come
from the location keys of active itineraries and are shared by both StandardMap
views. Addresses may identify a town centre, trail pass or site entrance
where a street address is unavailable.

Keep a rejected or unverified option under its original ID in `holding`.
Retain its reason, dated sources and next check. When excluding a previously active itinerary, keep its complete record and departures in holding so the build can display the earlier evidence. Record changes of status in
the research notes. The focused Playwright coverage is
`tests/e2e/machu-picchu-packages.spec.js`.
