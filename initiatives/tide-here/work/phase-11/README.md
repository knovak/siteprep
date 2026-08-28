# Phase 11: global coverage Stage 3

Stage 3 implements the Australian annual-tide preparation, storage, catalogue,
and forecast path. It extends the Stage 2 provider gateway. The Phase 6 page
uses this path on the test Site while NOAA and CHS remain direct browser
providers.

## Active Australian data

The active artifact is derived from the Bureau of Meteorology's 2026 annual
tide-table PDFs. It contains 31,046 real daily high and low predictions for 23
reference ports across Queensland, New South Wales, Victoria, Tasmania, South
Australia, Western Australia, and the Northern Territory. Each station retains
its source PDF, coordinates, datum, IANA time zone, and the exact local clock
time and UTC offset printed or implied by the table. The source metadata carries
the Bureau's required modified-product attribution and disclaimer.

The 23 ports are a deliberately bounded major-coast catalogue, not a claim that
every Australian Standard or Secondary Port is present. The source PDFs and
their SHA-256 checksums are recorded in
`data/bom-annual-2026.manifest.json`; the compressed normalized source is
`data/bom-annual-2026.source.json.gz`. The stored dataset identity is
`australia-bom-annual-tides/2026-bom-v1`.

## Preparation and renewal

Acquisition is an offline annual preparation job. It runs once when a new
calendar year's tables are published, not when a visitor asks for a forecast
and not from `/init`:

```sh
node initiatives/tide-here/work/phase-11/scripts/fetch-bom-annual.mjs \
  initiatives/tide-here/work/phase-11/data/bom-port-selection-2026.json \
  initiatives/tide-here/work/phase-11/data/bom-annual-2026.source.json.gz \
  initiatives/tide-here/work/phase-11/data/bom-annual-2026.manifest.json

node initiatives/tide-here/work/phase-11/scripts/prepare-australia.mjs \
  initiatives/tide-here/work/phase-11/data/bom-annual-2026.source.json.gz \
  --module
```

The fetcher downloads only the selected official PDFs, records byte size and
SHA-256 for each one, uses Poppler's positioned-text output to reconstruct all
months, validates coordinates and datum, and converts each local source time
with the station's IANA zone. Preparation rejects missing days, duplicate
events, invalid extrema, invalid zones, licence gaps, and explicit offsets that
do not agree with the station zone. The generated module is reproduced exactly
from the compressed source in the test suite. Renewal uses a new selection,
source, manifest, artifact version, and registry version; it never overwrites an
active immutable object.

If a later national source arrives by SFTP, the same boundary applies: a
credentialed preparation job downloads it once, converts it into a validated
versioned artifact, and records integrity metadata. Neither a page request nor
`/init` contacts SFTP or parses publisher files.

## Runtime and initialization

- `POST /init` loads the prepared Australian artifact as an immutable,
  checksum-verified R2 object, activates its exact version, verifies the Stage 1
  harmonic fixture, and activates provider registry `stage-3-v4` last.
  Repeating the request performs no writes.
- `GET /stations?provider=australia-standard-ports` returns the stored 23-port
  catalogue.
- `POST /forecast` returns the existing normalized five-day response shape,
  marks the Bureau source official and non-approximate, and fails explicitly
  for dates outside 2026 or the artifact coverage.

The gateway remains provider-neutral. A future Korean, Irish, or other national
source supplies a registry descriptor, preparation adapter, data artifact,
forecast adapter, and optional station catalogue; no provider-specific branch
is added to the gateway.

## Synthetic boundary

The previous 23-port synthetic artifact remains committed only as a deterministic
import, time-zone, and disclosure fixture. It is not referenced by the active
registry and cannot be returned by the initialized Site. Tests require the
synthetic response to say `fixture-data` and the licensed Bureau response not to
say it.

## Verification

```sh
node --test initiatives/tide-here/work/phase-11/test/*.test.mjs
```

The suite verifies exact source-to-artifact reproduction, PDF layout parsing,
all-month completeness, IANA/DST conversion, checksum and licence gates,
idempotent activation, all 23 five-day forecasts, and held-out 2026-08-27 table
values in every coastal jurisdiction. The hosted R2 binding and deployment
checks are documented in `../phase-13/README.md`.
