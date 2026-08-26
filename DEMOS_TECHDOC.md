# Demos publishing techdoc

The build now treats `demos/` as a second static web-content source alongside `decks/`.

## Source layout

Each immediate subdirectory of `demos/` is published as a standalone demo directory. The build does not transform those demo files; it copies the directory tree into `gh-pages/demos/` so a source path like:

```text
demos/world_migration_atlas/index.html
```

is published as:

```text
gh-pages/demos/world_migration_atlas/index.html
```

and is available on GitHub Pages under `/siteprep/demos/world_migration_atlas/`.

Use `.claude/skills/deploy-demo/` to create or replace a demo from a complete
folder elsewhere in the repository. Its helper copies the source tree and adds
`demo.json` to the destination:

```json
{
  "title": "Example Demo",
  "description": "Explore the example interactively.",
  "root": "index.html",
  "links": [
    { "label": "Project website", "href": "https://example.com/" },
    { "label": "Source notes", "href": "notes.html" }
  ]
}
```

`root` may identify a nested or differently named HTML file when the copied
folder has no top-level `index.html`. Local link targets are relative to the
demo directory; external targets use HTTP or HTTPS. The build validates the
manifest and fails when the root or a local linked file is missing. When a link
label occurs in the description, the build links that phrase in place; labels
that do not occur there are listed beneath the description.

## Demos index

`scripts/build.sh` generates `gh-pages/demos/index.html`. The index lists every immediate subdirectory of `demos/` with:

- a link to the `demo.json` root when metadata is present, otherwise to the demo's `index.html` directory URL or a readable file such as `README.md`
- a display title from `demo.json` when present, otherwise from the demo's `index.html` `<title>`, falling back to a titleized directory name
- a description from `demo.json` when present, otherwise from the first non-heading, non-empty line of the demo's `README.md`, falling back to a generic demo description
- optional local or web links from `demo.json` when metadata is present
- curated descriptions for special demos that need stable tutorial/version/code-folder links (`world_migration_atlas` and `SBDC Night Sky`)
- an additional "Prompt history" link when the demo directory contains a top-level `prompts.txt` file; when a formatted `prompts.html` is also present, the main link opens that page and a parenthetical "text" link opens the original text file


## Validation

`scripts/build_tests.sh` includes build-time checks that verify:

- `gh-pages/demos/` exists when source demos are present
- `gh-pages/demos/index.html` is generated
- every immediate source demo directory is copied
- every source demo directory is linked from the demos index
- copied demo source files are byte-for-byte unchanged in the output

These run as part of `npm run build`; see BUILD_TECHDOC.md for the build,
browser setup, and screenshot workflow.
