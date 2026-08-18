---
id: demos
title: Demos, briefly
order: 70
slide: false
audience: both
---
A demo is a standalone example under the demo collection. It owns its pages,
assets, and optional prompt history, and the build generates the table of
contents from immediate demo directories. Demo language stays distinct from
deck and section language because the two outputs have different publishing
shapes.

The build copies each demo without rewriting its source and creates one table-of-contents
entry with its concise description. Visual verification uses
`{{agent.commands.screenshot}}` after the final build. [The concise publishing
contract is in the demos technical document](source:DEMOS_TECHDOC.md), with
[shared working rules in the repository instructions](source:AGENTS.md).
