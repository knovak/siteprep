# Eclipse package comparison

`decks/eclipse-2027/assets/package-table.js` derives the comparison from the
package descriptions in `sections/package-options/overview.html`. There is no
second inventory dataset. The enclosing country heading, persistent item ID,
`.package-meta` price, review paragraph and shared review anchors supply the
existing comparison fields.

Each included package also needs two paragraphs:

- `.package-availability`, labelled `Availability:`, records the current public
  stock evidence and any conflict or inability to reconfirm it.
- `.party-availability`, labelled `Four people, two rooms:`, records whether four
  adults can obtain two double/twin rooms or cabins on that departure. Four
  seats, a generic quantity selector or a four-berth cabin does not prove this.

The table copies both paragraphs in full as plain text, removing only their
labels. Missing evidence defaults to `Not reconfirmed` / `Two rooms not
confirmed`. Source links remain in the detailed entry, reached through the
package-name link. All seven columns sort, and the table stays horizontally
scrollable within the page on narrow screens. Fare sorting preserves original
currencies and review ranks continue to describe evidence quality, not ratings.

The four dropdown filters are added next to their existing sortable column
buttons: **Country** (current country headings), **Price** (the first stated
fare, converted to USD and grouped below $5,000, from $5,000 through $10,000,
or above $10,000), **4 people · 2 rooms** (operator-reported fit, four-person
selection, does not fit, or not confirmed), and **Rank** (High / Medium / Low
review-evidence quality). The fare source may be per person or per cabin, so
the band retains the quoted occupancy basis. The helper uses the dated ECB
reference rates linked in the price menu. Missing fares and unsupported
currencies have their own option. None of the
room-evidence labels is a booking confirmation.

The shared helper `shared/package_table_filters.js` derives dropdown choices
from the current source records, matches any checked choice within a column
and requires a match in every active column,
and provides an accessible Clear filters control. Sorting remains independent
and is retained across filter selections and reset. Visible counts update, and
an empty-result row explains zero matches. Detailed source records are never
hidden or reordered. Each header button opens a native popover of labeled checkboxes. Tab and
Space select choices, Escape dismisses the popover, and unchecking the last
choice removes that column’s restriction. Each room-evidence checkbox has a
hover description and an accessible description. **Show explanations** displays
the definitions alongside the choices for touch and keyboard users.

`assets/package-map.js` supplies orientation points to the shared StandardMap
library. Add a source-backed location when a new package names a new stay or
viewing area, and distinguish an approximate hotel point from the exact
observing position. The country-only deck index uses the same data filtered by
`countryMarker`, so hotel additions do not create extra country markers.

`decks/eclipse-2027/research-notes.md` records the evidence standard, research
date, provider caveats and holding-page policy. Keep a source check date on
each package; do not refresh old holding entries merely by changing the page
header. Preserve IDs when offers move between the main and holding pages.

The build runs `scripts/render_eclipse_research.mjs` to publish those notes as
`decks/eclipse-2027/research-notes.html`, using the existing Markdown renderer
and the Eclipse deck's styles, navigation and collapsible topics. The main and
rejected package pages link to this HTML view, which links back to both pages.
Edit only `research-notes.md`; the HTML is generated in `gh-pages/` on every
build and receives the normal shared footer.

Validate with the final `npm run build`, then
`npm test -- tests/e2e/eclipse-package-table.spec.js`. The browser checks compare
table values with their source paragraphs, exercise sorting and source updates,
check collapsed-topic links and verify mobile containment.

## Availability refresh records

Research-held offers that lose current stock retain their original IDs, all
source links and previous evidence inside dated details on the holding page.
Restorations use the same ID, retain their earlier evidence with the restored
description, and leave a plain history link on the holding page. Table fields
still come solely from the current description paragraphs. Review dates are
independent of availability dates.

The package map removes points unique to held offers. The country overview
may use an offshore viewing-region marker (Tunisia) when the included offer
is a sea departure. Hotel and city additions are orientation points, with
coordinate sources in research-notes.md; unpublished observing sites stay
explicitly unknown.

## 19 November 2026 inventory refresh

The source inventory has 36 offers, including Siwa Classic {270} and the distinct
15-day Rail & Sail {214}. `package-map.js` adds only a Siwa orientation point;
research-notes.md records its coordinate source and unpublished exact site.

Availability history is kept in dated details for changed stock and fares.
The active source paragraphs still drive every comparison cell and dropdown.
Dar Habu's one room must classify as unable to meet two private rooms; Al Wadi
and Villa Kamose remain the two operator-reported room-fit records. Priced
four-person selections retain their assignment/fee limitations and are not
reservations. New entries use the existing `Priced selection for four` wording
so the room-evidence dropdown recognizes the same evidence as the description.

## 25 November 2026 inventory refresh

The current inventory contains 37 offers. Dar Habu {603} moved to holding with
its complete previous markup retained; SOAR {271} and Eclipse Express IV {555}
were added. `package-map.js` removes Dar Habu from the broad West Bank label and
adds a sourced, indicative Gloria/New Aswan point; exact boat/festival sites
remain unknown. Research notes preserve the coordinate sources.

Current availability and party paragraphs continue to supply the table and
filters. Encounters {366} is now unconfirmed because its two-room claim conflicts
with a three-traveler form cap. Dabuka {369} starts its party paragraph with No
so the existing cannot-fit filter recognizes its three-place limit. Every Dabuka
availability paragraph includes the observed date-display conflict. Historical
prices and availability stay in dated details and research notes; review dates
remain independent. The existing focused browser suite checks the 37-row count,
sorts, filters, source extraction and narrow-screen containment.

## 26 November 2026 inventory review

The inventory contains 38 offers, adding Temple World {722}; holding contains
259 records. Zero {323} now has only two places and its party paragraph starts
with No so the existing cannot-fit filter includes it. Royal, Dragoman, Adonis
and the three Insight records use `data-status="recheck-needed"` and state the
limits of the latest retrieval; this attribute is provenance, not a second
inventory or a new UI status. Quotes not repeated after Chrome disconnected
remain explicitly dated 25 November. No booking behavior was changed.

The map adds official-source orientation points for Media City, El Gouna and
Helwan, with coordinates in research notes. The broad Luxor marker also labels
the unassigned Grand Sun boarding region. Source paragraphs still drive all
38 table rows, filters and sorts; earlier reviews and holding records retain
their original dates unless specifically revisited.
