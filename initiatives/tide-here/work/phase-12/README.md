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
  active FES descriptor. The active global runtime dataset contains 65,203
  sampled coastal points in 376 non-empty 10-degree tiles. Its plan uses
  approximately 15 km coastal spacing and a 40 km maximum place-to-point
  selection distance. The seven reviewed locations remain a committed
  validation extract, not the limit of deployed coverage.
- NOAA, CHS, and Australian national providers still outrank the global
  fallback. Other future national sources still require only a registry entry
  and adapter, not a gateway branch.

## Licensed-data boundary

The active runtime artifact is a 146,330,220-byte adapted coastal extract from
the FES2022b native non-structured ocean-tide atlas. It contains 34 native-mesh
harmonic constants at each of 65,203 reviewed water points—not the source
grid—and records the source file's exact 3,953,139,340-byte size and SHA-256
digest. The original NetCDF is neither committed nor served. The seven-point
FES extract remains a validation fixture, and the earlier TICON-3-derived
artifact remains a deterministic non-FES fixture; neither defines deployed
global coverage.

## Interpreting the runtime output

The runtime calculates astronomical harmonic extrema and converts FES heights
from centimetres to metres. Those heights are relative to the FES model's mean-
sea-level harmonic datum. They are not chart datum, lowest astronomical tide,
depth, clearance, or an observed water level, and absolute values from another
provider cannot be compared without establishing the datum offset. The selected
point's IANA zone controls the five local day rows and displayed event times.

The result identifies a sampled model point near the geocoded place rather than
an official station. It is suitable only as an approximate tide-pattern and
timing estimate. Weather, atmospheric pressure, storm surge, river discharge,
waves, and local harbour effects are outside FES and may materially move actual
levels and times. Every FES response therefore keeps `approximate-fallback`,
source/licence details, and the not-for-navigation-or-safety warning.

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

Keep the verified full atlas outside Git at
`../siteprep-data/tide-here/fes2022/FES2022b_OceanTide_NSgrid.nc` rather than in
`/tmp`; the resumable helper in that directory records and enforces the exact
size and checksum so later point extractions reuse the same download. The
licensed NetCDF never becomes a public Site asset. Only derived harmonic tiles
are uploaded to the Site's private R2 binding.

For global coastline coverage, `scripts/build-coastal-plan.py` samples retained
Natural Earth major- and minor-island coastlines at a fixed interval, assigns
current/future IANA zones from the retained Timezone Boundary Builder ocean
dataset, groups points into geographic extraction tiles, and records every
source checksum in the plan. The sources and generated plan stay outside Git;
the script is deterministic for the same inputs and arguments. A typical plan
uses 15 km sampling, a 40 km place-to-model selection limit, and 10-degree
extraction tiles:

```sh
../siteprep-data/tide-here/python-env/bin/python \
  initiatives/tide-here/work/phase-12/scripts/build-coastal-plan.py \
  --coastline ../siteprep-data/tide-here/coastline/ne_10m_coastline.geojson \
  --coastline ../siteprep-data/tide-here/coastline/ne_10m_minor_islands_coastline.geojson \
  --time-zones ../siteprep-data/tide-here/coastline/combined-with-oceans-2026c.json \
  --spacing-km 15 --maximum-distance-km 40 --tile-degrees 10 \
  --prepared-at 2026-08-29T00:00:00.000Z \
  --version 2026-08-29-global-coast-r1 \
  --output ../siteprep-data/tide-here/fes2022/fes2022-global-coastal-plan.json
```

```sh
/opt/homebrew/bin/python3.11 -m venv ../siteprep-data/tide-here/python-env
../siteprep-data/tide-here/python-env/bin/pip install \
  -r initiatives/tide-here/work/phase-12/data/requirements-fes2022.txt
../siteprep-data/tide-here/python-env/bin/python \
  initiatives/tide-here/work/phase-12/scripts/extract-fes2022.py \
  initiatives/tide-here/work/phase-12/data/fes2022-validation-plan.json \
  initiatives/tide-here/work/phase-12/data/fes2022b-native.yaml \
  /path/to/FES2022b_OceanTide_NSgrid.nc \
  --output /tmp/fes2022-source-extract.json
```

The same pinned environment includes Shapely only for the offline spatial
index used while assigning the retained IANA ocean time zones. It is not a Site
runtime dependency. Once the global plan and atlas are ready,
`scripts/extract-fes2022-global.py` writes resumable, checksum-addressed tile
files and an upload package outside Git:

```sh
../siteprep-data/tide-here/python-env/bin/python \
  initiatives/tide-here/work/phase-12/scripts/extract-fes2022-global.py \
  ../siteprep-data/tide-here/fes2022/fes2022-global-coastal-plan.json \
  initiatives/tide-here/work/phase-12/data/fes2022b-native.yaml \
  ../siteprep-data/tide-here/fes2022/FES2022b_OceanTide_NSgrid.nc \
  --output-directory ../siteprep-data/tide-here/fes2022/global-coast-r1
```

The extractor can be restarted without redoing completed tiles. Undefined
shoreline samples are omitted and recorded; the package must still contain at
least 1,000 points before the protected importer will activate it.

The extraction plan contains the user-supplied Maroochydore and Cooktown
coordinates, Bundaberg, the reported Gibraltar gap, and three independent
model-path locations. The extractor verifies and loads the atlas once, reuses
that model across geographic tiles, and batches each tile's atlas-path
validation. It converts the complex PyFES native-mesh result to amplitude and
Greenwich phase, records its signed quality and method, and round-trips every
rounded 34-constituent point through PyFES. A point fails preparation if the
reconstructed prediction differs from the atlas path by more than 0.01 cm. The
extractor marks the result as modified material and hashes the original atlas
without copying it into the repository.

The retained `2026-08-29-global-coast-r1` package contains 376 non-empty tiles
and 65,203 coastal points. It omits and records 1,512 undefined planned samples;
every retained point has 34 constituents, and the observed maximum round-trip
error is 0.000013 cm. The upload inventory contains 377 checksum-addressed
objects totalling 146,330,220 bytes.

At Cooktown, PyFES reports direct native-mesh interpolation using six mesh
points. At the other six shoreline and harbour validation coordinates it
reports bounded extrapolation using 30–39 mesh points. The configured PyFES
native-mesh extrapolation distance is 20 km; this is an atlas extraction rule,
not the global package's separate 40 km place-to-sampled-point runtime
selection limit. The official-port comparisons below are what permit this
deliberately narrow model use.

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

Only the small validation module and comparison evidence are committed. The
larger derived global package stays beside the retained source outside Git and
is uploaded by the protected importer in Phase 13. The original AVISO NetCDF is
never committed or served. `/init` never opens SFTP, downloads an atlas,
decompresses files, or runs PyFES. Ordinary forecast requests only read
checksum-verified R2 objects.

The committed source identifies the FES2022 product DOI and AVISO licence,
attributes CNES, LEGOS, NOVELTIS, and CLS, labels the constants as transformed
material, and carries the source disclaimer into every forecast response.

## Run it

```sh
node --test initiatives/tide-here/work/phase-12/test/*.test.mjs
```
