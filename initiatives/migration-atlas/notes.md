# Adoption provenance

Adopted on 2026-09-07 from repository path `demos/world_migration_atlas/`, last changed at commit `37e1a5f1306b1386562e95133580547c3490d38a`. All nine files are copied unchanged into `work/`; no production file is moved or deleted. This preserves the existing public demo while establishing the initiative source for future maintenance and test deployment.

| File within `work/` | Bytes |
| --- | ---: |
| `data/basemap/land110.json` | 86750 |
| `data/basemap/land50.json` | 1016502 |
| `data/migrations.json` | 44464 |
| `dist/migration-atlas.html` | 1254652 |
| `index-initial.html` | 1254896 |
| `index.html` | 1254896 |
| `prompts.html` | 8703 |
| `prompts.txt` | 5217 |
| `src/index.html` | 16809 |

`adoption-manifest.json` in the initiative source records the full SHA-256 hash for each file and the two unchanged attachments, plus the supplied README hash. It is a provenance record, not executable code. The original README is retained as the final section of the current README without editing its content.

The files named `index.html` and `index-initial.html` are identical in the adopted demo; `dist/migration-atlas.html` is a distinct original artifact and is preserved separately. No bundle is regenerated. The dataset has 48 migration records. `src/index.html` is a development shell, not a complete development tree. Additional code found alongside the named attachments in the download folder is outside the adopted repository source and has not been substituted for it.

The supplied specification and plan retain their July 2026 titles, version, original 44-entry research list, historical directory names, and later E1–E7 extensions. Current navigation and source-location explanations live in the README and other initiative documents so those originals remain intact.

The deployment includes an empty `prod` record to identify the existing released demo. Its pre-initiative release timestamp and source commit are unknown; this adoption does not invent a release receipt or create `releases.md`. The deployment planner therefore reports “released, but the released commit is unknown.” Its static file counter excludes `dist/`; the complete copied snapshot and build preview contain nine files, as listed above.
