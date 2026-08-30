# Test plan

The tests prove that the Knowledge Pipeline can preserve evidence and human
accountability while moving material through five stages. A screen that works
but loses a source, accepts a stale proposal, crosses a collection boundary, or
makes an AI-only document current is a failure even if every visible control
behaves correctly.

`plan.md` ends each phase at a numbered section here. Automated checks gate the
commit; measured and human checks gate the phase exit and are recorded with the
fixture, actor, build, and package versions that produced them.

## 1. Test layers

| Layer | What it covers |
|---|---|
| **Schema and property** | Package shapes and limits, ids, hashes, immutable version chains, relationship domains and cardinalities, tag projections, path normalization, and generated scale fixtures |
| **Unit** | Assessment scales, source identity, idempotency keys, merge versus copy, latest-update derivation, urgency display values, collection-name rules, and retention calculations |
| **Repository contract** | The same create, read, version, relationship, activity, receipt, transaction, and migration cases against local SQLite and hosted D1 |
| **Blob contract** | The same put, checksum reuse, authorized read, export, restore, reference removal, and garbage-collection cases against the local adapter and private R2 |
| **Import/export integration** | Validate → preview → selective commit → receipt; full backup and restore; native adapter round trips; stale proposals; partial failure and retry |
| **Browser-driven** | Sign-in states, collection switching, five stage queues, proposal review, provenance traversal, tag inventory, documents, archive, import/export, and administration on desktop and phone |
| **Security and refusal** | Server-side authorization, untrusted HTML and ZIPs, limits, cross-collection ids, secrets, asset rights, erased collections, and AI-only authority attempts |
| **Measured** | Collection switching, queue and graph queries, proposal preview, package streaming, restore, human review effort, and scheduled-export reliability |
| **Human review** | Source capture and rights status, promotion reasoning, narrative fidelity, document authorship, archive disposition, and distribution evidence |

Live model output is evaluated against recorded examples but does not make the
ordinary gating suite nondeterministic. Every deterministic boundary around a
model call uses a recorded proposal fixture. A live evaluation records scores
and reviewer changes separately.

## 2. Fixtures and actors

### 2.1 The end-to-end fixture

The `community-heat-resilience` collection contains the 18 sources described in
`plan.md` §2.8. It includes:

- direct and browser-saved records, one `bookmark-sorter/v1` file, and one
  Newsletter Story Harvester version 1 store;
- retained-text, metadata-only, remote-only, restricted, unavailable, and
  retained-object capture states;
- controlled, open, unknown, aliased, renamed, and deprecated tags;
- one duplicate pair, a three-source syndication chain, one update chain, a
  disputed fork, and a contradiction;
- accepted, deferred, rejected, and needs-review assessments;
- one source assigned to both topics and used in different narratives;
- a project-authored standing document for one topic and no standing document
  for the other; and
- incorporated, rejected, deferred, and superseded archive candidates.

All retained fixture prose and objects are project-authored. Remote examples
retain metadata and rights state without copying bodies. The canonical package,
native inputs, proposal files, expected receipts, corrupted ZIPs, older schema
version, and unsupported future version are committed beside the tests.

### 2.2 Identity and authorization actors

Use four separate identities: signed out, signed in but not allowlisted,
allowlisted user, and allowlisted administrator. Add a second allowlisted user
with a collection whose ids and names resemble the first user's fixtures. This
makes an accidental unscoped query visible instead of relying on an empty
neighbor.

Requests in unit and integration tests carry explicit Site headers; live tests
use real Site identity. Tests never accept a test-only identity header in the
deployed build.

### 2.3 Scale fixture

Generate the three-collection dataset and counts in `plan.md` §2.8 from a fixed
seed. Asset stubs carry declared 2 GiB logical sizes without committing 2 GiB
to the repository. The generator records its seed and expected aggregate
counts, and the same fixture loads into local SQLite and hosted D1.

## 3. Invariants that gate every phase

These tests continue running after the phase that first introduces them.

