# Running the sweep

How to schedule the sweep, and what any scheduler has to provide.

The sweep is deliberately thin. The prompt lives in the repo
(`sweep-prompt.md`), the configuration lives in the repo (`sweep.json`), and
everything that can be computed is a command rather than a judgement. What is
left for a scheduled agent is small — which is what makes moving between Claude
and Codex, or anything else, a change of scheduler rather than a rewrite.

## What any runner must provide

Four things, and nothing else:

1. **A checkout of this repository with full history.** Last activity comes from
   `git log`, so a shallow clone reports every initiative as touched today.
2. **Permission to create branches and open pull requests.** Never to merge.
3. **A schedule.** Twice daily is the design's assumption; anything from daily to
   hourly works, since a run with nothing to do costs almost nothing.
4. **The ability to run `node scripts/initiatives.mjs`.** Node 20+, no npm
   install needed — the script uses only built-ins.

The instruction to give it is one line:

```text
Read initiatives/sweep-prompt.md in this repository and follow it.
```

Pointing at the file rather than pasting its contents is the whole trick: the
scheduled run and a manual run then execute the same text, and changing the
job's behaviour is a commit rather than an edit buried in a scheduler.

## Setting it up as a Claude Routine

Using the Claude app (desktop or web) rather than the CLI.

1. Open **Claude Code** in the Claude app and start a session on this
   repository, so the Routine inherits an environment that can see the repo.
2. Ask Claude, in that session, to create the Routine. For example:

   > Create a routine that runs at 07:00 and 19:00 UTC every day and sends:
   > "Read initiatives/sweep-prompt.md in this repository and follow it."

   Adjust the times to your timezone; Routine schedules are set in UTC.
3. Confirm it was created, and note that it appears in your Routines list, where
   it can be paused or deleted later.

A Routine keeps the credentials in your Claude account rather than in this
repository — no `ANTHROPIC_API_KEY` secret, nothing to rotate here, and stopping
it is one action in the Routines list rather than a commit.

### First run

Run it once by hand before trusting the schedule. In a Claude Code session on
this repo, say *"run the sweep prompt"*. All four phases are enabled, so a run
may open pull requests — it will never merge one. Read what it opens before
letting the schedule run unattended.

To make a run harmless while you check something, set `phases` back to
`["survey"]`: it then reads, reports, and changes nothing.

## What the sweep is allowed to do

`phases` in `sweep.json` decides what a run may do, and is currently
`["survey", "respond", "propose", "work"]` — everything:

| Phase | What it does |
|---|---|
| `survey` | Reads and reports. Mandatory: the sweep always looks before acting |
| `respond` | Answers review comments on its own open pull requests |
| `propose` | Opens a pull request proposing an answer to a `human:` question |
| `work` | Starts new work from the todo lists and opens pull requests |

They run in that order, and share one budget of `items_per_run` taken in the
same order — finishing what is in flight outranks starting more. Narrowing or
widening this is a commit to a config file, reviewed like anything else, which
is the point: changing how autonomous the job is should leave a trace.

`select` and `propose` enforce it on their own — with a phase absent from
`phases` they return nothing and say why, so a prompt cannot talk the sweep into
doing more than the config allows.

**What `propose` may answer.** Only `human:` blockers, which are judgement
calls. A `data:` blocker is a fact only you have, and `permission:`, `cost:` and
`legal:` need your authority rather than reasoning, so a proposal for one of
those would be a fabrication. `propose` lists them separately as things that can
never become a pull request, and they stay in the digest issue.

A proposal does not rewrite the blocker on `main`. The item stays blocked until
the pull request merges — merging it *is* answering the question, and a
proposal you close unmerged leaves nothing behind.

**Turning it down.** The staged bring-up the plan described — `work` first at
`items_per_run: 1`, then `respond`, then `propose` — was collapsed into one
change deliberately (Phase 5a and 6, §12 of the vision). If a run turns out to
be more than you want to review, the dial is `items_per_run` rather than the
phase list: dropping it to `1` keeps every capability on and slows the flow to
one pull request per run.

## What the runner actually does

Most of a run is commands, not reasoning:

| Step | How |
|---|---|
| Survey | `node scripts/initiatives.mjs digest` |
| Choose questions to answer | `node scripts/initiatives.mjs propose --claimed <branches> --open-prs <n> --spent <n>` |
| Choose work | `node scripts/initiatives.mjs select --claimed <branches> --open-prs <n> --spent <n>` |
| Record an item done | `node scripts/initiatives.mjs complete <slug> <item-id> --note "..." [--stage <stage>]` |
| Check a change stays in scope | `node scripts/initiatives.mjs check-scope <slug> --files-from changed.txt` |

`--spent` is how the shared budget is kept: pass the number of items earlier
phases of the same run already used, and each later phase takes only what is
left.

The agent supplies the open sweep branches (which needs GitHub), does the actual
work on each selected item, writes the reasoning in a proposal, and writes
review replies. Ranking, budgeting, state changes, and scope enforcement are
computed, so they behave identically on every run and in every runner.

## Moving to another scheduler

Because the contract above is short, switching to a Codex scheduled task — or a
cron job on a machine that has the `claude` CLI, or a GitHub Action — means
providing the same four things and the same one-line instruction. Nothing in
this repository names Claude, and nothing needs to change here.

The one difference worth planning for: a runner without an interactive session
needs its own credentials somewhere. That is the trade a Routine avoids.

## Safety net

Two guardrails hold regardless of what the runner does:

- **`.github/workflows/sweep-scope.yml`** fails any `sweep/*` pull request that
  touches files outside its initiative and that initiative's declared outputs,
  or that touches a protected path. This is enforced by CI, not by the agent
  remembering the rule.
- **The sweep never merges.** Every change arrives as a pull request for you to
  read. The `merge-prs` skill clears a batch once you are happy.

## Stopping it

Delete or pause the Routine in your Routines list. Nothing in the repository
needs changing, and any open `sweep/*` pull requests can be closed as normal.

To keep the schedule but make it harmless, set `phases` back to `["survey"]`.
