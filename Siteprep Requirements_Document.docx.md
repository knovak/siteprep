# **Requirements Document**

Interactive Web Deck System

Version 1.0

# **1\. Introduction**

## **1.1 Purpose**

This document defines the requirements for an Interactive Web Deck System that enables users to create, manage, and publish collections of interconnected web pages (referred to as "decks" and "cards") using a static site generator. The system shall support offline viewing, mobile-first design, and integration with GitHub for version control and automated deployment.

## **1.2 Scope**

The system encompasses the following functional areas:

* Content authoring and management  
* Static website generation from source files  
* Version control integration with GitHub  
* Automated build and deployment pipelines  
* Progressive Web App (PWA) functionality for offline access  
* Mobile-responsive user interface

## **1.3 Definitions**

| Term | Definition |
| :---- | :---- |
| **Deck** | A collection of related cards forming a complete interactive website or guide |
| **Section** | A group of cards |
| **Card** | An individual page within a deck containing content and navigation elements |
| **Passage** | The source content unit that compiles into a card |
| **PWA** | Progressive Web App \- a website that can be installed and used offline |
| **CI/CD** | Continuous Integration/Continuous Deployment \- automated build and publish workflows |

# **2\. Functional Requirements**

## **2.1 Content Structure**

### **2.1.1 Deck Organization**

1. The system SHALL support multiple independent decks within a single repository.  
2. Each deck SHALL be contained in its own directory under a designated decks/ folder.  
3. Each deck SHALL have a unique identifier and metadata configuration.  
4. Decks SHALL be independently buildable and deployable.  
5. Each deck SHALL have its own' CSS style  
6. Each deck SHALL be able to have choice of CSS styles that can be changed at viewing time 

### **2.1.2 Card Structure**

7. Each card SHALL support a header section with title in multiple languages.  
8. Cards SHALL support embedded images with responsive sizing.  
9. Cards SHALL support collapsible/expandable sections (e.g., location details).  
10. Cards SHALL support highlight boxes for important information (e.g., hours, fees, tips).  
11. Cards SHALL support external links to resources (e.g., Wikipedia, maps).  
12. Cards SHALL support internal navigation links to other cards within the deck.

### **2.1.3 Table of Contents**

13. Each deck SHALL have a Table of Contents card as the entry point.  
14. The Table of Contents SHALL organize cards into logical categories (e.g., Attractions, Hotels, Transport).  
15. Category sections SHALL display as a grid of clickable items.  
16. Each item SHALL show a title and brief description.

## **2.2 Navigation**

17. Each card SHALL provide navigation back to the Table of Contents.  
18. Cards SHALL provide forward/backward navigation to related cards.  
19. Navigation links SHALL be clearly styled and easily tappable on mobile devices.  
20. The system SHALL support deep linking to specific cards via URL.

## **2.3 Interactive Elements**

21. Collapsible sections SHALL toggle open/closed on user click/tap.  
22. Collapsible sections SHALL display a visual indicator of their state (e.g., \+/- icon).  
23. External map links SHALL open in a new browser tab.  
24. Interactive elements SHALL provide visual feedback on hover/focus states.

## **2.4 Shared Content**

25. The system SHALL support shared passages that can be included in multiple cards.  
26. The system SHALL support shared stylesheets across multiple decks.  
27. The system SHALL support shared JavaScript functions/widgets across decks.  
28. Deck-specific styles SHALL be able to override shared styles.

# **3\. Non-Functional Requirements**

## **3.1 Mobile Responsiveness**

29. The output website SHALL be fully functional on mobile devices (iOS Safari, Chrome).  
30. Cards SHALL be centered and readable on all screen sizes.  
31. Touch targets (buttons, links) SHALL be at least 44x44 pixels.  
32. Text SHALL be readable without zooming (minimum 16px base font).  
33. The layout SHALL adapt gracefully between portrait and landscape orientations.

## **3.2 Offline Capability (PWA)**

