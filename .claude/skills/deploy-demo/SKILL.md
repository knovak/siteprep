---
name: deploy-demo
description: Copy a complete folder from elsewhere in the SitePrep repository into one immediate subdirectory of demos/, replacing an existing demo atomically when necessary, and register its title, description, root HTML file, and optional local or web links for the generated Demo TOC. Use when the user asks to deploy, publish, promote, graduate, copy, or refresh repository material as a standalone demo.
---

# Deploy a repository folder as a demo

Copy the source tree without editing it, then add `demo.json` in the destination
as the build's source of truth for the Demo TOC entry.

## Required inputs

Resolve these before changing files:

- `source_directory`: an existing folder inside the repository.
- `destination_name`: the name of one immediate folder under `demos/`, not a
  path.
- `title`: the Demo TOC title.
- `description`: the Demo TOC description, as plain text.
- `root_html`: required only when the source has no top-level `index.html`.
  Interpret it relative to the source folder and preserve it at the same path in
  the destination.
- `links`: optional label/target pairs. A target must be a file in the copied
  demo, relative to its root, or an `http://` or `https://` URL.
  When a label appears in the description, link that phrase in place. Show a
  link beneath the description only when its label does not appear there.

Ask one concise question for any missing required value. Do not guess which HTML
file is the entry point when `index.html` is absent.

## Deploy

1. Read the repository's `AGENTS.md` and `DEMOS_TECHDOC.md`.
2. Inspect the source, the exact destination, and Git status. Treat the source
   as read-only. Reject overlapping source and destination paths.
3. Run the bundled helper from the repository root:

```bash
python3 .claude/skills/deploy-demo/scripts/deploy_demo.py \
  --source initiatives/example/work/site \
  --destination example-demo \
  --title "Example Demo" \
  --description "Explore the example interactively." \
  --root-html app.html \
  --link "Source notes" notes.html \
  --link "Project website" https://example.com/
```

Omit `--root-html` when the source has a top-level `index.html`. Repeat `--link`
for each link. The helper validates all inputs before staging a complete copy,
then creates or replaces `demos/<destination_name>` and writes its `demo.json`.
It preserves nested folders, dotfiles, file metadata, and symlinks.

4. Inspect the resulting destination. Confirm that every source path is present
   and that no files from an earlier destination remain. `demo.json` is the only
   expected extra or replaced file.
5. After all source changes are complete, run `npm run build` once. Do not edit
   `gh-pages/demos/index.html` by hand; it is generated.
6. Verify `gh-pages/demos/index.html` contains the supplied title, description,
   root link, and every optional link. Verify the copied root page opens with
   its local assets.
7. Because a deployed demo is a visible change, take screenshots of the demo
   root and the Demo TOC under `screenshots/`, display them, and report their
   paths.

## Guardrails

- Replace the destination as a whole; never merge trees or leave stale files.
- Never accept a destination outside `demos/` or below another demo folder.
- Never remove or rename files in the source.
- Never invent a root HTML file, title, description, or link label.
- Stop before replacement if any supplied local link is missing from the source.
- Preserve unrelated working-tree changes and report unexpected overlaps.
