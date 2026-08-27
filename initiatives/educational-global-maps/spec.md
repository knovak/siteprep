# Specification

## Summary

Educational Global Maps is a browser-based catalogue, map composer, and
presentation system for cited geographic time series. It separates four things
that must evolve independently:

1. **dataset descriptors** explain what a source offers and under what terms;
2. **prepared dataset revisions** pin the actual data, geography, and
   transformation used in a view;
3. **scenes** describe reproducible layers, time, projection, legends, and
   educational framing; and
4. **presentation sessions** synchronize a large display with a controller
   without making either device the permanent home of the content.

The first version optimizes for a teacher-led explanation on a conventional 4K
display, controlled from a laptop or phone. The same catalogue and scenes also
support unguided public exploration. A contributor can add a representative
dataset without changing renderer code. Direct operation of spherical hardware
is deferred in favor of a portable export boundary.

## Product principles

- **The citation travels with the picture.** A map is incomplete without its
  measure, unit, time, source revision, licence, missing-data treatment, and
  relevant caveat.
- **Preparation is not invisible cleanup.** Interpolation, aggregation,
  boundary matching, and editorial exclusions are versioned transformations.
- **Compatibility is proved, not assumed.** A layer or projection combination
  that cannot preserve meaning is refused with an explanation.
- **The display teaches; the controller operates.** The large screen retains
  the title, map, essential legend, date, and source identity while detailed
  controls and notes may stay on the personal device.
- **Uneven geography remains visible.** Source-specific administrative levels
  and historical boundaries are not forced into a fictional universal
  hierarchy.
- **A prepared view can outlive its provider and host.** Reproducible scenes and
  permitted data snapshots can be exported rather than depending on live
  embeds.

## First-version users and setting

### Primary: teacher-led presentation

A teacher selects or prepares a scene, opens it on a classroom display, joins
the session from another device, and controls time, visible layers, projection,
pan, and zoom. The teacher can reveal definitions, sources, limitations, and
discussion prompts without placing the full authoring interface on the display.

### Supported: independent exploration

A member of the public or a student can open the same scene in a single browser,
inspect its provenance, move through time, compare compatible projections, and
branch into the catalogue. No controller or account is required.

### Supported: dataset contribution

A technically capable contributor follows a documented contract to add a
descriptor and either a permitted prepared artifact or a preparation adapter.
Validation explains missing metadata, incompatible geography, malformed values,
licence gaps, and rendering-capability mismatches before the contribution can
enter the catalogue.

Student-authored data, assignments, grading, and multi-user collaborative
editing are later settings. They must not distort the first version into a
learning-management system.

## Canonical objects

### 1. Dataset descriptor

A descriptor is the searchable catalogue record. It is small enough for a
catalogue containing hundreds of entries to load without fetching the data.

| Field group | Required meaning |
|---|---|
| Identity | Stable local id, title, short description, topics, provider, original source URL |
| Rights | Licence or reuse terms, attribution text, access restrictions, whether a snapshot may be redistributed |
| Measure | Variable definition, units, value type, valid range when known, uncertainty or quality notes |
| Space | Source place vocabulary, supported place levels, spatial coverage and resolution, boundary or geometry references |
| Time | Earliest and latest period, cadence or irregularity, temporal resolution, update frequency, measured/estimated/interpolated semantics |
| Access | One or more distributions or data services, formats, authentication needs, and current availability status |
| Version | Descriptor version, source version or retrieval identity, update date, provenance, and checksums where available |
| Capabilities | Scalar-by-place, point, flow, raster-frame, or tile profile; supported projections and interactions after preparation |

The vocabulary should map cleanly to DCAT concepts where they fit and borrow
STAC asset conventions for spatiotemporal files, but the application contract
is its own versioned schema. A contributor does not need to publish RDF or run a
STAC service.

### 2. Prepared dataset revision

A prepared revision is the immutable input a reproducible scene uses. It pins:

- the descriptor version and exact upstream version, retrieval, or snapshot;
- the preparation process and its version;
- the normalized data artifact and checksum, or a stable permitted remote asset;
- the geography set and boundary version;
- units, missing-value codes, uncertainty fields, and time semantics;
- all aggregation, interpolation, filtering, and crosswalk decisions; and
- the licences and attributions that must appear in derived views.

Updating a provider creates a new revision. It does not mutate scenes that name
the earlier revision. A scene may be explicitly upgraded and records that
change.

