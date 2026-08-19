# Standard Map Library

## Overview

**StandardMap** is a small JavaScript helper for the "standard map" pattern used across SitePrep deck and section pages: a paired OpenStreetMap + OpenTopoMap display, custom colored SVG markers, popups, and a clickable legend beneath each map that jumps to a location or shows all of them.

It implements the pattern documented in `LEAFLET_IMPLEMENTATION_GUIDE.md` (section 3a, "Standard Map Block for Deck Pages") as a single function call, instead of that pattern being hand-transcribed into a new `<script>` block on every page.

**This library is optional.** A deck or section can ignore it entirely and write its own map code - useful if a page wants different marker styling, a single map instead of a pair, animated routes, or any other experiment. `LEAFLET_IMPLEMENTATION_GUIDE.md` still documents the underlying pattern for that case. Nothing in the build checks whether a page uses this library.

**Dependencies:** Leaflet 1.9+ (`leaflet.js` / `leaflet.css`), loaded before this file.

---

## Quick Start

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<link rel="stylesheet" href="../../../../shared/standard_map/standard_map.css">
```

```html
<h3>City map (OpenStreetMap)</h3>
<div id="city-map-osm" class="map-container"></div>
<div id="city-legend-osm" class="map-legend"></div>

<h3>City map (OpenTopoMap)</h3>
<div id="city-map-topo" class="map-container"></div>
<div id="city-legend-topo" class="map-legend"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script src="../../../../shared/standard_map/standard_map.js"></script>
<script>
  const cityLocations = [
    { name: 'Old Town Hotel', type: 'Stay', icon: '🏨', color: '#2f80ed', lat: 56.9462, lng: 24.1137 },
    { name: 'Central Market', type: 'Market', icon: '🛍️', color: '#27ae60', lat: 56.9432, lng: 24.0668 },
    { name: 'Cathedral', type: 'Concert venue', icon: '🎶', color: '#eb5757', lat: 56.9490, lng: 24.1050 }
  ];

  StandardMap.render({
    locations: cityLocations,
    osmMapId: 'city-map-osm',
    osmLegendId: 'city-legend-osm',
    topoMapId: 'city-map-topo',
    topoLegendId: 'city-legend-topo'
  });
</script>
```

Adjust the relative path to `shared/` for where the page lives (see the path table in `shared/README.md`).

---

## Location fields

Each entry in `locations` is:

| Field   | Required | Description |
|---------|----------|-------------|
| `name`  | yes | Shown in the popup and the legend button. |
| `lat`, `lng` | yes | Coordinates. |
| `color` | no  | Marker fill color (hex). Defaults to `#2f80ed`. |
| `icon`  | no  | Emoji shown inside the marker and legend button. Defaults to 📍. (`emoji` also works, for compatibility with older hand-written pages.) |
| `type`  | no  | Short label appended to the popup under the name. |
| `zoom`  | no  | Zoom level used when this location's legend button is clicked. Defaults to 15. |

## `StandardMap.render(config)`

| Field | Required | Description |
|-------|----------|-------------|
| `locations` | yes | Array of location objects, above. |
| `osmMapId` / `osmLegendId` | no | Container ids for the OpenStreetMap display. Omit `osmMapId` to skip this layer; omit `osmLegendId` to render the map without a legend. |
| `topoMapId` / `topoLegendId` | no | Same, for the OpenTopoMap display. |
| `center` | no | `[lat, lng]` fixed initial view. Omit to auto-fit the map to all `locations` (the common case for a single place with a cluster of nearby points). Use this instead for a wide-area map (e.g. a country) where auto-fit would zoom awkwardly. |
| `zoom` | no | Fixed initial zoom, used only when `center` is set. |

Only pass the id pair(s) for the layer(s) you actually want - a page can render just one map instead of the OSM/OpenTopoMap pair if that's all it needs.

Returns `{ osm?: { map, markers }, topo?: { map, markers } }` with the underlying Leaflet map and marker instances, in case a page needs to do something further with them (e.g. add an extra overlay).

## Styling

`standard_map.css` defines `.map-container`, `.map-legend`, and `.standard-map-marker`. It loads before a deck's own `assets/styles.css`, so a deck can override the look (legend button colors, map height, etc.) by redefining those selectors in its own stylesheet - no need to fork this file just to reskin it. Forking `standard_map.js` itself is also fine if a page wants different marker or legend *behavior*, not just appearance.

## Maps inside collapsible topics

Deck pages make every topic collapsible (`shared/collapsible_topics/`), and a map heading is a topic like any other. Leaflet cannot size a map inside a hidden container, so:

* A map whose topic starts expanded needs no special handling - expanding a topic dispatches a window `resize` event, and Leaflet re-fits the map.
* A map whose topic starts collapsed (`data-collapsed="true"` on the heading) must call `StandardMap.render(...)` only once its container becomes visible. Render the two layers in separate calls in that case - passing just the `osm*` ids or just the `topo*` ids - so each map is created when its own topic is shown. See `decks/poland/sections/warsaw/overview.html`.
