# Demos publishing techdoc

The build now treats `demos/` as a second static web-content source alongside `decks/`.

## Source layout

Each immediate subdirectory of `demos/` is published as a standalone demo directory. The build does not transform those demo files; it copies the directory tree into `gh-pages/demos/` so a source path like:

```text
demos/migration_map/index.html
```

is published as:

```text
gh-pages/demos/migration_map/index.html
```

and is available on GitHub Pages under `/siteprep/demos/migration_map/`.

## Demos index

`scripts/build.sh` generates `gh-pages/demos/index.html`. The index lists every immediate subdirectory of `demos/` with:

- a link to the demo's `index.html` directory URL when present, otherwise a readable file such as `README.md`
- a display title from the demo's `index.html` `<title>`, falling back to a titleized directory name
- a description from the first non-heading, non-empty line of the demo's `README.md`, falling back to a generic demo description
- curated descriptions for special demos that need stable tutorial/version/code-folder links (`migration_map` and `SBDC Night Sky`)
- an additional "Prompt history" link when the demo directory contains a top-level `prompts.txt` file; when a formatted `prompts.html` is also present, the main link opens that page and a parenthetical "text" link opens the original text file


## Validation

`scripts/build_tests.sh` includes build-time checks that verify:

- `gh-pages/demos/` exists when source demos are present
- `gh-pages/demos/index.html` is generated
- every immediate source demo directory is copied
- every source demo directory is linked from the demos index
- copied demo source files are byte-for-byte unchanged in the output

Run the complete build and its validation once, after the final source change:

```sh
npm ci
npm run build
```

There is no need to run `scripts/build_tests.sh` separately because
`scripts/build.sh` invokes it before reporting success.

## Browser setup and screenshots

The repository pins Playwright to the version in `package-lock.json` and exposes
the project-local CLI through npm scripts. On a new development image, install
Chromium and its system libraries once:

```sh
npm run setup:browsers
```

After the final source edit and `npm run build`, capture a generated page with:

```sh
npm run screenshot -- \
  --device="Desktop Chrome" \
  --full-page \
  "file:///workspace/siteprep/gh-pages/demos/RMD%20calculator/prompts.html" \
  /tmp/rmd-prompts.png
```

Replace the input URL and output filename as appropriate. Screenshots under
`/tmp` are ephemeral; use a deliberate artifact directory when the image must
survive an environment recycle. Display the saved image for inspection and
report its exact path when summarizing the work.