### 3. Geography set

A geography set contains source-aware place identifiers and, where needed,
versioned geometry. A place reference has a namespace, source id, label, type,
parent when known, coverage dates, and geometry-version reference. Country,
region, district, and city are descriptive types, not guarantees of a complete
global hierarchy.

Crosswalks are separate, cited artifacts with a method, confidence or status,
and temporal validity. The system never joins two datasets merely because their
place labels match. A one-to-many or historically invalid match must be exposed
for review or make the combination unavailable.

### 4. Scene

A scene is a versioned, shareable description of an educational view. It names:

- one or more prepared dataset revisions;
- compatible layer types, encodings, ordering, opacity, and filters;
- an explicit time selection and alignment rule;
- projection and camera state;
- title, short explanation, definitions, discussion prompt, and caveats;
- legend, units, missing-data treatment, and uncertainty treatment;
- citations and required attribution; and
- optional ordered stops for a prepared presentation.

A scene stores declarative state, not executable contributor code. Opening a
scene reproduces the same data revisions and alignment decisions or reports
exactly which required asset is unavailable.

### 5. Presentation session

A session is temporary synchronized state layered over a scene: current time,
active layers, projection, pan, zoom, selected feature, and presentation stop.
It has a short-lived random join secret and a monotonically increasing revision
number so controller and display can detect stale commands. It is not a new copy
of the scene and is not needed to save or share one.

## Supported data profiles

The contribution contract has a small number of normalized profiles rather
than one schema that pretends every geographic source is alike.

### Place time series

Each observation names a geography set and place id, measure, period or instant,
value, status, and optional uncertainty. It supports choropleths, proportional
symbols, labels, and comparison charts. Missing, estimated, interpolated, and
suppressed are distinct states rather than special numeric values.

### Origin-destination flow time series

Each observation names origin and destination place ids, period or instant,
value, unit, direction semantics, and optional uncertainty. It supports arcs or
lines over a compatible reference layer and preserves zero, missing, and
suppressed as different states.

### Points and events

Each observation has a stable feature id, coordinates or a place reference,
time coverage, properties, and provenance. It supports point symbols and
time-filtered annotations without requiring a statistical-area join.

### Raster frames and tiles

A descriptor may catalogue dated raster frames or a tile service with extent,
resolution, projection, time, access, and licence metadata. The first renderer
may show compatible raster material on the conventional map and include it in
catalogue search. Alternate-projection support is advertised only when the
artifact can actually be reprojected without violating access terms or losing
its meaning.

The catalogue can describe other formats before the renderer supports them.
Descriptor presence and renderability are separate, visible capabilities.

## Preparation and contribution

A contribution contains:

1. a descriptor that passes the catalogue schema;
2. a small recorded fixture permitted for tests;
3. either a normalized, redistributable artifact or a preparation adapter;
4. geography and crosswalk declarations;
5. expected validation results and at least one representative scene; and
6. licence, attribution, source-version, and update instructions.

Preparation adapters run outside the reader's browser. They fetch or read one
declared distribution, validate its observed shape, normalize it, and emit an
immutable revision report. Credentials never enter a published scene or static
asset. An adapter may emit only metadata when source terms forbid redistribution;
the resulting live dependency is then conspicuous and export limitations are
recorded.

Validation checks schema, identifiers, time ordering, units, finite values,
duplicate keys, missing-value codes, geometry references, crosswalk coverage,
licence fields, checksums, and claimed render capabilities. It warns about
suspicious gaps and outliers but does not silently repair them. Deliberate
interpolation or aggregation is a named transformation with parameters and
evidence.

## Composition and time alignment

A single layer may be rendered directly from one prepared revision. Multiple
layers require a compatibility decision covering geography, time, units,
semantics, and projection.

- A scene declares whether time is an instant, interval, calendar period, or
  nearest available observation.
- Each layer shows the actual source period used at the current scene time.
- Forward filling, interpolation, aggregation, and normalization are off by
  default and must be named in the prepared revision or scene.
- Layers with different cadences may coexist when their actual periods remain
  visible; the interface must not imply simultaneous measurement.
- Mathematical combinations require compatible units and an explicit formula.
  Visual layering alone does not imply correlation or causation.
- Missing data uses an encoding distinct from zero and from values outside the
  selected range.

