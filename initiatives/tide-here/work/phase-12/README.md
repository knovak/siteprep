# Phase 12: global coverage Stage 4

Stage 4 implements the offline FES2022 preparation contract, versioned tile
inventory, checksum and size gates, stored lookup, approximate forecast adapter,
and the model-point resolver used by the Tide Here page when official catalogue
coverage declines or only distant, ambiguous official choices are available.

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
- `POST /resolve` selects the nearest initialized model point only for the
  active FES descriptor. The runtime dataset contains validated points near
  Maroochydore, Bundaberg, Cooktown, Brest, Galway, Gibraltar, and Cape Town,
  each with a 20 km maximum selection radius.
- NOAA, CHS, and Australian national providers still outrank the global
  fallback. Other future national sources still require only a registry entry
  and adapter, not a gateway branch.

## Licensed-data boundary

The active runtime artifact is a small adapted extract from the FES2022b native
non-structured ocean-tide atlas. It contains 34 native-mesh harmonic constants
at each of seven reviewed water points—not the source grid—and records the
source file's exact 3,953,139,340-byte size and SHA-256 digest. The original
NetCDF is neither committed nor served. The earlier TICON-3-derived artifact
remains a deterministic test fixture and is never selected by the active
registry.

The preparer accepts a production artifact only when its metadata identifies a
licensed source, FES2022, source and licence URLs, attribution, a disclaimer,
the exact atlas size and SHA-256 checksum, and a nonzero PyFES quality flag with
an explicit interpolation or extrapolation method for every point. Every point
must contain all 34 FES2022 constituents.
The fixed held-out comparisons are the activation gate. On 2026-08-29 all 20
Maroochydore/Mooloolaba pairs were within 12.525 minutes and 0.040 m at worst;
all 20 Bundaberg pairs were within 20.710 minutes and 0.111 m. Heights compare
tidal shape after fitting one constant offset because FES uses mean sea level
while the Bureau tables use lowest astronomical tide.

## Offline preparation

The 3.95-GB native-grid download and NetCDF extraction happen outside the Site
runtime. Create an isolated Python environment with the pinned official PyFES
package, then extract the reviewed points through the native LGP2 mesh:

The current full atlas is not retained. If it must be downloaded again, keep
the verified file outside Git at
`../siteprep-data/tide-here/fes2022/FES2022b_OceanTide_NSgrid.nc` rather than in
`/tmp`; record the exact checksum beside it and reuse that file for later point
extractions. Only derived reviewed points belong in the repository or Site
storage.

```sh
python3 -m venv /tmp/tide-here-fes
/tmp/tide-here-fes/bin/pip install -r initiatives/tide-here/work/phase-12/data/requirements-fes2022.txt
/tmp/tide-here-fes/bin/python initiatives/tide-here/work/phase-12/scripts/extract-fes2022.py \
  initiatives/tide-here/work/phase-12/data/fes2022-validation-plan.json \
  initiatives/tide-here/work/phase-12/data/fes2022b-native.yaml \
  /path/to/FES2022b_OceanTide_NSgrid.nc \
  --output /tmp/fes2022-source-extract.json
```

The extraction plan contains the user-supplied Maroochydore and Cooktown
coordinates, Bundaberg, the reported Gibraltar gap, and three independent
model-path locations. Each geographic tile is
loaded with a bounded mesh window. The extractor converts the complex PyFES
native-mesh result to amplitude and Greenwich phase, records its signed quality
and method, and round-trips each rounded 34-constituent point through PyFES. A point fails
preparation if the reconstructed prediction differs from the atlas path by more
than 0.01 cm. The extractor marks the result as modified material and hashes the
original atlas without copying it into the repository.

At Cooktown, PyFES reports direct native-mesh interpolation using six mesh
points. At the other six shoreline and harbour coordinates it reports bounded
extrapolation using 30–39 mesh points. The configured atlas extrapolation
distance is 20 km, the same as the runtime point-selection guard. The
official-port comparisons below are what permit this deliberately narrow use.

The output uses `tide-here/fes-source-extract/v1`. Run the fixed official-port
comparison before generating the committed module, then prepare both a review
copy and the runtime source:

```sh
node initiatives/tide-here/work/phase-12/scripts/compare-fes-official.mjs \
  /tmp/fes2022-source-extract.json \
  /tmp/fes2022-official-comparison.json
node initiatives/tide-here/work/phase-12/scripts/prepare-fes.mjs \
  /tmp/fes2022-source-extract.json \
  --output /tmp/fes2022-prepared.json \
  --source-module initiatives/tide-here/work/phase-12/fixtures/fes-source-official.mjs
```

Only the small adapted harmonic-point module and comparison evidence are
committed after the comparison passes. The original AVISO NetCDF is never
committed or served. `/init` never opens SFTP, downloads an atlas, decompresses
files, or runs PyFES. Ordinary forecast requests only read initialized R2
objects.

The committed source identifies the FES2022 product DOI and AVISO licence,
attributes CNES, LEGOS, NOVELTIS, and CLS, labels the constants as transformed
material, and carries the source disclaimer into every forecast response.

## Run it

```sh
node --test initiatives/tide-here/work/phase-12/test/*.test.mjs
```
