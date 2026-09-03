# Phase 0 — contracts, fixtures, and portable scene core

This work area is the executable techdoc for the first Educational Global Maps
increment. It proves that exact, cited map inputs and a declarative scene can be
validated, stored immutably, changed through a pure reducer, exported to a
bounded ZIP bundle, and restored without the application or a data provider.
It deliberately contains no catalogue UI, renderer, provider adapter, relay, or
live network access.

Phase 1 extends the same portable core with a metadata-only catalogue and a
contribution pipeline. It still contains no browser renderer, and catalogue
startup never fetches a provider artifact.

## Checkpoints

1. **Identity.** `src/canonical.mjs`, the JSON Schemas, and the canonical test
   vectors define strict JSON parsing, NFC Unicode normalization, sorted keys,
   finite JSON numbers, UTC timestamps, absent-versus-null behavior, and
   `sha256:` content identities. Duplicate keys, ambiguous numeric spellings,
   normalized key collisions, and unknown required fields have stable findings.
2. **Repository.** `src/repository.mjs` stores exact immutable object versions
   in one canonical inventory. A candidate is fully validated in memory and a
   temporary file before one rename makes it accepted. Repeated acceptance is a
   no-op; a conflicting id, missing reference, future schema, or injected fault
   leaves the accepted inventory unchanged.
3. **Bundle.** `src/bundle.mjs` writes a deterministic stored ZIP, inspects the
   central directory before decompression, enforces entry, byte, ratio, depth,
   link, traversal, reserved-name, and normalized/case-folded collision limits,
   and verifies every permitted asset. Restricted assets remain references.
4. **Scene core.** `src/scene.mjs` validates compatibility and applies bounded,
   revisioned intents. Stale and duplicate intents do not change state. The
   fixture covers scalar, flow, point, and raster-frame profiles and restores
   the same scene and intent sequence from its bundle.

## Run it

From this directory:

```bash
npm ci
npm test
npm run round-trip
npm run contributions
```

`round-trip` creates two independent repositories, accepts the minimum fixture,
exports `scene.egm.zip`, restores it, re-exports it, and compares the logical
inventories and the deterministic reducer result. The temporary repositories
and bundle are removed afterward.

## Phase 1 catalogue and contribution pipeline

`src/catalogue.mjs` validates descriptor metadata, builds a deterministic
search index, filters by topic, provider, place level, time coverage, profile,
licence, and projection capability, and keeps detail states honest: unknown,
explicitly absent, and known values do not collapse into one blank. The
500-descriptor scale fixture is generated metadata only.

`src/contribution.mjs` is the adapter boundary. A contribution directory names
its descriptor, recorded source, adapter, expected findings, and example scene
in `contribution.json`. The validator:

1. validates descriptor, geography, crosswalk, scene-reference, rights, and
   source-checksum boundaries;
2. gives the adapter only the recorded bytes and descriptor, while refusing
   network access;
3. requires newline-terminated UTF-8 JSON Lines plus a revision report naming
   the exact descriptor version; and
4. publishes no artifact when rights are not explicitly allowed or an error
   finding remains.

An unfamiliar contributor can copy either directory under
`fixtures/contributions/`, replace its local files and adapter, and run:

```sh
node scripts/validate-contribution.mjs path/to/contribution
```

No catalogue or renderer module is edited to add that contribution. A changed
source checksum becomes a new candidate finding; it never mutates the earlier
prepared revision.

### Recorded reference suite

The first real suite is intentionally small and reviewable:

- `owid-population` records three 2023 country values from the Our World in
  Data Population Grapher distribution and its indicator metadata, version
  2024-07-15. Those values originate in UN World Population Prospects 2024;
  the recorded metadata identifies CC BY 3.0 IGO and requires attribution to
  both UN WPP and Our World in Data processing.
- `datacommons-income` records the official Data Commons v2 Observation API
  documentation example for 2015 median household income in the United States
  and California. It pins the Census ACS provenance facet and the Census public
  data citation boundary rather than treating Data Commons as the original
  source.

Both were checked 2026-09-02. The committed fixtures, not a live response, are
the test inputs. Refreshing either source is an explicit reviewed change to its
version, checksum, recorded bytes, and revision report.

## Phase 2 single-device renderer

