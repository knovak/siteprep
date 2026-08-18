---
name: deploy-to-chatgpt-sites
description: Deploy an already-built static website directory containing index.html and optional CSS, JavaScript, images, or data files to ChatGPT Sites. Use when Codex must publish a static folder as a new public or private Site, or replace an existing Site while preserving its access settings, and return the live URL, deployment time, version, file count, and deployment size. Do not use to design or edit the website itself.
---

# Deploy a static folder to ChatGPT Sites

Publish the supplied files unchanged through the bundled Sites workflow. Treat
the source directory as read-only. Create every generated adapter, dependency,
build, test, Git, and archive file in one unique system-temporary workspace.

## Required inputs

Resolve these before creating or changing a Site:

- `source_directory`: the directory to publish. Require a root `index.html`.
- `mode`: `new` or `replacement`.
- For `new`: require `access` as `private` or `public`. Derive the title from the
  HTML title or directory name and derive one valid slug; ask only if that slug
  conflicts or the derived title is unusable.
- For `replacement`: require an unambiguous existing Site target. Use an
  existing read-only `source_directory/.openai/hosting.json` when available;
  otherwise require the user to select an exact Site. Do not infer by title or
  slug and do not change access.

If `mode` or a required new-Site access value is missing, ask one concise
question. Never infer public access.

## Protect the source repository

Before preparation:

1. Resolve the source to an absolute path and require a regular root
   `index.html`.
2. Reject symlinks and secret-like files. Never publish `.env*`, private keys,
   credentials, `.git`, `node_modules`, or `.openai` as web assets.
3. If the source is inside a Git repository, record its exact repository root
   and complete `git status --porcelain=v1 -uall` output. Never run build, npm,
   package, or staging Git commands in that repository.
4. Read an existing source `.openai/hosting.json` only to identify a replacement
   Site. Never create, edit, or delete it. For `new`, stop if it already has a
   `project_id`.

The source directory must have the same Git status after preparation, build,
deployment, and cleanup. If it changes, stop and report the unexpected paths;
never discard user changes automatically.

## Create one isolated workspace per deployment

Locate the active bundled Sites plugin's `scripts/init-site.sh`, then run:

```bash
scripts/prepare-static-site.sh SOURCE_DIRECTORY INIT_SITE_SCRIPT
```

The helper atomically creates a unique `/tmp/chatgpt-sites-deploy.XXXXXX`
workspace and prints:

- `WORK_DIR`: the run's exclusive temporary root;
- `PROJECT_DIR`: `WORK_DIR/project`, an independent Git repository;
- `ARCHIVE_PATH`: `WORK_DIR/site-package.tgz`, outside that Git repository;
- the static file count and size.

Never supply or reuse a workspace path from an earlier run. Require all three
paths to have the exact relationship above and require
`git -C PROJECT_DIR rev-parse --show-toplevel` to equal `PROJECT_DIR`. The
helper removes unused starter database, migration, example, and test content;
copies the supplied static files without `.git`, `.openai`, or dependencies;
and installs the static adapter from `assets/`.

`mktemp` makes parallel and back-to-back deployments independent. Each run has
its own `node_modules`, package files, `dist`, `.vinext`, `.wrangler`, Git
metadata, and archive; no path may be shared between runs.

## Validate the isolated project

1. Run all npm, build, and test commands with `PROJECT_DIR` as the working
   directory. Never run them from the user's repository.
2. Confirm `node_modules`, `dist`, `.vinext`, and `.wrangler` are ignored by the
   temporary repository. Keep `ARCHIVE_PATH` outside `PROJECT_DIR`.
3. Run `npm run build`. Fix adapter or compatibility failures only; never alter
   the user's site content to make a failed build pass.
4. Start the staging server long enough to request `/`; require a 200 response
   and compare the response body byte-for-byte with the source `index.html`.
   Use a dynamically assigned port so concurrent deployments do not collide.
5. Recheck the source repository status and require it to match the baseline.

## Link the Site inside the temporary project

For a new Site:

1. Create it exactly once.
2. Immediately write its returned opaque ID unchanged as `project_id` in
   `PROJECT_DIR/.openai/hosting.json` only. Never write deployment metadata into
   the source directory.
3. Leave a private Site owner-only. For a public Site, change access to `public`
   because the required `public` input is explicit authorization.

For a replacement:

1. Resolve the exact existing Site, then write its `project_id` only into the
   temporary project's `.openai/hosting.json`.
2. Inspect the Site and verify its URL, title, current user role, and access.
3. Preserve access exactly. If it is shared or public and the request did not
   explicitly acknowledge that audience, confirm the live audience before
   deploying.

Rebuild after writing the real `project_id`, because the packaged build and
hosting manifest must agree.

## Commit only to the Sites staging repository

Sites versions require a source commit. This commit is unavoidable but must
exist only in `PROJECT_DIR` and the Sites-managed remote, never in the user's
repository.

1. Use `git -C PROJECT_DIR` for every Git operation. Never rely on the current
   directory for `git add`, `commit`, `push`, or `rev-parse`.
2. Reconfirm the temporary Git root before adding files.
3. Add the isolated source, then inspect the staged path list. Fail if it
   contains `node_modules`, `dist`, `.vinext`, `.wrangler`, the archive, or any
   path outside `PROJECT_DIR`.
4. Commit and push that exact temporary source state using the short-lived Sites
   credential as directed by the bundled `sites-hosting` skill. Never add a
   remote or credential to the user's repository.
5. Use the pushed temporary branch-head SHA as the version `commit_sha`.

## Package, deploy, and clean up

Follow `sites-hosting` for packaging, version saving, deployment, and polling:

1. Package `PROJECT_DIR` to the exact sibling `ARCHIVE_PATH` printed by the
   helper. Save exactly one version from the pushed commit and that archive.
2. Use the verified owner-only deployment operation for an owner-only Site. Use
   the general deployment operation for a public/shared Site only after the
   approval rule above is satisfied.
3. Poll until deployment succeeds or fails. On success, verify the live URL and
   access and open the deployed Site when that handoff is available.
4. On every terminal outcome, run
   `scripts/cleanup-deployment-workspace.sh WORK_DIR`. The cleanup helper refuses
   any path outside the unique deployment prefix. Verify `WORK_DIR` no longer
   exists and recheck that the source repository status matches the baseline.

Never reuse a failed workspace, archive, build, Git repository, or credential.
Do not retry a terminal error as a different Site.

## Report the outcome

Return a compact deployment receipt containing:

- live URL, Site title, and slug;
- `new` or `replacement` and verified access;
- deployment timestamp with timezone and saved version number;
- archive size in bytes and a human-readable unit, preferring the server value;
- archive file count when returned;
- source directory and static-file count;
- confirmation that the isolated workspace was removed and the source
  repository was unchanged.

If Sites omits archive metrics, label local archive measurements as fallbacks.
Do not expose credentials, repository tokens, opaque IDs, or temporary paths.
