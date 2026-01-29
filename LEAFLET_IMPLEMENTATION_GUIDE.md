# Leaflet.js Map Implementation Guide for LLMs

## Overview
This guide provides complete instructions for creating interactive web maps using Leaflet.js with OpenStreetMap (OSM) and OpenTopoMap tile providers. Follow these instructions precisely to generate working map implementations.

## Core Requirements

### 1. Essential HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Map Title</title>
    
    <!-- Leaflet CSS - MUST be in <head> -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    
    <style>
        /* Map container MUST have explicit height */
        .map-container {
            height: 600px;  /* Required - maps won't display without this */
            width: 100%;
        }
    </style>
</head>
<body>
    <div id="map" class="map-container"></div>
    
    <!-- Leaflet JS - MUST be before your script -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    
    <script>
        // Your map code goes here
    </script>
</body>
</html>
```

**Critical Points:**
- Leaflet CSS must be loaded in `<head>`
- Map container must have explicit height (not percentage without parent height)
- Leaflet JS must load before your initialization code
- Use integrity hashes for security

---

## 2. Basic Map Initialization

### Single Map with OpenStreetMap

```javascript
// Initialize map with center coordinates and zoom level
const map = L.map('map').setView([latitude, longitude], zoomLevel);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);
```

**Parameters:**
- `latitude`, `longitude`: Center point coordinates (e.g., 25.2048, 55.2708 for Dubai)
- `zoomLevel`: Integer from 1 (world view) to 19 (street level)
  - 1-4: Country/continent level
  - 5-9: State/region level
  - 10-13: City level
  - 14-16: Neighborhood level
  - 17-19: Street/building level

### Single Map with OpenTopoMap

```javascript
const map = L.map('map').setView([latitude, longitude], zoomLevel);

// Add OpenTopoMap tiles (topographic style)
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17  // OpenTopoMap max is 17, not 19
}).addTo(map);
```

**Key Difference:** OpenTopoMap has maxZoom of 17 (not 19 like OSM)

---

## 3. Creating Multiple Maps (Recommended Pattern)

When creating both OpenStreetMap and OpenTopoMap views, use this pattern:

```html
<div id="map1" class="map-container"></div>
<div id="map2" class="map-container"></div>
```

```javascript
// Map 1: OpenStreetMap
const map1 = L.map('map1').setView([centerLat, centerLng], zoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map1);

// Map 2: OpenTopoMap
const map2 = L.map('map2').setView([centerLat, centerLng], zoom);
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17
}).addTo(map2);
```

**Important:** Use different variable names (`map1`, `map2`) for multiple map instances.

---

## 3a. Standard Map Block for Deck Pages

When a request asks for a “standard map” on a deck or section page, use the two-map pattern above (OpenStreetMap followed by OpenTopoMap) and add a clickable legend below each display so users can jump to any location.

```html
<h3>OpenStreetMap</h3>
<div id="map-osm" class="map-container"></div>
<div id="legend-osm" class="map-legend"></div>

<h3>OpenTopoMap</h3>
<div id="map-topo" class="map-container"></div>
<div id="legend-topo" class="map-legend"></div>
```

```javascript
function buildLegend(containerId, mapInstance, markers, locations) {
  const legend = document.getElementById(containerId);
  locations.forEach((loc, index) => {
    const button = document.createElement('button');
    button.textContent = `${loc.icon} ${loc.name}`;
    button.onclick = () => {
      mapInstance.setView([loc.lat, loc.lng], loc.zoom || 14);
      markers[index].openPopup();
    };
    legend.appendChild(button);
  });

  const showAll = document.createElement('button');
  showAll.textContent = 'Show all';
  showAll.onclick = () => mapInstance.fitBounds(L.latLngBounds(locations.map((l) => [l.lat, l.lng])));
  legend.appendChild(showAll);
}
```

Make sure the legend appears **below** each map, uses the same location list as the markers, and stays clickable on mobile (flex-wrap buttons or use a scrollable legend).

---

## 4. Adding Markers

### Basic Markers

```javascript
// Simple marker with default icon
L.marker([lat, lng]).addTo(map);

// Marker with popup
L.marker([lat, lng])
    .addTo(map)
    .bindPopup('<b>Location Name</b><br>Description text');

// Marker with popup that opens immediately
L.marker([lat, lng])
    .addTo(map)
    .bindPopup('Content')
    .openPopup();
