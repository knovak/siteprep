---
id: build
title: Building, graduating, and resting
order: 50
slide: true
slide_title: The whole lifecycle
audience: both
---
Building happens one increment at a time. Each todo item becomes a branch and a
pull request, written only inside the initiative's own folder and its declared
outputs. You merge it. The merge is what completes the item: the completing
command removes it from the list, makes any item that was waiting on it
actionable, and writes a dated line in the log.

@figure lifecycle-flow

The full lifecycle has eight stages. The first six are working stages, in the
order the record grows. The last two are resting states.

**Graduation** moves the output out of the initiative's work folder into its
published home, and moves the initiative to the refining stage. Entering
refining seeds two todo items automatically. One asks for a user-facing README
that says how to use the output and how to deploy it, because everything
written so far was addressed to whoever was building it. The other asks for a
standing pull request of optional improvements, so that the finished-looking
thing keeps getting suggestions.

**Dormant** means nothing is actionable, by your choice. An agent may never
declare an initiative dormant. If it runs out of work it says so and leaves
the last item open, because running out of work and being finished are
different things, and only you can say which one applies.

**Archived** is the one terminal stage. Everything stays readable.

Movement runs both ways. If an assumption breaks, the stage is set back
deliberately, the documents are amended rather than rewritten, and the todo
list carries the work from then on. An initiative may not sit at a working
stage with nothing to do: the validator warns, and the completing command
refuses to remove the last item unless you also declare the initiative
dormant.
[The stage table and the rules for editing an initiative are in the instruction
file](source:AGENTS.md); [the completion mechanics are in the technical
document](source:INITIATIVES_TECHDOC.md).

---
## The whole lifecycle

Six working stages in the order the record grows, then two resting states.
Each increment is one pull request; the merge completes the item, unblocks what
waited on it, and writes the log. Movement runs both ways when an assumption
breaks.

@figure lifecycle-flow

---
## Graduating, refining, resting

Graduation moves the output to its published home and seeds two items: a
user-facing README, and a standing pull request of optional improvements.
Dormant is your call and never an agent's. Archived is the only terminal
stage. A working stage with an empty todo list is refused.
