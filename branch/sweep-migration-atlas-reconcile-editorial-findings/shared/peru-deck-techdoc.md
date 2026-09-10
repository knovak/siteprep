# Peru deck technical notes

The Peru deck is a conventional static deck under `decks/peru/`. Its deck-owned
`assets/styles.css` supplies the earth-and-gold visual theme. Its
`assets/scripts.js` registers the site service worker and loads the shared
`SiteNav` and `CollapsibleTopics` libraries, resolving paths from the script URL
so both the deck index and nested section pages work under deployment prefixes.

The Machu Picchu section uses Leaflet 1.9.4 and the shared `StandardMap` library
to render paired OpenStreetMap and OpenTopoMap displays. Location data remains
inline in the page because it is specific to that section.
