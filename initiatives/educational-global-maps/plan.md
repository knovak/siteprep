# Plan

Written 2026-08-31 from `objectives.md` and `spec.md`. This plan turns the
first-version boundary into reversible increments. `test-plan.md` supplies the
exit for each phase; a phase does not finish because its interface looks
complete.

## 1. Build order and boundaries

Work begins under `initiatives/educational-global-maps/work/`. It stays there
until a complete output graduates to a demo or another declared output. The
catalogue, preparation tools, renderer, scene format, and display-controller
protocol must not depend on the eventual publication host.

The build follows five rules:

1. **Contracts before catalog size.** A small deterministic fixture must export,
   restore, validate, and render before hundreds of descriptors are generated.
2. **One-device use before a relay.** Every scene and control works in one
   browser before two-device synchronization is introduced.
3. **Projection compatibility before projection spectacle.** The renderer must
   explain and refuse an incompatible layer before adding more projections.
4. **Recorded source inputs before live convenience.** Provider adapters use
   recorded, rights-safe fixtures in CI; a live refresh is an explicit operation
   that creates a new immutable revision.
5. **Public deployment is a separate gate.** Local and packaged builds can prove
   the application first. Creating a public Site or any relay deployment needs
   the user's permission at that phase.

### 1.1 Pre-build critique and corrections

The first draft had the right dependency order but left Phase 0 large enough
that identity, storage, bundle safety, and scene behavior could fail only after
they had become entangled. It also described a valid import without defining
the stronger property that a failed import cannot partly change accepted state.
Before implementation, the plan therefore makes four corrections:

1. **Phase 0 is checkpointed.** Contract envelopes and canonical identity land
   before an object repository; the repository lands before bundle I/O; scene
   state and compatibility land only after exact-reference restore works.
2. **Acceptance is transactional.** Validation, limits, reference closure, and
   checksums are completed in a staging area before one atomic commit makes new
   immutable objects visible. A failure leaves the accepted inventory byte-for-
   byte and logically unchanged.
3. **Canonicalization and paths are hostile boundaries.** Duplicate JSON keys,
   Unicode normalization or case-folding collisions, platform-reserved names,
   archive links, decompression expansion, and ambiguous numeric or time forms
   are refused by named limits and stable findings rather than delegated to the
   host filesystem or whichever parser happens to run first.
4. **Version change is exercised immediately.** Phase 0 includes one supported
   old-version fixture and a pure old-to-current migration. Migration emits a
   new immutable object and receipt; unsupported future versions remain
   unchanged and produce a specific finding.

These corrections keep the first increment reviewable without weakening its
portable-custody promise. UI, providers, projections, live networking, and
spherical packaging remain outside Phase 0.

## 2. Implementation choices

### 2.1 Packages and layout

The reference implementation is a static browser application plus Node-based
preparation and validation commands. Browser code uses standards-based ES
modules. Dependencies are pinned through the repository lockfile; D3 geographic
modules and TopoJSON supply the first projection and geometry path. The build
must emit a self-contained static directory that can run on an ordinary HTTP
server without a provider-specific SDK.

The work directory will separate:

- versioned JSON Schemas and canonical object fixtures;
- domain validation, compatibility, time-alignment, and scene-state modules;
- preparation adapters and their recorded source fixtures;
- catalogue metadata and immutable prepared artifacts;
- browser catalogue, composer, display, and controller views;
- Canvas rendering plus accessible HTML/SVG overlays;
- transport-neutral session state and relay adapters;
- portable bundle and spherical-export commands; and
- unit, contract, browser, performance, and hostile-input tests.

Executable JavaScript and its operating commands will be documented in a
work-area techdoc when implementation starts, as required by the repository.

### 2.2 Canonical contracts

Use versioned JSON Schemas for dataset descriptors, prepared revisions,
geography sets, crosswalks, scenes, session snapshots and intents, portable
bundle manifests, and spherical conversion reports. Stable ids are namespaced;
object versions are immutable; references name exact versions rather than
mutable URLs.

