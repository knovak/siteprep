---
id: decks
title: Decks, briefly
order: 60
slide: true
slide_title: Deck changes follow the publishing contract
audience: both
---
A deck is published site content — a top-level collection with pages or sections
beneath it. Changing one is ordinary web work with a few house rules that exist
because the shared components assume them.

Keep ordinary topic content inside the page's content card. Reach for the shared
libraries rather than rolling your own maps, galleries, collapsible topics, or
footers. Preserve every URL you were given, exactly as given. New travel content
carries the place facts that were asked for, locations written for a visitor
rather than a resident, and a map.

Then build. After the last source change, run `{{agent.commands.build}}`, and
capture anything visibly different with the repository's screenshot command —
the build is what turns source into the published site, so an unbuilt change is
not really a change.
[The working conventions define the content requirements](source:AGENTS.md); [the
build document gives the reproducible commands](source:BUILD_TECHDOC.md).

---
## Deck changes follow the publishing contract

Ordinary web work with house rules the shared components assume: topic content
inside the page's content card, shared libraries for maps, galleries,
collapsible topics and footers, and every supplied URL preserved exactly. Build
with `{{agent.commands.build}}` after the final source change, then screenshot
anything visibly different.
