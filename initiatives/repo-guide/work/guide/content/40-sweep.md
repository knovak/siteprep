---
id: sweep
title: How work gets picked up
order: 40
slide: true
slide_title: The sweep finishes work in flight first
audience: both
---
The sweep is a bounded maintenance pass over live work. Its configured phases
are {{sweep.phases}}. Their resolved summaries are
{{sweep.phase_summaries}}.

The current budget is {{sweep.budget}}. Earlier phases spend it first, so a run
that uses its allowance answering review feedback and starts no new build work
is correct. Open branches are claimed before new work is selected, and ranking
is computed by the repository rather than rewritten by the agent.

The non-negotiable rules are {{sweep.rules}}. In particular, the sweep opens
pull requests and never merges them. [Read the exact prompt used by both manual
and scheduled runs](source:initiatives/sweep-prompt.md). The schedule itself is
{{workflows.initiatives-digest}}.

---
## The sweep finishes work in flight first

Every run follows {{sweep.phases}}. It surveys the live record, responds to
unanswered human review, proposes answers only where judgement is allowed, and
then starts selected work. Earlier phases spend the allowance first, so a run
that only finishes review work is a successful run.

---
## A shared budget keeps the sweep bounded

A run handles at most {{sweep.budget.items_per_run}} items, with no more than
{{sweep.budget.max_items_per_initiative}} from one initiative and no work above
{{sweep.budget.max_effort}} effort. It also stops at
{{sweep.budget.max_open_prs}} open pull requests. Open branches are claimed
first; the repository computes the ranking.
