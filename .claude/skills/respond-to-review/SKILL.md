---
name: respond-to-review
description: Answer review comments on a pull request - revising the branch, replying, or escalating a decision. Use when the user asks to respond to, address, or handle review feedback on a PR ("respond to the comments on 204", "address the review feedback"), and as the review-response step of an initiatives sweep. Never resolves threads or merges.
---

# Responding to review on a pull request

A PR with unanswered comments is work in flight, not work finished. This handles a
round of review on one or more PRs: read what came back, act on it, and reply.

Two callers, same rules: a person asking directly, and the sweep job's Phase 2.

## 1. Find the threads that need a response

For each target PR, read its review threads and its issue comments.

A thread **needs a response** when its most recent comment is **from a human** and
there is no reply after it and no commit on the branch newer than it.

Skip, without comment:

- threads you (or any bot) commented on last - **this is what stops the loop**
- resolved threads
- outdated threads, on code that has since changed
- approvals with no accompanying request
- anything already answered by a commit pushed after the comment

If nothing needs a response, say so and stop. Do not manufacture a reply.

## 2. Choose one of three outcomes per thread

**Reply in every case.** Silence looks identical to having missed it.

| Outcome | When | What you do |
|---|---|---|
| **Revise** | The change is clear, inside the PR's write scope, and proportional to the PR | Push a commit to the PR's branch, then reply saying what you changed |
| **Reply only** | A question, a disagreement, or a request you should not act on | Reply and explain. No commit |
| **Escalate** | A design decision that is the user's to make | Reply saying it needs their call, and surface it to the user - in the sweep's digest, or directly if invoked by hand |

The common mistake is treating every comment as a change request. *"Why did you do it
this way?"* deserves an answer, not a rewrite. *"Have you considered X?"* may deserve
either - if X is clearly better, revise and say so; if it is a real fork, escalate.

When you disagree with a requested change, say so plainly and give the reason, then do
what the reviewer asked unless it would break something. Explain, then comply - the
reviewer can overrule you with one more comment, and they have the context you lack.

## 3. Stay inside the PR's scope

**Do not let the PR balloon.** If a comment asks for materially more than the PR was
opened for, do not grow the diff. Reply proposing it as follow-up work - for an
initiatives PR, as a **new todo item** in that initiative. A review comment may create
work; it may not silently redefine what is already in flight.

For a sweep PR, the write scope is unchanged: `initiatives/<name>/**` plus that
initiative's declared `outputs[]`, and never a protected path. A comment asking for a
change outside that is a *reply only* - explain the boundary.

## 4. Never resolve the thread

Push and reply; leave the thread open. **The reviewer decides the conversation is
over**, not you. Marking your own work as settled is how a review safeguard stops
meaning anything.

Likewise, never merge the PR - even if the comment says "looks good, merge it". Say it
is ready and let them merge, or use the `merge-prs` skill if they ask for that.

## 5. Do not change lifecycle state

For an initiatives PR: **do not touch `stage` in `initiative.json`.** The merge is what
enacts a state change, however many review rounds it takes. An initiative whose
`spec.md` PR is under review is still at its previous stage, correctly.

Do append a dated line to the initiative's `log.md` for each PR you revised, so the
history shows the rounds and not just the eventual merge.

## 6. Report

Per PR: what you revised, what you replied to without changing, and anything escalated
with the decision needed. Keep it to what the user has to act on - the PR itself is the
record of the rest.