Canonical JSON serialization plus SHA-256 checksums identifies metadata and
artifacts. The first normalized tabular artifacts are UTF-8 JSON Lines, one
declared profile per file, because they are streamable, inspectable, and usable
without a specialist data runtime. Geometry is versioned GeoJSON or TopoJSON.
A manifest records media type, byte size, checksum, licence status, and whether
an asset may be bundled. A later columnar or tiled artifact may implement the
same prepared-revision contract without changing a scene.

The validation library is shared by preparation commands and the browser. It
returns structured findings with object path, severity, stable code, and a
human explanation. Warnings never rewrite input. Acceptance writes a new
revision report containing the validator and adapter versions.

Phase 0 must publish the canonicalization profile as test vectors, including
object-key ordering, UTF-8 and Unicode normalization policy, supported numeric
forms, timestamp precision, and the treatment of absent versus explicit null
values. Duplicate member names are rejected before ordinary JSON parsing can
discard them. Content identities include an algorithm prefix so a later digest
change is an explicit migration rather than an invisible reinterpretation.

Each schema has an explicit compatibility policy. Signed canonical objects do
not silently retain unknown fields; a supported older version is migrated by a
pure function into a new object with a receipt naming source and target
identities. An unsupported future version is readable only as bounded metadata
for an error report and cannot enter the accepted repository.

### 2.3 Reference data and geography

Begin with generated fixtures whose rights and edge cases are unambiguous, then
add a recorded reference suite from more than one provider:

- a country-level time series from an Our World in Data distribution whose
  underlying reuse terms permit the recorded snapshot;
- a US Census-derived Data Commons series at a supplied subnational and city
  level, with both Data Commons and original-source provenance retained;
- a public-domain NOAA or NASA raster-frame sample with its original source and
  processing notes; and
- a synthetic origin-destination series designed to exercise direction, zero,
  missing, suppressed, and changing flows.

Source and redistribution terms are verified before any real artifact is
committed. If a candidate's terms do not permit the fixture, substitute another
source with the same data profile rather than weakening the rights contract.
Provider ids and labels remain source-aware. Crosswalks are separate reviewed
artifacts and never rely on place-name equality alone.

The first geography suite contains a versioned world-country geometry, one
provider-supplied subnational set, a city point set, and the fixed country-level
population cartogram geometry selected by the specification. Historical values
shown on current boundaries carry that assumption in the revision and scene.

### 2.4 Rendering and composition

All renderers receive the same declarative scene and prepared data. D3 owns the
projection boundary. Canvas draws scalable marks; SVG and semantic HTML provide
focus targets, labels, legends, citations, and exact-value inspection. The
first projection registry contains a named equal-area global reference,
Airocean, and the fixed population cartogram. The current scene keeps one
camera and encoding model where those concepts survive; a projection adapter
reports what it cannot preserve.

A compatibility service decides whether layers may coexist. It checks data
profile, geography or crosswalk, time rule, units, measure semantics, required
geometry, and projection capability before rendering. It returns a structured
refusal instead of dropping a layer. Time selection records each layer's actual
period, and missing, zero, suppressed, estimated, modeled, and interpolated
states remain distinct.

### 2.5 Scene state and portable bundles

Scene edits pass through a pure reducer whose accepted state is serializable and
versioned. Share links name an immutable scene revision. A portable bundle is a
ZIP archive with one manifest and bounded relative paths; it contains the scene,
exact descriptor and revision metadata, geometry and crosswalk versions,
permitted artifacts, citations, checksums, and a readable inventory. Restricted
or live-only assets remain references with warnings.

Bundle import validates into a new in-memory candidate before replacing any
accepted local scene. Unknown future schema versions, checksum failures,
missing required assets, and unsafe paths are refused. Export and restore must
work without the original application host for every bundled asset.

The importer treats archive structure as untrusted before extraction. It caps
entry count, per-entry bytes, total expanded bytes, compression ratio, path
depth, and manifest size; rejects absolute paths, traversal, links and special
files; and detects normalized, case-folded, and platform-reserved path
collisions. Bytes are written only to a fresh staging directory. The complete
candidate inventory, references, rights rules, and checksums are validated
there before one atomic repository commit; cleanup failure is reported without
making staged objects accepted.

