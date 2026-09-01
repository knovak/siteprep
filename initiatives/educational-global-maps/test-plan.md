# Test plan

Written 2026-08-31 with `plan.md`. Tests follow the same object contracts from
preparation through catalogue, scene composition, display, controller, bundle,
and spherical export. A screenshot that looks persuasive is not evidence that
the data, time, rights, or projection remained correct.

## 1. Test layers

1. **Schema and domain tests** validate canonical objects, ids, references,
   findings, compatibility, time alignment, checksums, and scene-state changes.
2. **Preparation contract tests** run every adapter against recorded inputs and
   compare the immutable revision report and normalized artifact.
3. **Bundle tests** export, inspect, restore, and compare logical inventories,
   including restricted-asset and hostile-archive cases.
4. **Renderer tests** compare projected coordinates, visible marks, legends,
   period labels, projection capability, picking, and semantic summaries against
   known fixtures.
5. **Browser tests** exercise public exploration, composition, presentation,
   keyboard/touch behavior, required viewports, and failure messages in a
   production build.
6. **Protocol and relay tests** inject stale, repeated, malformed, oversized,
   reordered, and disconnected controller messages.
7. **Performance tests** use fixed fixtures and record p50/p95 results plus the
   machine, Chromium version, viewport, build, and run count.
8. **Witnessed tests** ask a contributor, learner, and presenter to complete the
   acceptance exercises without undocumented help.

CI uses recorded fixtures and a deterministic clock. Live providers, a public
deployment, a classroom network, and sphere hardware are separate evidence
runs; CI never silently substitutes a live success or failure for a recorded
contract test.

## 2. Fixture matrix

| Fixture | Contents | Purpose |
|---|---|---|
| Minimum | One country scalar series, two periods, one missing value, one geography, one scene | Fast canonical round trip and renderer smoke |
| Profiles | Scalar, flow, point, and raster-frame artifacts with exact expected findings | Profile and capability coverage |
| Geography | World countries, one subnational set, city points, a one-to-many and a temporally invalid crosswalk, fixed cartogram geometry | Source-aware identity and projection checks |
| Time | Instant, interval, year, month, irregular cadence, estimated, interpolated, suppressed, zero, and unavailable values | Alignment and disclosure |
| Rights | Redistributable, metadata-only, restricted, attribution-required, and expired live references | Bundle and citation behavior |
| Hostile | Invalid JSON, unknown schema, duplicate ids, non-finite values, checksum mismatch, unsafe paths, oversized metadata, script/HTML strings, and arbitrary URLs | Refusal and injection boundaries |
| Canonical | Reordered keys, duplicate keys, Unicode normalization pairs, case-folded path pairs, signed zero, exponent forms, timestamp offsets, absent/null fields, and one supported old schema | Stable identity, collision refusal, and migration behavior |
| Archive limits | Excess entries, deep paths, platform-reserved names, links, sparse or high-ratio payloads, per-entry overflow, and total expansion overflow | Bounded staged import with no accepted-state change |
| Multi-provider | Recorded rights-safe OWID, Data Commons/original-source, and NOAA or NASA samples plus synthetic flows | Real provenance and adapter behavior |
| Catalogue scale | 500 descriptors without loading their artifacts | Search and startup budget |
| Render scale | 300,000 scalar observations, 25,000 flows, 50,000 points, 24 raster frames, and representative geography | Rendering, memory, and bundle budgets |
| Session | Two controllers, reconnects, stale revisions, duplicate intents, invalid payloads, and two-hour expiry | Authority and relay behavior |

Every recorded external fixture includes its retrieval date, source URL,
upstream identity when available, licence and attribution, checksum, adapter
version, and whether redistribution is permitted. A live refresh changes the
fixture only through review.

## 3. Invariants kept for every phase

