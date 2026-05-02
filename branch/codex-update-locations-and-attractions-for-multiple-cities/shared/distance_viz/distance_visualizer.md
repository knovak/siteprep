# Distance Visualizer Documentation

## Overview

The **TravelTimeViz** library is a JavaScript component for visualizing travel times and distances between geographic locations. It creates two complementary visualizations:

1. **Network Graph**: Interactive force-directed graph showing locations and routes with geographic positioning
2. **Distance Matrix**: Heat map grid displaying all pairwise travel times

**Key Features:**
- Geographic positioning based on latitude and longitude
- Automatic north-to-south ordering
- Interactive drag-and-drop nodes
- Zoom and pan capabilities
- Bidirectional route handling
- Customizable colors and styling
- Event system for user interactions

**Version:** 2.0.0
**Dependencies:** D3.js v7+
**License:** MIT

---

## Quick Start

### Installation

```html
<!-- Include D3.js -->
<script src="https://d3js.org/d3.v7.min.js"></script>

<!-- Include TravelTimeViz -->
<link rel="stylesheet" href="traveltimeviz.css">
<script src="traveltimeviz.js"></script>
```

### Basic Usage

```html
<!-- Create container elements -->
<div id="network-graph"></div>
<div id="distance-matrix"></div>

<script>
// Define locations with coordinates
const locations = {
  "Location A": { lat: 28.6139, lng: 77.2090, color: "#e74c3c" },
  "Location B": { lat: 26.9124, lng: 75.7873, color: "#3498db" }
};

// Define routes
const routes = [
  { from: "Location A", to: "Location B", time: "4h30m", minutes: 270 }
];

// Create and render
const viz = new TravelTimeViz(locations, routes);
viz.render('#network-graph', '#distance-matrix');
</script>
```

---

## Example 1: Rajasthan & Delhi Travel Times

This example visualizes travel routes between major destinations in Northern India.

### Data Definition

```javascript
// Location data with coordinates
const locationData = {
  "New Delhi": {
    lat: 28.6139,    // Latitude (north-south position)
    lng: 77.2090,    // Longitude (east-west position)
    color: "#9b59b6" // Optional custom color
  },
  "SNP": {
    lat: 27.4728,    // Sariska National Park
    lng: 76.4337,
    color: "#2ecc71"
  },
  "Jaipur": {
    lat: 26.9124,
    lng: 75.7873,
    color: "#e74c3c"
  },
  "RNP": {
    lat: 26.0173,    // Ranthambore National Park
    lng: 76.5026,
    color: "#3498db"
  }
};

// Travel routes (time in human-readable format and minutes)
const travelData = [
  { from: "Jaipur", to: "RNP", time: "3h20m", minutes: 200 },
  { from: "RNP", to: "SNP", time: "3h45m", minutes: 225 },
  { from: "Jaipur", to: "SNP", time: "2h", minutes: 120 },
  { from: "Jaipur", to: "New Delhi", time: "4h30m", minutes: 270 },
  { from: "SNP", to: "New Delhi", time: "3h40m", minutes: 220 },
  { from: "RNP", to: "New Delhi", time: "5h50m", minutes: 350 }
];
```

### Creating the Visualization

```javascript
// Create visualization instance
const viz = new TravelTimeViz(locationData, travelData);

// Render both visualizations
viz.render('#network-graph', '#distance-matrix');

// Optional: Add event handlers
viz.on('nodeClick', (event) => {
  console.log('Clicked location:', event.detail.id);
});

viz.on('cellClick', (event) => {
  console.log(`Route: ${event.detail.from} → ${event.detail.to}`);
  console.log(`Time: ${event.detail.time}`);
});
```

### Geographic Layout

The visualization automatically positions locations based on their coordinates:

**Vertical (North → South):**
- New Delhi (28.61°N) - top
- SNP (27.47°N)
- Jaipur (26.91°N)
- RNP (26.02°N) - bottom

