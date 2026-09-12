# Site base - assets for generated site-level pages

The stylesheet and script used by the pages `scripts/build.sh` generates for the
site as a whole: the root deck index, the demos index, and the version browser.

## Why this exists

Those pages used to load `decks/${SORTED_DECKS[0]}/assets/` - the assets of
whichever deck sorted first by its `deck.json` `sort_order`. That had two
consequences, both surprising:

- Changing one deck's `sort_order`, or adding a deck that sorted ahead of it,
  changed how the site's index pages looked and behaved.
- Decks are explicitly encouraged to diverge from each other, so the site's own
  pages were pinned to a deck that was free to change under them at any time.

They load these assets instead, and depend on no deck.

## Files

| File | Purpose |
|---|---|
| `site_base.css` | Page styling for site-level pages. Seeded from the deck template, and free to diverge from it - decks own their look, and so do these pages. |
| `site_base.js` | Registers the service worker and renders the shared nav bar |

Three classes in `site_base.css` exist for the generated initiative pages, and
are not used by decks:

| Class | Purpose |
|---|---|
| `dl.stands` | The "Where this stands" label/value grid, which collapses to one column on a narrow screen rather than scrolling sideways |
| `ul.currency` | One row per deployment environment, saying where it stands against main |
| `.verdict`, `.verdict-current`, `.verdict-behind`, `.verdict-ahead`, `.verdict-differs` | The currency chip. The verdict is a word first and a colour second, so it still reads printed, or to a reader who cannot separate the hues |

## `site_base.js`

Two jobs:

1. **Service worker registration**, scoped to the deployment root so a branch
   preview registers its own rather than the one on `main`.
2. **The nav bar**, by loading `shared/nav_bar/` and calling `SiteNav.render()`.
   Which button is marked as current comes from the script tag:

```html
<script defer src="../shared/site_base/site_base.js" data-nav-current="demos"></script>
```

Deck pages do **not** use this file. They register the service worker and load
the nav bar from their own `assets/scripts.js`, which keeps a deck in control of
its own page, per the opt-in principle in `shared/README.md`.

## Relationship to the deck template

`site_base.css` began as a copy of the deck starting template, so site-level
pages render exactly as they did before. It is not kept in sync: a change to a
deck's stylesheet does not belong here, and a change here does not belong in a
deck.
