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
this repo, say *"run the sweep prompt"*. You should see it read `sweep.json`,
run the digest, and stop — because `phases` is `["survey"]`.

If it does anything more than report, stop and check `sweep.json` before letting
the schedule run.

## Switching the sweep on

`phases` in `sweep.json` decides what a run may do:

| `phases` | What happens |
|---|---|
| `["survey"]` | Reads and reports. Changes nothing. The current setting |
| `["survey", "respond"]` | Also answers review comments on its own open PRs |
| `["survey", "respond", "work"]` | Also starts new work and opens pull requests |

`survey` is mandatory — the sweep always looks before acting. Widening this is a
commit to a config file, reviewed like anything else, which is the point:
enabling autonomy should leave a trace.

**Add `work` before `respond`,** even though the table lists them the other way
round. `respond-to-review` has never executed — no sweep pull request has ever
received a comment — so enabling both at once turns on two untested paths
simultaneously. Enable `["survey", "work"]`, let it open a real pull request,
then add `"respond"` once there is something to comment on.

When first enabling `work`, set `items_per_run` to `1` for a week or so, then
restore it. Seeing the first few pull requests one at a time is worth the
slower start.

`select` enforces this on its own — with `work` absent from `phases` it returns
nothing and says why, so a prompt cannot talk the sweep into doing more than the
config allows.

## What the runner actually does

Most of a run is commands, not reasoning:

| Step | How |
|---|---|
| Survey | `node scripts/initiatives.mjs digest` |
| Choose work | `node scripts/initiatives.mjs select --claimed <branches> --open-prs <n>` |
| Record an item done | `node scripts/initiatives.mjs complete <slug> <item-id> --note "..." [--stage <stage>]` |
| Check a change stays in scope | `node scripts/initiatives.mjs check-scope <slug> --files-from changed.txt` |

The agent supplies the open sweep branches (which needs GitHub), does the actual
work on each selected item, and writes review replies. Ranking, state changes,
and scope enforcement are computed, so they behave identically on every run and
in every runner.

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
