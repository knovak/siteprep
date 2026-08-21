---
id: sweep
title: How work gets picked up
order: 40
slide: true
slide_title: The sweep finishes work already under review first
audience: both
---
Nobody assigns work here. A scheduled run called the sweep goes over everything
live, in a fixed order, and stops when its budget runs out.

@figure sweep-run

The order is the interesting part. Finishing beats starting: the run answers
review comments that are already waiting before it considers opening anything
new, so a run that spends its whole budget on feedback and starts nothing is
working exactly as intended. Each phase does one thing.

@fact sweep.phase_summaries as cards

The budget is shared across all of it, and it is a boundary rather than a
target.

@fact sweep.budget as table

Bounding it this way keeps the mechanism reviewable by one person on a normal
afternoon. A run also counts any branch already open before it selects new
work, and it takes the ranking the repository computes rather than rewriting
it: an agent free to re-rank its own queue would eventually favour the
interesting work over the finishing work.

A short list of things a run may never do, whatever it finds:

@fact sweep.rules as list

The first of those is the most important one. [Read the exact prompt used by
both manual and scheduled runs](source:initiatives/sweep-prompt.md).

---
## The sweep finishes work already under review first

Nobody assigns work. A scheduled run goes over everything live in a fixed
order, and finishing beats starting — a run that spends its whole budget
answering review comments and opens nothing new is a complete run.

@figure sweep-run

---
## A shared budget keeps it reviewable

The budget is a boundary, not a target. A run counts branches already open
before selecting anything new, and takes the ranking the repository computes
rather than rewriting it — an agent free to re-rank its own queue would drift
towards the interesting work and away from the finishing work.

@fact sweep.budget as table
