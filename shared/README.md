# Shared Libraries Directory

This directory contains shared libraries, scripts, styles, and images that can be used by any deck in the SitePrep project.

## Directory Structure

```
shared/
├── scripts/        # Shared JavaScript libraries
├── styles/         # Shared CSS stylesheets
├── images/         # Shared images and icons
└── distance_viz/   # Distance visualization library
    ├── distance_visualizer.md
    ├── traveltimeviz.css
    └── traveltimeviz.js
```

## How to Use Shared Libraries in Your Decks

Shared libraries are copied to the build output and can be referenced from any deck using relative paths.

### From a Deck Index Page (`decks/{deck-name}/index.html`)

To reference shared libraries from a deck's main index page, use `../../shared/`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Deck</title>

  <!-- Reference shared CSS -->
  <link rel="stylesheet" href="../../shared/distance_viz/traveltimeviz.css">

  <!-- Reference deck-specific CSS -->
  <link rel="stylesheet" href="./assets/styles.css">
</head>
<body>
  <!-- Your content here -->

  <!-- Reference shared JavaScript -->
  <script src="../../shared/distance_viz/traveltimeviz.js"></script>

  <!-- Reference deck-specific JavaScript -->
  <script src="./assets/scripts.js"></script>
</body>
</html>
```

### From a Section Page (`decks/{deck-name}/sections/{section-name}/page.html`)

To reference shared libraries from a section page, use `../../../../shared/`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Section</title>

  <!-- Reference shared CSS -->
  <link rel="stylesheet" href="../../../../shared/distance_viz/traveltimeviz.css">

  <!-- Reference deck-specific CSS -->
  <link rel="stylesheet" href="../../assets/styles.css">
</head>
<body>
  <!-- Your content here -->

  <!-- Reference shared JavaScript -->
  <script src="../../../../shared/distance_viz/traveltimeviz.js"></script>

  <!-- Reference deck-specific JavaScript -->
  <script src="../../assets/scripts.js"></script>
</body>
</html>
```

## Path Reference Quick Guide

| From Location | Relative Path to `shared/` |
|---------------|----------------------------|
| Root (`index.html`) | `./shared/` |
| Deck index (`decks/{deck}/index.html`) | `../../shared/` |
| Section page (`decks/{deck}/sections/{section}/page.html`) | `../../../../shared/` |

## Distance Visualization Library

The `distance_viz/` folder contains a complete library for visualizing travel times and distances between geographic locations.

### Quick Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Travel Times</title>

  <!-- D3.js dependency -->
  <script src="https://d3js.org/d3.v7.min.js"></script>

  <!-- TravelTimeViz library -->
  <link rel="stylesheet" href="../../shared/distance_viz/traveltimeviz.css">
  <script src="../../shared/distance_viz/traveltimeviz.js"></script>

  <link rel="stylesheet" href="./assets/styles.css">
</head>
<body>
  <header class="card">
    <div class="card-header">
      <h1>Travel Times Visualization</h1>
    </div>
  </header>

  <main class="card">
    <div id="network-graph"></div>
    <div id="distance-matrix"></div>
  </main>

  <script>
    // Define locations with coordinates
    const locations = {
      "New Delhi": { lat: 28.6139, lng: 77.2090, color: "#9b59b6" },
      "Jaipur": { lat: 26.9124, lng: 75.7873, color: "#e74c3c" },
      "Agra": { lat: 27.1767, lng: 78.0081, color: "#3498db" }
    };

    // Define routes
    const routes = [
      { from: "New Delhi", to: "Jaipur", time: "4h30m", minutes: 270 },
      { from: "New Delhi", to: "Agra", time: "3h20m", minutes: 200 },
      { from: "Jaipur", to: "Agra", time: "4h", minutes: 240 }
    ];

    // Create and render visualization
    const viz = new TravelTimeViz(locations, routes);
    viz.render('#network-graph', '#distance-matrix');
  </script>
