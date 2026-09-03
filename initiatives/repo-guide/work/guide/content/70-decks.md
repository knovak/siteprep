---
id: decks
title: Decks
order: 70
slide: true
slide_title: Decks are static content with house rules
audience: both
---
A deck is a folder of static web content: an index page, optional sections,
and its own stylesheet and script seeded from a template. Decks are the
oldest part of the repository, and in this one they hold travel planning:
places, dates, attractions, events, and maps. A small JSON file per deck sets
its title, its description, and which group it appears under on the home page.

Changing a deck is ordinary web work with a few house rules that the shared
components assume:

- Keep topic content inside the page's content card.
- Use the shared libraries for maps, photo galleries, collapsible topics, and
  footers instead of writing new ones.
- Preserve every URL you were given, exactly as given.
- Give every attraction and event a three-digit number, so you can say
  "promote 361" or "reject 475" in a later edit and the agent knows which item
  you mean.
- For a new place, include the population, altitude, climate, a short history,
  a few attractions, and a map with every location on the page.

After the last source change, run `{{agent.commands.build}}` and screenshot
anything that looks different. The build validates its own output and fails
on a broken page, so a passing build is the check.
[The content rules are in the instruction file](source:AGENTS.md); [the build
commands are in the build document](source:BUILD_TECHDOC.md); [item numbering
is in its own technical document](source:DECK_ITEMS_TECHDOC.md).

---
## Decks are static content with house rules

A deck is a folder of static pages with its own assets. Topic content stays in
the content card; maps, galleries, and footers come from the shared libraries;
every URL is preserved; every attraction and event carries a number you can
quote back. Build with `{{agent.commands.build}}` and screenshot what changed.