**Horizontal (West → East):**
- Jaipur (75.79°E) - leftmost
- SNP (76.43°E)
- RNP (76.50°E)
- New Delhi (77.21°E) - rightmost

---

## Example 2: Kerala Backwaters Tour

This example shows travel times for a Kerala tour including Cochin, Fort Kochi, Kumarakom, and Alleppey.

### Data Definition

```javascript
const locationData = {
  "COK": {
    lat: 10.1520,    // Cochin Airport
    lng: 76.4019,
    color: "#e74c3c",
    name: "Cochin Airport"  // Optional display name
  },
  "Kumarakom": {
    lat: 9.6178,     // Kumarakom Resorts
    lng: 76.4319,
    color: "#2ecc71"
  },
  "Fort Kochi": {
    lat: 9.9658,
    lng: 76.2429,
    color: "#3498db"
  },
  "Houseboat": {
    lat: 9.4981,     // Alleppey/Alappuzha
    lng: 76.3388,
    color: "#9b59b6"
  }
};

const travelData = [
  { from: "COK", to: "Fort Kochi", time: "1h15m", minutes: 75 },
  { from: "COK", to: "Kumarakom", time: "2h30m", minutes: 150 },
  { from: "Fort Kochi", to: "Houseboat", time: "1h50m", minutes: 110 },
  { from: "COK", to: "Houseboat", time: "2h40m", minutes: 160 },
  { from: "Kumarakom", to: "Houseboat", time: "1h10m", minutes: 70 }
];
```

### Creating the Visualization

```javascript
const viz = new TravelTimeViz(locationData, travelData);
viz.render('#network-graph', '#distance-matrix');

// Add a reset button
document.getElementById('reset-btn').addEventListener('click', () => {
  viz.resetNetwork();
});
```

### Geographic Layout

**Vertical (North → South):**
- COK (10.15°N) - top
- Fort Kochi (9.97°N)
- Kumarakom (9.62°N)
- Houseboat (9.50°N) - bottom

**Horizontal (West → East):**
- Fort Kochi (76.24°E) - leftmost (coastal)
- Houseboat (76.34°E)
- COK (76.40°E)
- Kumarakom (76.43°E) - rightmost (inland)

---

## Code Functions

### Constructor

```javascript
new TravelTimeViz(locationData, travelData, config)
```

**Parameters:**
- `locationData` (Object): Maps location names to coordinate and color data
  - `lat` (Number): Latitude for north-south positioning
  - `lng` (Number): Longitude for east-west positioning
  - `color` (String, optional): Hex color code
  - `name` (String, optional): Display name
- `travelData` (Array): Array of route objects
  - `from` (String): Source location name
  - `to` (String): Destination location name
  - `time` (String): Human-readable travel time (e.g., "3h20m")
  - `minutes` (Number): Travel time in minutes for calculations
- `config` (Object, optional): Configuration options

**Returns:** TravelTimeViz instance

### Rendering Methods

#### `render(networkContainer, matrixContainer)`
Renders both visualizations.

```javascript
viz.render('#network', '#matrix');
```

#### `renderNetwork(containerId)`
Renders only the network graph.

```javascript
viz.renderNetwork('#network');
```

#### `renderMatrix(containerId)`
Renders only the distance matrix.

```javascript
viz.renderMatrix('#matrix');
```

### Data Management

#### `updateData(locationData, travelData)`
Updates visualization data and re-sorts locations.

```javascript
viz.updateData(newLocations, newRoutes);
viz.render('#network', '#matrix'); // Re-render after update
```

#### `bidirectionalizeData(data)` (private)
Automatically creates bidirectional routes. If you provide A→B, it creates B→A with the same travel time.

### Interaction Methods

#### `resetNetwork()`
Resets all node positions to their default geographic layout.

```javascript
viz.resetNetwork();
```

#### `on(eventName, callback)`
Registers an event listener.

