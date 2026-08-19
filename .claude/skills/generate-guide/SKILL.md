---
name: generate-guide
description: Generate and verify the repository guide description, slide deck, and lifecycle simulator. Use when someone asks to create, refresh, regenerate, or check the Repo Guide artifacts before sharing them.
---

# Generate the Repo Guide

Run from the repository root. Treat generation and verification as one action:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs description
node initiatives/repo-guide/work/guide/build/cli.mjs deck
node initiatives/repo-guide/work/guide/build/cli.mjs simulator
```

Do not pass `--skip-browser-check`. Each command must generate its artifact and
then complete its offline browser checks before the run is successful.

The three outputs are:

- `initiatives/repo-guide/work/guide/out/description.html`
- `initiatives/repo-guide/work/guide/out/deck.html`
- `initiatives/repo-guide/work/guide/out/simulator.html`

After all three commands pass:

1. Confirm that all three files exist.
2. Run `git diff --check -- initiatives/repo-guide/work/guide/out`.
3. Run `git status --short --untracked-files=all -- initiatives/repo-guide/work/guide/out`
   and report which tracked artifacts changed.
4. Include changed files under `out/` in the same commit as the source changes
   that produced them so the repository keeps the latest successful generation.
5. Report the three output paths, their source commit, and any diagnostics from
   the generator.

If any command fails, stop. Report the complete error and do not describe the
guide as refreshed. A fact-resolution error is actionable output: name the fact
key and source printed by the generator. Do not substitute a default, edit the
generated files, or retry with browser checks disabled.

Do not hand-edit files under `initiatives/repo-guide/work/guide/out/`. The
generator writes only there. It reads repository process sources, including
protected paths, but never writes them.
