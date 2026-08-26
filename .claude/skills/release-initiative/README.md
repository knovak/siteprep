# Release initiative

Move an initiative's current committed source to its production deployment.
This is the only thing in the repository that writes production, and it runs
only when you ask.

```text
Release tide-here to production.
```

```text
Ship the current repo guide demo.
```

## The gate

The release stops — reports and does nothing — when:

- the source directory has uncommitted changes, or has never been committed.
  Production is released from committed files, so the commit recorded against
  the release is a real reference you can go back to;
- the build, tests, or the smoke check fail.

The first is enforced by code: `initiatives.mjs deployments <slug> plan --env
prod` exits non-zero, and the skill is not allowed to deploy past it.

The gate does *not* require that the same commit reached test first. That was
considered and left out deliberately — but when test is ahead of production, the
test deploy says so.

## What "production" means per kind

| Kind | Released by | Live when |
| --- | --- | --- |
| `chatgpt-site`, `build: static` | `deploy-to-chatgpt-sites` | immediately |
| `chatgpt-site`, `build: sites-app` | the Sites hosting workflow | immediately |
| `demo` | `deploy-demo`, copying into `demos/` | when the branch merges to `main` |

A production Site is a **separate Site** from the test one: its own database,
its own storage, starting empty. The test Site's data does not travel with it.

## What it records

On success the release writes back to `initiative.json`: for a Site the URL,
access, version, deployment time and released commit; for a demo the deployment
time and commit, with the URL derived from the destination so it can never drift
from what is actually under `demos/`. It also appends a line to the initiative's
`log.md`, because a release is a fact about the initiative.

Access is never inferred. The first release to an environment is private unless
you say otherwise, and the skill tells you so and takes your answer. A
replacement keeps whatever access the Site already has — changing it is its own
request, not a side effect of a release.

Both URLs, test and production, are in every receipt.
