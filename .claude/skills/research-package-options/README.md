# Package research records and Siteprep integration

Read this when producing or updating the three deliverables. Keep the fields
that matter to the current brief; use an explicit unknown where missing
evidence would affect a choice.

## Package options

Start with the travel brief, selection rule, coverage and dates of the latest
availability and review checks. Explain whether availability means provider
statements, public booking selections or an actual confirmed reservation.

The comparison should expose the fields needed to choose: package and ID,
location, exact dates/duration, full price and basis, general availability,
requested-party availability, provider review evidence and accommodation
review evidence. Link the package name to its detailed entry. Retain meaningful
qualifications in the table; short labels must not turn a request into confirmed
stock. Date sorting should use actual dates and unknowns should remain explicit.
Price sorting must preserve currency and price basis.

Each detailed record should contain:

| Field | Evidence to retain |
|---|---|
| Identity | Persistent ID, package title, operator and reseller if different, exact product/departure URLs |
| Travel dates | Start/end dates with year and weekdays, days/nights, event date, conflicting dates if unresolved |
| Experience | Itinerary, start/end points, core event or viewing location, included/excluded transfers and activities |
| Accommodation | Named hotels/ships, category, nights, occupancy, bed arrangement, substitutions and uncertainties |
| Price | Original currency, full fare, unit/occupancy, mandatory charges, optional extras, conditional discounts, party total where justified |
| Terms | Deposit versus balance, payment deadline, cancellation/refund conditions and source |
| General availability | Exact observation, status, source and check date |
| Party availability | Requested travelers/rooms, tested selections, observed allocation/price, restrictions and remaining confirmation |
| Provider reviews | Exact entity, sources, ratings/scales/sample sizes where known, recency, themes and evidence limitations |
| Accommodation reviews | The same review evidence for the actual properties/vessels, or explicit missing/uncertain match |
| Provenance | Source URLs beside supported claims, separate availability/review check dates, conflicts and follow-up |

Use shared review assessments where several offers use the same operator or
ship; every affected entry must link explicitly to the assessment, and
itinerary-specific limitations stay with the entry.

## Rejected options and research holding

Keep a companion record even when the current pass finds no new exclusions.
Label user rejections separately from research exclusions and make the
restoration policy visible. Record the ID, package/variant, exact URLs,
reason/status, date checked, prior evidence and what would make it worth
rechecking. Useful statuses include user-rejected, sold-out, waitlist,
unverified, discovery-only and out-of-scope.

Preserve an entry's content and ID when moving it. Add dated research updates
without erasing the reason for the earlier decision. Reuse the same ID on an
authorized restoration and record where it went. Group related leads only if
their exact departure URLs and distinct statuses remain recoverable.

## Research notes

Use a maintainable source document with a readable companion page. For
Siteprep, keep canonical Markdown and generate HTML for readers. Link the
readable notes from both Package options and Rejected options, and provide
return links from the notes. Check the actual built paths.

The notes should let another session resume without reconstructing the search:

- Brief and selection rules, including rejection/restoration policy.
- Search date and time zone, regions/package types covered, lead sources,
  queries useful to repeat and areas not yet searched.
- Per-package evidence or links to the detailed records, including booking
  selections/results and separate dates for reviews and availability.
- Material source conflicts, inaccessible pages and fallback attempts.
- Decisions and exclusions, explaining why and whether the user chose them.
- Dated refresh history: what was rechecked, what changed, what was left
  untouched and which findings remain old.
- Prioritized next checks, exact URLs and the evidence needed to resolve them.

Do not claim exhaustive coverage when sources were inaccessible or only part of
a directory was screened. Do not mark the entire holding page freshly checked
when only a few records were revisited. Schedule upkeep only when requested.

## Siteprep implementation

Read the current repository `AGENTS.md`, `DECK_ITEMS_TECHDOC.md` and
`BUILD_TECHDOC.md`. Use the established deck layout and inspect the target
page's assets before changing its markup.

The Eclipse 2027 reference files, relative to the repository root, are:

- `decks/eclipse-2027/sections/package-options/overview.html`
- `decks/eclipse-2027/sections/package-options/overview-reject.html`
- `decks/eclipse-2027/research-notes.md`
- `decks/eclipse-2027/assets/package-table.js`
- `decks/eclipse-2027/assets/package-map.js`
- `ECLIPSE_PACKAGES_TECHDOC.md`
- `tests/e2e/eclipse-package-table.spec.js`

These are a reference implementation and dated evidence, not current package
facts for a new trip. Read the live files rather than assuming a later change
described in another session has merged.

For Eclipse updates, preserve `.package-list`, `package-###` anchors, country
headings, `.package-meta` / `Price:`, `.package-availability`,
`.party-availability`, `Reviews:` and shared review anchors: the table extracts
them from the entries. Adapt a new comparison to its own brief; do not copy the
Eclipse countries, two-couple label or review-ranking thresholds indiscriminately.
Derive a new table from the detailed entries or a single structured source used
by both views. Do not make a published page depend on another deck's mutable
inventory.

Use permanent random three-digit IDs and the repository's promotion/rejection
rules. The reject page is the sibling `overview-reject.html`, with the same
shell, no map and no TOC entry. Link to it from Package options. New named
locations need sourced location details and StandardMap markers; distinguish
orientation points from exact event/viewing coordinates. Keep map data and
counts aligned with the main page. Preserve the shared footer and collapsible
topic behavior.

A comparison spanning places needs context about the trip or event. The
locality-guide requirements apply to actual new place pages; do not invent a
single population or founding history for a multi-country package comparison.

If a notes renderer is already present, extend its existing mechanism. Otherwise
add build integration for this comparison, preferably reusing the repository's
Markdown rendering utilities, and document any executable code as AGENTS.md
requires. Generated notes HTML belongs in build output; Markdown remains the
editable source. Confirm the rendered notes, both inbound links, return links
and one shared footer; a link to raw Markdown alone does not deliver this page.

Install dependencies with `npm ci`. After the final source edit, run one
`npm run build` and appropriate focused checks for table/source consistency,
sorting, links and mobile layout. For Eclipse, use the existing package-table
tests; include research-notes tests if present. Run `git diff --check`. Capture
changed visible pages with `npm run screenshot` under `screenshots/`, inspect
and display the images, and give their paths in the final response. Follow
repository instructions for documenting code and preparing reviewable changes.
