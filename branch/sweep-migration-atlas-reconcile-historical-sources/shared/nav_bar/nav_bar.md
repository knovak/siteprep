# SiteNav - shared header navigation bar

Renders the header pill row - `🏠 Home`, `⬆️ Top of deck`, `🔺 Documents`,
`🧪 Demos` - by replacing the page's `.card-header .tag` element.

This was previously a `buildHeaderTags()` function copied byte-for-byte into all
fifteen decks' `assets/scripts.js`, with its `.tag-nav` rules copied into all
fifteen `assets/styles.css`. Adding one button meant editing thirty blocks and
hoping they stayed identical.

Like every library in `shared/`, it is **opt-in**. A deck that wants a different
bar does not call it.

## Files

| File | Purpose |
|---|---|
| `nav_bar.js` | Defines `window.SiteNav` |
| `nav_bar.css` | `.tag-nav` layout; the pill look still comes from the page's own `.tag` rule |

## Usage

From a deck's `assets/scripts.js`, resolving paths from the script's own URL so
they work at any page depth and under any deployment prefix:

```js
const libraryBase = new URL('../../../shared/nav_bar/', thisScript.src);
// inject nav_bar.css and nav_bar.js, then:
window.SiteNav.render();
```

The build's generated TOC pages load it directly and mark the current page:

```js
SiteNav.render({ current: 'demos' });
```

## API

### `SiteNav.render(options)`

Replaces `.card-header .tag` with the nav bar. Returns the `<nav>`, or `null`
when the page has no mount point.

| Option | Default | Meaning |
|---|---|---|
| `buttons` | `['home', 'top', 'documents', 'demos']` | Which buttons, in order |
| `current` | none | Button id to mark with `.is-current` and `aria-current="page"` |
| `docsHref` | the footer's Google Drive link | Override the Documents target |
| `mount` | `.card-header .tag` | Selector for the element to replace |

Available button ids: `home`, `top`, `documents`, `demos`, `initiatives`.

`top` renders only when the page is **inside** a collection entry - it points at
`decks/<deck>/index.html` from a deck page, and reads "Top of deck". On a TOC
page it is skipped, because it would duplicate Home.

### `SiteNav.versionRoot()`

The root of the current deployment: the site root on `main`, the branch
directory on a branch preview.

Three sources, best first:

1. **`<meta name="siteprep-version-root">`**, written by `scripts/build.sh`,
   which computes the answer per page and therefore knows it exactly.
2. **The footer's `Version:` link**, for any page built before the meta tag
   existed.
3. **A path guess**, kept only so a page with neither of the above still
   renders something.

The third is a genuine fallback and is only correct for pages under `decks/`.
It used to be the primary mechanism, which meant every nav link on a branch
preview escaped to `main` from any page outside `decks/` - see
`tests/e2e/nav-branch-preview.spec.js`, which exists to keep that fixed.

### `SiteNav.currentCollection()`

`{ collection, name }` for a page inside a collection entry, otherwise `null`.