| Invariant | Pass condition |
|---|---|
| Original evidence survives | Every accepted derived version has a traversable path to exact source versions; ordinary withdrawal or archival deletes none of them |
| Versions are immutable | An update inserts a successor and changes only the rebuildable current pointer; the predecessor hash and content remain unchanged |
| Activities explain accepted state | Every accepted version, relationship, disposition, import, export, and migration names an actor and completed activity |
| Collection scope is mandatory | Every content query and write requires a knowledge-space and collection scope; omitting either is refused, not interpreted as all |
| Authorization is server-side | Changing a hidden control, URL, body id, relationship endpoint, asset key, or export scope cannot reach another user's collection |
| AI proposes only | An LLM or skill actor cannot accept a promotion, make a standing document current, archive a narrative, erase a collection, or administer users |
| Import is transactionally visible | Any failure before commit changes nothing; no reader observes a partial accepted commit; retry after failure or restart produces one receipt whose created hashes match the durable records |
| Reimport is a no-op | Replaying a package or operation changes no version pointer, timestamp, tag, relationship, or receipt except recording the safe duplicate attempt |
| Subsets never delete | Records absent from an import remain untouched |
| Cross-collection references are explicit | Ordinary imports refuse them; an administrative copy remaps all included endpoints and reports omissions |
| Rights remain visible | Missing or restricted bodies survive as references and cannot enter a shareable asset bundle without an allowed redistribution state |
| Secrets never export | Site bindings, headers, cookies, tokens, encryption keys, and private object URLs appear in no entity, activity payload, package, or receipt |
| Unknowns are not invented away | Unknown tags, assessment values, relationship extensions, unavailable bodies, and no-document topics remain visible states |

## 4. Phase exit tests

### 4.0 — Portable custody core

| Test | Pass condition |
|---|---|
| Fresh logical round trip | Import the canonical fixture, export it, restore into an empty database, and compare every logical record, version chain, accepted relationship, activity, receipt, and permitted asset hash |
| Database independence | The same repository contract and logical round trip pass on two independently created local SQLite databases without relying on row ids or file copies |
| Idempotent replay | Reimport the package and every proposal operation twice; current state and counts are unchanged after the first accepted commit |
| Merge versus copy | Same collection ids preserve local ids; an explicit copy remaps ids, aliases, and both relationship endpoints and emits the exact id map |
| Explicit import intent | Preview pins restore/merge/copy mode plus target knowledge space and collection; incoming ids or names never select the mode or destination, and changing either invalidates commit |
| Stale proposal | Change one base entity after export; proposal preview names the stale operation and commit cannot accept it silently |
| Unknown extension | A namespaced extension round-trips; an unknown top-level field is warned and excluded from trusted canonical state |
| Endpoint closure | A relationship whose endpoint version is absent is warned as an external reference in a safe subset and refused when an operation requires that endpoint |
| Transaction failure | Inject failure after half the writes; no accepted state changes and retry with the same operation ids succeeds once |
| Migration backup | A migration refuses to start until its canonical pre-migration package verifies by restoring in a disposable database |
| Limits and ZIP safety | Oversize, over-depth, excessive-operation, absolute-path, `..`, symlink, checksum-mismatch, and expansion-bomb fixtures are refused before extraction or allocation crosses the configured limit |
| Future version refusal | An unsupported package names its version and changes nothing; the supported older fixture migrates with an exportable migration receipt |
| Streaming budget | The scale manifest exports with no more than 64 MiB application memory |

### 4.1 — Login-gated Site and collection shell