</body>
</html>
```

For complete documentation, see [`distance_viz/distance_visualizer.md`](./distance_viz/distance_visualizer.md).

## Adding New Shared Libraries

To add a new shared library:

1. **Choose the appropriate directory:**
   - JavaScript files → `shared/scripts/`
   - CSS files → `shared/styles/`
   - Images → `shared/images/`
   - Complete libraries with multiple files → `shared/{library-name}/`

2. **Add your files:**
   ```bash
   # For a single script
   cp mylibrary.js shared/scripts/

   # For a complete library
   mkdir -p shared/my_library
   cp mylibrary.js mylibrary.css README.md shared/my_library/
   ```

3. **Document the library:**
   - Add usage examples to this README
   - Include documentation files with your library
   - Update the directory structure section above

4. **Reference from decks:**
   - Use relative paths as shown above
   - Remember to include any external dependencies (CDN links)

## Build Process

The `shared/` directory is automatically copied to the build output by the build script (`scripts/build.sh`). No additional configuration is needed.

When you run:
```bash
./scripts/build.sh
```

The entire `shared/` directory and its contents are copied to `gh-pages/shared/`, making it available to all decks in the built site.

## Best Practices

1. **Keep libraries self-contained:** Each library should be in its own subdirectory with all necessary files
2. **Document dependencies:** Clearly document any external dependencies (like D3.js for TravelTimeViz)
3. **Version your libraries:** Include version numbers in documentation
4. **Test with multiple decks:** Ensure your library works correctly from different path depths
5. **Minimize file sizes:** Use minified versions for production when appropriate
6. **Avoid duplicates:** Check if similar functionality already exists before adding new libraries
7. **Standard maps:** For deck section pages that need a standard map, include two Leaflet displays (OpenStreetMap then OpenTopoMap) with clickable legends beneath each map, matching the pattern used in the Rajasthan deck overview pages.

## Support

For questions or issues with shared libraries:
- Check the library's documentation in its subdirectory
- Verify relative paths are correct for your file location
- Ensure external dependencies are loaded before library scripts

## Recent content update
- Refreshed `decks/aus2503/sections/canberra/overview.html` with a deduplicated Canberra events list sorted by earliest date first, plus per-item validation status and location details (address, hours note, and Google Maps link) for April 2-5, 2026.
- Reworked `decks/aus2503/sections/canberra/overview.html` to add the requested April 2-5, 2026 Canberra event set with per-item verification status, venue links, addresses, map links, and concise hours notes.
- Added a new Aus2503 section page at `decks/aus2503/sections/kangaloon/overview.html` with a **Wineries** topic covering nearby Southern Highlands cellar doors (Centennial Vineyards, Cherry Tree Hill Wines, Artemis Wines, and Tertini Wines), each with address, hours, and Google Maps links.
- Added a new Aus2503 section page at `decks/aus2503/sections/hank-and-katherine/overview.html` for March 16–22 Brisbane/Maroochydore event planning, including a `.highlight` location card for River Plaza Apartments.
- Expanded Aus2503 content with a Guerilla Bay airport-access highlight and a Hank and Katherine schedule plus Sunshine Coast attraction location data.
- Expanded Aus2503 with a new Guerilla Bay transit subsection (including the Canberra–Narooma Murrays timetable link) and added a Canberra section featuring the National Folk Festival venue/address/map details.
- Updated `decks/aus2503/sections/canberra/overview.html` with April 2–5, 2026 Canberra event verification notes, a confirmed Capital Region Farmers Market entry, and current status notes for the requested Sideway, Muse, and Guild additions.
- Expanded the Hank and Katherine page with Brisbane and Maroochydore daytime/evening activity entries, each with links and location details (including City Hall, MacArthur Museum, Howard Smith Wharves, Mapleton Falls, ecoTekk tours, and more).
- Updated the Hank and Katherine page with revised Maroochydore evening picks (The Law Artisan Distillery, The Architect live music, and Market Wine Store tastings), added lunch at Secrets on the Lake, and expanded Chenrezig Institute venue hours.
- Added new Hank and Katherine options for Noosa Festival of Surfing (including the Surfrider fundraiser link), GOMA's Olafur Eliasson exhibition, a convict-history walking sequence, Queensland Maritime Museum hours, Tin Can Bay dolphin feeding, Swan Boat Hire, and KaHunaHub Massage Temple with addresses and map links.
- Added new `decks/baltic/` deck metadata and structure with a **Future** group entry, plus a Baltic deck homepage with a Vilnius section card.
- Added `decks/baltic/sections/vilnius/overview.html` summarizing Vilnius transport options, including airport taxi rank guidance, Bolt/Uber/eTAKSI coverage, and bus/trolleybus ticketing apps.
