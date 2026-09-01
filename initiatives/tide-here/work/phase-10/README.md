# Phase 10: global coverage Stage 2

Stage 2 introduces the provider registry and the server boundary used only by
stored providers. It does not change or deploy the current Tide Here page.

The registry describes four providers without teaching the page their payloads:

- NOAA and CHS are active `browser-direct` national providers, preserving the
  current keyless browser integrations.
- Australian Standard Ports is a planned `server-stored` national provider.
- FES2022 is a `server-stored` fallback, but remains fixture-only at this stage
  and references the non-FES Brest dataset from Stage 1.

Provider selection is data-driven: exact national coverage wins over a fallback,
and a new national provider can be added as another validated descriptor. Only
`active` providers are eligible in production selection. Tests may opt into
`fixture` providers; `planned` providers are never selected.

## Initialization and routes

`POST /init` first verifies or initializes the Stage 1 harmonic fixture, then
writes an immutable provider-registry version and activates the registry last.
Every stored-provider descriptor that is not merely planned must reference a
present, checksum-valid dataset. The route is idempotent and uses the same
loopback-or-`INIT_TOKEN` protection as Stage 1.

- `GET /health` verifies the registry and every referenced dataset. Small
  datasets are checked object by object. A large imported indexed dataset may
  declare `manifest-and-selected-objects`: activation verifies the complete
  inventory once, while ordinary requests verify the immutable manifest, tile
  index, and only the selected tile objects.
- `GET /providers` returns the current client-safe descriptors.
- `POST /forecast` is the common stored-provider boundary. Calling it for NOAA
  or CHS returns `direct-provider-required`; the current browser adapters remain
  authoritative for those providers.
- `GET /stations?provider=...` is reserved for stored national catalogues added
  in Stage 3 and later.
- Protected `POST /import/object` and `POST /import/activate` routes let a
  preparation host resume immutable derived-data uploads without putting the
  licensed source atlas or its credentials in the Site or repository.

`src/gateway.mjs` is the reusable route layer. Future national sources supply a
registry descriptor, stored forecast adapter, optional station catalogue, and
their own initializer; they do not add provider-specific branches to the
gateway.

## Run it

```sh
node --test initiatives/tide-here/work/phase-10/test/*.test.mjs
```

There is still no `.openai/hosting.json`. Storage binding and deployment remain
Stage 5 work.
