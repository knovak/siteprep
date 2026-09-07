# Provenance

Two packages make up this initiative, adopted on 2026-09-07.

## The published demo, adopted as `work/`

From `demos/world_migration_atlas/`, introduced by commit
`04de6ead060bd230b242a320279e943708cb2ae2` (2026-09-03).

An earlier version of this file and of `adoption-manifest.json` named
`37e1a5f1306b1386562e95133580547c3490d38a` as the source commit. That object
does not exist in this repository and never did: `git cat-file -t` cannot
resolve it and it appears in no branch. It was a branch commit that this
repository's squash merge discarded - the failure mode
`INITIATIVES_TECHDOC.md` describes under "Currency". The commit above is the one
`git log -- demos/world_migration_atlas` reports, and it resolves.

## The development package, adopted as `lib/`

From `migrationatlascomplete2.zip`, supplied by the user on 2026-09-07 as the
complete July 2026 code base. 28 files; SHA-256
`645c73d88b84d9b70eb602a1807b284ef217f89e6e1d5afbd9f0a8ee68d40969`. Everything
in it is committed under `lib/` except its three markdown documents, which the
first adoption had already taken as `spec.md`, `plan.md` and the preserved
section of `README.md`.

Those three hashes were recorded before the package arrived and could not be
checked against anything. All three now match the package byte for byte, which
is what `adoption-manifest.json` records under `documents[].verified_against_package`.

The package's `data/` files are identical to the ones the demo shipped, and its
`data/migrations.json` holds the same 48 records the bundle inlines. Its
`dist/migration-atlas.html` and `src/index.html` differ from the demo's copies:
the package is the state of the source before the branding edits listed in
`decisions.md` were made to the bundle. Those edits are ported into `lib/src/`,
so the build reproduces the published `work/index.html` exactly.

`lib/data/basemap/ne_50m_land_raw.geojson` is an upstream input that nothing
reads and no script regenerates. It is kept as the only record of where the
basemap came from.

## Two things to know before the next release

`demos/world_migration_atlas/` has no `demo.json`. Its title, description and
the two tutorial links are hardcoded in `scripts/build.sh`, in
`get_demo_description`. `release-initiative` runs `deploy-demo`, which writes a
`demo.json` into the destination - so after the first release the demo will have
two sources for the same index entry, and the hardcoded branch wins. Nothing
breaks; it is worth knowing rather than rediscovering.

`spec.md` and `plan.md` are preserved originals and are not edited to match this
repository's writing-style rules. Wording in them that those rules discourage is
July 2026 text, not a lapse to correct.
