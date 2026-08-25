---
id: sweep
title: How work gets picked up
order: 40
slide: true
slide_title: The sweep answers PR comments before new work
audience: both
---
Nobody assigns work here. A scheduled run called the sweep goes over everything
live and stops when its budget runs out.

@figure sweep-run

The run answers PR comments that are waiting before it considers opening
anything new. Then it analyzes and recommends items to propose for new work.
Then it works through remaining items.

@fact sweep.phase_summaries as cards

The workload is managed thorough a "budget" that limits the number of work items
per sweep. The budget is currently {{sweep.budget.items_per_run}} items per run.

@fact sweep.budget as table

A short list of things a run may never do, whatever it finds:

@fact sweep.rules as list

The first one matters most. [Read the exact prompt used by both manual and
scheduled runs](source:initiatives/sweep-prompt.md).

---
## The sweep answers PR comments before new work

The run answers PR comments that are waiting before it considers opening
anything new. Then it analyzes and recommends items to propose for new work.
Then it works through remaining items.

@figure sweep-run

---
## A budget limits each sweep

The workload is managed thorough a "budget" that limits the number of work items
per sweep. The budget is currently {{sweep.budget.items_per_run}} items per run.

@fact sweep.budget as table