`src/renderer.mjs` is the capability boundary for the first browser reader. It
uses D3's named Equal Earth projection and the `d3-geo-polygon` implementation
of Buckminster Fuller's Airocean projection, plus one fixed project-authored
population cartogram fixture. A projection change rebuilds geometry while
retaining the selected dataset revision, period, encoding, citations, camera,
and selected record. A layer that does not advertise the requested projection
returns `renderer.projection.refused`; the accepted projection and layers stay
unchanged.

The browser surface in `app/` draws marks to Canvas and keeps a synchronized
semantic table, exact legend classes, source links, period, units, uncertainty,
and missing status beside it. Exact values are selected only while inspection
is paused. The reference raster is deliberately compatible only with Equal
Earth so the visible refusal path can be exercised without pretending a raster
was reprojected. Pan and zoom affect session camera state, not the pinned data
revision. `app/THIRD_PARTY_NOTICES.md` records the pinned D3 packages bundled
with the reader and their ISC licence.

`fixtures/renderer-scene.json` contains simplified project-authored country
polygons, recorded source citations, five point fixtures, and the fixed
cartogram cells. Its geometry is explicitly instructional rather than an
authoritative boundary product. The cartogram names UN World Population
Prospects 2024 and 2023 as its population basis, retains the scalar legend
colors, and offers Equal Earth as the conventional reference.

Build and verify the browser reader from this directory:

```sh
npm run build:app
npm run test:browser
```

The browser matrix runs at 430×932, 1440×900, and 3840×2160. It checks Canvas
rendering, semantic parity, pinned-scene preservation, the raster refusal,
cartogram evidence, reduced motion, and horizontal overflow. `npm test` also
builds the browser bundle and runs the deterministic projection, model,
compatibility, semantic, viewport, inspection, and 250-feature budget tests.

## Phase 3 time, layers, flows, and raster frames

`src/temporal.mjs` adds a pure temporal-composition boundary beside the Phase 2
renderer. Every active layer exposes its actual source period and retains zero,
missing, unavailable, suppressed, filtered, outside-range, interpolated, and
modelled states. Exact, nearest, forward-fill, linear-interpolation, and
sum/mean aggregation are the only named alignment methods; each transformation
records its inputs, parameters, output status, and prepared revision. A layer
without an exact period or declared rule is refused before it changes the
accepted frame.

`fixtures/temporal-scene.json` layers yearly population, an interpolated
education index, irregular learner flows, time-bounded points, and a monthly
raster frame over the existing projection fixture. The browser can select or
play scene time, toggle every layer, inspect each actual period, and pause
animation immediately. Reduced-motion preference prevents automatic playback.
Flows retain direction, magnitude, zero, and missing records; points keep stable
ids while entering and leaving declared coverage. The raster renders only on
Equal Earth, and an attempted Airocean addition leaves the accepted time,
layers, projection, and camera unchanged with a visible reason.

The deterministic scale test accepts 25,000 flow and 50,000 point records while
bounding one visible frame to 5,000 flows and 10,000 points. The Phase 3 browser
tests exercise actual-period labels, temporal Canvas overlays, raster
capability refusal, immediate pause, and reduced motion at the same three
required viewports.

## Phase 4 composer, educational scenes, and portability

`src/composer.mjs` is the save boundary for prepared lessons. It validates the
exact dataset revision, geography or reviewed crosswalk, unit formula, time
alignment rule, rights state, projection support, attribution, and educational
framing before it creates an immutable scene revision. Findings name the layer
and a corrective action; a refused candidate never produces a revision.

Definitions, caveats, discussion prompts, interpretive claims with their own
sources, and ordered presentation stops are content-addressed with the scene.
`sceneRevision` share links resolve that exact object even after a later dataset
appears. Comparing an upgrade reports every changed dataset, geography, and
transformation; accepting it saves a successor instead of changing the shared
revision. An incompatible successor stays a reported comparison.

Portable administration walks only the selected scene closure. Permitted asset
bytes are checksum-bound into the bundle, while live or restricted assets stay
references with their access limitation and expiry. Restore verifies bytes and
a memory budget before accepting the scene. The generated offline document has
no provider URL or application-host dependency and makes every omitted
reference visible. `fixtures/educational-scenes.json` records scalar, compatible
layered, and flow-over-field lessons plus a newer population revision.

The Phase 4 browser surface adds a prepared-scene chooser, versioned teaching
framing, ordered stops, pinned share address, explicit upgrade comparison, and
portable-bundle status to the existing single-device reader. It remains a
reader/presenter rather than placing a full authoring panel on the 4K display.

## Phase 5 detached controller and reference relay

