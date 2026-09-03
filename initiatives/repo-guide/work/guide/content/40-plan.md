---
id: plan
title: Planning, and critiquing the plan
order: 40
slide: true
slide_title: Plan, critique, then build
audience: both
---
Before anything is built, an agent writes two more documents and then argues
with them.

**The plan** breaks the work into phases, each small enough to review as one
pull request, with what each phase leaves behind. **The test plan** says how
you'd know each phase worked. Both merge together, and the initiative moves to
its fourth stage.

@figure plan-critique

**The critique** is a todo item, not a mood. The first item at this stage is to
critique the plan and the test plan against the objectives and the
specification, and to fix what the critique finds. The result is a pull
request that revises the plan, and the log records what changed. In this
repository the critique has split phases that were too large, added
checkpoints that a phase had skipped, and tightened test gates before any code
existed.

Only after the critique merges does the first increment of building start. The
next todo items are then transcribed from the plan's phases rather than
invented.
[The lifecycle table names the critique step](source:AGENTS.md); [the vision
document explains why it's a todo item](source:INITIATIVES_VISION.md).

---
## Plan, critique, then build

The plan cuts the work into reviewable phases. The test plan says how you'd
know each phase worked. The first item after they merge is a critique of both
against the objectives and specification, delivered as a revising pull request.
Building starts only after the critique merges.

@figure plan-critique
