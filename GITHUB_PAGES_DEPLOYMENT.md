# GitHub Pages deployment

The `Build and Deploy GitHub Pages` workflow publishes the `main` branch at the
site root. Other branches are published below `branch/`, with slashes in the
branch name replaced by hyphens.

Every deployment reconciles the preview directories on `gh-pages` with the
branches currently present in the repository. A preview directory is removed
when no corresponding branch exists. The separate `Cleanup Branch Preview`
workflow also removes a preview immediately when GitHub emits a branch deletion
event; deployment-time reconciliation covers deletions whose events were missed
or which predate that workflow.
