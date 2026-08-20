# SiteFooter - shared page footer

Renders the footer link row every published page carries:

```text
Version: main | Deck | Section | Google Drive | GitHub | View all versions
```

`Deck` and `Section` appear only on pages that sit inside one.

## Why this exists

The row used to be built by `scripts/build.sh`, which assembled the rendering
script one escaped line at a time:

```bash
footer_html="${footer_html}          a.textContent = link.text;\n"
```

Every page got its own copy of that script inlined, so adding a link meant
editing string concatenation in bash and rebuilding to see what it produced.
This is the same move that `shared/nav_bar/` made for the header: the link list
lives in one readable JavaScript file, and the build passes in only what it
alone knows.

## Not opt-in

Every other library in `shared/` is opt-in - a deck that wants different
behavior simply does not call it. The footer is the exception: `build.sh`
injects it into every page it publishes, because the version link and the
version browser are properties of the *deployment*, not of a deck. Copied demo
files under `demos/` are left byte-for-byte unchanged and so have no footer;
the generated `demos/index.html` has one.

A page has exactly one footer, so a deck does not add a second bar of its own.
Nineteen once did, for back-links ("All decks | Rockies") that this row already
carries: `Version:` goes to the site index and `Deck` to the deck index. Page
navigation belongs in the header nav bar - see `shared/nav_bar/`.

## Files

| File | Purpose |
|---|---|
| `site_footer.js` | Defines `window.SiteFooter` and renders on load |

No stylesheet. `.site-footer`, `.footer-nav`, and `.footer-separator` are
already styled by each deck's `assets/styles.css` and by
`shared/site_base/site_base.css`, and decks own their look.

## How the build uses it

`inject_version_footer()` writes the element and lets the library fill it:

```html
  <footer class="site-footer" data-version="main" data-root="../../../"
          data-deck="../../index.html" data-section="overview.html">
    <script src="../../../shared/site_footer/site_footer.js"></script>
  </footer>
```

The script tag sits **inside** the footer, which gives the library its mount
point (`document.currentScript.parentElement`) and keeps the tag off the end of
`<body>`, where it could land inside a page's still-open inline script - the
failure `BUILD-14` in `scripts/build_tests.sh` exists to catch.

It is a classic (non-`defer`) script, so it runs during parsing, before the
deferred deck and site scripts. `SiteNav` reads this row for the deployment root
and the Documents link, so the footer has to exist by the time the nav renders.

## API

### `SiteFooter.render(options)`

Fills a footer element with the link row and returns the `.footer-nav`, or
`null` when there is no mount point. Rendering twice into the same footer is a
no-op - `SiteNav` reads these links, and two rows would give it two answers.

| Option | Default | Meaning |
|---|---|---|
| `root` | `''` | Relative path from this page to the deployment root, for the `Version:` and `View all versions` links |
| `version` | `'unknown'` | Shown as `Version: <name>` |
| `deckHref` | none | Link to the deck index; omitted when empty |
| `sectionHref` | none | Link to the section overview; omitted when empty |
| `driveHref` | the SitePrep Drive folder | Override the Google Drive target |
| `githubHref` | `https://github.com/knovak/siteprep` | Override the GitHub target |
| `mount` | the element containing this script | Footer element, or a selector for one |

### `SiteFooter.autoInit()`

Reads `data-version`, `data-root`, `data-deck`, and `data-section` off the
footer containing this script and renders from them. Called once on load, so a
page that uses the build's markup needs no script of its own.
