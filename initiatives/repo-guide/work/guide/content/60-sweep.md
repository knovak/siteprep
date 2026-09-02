---
id: sweep
title: How work gets picked up
order: 60
slide: true
slide_title: The sweep picks up the work
audience: both
---
Nobody assigns work. A scheduled run called the sweep reads every initiative,
decides what to do from the todo lists, and opens pull requests. It runs as a
Claude routine several times a day, and you can run the same prompt by hand in
a session at any time. The prompt lives in the repository, so the scheduled
run and a manual run execute the same text.

@figure sweep-run

A run moves through four phases in a fixed order. Which phases are switched on
is a setting in the sweep configuration file, so widening what the job may do
is a reviewed commit rather than an edit in a scheduler.

The phases share one budget of {{sweep.budget.items_per_run}} items per run,
spent in phase order. Answering review comments comes first, then proposing
answers to open questions, then starting new work. A run that spends its whole
budget on review replies and starts nothing new is a correct run.

@fact sweep.budget as table

Which items get picked is arithmetic, not judgment. Each actionable item is
scored from the initiative's value, the item's value, and its effort, with a
bonus for advancing the stage and a bonus that grows with how long the
initiative has sat. Items that already have an open pull request are skipped.
The command that ranks them is code, so the definition of "most important"
doesn't drift between runs.

Each run also obeys a short list of rules, whatever it finds:

@fact sweep.rules as list

[The sweep prompt is the authority for what a run does](source:initiatives/sweep-prompt.md),
[the configuration sets the budget and phases](source:initiatives/sweep.json), and
[the setup notes say how to schedule it](source:initiatives/sweep-setup.md).

---
## The sweep picks up the work

A scheduled run reads every initiative and opens pull requests. Four phases in
a fixed order: survey, answer review comments, propose answers to open
questions, start new work. One budget, spent in that order.

@figure sweep-run

---
## The budget, and what a run never does

The budget is currently {{sweep.budget.items_per_run}} items per run. Ranking is
arithmetic on value and effort, so it doesn't drift. A run never merges, never
creates an initiative, never edits a wish, and never declares an initiative
dormant.

@fact sweep.budget as table