| Test | Pass condition |
|---|---|
| Anonymous entry | The public URL presents sign-in; data and API routes return 401 before a database or blob read |
| Deployment access gate | The recorded Site access is public only after explicit permission; public access exposes no knowledge or object route without application authentication and authorization |
| Unlisted identity | A complete signed-in identity absent from `authorized_user` sees the not-authorized state; APIs return 403 and create nothing |
| Trusted identity context | Client-supplied lookalike identity headers are ignored; incomplete or conflicting trusted identity is refused before storage; deployed tests accept no test-only identity override |
| Administrator bootstrap | Deployment seeds exactly one intended administrator allowlist row; no public route self-enrolls, and bootstrap or recovery use is logged without granting collection access to another identity |
| First identity link | An allowlisted email links one stable Site user id once; a different id cannot claim the row and email is not used as collection ownership |
| User isolation | User A cannot list, count, open, mutate, export, erase, infer, or fetch an asset from User B's collection, including by guessed ids |
| Administrator boundary | User routes reject allowlist, schedule, migration, and cross-collection actions; administrator previews name every affected collection |
| Create and select | Names obey the length, trimming, control-character, and case-folded uniqueness rules; empty state remains honest until creation |
| Switch invalidation | Switching collections updates all visible scope and invalidates an import preview and form submission opened against the previous collection |
| Hosted/local parity | Repository and blob contract suites pass against D1/R2 and local SQLite/filesystem adapters, including injected mid-commit failure, restart, invisible staging state, and exactly one receipt on retry |
| Private blob read | A valid collection reference yields a bounded authorized response; an object key, another collection, or a raw R2 URL does not |
| Empty backup | Before any source intake, current-collection export and restore work and carry the collection, actor, configuration, and receipt records |
| Erase preview | Confirmation names the collection, counts, schedules, backups, and final-export option; cancel is byte-for-byte no change |
| Request-driven erase | Tombstoning blocks new work, bounded deletion resumes idempotently, and a shared blob remains until its last permitted reference disappears |
| Collection-switch budget | At scale, shell appears within 1 second and first useful state within 2 seconds at p95 |

### 4.2 — Harvest, native adapters, and tag inventory

| Test | Pass condition |
|---|---|
| Direct intake | A browser-save or direct source preserves origin, contributor, capture time, quoted-versus-summary status, rights, and unavailable-body state |
| Bookmark import | Every supported `bookmark-sorter/v1` field and origin payload survives; incoming collection text never changes the visible destination |
| Newsletter import | Story ids become aliases, runs become activities, and URL, text, summary status, dates, shape, tags, verdict, merge history, and origin fields survive |
| Native reimport | Reimporting either native file is a no-op and overwrites no accepted source content or human note |
| Conservative identity | Exact local id, alias, and reviewed normalized URL match in that order; similar title or text never auto-collapses two sources |
| Dependency honesty | Duplicate and syndicated sources stay separate entities joined by reviewed assertions; raw URL count and independent cluster count differ as expected |
| External verdict | Bookmark and newsletter verdicts display as external judgements and do not create an accepted pipeline promotion |
| Capture limitations | Metadata-only, restricted, expired, and missing bodies remain searchable and export with warnings; none is silently dropped or embedded |
| Tag projection | Unique non-empty flat tags round-trip exactly, including unknown prefixes and bare tags |
| Tag inventory | Counts use current unique entities, not versions; percentages, type/stage breakdown, active/archive counts, proposed count, vocabulary status, filtering, and collection switch all match fixture totals |
| Stage controls | Harvest import and export call the canonical package service and their receipts are visible from both the stage and administration views |

### 4.3 — Tagging, assessment, promotion, and LLM proposals

