# Galápagos package comparison

The Ecuador section `decks/ecuador/sections/galapagos-packages/overview.html`
contains the maintained package records. Its companion `overview-reject.html`
preserves research holding entries, exclusions and any future user rejections.
Keep permanent three-digit IDs across both pages. Research dates, sources and
selection rules live in the records and in `galapagos-research-notes.md`.

## One inventory, two views

`decks/ecuador/assets/package-table.js` builds a comparison inside
`<div id="package-comparison"></div>` from the page's `.package-list > li`
elements. Each record must have an ID such as `package-528` and a direct
`strong` title containing `<span class="item-id">{528}</span>`. The script
reads these paragraphs, removes their leading `strong` label, and copies the
remaining text in full. Links and detailed evidence stay in the record, reached
through the package-name link in the comparison.

| Paragraph class | Content | Numeric sort attribute |
| --- | --- | --- |
| `package-ship` | Named vessel and maximum guests | `data-pax="16"` |
| `package-dates` | Exact dates, weekdays, days and nights | `data-start="2027-04-15"` |
| `package-price` | USD per-person known subtotal, price basis and omissions | `data-usd="12345"` |
| `package-availability` | General public stock evidence and check date | None |
| `party-availability` | Four adults in two private cabins, result and limits | None |
| `provider-reviews` | Concise operator evidence and link to full assessment | None |
| `ship-reviews` | Concise vessel evidence and link to full assessment | None |

The attributes are sort keys attached to the evidence, not a separate
inventory. `data-usd` must correspond to the displayed per-person subtotal
including known mandatory charges. It is not a claim that the total includes
all expenses. Omit the attribute when no comparable USD subtotal is supported;
do not use zero for an unknown. Do not silently convert other currencies.
Blank, malformed and missing numeric values sort last in either direction.
Date sorting validates an ISO date, rather than sorting the displayed month
names. Text columns sort alphabetically; review sorting does not invent a
rating or confidence rank.

Initial comparison order follows the detailed entries, preserving promotions.
Sorting changes only the table, and equal keys retain original list order.
Each column has a keyboard-operable button with `aria-sort` and a live status
message. The 1400px table stays inside a keyboard-focusable horizontal scroll
region on narrow screens. Full cell text is preserved, including uncertainty.
Same-page links reveal a collapsed parent topic before navigating to evidence.

Load the script with `defer` after the Ecuador deck script. The script is a
no-op on a page without `#package-comparison`, so the holding page has no
comparison unless deliberately given a container. Record prose remains readable
when JavaScript is unavailable. Shared collapsible topics, navigation, footer
and StandardMap remain the deck's existing mechanisms.

## Column dropdown filters

The comparison also adds native, keyboard-operable dropdowns inside selected
table headings. The shared helper `shared/package_table_filters.js` supplies
the option list, AND-combination of active filters and a Clear filters button;
the Ecuador script defines the value for each field. All choices come from the
detailed records, and the unfiltered row order and eight sortable headings are
unchanged. Filtering applies only to the comparison, never the source entries.

- **Ship / guests:** exact `data-pax` where known, except an explicit
  **20 or 36 guests (vessel unassigned)** category for Coral alternatives.
- **Departure / duration:** the published `N days / N nights` trip length;
  this may include mainland nights. Unparsable lengths are **Unknown duration**.
- **Known USD / person:** source `data-usd` in three bands: below US$5,000,
  US$5,000–10,000 inclusive, above US$10,000, plus an unknown option. These
  are known subtotals, not all-in vacation costs.
- **Two private cabins.** Set `data-room-evidence="quoted"` on the party paragraph
  when an operator prices two private rooms in a single four-adult selection.
  Use `data-room-evidence="listed"` when two named rooms are displayed for
  that party and a joint quote is still outstanding. Older queen, king and
  private-twin quotations retain their existing text-based classification.
  All other records use the unverified filter.

Multiple dropdown selections are intersected. Sorting remains active and is
retained when filters are reset. The header selects have independent accessible
names, an empty-result message is shown when needed, and the visible match
count updates. If evidence wording changes, review the room-evidence
classification conservatively rather than implying a confirmed reservation.

## Research notes and refreshes

The existing build entry point `scripts/render_eclipse_research.mjs` now has
two document configurations. It renders both the unchanged Eclipse notes and
`decks/ecuador/galapagos-research-notes.md`, using `renderMarkdown` from
`scripts/initiatives.mjs`. The Ecuador output is
`gh-pages/decks/ecuador/galapagos-research-notes.html`, with links back to the
main and holding pages and the normal deck assets. The build adds its one
shared footer later. The Markdown is canonical; never commit the generated
HTML or update its dates independently.

Run the `research-package-options` skill for an authorized refresh. Recheck
general inventory separately from the actual two-cabin allocation, preserve
prior observations and user ordering, and refresh review dates only when those
reviews were revisited. A new fare or four available seats never proves two
private cabins. Cabin occupancy and bed arrangement are separate findings: a
private twin cabin can hold one couple, while four berths in one cabin do not
meet the two-cabin brief. Keep unresolved or insufficient stock in holding under
the page's documented selection rule. No scheduling is implemented by this
code.

Use the vessel embarkation date for the April 15–June 20 window. For
land-and-cruise packages, store the operator’s package start in `data-start`
and spell out the cruise dates and any inference in the record. Keep a
mandatory extension in the comparable price. An AUD fare with additional USD
fees has no single USD sort key.

A dated stock signal is required for each main-list entry. Delfina June 11
{706} lists cabins 301 and 302 in the operator’s November 18 selector. Its
earlier USD partner rate has a separate date and scope. Eight other Delfina
dates remain in holding under their original IDs. See the research notes for
the operator and seller observations behind each change.

Six June 2027 operator-family departures with dated Dana seller stock signals
were added to the main comparison as {710}, {711}, {713}, {714}, {715}, {716}.
Their numeric price keys include the documented known fee allowance where not
already included; four advertised seats do not prove two private cabins. Confirm
fee treatment for Grace's Quasar inclusions before booking. June seller
catalogues and partner booking leads must be kept distinct from verified room
pairs and full seller contract terms. The embarkation search ends June 20, 2027,
although sailings may end afterward. Detailed source checks and historical
changes are in `decks/ecuador/galapagos-research-notes.md`.

## Verification

After the final source changes, run `npm run build` once, then
`npm test -- tests/e2e/galapagos-packages.spec.js tests/e2e/eclipse-research-notes.spec.js`.
The focused checks compare the generated table with source paragraphs, exercise
all sort controls and unknown values, preserve detailed-list order, verify
collapsed-topic navigation and mobile containment, and check notes navigation
and the single shared footer. Capture the changed pages with `npm run screenshot`
under `screenshots/` after that build, as required by `BUILD_TECHDOC.md`.