`src/session.mjs` defines the transport-neutral boundary. It creates 128-bit
join secrets, emits relay-safe snapshots containing only declarative scene
state, and keeps the display authoritative. `InMemorySessionTransport` applies
the same revisioned intents directly for the no-network fallback. Time, layer,
projection, camera, selection, and presentation-stop controls all use the
existing reducer contract; stale and duplicate base revisions cannot roll back
accepted state.

`scripts/reference-relay.mjs` packages the WebSocket reference transport. The
relay forwards typed intents to the display and returns complete authoritative
snapshots to joining or reconnecting controllers. It retains only the current
scene snapshot and connection ids, never dataset artifacts, contributor
content, or credentials. Messages are capped at 64 KiB, repeated invalid or
stale attempts are rate-limited, and an explicit end or two hours of inactivity
removes session state. Run it locally with:

```sh
npm run relay
```

The browser display creates a QR code and join URL. With no `relay` query
parameter, display and controller tabs use the same-browser `BroadcastChannel`
adapter and remain a complete fallback. A configured `ws:` or `wss:` relay URL
uses the packaged reference relay. Disconnecting a controller never disables
the display. The phone controller exposes time, layers, projection, pan, zoom,
selection, and ordered presentation stops without loading dataset bodies.

`test/phase-5.test.mjs` proves same-device equivalence, typed forwarding, two
controllers, stale refusal, reconnect snapshots, expiry, explicit end,
relay-ignorance and payload/rate limits, plus an actual WebSocket round trip.
The Phase 5 browser tests prove QR/join creation, synchronized controller
operations, and the disconnected display fallback. No public application or
relay was deployed; that remains permission-gated by `plan.md`.

## Phase 6 teaching and large-display validation

The reader now has two clear entry points: open a topic with the ordinary
exploration controls, or open a presentation display pinned to the same scene
revision. Presentation mode removes the control rail and share/upgrade tools
from the display while retaining the map, method cue, legend, exact-value table,
sources, discussion stop, and controller join flow. Each prepared stop carries
presenter notes; they stay available in exploration mode and off the projected
display.

Controls and table targets are at least 44 pixels, focus remains visible,
reduced motion disables animation, and the semantic table names the same values
and statuses as Canvas. The 4K presentation layout increases teaching text and
keeps the title, period, legend, missing-data class, source names, and method cue
visible without horizontal overflow. Browser-driven unguided-exploration and
teacher/controller paths run at 430×932, 1440×900, and 3840×2160.

`fixtures/phase-6-validation.json` is the evidence record. It identifies test
roles rather than people, names the accessibility and privacy checks, and keeps
three limitations explicit: the 4K check is an equivalent browser review rather
than a physical classroom display, independent learner understanding belongs to
Phase 7, and no live URLs were tested because public deployment permission was
not granted. No account, location, contacts, analytics, or unpublished scene
support was added.

## Canonicalization profile

- Input is UTF-8 JSON parsed before ordinary `JSON.parse` can discard duplicate
  members. Object keys and string values normalize to Unicode NFC; two keys
  that collide after normalization are refused.
- Keys sort by Unicode code point. Arrays retain order. `null` is retained and
  is distinct from an absent field. Undefined values and non-finite numbers are
  not portable. Signed zero canonicalizes to `0`.
- Strict text input accepts the ordinary JSON decimal grammar but refuses
  exponent notation and negative zero because those spellings are ambiguous at
  this boundary. Canonical output may use the shortest JSON decimal spelling.
- Contract timestamps use `YYYY-MM-DDTHH:mm:ss.sssZ`. Other offsets or
  precisions are refused rather than silently rewritten.
- Identities are `sha256:<lowercase hex>` over UTF-8 canonical JSON. The
  algorithm prefix makes a future digest change an explicit migration.

## Bundle limits

`src/limits.mjs` pins 128 entries, 5 MiB per entry, 20 MiB total expanded
bytes, a 100:1 compression ratio, path depth 12, and a 2 MiB manifest. Archive
paths must be relative forward-slash paths and may not contain links, special
files, platform-reserved components, dot segments, or NFC/case-folded
collisions. Import validates in a fresh staging directory and commits only the
canonical candidate inventory.

## Version policy

The schemas are closed, versioned envelopes. `scene/v0` is the one supported
old object: migration adds the explicit `camera` and `intentRevision` fields,
creates a new immutable `scene/v1` identity, and emits a deterministic receipt.
The source object remains unchanged. A future version is reported only by
bounded id/schema metadata and cannot enter the repository.
