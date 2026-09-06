# GitHub Pages deployment

This document covers the workflow's `deploy` job - what happens to the built
site. BUILD_TECHDOC.md covers the `build` job that produces it.

The `Build and Deploy GitHub Pages` workflow publishes the `main` branch at the
site root. Other branches are published below `branch/`, with slashes in the
branch name replaced by hyphens.

`deploy-record/**` branches are excluded from the workflow's `push` trigger.
One of those carries a deploy record waiting for the initiative's next pull
request to fold it in, changes no page, and would otherwise cost a full build
and deployment per deploy. See "Where a record lands" in
`INITIATIVES_TECHDOC.md`.

Every deployment reconciles the preview directories on `gh-pages` with the
branches currently present in the repository. A preview directory is removed
when no corresponding branch exists. The separate `Cleanup Branch Preview`
workflow also removes a preview immediately when GitHub emits a branch deletion
event; deployment-time reconciliation covers deletions whose events were missed
or which predate that workflow.

## Publishing and deployment recovery

The workflow itself only commits the built site to `gh-pages`. Publishing that
commit is done by `pages build and deployment`, a workflow GitHub generates for
repositories whose Pages source is a branch; it is not stored in this repository
and cannot be configured here. It fails from time to time for reasons unrelated
to the site content (`Invalid actions OIDC token ...`, `Failed to resolve action
download info`), and nothing retries it, so the commit that was pushed silently
never reaches the live site while the deploy job stays green.

Two scripts make the deployment recover from this:

- `scripts/push_gh_pages.sh` pushes the `gh-pages` checkout, replaying the
  deployment commit onto the branch and retrying when a deployment for another
  branch pushed first. Deployments touch disjoint directories, so the only file
  that can conflict is the generated `index-versions.html`; the conflict is
  resolved in favour of the deployment being pushed and the next deployment
  regenerates the file.
- `scripts/wait_for_pages_deployment.sh` waits for the Pages deployment of the
  commit that was just pushed. A failed deployment is recovered by pushing an
  empty commit to `gh-pages`, which makes the Pages service start a fresh
  deployment of the same tree - re-running the failed deployment tends to fail
  again because it re-uses the original deployment context. A deployment that
  was cancelled or superseded by a newer one is not an error. After two
  unsuccessful recovery attempts the deploy job fails, so a genuine outage is
  visible in this workflow instead of leaving a stale site.

The deploy job needs `actions: read` to look up those deployment runs. The
scripts are copied to `/tmp/deploy-scripts` before the job switches to the
`gh-pages` checkout, where `scripts/` does not exist.

The generated `index-versions.html` page presents each available version as a
card with the version title linked directly to that version. The card
description remains below the title; separate "View ..." links are omitted so
there is only one version link per card.
