# Ecuador Deck

The Ecuador deck is a **Future** deck rooted at `decks/ecuador/`. Its initial
section, `sections/galapagos-islands/overview.html`, combines destination
essentials, regulated boat-travel planning, cruise-provider comparisons,
attractions, and a standard two-layer map.

## Assets and shared libraries

- `assets/styles.css` provides the deck's mobile-first card, highlight, item-ID,
  and map-container styles.
- `assets/scripts.js` registers the repository service worker and loads the
  shared navigation and collapsible-topic libraries by resolving paths from its
  own script URL. It is intentionally deck-local so Ecuador can evolve its
  presentation independently.
- The Galápagos section uses `shared/standard_map/standard_map.js` and its
  stylesheet rather than implementing Leaflet behavior locally.

Attractions and boat-tour providers are stable, numbered items. Any future
provider or attraction added to the section must receive a unique random
three-digit item ID and a corresponding map marker when it introduces a new
location.