### 2.6 Display-controller protocol and relay

The display and controller use one typed intent protocol over replaceable
transports. Start with an in-memory same-browser adapter, then add a WebSocket
reference relay. A session envelope contains the session id, base scene
revision, monotonically increasing accepted revision, intent id, message type,
and bounded payload. The display is authoritative and sends a complete snapshot
on join or reconnect.

The relay stores only current session state and connection metadata, never
dataset artifacts or contributor content. Join secrets contain at least 128
bits of randomness, sessions expire after two hours of inactivity, messages
have strict type and size limits, and rate limits bound repeated invalid or
stale intents. The same-device adapter remains a complete fallback if relay
deployment or classroom networking is unavailable.

### 2.7 Accessibility and presentation target

Use WCAG 2.2 AA as the first-version accessibility target. Every operation has
keyboard and touch paths; color is never the only encoding; focus and selected
state remain visible; animation pauses immediately and honors reduced motion;
and the canvas has a synchronized semantic summary and exact-value table.

The required viewports are 3840×2160 for the large display, 1440×900 for a
laptop, and 430×932 for a phone controller. At 4K the map, title, current
period, essential legend, missing-data key, active source names, and a method
cue remain readable without browser zoom. Detailed authoring controls stay off
the display view.

### 2.8 Representative scale and budgets

The deterministic scale suite contains 500 descriptors, 300,000 place-time
observations, 25,000 flow observations with no more than 5,000 visible in one
frame, 50,000 points with no more than 10,000 visible in one frame, 24 raster
frames, and the reference geography suite. Tests record the machine, browser,
build mode, and fixture version.

On a production build in current Chromium on the repository's reference
machine:

- catalogue metadata becomes searchable within 2 seconds and a warmed filter
  updates within 100 ms at p95;
- a 250-feature country scalar scene paints within 500 ms;
- an accepted time or projection change produces its first updated frame within
  150 ms at p95, with no sustained animation frame over 50 ms;
- pan and zoom remain responsive at 4K with the representative visible mark
  counts;
- a controller intent appears on the display within 250 ms at p95 on the test
  relay, and reconnect reaches a consistent snapshot within 3 seconds; and
- the representative portable bundle restores with peak application memory
  below 256 MiB and without loading all catalogue artifacts at startup.

Budgets are release gates for the reference fixtures, not promises that every
provider payload or school network has the same performance.

## 3. Phases

### Phase 0 — Contracts, fixtures, and portable scene core

Create the object schemas, stable finding codes, canonical hashing, minimum
geography, synthetic fixtures for all four data profiles, scene reducer,
compatibility result shape, bundle manifest, exporter, and importer. Implement a
command that validates a fixture, exports a one-scene bundle, restores it into
an empty temporary directory, and compares the canonical inventory.

Do not build the catalogue UI, D3 renderer, relay, or provider adapters yet.
The phase exits with hostile-path, future-version, checksum, idempotent restore,
and unknown-field behavior proved against the minimum fixture.

Deliver Phase 0 through four independently reviewable checkpoints:

1. **Envelope, schemas, findings, and identity:** versioned schema envelopes,
   canonicalization test vectors, duplicate-key detection, stable findings, and
   content identities for the minimum objects.
2. **Immutable repository and reference closure:** write-once object storage,
   exact references, one old-to-current migration with receipt, restricted-
   asset metadata, and inventory comparison.
3. **Transactional bundle round trip:** deterministic export plus bounded
   staged import, atomic acceptance, idempotent restore, and hostile-archive
   refusal with the accepted inventory unchanged.
4. **Portable scene core:** the pure reducer, intent validation, compatibility
   result shape, synthetic profile fixtures, and a one-scene bundle whose
   restored logical inventory and state sequence match the source.

Each checkpoint includes its fixtures, commands, tests, and work-area techdoc.
The branch may proceed to the next checkpoint only when the prior checkpoint's
stable findings and invariants are recorded; later checkpoints may extend a
schema only through the version policy already proved in checkpoint 1.

