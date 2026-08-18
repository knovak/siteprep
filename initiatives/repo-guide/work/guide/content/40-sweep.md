---
id: sweep
title: How work gets picked up
order: 40
slide: false
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
