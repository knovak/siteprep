# Phase 9: global coverage Stage 1

This is the bounded storage and harmonic-calculation spike from `plan.md` §8.2.
It does not replace or change the current Tide Here page and it is not deployed.

The spike proves four pieces needed by the planned FES fallback:

1. a Worker-compatible object-store boundary that can wrap an R2 bucket;
2. a protected, idempotent `POST /init` route that writes versioned objects and
   activates their manifest last;
3. lookup of a nearby harmonic point and five-day high/low calculation; and
4. comparison of the JavaScript engine with results published by PyFES.

## Data and scientific boundary

`fixtures/brest-stage-one.mjs` contains observed TICON-3 harmonic constituents
for Brest copied from the official PyFES example. It is not FES2022 data and the
API returns that distinction in every forecast. The fixture exists only to test
storage and runtime feasibility without AVISO credentials or redistribution of
the FES grids.

The predictor is `@neaps/tide-predictor` 0.11.0, pinned exactly and configured
with Schureman nodal corrections. For 1–3 June 2025, its first five highs and
lows are checked against the values published in the PyFES Brest example. The
test allows six minutes and five centimetres: the published PyFES example
searches a ten-minute time series, while the JavaScript library refines extrema
to sub-second times. This is evidence that the runtime approach is plausible,
not a production accuracy claim.

Stage 4 still needs authenticated FES2022b extrapolated grids, a PyFES
preparation job, actual tile extraction, coastal missing-data handling, and
held-out comparisons with official port predictions.

## Routes

- `POST /init` initializes the versioned tile, dataset manifest, and active
  pointer. A hosted request requires `Authorization: Bearer <INIT_TOKEN>`.
  Loopback requests may initialize without a token for development.
- `GET /health` reports whether an active, internally consistent dataset exists.
- `GET /forecast?lat=48.383&lon=-4.495&start=2025-06-01T00:00:00Z&days=5`
  returns UTC high/low events for the closest point inside the fixture radius.

The hosted adapter expects an R2 binding named `TIDE_DATA`. There is deliberately
no `.openai/hosting.json` yet: the implementation plan deploys only at Stage 5.

## Run it

From the repository root, after `npm ci`:

```sh
node --test initiatives/tide-here/work/phase-9/test/*.test.mjs
node initiatives/tide-here/work/phase-9/scripts/run-spike.mjs
```

The second command invokes the route handlers against an in-memory object store
and prints the first and repeated initialization results plus the PyFES
comparison. It does not contact the network or modify deployed storage.
