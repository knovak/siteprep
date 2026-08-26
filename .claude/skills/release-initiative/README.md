# Release site

Move an initiative's current committed source onto its production ChatGPT Site.
This is the only thing in the repository that writes production, and it runs
only when you ask for it.

```text
Release tide-here to production.
```

```text
Ship the current bookmark sorter site.
```

## The gate

The release stops — reports and does nothing — when:

- the source directory has uncommitted changes, or has never been committed.
  Production is released from committed files, so the commit recorded against
  the release is a real reference you can go back to;
- the build or the smoke check fails. The smoke check requests `/` from a
  staging server and compares it byte-for-byte with the source `index.html`.

The first of those is enforced by code: `initiatives.mjs sites <slug> plan
--env prod` exits non-zero, and the skill is not allowed to deploy past it.

The gate does *not* require that the same commit went to the test Site first.
That was considered and left out deliberately — but when test is ahead of
production, the test deploy says so.

## What it records

On success the release writes back to `initiative.json`: the production URL,
access, version number, deployment time, and the released commit. It also
appends a line to the initiative's `log.md`, because a release is a fact about
the initiative.

Access for a brand-new production Site is never inferred — the skill asks for
`public` or `private`. A replacement keeps whatever access the Site already has.

Both URLs, test and production, are in every receipt.
