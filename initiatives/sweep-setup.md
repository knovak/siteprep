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
2. **Permission to create branches, open pull requests, and — while `merge` is
   in `phases` — merge its own `sweep/*` pull requests.** Never to merge anything
   else, and never to push to `main` directly.
3. **A schedule.** Four times daily is the current setting; the design assumed
   twice, and anything from daily to hourly works, since a run with nothing to
   do costs almost nothing.
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

   > Create a routine that runs at 01:00, 07:00, 13:00 and 19:00 UTC every day
   > and sends: "Read initiatives/sweep-prompt.md in this repository and follow
   > it."

   Adjust the times to your timezone; Routine schedules are set in UTC.
3. Confirm it was created, and note that it appears in your Routines list, where
   it can be paused or deleted later.

A Routine keeps the credentials in your Claude account rather than in this
repository — no `ANTHROPIC_API_KEY` secret, nothing to rotate here, and stopping
it is one action in the Routines list rather than a commit.

### First run

Run it once by hand before trusting the schedule. In a Claude Code session on
this repo, say *"run the sweep prompt"*. Every phase is enabled, so a run may
open pull requests and land the ones the merge policy covers. Read what it does
before letting the schedule run unattended; to watch a few rounds first, drop
`merge` from `phases`.

To make a run harmless while you check something, set `phases` back to
`["survey"]`: it then reads, reports, and changes nothing.

## What the sweep is allowed to do

`phases` in `sweep.json` decides what a run may do, and is currently
`["survey", "merge", "respond", "propose", "work", "deploy", "brief"]` —
everything:

| Phase | What it does |
|---|---|
| `survey` | Reads and reports. Mandatory: the sweep always looks before acting |
| `merge` | Lands its own pull requests that the `auto_merge` policy covers |
| `respond` | Answers review comments on its own open pull requests |
| `propose` | Opens a pull request proposing an answer to a `human:` question |
| `work` | Starts new work from the todo lists and opens pull requests |
| `deploy` | Refreshes the **test** environment of what the run changed |
| `brief` | Rewrites the "where this stands" summary on an initiative whose files have moved |

They run in that order, and `merge` runs again at the end of `work` so one step
can land and the next start in the same run. `respond`, `propose` and `work`
share one budget of `items_per_run` taken in that order — finishing what is in
flight outranks starting more. Narrowing or widening this is a commit to a config
file, reviewed like anything else, which is the point: changing how autonomous
the job is should leave a trace.

`merge`, `deploy` and `brief` take no budget, because they land, publish and
describe work the run has already done rather than starting any.

`select` and `propose` enforce it on their own — with a phase absent from
`phases` they return nothing and say why, so a prompt cannot talk the sweep into
doing more than the config allows.

**What `merge` may land.** Its own `sweep/*` pull requests, and only the ones
the `auto_merge` block covers:

```json
"auto_merge": { "stages": ["planned", "building"], "min_age_minutes": 15 }
```

`stages` is read from the initiative's state on `main`, not from the branch — so
the pull request that *makes* an initiative `planned`, the one writing `plan.md`,
is not covered by its own change. The default names the two stages where a pull
request transcribes a plan you have already merged: there the work can be checked
against a document, which is the kind of checking CI and the scope test actually
do. Everything earlier — the objectives, the spec, the plan itself — is where your
judgement is the point of the pull request, so it waits for you.

`min_age_minutes` is the holding window. The pull request is open, visible and
closeable for that long before the sweep may land it; fifteen minutes is long
enough to catch one you did not want and short enough that a run can do other
work and come back to it. Zero lands as soon as the checks are green.

Three things it may never do, whatever the config says: merge a
`sweep/<slug>/propose-*` branch, since a proposal is the question being put to
you and merging it is what answers a `human:` blocker; merge anything red,
conflicted, or carrying an unanswered comment from a person; or resolve a review
thread to make a pull request mergeable. `initiatives.mjs automerge <branch>`
computes the first of those, and the `merge-prs` skill holds the rest.

**What `propose` may answer.** Only `human:` blockers, which are judgement
calls. A `data:` blocker is a fact only you have, and `permission:`, `cost:` and
`legal:` need your authority rather than reasoning, so a proposal for one of
those would be a fabrication. `propose` lists them separately as things that can
never become a pull request, and they stay in the digest issue.

A proposal does not rewrite the blocker on `main`. The item stays blocked until
the pull request merges — merging it *is* answering the question, and a
proposal you close unmerged leaves nothing behind.

**What `deploy` may write.** The test environment, and nothing else, from the
branch the run just pushed, and only when `deployments <slug> plan --env test
--since <base>` says the source actually changed. Production never moves without
a person running `release-initiative`, so the worst a deploy phase can produce is
a preview showing an unmerged branch — which is what a preview is for. A
`chatgpt-site` is redeployed and the receipt recorded back into
`initiative.json` on the same branch; a demo needs no deploy step at all,
because the push that builds the branch publishes its source to
`preview/initiatives/<slug>/` (§Deployments in `INITIATIVES_TECHDOC.md`). A
Site the sweep deploys for the first time goes out **private**, since nobody is
there to be asked, and the pull request says so.

**What `brief` may write.** One file per initiative, `brief.md`, plus its stamp
in `initiative.json`. It is a summary of documents the initiative already
carries, never a new commitment, and it never states what the initiative needs
from you — that row is computed from the blocked items so a summary cannot soften
it. Selection is a digest comparison, so an initiative nobody has touched is
skipped and a quiet run costs nothing.

