# Phase 12: global coverage Stage 4

Stage 4 implements the offline FES-shaped preparation contract, versioned tile
inventory, checksum and size gates, stored lookup, and approximate forecast
adapter. It does not change the current Tide Here page.

## What is complete

- `prepare-fes.mjs` converts a versioned source extract into immutable harmonic
  tiles and a small coastal index. Each index entry records its exact object
  name, bounds, point count, encoded size, and SHA-256 checksum.
- `/init` verifies the complete prepared inventory before writing it, stores
  every versioned object, activates the exact Australian and fallback datasets,
  and activates the Stage 4 provider registry last. A second call writes
  nothing.
- The runtime reads the index first, loads only candidate coastal tiles, rejects
  missing or inland coverage, derives five days of high/low events, converts
  centimetres to the normalized metre contract, and labels every result
  approximate and not for navigation.
- NOAA, CHS, and Australian national providers still outrank the global
  fallback. Other future national sources still require only a registry entry
  and adapter, not a gateway branch.

## Fixture and licensed-data boundary

The committed three-tile artifact is deliberately not FES2022. Brest reuses
the TICON-3 constants from the official PyFES example; Galway and Cape Town are
synthetic transformations used only to exercise separate index tiles. No
FES2022 atlas value is committed, and the provider remains `fixture`.

The preparer accepts a production artifact only when its metadata identifies a
licensed source, FES2022, a source URL, attribution, and licence reference, and
when every point has at least 34 constituents. Real activation remains blocked
on the AVISO files and credentials plus held-out comparisons against official
national ports. The existing Brest comparison proves engine compatibility, not
FES2022 accuracy.

## Offline preparation

The licensed download and NetCDF extraction happen outside the Site runtime.
Their output uses `tide-here/fes-source-extract/v1` and is prepared with:

```sh
node initiatives/tide-here/work/phase-12/scripts/prepare-fes.mjs source-extract.json > prepared.json
```

The resulting artifact is reviewed and compared before it is committed or
uploaded. `/init` never opens SFTP, downloads an atlas, decompresses files, or
runs PyFES. Ordinary forecast requests only read initialized R2 objects.

## Run it

```sh
node --test initiatives/tide-here/work/phase-12/test/*.test.mjs
```
