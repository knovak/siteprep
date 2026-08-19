# Deploy to ChatGPT Sites

This repository-scoped skill publishes an already-built static website to
ChatGPT Sites. It lives under `.claude/skills/` with every other skill in this
repository, and `.agents/skills/deploy-to-chatgpt-sites` symlinks to it so Codex
finds it at the path it expects. Either way it is available while working
anywhere in this repository, including within an initiative.

## Inputs

Invoke `$deploy-to-chatgpt-sites` with:

- a directory containing a root `index.html` and any CSS, JavaScript, images,
  or data files it needs;
- `new` or `replacement`;
- `public` or `private` for a new Site; or
- the exact existing Site to replace.

For example:

```text
Use $deploy-to-chatgpt-sites to publish initiatives/example/work/site as a new
private Site.
```

```text
Use $deploy-to-chatgpt-sites to replace https://example.site/ with the static
files in demos/example.
```

The skill returns a deployment receipt with the live URL, access level,
deployment time and version, file count, deployment size, and cleanup status.

## Isolation guarantees

The source directory is treated as read-only. Every deployment creates a new,
uniquely named workspace under the system temporary directory. All generated
files—including `node_modules`, `dist`, `.vinext`, `.wrangler`, package files,
test files, the temporary Git repository, and the deployment archive—stay in
that workspace, outside the source repository.

The skill never reuses a workspace. Parallel and back-to-back deployments
therefore cannot share dependencies, build output, Git state, archives, ports,
or credentials. The temporary workspace is removed after every terminal
outcome, and the skill verifies that the source repository's status is
unchanged.

## Contents

- [`SKILL.md`](SKILL.md) defines the complete deployment workflow and safety
  checks.
- [`scripts/prepare-static-site.sh`](scripts/prepare-static-site.sh) creates and
  prepares a unique isolated project.
- [`scripts/cleanup-deployment-workspace.sh`](scripts/cleanup-deployment-workspace.sh)
  removes only a validated deployment workspace.
- [`assets/`](assets/) contains the static-site adapter installed into the
  temporary Sites project.

The deployment requires access to ChatGPT Sites and a source directory without
symlinks or secret-like files. A replacement preserves the existing Site's
access settings.
