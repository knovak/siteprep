# Phase 11: global coverage Stage 3

Stage 3 implements the Australian Standard Ports preparation, storage,
catalogue, and forecast path. It extends the Stage 2 provider gateway. The
Phase 6 page now consumes this path on the test Site through its stored-provider
client while NOAA and CHS remain direct browser providers.

## What is complete

- The offline importer accepts the versioned
  `tide-here/australia-standard-ports-source/v1` interchange format. It validates
  dataset identity, year and date coverage, licence and attribution metadata,
  ports, IANA time zones, event types, heights, duplicate events, and converts
  every source-local time to a UTC instant. Each event carries its source UTC
  offset as well as its local clock time, so daylight-saving transitions and
  repeated local hours are unambiguous and checked against the port time zone.
- The prepared artifact uses the same normalized station fields and high/low
  event semantics as the existing adapters.
- `POST /init` loads the prepared Australian artifact as an immutable,
  checksum-verified R2 object, activates its exact version, verifies the Stage 1
  harmonic fixture, and activates the Stage 3 provider registry last. Repeating
  the request performs no writes.
- `GET /stations?provider=australia-standard-ports` returns the stored standard
  port catalogue.
- `POST /forecast` returns the existing normalized five-day response shape and
  fails explicitly for dates outside the loaded year or artifact coverage.

The gateway remains provider-neutral. A future Korean, Irish, or other national
source supplies a registry descriptor, preparation adapter, data artifact,
forecast adapter, and optional station catalogue; no provider-specific branch
is added to the gateway.

## Fixture and production boundary

The committed artifact is synthetic. It contains a complete 2026 calendar year
for 23 samples around the major coastal regions of every Australian coastal
state and the Northern Territory: Brisbane, Cairns, Townsville, Mackay,
Gladstone, Coffs Harbour, Sydney, Melbourne, Hobart, Adelaide, Port Lincoln,
Ceduna, Esperance, Albany, Fremantle, Geraldton, Carnarvon, Dampier, Port
Hedland, Broome, Darwin, Gove, and Weipa. This lets the current test Site,
time-zone conversion, daylight-saving offsets, nationwide coastal matching,
and complete stored-data path be tested without expiring after five days. It
contains no Bureau of Meteorology or Australian Hydrographic Office prediction
values and cannot be selected by production provider selection. Every response
says `fixture-data`.

This completes the Stage 3 implementation path, but not official Australian
activation. That requires a licensed machine-readable annual source, confirmed
reuse and attribution terms, and comparisons with the supplied table. The
Bureau's public website blocks automated scraping, so it is not used as an
ingestion source.

## Preparing a licensed artifact

Acquisition remains an out-of-band job. If the eventual source arrives by SFTP,
the preparation job downloads it once outside the Site runtime, translates it
to the documented source interchange shape, and runs:

```sh
node initiatives/tide-here/work/phase-11/scripts/prepare-australia.mjs source.json > prepared.json
```

The generated artifact is reviewed, checksummed, uploaded to deployment
staging, and only then activated by `/init`. No page request and no `/init`
request opens an SFTP connection or parses a publisher file.

## Run it

```sh
node --test initiatives/tide-here/work/phase-11/test/*.test.mjs
```

The R2 binding, protected initialization, and test deployment are documented in
`../phase-13/README.md`.
