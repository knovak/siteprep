# Phase 0 — contracts, fixtures, and portable scene core

This work area is the executable techdoc for the first Educational Global Maps
increment. It proves that exact, cited map inputs and a declarative scene can be
validated, stored immutably, changed through a pure reducer, exported to a
bounded ZIP bundle, and restored without the application or a data provider.
It deliberately contains no catalogue UI, renderer, provider adapter, relay, or
live network access.

## Checkpoints

1. **Identity.** `src/canonical.mjs`, the JSON Schemas, and the canonical test
   vectors define strict JSON parsing, NFC Unicode normalization, sorted keys,
   finite JSON numbers, UTC timestamps, absent-versus-null behavior, and
   `sha256:` content identities. Duplicate keys, ambiguous numeric spellings,
   normalized key collisions, and unknown required fields have stable findings.
2. **Repository.** `src/repository.mjs` stores exact immutable object versions
   in one canonical inventory. A candidate is fully validated in memory and a
   temporary file before one rename makes it accepted. Repeated acceptance is a
   no-op; a conflicting id, missing reference, future schema, or injected fault
   leaves the accepted inventory unchanged.
3. **Bundle.** `src/bundle.mjs` writes a deterministic stored ZIP, inspects the
   central directory before decompression, enforces entry, byte, ratio, depth,
   link, traversal, reserved-name, and normalized/case-folded collision limits,
   and verifies every permitted asset. Restricted assets remain references.
4. **Scene core.** `src/scene.mjs` validates compatibility and applies bounded,
   revisioned intents. Stale and duplicate intents do not change state. The
   fixture covers scalar, flow, point, and raster-frame profiles and restores
   the same scene and intent sequence from its bundle.

## Run it

From this directory:

```bash
npm ci
npm test
npm run round-trip
```

`round-trip` creates two independent repositories, accepts the minimum fixture,
exports `scene.egm.zip`, restores it, re-exports it, and compares the logical
inventories and the deterministic reducer result. The temporary repositories
and bundle are removed afterward.

## Canonicalization profile

- Input is UTF-8 JSON parsed before ordinary `JSON.parse` can discard duplicate
  members. Object keys and string values normalize to Unicode NFC; two keys
  that collide after normalization are refused.
- Keys sort by Unicode code point. Arrays retain order. `null` is retained and
  is distinct from an absent field. Undefined values and non-finite numbers are
  not portable. Signed zero canonicalizes to `0`.
- Strict text input accepts the ordinary JSON decimal grammar but refuses
  exponent notation and negative zero because those spellings are ambiguous at
  this boundary. Canonical output may use the shortest JSON decimal spelling.
- Contract timestamps use `YYYY-MM-DDTHH:mm:ss.sssZ`. Other offsets or
  precisions are refused rather than silently rewritten.
- Identities are `sha256:<lowercase hex>` over UTF-8 canonical JSON. The
  algorithm prefix makes a future digest change an explicit migration.

## Bundle limits

`src/limits.mjs` pins 128 entries, 5 MiB per entry, 20 MiB total expanded
bytes, a 100:1 compression ratio, path depth 12, and a 2 MiB manifest. Archive
paths must be relative forward-slash paths and may not contain links, special
files, platform-reserved components, dot segments, or NFC/case-folded
collisions. Import validates in a fresh staging directory and commits only the
canonical candidate inventory.

## Version policy

The schemas are closed, versioned envelopes. `scene/v0` is the one supported
old object: migration adds the explicit `camera` and `intentRevision` fields,
creates a new immutable `scene/v1` identity, and emits a deterministic receipt.
The source object remains unchanged. A future version is reported only by
bounded id/schema metadata and cannot enter the repository.
