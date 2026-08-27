---
name: deploy-demo
description: Copy a complete folder from elsewhere in the SitePrep repository into one immediate subdirectory of demos/, replacing an existing demo atomically when necessary, and register its title, description, root HTML file, and optional local or web links for the generated Demo TOC. Use when the user asks to deploy, publish, promote, graduate, copy, or refresh repository material as a standalone demo.
---

# Deploy a repository folder as a demo

Copy the source tree without editing it, then add `demo.json` in the destination
as the build's source of truth for the Demo TOC entry.

## Where this fits

This is a deployment engine: it copies a folder into `demos/` and registers it.
Copying into `demos/` **is** the production release for a demo - the demo goes
live when the branch merges and Pages publishes - so for a folder that belongs
to an initiative, do not call this directly. `$release-initiative` decides when
production moves and calls this; `$deploy-test` never does.

Called directly for material outside `initiatives/`, this skill is the whole
job and there is nothing above it.

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

A replacement rewrites `demo.json` wholly from the arguments above, so the two
fields the Demo TOC reads but no flag sets - `initiative` and `featured` - are
**carried across from the demo being replaced** and reported in the output. Set
either by editing `demo.json` once; every later redeploy keeps it. An existing
manifest that cannot be read, or a value the build would reject, is reported on
stderr and skipped rather than blocking the deploy - so check the output for a
line naming a field that was not carried.

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
- Never hand-restore `initiative` or `featured` after a deploy without first
  reading the output: the helper carries them, and a line saying one was not
  carried is naming a problem rather than asking for a repair.
- Never accept a destination outside `demos/` or below another demo folder.
- Never remove or rename files in the source.
- Never invent a root HTML file, title, description, or link label.
- Stop before replacement if any supplied local link is missing from the source.
- Preserve unrelated working-tree changes and report unexpected overlaps.
