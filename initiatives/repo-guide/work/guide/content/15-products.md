---
id: products
title: What an initiative produces
order: 15
slide: true
slide_title: What an initiative leaves behind
audience: both
---
An initiative is a folder under the initiatives directory. Over its life it
accumulates three kinds of thing, and they have different lifetimes.

@figure initiative-products

**The record** is a set of markdown documents. They arrive in a fixed order as
the initiative advances, and once written they're amended rather than replaced.
The full set is listed below; a later section says when each one appears.

@fact documents.record as documents

**Capability** is code the initiative develops for itself: libraries under its
own lib folder, prompts, and scripts. This stays inside the initiative so that
a revisit a year later finds the tooling where it was left. A skill is the
exception. Skills go into the repository's skills folder from the start, because
a skill has to be discoverable to be invoked at all.

**Outputs** are what the initiative publishes. Work in progress lives in the
initiative's work folder, where deck and demo conventions don't apply. When it's
good enough it graduates: it moves to the decks or demos folder, or it's
deployed to a website hosted outside the repository. The initiative keeps a
pointer to each output, never a copy.

One rule holds the boundary. A published output may not load code from under
the initiatives folder at runtime, because that code keeps changing without any
pull request appearing to touch the output. Either the library graduates to the
shared folder, or the output vendors a copy and records where it came from.

An initiative can also produce nothing published at all. A script that audits
every deck, or a skill that refreshes event listings, is a complete initiative.
[What an initiative can produce is set out in the vision document](source:INITIATIVES_VISION.md).

---
## What an initiative leaves behind

A record of documents that only grows. Capability that stays in the initiative
for the next version. Outputs that graduate out: a deck, a demo, a hosted site,
or a skill. An initiative with no published output is still an initiative.

@figure initiative-products