| Invariant | Required proof |
|---|---|
| Exact revisions | A scene and bundle name immutable descriptor, prepared-data, geography, crosswalk, and cartogram versions |
| No silent repair | Validation findings explain missing, suspicious, or incompatible input; acceptance never mutates it invisibly |
| Source-aware places | Label equality alone never joins two place ids; crosswalk method and temporal validity remain inspectable |
| Time stays honest | Every layer displays the actual period and status used; zero, missing, suppressed, estimated, modeled, and interpolated remain distinct |
| Projection is capability-based | Incompatible layers are refused without changing or blanking the accepted scene |
| Citations travel | Title, measure, units, source revision, licence or terms, period, and missing-data treatment survive save, share, projection switch, and export |
| Declarative scenes only | Descriptors, scenes, and session messages cannot inject script, arbitrary HTML, executable expressions, or undeclared network destinations |
| Rights bound export | Restricted assets remain references; possession or a checksum never becomes redistribution permission |
| Display authority | Only an accepted display revision changes session state; stale or repeated intents cannot overwrite newer state |
| Relay ignorance | Dataset artifacts, contributor credentials, unpublished content, and personal profiles do not enter relay state or logs |
| Single-device fallback | Every accepted scene and operation remains usable without a controller or relay |
| Portable restore | Bundled permitted assets render without the original provider or application host |

## 4. Phase exits

### 4.0 — Contracts, fixtures, and portable scene core

| Test | Pass condition |
|---|---|
| Schema examples | Every canonical object has one valid minimum example and targeted invalid examples with stable finding codes and paths |
| Canonical identity | Published test vectors prove the key-order, UTF-8, Unicode, number, timestamp, absent/null, and algorithm-prefix rules; reordered equivalent metadata has the same identity and a semantic change has a different one |
| Duplicate and ambiguous input | Duplicate JSON members, unsupported numeric forms, normalization collisions, case-folded path collisions, and platform-reserved paths are refused before an object or file is accepted |
| Reference closure | A valid scene resolves exact descriptor, revision, geography, crosswalk, and artifact references; a missing or mutable reference is refused |
| Minimum round trip | Validate, export, restore into an empty directory, re-export, and compare the logical inventory and checksums |
| Idempotent restore | Restoring the same bundle twice creates no second object or changed timestamp in accepted state |
| Version migration | A supported old object migrates to a new immutable identity with a deterministic receipt; the source remains unchanged and repeating migration returns the same target |
| Future version | An unsupported schema names the object and version it cannot read, exposes only bounded error metadata, and changes nothing |
| Hostile bundle | Absolute paths, `..`, links, special files, normalized or case-folded collisions, duplicate ids, oversized metadata, archive-limit violations, unknown required fields, and checksum mismatches are refused before accepted files change |
| Atomic import | Failure at every validation and commit fault point leaves the accepted files and logical inventory identical to the pre-import snapshot; staged remnants are never discoverable as accepted objects |
| Restricted asset | A restricted artifact becomes a referenced inventory item with its limitation and never enters the bundle |
| Pure scene state | A deterministic sequence of accepted intents produces the expected scene snapshot; stale and duplicate intents do not alter it |

The Phase 0 suite is reported in the same four checkpoints as `plan.md`:
identity, repository, bundle, and scene core. Every checkpoint records fixture
versions, stable finding codes, test counts, and the exact validation command.
The bundle checkpoint also records configured entry/byte/ratio/depth limits and
fault-injection coverage, so a passing round trip cannot hide an unbounded or
partially mutating failure path.

### 4.1 — Catalogue and contribution pipeline

| Test | Pass condition |
|---|---|
| Metadata-only startup | The 500-descriptor catalogue becomes searchable without requesting a prepared data artifact |
| Search facets | Topic, provider, place level, time coverage, profile, licence, and projection-capability filters return exact expected ids and counts |
| Detail honesty | Definitions, units, source, licence, version, coverage, gaps, access, transformations, and renderability are visible and distinguish unknown from absent |
| Adapter isolation | Each adapter reads only its declared distribution, accepts no browser credential, and emits deterministic artifacts and a revision report from recorded input |
| Changed provider | A changed shape or checksum creates a new candidate revision and finding; it never mutates the earlier accepted revision |
| Geography validation | Ambiguous labels, missing parents, invalid dates, one-to-many matches, and temporal crosswalk conflicts are exposed or refused as specified |
| Rights gate | Missing or incompatible reuse terms block artifact publication while allowing a metadata-only descriptor when truthful |
| Real reference suite | Recorded samples from more than one provider validate with original-source provenance and the place levels actually supplied |
| Contributor exercise | A person unfamiliar with the implementation adds one descriptor, intentional failure, corrected revision, and example scene without editing core validation or rendering code |

