---
id: review
title: Review and merge
order: 65
slide: true
slide_title: Every change is a pull request you merge
audience: contributor
---
Every change an agent makes arrives as a pull request on its own branch. The
branch name carries the initiative and the item, and a workflow checks that
the diff stays inside that initiative's folder and its declared outputs. A
pull request that writes outside its scope fails the check, whether or not the
agent remembered the rule.

@figure review-loop

You review the pull request the way you'd review any other. The site is built
for every pushed branch, so the rendered result of a pull request is
browsable before you merge it, at a preview address under the branch name.

**Comments** get answered by the next sweep run, or by the
`{{skills.respond-to-review.name}}` skill when you ask directly. For each
thread whose last comment is yours, the agent does one of three things: revises
the branch and replies, replies without a change, or replies that the question
is yours to decide and surfaces it in the digest. It replies in every case,
never resolves a thread, and never lets a comment grow the pull request beyond
the item it was opened for.

**Merging** is yours. The `{{skills.merge-prs.name}}` skill clears a batch in
one sentence: it checks that CI is green, the branch is mergeable, and no
review thread is unresolved, then merges what qualifies and reports what it
skipped and why. It never resolves a thread to make a pull request mergeable.
The merge is also the event that completes the todo item, so auto-merging on
green would make review meaningless.

Because each sweep pull request is confined to one initiative, a batch of them
merges cleanly in any order. A conflict between two sweep pull requests means
an initiative wrote outside its scope, and the merge skill says so instead of
rebasing past it.
[The response rules are in the review skill](source:.claude/skills/respond-to-review/SKILL.md),
and [the merge checks are in the merge skill](source:.claude/skills/merge-prs/SKILL.md).

---
## Every change is a pull request you merge

One branch per item, confined to one initiative by a CI check. The rendered
result is browsable per branch before merge. Comments get answered by the next
sweep. A merge skill clears a green batch in one sentence and never resolves a
thread for you.

@figure review-loop