**Available events:**
- `nodeClick`: Fired when a location node is clicked
- `linkHover`: Fired when a route link is hovered
- `cellClick`: Fired when a matrix cell is clicked

```javascript
viz.on('nodeClick', (event) => {
  const location = event.detail.id;
  console.log('Clicked:', location);
});

viz.on('linkHover', (event) => {
  const route = event.detail;
  console.log(`${route.source.id} → ${route.target.id}: ${route.time}`);
});

viz.on('cellClick', (event) => {
  const cell = event.detail;
  console.log(`${cell.from} → ${cell.to}: ${cell.time}`);
});
```

#### `destroy()`
Cleans up simulation and event listeners.

```javascript
viz.destroy();
```

### Utility Methods (Private)

#### `sortLocations()`
Sorts locations north to south by latitude. Respects `customOrder` config if provided.

#### `getLocationColor(location)`
Returns the color for a location, using custom color if provided or default palette.

#### `createGeographicNodes(width, height)`
Creates node objects with positions calculated from latitude and longitude.

#### `mergeConfig(userConfig)`
Merges user configuration with default values.

---

## Code Design

### Architecture Overview

The library follows an object-oriented design with a single main class (`TravelTimeViz`) that encapsulates all functionality. The architecture consists of three main layers:

1. **Data Layer**: Handles location and route data, performs bidirectionalization, and sorting
2. **Rendering Layer**: Creates SVG visualizations using D3.js
3. **Interaction Layer**: Manages user events and simulation updates

### Key Design Principles

#### 1. Geographic Positioning
The core innovation is the geographic positioning system that maps real-world coordinates to screen positions:

```
Y-axis (Vertical):   latitude → north-south ordering (higher lat = top)
X-axis (Horizontal): longitude → west-east positioning (higher lng = right)
```

This creates intuitive visualizations where the layout matches actual geography.

#### 2. Force-Directed Layout with Constraints
The network graph uses D3's force simulation with strong positional constraints:

- **Y-force**: Strongly pins nodes to their latitudinal position
- **X-force**: Strongly pins nodes to their longitudinal position
- **Link force**: Allows slight flexibility based on travel time
- **Charge force**: Provides gentle repulsion between nodes
- **Collision force**: Prevents node overlap

This creates a stable geographic layout while allowing minor adjustments for readability.

#### 3. Bidirectional Route Handling
The component automatically creates reverse routes to ensure the matrix is fully populated:

```javascript
// Input: A → B (3h)
// Output: A → B (3h) AND B → A (3h)
```

This simplifies data input and ensures visual completeness.

#### 4. Event-Driven Interaction
The component uses a simple event emitter pattern for user interactions, allowing external code to respond to clicks and hovers without coupling.

### Data Flow

```
User Data (locations + routes)
    ↓
Constructor (bidirectionalize, sort, setup)
    ↓
Rendering (create SVG, nodes, links)
    ↓
Force Simulation (position nodes geographically)
    ↓
User Interaction (drag, click, hover)
    ↓
Event Callbacks (external handling)
```

### Component Structure

```
TravelTimeViz
├── Data Properties
│   ├── locationData: location coordinates and colors
│   ├── travelData: bidirectional route list
│   ├── locations: sorted location names
│   └── config: merged configuration
│
├── Rendering Methods
│   ├── renderNetwork(): creates force-directed graph
│   ├── renderMatrix(): creates heat map matrix
│   └── render(): renders both visualizations
│
├── Positioning Logic
│   ├── sortLocations(): orders by latitude
│   ├── createGeographicNodes(): calculates x/y from lat/lng
│   └── geographic constraints in force simulation
│
├── Interaction Methods
│   ├── on(): register event listeners
│   ├── emit(): fire events
│   ├── resetNetwork(): reset node positions
│   └── drag handlers in simulation
│
└── Utility Methods
    ├── bidirectionalizeData(): create reverse routes
    ├── mergeConfig(): apply defaults
    └── getLocationColor(): color assignment
```

