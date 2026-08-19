---
id: sweep
title: How work gets picked up
order: 40
slide: true
slide_title: The sweep finishes work in flight first
audience: both
---
Nobody assigns work here. A scheduled pass called the sweep goes over everything
live, in a fixed order, and stops when its allowance runs out.

@figure sweep-run

The order is the interesting part. Finishing beats starting: the run answers
review comments that are already waiting before it considers opening anything
new, so a pass that spends its whole allowance on feedback and starts nothing is
working exactly as intended. Each phase does one thing.

@fact sweep.phase_summaries as cards

The allowance is shared across all of it, and it is a boundary rather than a
target.

@fact sweep.budget as table

Bounding it this way is what keeps the mechanism reviewable by one person on a
normal afternoon. A run also claims any branch already open before it selects
new work, and it takes the ranking the repository computes rather than
rewriting it — an agent that could re-rank its own queue would eventually
rank the interesting work above the finishing work.

A short list of things a run may never do, whatever it finds:

@fact sweep.rules as list

The first of those is the load-bearing one. [Read the exact prompt used by both
manual and scheduled runs](source:initiatives/sweep-prompt.md).

---
## The sweep finishes work in flight first

Nobody assigns work. A scheduled pass goes over everything live in a fixed
order, and finishing beats starting — a run that spends its whole allowance
answering review comments and opens nothing new is a complete run.

@figure sweep-run

---
## A shared allowance keeps it reviewable

The budget is a boundary, not a target. A run claims branches already open
before selecting anything new, and takes the ranking the repository computes
rather than rewriting it — an agent free to re-rank its own queue would drift
towards the interesting work and away from the finishing work.

@fact sweep.budget as table
