---
id: lifecycle
title: The initiative lifecycle
order: 20
slide: true
slide_title: An initiative keeps intent alive
audience: both
---
An initiative is a durable unit of intent. It has no expiry date, no owner it
must be handed to, and no obligation to finish. What it has is a record that
grows as the thinking gets more definite.

@figure lifecycle-flow

Those names are read out of the executable lifecycle, not copied here, so the
rail above cannot quietly disagree with the code that enforces it. Movement goes
both ways: an initiative that runs into a bad assumption moves back, and one
nobody needs right now goes quiet without anybody declaring it dead.

What changes at each move is how much reasoning has been recorded. The first
record holds the person's own words, untouched. Then comes a statement of what
done would mean, then a choice of shape with the alternatives that lost written
down beside it, then a sequence for the build and its tests.

@fact lifecycle.stage_documents as stack

Notice what is missing from the early rows. A document shows up when the work
reaches it and not before, so a gap is information: it tells the next
contributor what has not been decided yet. An empty file with the right name
would destroy that signal, which is why the tooling refuses to create one.
[The lifecycle rules and vocabulary are authoritative in the working
instructions](source:AGENTS.md), and [the technical document explains what
validates and renders them](source:INITIATIVES_TECHDOC.md).

---
## An initiative keeps intent alive

Not a project with an expiry date — a durable unit of intent that can advance,
move back when an assumption breaks, or rest until another version is worth
making.

@figure lifecycle-flow

---
## A missing document is information

Each move records one more piece of reasoning: purpose, then outcomes,
then a chosen shape with its rejected alternatives, then a sequence for building
and testing it. A gap tells the next contributor what has not been decided yet,
so the tooling refuses to scaffold an empty file that would hide it.

@fact lifecycle.stage_documents as stack
