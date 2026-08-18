---
id: decks
title: Decks, briefly
order: 60
slide: true
slide_title: Deck changes follow the publishing contract
audience: both
---
A deck is published site content: a top-level collection with pages or sections
under it. Changes keep ordinary topic content inside the page's content card,
use the shared libraries for maps, galleries, collapsible topics, and footers,
and preserve every supplied URL. New travel content includes the requested
place facts, visitor-oriented locations, and a map.

After the final source change, the repository build command is
`{{agent.commands.build}}`. A visible page change is then captured with the
repository's screenshot command. [The working conventions define the content
requirements](source:AGENTS.md); [the build document gives the reproducible
commands](source:BUILD_TECHDOC.md).

---
## Deck changes follow the publishing contract

Keep each topic inside the page's content card, use shared components for maps,
galleries, collapsible topics, and footers, and preserve every supplied URL.
After the final source change, run `{{agent.commands.build}}`; when the page is
visible, capture it with the repository screenshot command.
