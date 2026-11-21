/**
 * StandardMap - shared helper for the "standard map" pattern used across SitePrep
 * decks and sections: paired OpenStreetMap + OpenTopoMap displays with custom
 * colored markers and a clickable legend beneath each map.
 *
 * This is optional. A deck or section is free to write its own Leaflet code
 * instead - see LEAFLET_IMPLEMENTATION_GUIDE.md for the underlying pattern this
 * library implements, and shared/standard_map/standard_map.md for usage docs.
 *
 * Requires Leaflet (https://unpkg.com/leaflet) to already be loaded.
 */
(function (global) {
  const TILE_LAYERS = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      maxZoom: 17
    }
  };

  function createMarkerIcon(location) {
    const color = location.color || '#2f80ed';
    const emoji = location.icon || location.emoji || '📍';
    return L.divIcon({
      className: 'standard-map-marker',
      html: `<svg width="34" height="48" viewBox="0 0 40 55" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C9 0 0 9 0 20c0 13.4 20 35 20 35s20-21.6 20-35C40 9 31 0 20 0z" fill="${color}" stroke="white" stroke-width="2.5"/><circle cx="20" cy="20" r="8" fill="white" opacity="0.9"/><text x="20" y="25" text-anchor="middle" font-size="12">${emoji}</text></svg>`,
      iconSize: [34, 48],
      iconAnchor: [17, 48],
      popupAnchor: [0, -48]
    });
  }

  function boundsFor(locations) {
    return L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
  }

  function addMarkers(map, locations) {
    return locations.map((loc) => L.marker([loc.lat, loc.lng], { icon: createMarkerIcon(loc) })
      .addTo(map)
      .bindPopup(`<strong>${loc.name}</strong>${loc.type ? `<br>${loc.type}` : ''}`));
  }

  function buildLegend(legendId, map, locations, markers) {
    const legend = document.getElementById(legendId);
    if (!legend) return;
    locations.forEach((loc, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${loc.icon || loc.emoji || '📍'} ${loc.name}`;
      button.onclick = () => {
        map.setView([loc.lat, loc.lng], loc.zoom || 15);
        markers[index].openPopup();
      };
      legend.appendChild(button);
    });

    const showAll = document.createElement('button');
    showAll.type = 'button';
    showAll.textContent = 'Show all';
    showAll.onclick = () => map.fitBounds(boundsFor(locations), { padding: [24, 24] });
    legend.appendChild(showAll);
  }

  function renderLayer(mapId, legendId, tileKey, locations, view) {
    const tile = TILE_LAYERS[tileKey];
    if (!tile) throw new Error(`StandardMap: unknown tile layer "${tileKey}" (expected "osm" or "topo")`);

    const map = L.map(mapId);
    L.tileLayer(tile.url, { attribution: tile.attribution, maxZoom: tile.maxZoom }).addTo(map);

    if (view && view.center) {
      map.setView(view.center, view.zoom || 12);
    } else {
      map.fitBounds(boundsFor(locations), { padding: [24, 24] });
    }

    const markers = addMarkers(map, locations);
    if (legendId) buildLegend(legendId, map, locations, markers);
    return { map, markers };
  }

  /**
   * Render the standard OpenStreetMap + OpenTopoMap pair for a page.
   *
   * @param {object} config
   * @param {Array}  config.locations   - [{ name, lat, lng, color, icon, type, zoom }]
   * @param {string} [config.osmMapId]     - container id for the OpenStreetMap display
   * @param {string} [config.osmLegendId]  - container id for its legend (omit for no legend)
   * @param {string} [config.topoMapId]    - container id for the OpenTopoMap display
   * @param {string} [config.topoLegendId] - container id for its legend (omit for no legend)
   * @param {Array}  [config.center]    - [lat, lng] fixed initial view; omit to auto-fit locations
   * @param {number} [config.zoom]      - fixed initial zoom, used only when `center` is set
   *
   * Omit either the osm* or topo* id pair to render just one layer instead of both.
   * Returns { osm?: { map, markers }, topo?: { map, markers } }.
   */
  function render(config) {
    if (typeof L === 'undefined') {
      console.error('StandardMap.render: Leaflet (L) is not loaded yet - include leaflet.js before standard_map.js');
      return null;
    }

    const locations = config.locations || [];
    if (locations.length === 0) {
      console.warn('StandardMap.render: called with an empty locations array');
    }

    const view = config.center ? { center: config.center, zoom: config.zoom } : null;

    const result = {};
    if (config.osmMapId) {
      result.osm = renderLayer(config.osmMapId, config.osmLegendId, 'osm', locations, view);
    }
    if (config.topoMapId) {
      result.topo = renderLayer(config.topoMapId, config.topoLegendId, 'topo', locations, view);
    }
    return result;
  }

  global.StandardMap = { render, TILE_LAYERS, createMarkerIcon };
})(window);