34. The system SHALL implement a service worker for offline caching.  
35. After initial online visit, users SHALL be able to access the deck offline.  
36. The system SHALL provide a web app manifest for home screen installation.  
37. App icons SHALL be provided in required sizes (192x192, 512x512).  
38. Cache versioning SHALL allow forced updates when content changes.

## **3.3 Performance**

39. Initial page load SHALL complete within 3 seconds on 3G network.  
40. Navigation between cards SHALL be instantaneous (\<100ms).  
41. Generated HTML files SHALL be optimized for size.  
42. Images SHALL be appropriately sized and optimized.

## **3.4 Accessibility**

43. The output SHALL use semantic HTML elements appropriately.  
44. Color contrast SHALL meet WCAG AA standards.  
45. Interactive elements SHALL be keyboard accessible.  
46. Images SHALL have alt text attributes.

# **4\. GitHub Integration Requirements**

## **4.1 Repository Structure**

47. The repository SHALL follow a standardized directory structure.  
48. Source files SHALL be stored in a decks/ directory with subdirectories per deck.  
49. Shared resources SHALL be stored in a shared/ directory.  
50. Build scripts SHALL be stored in a scripts/ directory.  
51. GitHub workflow files SHALL be stored in .github/workflows/.

## **4.2 Automated Build Pipeline**

52. GitHub Actions SHALL trigger builds on push to main branch.  
53. GitHub Actions SHALL trigger builds on pull request creation/update.  
54. The build process SHALL compile all decks automatically.  
55. Build artifacts SHALL be uploadable for preview on PRs.  
56. Build failures SHALL be reported with actionable error messages.

## **4.3 Deployment**

57. Deployment to GitHub Pages SHALL be automated on merge to main.  
58. Each deck SHALL be accessible at a unique URL path (e.g., /deck-name/).  
59. A root index page SHALL list and link to all available decks.  
60. PWA assets SHALL be deployed alongside deck content.  
61. Non-main branches MAY deploy to staging URLs for preview.

## **4.4 Version Control**

62. Source files SHALL be stored as plain text for easy diffing.  
63. Build outputs SHALL NOT be committed to the main branch.  
64. The system SHALL support collaborative editing via branches and PRs.

# **5\. Styling Requirements**

## **5.1 Visual Design**

65. Cards SHALL have a clean, professional appearance.  
66. Headers SHALL be clearly distinguished with appropriate typography and color.  
67. Section headers (e.g., Attractions, Hotels) SHALL have visual separators.  
68. Highlight boxes SHALL use distinct background colors for visibility.  
69. Navigation buttons SHALL be visually prominent and consistent.

## **5.2 Spacing and Layout**

70. Vertical whitespace SHALL be minimized while maintaining readability.  
71. Card content SHALL be appropriately padded from card edges.  
72. Line height SHALL be optimized for readability (1.4-1.6).  
73. Cards SHALL be centered horizontally on all screen sizes.

## **5.3 UI Elements to Hide/Suppress**

74. The default generator sidebar (save/restart) SHALL be hidden via CSS.  
75. Unnecessary generator UI elements SHALL be suppressed.  
76. The output SHALL appear as a clean, custom web application.

# **6\. Asset Management Requirements**

77. Deck-specific assets SHALL be stored in an assets/ folder within each deck.  
78. Images SHALL be referenced using relative paths.  
79. Assets SHALL be copied to output directory during build.  
80. External image URLs (e.g., Wikimedia Commons) MAY be used but limit offline functionality.  
81. CSS files SHALL be stored in assets/styles.css and additional assets/\*.css per deck.  
82. JavaScript files SHALL be stored in assets/scripts.js per deck.

# **7\. Constraints and Assumptions**

## **7.1 Technical Constraints**

* Output must be static HTML/CSS/JS (no server-side processing)  
* Hosting limited to GitHub Pages (static file hosting)  
* Build process must complete within GitHub Actions time limits  
* The output for any active github branch should be available for display

## **7.2 Assumptions**

* Users have modern browsers (Safari 14+, Chrome 88+)  
* Content authors have basic familiarity with text-based markup  
* GitHub repository access is available for deployment

*— End of Requirements Document —*

*TBD*