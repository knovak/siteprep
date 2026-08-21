# Tide Here phase 1 — day model

This increment implements the calendar boundary in `spec.md` §5 as pure,
provider-independent functions. It resolves station coordinates through a pinned
GeoJSON time-zone dataset, builds five coast-local calendar rows, computes the
UTC instants at their local-midnight boundaries, assigns absolute instants to a
row, and carries the numeric UTC offset for every described instant.

## Files

- `src/day-model.mjs` is the day-model implementation. Every calendar operation
  receives an explicit IANA zone; it never reads the process or device zone.
- `data/time-zones.fixture.geojson` is a deliberately bounded, pinned dataset
  slice covering the initiative's named fixtures. It proves the offline lookup
  contract without pretending to provide global coverage. Production must pin
  a full time-zone boundary dataset, or a similarly explicit slice covering all
  configured tide stations. Coordinates outside the supplied coverage fail
  loudly instead of receiving a plausible but invented zone.
- `test/day-model.test.mjs` exercises the complete phase-1 exit in
  `test-plan.md` §4.1, including process-zone independence and both daylight-
  saving transitions.

## Run

```sh
node --test initiatives/tide-here/work/phase-1/test/day-model.test.mjs
```

The module uses only built-in `Intl` time-zone data and accepts the polygon
dataset as an argument, keeping later replacement of the fixture slice separate
from the calendar arithmetic.
