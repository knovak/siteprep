# **Test Specification**

Interactive Web Deck System \- Automated Test Suite

# **1\. Overview**

This specification defines 100+ automated tests covering build processes, navigation, UI, responsiveness, PWA functionality, accessibility, performance, and CI/CD integration. Recommended tools: Playwright for E2E, axe-core for accessibility, Lighthouse for performance.

# **2\. Build Process Tests (BUILD)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| BUILD-01 | BUILD | Build completes | Build script executes without errors | Run scripts/build.sh | Exit code 0 |
| BUILD-02 | BUILD | Output dir created | dist/ folder is created | Check directory after build | dist/ exists |
| BUILD-03 | BUILD | Deck HTML generated | Each deck has index.html | Check dist/deck/index.html | File exists per deck |
| BUILD-04 | BUILD | Root index generated | Root index lists all decks | Check dist/index.html | Contains deck links |
| BUILD-05 | BUILD | Assets copied | Deck assets in output | Check dist/deck/assets/ | CSS, JS, images present |
| BUILD-06 | BUILD | PWA files copied | Manifest and SW in dist | Check manifest, sw.js | Both files present |
| BUILD-07 | BUILD | Icons copied | PWA icons in output | Check dist/pwa/ | 192 and 512px icons |
| BUILD-08 | BUILD | SW injected | Service worker registration | Grep for serviceWorker | Code present in HTML |
| BUILD-09 | BUILD | Valid HTML | Generated HTML is well-formed | HTML validator | No errors |
| BUILD-10 | BUILD | Multi-deck build | All decks compile | Build 3+ test decks | All in dist/ |
| BUILD-11 | BUILD | Shared resources | Shared CSS/JS included | Check for shared imports | Imports resolved |
| BUILD-12 | BUILD | Clean build | Build works on empty dist | Delete dist/, rebuild | Success |

# **3\. Navigation Tests (NAV)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| NAV-01 | NAV | Root to deck | Navigate from root to deck | Click deck link on root | Deck TOC loads |
| NAV-02 | NAV | TOC to card | TOC links work | Click card in TOC | Card displays |
| NAV-03 | NAV | Card to TOC | Return to TOC works | Click TOC link on card | TOC displays |
| NAV-04 | NAV | Card to card | Related card links work | Click related link | Target card loads |
| NAV-05 | NAV | No broken links | All internal links valid | Crawl all links | No 404 errors |
| NAV-06 | NAV | External new tab | External links target blank | Click external link | Opens new tab |
| NAV-07 | NAV | Deep links | Direct URL to card works | Navigate to card URL | Card displays |
| NAV-08 | NAV | Back button | Browser back works | Navigate, press back | Previous displays |
| NAV-09 | NAV | Forward button | Browser forward works | Go back, press forward | Next displays |
| NAV-10 | NAV | Category grouping | Cards in correct categories | Verify TOC categories | Correct grouping |
| NAV-11 | NAV | Nav consistency | Nav on all cards | Check each card | All have nav links |
| NAV-12 | NAV | Keyboard nav | Tab navigation works | Tab through, Enter | Links activate |

# **4\. User Interface Tests (UI)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| UI-01 | UI | Card centered | Cards horizontally centered | Check card position | Centered on page |
| UI-02 | UI | Headers visible | Section headers dark blue | Inspect header color | Color is \#1e3a8a or similar |
| UI-03 | UI | Text readable | Body text visible | Check text color/contrast | Dark text, readable |
| UI-04 | UI | Sidebar hidden | Generator sidebar not shown | Check for \#ui-bar | display: none applied |
| UI-05 | UI | Highlight boxes | Info boxes styled correctly | Check .highlight styling | Distinct background |
| UI-06 | UI | TOC grid layout | TOC items in grid | Check .toc-grid | Grid layout applied |
| UI-07 | UI | Nav buttons styled | Navigation links prominent | Check .nav-link | Button-like appearance |
| UI-08 | UI | Images display | Card images render | Check img elements | Images visible |
| UI-09 | UI | Font consistency | Consistent typography | Check font-family | Georgia or Arial |
| UI-10 | UI | Spacing minimal | Not excessive whitespace | Measure line-height, margins | Compact layout |
| UI-11 | UI | Section dividers | Visual separation | Check section headers | Border or spacing |
| UI-12 | UI | Link styling | Links distinguishable | Check link appearance | Underlined or colored |

