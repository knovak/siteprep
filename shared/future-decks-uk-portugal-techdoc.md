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
