---
id: demos
title: Demos, briefly
order: 70
slide: true
slide_title: A demo stays a standalone example
audience: both
---
A demo is a self-contained example living under the demo collection. It owns its
pages, its assets, and optionally the prompt history that produced it.

The build carries a demo rather than interpreting it: it copies the source
without rewriting anything, and generates one table-of-contents entry per
immediate demo directory out of that demo's own short description. Check it
visually with `{{agent.commands.screenshot}}` once the final build has run.

Demo language stays distinct from deck and section language, on purpose. The two
have different publishing structures, and blurring the words is how a demo ends
up half-converted into a deck page.
[The concise publishing contract is in the demos technical
document](source:DEMOS_TECHDOC.md), with [shared working rules in the repository
instructions](source:AGENTS.md).

---
## A demo stays a standalone example

Self-contained: it owns its pages, its assets, and an optional prompt history.
The build copies it without rewriting the source, and generates one contents
entry per immediate directory. Demo language stays distinct from deck language,
because blurring the words is how a demo ends up half-converted into a deck
page.
