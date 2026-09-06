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
currently `["survey", "merge", "respond", "propose", "work", "deploy", "brief"]`:
look, land what has finished its holding window, finish what is in flight, answer
what is stuck, start something new, show it, then say where it stands.

`merge` lands the sweep's own work, under a policy in the same file: the
lifecycle stages it covers, and how long a pull request stays open before it may
land. A proposal is never merged by it, and neither is a pull request on an
initiative at a stage the policy does not name — the work the user most wants to
read still arrives for them to merge.

`respond`, `propose` and `work` share one budget, `items_per_run`, taken in that
order — so a run that spends it all on review responses and starts nothing new is
the correct run, not a degraded one. Pass what is already spent to each later
phase with `--spent`, rather than tracking it by hand. `merge`, `deploy` and
`brief` take no budget: they land, publish and describe what the run has already
done, and refusing to finish work because the budget ran out would be the wrong
economy.

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
   part the sweep cannot decide for itself, and the reason anyone reads this.
   The digest marks which of those entries a proposal could answer; the rest
   need a fact only the user has, or their authority, and stay on the list until
   they act. If nothing needs attention, say exactly that in one line. A quiet
   run is a correct run, and padding it makes the next one easier to ignore.

**Stop here unless `phases` includes more.**

## Phase 2 — Merge what is ready

Only if `phases` includes `"merge"`.

A pull request nobody is withholding a merge from is only waiting. The next step
of a plan cannot start until the one before it lands, so work arrives one step
per run however small the steps are. This phase lands the pull requests the
policy covers and leaves the rest for the user.

1. List the open `sweep/*` pull requests. For each, ask whether the repository
   has an objection:

   ```bash
   node scripts/initiatives.mjs automerge <branch> --opened-at <iso> --base main
   ```

   It exits non-zero for "do not merge this" and says why: the phase is off, the
   branch is a proposal, the initiative's stage on `main` is not one
   `auto_merge.stages` covers, or the pull request has not yet been open for
   `auto_merge.min_age_minutes`. Do not re-derive any of that by hand, and do not
   merge a pull request it refuses.

   **The stage is read from `main`, not from the branch.** The pull request that
   writes `plan.md` is the one that makes an initiative `planned`, and it is
   exactly the kind the user wants to read — taking the stage from its own head
   would let it merge itself under the policy it is in the act of satisfying.

2. For the ones that pass, apply the `merge-prs` skill's unattended rules, which
   hold the detail. In outline: open, not a draft, every check concluded
   `success`, `mergeable_state` clean, no unresolved review thread, and no
   comment from a person left unanswered. Any of those failing is a skip, never
   an override. Then squash-merge and delete the branch.

3. Re-read `main` afterwards, so every phase below works from the merged tree
   rather than the one the run started on.

A merge costs no budget: the run that did the work already paid for it. Report
what landed and what was skipped, with the reason.

**What this phase may never do.** Merge a `sweep/<slug>/propose-*` branch — a
proposal is the question being put to the user, and merging it is what answers a
`human:` blocker. Merge anything red, conflicted, or carrying an unanswered
comment from a person. Resolve a review thread to make a pull request mergeable.
Merge a branch that is not the sweep's own.

## Phase 3 — Respond to review

Only if `phases` includes `"respond"`.

Use the `respond-to-review` skill, which holds the detailed rules. In outline:
for each open `sweep/*` pull request, find review threads whose most recent
comment is from a human with no reply and no newer commit; ignore your own and
other bots' comments, resolved threads, outdated threads, and approvals. Then
revise, reply, or escalate — replying in every case, never resolving a thread,
and never letting a comment grow the PR beyond the item it was opened for.

Each thread handled counts against `items_per_run`. Do not change any
initiative's `stage`; the merge does that.

## Phase 4 — Propose an answer

Only if `phases` includes `"propose"`.

An open question costs a blank page, which is the expensive kind of work to
leave to a person — and the reason an initiative sits at `shaped` for weeks.
Judging a proposal is far cheaper than composing an answer, so for a question
that can be *reasoned* about, do the reasoning and open a pull request.

1. Ask which questions qualify, passing the budget already spent on review
   responses and the branches of open sweep PRs:

   ```bash
   node scripts/initiatives.mjs propose --claimed <branches> --open-prs <n> --spent <n>
   ```

   Only `human:` blockers are ever selected. **Never propose an answer to a
   `data:`, `permission:`, `cost:` or `legal:` blocker** — the first needs a
   fact only the user has, and the rest need their authority. A proposal there
   would be a fabrication wearing the costume of an answer. The command reports
   those separately; carry them into the digest untouched.