Animation emphasizes trend and movement. Exact value inspection remains
available while paused, because animation is not assumed to improve every
map-reading task.

## Rendering and projections

The first renderer is a capability-based vector scene renderer using projected
GeoJSON and scalable browser graphics. A D3 geographic projection layer is the
reference path because it supports conventional, interrupted, and Airocean
geometry through one explicit projection boundary. Canvas is the default mark
surface at larger feature counts; SVG or accessible HTML may supply labels,
focus targets, legends, and small scenes. A later WebGL layer may implement the
same scene contract without changing catalogue or scene objects.

### Conventional map

An equal-area world projection is the default global reference so area-based
comparisons are not dominated by Mercator distortion. A local or regional scene
may choose another named conventional projection. Pan and zoom never remove the
visible title, time, essential legend, or source identity.

### Dymaxion-style map

Compatible vector boundaries, points, symbols, and flows can switch to an
Airocean/Dymaxion-style projection while retaining the same revisions,
encodings, time, and citations. The interface explains interruption and
orientation, and offers an immediate return to the conventional reference.
Raster or tile layers that cannot be faithfully transformed are disabled with a
specific explanation rather than omitted silently.

### Population cartogram

The first population view is a **fixed, versioned country-level
population-proportional cartogram**, not a cartogram recomputed from whichever
measure is being studied. It names the population dataset and year that shape
the geometry, preserves the scene's color or symbol encoding, and appears with
a conventional reference using the same regional colors. Subnational and city
layers do not claim cartogram support until matching versioned geometry exists.

This choice keeps the distortion vocabulary understandable and prevents a
measure such as emissions or mortality from silently changing both area and
color at once.

### Capability checks

Each layer declares compatible projections and required geometry. A composite
scene offers only the intersection of its active layers' capabilities. If a
person activates an incompatible layer, the current projection stays visible
and the interface explains which layer cannot be added and why.

## Catalogue and scene interface

The catalogue can search and filter hundreds of descriptors by topic, provider,
place level, time coverage, data profile, licence, and render capability without
loading their data. Each result leads to a detail view with provenance,
definitions, coverage, gaps, versions, access limits, and prepared example
scenes.

The composer starts from a prepared scene or one renderable dataset revision.
It can add compatible layers, select encodings, set time behavior, choose a
projection, edit educational framing, and preview citations. Invalid
combinations are rejected before saving. Advanced contribution and preparation
controls are not mixed into this reader-facing surface.

Every scene has a stable share link and a portable export. A shared link may
point to a newer application, but the scene continues to name immutable data
revisions.

## Display and controller

The display and controller are two browser views over the same session-state
contract. The first transport is a small, self-hostable secure relay. The
display creates a session and shows a QR code plus a short join URL; the
controller joins with the random session secret. The relay forwards validated
state messages and does not need dataset contents or accounts.

- The display is authoritative for the accepted revision number and sends a
  snapshot when a controller joins or reconnects.
- The controller sends typed intents such as set time, toggle layer, select
  projection, pan, zoom, or move to presentation stop. It cannot send markup or
  executable code.
- Both views show connection state. On interruption the display keeps the last
  valid scene, the controller stops claiming success, and either may retry.
- A single-browser mode exposes the same controls locally for independent use,
  testing, and rooms where a second device is unavailable.
- Sessions expire after inactivity and can be ended from either device. Join
  secrets are not analytics identifiers and are not retained in scene exports.

Internet access is a first-version requirement for a two-device session and for
live provider assets. A prepared exported scene remains viewable on one device
when all permitted assets are bundled. A local-network relay is a compatible
future transport, not an undocumented promise that every classroom firewall
will permit peer-to-peer discovery.

## Large-display and controller presentation

At widths up to 4K, the display prioritizes the map and keeps the following
legible at presentation distance: title, current period, essential legend,
missing-data key, active source names, and a visible cue for definitions and
caveats. Detailed metadata, layer configuration, presenter notes, and the full
citation record can remain on the controller, but the display always offers a
readable source-and-method view of its own.

The controller supports phone and laptop widths, keyboard and touch input, and
does not require pixel-precise gestures. Both views respect reduced-motion
preferences; animation can be paused immediately; focus, labels, legends, and
color choices meet the repository's documented accessibility target selected
during planning.

## Educational framing