# **5\. Responsive Design Tests (RESP)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| RESP-01 | RESP | Mobile portrait | Displays on 375x667 | Set viewport, check layout | Content fits, no overflow |
| RESP-02 | RESP | Mobile landscape | Displays on 667x375 | Set viewport, check layout | Content usable |
| RESP-03 | RESP | Tablet portrait | Displays on 768x1024 | Set viewport | Grid adjusts |
| RESP-04 | RESP | Desktop | Displays on 1920x1080 | Set viewport | Max-width respected |
| RESP-05 | RESP | Touch targets | Buttons 44px minimum | Measure nav buttons | Min 44x44px |
| RESP-06 | RESP | No horizontal scroll | No overflow on mobile | Check for h-scroll | None on 375px width |
| RESP-07 | RESP | Text not truncated | Content visible | Check for overflow:hidden | All text readable |
| RESP-08 | RESP | Images scale | Images fit container | Check img max-width | max-width: 100% |
| RESP-09 | RESP | Grid responsive | TOC grid adapts | Check grid columns | 1 col mobile, 2+ desktop |
| RESP-10 | RESP | Nav stacks | Nav buttons stack on mobile | Check flex-direction | Column on mobile |
| RESP-11 | RESP | Font scales | Readable on all sizes | Check font-size | Min 16px base |
| RESP-12 | RESP | Viewport meta | Viewport tag present | Check meta tag | width=device-width |

# **6\. PWA Functionality Tests (PWA)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| PWA-01 | PWA | Manifest exists | manifest.webmanifest present | Check file exists | File in dist/ |
| PWA-02 | PWA | Manifest valid | JSON parses correctly | Parse manifest | Valid JSON |
| PWA-03 | PWA | SW registered | Service worker registers | Check navigator.serviceWorker | Registration succeeds |
| PWA-04 | PWA | SW activates | Service worker activates | Check SW state | State is 'activated' |
| PWA-05 | PWA | Cache created | Cache storage populated | Check caches.keys() | Cache exists |
| PWA-06 | PWA | Offline access | Site works offline | Go offline, refresh | Content loads from cache |
| PWA-07 | PWA | Icons exist | App icons present | Check pwa/ folder | 192 and 512 icons |
| PWA-08 | PWA | Installable | PWA install prompt | Check beforeinstallprompt | Event fires |
| PWA-09 | PWA | Start URL works | start\_url loads correctly | Navigate to start\_url | Page loads |
| PWA-10 | PWA | Cache versioning | CACHE\_VERSION defined | Check sw.js | Version string present |
| PWA-11 | PWA | Cache update | New version invalidates old | Bump version, reload | New cache created |
| PWA-12 | PWA | HTTPS check | Site served over HTTPS | Check protocol | HTTPS in production |

# **7\. Interactive Element Tests (INT)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| INT-01 | INT | Location toggle | Collapsible opens/closes | Click location header | Content toggles |
| INT-02 | INT | Toggle icon | Icon changes on toggle | Check \+/- indicator | Icon updates |
| INT-03 | INT | Default collapsed | Location starts collapsed | Load card, check state | Content hidden |
| INT-04 | INT | Maps link works | Google Maps opens | Click maps link | Maps opens new tab |
| INT-05 | INT | Wiki link works | Wikipedia opens | Click Wikipedia link | Wiki opens new tab |
| INT-06 | INT | Hover feedback | Links show hover state | Hover over link | Visual change |
| INT-07 | INT | Focus visible | Focus ring on elements | Tab to element | Focus indicator shown |
| INT-08 | INT | Multiple toggles | Multiple locations work | Toggle several sections | Each works independently |
| INT-09 | INT | Smooth animation | Toggle animates | Check transition | CSS transition applied |
| INT-10 | INT | No JS errors | Console clean | Check console | No JS errors |
| INT-11 | INT | Touch works | Touch events fire | Tap on mobile | Events handled |
| INT-12 | INT | Scroll to view | Expanded content visible | Open collapsed section | Content in viewport |

# **8\. Accessibility Tests (A11Y)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| A11Y-01 | A11Y | axe-core pass | No critical violations | Run axe-core scan | 0 critical/serious |
| A11Y-02 | A11Y | Color contrast | WCAG AA compliant | Check contrast ratios | 4.5:1 minimum |
| A11Y-03 | A11Y | Alt text | Images have alt attrs | Check img elements | All have alt |
| A11Y-04 | A11Y | Heading hierarchy | Proper h1-h6 order | Check heading levels | No skipped levels |
| A11Y-05 | A11Y | Link purpose | Links have clear text | Check link text | No 'click here' |
| A11Y-06 | A11Y | Landmark regions | Page has landmarks | Check for main, nav | Landmarks present |
| A11Y-07 | A11Y | Focus order | Logical tab order | Tab through page | Logical sequence |
| A11Y-08 | A11Y | Skip link | Skip to content option | Check for skip link | Optional but helpful |
| A11Y-09 | A11Y | ARIA labels | Interactive elements labeled | Check buttons/toggles | aria-label present |
| A11Y-10 | A11Y | Screen reader | Content accessible | Test with VoiceOver | Content announced |
| A11Y-11 | A11Y | Language attr | html lang attribute | Check html tag | lang='en' or appropriate |
| A11Y-12 | A11Y | Form labels | Inputs have labels | Check any forms | Labels associated |

