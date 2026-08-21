# Phase 3 tide adapters

This phase freezes the tide portion of the §7 forecast response and proves that
it is provider-neutral. `TideProvider` is the seam: it selects the NOAA CO-OPS
or Canadian Hydrographic Service (CHS) adapter from the normalized station,
constructs a request covering the five coast-local day bounds from Phase 1,
and returns the same response keys for either provider.

## Contract

Both adapters return preserved input, resolved place, coast, normalized station,
IANA time zone, five day rows, source details, and warnings. Each tide is an
absolute UTC instant with high/low type, metric height, coast-local clock time,
and the numeric UTC offset used for that display instant. Station kind, datum,
and reference station survive normalization. Provider payload field names do
not cross the adapter boundary.

NOAA supplies explicit `H` and `L` event types. CHS's `wlp-hilo` recording is an
ordered extrema series without type labels, so the adapter evaluates the two
possible alternating patterns and assigns `high` to the one with the higher
mean. It keeps every extremum; unequal semidiurnal highs are never combined by
height.

The request builders use the first local day's UTC start and the fifth local
day's UTC end. That range therefore covers 23- and 25-hour days without assuming
that five calendar rows equal 120 hours. Empty or malformed predictions, HTTP
errors, and timeouts all return the otherwise stable response with the single
warning code `tides-unavailable`.

## Configuration, evidence, and tests

Prediction endpoints, provider country and datum, attribution, and licence URLs
remain in `work/phase-2/data/provider-config.json`. Deterministic tests consume
the Phase 0 NOAA Seattle and CHS Halifax browser recordings; their retrieval
time, exact request URLs, attribution, documentation links, and licence links
remain recorded in `work/phase-0/evidence.json`. Live requests remain the
separate non-gating smoke check specified by `test-plan.md`.

From the repository root:

```sh
node --test initiatives/tide-here/work/phase-3/test/*.test.mjs
```

The suite covers both normalized shapes, all recorded events, local placement
and offsets, datum/source details, mixed semidiurnal highs, five local days over
a daylight-saving change, and every required provider failure.
