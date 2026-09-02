---
id: supplies
title: Who supplies what
order: 55
slide: true
slide_title: What you supply, and what the agents supply
audience: contributor
---
The process needs three things from you that no agent can produce: what you
want, facts that live outside the repository, and permission for anything that
spends money, grants access, or commits to a policy. Everything downstream of
those is structure, and the agents supply it.

@figure division-of-labor

Agents write the objectives, the specification, the plan, and the tests. They
weigh alternatives and record the ones they rejected. They cut the work into
increments small enough to review, answer review comments, and propose answers
to open questions. What they never do is merge. A pull request is a proposal,
and merging it is your act.

When work is stuck, the todo item says why, using one of a fixed set of
labels. The label decides who may act.

@figure blocker-triage

An item labeled **human** is a judgment call. An agent may propose an answer
to it as a pull request, with the alternatives laid out before the
recommendation and a statement of what would change the answer. The item stays
blocked until you merge or redirect the proposal.

The other four person-class labels can't be proposed. A fact only you can
observe has to come from you. Spending, access, and policy stay with whoever
holds that authority. Guessing at any of them produces a confident answer with
nothing behind it, which is worse than an item that sits there waiting.

The remaining labels clear on their own when something else moves: another
item completes, another initiative advances, a pull request merges, a date
passes, or an outside dependency changes.

Questions that need you are collected twice a day into one GitHub issue, the
digest. Its body is refreshed silently, and it posts a comment only when the
set of questions waiting on a person changes, so a notification always means
you're now the bottleneck.
[The blocker rules are in the instruction file](source:AGENTS.md), and [the
digest workflow is described in the technical document](source:INITIATIVES_TECHDOC.md).

---
## What you supply, and what the agents supply

You supply intent, outside facts, and authority. Agents supply the documents,
the increments, the review replies, and proposed answers. They never merge.

@figure division-of-labor

---
## A blocked item says who can unblock it

A judgment call labeled human may get a proposed answer as a pull request. A
fact, a spend, an access grant, or a policy waits for you. Everything else
clears when something else moves.

@figure blocker-triage
