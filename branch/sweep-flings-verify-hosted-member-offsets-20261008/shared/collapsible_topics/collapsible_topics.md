# CollapsibleTopics Library

`CollapsibleTopics` gives every topic on a page a collapse/expand toggle.
Collapsing a topic hides its body and leaves only the title, so a long page can
be flattened to a scannable list of topic titles; expanding restores the body.

Every deck loads this library automatically (see [Wiring](#wiring)), so deck and
section pages get the behavior with no per-page markup.

- `collapsible_topics.js` - the library (also injects the stylesheet)
- `collapsible_topics.css` - toggle and collapsed-state styles

## What counts as a topic

The library reads ordinary page markup - there is nothing to author. Three
patterns become topics:

| Pattern | Topic title | Topic body |
| --- | --- | --- |
| A heading inside `.card-content` | that heading | everything up to the next topic heading |
| A heading inside `.map-section` | that heading | the map and its legend |
| A heading inside `.card-header` | the card title | the card's own `.card-content` |

The third pattern means a whole card collapses from its title - a deck index
page can fold away its **Table of Contents** card, and a card's inner topics
still have their own toggles inside it.

At init time the library wraps the nodes after each topic heading in a generated
`div.topic-body`, prepends a caret `button.topic-toggle` to the heading, and
wires `aria-expanded` / `aria-controls` / `aria-label`. With JavaScript disabled
nothing runs and the page reads exactly as before.

### Topic boundaries

A topic body runs from its heading to the next topic heading. A sibling element
that *contains* a topic heading also ends the body, so a wrapper such as a
`.highlight` box with its own heading becomes its own topic instead of being
absorbed into the topic above it.

The rule is flat, not nested: with the default `'h2, h3'` selector an `h3` ends
the preceding `h2` topic. That is what makes each map on a page - an `h3`
followed by its map and legend divs - independently collapsible. Pass
`headings: 'h2'` if a page wants its `h3` subheadings to stay inside their
parent topic instead.

### Headings that are not topics

Headings that belong to another widget are left alone: anything inside a link,
button, `summary`, `nav`, or table, and anything inside `.toc-grid`,
`.map-legend`, or `.photo-gallery`. That is what keeps the `h3` inside each
table-of-contents card from sprouting a toggle. Extend or replace the rule with
the `skip` option, or mark one heading with `data-collapsible="off"`.

## Defaults

Topics start expanded. Two ways to change that:

```html
<h2 data-collapsed="true">Ticketing strategy</h2>   <!-- starts collapsed -->
<h2 data-collapsed="false">Attractions</h2>         <!-- starts expanded -->
```

```html
<!-- start every topic on this page collapsed -->
<script>window.collapsibleTopicsOptions = { defaultCollapsed: true };</script>
```

`data-collapsed` on a heading always wins over the page-wide default.

The Warsaw page (`decks/poland/sections/warsaw/overview.html`) is the worked
example: its POLIN ticketing topic and its OpenTopoMap map start collapsed,
everything else starts expanded.

## Wiring

Each deck's `assets/scripts.js` loads the library for every page in that deck,
resolving the path from its own URL so it works at any page depth:

```js
const libraryBase = new URL('../../../shared/collapsible_topics/', thisScript.src);
```

It injects the stylesheet, loads the script, and calls `autoInit()`. **A new
deck inherits this by copying an existing deck's `assets/scripts.js`, which is
how deck assets are already seeded - no per-page tags needed.**

A page outside a deck (a demo, say) opts in with explicit tags instead:

```html
<script src="../../shared/collapsible_topics/collapsible_topics.js"></script>
<script>CollapsibleTopics.autoInit();</script>
```

### Opting out

```html
<body data-collapsible-topics="off">      <!-- no toggles on this page -->
<body data-collapsible-topics="manual">   <!-- page calls init() itself -->
```

## API

### `CollapsibleTopics.init(options)`

| Option | Default | Meaning |
| --- | --- | --- |
| `container` | `'.card-content, .map-section'` | topic container(s); a selector matches every container on the page |
| `headings` | `'h2, h3'` | selector for topic headings |
| `skip` | links/buttons/tables/TOC/legend/gallery | contexts whose headings are not topics; `null` to treat every matched heading as a topic |
| `cardTitles` | `true` | also collapse whole cards from a heading in their `.card-header` |
| `defaultCollapsed` | `false` | page-wide starting state |

Returns one topic object per enhanced heading:
`{ heading, body, button, title, expanded, expand(), collapse(), toggle() }`.

### `CollapsibleTopics.autoInit(options)`

Runs `init()` with page defaults once the DOM is ready, honoring the
`data-collapsible-topics` opt-out and `window.collapsibleTopicsOptions`.

### Events

| Event | When | `detail` |
| --- | --- | --- |
| `collapsible-topics:ready` (on `document`) | after each `init()` | `{ topics }` |
| `collapsible-topics:toggle` (bubbles from the heading) | on every user toggle | `{ expanded, heading, body, title, topic }` |

Setting the initial state does not fire the toggle event.

## Interaction and accessibility

- Clicking the caret **or** the heading text toggles the topic; clicks on links
  or other buttons inside a heading behave normally.
- The caret is a real `<button>`: keyboard focusable, Enter/Space toggle it,
  `aria-expanded` and `aria-label` ("Expand …"/"Collapse …") track the state, and
  `aria-controls` points at the body.
- Collapsed bodies use the `hidden` attribute, so they leave the accessibility
  tree and in-page find.
- `@media print` hides the carets and forces every body visible - a printed page
  is never half-hidden.

## Maps and other widgets that measure themselves

Leaflet cannot measure a map inside a hidden container. Two rules follow:

**Already-rendered widgets** are handled by the library: expanding a topic
dispatches a window `resize` event, which is what Leaflet listens for, so a map
that was collapsed while the window changed size re-fits itself on expand. No
page code is needed for this - it covers `StandardMap` and hand-written Leaflet
alike.

**A map inside a topic that starts collapsed** must not be created up front -
it would come out sized 0. Render it when its container first becomes visible:

```js
function renderVisibleMaps() {
  const container = document.getElementById('map-topo');
  if (!container || container.offsetParent === null || container.dataset.rendered === 'true') return;
  if (StandardMap.render({ locations, topoMapId: 'map-topo', topoLegendId: 'legend-topo' })) {
    container.dataset.rendered = 'true';
  }
}

document.addEventListener('collapsible-topics:ready', renderVisibleMaps, { once: true });
window.addEventListener('load', renderVisibleMaps);   // fallback if the library never loaded
document.addEventListener('collapsible-topics:toggle', (event) => {
  if (event.detail.expanded) renderVisibleMaps();
});
```

The same applies to any widget that reads `clientWidth` at render time, such as
the distance visualizer (`shared/distance_viz/`). Widgets in topics that start
expanded - the normal case - need nothing.

## Tests

`tests/e2e/collapsible-topics.spec.js` covers the shared behavior across pages
from several decks (topic detection, TOC cards left alone, toggling, keyboard
operation, card-title collapsing, maps re-measured after a collapse/expand round
trip) plus the Warsaw page's collapsed-by-default topics.