A scene can include a short explanation, definitions, source caveats,
discussion questions, and ordered presentation stops. These are versioned with
the scene and cite claims separately from the dataset attribution. A blank
narrative is permitted for exploration, but missing units, time, source, and
missing-data treatment are not.

The interface distinguishes measured, modeled, estimated, interpolated, and
unavailable values when a source supplies or the preparation process creates
those distinctions. It also identifies boundary assumptions such as displaying
historical values on current countries.

## Portability and spherical boundary

A portable scene bundle contains the scene, descriptor and revision metadata,
required geography and crosswalk versions, permitted normalized artifacts,
citations, checksums, and a human-readable inventory. Live or restricted assets
remain references with their access and expiry limitations; export never
implies permission to redistribute them.

The first spherical boundary is an **export adapter**, not a direct sphere
renderer. For a compatible prepared scene it emits an equirectangular frame
sequence or other SOS-supported asset form, timing information, attribution,
legend and playlist metadata, plus a conversion report naming anything that
could not survive. The exact SOS package profile must be confirmed against the
target installation during implementation. A deterministic generic frame
sequence and manifest remain the portable fallback when no sphere is available
for validation.

## Failure and refusal behavior

The system distinguishes at least:

- descriptor unavailable or malformed;
- source distribution unavailable, changed, or authentication-required;
- revision checksum mismatch;
- licence or attribution incomplete;
- geography or crosswalk incompatible;
- time periods not alignable under the declared rule;
- units or measure semantics incompatible;
- layer unsupported by the current projection;
- display-controller session disconnected or stale; and
- export incomplete because an asset is restricted or unsupported.

Existing valid layers remain visible when an added layer fails. A scene never
falls back to a newer revision, different geography, projection, or
interpolation rule without saying so.

## Security and privacy boundary

Public exploration requires no account and collects no location or personal
profile. Session secrets authorize only temporary control of one presentation;
they do not grant contributor access or reveal unpublished scenes. Descriptor,
adapter, scene, and session messages are schema-validated, and contributor data
cannot inject script, arbitrary HTML, or network destinations into a reader's
browser. Any analytics, accounts, private catalogues, or uploaded data would
require a later explicit privacy and authorization design.

## Alternatives considered

### Catalogue and preparation

| Option | Strengths | Weaknesses |
|---|---|---|
| Query every provider live in the browser | Minimal local storage; freshest upstream values | Provider APIs, credentials, schemas, CORS, outages, and revisions leak into every reader session; weak reproducibility |
| Normalize and host every dataset centrally | Uniform reader and durable snapshots | Recreates a large data warehouse, assumes redistribution rights, and makes hundreds of sources an operational prerequisite |
| **Hybrid descriptors, preparation adapters, and immutable prepared revisions** | Keeps the catalogue broad, pins reproducible views, permits live references when redistribution is forbidden, and isolates provider changes | Requires a preparation workflow and visibly mixed availability modes |

**Chosen:** the hybrid model. It is the smallest architecture that supports a
large catalogue, contributor adapters, honest licensing, and reproducible
scenes without promising to host the world's data.

### Dataset and visualization identity

| Option | Strengths | Weaknesses |
|---|---|---|
| Treat every visualization as the canonical object | Simple sharing model | Duplicates data identity and makes provenance or contribution reuse difficult |
| Treat a mutable dataset URL as canonical | Few local objects | A provider change can silently alter every map |
| **Separate descriptor, immutable revision, and scene** | Clear provenance, reuse, upgrades, and reproducible views | More object types and explicit version management |

**Chosen:** separate objects. The extra vocabulary reflects real boundaries the
wish requires the product to audit.

### Geography

| Option | Strengths | Weaknesses |
|---|---|---|
| One universal administrative hierarchy | Easy joins and filters | Falsely implies consistent district, city, and historical coverage worldwide |
| Provider labels and names only | Low preparation cost | Ambiguous names and silent mismatches make layering unreliable |
| **Source-aware geography sets with explicit versioned crosswalks** | Preserves provider truth and makes joins reviewable | Crosswalks require maintenance and some combinations remain unavailable |

**Chosen:** source-aware identities and explicit crosswalks.

### Rendering foundation

