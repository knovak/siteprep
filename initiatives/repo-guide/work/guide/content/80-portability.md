---
id: portability
title: Taking this elsewhere
order: 80
slide: true
slide_title: Fork the process without the content
audience: forker
---
If what you want from this repository is the way it works rather than what it
publishes, it is simple to do.

@figure fork-boundary

The paths marked protected are the ones a sweep isn't allowed to casually
rewrite, which makes them a useful inventory of the shared machinery. Whatever
the repository defends from its own automation is roughly what a fork needs to
take.

Four workflows schedule, validate, and publish:

@fact workflows.* as cards

Alongside them sit the focused skills — small, single-purpose procedures the
agents reach for by name:

@fact skills.* as cards

The decks, demos, and initiative histories already here belong to this
repository and need to be copied only when they also belong in the fork.
[The vision document explains which mechanism is essential and
why](source:INITIATIVES_VISION.md); [the technical document explains how it is
wired](source:INITIATIVES_TECHDOC.md).

---
## Fork the process without the content

If what you want from this repository is the way it works rather than what it
publishes, it is simple to do. Whatever the repository defends from its own
automation is roughly what a fork needs to take.

@figure fork-boundary

---
## What a fork actually copies

Four workflows schedule, validate, and publish, and a handful of focused skills
carry the procedures the agents reach for by name.

@fact workflows.* as cards
