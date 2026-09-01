# Phase 0 — portable custody core

Phase 0 proves that Knowledge Pipeline records can enter one accepted-change
boundary, produce an auditable receipt, leave as a canonical package, and
restore into an independent SQLite store without database-row identity or a
hosting product. It deliberately contains no workflow screen, live source,
model call, Site binding, D1/R2 adapter, or deployment.

## Implemented checkpoints

1. **Envelope and minimum fixture.** Versioned JSON Schemas, canonical JSON,
   SHA-256 content identities, stable findings, configured limits, an 18-source
   project-authored fixture, and a fixed-seed 10,000-entity scale fixture.
2. **Immutable repository and receipts.** SQLite stores full logical records
   without exposing row ids. Import preview pins mode, target scope, package
   hash, operation id, and current-state fingerprint. Commit is one transaction;
   injected failure rolls it all back, and repeating an operation returns the
   one durable receipt.
3. **Relationships and package round trip.** The fixture includes duplicate,
   syndication, update, contradiction, and two-topic relationships. Export uses
   logical ids and a canonical manifest; restore, merge, and explicit copy are
   distinct. Copy deterministically remaps entities, versions, activities,
   receipts, and both relationship endpoints.
4. **Hostile input, migration, and scale.** ZIP metadata is inspected before
   extraction for byte, entry, path-depth, compression-ratio, traversal,
   normalized collision, link, special-file, and expansion limits. Assets are
   checksum-verified; restricted assets cannot carry bytes. A version-0 fixture
   migrates only after the caller confirms a verified backup restore, while an
   unsupported future format is refused unchanged.

## Run it

From this directory:

```bash
npm ci
npm test
npm run round-trip
```

The round-trip command creates two independent temporary SQLite databases,
imports the fixture into the first, writes and rereads a `.kp.zip`, restores it
into the second, compares every portable entity, version, relationship,
activity, receipt, and asset record, then proves same-package merge creates no
new logical record. Temporary databases and the package are removed afterward.

## Contract and file responsibilities

- `schemas/` — reviewable v1 shapes for packages, entities, versions,
  relationships, activities, and receipts. Runtime validation adds reference,
  hash, rights, and configured-limit checks that JSON Schema alone cannot.
- `src/canonical.mjs` — sorted portable JSON and algorithm-prefixed SHA-256
  identities. It refuses non-finite values, unsupported values, and cycles.
- `src/validate.mjs` — trusted-field projection and stable findings. Unknown
  top-level fields are warnings and never enter accepted canonical state;
  namespaced extensions round-trip.
- `src/repository.mjs` — the adapter-independent accepted-commit behavior,
  implemented first with local SQLite. `previewImport` and `commitImport` are
  the only accepted package path.
- `src/zip.mjs` and `src/package.mjs` — bounded ZIP inspection, asset checksum
  enforcement, package read/write, and a low-allocation canonical-manifest
  writer used by the scale test.
- `src/fixture.mjs` — rights-safe end-to-end and scale fixtures with fixed clock
  and seed.
- `src/migration.mjs` — the first old-to-current migration and its backup gate.
- `test/` — identity, validation, rollback, idempotency, copy, stale preview,
  logical restore, hostile ZIP, checksum, migration, future-version, and scale
  evidence.

## Current limits

`src/limits.mjs` pins the plan's 25 MiB manifest, 250 MiB package, 100,000
record-operation, depth-32, and 1 MiB entity-content limits. The Phase 0 ZIP
container additionally caps entry count, per-entry size, total expanded size,
and compression ratio before decompression. The package writer currently emits
stored ZIP entries; the reader accepts stored and deflated entries after the
same metadata gate.

## Evidence and remaining boundary

The fixture carries exactly 18 source entities plus two topics, seven accepted
or disputed relationships, one genesis activity, one portable receipt, one
project-authored asset, and one unknown namespaced extension. The scale test
streams a canonical 10,000-entity manifest and records its byte and heap budget
as a test assertion.

Phase 1 must implement the same repository and blob contract against hosted D1
and private R2, including crash/restart failure injection. This local result
does not claim hosted atomicity, authentication, authorization, public Site
deployment, or a user interface. It also does not create the later heartbeat
automation.