---

## Implementation Notes

### Geographic Coordinate System

The library uses standard WGS84 coordinates (latitude/longitude):

**Latitude (Y-axis):**
- Range: -90° (South Pole) to +90° (North Pole)
- India range: ~8°N (Kerala) to ~35°N (Kashmir)
- Higher values = further north = top of visualization

**Longitude (X-axis):**
- Range: -180° (West) to +180° (East)
- India range: ~68°E (Gujarat) to ~97°E (Arunachal Pradesh)
- Higher values = further east = right of visualization

### Coordinate Normalization

Longitude values are normalized to fit the canvas width:

```javascript
normalizedLng = (lng - minLng) / (maxLng - minLng);
xPosition = width * (padding + normalizedLng * (1 - 2*padding));
```

This ensures optimal use of space while maintaining proportional distances.

### Travel Time Encoding

Routes require two formats:
1. **Display string** (`time`): Human-readable format like "3h20m", "1h15m", "2h"
2. **Numeric value** (`minutes`): Integer minutes for calculations and color scaling

The numeric value is used for:
- Force simulation distance calculations
- Heat map color intensity
- Link width in network graph

### Force Simulation Parameters

The default parameters are tuned for readability with 4-8 locations:

```javascript
network: {
  linkStrength: 0.15,      // Weak links allow geographic positioning
  chargeStrength: -400,    // Gentle repulsion prevents overlap
  geographicPositioning: true,
  y-force strength: 2.0,   // Very strong latitude constraint
  x-force strength: 1.5    // Strong longitude constraint
}
```

For different use cases:
- **More locations (>8)**: Increase `chargeStrength` to -600
- **Denser connections**: Decrease `linkStrength` to 0.1
- **Tighter clustering**: Reduce padding from 0.15 to 0.1

### Color Scheme

**Network Graph:**
- Custom colors per location (via `locationData`)
- Default palette rotates through 8 distinct colors
- Links are neutral gray with hover highlight

**Distance Matrix:**
- Yellow-Orange-Red gradient by default (YlOrRd)
- Intensity based on travel time (longer = darker)
- Diagonal cells are light gray (0 travel time)
- Configurable via `config.matrix.colorScheme`

Available D3 color schemes:
- `YlOrRd` - Yellow-Orange-Red (default)
- `Blues` - Blue gradient
- `Greens` - Green gradient
- `Viridis` - Perceptually uniform
- `Plasma` - Perceptually uniform

### Browser Compatibility

**Tested browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android)

**Requirements:**
- ES6 support (classes, arrow functions, template literals)
- SVG rendering
- D3.js v7 compatibility

### Performance Considerations

**Optimal ranges:**
- Locations: 4-15 (tested with up to 30)
- Routes: 10-50 connections
- Matrix: up to 20×20 cells efficiently

**Performance tips:**
- Force simulation runs for ~300 iterations then stabilizes
- Disable animations on slower devices
- Use `config.network.enableZoom = false` for better mobile performance
- Limit to 20 locations for smooth interaction

### Responsive Design

The component adapts to container size:

```javascript
width: config.width || container.clientWidth  // Auto-width if not specified
height: config.height || 550                   // Fixed height by default
```

CSS breakpoints adjust font sizes for mobile:
- Labels scale down on screens <768px
- Touch targets remain accessible
- Matrix cells stack vertically if needed

### Customization Points

**Easy to customize:**
- Location colors (per-location or default palette)
- Node radius and link thickness
- Matrix color scheme
- Canvas dimensions
- Force simulation parameters

**Requires code changes:**
- Label positioning (currently below nodes)
- Link label format
- Matrix cell content
- Node shapes (currently circles)

### Known Limitations

1. **Geographic accuracy**: Uses simple linear projection, not proper map projection. Works well for regional distances but not continental scales.

