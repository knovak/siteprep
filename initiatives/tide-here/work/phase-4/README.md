# Tide Here phase 4 — sun and moon

This increment adds the `Astronomy` adapter specified by `spec.md` §4. It
takes the exact coast-local UTC bounds from the Phase 1 day model, calculates
events at the selected prediction station's coordinates, and augments the
stable Phase 3 forecast without changing or discarding tide rows.

## Windowing and response contract

`src/astronomy.mjs` scans every UTC calendar day touched by each coast-local
row, filters all results back into that row's half-open `[startUtc, endUtc)`
window, and returns arrays for sunrise, sunset, moonrise, and moonset. Scanning
and filtering, rather than accepting one rise/set slot, preserves zero, one, or
two events and also works for 23- and 25-hour civil days.

Moon phase is calculated at exact local noon using the explicit station IANA
zone. The result includes the illuminated fraction, numerical phase, a snapped
eight-phase name, the UTC instant used, and `isCurrent` only on the row
containing the current instant. The adapter never formats an event in the
device zone; event arrays contain ISO UTC instants.

Empty event arrays are valid. `sunState` and `moonState` distinguish
ordinary, always-up, and always-down days, while `eventDisplayState` maps a
missing rise or set to the `no-event` copy “does not rise” or “does not set.”
A calculation failure adds only `astronomy-unavailable`, leaves every tide
untouched, and marks astronomy unavailable rather than pretending that empty
arrays are successful calculations.

## Pinned SunCalc

`vendor/suncalc-2.0.1.mjs` is the exact ES module from SunCalc
[v2.0.1](https://github.com/mourner/suncalc/releases/tag/v2.0.1), commit
`bbc91f689ede3ff7173011947d435b3fb6c0485d`. `vendor/source.json` records
its source URL and SHA-256 checksum. `vendor/SUNCALC-LICENSE.txt` retains the
upstream BSD 2-Clause licence. The checksum test makes an upgrade an explicit
source-and-version change rather than a silent library drift.

## Run

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-1/test/day-model.test.mjs
node --test initiatives/tide-here/work/phase-4/test/astronomy.test.mjs
```

The suite covers real pinned calculations, station-coordinate routing, local
noon across daylight-saving boundaries, zero and two moonrise shapes, polar
states, process-zone independence, failure isolation, and the upstream source
checksum.
