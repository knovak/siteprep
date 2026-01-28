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

## **2.3 Deck Metadata (deck.json)**

Each deck directory contains a `deck.json` file that provides metadata used by the build system to generate the home page and organize decks.

### **2.3.1 Schema**

```json
{
  "title": "string",
  "sort_order": "string",
  "description": "string",
  "group": "Current" | "Future" | "Past"
}
```

### **2.3.2 Field Definitions**

| Field | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| title | string | Yes | Display name shown on the home page |
| sort_order | string | Yes | Alphanumeric string for ordering decks within a group |
| description | string | Yes | Brief summary displayed below the title on the home page |
| group | string | Yes | Categorization for home page grouping: "Current", "Future", or "Past" |

### **2.3.3 Example**

```json
{
  "title": "Kerala",
  "sort_order": "202602A",
  "description": "Kochi overview and Kerala coastal travel essentials.",
  "group": "Current"
}
```

### **2.3.4 Group Semantics**

* **Current**: Active decks that are relevant for upcoming or ongoing trips
* **Future**: Planned decks for trips not yet confirmed or scheduled
* **Past**: Archived decks from past trips, retained for reference

### **2.3.5 Fallback Behavior**

If `deck.json` is missing or a field is not present, the build system uses the deck directory name as a fallback for title, sort_order, and description. If the group field is missing, the deck defaults to the "Current" group.

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
| .photo-gallery | Grid container for gallery items displaying attraction photos |
| .gallery-item | Individual photo item with image and caption |
| .gallery-caption | Text caption overlay on gallery images |
| .lightbox | Full-screen modal overlay for expanded photo viewing |
| .lightbox-image | Large image displayed in lightbox view |
| .lightbox-caption | Caption text shown below lightbox image |
| .lightbox-nav | Navigation buttons (prev/next) in lightbox |
| .lightbox-close | Close button for exiting lightbox view |
| \#ui-bar | Generator sidebar (hidden via CSS) |

## **4.3 Navigation Patterns**

* Footer navigation appears at the bottom of each page, showing links in the following order: **Version: main | Deck | Section | Google Drive | View all versions**. The Deck and Section links appear only when the page belongs to a deck or section, and separators are visual pipes between links.  
* Section links in deck tables of contents are a single clickable card: wrap the heading and description inside the anchor (`.toc-link`) so the entire rectangle is clickable, and avoid standalone "Open overview" link text.  

## **4.4 Responsive Design Breakpoints**

* Mobile: max-width: 600px \- Single column, reduced padding, stacked navigation  
* Tablet: max-width: 900px \- Adjusted grid columns, moderate padding  
* Desktop: min-width: 901px \- Full layout with maximum card width constraint

# **5\. JavaScript Components**

## **5.1 Required Functions**

| Function | Description |
| :---- | :---- |
| toggleLocation(id) | Expands/collapses location detail sections; updates toggle icon |
| makeHamburger() | Generates the hamburger icon menu for the deck |
| initPhotoGallery(galleryId) | Initializes a photo gallery with lightbox functionality; handles click events, keyboard navigation, and image carousel |

## **5.2 Photo Gallery Component**

The photo gallery component provides a reusable way to display collections of images with captions and lightbox viewing functionality. It is designed to be used across multiple pages and decks.

### **5.2.1 Purpose**

The photo gallery serves to:
* Display visual previews of attractions, locations, or features mentioned in the content
* Provide users with a quick visual overview of key highlights
* Enable full-screen viewing of images through a lightbox interface
* Support keyboard and touch navigation for accessibility
* Maintain unique identifiers for each image to facilitate future editing

### **5.2.2 HTML Structure**

```html
<div id="gallery-id" class="photo-gallery">
  <div class="gallery-item">
    <img src="[image-url]" alt="[description] ~[unique-number]">
    <div class="gallery-caption">[description] ~[unique-number]</div>
  </div>
  <!-- Additional gallery items -->
</div>

<script>
  initPhotoGallery('gallery-id');
</script>
```

### **5.2.3 Image Source Guidelines**

