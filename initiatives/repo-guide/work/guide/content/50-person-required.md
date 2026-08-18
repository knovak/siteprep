---
id: person-required
title: When a person is required
order: 50
slide: true
slide_title: Blocker labels decide who can act
audience: contributor
---
A blocked item states why it cannot move. The available namespaces are
{{blockers.prefixes}}. The classes that require a person are
{{blockers.human}}, while the class that can receive a proposed answer is only
{{blockers.proposable}}.

That distinction separates reasoning from authority. A judgement call can be
made cheaper to review by presenting alternatives and a recommendation. A fact
the agent cannot observe must be supplied. Spending, access, and policy choices
remain with the person who holds that authority. Changing the label does not
change who can honestly answer the question.

A proposal remains blocked until its pull request merges. Disagreement is
expected: naming another option is enough to redirect it. [The precise sweep
rules are authoritative here](source:initiatives/sweep-prompt.md), and [the
working instructions explain how a recorded answer unblocks later work](source:AGENTS.md).

---
## Blocker labels decide who can act

The available namespaces are {{blockers.prefixes}}. Only
{{blockers.proposable}} can receive a reasoned proposal. Facts, spending,
access, policy, and external dependencies stay with whoever can honestly supply
or authorise them. A proposal remains blocked until its pull request merges;
naming another option is enough to redirect it.