| Option | Strengths | Weaknesses |
|---|---|---|
| Embed existing chart or map products | Fastest initial catalogue examples | Alternate projections, detached control, portable scenes, and contribution behavior remain provider-specific |
| Adopt a general WebGL map application as the product model | Strong scale, layers, and interaction | The educational catalogue and unusual projection contract become extensions around another application's state model |
| **Use a small scene contract with a D3 projection boundary and Canvas/SVG renderer** | Direct control of conventional and Airocean projections, citations, refusal behavior, and frame export | Large imagery and extreme feature counts need later specialized renderers |

**Chosen:** the small capability-based renderer for the first version, with a
documented renderer interface for later WebGL or tile implementations.

### Population distortion

| Option | Strengths | Weaknesses |
|---|---|---|
| Recompute area from the active measure | Dramatic comparison and broad cartogram flexibility | Changes shape and visual encoding together, increases authoring complexity, and can obscure the reference geography |
| Omit cartograms from the first product | Lower risk and simpler projection work | Leaves one of the wish's meaningful possibilities untested |
| **Use one fixed, versioned population cartogram with a conventional reference** | Teaches population-weighted geography with a stable distortion vocabulary | Initially limited to supported country geometry and one population revision |

**Chosen:** the fixed population cartogram.

### Display-controller transport

| Option | Strengths | Weaknesses |
|---|---|---|
| Depend on AirPlay or screen mirroring | Familiar and no application session protocol | Mirrors controls onto the display and varies by platform; does not create a separate controller surface |
| Direct peer-to-peer browser connection | Low relay traffic and may continue locally | Discovery and negotiation still need signaling; school networks can block or degrade peer connections |
| **Temporary session through a small self-hostable relay** | Predictable two-device behavior, typed state, reconnects, and replaceable transport | Requires network access and a minimal service |

**Chosen:** relay-backed browser sessions, with same-device control and a later
local-network transport behind the same session contract.

### Spherical displays

| Option | Strengths | Weaknesses |
|---|---|---|
| Drive sphere hardware directly | Rich live control | Hardware-specific, costly to test, and couples content to an installation generation |
| Ignore sphere support until hardware is available | No speculative integration | Risks designing scenes that cannot be exported later |
| **Prove an export adapter and portable frame manifest** | Validates the content boundary without requiring permanent hardware | Interactive sphere behavior remains unproven until tested at a target installation |

**Chosen:** export first, direct rendering later if a real installation and
operator require it.

### Primary teaching setting

| Option | Strengths | Weaknesses |
|---|---|---|
| Unguided public exploration | Broad reach and simple access | Gives less direction for detached control and facilitated interpretation |
| **Teacher-led presentation with public single-device exploration** | Exercises the 4K/controller wish and the facilitation evidence while keeping scenes independently usable | Student authoring and classroom workflow remain later work |
| Student-authored assignments first | Tests contribution and learning deeply | Pulls the first product toward accounts, grading, moderation, and collaboration |

**Chosen:** teacher-led presentation as the primary acceptance setting.

## First-version acceptance boundary

The first version is complete when it can demonstrate all of the following
without undocumented manual edits:

- search and inspect a catalogue of hundreds of descriptors while loading data
  only for a chosen revision;
- prepare and validate representative scalar place-time-series, flow, point,
  and raster-frame entries from more than one provider and across the place
  levels actually supplied;
- let a contributor add one representative dataset and example scene through
  the documented contract without editing core rendering code;
- build a single-layer view, a compatible layered view, and a flow-over-field
  view with explicit time alignment, missing data, units, and citations;
- switch a compatible vector scene among the conventional, Airocean, and fixed
  population-cartogram views while refusing incompatible layers clearly;
- save, share, upgrade, and export a scene without silently changing its pinned
  dataset revisions;
- control time, layers, projection, pan, zoom, selection, and presentation stops
  from a phone or laptop while the 4K display retains the map, title, essential
  legend, period, and source identity;
- recover coherently from a dropped controller connection and continue in
  single-device mode;
- render an exported scene with bundled permitted assets without the original
  hosted map service; and
- produce and inspect the spherical export proof, including its conversion
  report, without requiring a permanent sphere installation.

## Deferred

- universal provider coverage or centralized hosting of every source;
- a complete global historical-boundary ontology;
- arbitrary formulas or arbitrary contributor code in the browser;
- real-time multi-author collaboration, accounts, grading, or publishing feeds;
- guaranteed offline two-device discovery on every classroom network;
- direct sphere hardware control;
- variable-driven cartograms or subnational cartograms without validated
  geometry; and
- decision-grade use of educational source products where their own terms or
  methods do not support it.