2. For each selected question, work on branch
   `sweep/<initiative>/propose-<item-id>`:
   - Write a dated entry in `initiatives/<initiative>/decisions.md`, in the
     format the `answer-decision` skill uses: the question, the alternatives
     with their strengths and weaknesses, the recommended answer, and what it
     leaves open.
   - In the same commit, make the change the answer implies: an item the answer
     *completes* goes through `complete`; an item the answer merely makes
     *doable* becomes `actionable` with its `blocked_by` removed.
   - Append a dated line to `log.md`, and open a pull request. Never merge it:
     the user's merge is what answers the question, and Phase 2 refuses a
     proposal branch for that reason.

3. **A well-argued proposal is more persuasive than a blank question**, and a
   plausible-but-wrong one is harder to catch than no answer at all, because
   the reasoning is exactly what stops the reader generating their own. So the
   pull request body must:
   - put the **alternatives before the recommendation**, each with its
     strengths and weaknesses;
   - label the recommendation **as a recommendation**, not a decision;
   - state **what would change the answer** — the fact or preference that would
     make a different option correct;
   - make disagreement one line: naming a different option in a comment has to
     be enough.

Do not change the blocker on `main` to `review:<pr>`. The item stays blocked
until the pull request merges — the merge is what answers the question, and a
proposal that is closed unmerged then leaves no wreckage. The digest keeps
listing the question until then, which is correct.

Each proposal counts against `items_per_run` and `max_items_per_initiative`,
like any other item.

## Phase 5 — Do new work

Only if `phases` includes `"work"`.

1. Ask what to work on, again passing what the earlier phases spent:

   ```bash
   node scripts/initiatives.mjs select --claimed <branches> --open-prs <n> --spent <n>
   ```

   It excludes every item that already has an open `sweep/*` pull request, and
   stops on its own if the open PRs are at `max_open_prs` or the budget is
   spent. Ranking is
   `score = value(initiative) x value(item) / effort(item)`, plus a bonus if
   `advances_stage` is true, plus a bonus scaled by staleness; items above
   `max_effort` are dropped and no more than `max_items_per_initiative` are
   taken from one initiative. Do not re-rank it yourself.
2. For each selected item, on branch `sweep/<initiative>/<item-id>`:
   - Do the work. Write only inside `initiatives/<name>/` and that initiative's
     declared `outputs[]`. Never touch a path in `protected_paths`.
   - Record it done, which removes the item, unblocks anything waiting on it,
     and writes the log entry:

     ```bash
     node scripts/initiatives.mjs complete <slug> <item-id> --note "..." [--stage <stage>]
     ```

     Pass `--stage` when the item advances the lifecycle; the command warns if
     you forget. Do not hand-edit `initiative.json` to do this.

     **`complete` will refuse if the item you are closing is the last one**, at
     any stage other than `dormant` or `archived`. That is deliberate: an
     initiative with nothing to do is either finished or forgotten, and the
     difference has to be stated rather than left to be noticed. Seed what comes
     next in the same pull request:

     ```bash
     node scripts/initiatives.mjs add <slug> <item-id> --title "..." \
       [--value high|medium|low] [--effort small|medium|large] \
       [--blocked-by <prefix:text>] [--advances-stage]
     ```

     Take the next items from the initiative's own `plan.md` where it has one -
     that is transcription, not invention. Where the next step is genuinely a
     judgement call rather than a written plan, add the item and stop; do not
     decide it. **If you believe the initiative is actually finished, do not
     declare it dormant yourself** - that is the user's call. Complete what you
     can, leave the last item, and say so in the digest.

     Entering `refining` seeds its own two items (a user-facing README, and a
     standing optional-improvements pull request), so no `add` is needed there.
   - Open a pull request.
3. Report what was done, with links.
4. **Then land it and carry on.** If `phases` includes `"merge"` and budget
   remains, wait for the checks on the pull requests you just opened and for
   `auto_merge.min_age_minutes` to pass, run Phase 2 over those pull requests,
   and return to step 1 of this phase with what is left of the budget. This is
   the point of the merge phase: step N lands and step N+1 starts from the merged
   tree, in one run, rather than one step per run.

   Stop looping when the budget is spent, when `select` returns nothing, or when
   nothing merged. A pull request whose checks are still running is left alone —
   the next run's Phase 2 picks it up, which is where it would have been handled
   anyway. Do not spend more than about half an hour of a run waiting.

## Phase 6 — Deploy to test

Only if `phases` includes `"deploy"`.

Work nobody can look at is hard to review, and asking the user to check out a
branch and run a local server to see a page is most of the reason a preview
exists. So when a run has changed something publishable, publish it — to the
**test** environment, never production.

