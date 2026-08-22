---
id: portability
title: Taking this elsewhere
order: 80
slide: true
slide_title: Fork the process, not the travel content
audience: forker
---
If what you want from this repository is the way it works rather than what it
publishes, the line between those two is fairly clean.

@figure fork-boundary

The paths marked protected are the ones a sweep is not allowed to casually
rewrite. That makes them a useful inventory of the shared machinery: whatever
the repository defends from its own automation is roughly what a fork needs to
take.

Four workflows schedule, validate, and publish. These shapes are read from the
workflow files themselves, so what you see is what you would actually be
copying:

@fact workflows.* as cards

Alongside them sit the focused skills — small, single-purpose procedures the
agents reach for by name. Their descriptions come from the skills themselves:

@fact skills.* as cards

What you should leave behind is everything about travel. The decks, the demos,
and the initiative histories already here are this repository's own subject
matter; they are worth copying only if that subject matter is also yours.
[The vision document explains which mechanism is essential and
why](source:INITIATIVES_VISION.md); [the technical document explains how it is
wired](source:INITIATIVES_TECHDOC.md).

---
## Fork the process, not the travel content

The line between the way this repository works and what it publishes is fairly
clean. Whatever the repository defends from its own automation is roughly what a
fork needs to take.

@figure fork-boundary

---
## What a fork actually copies

Four workflows schedule, validate, and publish; a handful of focused skills
carry the procedures the agents reach for by name. Both shapes are read from
the files themselves, so this is what you would really be taking.

@fact workflows.* as cards