```

### Custom Colored Markers (Recommended Pattern)

```javascript
const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `
        <div style="position: relative; text-align: center;">
            <svg width="40" height="55" viewBox="0 0 40 55" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.4"/>
                    </filter>
                </defs>
                <path d="M20 0C9 0 0 9 0 20c0 13.4 20 35 20 35s20-21.6 20-35C40 9 31 0 20 0z" 
                      fill="${color}" 
                      stroke="white" 
                      stroke-width="2.5"
                      filter="url(#shadow-${uniqueId})"/>
                <circle cx="20" cy="20" r="8" fill="white" opacity="0.9"/>
                <text x="20" y="25" text-anchor="middle" font-size="12">${emoji}</text>
            </svg>
        </div>
    `,
    iconSize: [40, 55],
    iconAnchor: [20, 55],
    popupAnchor: [0, -55]
});

L.marker([lat, lng], { icon: customIcon })
    .addTo(map)
    .bindPopup('Popup content');
```

**Parameters:**
- `color`: Hex color code (e.g., '#e74c3c', '#3498db')
- `emoji`: Single emoji character (e.g., '🏛️', '🐅', '🏰')
- `uniqueId`: Use array index or unique identifier for filter IDs
- `iconSize`: [width, height] in pixels
- `iconAnchor`: [x, y] - point that corresponds to marker's location (typically [width/2, height])
- `popupAnchor`: [x, y] - offset for popup from iconAnchor

---

## 5. Adding Markers to Multiple Maps

When you have two maps showing the same locations:

```javascript
const locations = [
    { lat: 25.0760, lng: 55.1320, name: 'Dubai Marina', color: '#3498db', emoji: '🏙️' },
    { lat: 25.2631, lng: 55.2972, name: 'Al Bastakiya', color: '#e67e22', emoji: '🏛️' }
];

const markers1 = [];
const markers2 = [];

locations.forEach((loc, index) => {
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `/* SVG code from above with loc.color and loc.emoji */`,
        iconSize: [40, 55],
        iconAnchor: [20, 55],
        popupAnchor: [0, -55]
    });
    
    const popupContent = `<b>${loc.name}</b>`;
    
    // Add to map1
    const marker1 = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(map1)
        .bindPopup(popupContent);
    markers1.push(marker1);
    
    // Add to map2
    const marker2 = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(map2)
        .bindPopup(popupContent);
    markers2.push(marker2);
});
```

**Important:** Store marker references in arrays if you need to interact with them later.

---

## 6. Styled Popups

### Custom Popup Styling

```html
<style>
.custom-popup .leaflet-popup-content-wrapper {
    border-radius: 8px;
    padding: 0;
}
.custom-popup .leaflet-popup-content {
    margin: 0;
    min-width: 250px;
}
.popup-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 15px;
    border-radius: 8px 8px 0 0;
}
.popup-body {
    padding: 15px;
}
</style>
```

```javascript
const popupContent = `
    <div class="popup-header" style="background: ${color};">
        <h3 style="margin: 0; font-size: 16px;">${emoji} ${name}</h3>
    </div>
    <div class="popup-body">
        <p style="margin: 8px 0; color: #666;"><strong>${type}</strong></p>
        <p style="margin: 8px 0;">${description}</p>
        <hr style="margin: 10px 0; border: none; border-top: 1px solid #eee;">
        <p style="margin: 5px 0; font-size: 12px; color: #999;">
            <strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}
        </p>
    </div>
`;

marker.bindPopup(popupContent, {
    className: 'custom-popup',
    maxWidth: 300
});
```

---

## 7. Navigation Controls

### Zoom to Specific Location

```javascript
map.setView([lat, lng], zoomLevel);

// Optionally open a specific marker's popup
markers[index].openPopup();
```

### Fit All Markers in View

```javascript
function fitAllMarkers(map) {
    const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
}
```

### Navigation Buttons Pattern

```html
<div class="controls">
    <button onclick="map.setView([lat, lng], zoom)">Location Name</button>
    <button onclick="fitAllMarkers(map)">Show All</button>
</div>
```

```css
button {
    background: #2196F3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin: 5px;
}
button:hover {
    background: #1976D2;
}
```

---

## 8. Additional Useful Controls

### Scale Bar

```javascript
L.control.scale({ 
    imperial: false,  // Don't show miles
    metric: true      // Show kilometers
}).addTo(map);
```

### Zoom Control Position

```javascript
// Move zoom controls to bottom-right
const map = L.map('map', {
    zoomControl: false
}).setView([lat, lng], zoom);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);
```

---

## 9. Location Data Structure (Best Practice)

Organize location data in a structured array:

```javascript
const locations = [
    {
        name: 'Location Name',
        lat: 25.0760,
        lng: 55.1320,
        description: 'Detailed description of the location',
        type: 'Category/Type',
        category: 'city',  // For grouping/filtering
        color: '#3498db',  // Marker color
        icon: '🏛️',        // Emoji for marker
        zoom: 13           // Preferred zoom level for this location
    },
    // ... more locations
];
```

**Recommended color schemes:**
- Cities: `#e74c3c` (red), `#3498db` (blue), `#e67e22` (orange)
- Wildlife/Nature: `#27ae60` (green), `#16a085` (teal)
- Heritage/Religious: `#9b59b6` (purple), `#f39c12` (gold)
- Coastal/Water: `#1abc9c` (turquoise), `#3498db` (blue)