* Images should be sourced from Unsplash.com or other royalty-free image providers
* Use Unsplash URLs in the format: `https://images.unsplash.com/photo-{ID}?w=800&q=80`
* Images are displayed at 800px width with 80% quality for optimal performance
* Each gallery item should include both an `alt` attribute and a visible caption with identical text

### **5.2.4 Caption Format and Unique Identifiers**

Each image caption must follow this format:
* Descriptive text explaining what the image shows
* Followed by a space and tilde (~)
* Followed by a unique 4-digit number between 1000-9999

Example: `"Sheikh Zayed Grand Mosque exterior view showcasing its magnificent white marble architecture and domes ~3847"`

**Purpose of unique identifiers:**
* Enables programmatic identification of specific images for future edits
* Facilitates bulk updates or replacements without manual searching
* Supports content management workflows and automation scripts
* The number can be randomly generated or derived from a hash of the image URL

### **5.2.5 Lightbox Features**

The lightbox provides:
* Full-screen image viewing with dark overlay background
* Previous/Next navigation buttons for browsing through gallery
* Close button in top-right corner
* Keyboard shortcuts:
  * `Escape` - Close lightbox
  * `Arrow Left` - Previous image
  * `Arrow Right` - Next image
* Click outside image to close
* Automatic body scroll-lock when lightbox is active

### **5.2.6 Responsive Behavior**

* Desktop: 3-column grid layout (auto-fit with 280px minimum)
* Tablet: 2-column grid layout
* Mobile: Single-column layout with reduced image height
* Gallery items use hover effects on desktop with transform and shadow transitions
* Touch-friendly click targets for mobile devices
* Lightbox navigation buttons adjust size and position for mobile screens

### **5.2.7 Accessibility**

* Gallery items are keyboard navigable with `tabindex="0"`
* Gallery items have `role="button"` for screen reader compatibility
* Lightbox controls include `aria-label` attributes
* Images include descriptive alt text
* Keyboard navigation fully supported in lightbox view

### **5.2.8 Reusability**

The gallery component is fully reusable across different pages and decks:
* CSS classes are globally available in deck stylesheets
* JavaScript function is globally available in deck scripts
* Multiple galleries can exist on the same page with unique IDs
* No hardcoded dependencies on specific content or structure
* Can be initialized with a single function call: `initPhotoGallery('gallery-id')`

## **5.3 Service Worker Strategy**

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

### **6.1.1 Home Page Generation**

The build script generates the root index.html with the following process:

1. **Discover Decks**: Find all directories under `decks/`
2. **Read Metadata**: Extract title, sort_order, description, and group from each deck's `deck.json`
3. **Group Decks**: Categorize decks into Current, Future, and Past groups
4. **Sort Within Groups**: Sort decks alphabetically by sort_order within each group
5. **Render HTML**: Generate grouped deck listings with section headers

The home page displays decks in three sections:
* **Current**: Active decks displayed first
* **Future**: Planned decks displayed second
* **Past**: Archived decks displayed last

Each section only appears if it contains at least one deck. Within each section, decks are sorted by their sort_order field and displayed as clickable cards with title and description.

## **6.2 GitHub Actions Workflow**

The CI/CD pipeline supports main deployments, PR previews, and cleanup workflows.

**Build Job (main + PRs):**

* Checkout repository  
* Cache/install build tools  
* Execute build script with version metadata injection  
* Upload dist/ as Pages artifact

**Deploy Job (main branch only):**

* Deploy artifact to GitHub Pages root  
* Preserve recent PR preview directories  
* Regenerate index-versions.html

**Deploy PR Preview Job (PR events):**

* Deploy artifact to pr-{number}/ on gh-pages  
* Preserve existing main and PR preview content  
* Update index-versions.html  
* Emit preview URL in Actions summary

**Cleanup Job (PR closed):**

* Remove pr-{number}/ directory from gh-pages  
* Regenerate index-versions.html

## **6.3 Multi-Version GitHub Pages Layout**

The gh-pages branch stores multiple versions of the site:

* Root directory contains the production site (main).  
* PR previews live in pr-{number}/ subdirectories.  
* index-versions.html lists all available versions and links to each.  
* A version footer is injected into every HTML page with version name, branch, and a link to the version index.  
* Retention keeps the most recent six PR previews during main deployments.

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
