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
fare, grouped in below 5,000 / 5,000–10,000 / above 10,000 bands within each
original currency), **4 people · 2 rooms** (operator-reported fit, four-person
selection, does not fit, or not confirmed), and **Rank** (High / Medium / Low
review-evidence quality). The fare source may be per person or per cabin, so
the price filter is not a normalized cost comparison. No cross-currency
conversion is made, and unknown prices have their own option. None of the
room-evidence labels is a booking confirmation.

The shared helper \`shared/package_table_filters.js\` derives dropdown choices
from the current source records, combines selected columns using AND logic,
and provides an accessible Clear filters control. Sorting remains independent
and is retained across filter selections and reset. Visible counts update, and
an empty-result row explains zero matches. Detailed source records are never
hidden or reordered. Native selects work by keyboard and remain inside the
horizontal table-scroll region.

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
