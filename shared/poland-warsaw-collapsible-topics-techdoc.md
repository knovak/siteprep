# Poland deck: collapsible topics experiment (Warsaw page)

## Scope
This documents `decks/poland/assets/collapsible_topics.js` and
`decks/poland/assets/collapsible_topics.css`, an experiment that adds a
collapse/expand toggle to every topic - and every map - on
`decks/poland/sections/warsaw/overview.html`.

It is deliberately deck-local rather than a `shared/` library: the Warsaw page is
the trial run. If the behavior holds up across more pages, the natural next step
is to promote these two files to `shared/collapsible_topics/` unchanged (the
module has no Poland-specific logic in it).

## What it does
Collapsing a topic hides its body and leaves only the title, so a long page can
be flattened to a scannable list of topic titles. Expanding restores the body.

The markup stays plain headings plus content - there are no wrapper elements to
author and no `<details>`/`<summary>` restructuring. At init time the module:

1. finds every heading matching the `headings` selector inside the container;
2. moves the nodes following each heading into a generated `div.topic-body`;
3. prepends a caret `button.topic-toggle` to the heading and wires
   `aria-expanded` / `aria-controls` / `aria-label` to the body;
4. applies each topic's initial state.

With JavaScript disabled nothing runs and the page reads exactly as before.

### Topic boundaries
A topic body runs from its heading up to the next heading matched by the same
selector. A sibling element that *contains* a matched heading also ends the body,
so a wrapper such as a `.highlight` box with its own `<h2>` becomes its own topic
instead of being absorbed into the topic above it.

Because the rule is flat rather than nested, an `h3` ends the preceding `h2`
topic when the selector is `'h2, h3'`. That is what makes each map on the Warsaw
page (an `h3` plus its map/legend divs) independently collapsible. If a page
wants `h3` subheadings to stay *inside* their parent topic, pass
`headings: 'h2'` instead.

## Usage

```html
<link rel="stylesheet" href="../../assets/collapsible_topics.css">
<script src="../../assets/collapsible_topics.js"></script>
```

```html
<h2>Attractions</h2>            <!-- expanded by default -->
<ul>...</ul>

<h2 data-collapsed="true">Ticketing strategy</h2>   <!-- collapsed by default -->
<ul>...</ul>
```

```html
<script>
  CollapsibleTopics.init({ container: '.card-content', headings: 'h2, h3' });
</script>
```

### `CollapsibleTopics.init(options)`

| Option | Default | Meaning |
| --- | --- | --- |
| `container` | `'.card-content'` | Element or selector holding the topics |
| `headings` | `'h2, h3'` | Selector for headings that become topics |
| `defaultCollapsed` | `false` | Page-wide starting state |

Per-heading `data-collapsed="true"` / `data-collapsed="false"` overrides
`defaultCollapsed`, which is how the Warsaw page starts POLIN and OpenTopoMap
collapsed while everything else is expanded.

Returns one topic object per heading: `{ heading, body, button, title, expanded,
expand(), collapse(), toggle() }`.

### Interaction and accessibility
- Clicking the caret **or** the heading text toggles the topic; clicks on links
  or other buttons inside a heading are left alone.
- The caret is a real `<button>`, so it is keyboard focusable and Enter/Space
  toggle it; `aria-expanded` and `aria-label` ("Expand …"/"Collapse …") track the
  state, and `aria-controls` points at the body.
- Collapsed bodies use the `hidden` attribute, so they are removed from the
  accessibility tree and from in-page find.
- `@media print` hides the carets and forces every body visible, so a printed
  page is never half-hidden.

### Toggle event
Every user-driven toggle dispatches a bubbling
`CollapsibleTopics.TOGGLE_EVENT` (`'collapsible-topics:toggle'`) from the
heading, with `detail = { expanded, heading, body, title, topic }`. Setting the
initial state at init time does *not* fire it.

## Maps inside collapsible topics
Leaflet cannot measure a map whose container is hidden, so a map that starts
inside a collapsed topic must not be created up front. The Warsaw page therefore:

- renders each map only when its container is actually visible
  (`offsetParent !== null`), marking it with `data-rendered` so it is created
  once;
- listens for the toggle event and, on each expand, renders any map that has just
  become visible and calls `invalidateSize()` on the maps already rendered, so a
  map revealed later still fills its container.

This is why the page calls `StandardMap.render()` twice - once with the `osm*`
ids and once with the `topo*` ids - instead of passing all four ids in a single
call. `StandardMap` supports rendering either layer on its own, so no change to
the shared library was needed.

## Warsaw defaults
| Topic | Initial state |
| --- | --- |
| POLIN Museum and Royal Castle ticketing strategy | collapsed |
| Warsaw map (OpenTopoMap) | collapsed |
| all other topics, including Warsaw map (OpenStreetMap) | expanded |

## Related markup fix
The Warsaw page's `.card-content` div previously closed before the **Trails**
topic, leaving that topic outside the container. The closing tag was moved to the
end of the content so every topic sits inside `.card-content` and is picked up by
`init()`.

## Tests
`tests/e2e/collapsible-topics.spec.js` covers the default states, toggling by
caret and by heading text, `aria-expanded` tracking, and the OpenTopoMap
container getting a real size once expanded.
