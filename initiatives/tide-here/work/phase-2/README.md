# Tide Here phase 2 — station catalogue and coastal match

This increment turns NOAA and CHS prediction-station listings into one small
provider-independent record, caches the normalized catalogue for seven days,
and makes the coast decision explicit: accept a clearly nearest station, ask
when geography is ambiguous, or refuse when configured coverage is too far
away.

## Files

- `data/provider-config.json` owns the 25 km automatic distance, 60% clarity
  ratio, 150 km coverage boundary, three-choice limit, seven-day cache lifetime,
  provider URLs, datum labels, and attribution. The matcher contains none of
  those product numbers.
- `data/catalogue-slices.fixture.json` is a dated, trimmed fixture from the
  official NOAA tide-prediction catalogue and CHS `wlp-hilo` station catalogue,
  with the CHS metadata needed to preserve province and reference-port
  relationships. It covers Boston, Puget Sound, the U.S.–Canada border,
  Halifax, Vancouver, and an Arctic NOAA station without pretending to be a
  production catalogue.
- `src/station-catalogue.mjs` normalizes both provider shapes and implements a
  storage-neutral seven-day read-through cache. NOAA `R`/`S` and CHS metadata
  become the same `reference`/`subordinate` vocabulary.
- `src/coastal-match.mjs` ranks by great-circle distance and returns exactly
  `accepted`, `coast-choice-required`, or `coverage-unavailable`. Candidate
  records keep provider, country, jurisdiction, station kind, distance, and
  reference-station id so a border or subordinate result never loses its
  identity.
- `test/station-catalogue.test.mjs` applies every Phase 2 exit row from
  `test-plan.md` §4.2, including Puget Sound ambiguity, the U.S.–Canada border,
  an inland refusal, configuration-only threshold changes, and cache expiry.

## Provider boundary

NOAA's Metadata API exposes tide-prediction stations with `type=R` for a
reference station and `type=S` plus `reference_id` for a subordinate station.
CHS exposes prediction-capable stations from the `stations` endpoint and the
province/reference-port fields from station metadata. Normalization is the only
place those provider field names are read. Later forecast code receives the
shared record and does not infer jurisdiction from the input place.

The cache accepts a `storage` object with asynchronous `getItem` and `setItem`
methods. A browser adapter can wrap `localStorage`; tests use an in-memory map.
A malformed or expired value is a cache miss and is replaced only after the
caller-provided catalogue fetch succeeds.

`operating` is not used to discard a CHS prediction station: several official
high/low prediction entries are not current gauges but still expose the
`wlp-hilo` series. Presence of that series is the catalogue criterion for this
phase. The later tide adapter remains responsible for distinguishing an empty
or failed prediction response.

## Run

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-2/test/station-catalogue.test.mjs
```

The test is deterministic and never calls a live provider. Phase 8 repeats a
small live contract check before deployment; fixture refresh is a separate,
dated action.