2. **Route asymmetry**: Assumes symmetric travel times. If A→B takes 3h, B→A also takes 3h. For asymmetric routes, provide both directions explicitly.

3. **Overlapping labels**: With many nearby locations, labels may overlap. Consider:
   - Increasing canvas size
   - Using abbreviations
   - Implementing label collision detection

4. **Static routes only**: Does not support time-varying routes or traffic conditions.

5. **Memory**: Keeps all node/link data in memory. For very large datasets (>100 locations), consider pagination or filtering.

### Best Practices

**Data preparation:**
1. Verify coordinate accuracy (use Google Maps or similar)
2. Use consistent time formats ("3h20m" not "3:20" or "3.33h")
3. Provide all major routes for complete matrix
4. Sort locations by importance if using custom order

**Visual design:**
1. Use distinct colors for nearby locations
2. Provide sufficient contrast for text labels
3. Test on both light and dark backgrounds
4. Ensure color scheme is colorblind-friendly

**User experience:**
1. Add a reset button for network graph
2. Provide legend explaining colors
3. Include tooltips with full location names
4. Consider printing layout if users will export

**Performance:**
1. Pre-process data rather than computing on each render
2. Debounce window resize events
3. Use production builds of D3.js
4. Lazy-load for single-page applications

---

## Configuration Reference

### Complete Configuration Object

```javascript
const config = {
  // Network graph settings
  network: {
    width: null,                    // Auto-width (or number in pixels)
    height: 550,                    // Canvas height in pixels
    nodeRadius: 22,                 // Node circle radius
    enableZoom: true,               // Enable zoom/pan interaction
    enableDrag: true,               // Enable node dragging
    linkStrength: 0.15,            // Force simulation link strength (0-1)
    chargeStrength: -400,          // Node repulsion force (negative)
    showArrows: true,              // Show directional arrows on links
    geographicPositioning: true    // Use lat/lng for positioning
  },

  // Distance matrix settings
  matrix: {
    width: null,                    // Auto-width (or number in pixels)
    height: 550,                    // Canvas height in pixels
    colorScheme: 'YlOrRd'          // D3 color scheme name
  },

  // General settings
  sortOrder: 'north-south',         // 'north-south' or 'custom'
  customOrder: [],                  // Array of location names (if custom)
  defaultColors: [                  // Color palette for locations
    '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
    '#f39c12', '#1abc9c', '#e67e22', '#34495e'
  ]
};
```

---

## Troubleshooting

### Nodes overlap or cluster tightly
**Solution:** Increase charge strength (more negative)
```javascript
config.network.chargeStrength = -600;
```

### Nodes drift away from geographic positions
**Solution:** Increase position force strength in code
```javascript
// In renderNetwork(), change:
.force('y', ...).strength(2.5)  // Increase from 2.0
.force('x', ...).strength(2.0)  // Increase from 1.5
```

### Matrix text is too small
**Solution:** Increase matrix canvas height
```javascript
config.matrix.height = 700;
```

### Labels overlap
**Solutions:**
1. Use shorter location names or abbreviations
2. Increase canvas size
3. Reduce node radius to create more space

### Colors look similar
**Solution:** Provide custom colors with better contrast
```javascript
locationData.Location1.color = "#ff0000";  // Red
locationData.Location2.color = "#0000ff";  // Blue
```

### Network graph is jumpy or unstable
**Solutions:**
1. Increase collision radius
2. Decrease link strength
3. Run simulation longer before enabling interaction

---

## Version History

**2.0.0** (Current)
- Added geographic positioning based on latitude/longitude
- Automatic bidirectional route creation
- Improved force simulation parameters
- Enhanced event system
- Better responsive design

**1.0.0** (Previous)
- Basic network graph with manual positioning
- Distance matrix visualization
- Simple event handling

---

## License

MIT License - Free for personal and commercial use.

## Support

For questions, issues, or feature requests, refer to the examples provided or modify the source code to suit your needs.