# **9\. Performance Tests (PERF)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| PERF-01 | PERF | Lighthouse score | Performance score \>80 | Run Lighthouse | Score \>= 80 |
| PERF-02 | PERF | FCP under 2s | First Contentful Paint | Measure FCP | \< 2000ms |
| PERF-03 | PERF | LCP under 2.5s | Largest Contentful Paint | Measure LCP | \< 2500ms |
| PERF-04 | PERF | CLS low | Cumulative Layout Shift | Measure CLS | \< 0.1 |
| PERF-05 | PERF | TBT low | Total Blocking Time | Measure TBT | \< 300ms |
| PERF-06 | PERF | Page weight | Total resources \< 1MB | Check network tab | \< 1MB total |
| PERF-07 | PERF | Image optimization | Images appropriately sized | Check image sizes | No oversized images |
| PERF-08 | PERF | CSS size | CSS bundle reasonable | Check CSS size | \< 100KB |
| PERF-09 | PERF | JS size | JavaScript bundle size | Check JS size | \< 200KB |
| PERF-10 | PERF | Request count | Minimal HTTP requests | Count requests | \< 20 requests |
| PERF-11 | PERF | 3G load time | Loads on slow network | Throttle to 3G | \< 5 seconds |
| PERF-12 | PERF | Nav speed | Card changes instant | Measure nav time | \< 100ms |

# **10\. CI/CD Pipeline Tests (CICD)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CICD-01 | CICD | Workflow triggers | Actions run on push | Push to main | Workflow starts |
| CICD-02 | CICD | PR triggers | Actions run on PR | Create PR | Workflow starts |
| CICD-03 | CICD | Build job success | Build job completes | Check Actions log | Green checkmark |
| CICD-04 | CICD | Deploy on main | Deploy runs on main only | Push to main vs branch | Deploy on main only |
| CICD-05 | CICD | Artifact upload | Build artifact created | Check artifacts | dist/ uploaded |
| CICD-06 | CICD | Pages deploy | Site published to Pages | Check Pages URL | Site accessible |
| CICD-07 | CICD | Cache works | Tweego cached | Check cache hit | Cache restored |
| CICD-08 | CICD | Script perms | Scripts executable | Check chmod | No permission errors |
| CICD-09 | CICD | Error reporting | Failures show errors | Introduce error, push | Error message shown |
| CICD-10 | CICD | Parallel decks | Multiple decks build | Add multiple decks | All build correctly |
| CICD-11 | CICD | Staging deploy | Non-main to staging | Push to branch | Staging URL works |
| CICD-12 | CICD | Time limit | Build within limits | Measure duration | \< 10 minutes |

# **11\. Content Structure Tests (CONT)**

| ID | Category | Test Name | Description | Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CONT-01 | CONT | TOC exists | Deck has Table of Contents | Check start passage | TOC is entry point |
| CONT-02 | CONT | Card headers | All cards have headers | Check h1/h2 presence | Headers on all cards |
| CONT-03 | CONT | Multilingual headers | Headers in 2 languages | Check for translations | Both present |
| CONT-04 | CONT | Category sections | TOC has categories | Check for Attractions etc | Categories present |
| CONT-05 | CONT | Card descriptions | TOC items have descriptions | Check item content | Brief desc included |
| CONT-06 | CONT | Location data | Cards have location info | Check for addresses | Address present |
| CONT-07 | CONT | Maps links | Location has maps link | Check collapsible | Google Maps link |
| CONT-08 | CONT | Highlight usage | Important info highlighted | Check for .highlight | Hours/tips boxed |
| CONT-09 | CONT | External resources | Wikipedia links present | Check for wiki links | Links provided |
| CONT-10 | CONT | Image presence | Cards have images | Check for img tags | Images on cards |
| CONT-11 | CONT | Nav completeness | All nav links functional | Click all nav links | All work |
| CONT-12 | CONT | Metadata valid | StoryData JSON valid | Parse StoryData | Valid format |

# **12\. Test Summary**

| Category | Test Count | Automation Priority |
| :---- | :---- | :---- |
| BUILD \- Build Process | 12 | High \- bash scripts with assertions |
| NAV \- Navigation | 12 | High \- Playwright E2E |
| UI \- User Interface | 12 | Medium \- Visual regression \+ CSS checks |
| RESP \- Responsive | 12 | High \- Playwright with viewports |
| PWA \- Progressive Web App | 12 | High \- Lighthouse CI \+ Puppeteer |
| INT \- Interactive | 12 | High \- Playwright interactions |
| A11Y \- Accessibility | 12 | High \- axe-core integration |
| PERF \- Performance | 12 | High \- Lighthouse CI |
| CICD \- Pipeline | 12 | Medium \- GH Actions workflow tests |
| CONT \- Content Structure | 12 | Medium \- DOM structure checks |
| **TOTAL** | **120** |  |

*— End of Test Specification —*