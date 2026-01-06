# **Design Document**

Interactive Web Deck System

Version 1.0

# **1\. Architecture Overview**

## **1.1 System Architecture**

The Interactive Web Deck System follows a static site generation architecture with the following high-level components:

* **Source Content Layer:** Text-based source files containing deck content and metadata  
* **Build Layer:** Static site generator that compiles sources into HTML/CSS/JS  
* **CI/CD Layer:** GitHub Actions workflows for automated building and deployment  
* **Hosting Layer:** GitHub Pages serving static files with PWA support  
* **Client Layer:** Web browser with service worker for offline capability

## **1.2 Technology Stack**

| Component | Technology Options |
| :---- | :---- |
| Styling | CSS3 with responsive design principles |
| Scripting | Vanilla JavaScript for interactions |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |
| Offline Support | Service Worker \+ Web App Manifest (PWA) |

# **2\. Repository Structure**

## **2.1 Directory Layout**

The repository follows this standardized structure:

repository-root/

├── decks/                    \# Deck source files

│   ├── deck-name/              \# One folder per deck

│   │   ├── 00\_meta.twee        \# Deck metadata & config

│   │   ├── 01\_sections/        \# Card source files

│   │   └── assets/             \# Deck-specific assets

│   │       ├── styles.css

│   │       ├── scripts.js

│   │       └── images/

├── shared/                     \# Cross-deck resources

│   ├── passages/               \# Reusable content

│   ├── macros/                 \# Shared widgets/macros

│   └── styles/                 \# Shared stylesheets

├── formats/                    \# Vendored deck formats

├── scripts/                    \# Build scripts

│   ├── get\_tweego.sh           \# Tool installation

│   └── build.sh                \# Build orchestration

├── pwa/                        \# PWA icons

├── manifest.webmanifest        \# PWA manifest

├── sw.js                       \# Service worker

├── .github/workflows/          \# CI/CD pipelines

├── .tweego.yaml                \# Build config

└── dist/                       \# Build output (gitignored)

## **2.2 File Naming Conventions**

* Deck folders: lowercase, hyphen-separated (e.g., city-guide)  
* Source files: kebab-case with descriptive names (e.g., main-station.htm)  
* Meta file prefixed with 00\_ to sort first alphabetically  
* Section folder prefixed with 01\_ to sort after meta

# **3\. Navigation**

A repository will generate a website, which consists of 

* a set of branches, each of which contains   
  * a set of decks, each of which contains  
    * a set of sections which are sub-directories of the deck, each of which contains  
      * a set of pages

The pathname for each page can show its place in this hierarchy.

The top level of the website should allow navigation to any branch and any deck.

Each deck can optionally have a "hamburger icon" that provides a menu that lists all the contained sections and pages in hierarchical order for fast navigation within the deck.

If a deck has multiple CSS style files, the "hamburger icon" should allow the uset to select the CSS file to use.

# **4\. CSS Architecture**

## **4.1 Style Cascade**

Styles are applied in the following order (later overrides earlier):

* Generator default styles (e.g., SugarCube base CSS)  
* Shared styles (shared/styles/deck.css)  
* Deck-specific styles (decks/deck-name/assets/styles.css)

## **4.2 Key CSS Classes**

| Class | Purpose |
| :---- | :---- |
| .card | Main container for card content |
| .card-header | Card title section with styling |
| .card-content | Main body content area |
| .toc-grid | Grid layout for Table of Contents items |
| .toc-item | Individual item in Table of Contents |
| .highlight | Highlighted info box (hours, fees, tips) |
| .location-section | Collapsible location details container |
| .navigation | Footer navigation links section |
| .nav-link | Styled navigation button/link |
| \#ui-bar | Generator sidebar (hidden via CSS) |

## **4.3 Responsive Design Breakpoints**

* Mobile: max-width: 600px \- Single column, reduced padding, stacked navigation  
* Tablet: max-width: 900px \- Adjusted grid columns, moderate padding  
* Desktop: min-width: 901px \- Full layout with maximum card width constraint

# **5\. JavaScript Components**

## **5.1 Required Functions**

| Function | Description |
| :---- | :---- |
| toggleLocation(id) | Expands/collapses location detail sections; updates toggle icon |
| makeHamburger() | Generates the hamburger icon menu for the deck |

## **5.2 Service Worker Strategy**

The service worker implements a cache-first strategy:

* On install: Pre-cache core assets (index, manifest, icons)  
* On fetch: Check cache first, fall back to network  
* On network success: Cache the response for future offline use  
* On activate: Clean up old cache versions

# **6\. Build Process**

## **6.1 Build Script Responsibilities**

The build.sh script performs the following steps for each deck:

* Create output directory (dist/deck-name/)  
* Invoke generator with configuration file, shared macros, and source files  
* Copy deck-specific assets to output  
* Inject service worker registration into generated HTML  
* Copy PWA assets (manifest, icons, service worker) to dist/  
* Generate root index.html listing all decks

## **6.2 GitHub Actions Workflow**

The CI/CD pipeline consists of two jobs:

**Build Job:**

* Checkout repository  
* Cache/install build tools  
* Execute build script  
* Upload dist/ as Pages artifact

**Deploy Job (main branch only):**

* Deploy artifact to GitHub Pages

# **7\. PWA Configuration**

## **7.1 Web App Manifest**

Required manifest.webmanifest properties:

* name: Full application name  
* short\_name: Abbreviated name for home screen  
* start\_url: Entry point ("./")  
* display: "standalone" for app-like experience  
* icons: Array with 192x192 and 512x512 PNG icons

## **7.2 Cache Versioning**

The CACHE\_VERSION constant in sw.js controls cache invalidation. Incrementing this value forces all clients to download fresh content on their next online visit.

# **8\. Security Considerations**

* All external links open in new tabs with rel="noopener noreferrer"  
* No user data is collected or stored server-side  
* localStorage is used only for navigation state (if applicable)  
* Content served over HTTPS via GitHub Pages

*— End of Design Document —*  
