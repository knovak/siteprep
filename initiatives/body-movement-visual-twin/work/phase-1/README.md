# Phase 1 — movement contract

This phase locks one movement record shape before viewer work starts. The
contract keeps geometry, tradition-specific teaching information, anatomical
claims, safety, provenance, and review status separate enough that one can be
changed or removed without silently changing the others.

## Files

- `movement.schema.json` is the JSON Schema for one record. The root
  `tradition` selects one of three incompatible `instruction` shapes instead of
  flattening them into generic prose.
- `src/validate-movement.mjs` applies the schema and the cross-record rules JSON
  Schema cannot express alone: phase anchors resolve, anatomy names occur in
  the Phase 0 asset manifest, geometry is not embedded in movement records,
  and force/load/activation/grading fields are forbidden.
- `fixtures/` contains one small, project-authored example for Feldenkrais,
  yoga, and Alexander Technique. The wording is invented for this validation
  fixture and does not reproduce a lesson, class, teacher text, or recording.
- `scripts/validate-fixtures.mjs` is the build-facing validator for the three
  committed fixtures.
- `test/movement-contract.test.mjs` pins the phase exit: all three records pass;
  flattening, relabelling, missing provenance, over-claiming, dangling timing,
  unknown anatomy, and embedded geometry fail with specific messages.

## Record boundary

Every movement owns its `source` block. There is no shared source table and no
source identifier in another record, so removing a movement removes its source
without corrupting the rest of the collection. Removing the `source` block from
a surviving movement is an explicit validation error.

The record contains only `asset_manifest`, a path to the shared Phase 0
manifest. Joint and muscle references are names checked against that manifest;
movement records cannot introduce a mesh or geometry path. This keeps anatomy
asset replacement separate from authored movement meaning.

Review begins at `unreviewed`. A later reviewer may set `reviewed` or
`disputed`, with reviewer and date required for either result. Every fixture's
rights basis stays visibly `provisional:` until the separate publication-rights
decision is made.

## Run

From the repository root:

```sh
node initiatives/body-movement-visual-twin/work/phase-1/scripts/validate-fixtures.mjs
node --test initiatives/body-movement-visual-twin/work/phase-1/test/movement-contract.test.mjs
```

Both commands use only Node built-ins. They load the Phase 0 reference rig as
the current anatomy manifest and do not fetch a schema package or network
resource.
