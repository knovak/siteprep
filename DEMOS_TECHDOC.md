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

## Validation

`scripts/build_tests.sh` includes build-time checks that verify:

- `gh-pages/demos/` exists when source demos are present
- `gh-pages/demos/index.html` is generated
- every immediate source demo directory is copied
- every source demo directory is linked from the demos index
- copied demo source files are byte-for-byte unchanged in the output