---

## 10. Complete Working Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Map Example</title>
    
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .map-section {
            background: white;
            margin: 20px 0;
            padding: 20px;
            border-radius: 8px;
        }
        .map-container {
            height: 600px;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin: 15px 0;
        }
        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        button {
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
        }
        button:hover {
            background: #1976D2;
        }
    </style>
</head>
<body>
    <div class="map-section">
        <h2>OpenStreetMap</h2>
        <div id="map1" class="map-container"></div>
        <div class="controls" id="controls1"></div>
    </div>
    
    <div class="map-section">
        <h2>OpenTopoMap</h2>
        <div id="map2" class="map-container"></div>
        <div class="controls" id="controls2"></div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    
    <script>
        const locations = [
            { name: 'Location 1', lat: 25.0760, lng: 55.1320, color: '#3498db', icon: '📍' },
            { name: 'Location 2', lat: 25.2631, lng: 55.2972, color: '#e74c3c', icon: '🏛️' }
        ];

        // Initialize maps
        const map1 = L.map('map1').setView([25.2048, 55.2708], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map1);

        const map2 = L.map('map2').setView([25.2048, 55.2708], 11);
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17
        }).addTo(map2);

        // Add markers
        const markers1 = [];
        const markers2 = [];

        locations.forEach((loc, index) => {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="position: relative; text-align: center;">
                        <svg width="40" height="55" viewBox="0 0 40 55" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 0C9 0 0 9 0 20c0 13.4 20 35 20 35s20-21.6 20-35C40 9 31 0 20 0z" 
                                  fill="${loc.color}" stroke="white" stroke-width="2.5"/>
                            <circle cx="20" cy="20" r="8" fill="white" opacity="0.9"/>
                            <text x="20" y="25" text-anchor="middle" font-size="12">${loc.icon}</text>
                        </svg>
                    </div>
                `,
                iconSize: [40, 55],
                iconAnchor: [20, 55],
                popupAnchor: [0, -55]
            });

            const popup = `<b>${loc.name}</b><br>${loc.lat}, ${loc.lng}`;

            markers1.push(L.marker([loc.lat, loc.lng], { icon }).addTo(map1).bindPopup(popup));
            markers2.push(L.marker([loc.lat, loc.lng], { icon }).addTo(map2).bindPopup(popup));
        });

        // Add navigation buttons
        function createControls(controlsId, map, markers) {
            const div = document.getElementById(controlsId);
            locations.forEach((loc, i) => {
                const btn = document.createElement('button');
                btn.textContent = loc.name;
                btn.onclick = () => {
                    map.setView([loc.lat, loc.lng], 14);
                    markers[i].openPopup();
                };
                div.appendChild(btn);
            });
            
            const showAll = document.createElement('button');
            showAll.textContent = 'Show All';
            showAll.onclick = () => {
                const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
                map.fitBounds(bounds, { padding: [50, 50] });
            };
            div.appendChild(showAll);
        }

        createControls('controls1', map1, markers1);
        createControls('controls2', map2, markers2);

        // Add scale controls
        L.control.scale({ imperial: false, metric: true }).addTo(map1);
        L.control.scale({ imperial: false, metric: true }).addTo(map2);
    </script>
</body>
</html>
```

---

## 11. Common Pitfalls to Avoid

### ❌ Don't Do This:

```javascript
// Missing height on container
<div id="map"></div>  // Map won't display!

// Loading Leaflet JS before CSS
<script src="leaflet.js"></script>
<link rel="stylesheet" href="leaflet.css"/>  // Wrong order!

// Using percentage height without parent height
.map-container { height: 100%; }  // Won't work unless parent has height

// Reusing marker variables
const marker = L.marker([lat1, lng1]).addTo(map);
const marker = L.marker([lat2, lng2]).addTo(map);  // Overwrites first!

// Missing attribution
L.tileLayer(url).addTo(map);  // Attribution required by OSM license
```

### ✅ Do This Instead:

```javascript
// Explicit height
<div id="map" style="height: 600px;"></div>

// Correct load order
<link rel="stylesheet" href="leaflet.css"/>
<script src="leaflet.js"></script>

// Explicit pixel height
.map-container { height: 600px; }

// Unique marker variables or use arrays
const marker1 = L.marker([lat1, lng1]).addTo(map);
const marker2 = L.marker([lat2, lng2]).addTo(map);
// OR
const markers = [];
markers.push(L.marker([lat1, lng1]).addTo(map));

// Always include attribution
L.tileLayer(url, {
    attribution: '&copy; OSM contributors'
}).addTo(map);
```

---

## 12. Tile Provider Reference

### OpenStreetMap Standard
```javascript
{
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}
```
**Best for:** Urban navigation, finding addresses, street-level detail

### OpenTopoMap
```javascript
{
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17
}
```
**Best for:** Terrain visualization, hiking routes, understanding geography

### CartoDB Positron (Alternative)
```javascript
{
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd'
}
```
**Best for:** Clean, minimal background for custom markers

---

## 13. Zoom Level Guidelines

Choose appropriate zoom levels based on what you're showing:

| Zoom | Scale | Best Use Case | Example |
|------|-------|---------------|---------|
| 1-3 | Continent | World/continent overview | Multiple countries |
| 4-5 | Country | National view | All of India |
| 6-8 | Region | State/province level | Rajasthan state |
| 9-11 | Metropolitan | City cluster | Delhi NCR |
| 12-13 | City | Full city view | Dubai city |
| 14-15 | District | Neighborhood | Dubai Marina |
| 16-17 | Street | Street level | Specific block |
| 18-19 | Building | Building detail | Individual structures |

**Recommendation:** 
- For country/regional maps: Start at zoom 5-6
- For city maps: Start at zoom 11-13
- For clicking on markers: Zoom to 14-16

---

## 14. Performance Optimization

For maps with many markers (>50):

```javascript
// Use marker clustering
// Install: <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>

const markers = L.markerClusterGroup();

locations.forEach(loc => {
    const marker = L.marker([loc.lat, loc.lng]);
    marker.bindPopup(loc.name);
    markers.addLayer(marker);
});

map.addLayer(markers);
```

For better performance:
- Limit initial zoom to avoid loading too many tiles
- Use `maxBounds` to restrict panning area
- Consider lazy-loading markers outside viewport

---

## 15. Responsive Design

Make maps mobile-friendly:

```css
@media (max-width: 768px) {
    .map-container {
        height: 400px;  /* Shorter on mobile */
    }
    
    .controls button {
        font-size: 12px;
        padding: 8px 12px;
    }
}
```

```javascript
// Disable zoom on scroll for mobile
const map = L.map('map', {
    scrollWheelZoom: false
}).setView([lat, lng], zoom);

// Enable zoom with gesture
map.scrollWheelZoom.enable();
```

---

## Single-Map Section Page Pattern

Use this lightweight pattern for a single map embedded inside a deck section page:

```html
<!-- Leaflet CSS in the <head> -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""/>

<style>
  .map-container {
    height: 420px;
    border: 2px solid #dcdcdc;
    border-radius: 12px;
    margin: 16px 0;
  }
</style>

<div id="section-map" class="map-container"></div>

<!-- Leaflet JS before your map script -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossorigin=""></script>
<script>
  const sectionMap = L.map('section-map').setView([28.6, 77.2], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(sectionMap);

  const locations = [
    { name: 'Location A', lat: 28.62, lng: 77.24, address: 'Address line' },
    { name: 'Location B', lat: 28.55, lng: 77.09, address: 'Address line' }
  ];

  const bounds = L.latLngBounds([]);
  locations.forEach((loc) => {
    L.marker([loc.lat, loc.lng])
      .addTo(sectionMap)
      .bindPopup(`<strong>${loc.name}</strong><br>${loc.address}`);
    bounds.extend([loc.lat, loc.lng]);
  });

  if (locations.length > 1) {
    sectionMap.fitBounds(bounds, { padding: [30, 30] });
  }
</script>
```

---

## Summary Checklist

When implementing a Leaflet map, ensure:

- ✅ Leaflet CSS loaded in `<head>`
- ✅ Map container has explicit height in pixels
- ✅ Leaflet JS loads before initialization code
- ✅ Correct tile URL and attribution for provider
- ✅ Appropriate zoom level for content (5-6 for regions, 11-13 for cities)
- ✅ maxZoom set correctly (19 for OSM, 17 for OpenTopoMap)
- ✅ Custom icons use unique IDs for filters
- ✅ Markers stored in arrays for both maps if using multiple maps
- ✅ Navigation controls provided for user interaction
- ✅ Scale control added for geographic reference

Follow these patterns precisely and your Leaflet maps will display correctly in all modern browsers.