### 4.2 — Single-device renderer and projection comparison

| Test | Pass condition |
|---|---|
| Scalar and point render | Expected countries and points appear with exact legend classes, units, period, source, and missing-value treatment |
| Equal-area reference | Known coordinates and geometry bounds match the named reference projection within the documented tolerance |
| Airocean switch | A compatible scene keeps exact revisions, encodings, period, citation, and selected value while geometry changes to the Airocean projection |
| Cartogram comparison | The fixed geometry names its population source/year, retains scene color or symbol encoding, and offers the conventional reference with matching regional colors |
| Incompatible projection | A raster or unmatched geography remains out of the scene with a specific explanation; the accepted projection and layers remain visible |
| Exact inspection | Pausing permits keyboard and pointer inspection of exact value, status, source period, and uncertainty without reading pixels |
| Semantic equivalent | Canvas marks have a synchronized title, summary, legend, and accessible table or list containing the same selected data |
| Required viewports | 3840×2160, 1440×900, and 430×932 show no unintended overflow or hidden required disclosure; the 4K display contains no full authoring panel |
| Reduced motion | The browser preference disables automatic animation and every animation has an immediate pause control |

### 4.3 — Time, layers, flows, and raster frames

| Test | Pass condition |
|---|---|
| Actual periods | Mixed yearly, monthly, and irregular layers show the actual source period each contributes at every scene time |
| Alignment refusal | A combination with no declared nearest, aggregate, interpolate, or forward-fill rule is refused before rendering |
| Named transformation | An allowed aggregation or interpolation records method, parameters, inputs, output status, and revision provenance |
| Missing versus zero | Zero, unavailable, suppressed, outside range, and filtered values have distinct data state and visible/semantic encoding |
| Flow over field | Direction, magnitude, period, zero, and missing flows match the fixture while the static field keeps its own unit and legend |
| Points through time | Stable point ids enter and leave by declared coverage without being recreated as unrelated features |
| Raster capability | Compatible frames render on the conventional projection; unavailable or non-reprojectable frames produce an explicit limitation on alternate projections |
| Failure containment | A failed added layer leaves every previously accepted layer, legend, time, projection, and camera unchanged |
| Render budget | The representative visible counts meet the paint, update, animation, pan, zoom, and memory budgets in `plan.md` §2.8 |

### 4.4 — Composer, educational scenes, and portability

| Test | Pass condition |
|---|---|
| Compose single and layered scenes | A person creates one scalar, one compatible layered, and one flow-over-field scene with complete citations and no undocumented edit |
| Invalid save | An incompatible geography, unit formula, time rule, rights state, or projection blocks save with a finding that identifies the layer and correction |
| Educational framing | Definitions, caveats, questions, and ordered stops version with the scene; claims can cite sources separately from dataset attribution |
| Stable share | Opening a shared scene after a newer dataset revision exists still uses the pinned revision and offers an explicit upgrade comparison |
| Explicit upgrade | Accepting an upgrade creates a new scene revision naming every changed dataset, geography, transformation, and resulting refusal or warning |
| Portable render | Exported permitted assets render in a clean static server with provider hosts unavailable and match the accepted logical scene |
| Live limitation | A live or restricted asset remains a reference whose expiry/access limitation is visible before export and after restore |
| Bundle budget | The representative bundle restores below the memory budget without loading all catalogue artifacts at startup |

### 4.5 — Detached controller and reference relay

| Test | Pass condition |
|---|---|
| Join | A display creates a 128-bit-or-stronger secret, QR and join URL; the controller receives the authoritative scene snapshot without dataset transfer through the relay |
| Typed intents | Time, layer, projection, pan, zoom, selection, and presentation-stop intents validate and produce monotonically increasing accepted revisions |
| Stale and duplicate | Reordered, stale, and repeated intent ids cannot roll back or duplicate accepted display state |
| Reconnect | After interruption, the display remains usable and a controller reaches the current snapshot within 3 seconds without replaying stale local state |
| Expiry and end | Two hours of inactivity or an explicit end invalidates the join secret and removes relay session state |
| Payload and rate limits | Oversized, unknown, script-bearing, or rapid invalid messages are rejected without affecting a valid session |
| Two controllers | Conflicting intents are serialized by the display revision; each controller receives the resulting authoritative snapshot |
| Single-device equivalence | The same intent sequence through the in-memory adapter produces the same accepted scene as the relay adapter |
| Latency | Controller-to-display first update meets the 250 ms p95 budget on the recorded test relay |