The brief is **agent-owned**, which is the opposite of `wish.md`: it is rewritten
in full on every refresh, so a hand-edit is discarded without a word. Correct the
document it summarised — `spec.md`, `plan.md`, `decisions.md` — and the fix
arrives in the brief when it is next written.

**Turning it down.** The staged bring-up the plan described — `work` first at
`items_per_run: 1`, then `respond`, then `propose` — was collapsed into one
change deliberately (Phase 5a and 6, §12 of the vision). If a run turns out to
be more than you want to review, the dial is `items_per_run` rather than the
phase list: dropping it to `1` keeps every capability on and slows the flow to
one pull request per run.

The dials for the merge phase are separate, and there are three of them, in
increasing order of how much they take away: raise `min_age_minutes` to hold
pull requests open longer; narrow `auto_merge.stages` to fewer stages; remove
`merge` from `phases` so every pull request waits for you again.

## What the runner actually does

Most of a run is commands, not reasoning:

| Step | How |
|---|---|
| Survey | `node scripts/initiatives.mjs digest` |
| Decide whether a pull request may land | `node scripts/initiatives.mjs automerge <branch> --opened-at <iso>` |
| Choose questions to answer | `node scripts/initiatives.mjs propose --claimed <branches> --open-prs <n> --spent <n>` |
| Choose work | `node scripts/initiatives.mjs select --claimed <branches> --open-prs <n> --spent <n>` |
| Decide whether to deploy | `node scripts/initiatives.mjs deployments <slug> plan --env test --since <base>` |
| Choose briefs to refresh | `node scripts/initiatives.mjs brief --json` |
| Stamp a written brief | `node scripts/initiatives.mjs brief <slug> record` |
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

## Working alongside another agent

Another model may be working on an initiative at the same time as the sweep —
deploying and revising code that has to be tried in its own environment, say,
while the sweep carries the rest. That is fine, and needs no new mechanism,
because of what the design already refuses to do:

- **The sweep merges only its own `sweep/*` pull requests**, and only the ones
  its policy covers. It never merges another agent's branch, and never touches
  `main` except through one of its own pull requests — so the worst a collision
  produces is a pull request you close.
- **Every run re-reads `main`.** The survey is derived from `initiative.json`,
  the files present, and git at the moment it runs. There is no cached picture
  to go stale, so a run after someone else's merge simply sees the new state.
- **`initiative.json` is the only ledger.** Nothing tracks work in a second
  place that could disagree with it.
- **`complete` fails loudly.** Asked to finish an item another agent already
  removed, it errors rather than half-applying — and a `blocked_by: todo:<id>`
  left pointing at a removed item fails the build (§9), so a forgotten unblock
  cannot hide.

Two conventions make the rest work. Both are free, and neither is code:

1. **Whoever finishes an item records it with `complete`.** The todo list is the
   only record that an item is done. Work finished by hand and never recorded
   stays `actionable`, and the sweep will select it again — not once, but on
   every run until someone records it.
2. **Use the same branch name: `sweep/<initiative>/<item-id>`.** The branch name
   *is* the claim (§7.7). `select` drops any item that already has an open
   branch of that name, whoever opened it, and those pull requests count toward
   `max_open_prs` — so both the duplicate-work exclusion and the backpressure
   cap work across agents for free. A different prefix is invisible to both.

The second convention has a price worth paying: `sweep-scope.yml` runs on every
`sweep/*` pull request, so anything the other agent touches outside
`initiatives/<slug>/` must be declared in that initiative's `outputs[]`. That is
the exclusive-ownership rule that makes parallel pull requests safe in the first
place, so declaring the output is the fix — not a branch name that dodges the
check.

**Split the work by initiative, not by file.** Two agents on the same initiative
at the same stage is the one case with no safety net. Git catches the textual
collision — both agents append to `log.md` and rewrite `initiative.json` — and
shows it to you. Nothing catches the semantic one: a merged decision that
invalidates the premise of the other agent's open pull request while touching a
different file entirely. Only you can see that, so keep them on separate
initiatives and the question never comes up.

Two smaller things to expect:

- **Review does not relay between agents.** `respond-to-review` skips any thread
  whose last comment is from a bot — that is what stops the loop — so a comment
  one agent leaves on the other's pull request is silently ignored. Comments you
  post yourself are answered normally; if you want a point carried across, make
  it in your own voice.
- **Closing the losing pull request is clean.** A work pull request closed
  unmerged leaves the item `actionable`, which is correct if it was never done
  and harmless if the other agent's merge already recorded it. A proposal closed
  unmerged leaves nothing at all, since it never rewrote the blocker on `main`.

## Safety net

Two guardrails hold regardless of what the runner does:

- **`.github/workflows/sweep-scope.yml`** fails any `sweep/*` pull request that
  touches files outside its initiative and that initiative's declared outputs,
  or that touches a protected path. This is enforced by CI, not by the agent
  remembering the rule.
- **Every change is still a pull request**, with the write-scope check and the
  build run against it before anything lands, and a holding window in which you
  can close it. What the merge phase removes is the clicking, not the record: a
  landed change is a squash commit on `main` you can read or revert, and the
  pull requests the policy does not cover — every proposal, and every initiative
  at a stage outside `auto_merge.stages` — still wait for you. The `merge-prs`
  skill clears those as a batch.

## Stopping it

Delete or pause the Routine in your Routines list. Nothing in the repository
needs changing, and any open `sweep/*` pull requests can be closed as normal.

To keep the schedule but make it harmless, set `phases` back to `["survey"]`. To
keep it working but stop it landing anything, drop `"merge"` from the list.