**Lifecycle:** completing this phase advances the initiative from `planned` to
`building`.

**Exit:** `test-plan.md` §4.0.

### Phase 1 — Catalogue and contribution pipeline

Build descriptor indexing, search/filter metadata, detail records, the
preparation-adapter interface, recorded HTTP/source fixtures, revision reports,
geography and crosswalk validation, and the contributor guide. Generate the
500-descriptor scale catalogue without fetching their data. Add the rights-safe
multi-provider reference suite only after each distribution's terms and source
version are recorded.

An unfamiliar contributor must be able to add a descriptor, fixture, prepared
artifact or adapter, expected findings, and example scene without changing the
core validator or renderer.

**Exit:** `test-plan.md` §4.1.

### Phase 2 — Single-device renderer and projection comparison

Implement catalogue selection, scalar and point scenes, the equal-area and
Airocean projections, fixed population cartogram geometry, Canvas marks,
semantic overlays, legends, citations, paused exact-value inspection, pan,
zoom, and single-device controls. Projection switching preserves data revision,
time, encoding, and citations; incompatible raster and geography combinations
produce visible refusals.

Prove 4K, laptop, and phone layouts before adding the second-device relay.

**Exit:** `test-plan.md` §4.2.

### Phase 3 — Time, layers, flows, and raster frames

Add animation, actual-period labels, compatibility previews, multiple scalar
layers, flow-over-field rendering, time-filtered points, compatible raster
frames, missing/uncertainty states, and deliberate alignment transformations.
Keep formulas limited to named unit-compatible operations in recorded scenes;
arbitrary contributor expressions stay deferred.

**Exit:** `test-plan.md` §4.3.

### Phase 4 — Composer, educational scenes, and portability

Add scene creation and revision, projection and layer configuration, definitions,
caveats, discussion prompts, ordered presentation stops, share links, explicit
scene upgrades, portable bundle administration, and offline single-device
rendering for bundled permitted assets. Invalid combinations fail before save,
and a share link never silently follows a newer dataset revision.

**Exit:** `test-plan.md` §4.4.

### Phase 5 — Detached controller and reference relay

Implement the session reducer's in-memory and WebSocket transports, QR and join
flow, stale-intent refusal, snapshots, reconnect, connection status, expiry,
rate and payload limits, and controller views for time, layers, projection, pan,
zoom, selection, and presentation stops. The relay receives no dataset body and
the display continues from its last accepted state when disconnected.

Deployment of a public relay or public application is permission-gated. Local
and packaged relay tests must pass before requesting that permission.

**Exit:** `test-plan.md` §4.5.

### Phase 6 — Teaching and large-display validation

Refine catalogue entry points, display-distance typography, semantic data
tables, reduced motion, keyboard/touch use, source-and-method disclosure,
presenter notes, and facilitated presentation flow. Test one unguided public
exploration and one teacher-led sequence at the three required viewports.

With explicit permission, deploy a test application and relay, then repeat the
identity-free public exploration and two-device session on the live URLs. No
account, location access, analytics, or unpublished scene support is introduced
as a deployment shortcut.

**Exit:** `test-plan.md` §4.6.

### Phase 7 — Spherical export and representative acceptance

Implement the generic deterministic frame-sequence export, timing manifest,
legend and attribution assets, conversion report, and the best confirmed SOS
package profile available at implementation time. Test unsupported layer and
projection losses explicitly. If a real sphere installation and operator are
available, validate there; otherwise record that direct hardware behavior
remains unproved.

Run the full contribution, classroom presentation, portable restore, and sphere
export exercises with someone other than the implementer. Record corrections,
comprehension problems, preparation effort, performance, and operator burden.
Graduate the useful output only after those findings are addressed or recorded
as refining work.

**Exit:** `test-plan.md` §4.7.

## 4. Deferred follow-ons

After first-version evidence, reconsider live provider refresh services,
columnar or tiled renderers, local-network relay transport, direct sphere
control, student authoring and moderation, variable-driven or subnational
cartograms, private catalogues, and collaboration. None may replace the
first-version provenance, compatibility, portability, or accessibility
contracts.