### 4.6 — Teaching and large-display validation

| Test | Pass condition |
|---|---|
| Unguided start | A new visitor opens a topic, identifies measure/unit/time/source, changes time and projection, finds caveats, and returns to the catalogue without instruction |
| Teacher sequence | A presenter opens a prepared scene, joins from a phone or laptop, advances stops, changes time/layers/projection, and recovers from disconnect without exposing authoring controls on the display |
| Presentation distance | On a physical or equivalently reviewed 4K display, title, period, legend, missing-data key, source names, and method cue are legible from the documented viewing distance |
| Keyboard and touch | Catalogue, scene, projection, time, inspection, join, and presentation stops work with keyboard only and with non-pixel-precise touch targets |
| WCAG target | Automated checks and manual focus, contrast, zoom, semantic table, screen-reader naming, color-independent encoding, and reduced-motion review meet the recorded WCAG 2.2 AA target or log a blocking defect |
| No personal collection | Public use requests no account, location, contacts, analytics consent, or personal profile; relay logs contain only bounded operational session data |
| Live deployment gate | If permission was granted, test URLs reproduce public single-device and two-device behavior and access boundaries; otherwise the phase reports deployment as pending rather than simulating it |

### 4.7 — Spherical export and representative acceptance

| Test | Pass condition |
|---|---|
| Generic frame export | A compatible animated scene emits deterministic equirectangular frames, timing, legend, attribution, citations, and a manifest whose checksums verify |
| Conversion report | Unsupported projection, interaction, live asset, typography, or layer behavior is listed with its disposition rather than silently omitted |
| SOS profile | The implementation records the SOS package/source documentation it followed and validates the generated package with the best available local or installation tool |
| No-hardware fallback | Without sphere access, the generic frames and inventory are viewable and the evidence says direct hardware behavior remains unproved |
| Hardware validation | If an installation and operator are available, timing, seam/orientation, legibility, attribution, and operator steps are witnessed and recorded; failures remain open work |
| Full representative path | A new contribution becomes a cited catalogue entry and scene, is explored on one device, presented through a controller at 4K, restored from a bundle, and converted for the spherical boundary |
| Witnessed understanding | A learner or presenter can identify the measure, period, source, missing-data treatment, projection effect, and one limitation; corrections and confusion become explicit refining items |

## 5. Permanent regressions for tempting shortcuts

| Test retained | Shortcut it prevents |
|---|---|
| Catalogue startup requests metadata only | Loading hundreds of datasets to make search appear complete |
| Scene names immutable revisions | Letting a provider update silently change a shared map |
| Place labels never auto-join | Turning ambiguous names into false geographic precision |
| Actual period shown per layer | Implying measurements with different cadence are simultaneous |
| Projection capability refusal | Dropping an inconvenient layer when the projection changes |
| Conventional reference accompanies cartogram | Letting distorted area become an unexplained decorative basemap |
| Canvas has semantic data equivalence | Making a visually impressive map unusable without sight or precise pointing |
| Relay carries state, not data | Converting a temporary controller service into a second data host |
| Same-device control always passes | Making classroom networking a prerequisite for useful exploration |
| Restricted assets stay references | Treating technical possession as redistribution permission |
| Portable bundle renders without the host | Replacing a provider dependency with an application-host dependency |
| Sphere conversion always reports loss | Claiming compatibility because frames were produced |

## 6. Evidence and release record

Each phase appends to `log.md`: fixture and schema versions, commands, test
counts, performance environment and results, screenshots for visible work,
source and rights verification, live URLs and access when authorized, witnessed
participants by role rather than unnecessary identity, failures, and what was
deferred. A later deployment or graduation also records its source commit and
does not overwrite unresolved limitations.
