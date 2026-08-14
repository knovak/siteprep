# Sweep prompt

The instruction a sweep run follows. It lives here rather than in the scheduler
so that a manual run during development and a scheduled run are **the same
text** — debugging the schedule should not mean debugging a prompt you cannot
see — and so a change to the job's behaviour is a reviewable commit.

Run it by hand with:

```bash
claude -p "$(cat initiatives/sweep-prompt.md)"
```

or, in an interactive session, *"run the sweep prompt"*.

**Which phases run is set by `phases` in `initiatives/sweep.json`, not here.**
Widening what the job may do is a config change, reviewed like any other. It is
currently `["survey"]`: look, report, change nothing.

---

## Phase 1 — Survey (always)

1. Read `initiatives/sweep.json`. If it is missing or malformed, stop and say so.
2. Run the survey:

   ```bash
   node scripts/initiatives.mjs digest
   ```

   This is deterministic — every part of the survey is derived from
   `initiative.json`, the files present, and git, so it is computed rather than
   judged. Do not re-derive it by reading the files yourself; you will only
   introduce disagreement.

3. Two things the digest cannot settle on its own, because they need GitHub:

   - **Awaiting review** — for each entry, check whether that pull request has
     merged or closed. If it has, the item is ready to unblock; say so.
   - **Ready to unblock** — these are already established (a scheduled date has
     passed); just carry them into your report.

4. Report the digest. Lead with **Waiting on a decision from you** — it is the
   only part the sweep genuinely cannot resolve, and the reason anyone reads
   this. If nothing needs attention, say exactly that in one line. A quiet run
   is a correct run, and padding it makes the next one easier to ignore.

**Stop here unless `phases` includes more.**

## Phase 2 — Respond to review

Only if `phases` includes `"respond"`.

Use the `respond-to-review` skill, which holds the detailed rules. In outline:
for each open `sweep/*` pull request, find review threads whose most recent
comment is from a human with no reply and no newer commit; ignore your own and
other bots' comments, resolved threads, outdated threads, and approvals. Then
revise, reply, or escalate — replying in every case, never resolving a thread,
and never letting a comment grow the PR beyond the item it was opened for.

Each thread handled counts against `items_per_run`. Do not change any
initiative's `stage`; the merge does that.

## Phase 3 — Do new work

Only if `phases` includes `"work"`.

1. Exclude every todo item that already has an open `sweep/*` pull request. If
   the number of open sweep PRs is at or above `max_open_prs`, or the budget is
   already spent on review responses, stop and report.
2. Rank the remaining actionable items across all initiatives:
   `score = value(initiative) x value(item) / effort(item)`, plus a bonus if
   `advances_stage` is true, plus a bonus scaled by staleness. Drop anything
   whose effort exceeds `max_effort`.
3. Take the top items up to the remaining budget, no more than
   `max_items_per_initiative` from any one initiative.
4. For each, on branch `sweep/<initiative>/<item-id>`:
   - Do the work. Write only inside `initiatives/<name>/` and that initiative's
     declared `outputs[]`. Never touch a path in `protected_paths`.
   - Remove the completed item from `todo[]`.
   - Flip any item blocked on `todo:<completed-id>` to `actionable`.
   - Append a dated line to `initiatives/<name>/log.md`.
   - Open a pull request. Do not merge it.
5. Report what was done, with links.

## Rules

- Never merge your own pull request, and never resolve a review thread.
- Never treat your own comments, or another bot's, as something to respond to.
- Never create an initiative, and never invent or edit a wish.
- Never repair a malformed `initiative.json` — skip that initiative and report it.
- Never resolve a human-class blocker by guessing. Put the decision in the
  digest, as multiple choice wherever the options can be enumerated.
- If there is no actionable work anywhere, do nothing and say so.
