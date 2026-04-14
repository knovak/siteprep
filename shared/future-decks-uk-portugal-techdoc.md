# Future Deck Content Update (April 2026)

## Scope
This update adds two new **Future** decks and one expansion to an existing Australia deck section.

## New deck: `uk`
- Deck metadata:
  - `title`: United Kingdom
  - `sort_order`: `202607A`
  - `group`: Future
- Section added:
  - `selcombe` (rendered as "Selcombe (Salcombe)")
- Content model used:
  - Overview card with location summary, street address, hours note, and Google Maps link.

## New deck: `portugal`
- Deck metadata:
  - `title`: Portugal
  - `sort_order`: `202607B`
  - `group`: Future
- Section added:
  - `fishermans-trail`
- Content model used:
  - Condensed planning format:
    - base strategy
    - stage distance summary
    - logistics/safety guidance
    - source link list

## Expanded section: `aus2503 / kangaloon`
- Added a new "Bundanon" block using `.highlight` plus practical visitor details:
  - description
  - location
  - hours
  - official links
  - Google Maps link

## Implementation notes
- New decks reuse the shared deck visual system by copying `assets/styles.css` and `assets/scripts.js` from an existing deck.
- Root deck grouping behavior remains driven by each deck's `deck.json` `group` field.

## UK deck content update: `selcombe` travel logistics
- Added a new topic, **"Travel from Exeter"**, to `decks/uk/sections/selcombe/overview.html`.
- Topic format mirrors the existing "Travel from London" structure and documents:
  - airport-to-rail transfer via Stagecoach 4A
  - Totnes interchange to Salcombe on Tally Ho! 164
  - weekend/holiday service constraints
  - taxi fallback and live journey-planner links for day-of-travel checks
- Added a dedicated source-link block for Exeter transfer planning.

## April 2026 content/status update: `uk`, `baltic`, `aus2503`
- Updated UK section title presentation:
  - `decks/uk/sections/selcombe/overview.html` now renders page title as **"Salcombe"**.
  - `decks/uk/index.html` Table of Contents entry now reads **"Salcombe"**.
- Added a highlighted contact block to the Salcombe page using `.highlight`:
  - exchange partner name
  - phone, email, and full address details
- Added a new Salcombe topic, **"Ferries around Salcombe"**, with summarized service guidance and preserved operator links:
  - South Sands Ferry
  - Kingsbridge Salcombe Ferry
  - Dartmouth–Kingswear Ferry services
- Updated deck grouping metadata:
  - `decks/aus2503/deck.json`: `group` changed from `Current` to `Past`
  - `decks/uk/deck.json`: `group` changed from `Future` to `Current` (present designation)
  - `decks/baltic/deck.json`: `group` changed from `Future` to `Current` (present designation)
- Updated Baltic deck naming presentation to **"Baltics"**:
  - `decks/baltic/deck.json` title changed to `Baltics`
  - `decks/baltic/index.html` heading/title and home breadcrumb label updated
  - Baltic section overview page titles and breadcrumbs aligned to `Baltics`