| Test | Pass condition |
|---|---|
| Bounded work packet | Selection, collection, accepted inputs, omitted dependencies, package hash, and target ids are explicit; no unrelated source body is included |
| No LLM credential | A recorded LLM proposal can validate and preview but has no database, Site, blob, or commit credential |
| Selective acceptance | Accepting some of 2,000 proposed operations creates only those versions and relationships; rejected operations remain in the proposal and receipt |
| Changed destination | Switching collections after preview makes commit refuse with both original and current destinations shown |
| Stale base | A source changed after work-packet export cannot receive the stale assessment or tag without regeneration or explicit reviewed rebasing |
| Vocabulary evolution | Unknown, renamed, aliased, deprecated, split, and replacement terms preserve historical assignments and produce a reviewed impact report |
| Assessment dimensions | Relevance, quality, novelty, importance, and urgency-related inputs each retain value, unknown, confidence, rationale, evidence, actor, and process version |
| No canonical sum | The API, package, and review page expose separate dimensions; any view-specific ordering names its rule and does not write a total as accepted truth |
| Dependence-adjusted review | Duplicate and syndicated sources display raw and independent-cluster counts, so repetition does not become corroboration |
| Human promotion | Only a human actor can accept promoted, deferred, rejected, or needs-review; every outcome remains findable with rationale |
| Live evaluation | A live model proposes tags and assessments for the fixed fixture; a person records corrections, unsupported claims, accepted percentage, and process version without turning that result into a gating threshold |
| Proposal-preview budget | The 2,000-operation scale proposal validates and previews within 5 seconds |

### 4.4 — Topics, relationships, and mini narratives

| Test | Pass condition |
|---|---|
| Many-to-many assignment | One source is accepted into both fixture topics with different angles while preserving one entity and exact source-version links |
| Relationship registry | Every accepted type enforces the `plan.md` §2.6 domain, range, version, direction, scope, and cardinality rules; unknown types remain proposed extensions |
| Cycles and duplicates | `syndicated-from`, `updates`, and `supersedes` cycles are refused; symmetric duplicate assertions collapse to one unordered pair |
| Disputed latest update | A simple chain derives one pointer; a disputed fork derives none until a person records scope or resolution |
| Selective narrative acceptance | A person accepts a proposed narrative, rewrites its text, rejects one proposed relationship, and retains the full proposal and receipt |
| Evidence closure | Every accepted narrative traces to every exact source version it used and distinguishes support, contradiction, dependence, and update claims |
| Topic order | Reordering changes topic-specific assertion metadata and activity history without creating a new narrative-text version |
| Relationship inspection | Table and bounded neighborhood show inverse labels without manufacturing inverse records, and remain usable without graph rendering |
| Relationship-query budget | A 1,000-edge neighborhood appears within 2 seconds at p95 |

### 4.5 — Standing documents, comparison, and archival

| Test | Pass condition |
|---|---|
| No-document topic | Comparison explicitly says no standing document and reports incoming narratives without inventing a baseline or patch |
| Existing-document topic | Comparison separates new, supporting, contradictory, redundant, and updating narratives and shows raw and independent source counts |
| Urgency vector | All five urgency dimensions, unknowns, rationale, evidence, document age, and process version remain inspectable; no opaque score replaces them |
| Human current revision | AI can propose a patch, but only human authorship or explicit approval creates the current standing-document version |
| Partial rejection | The accepted revision records rewritten text, rejected proposal parts, cited evidence, unresolved disputes, actor, time, and accepted text hash |
| Archive gate | Incorporated, rejected, deferred, and superseded dispositions require their specified reason or link; an archive request without one is refused |
| Exact incorporation | Incorporated narratives point to the accepted standing-document version, not merely the document entity or current pointer |
| Search and reopen | Archived narratives remain searchable and exportable; reopening creates a stage event and preserves the earlier disposition |
| Backward audit | A sampled document claim traverses through revision, comparison, narratives, assignments, assessments, tags, and exact original references with actor and activity at every step |

### 4.6 — Recovery, scheduling, erasure, and scale

