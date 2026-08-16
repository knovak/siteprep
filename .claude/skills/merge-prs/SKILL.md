---
name: merge-prs
description: Merge one or more pull requests after checking CI, mergeability, and review threads. Use when the user asks to merge specific PRs by number ("merge PRs 231, 234"), or to clear a batch with a selector ("merge all green sweep PRs", "merge everything green"). Reports what merged and why anything was skipped.
---

# Merging pull requests

Clearing a batch of PRs by hand is the friction that kills an automated
workflow. This does the checking and merging in one pass, and refuses to merge
anything it should not.

## 1. Resolve the target set

The user names PRs one of two ways.

**Explicitly, by number** — "merge PRs 231, 234, 236". These are *named* targets,
which matters for overrides in step 4.

**By selector** — resolve it with `list_pull_requests` / `search_pull_requests`:

| Selector | Means |
|---|---|
| `all green sweep PRs` | Open PRs whose head branch starts with `sweep/`, CI green |
| `today's sweep` | The same, created today |
| `initiative:<name>` | Open PRs whose branch is `sweep/<name>/...` |
| `all green` | Every open PR with green CI |

PRs matched by a selector are *unnamed* targets. They never qualify for an
override.

If a selector matches nothing, say so and stop. Do not widen it.

## 2. Check each PR

For every target, gather with `pull_request_read`:

- `get` — is it open, not a draft, not already merged? What is `mergeable_state`?
- `get_check_runs` — did every check conclude `success`?
- `get_review_comments` — are there review threads with `isResolved: false`?

## 3. Classify

| Class | Condition | Action |
|---|---|---|
| **Ready** | Open, not draft, CI green, mergeable, no unresolved threads | Merge |
| **CI red** | Any check failed or is still running | Skip |
| **Conflicted** | `mergeable_state` is `dirty` | Skip — and see below |
| **Unresolved comments** | Any review thread with `isResolved: false` | Skip |
| **Already merged / closed** | Not open | Skip silently |

## 4. Overrides — only for named PRs

The user may override **CI red** or **unresolved comments**, but only for a PR
they named individually by number, and only when they ask in that turn:

> "merge 234 even though CI is red"

**Never apply an override to a PR that came from a selector.** A bulk selector is
the path used most often, so an override there is how the safeguard quietly
stops existing. If the user asks to override across a selector, ask them to name
the PRs.

**Never resolve a review thread to make a PR mergeable.** An unresolved comment
means a conversation is still open, and that outranks throughput.

## 5. Merge

Squash-merge each ready PR, deleting the branch. Merge in ascending PR number
unless the user asks otherwise.

## 6. Report

One table. Every target appears exactly once:

```
#231  merged    Add the 1500-1800 migration layer
#234  skipped   CI red - build failed on lint
#236  skipped   1 unresolved review thread
#238  merged    Write test-plan.md
```

Then a one-line summary: how many merged, how many skipped.

## A conflict between two sweep PRs is a bug report

Sweep PRs are supposed to be conflict-free by construction: each one may only
touch its own `initiatives/<name>/` directory plus that initiative's declared
outputs, and no two initiatives may declare the same output path.

So when two `sweep/` PRs conflict with each other, do **not** quietly rebase past
it. Something violated the write scope, or two initiatives claimed the same
output. Say so explicitly:

> `#234` and `#236` conflict in `demos/migration_map/index.html`. Sweep PRs
> should not be able to conflict — check whether two initiatives declare that
> path in their `outputs[]`.

A conflict with `main` from an ordinary push is different and unremarkable:
update the branch and retry once.
