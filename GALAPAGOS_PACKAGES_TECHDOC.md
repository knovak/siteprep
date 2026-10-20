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

## Verification

After the final source changes, run `npm run build` once, then
`npm test -- tests/e2e/galapagos-packages.spec.js tests/e2e/eclipse-research-notes.spec.js`.
The focused checks compare the generated table with source paragraphs, exercise
all sort controls and unknown values, preserve detailed-list order, verify
collapsed-topic navigation and mobile containment, and check notes navigation
and the single shared footer. Capture the changed pages with `npm run screenshot`
under `screenshots/` after that build, as required by `BUILD_TECHDOC.md`.