| Test | Pass condition |
|---|---|
| Three export callers | Web, authenticated admin action, and deterministic schedule trigger produce the same logical package and equivalent receipt for the same scope |
| Hosted scheduled run | With explicit permission and credentialing, a real due schedule creates an encrypted private R2 package and a service-actor receipt; without permission it is visibly inactive, never simulated as successful |
| Trigger authentication | Valid run-due capability executes only due schedules in its scope; expired, replayed, altered-body, wrong-scope, and general-user credentials are refused before schedule lookup, and no credential appears in prompt, URL, log, activity, or receipt |
| Retry and preservation | Fail the destination three times; attempts follow 1/5/20-minute policy, final failure notifies, and the last successful package remains intact |
| Retention | Fourteen daily and six monthly successes survive according to timestamp; failed and partial artifacts never count as a retained success |
| Encryption and recovery boundary | R2 holds no plaintext bundle; a fresh deployment restores with the recorded operator recovery key but not the original Site key, while wrong keys, tampered envelope metadata, and retired key versions fail safely; no wrapping key appears in exports or receipts |
| Full restore | Restore the scale fixture into a fresh store within 10 minutes; counts, hashes, version chains, relationships, receipts, archive states, and permitted asset references match |
| Pre-migration recovery | Take a canonical backup, migrate, restore the older package through its tested adapter, and compare logical exports rather than database files |
| Cross-space copy | Copy a bounded subset, remap every internal id and endpoint, preserve origin aliases, omit unauthorized dependencies with warnings, and grant no access back to the source |
| Large erasure | Tombstone, batch-delete, resume after interruption, disable schedules, apply backup choice, retain only the minimal deletion receipt, and collect blobs only after final reference removal |
| Query budgets | Source page, queue page, tag inventory, and 1,000-edge neighborhood each meet the 2-second p95 budget on the hosted-equivalent scale fixture |
| Streaming and restore budgets | Manifest export stays within 64 MiB and 60 seconds excluding assets; restore meets the 10-minute budget and never exposes partial accepted state |

### 4.7 — Representative use and deferred distribution evidence

This exit is a witnessed sitting, not only a green suite.

- A person imports representative material through all three intake paths,
  corrects tags and assessments, promotes and defers sources, assigns one
  source to two topics, rewrites a narrative, and can explain every retained
  original reference.
- The person reviews comparisons for the documented and undocumented topics,
  rewrites or rejects part of the proposed document change, approves the final
  text, archives with all four disposition shapes, and reopens one narrative.
- A sampled current conclusion traces backward through every stage, actor,
  activity, package, and receipt without relying on model memory or a private
  conversation.
- The same bounded export is initiated through the web and administrator
  action; if the schedule was authorized, its next due run is compared too. A
  disposable deployment with no original Site key restores from the resulting
  encrypted package using the recorded operator recovery procedure.
- Disable the model contributor, any skill or ChatGPT app, and remote source
  bodies. All accepted knowledge, administration, export, restore, document,
  and archive functions remain usable.
- Record source and asset counts, review time, corrections, storage, export and
  restore duration, schedule outcomes, isolation findings, operator burden,
  desired sharing, and any self-host requirement.
- Compare those observations with the four distribution topologies in
  `spec.md`. The evidence may recommend another experiment; it does not have
  to select a permanent distribution model.

## 5. Regression tests for tempting shortcuts

| Test kept permanently | Shortcut it prevents |
|---|---|
| Canonical export restores before every migration | Treating a D1 dump or a successful download as a portable backup |
| Package reimport changes nothing | Making arrival order the hidden conflict policy |
| Every stage uses one import/export service | Adding a convenient stage file that loses versions, relationships, or receipts |
| Collection scope is required below the route layer | Relying on hidden controls or URLs for isolation |
| A proposal actor cannot accept | Letting a future skill or app turn valid JSON into authority |
| Current documents require a human actor and accepted text hash | Treating an AI patch as publication because it passed validation |
| Archive requires a disposition and exact links | Clearing an inbox by hiding unresolved narratives |
| Raw and dependence-adjusted counts display together | Counting syndication as independent confirmation |
| Restricted assets never enter a shareable package | Treating possession or checksum reuse as redistribution permission |
| Schedule failure preserves the previous success | Replacing the only recovery point with a partial artifact |
| Local and hosted adapter contracts stay identical | Allowing D1, R2, or Sites headers into the canonical model |
| Erasure is resumable and reference-aware | Implementing privacy deletion as either a UI flag or an unsafe bulk delete |
