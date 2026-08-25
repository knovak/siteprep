---
id: person-required
title: When a person is required
order: 50
slide: true
slide_title: Blocker labels decide who can act
audience: contributor
---
A blocked item has to say why it's stuck, and the label it uses decides who is
allowed to unstick it.

@figure blocker-triage

An agent will act on items labeled "human" by generating alternatives and making
a proposal.

The rest can't be helped that way, for different reasons. A fact the agent can't
observe has to come from somebody who can see it. Spending, access, and policy
stay with whoever actually holds that authority. Guessing at any of them
produces a confident answer with nothing behind it, which is worse than an item
that sits there visibly waiting.

Even a proposed answer stays blocked until its pull request merges, so nothing
becomes true just because an agent suggested it.
[The precise sweep rules are authoritative here](source:initiatives/sweep-prompt.md),
and [the working instructions explain how a recorded answer unblocks later
work](source:AGENTS.md).

---
## Blocker labels decide who can act

An agent will act on items labeled "human" by generating alternatives and making
a proposal. Facts, spending, access, and policy remain blocked until a person
supplies or authorizes them.

@figure blocker-triage