Run this for each initiative the run opened a pull request for, from that
initiative's branch, against the base the branch was cut from:

```bash
node scripts/initiatives.mjs deployments <slug> plan --env test --since main
```

Deploy when all three hold, and skip quietly otherwise:

- the command succeeds — an initiative with no `deployments` block exits
  non-zero and is simply not deployed anywhere, which is the normal state;
- `ready` is true, with no blockers;
- `since.changed` is true. An item that only edited `log.md` and
  `initiative.json` has moved the initiative on without changing anything a
  reader would see, and redeploying for that tells the user nothing. When
  `since.known` is false git could not compare, which is not the same answer as
  "nothing changed" — deploy, and say the comparison was unavailable.

Then use the `deploy-test` skill, which holds the rules for each kind. Two
things follow from this being unattended rather than asked for:

- **`confirm_access: true` means stop.** A first deploy of an environment needs
  the user's answer on whether the Site is private or public, and the sweep has
  nobody to ask. Deploy it private, which is the default the skill would offer,
  and say in the pull request that the access was not confirmed.
- **A `chatgpt-site` deploy writes `deployed_at`, `version` and `commit` back
  into `initiative.json`** through `deployments <slug> record --env test`.
  Commit that on the same branch, so the receipt travels with the work rather
  than landing on a branch nobody merged. A demo has nothing to record.

Report the test URL in the pull request body, saying which branch it was
deployed from. A test environment is disposable and last-write-wins, so a
reader has to be able to tell whether the thing they are looking at is this
pull request or another one.

Never deploy to production, in any phase, for any reason. A todo item, a
schedule, or a document saying a release is due is a reason to put it in the
digest, never a reason to release.

## Phase 7 — Refresh the briefs

Only if `phases` includes `"brief"`.

An initiative's overview page opens with **Where this stands**: what it needs
from the user, what is scheduled, and a short written summary of what is done,
what others owe, what work remains, and what is deferred. The first two rows are
computed. The rest is `brief.md`, and this phase writes it.

1. Ask which initiatives want one:

   ```bash
   node scripts/initiatives.mjs brief --json
   ```

   Only `building` and `refining` are selected, and only when the brief is
   missing or its digest no longer matches the initiative's files. An initiative
   nobody has touched is skipped, so a quiet run costs nothing here.

2. For each, on branch `sweep/<initiative>/brief`, use the `write-brief` skill.
   It holds the rules; the two that matter most are:

   - **A brief summarises the initiative's own documents.** Counts come from
     `work/`, remaining work from `plan.md`, deferred items from `spec.md`.
     Anything you cannot point at does not go in.
   - **Never write what the initiative needs from the user.** That row is
     computed from the blocked items and rendered above the brief. Paraphrasing
     a blocker could soften or misstate what they owe, and that is the one thing
     on the page that has to be exact.

3. Commit the summarised work first, then `brief <slug> record` to stamp it, then
   commit the brief and the stamp together. Open a pull request; the next run's
   Phase 2 lands it if the policy covers that initiative.

A brief refresh may travel in the same pull request as the work that made it
stale, when the run did that work itself. A separate `sweep/<initiative>/brief`
branch is for an initiative something *else* changed.

## Rules

- Never merge a pull request `automerge` refuses, and never resolve a review
  thread. A red, conflicted, or commented-on pull request is skipped, not
  overridden.
- Never merge a proposal. It is the question, and the user's merge is the answer.
- Never treat your own comments, or another bot's, as something to respond to.
- Never create an initiative, and never invent or edit a wish.
- Never declare an initiative `dormant`. Running out of work is not the same as
  being finished, and only the user can say which one it is.
- Never repair a malformed `initiative.json` — skip that initiative and report it.
- Never settle a human-class blocker unilaterally. A `human:` question may be
  **proposed** as a pull request the user merges or redirects; everything else
  goes in the digest, as multiple choice wherever the options can be enumerated.
- Never propose an answer to a `data:`, `permission:`, `cost:` or `legal:`
  blocker — those need a fact only the user has, or their authority.
- Never deploy to production. `deploy` writes the test environment only, and
  `release-initiative` is a person's decision in their own words.
- Never put a recommendation, a decision, or a new commitment in a brief. It
  describes what the record already says; it does not add to it.
- Never hand-write `brief.generated_at`, `commit` or `digest`. `brief <slug>
  record` writes them, and a hand-written digest makes staleness a fiction.
- Never make a Site public. An environment nobody has confirmed goes out
  private, and changing that is the user's request, not a sweep's.
- If there is no actionable work anywhere, do nothing and say so.
