---
id: lifecycle
title: The initiative lifecycle
order: 20
slide: true
slide_title: An initiative keeps intent alive
audience: both
---
An initiative is a durable unit of intent. No expiry date, no owner it has to be
handed off to, no obligation to finish. What it accumulates instead is
reasoning.

@figure lifecycle-flow

Those names are read out of the executable lifecycle rather than copied here, so
the rail above can't drift away from the code that enforces it. Movement runs
both ways: an initiative that hits a bad assumption moves back, and one nobody
needs right now goes quiet without anyone declaring it dead.

Each move records one more piece of the thinking. First the person's own words,
untouched. Then a statement of what done would mean. Then a chosen shape, with
the alternatives that lost written down next to it. Then an order for the work
and the tests that would show it works.

@fact lifecycle.stage_documents as stack

Notice what's missing from the early rows. A document shows up when the work
reaches it and not before, so a gap tells you something: it says what hasn't
been decided yet. An empty file with the right name would destroy that signal,
which is why the tooling refuses to create one.
[The lifecycle rules and vocabulary are authoritative in the working
instructions](source:AGENTS.md), and [the technical document explains what
validates and renders them](source:INITIATIVES_TECHDOC.md).

---
## An initiative keeps intent alive

Not a project with a deadline. It's a durable unit of intent, and it can
advance, move back when an assumption breaks, or rest until the next version is
worth making. Nothing gets deleted on the way through.

@figure lifecycle-flow

---
## A missing document tells you something

Each move records one more piece of the thinking: purpose, then outcomes, then a
chosen shape with the alternatives that lost, then an order for making and
testing it. A gap says what hasn't been decided yet, so the tooling won't
scaffold an empty file that would hide it.

@fact lifecycle.stage_documents as stack
