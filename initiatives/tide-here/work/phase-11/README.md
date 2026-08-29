# Phase 11: global coverage Stage 3

Stage 3 implements the Australian annual-tide preparation, storage, catalogue,
and forecast path. It extends the Stage 2 provider gateway. The Phase 6 page
uses this path on the test Site while NOAA and CHS remain direct browser
providers.

## Active Australian data

The active artifact is derived from the Bureau of Meteorology's 2026 annual
tide-table PDFs. It contains 103,597 real daily high and low predictions for all
76 Standard Ports listed by the Bureau across Queensland, New South Wales,
Victoria, Tasmania, South Australia, Western Australia, and the Northern
Territory. Norfolk Island, Christmas Island, and the Cocos Islands use their own
IANA zones, bringing the catalogue to 10 zones. Each station retains its source
PDF, coordinates, datum, IANA time zone, and the exact local clock time and UTC
offset printed or implied by the table. The source metadata carries the
Bureau's required modified-product attribution and disclaimer. Preparation
emits both the embedded stored artifact and the browser catalogue so the two
runtime paths cannot drift.

The catalogue includes the complete 2026 Standard Port section from each state
and territory index. It deliberately excludes Secondary Ports and tidal-stream
tables, whose correction and modelling contracts are different. The source PDFs
and their SHA-256 checksums are recorded in
`data/bom-annual-2026.manifest.json`; the compressed normalized source is
`data/bom-annual-2026.source.json.gz`. The stored dataset identity is
`australia-bom-annual-tides/2026-bom-v2`.

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

node initiatives/tide-here/work/phase-11/scripts/prepare-australia.mjs \
  initiatives/tide-here/work/phase-11/data/bom-annual-2026.source.json.gz \
  --catalogue
```

The fetcher downloads only the selected official PDFs, records the immutable
dataset version plus byte size and SHA-256 for each one in the manifest, uses
Poppler's positioned-text output to reconstruct all
months, validates coordinates and datum, and converts each local source time
with the station's IANA zone. The selection must name an explicit immutable
dataset version. Type inference handles adjacent extrema whose published heights
round to the same value by using the first unequal pair, while still rejecting
a sequence that does not alternate cleanly. Datum normalization also ignores a
source-layout caution that follows the named datum on the same extracted line.
Preparation rejects missing days,
duplicate events, invalid extrema, invalid zones, licence gaps, and explicit
offsets that do not agree with the station zone. The generated module is
reproduced exactly from the compressed source in the test suite. Renewal uses a
new selection, source, manifest, artifact version, and registry version; it
never overwrites an active immutable object.

## Representative coverage matrix

`data/australia-coverage-gap-matrix-2026.json` keeps the reviewed 25 km / 60% /
150 km matcher thresholds fixed and replays 16 representative searches against
both the former 23-port catalogue and the expanded catalogue. Fourteen baseline
searches were `coverage-unavailable`; all 16 are now within coverage. Fifteen
select a nearby Standard Port automatically. Cooktown is within 113.55 km of
Port Douglas but correctly remains `coast-choice-required` rather than being
silently treated as a local port.

If a later national source arrives by SFTP, the same boundary applies: a
credentialed preparation job downloads it once, converts it into a validated
versioned artifact, and records integrity metadata. Neither a page request nor
`/init` contacts SFTP or parses publisher files.

## Runtime and initialization

- `POST /init` loads the prepared Australian artifact as an immutable,
  checksum-verified R2 object, activates its exact version, verifies the Stage 1
  harmonic fixture, and activates provider registry `stage-3-v5` last.
  Repeating the request performs no writes.
- `GET /stations?provider=australia-standard-ports` returns the stored 76-port
  catalogue.
- `POST /forecast` returns the existing normalized five-day response shape,
  marks the Bureau source official and non-approximate, and fails explicitly
  for dates outside 2026 or the artifact coverage.

The gateway remains provider-neutral. A future Korean, Irish, or other national
source supplies a registry descriptor, preparation adapter, data artifact,
forecast adapter, and optional station catalogue; no provider-specific branch
is added to the gateway.

## Synthetic boundary

The 23-port synthetic artifact remains committed only as a deterministic
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
rounded-height type inference, idempotent activation, all 76 five-day forecasts,
the before/after coverage matrix, and held-out 2026-08-27 table values in every
coastal jurisdiction. The hosted R2 binding and deployment checks are
documented in `../phase-13/README.md`.
