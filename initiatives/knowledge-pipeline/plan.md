# Plan

This plan builds the Knowledge Pipeline as a sequence of custody-preserving
vertical slices. The first useful increment is not an AI classifier or a full
five-stage screen. It is a source record that can be written, exported,
restored, audited, and refused safely. Every later phase adds judgement or
synthesis without creating a second way to bypass that boundary.

## 1. What decides the order

The phases follow five rules.

1. **Portability precedes population.** The canonical package, repository
   contract, migration path, and restore test exist before the first durable
   source is accepted. A database that cannot yet produce its own logical
   backup is not ready to hold the user's evidence.
2. **Authorization precedes representative data.** The public URL, Site
   identity, application allowlist, collection ownership, and server-side
   authorization checks are exercised while the store is still disposable.
3. **One accepted change path serves every stage.** Direct UI work, native
   imports, LLM proposal files, later app actions, and scheduled operations all
   end in the same validate, preview, commit, activity, and receipt services.
4. **The full loop grows around one deliberately small fixture collection.**
   Harvest, tagging, promotion, topic assignment, integration, and archival are
   proved on traceable material before larger source sets or more AI automation
   are invited in.
5. **Human authority is structural.** No phase may make AI-only promotion,
   standing-document approval, archive disposition, collection erasure, or
   cross-collection administration possible, even temporarily.

A phase exits only when the matching section of `test-plan.md` passes and its
measured or manual evidence is recorded in `log.md` or `decisions.md`.

## 2. Choices the specification left to the plan

### 2.1 First host, identity, and storage

The first hosted test uses **ChatGPT Sites** at one stable public URL, with
Sign in with ChatGPT as the authentication adapter, Sites D1 as the hosted
SQLite-compatible store, and a private Sites R2 binding as the blob adapter.
This reuses the host and authorization boundary already exercised by Bookmark
Sorter without making those vendor bindings part of the domain model.

The Site's access setting and the application's data access are separate
boundaries. The standing decision in `decisions.md` authorizes public test and
production Sites for this initiative, so deployment does not pause to ask for
that access level again. Phase 1 uses a public-access test Site so anonymous,
unlisted, user, and administrator behavior can all be exercised. Public access
exposes only the sign-in and refusal surfaces; every knowledge, collection,
API, export, administration, and blob route stays login- and allowlist-gated.

The Site adapter reads `oai-authenticated-user-id` and
`oai-authenticated-user-email`. Both must be present. A normalized email first
matches an `authorized_user` record, then links the stable Site user id to that
record. Later requests may match the linked id, but knowledge spaces and
collections are owned by internal actor ids rather than by email or a header.
Anonymous requests receive 401, signed-in but unlisted identities receive 403,
and neither path opens a storage transaction.

Only identity values supplied by the trusted Site request context count. The
adapter ignores client-forwarded lookalike headers and refuses incomplete or
conflicting identity. The first administrator is a single deployment-seeded
allowlist row, not public self-enrollment; once linked to a stable Site user id,
changing the seed or presenting the same email under another id cannot claim
that actor. Administrator recovery is a separately authenticated operator
procedure whose use is logged, never an alternate web login path.

Core services receive repository, blob, identity, authorization, clock, id,
and export-trigger adapters. CI and local recovery use SQLite plus a private
filesystem blob adapter. Hosted code imports no D1 or R2 binding outside the
adapter layer. SQL migrations use portable SQLite features and run against
both implementations. The repository contract includes the all-or-nothing
accepted-commit guarantee, including durable receipt creation. If hosted D1
cannot provide the same primitive as local SQLite, its adapter must implement a
staged, crash-resumable commit protocol; it may not weaken the core contract or
expose partly accepted state.

### 2.2 Accounts and allowlist administration

Phase 1 uses four fixture identities: signed out, signed in but unlisted,
allowlisted user, and allowlisted administrator. Only an administrator can add,
change, display, or remove allowlist rows. A user owns any number of private
collections but cannot enumerate another user's collection ids, even through
counts, errors, exports, assets, or receipts. The administrator may run an
explicit cross-collection operation only from an admin route whose preview
names every affected collection.

### 2.3 Collections

Collection names are trimmed Unicode strings of 1–80 characters. Control
characters, path separators used as the entire name, and names that collide
case-insensitively for the same owner are refused. Names are labels, never ids.
The first sign-in presents an empty state and asks the user to create or import
a collection; it does not silently create one. Thereafter the last accessible
collection reopens, with the visible selector remaining authoritative.

Switching collections must show the newly selected collection's shell within
one second and its first queue, topic count, tag count, and export destination
within two seconds at the representative size in §2.8. A stale import preview,
form submission, or browser tab tied to the previous collection is refused.

Erasure is two phase. Confirmation names the collection and counts, offers a
final export, and records the disposition of schedules and retained backups.
Commit first tombstones and locks the collection, then deletes in bounded,
idempotent batches that the administration page can resume. This avoids
pretending Sites has a background worker. Blob garbage collection is likewise
request-driven and deletes only after a fresh reference and retention check.

### 2.4 Scheduled exports

All exports use one service. The first scheduled trigger adapter is a **Codex
heartbeat automation** that invokes the same authenticated “run due exports”
administrator action available to a person; creating that automation requires
the user's explicit permission in Phase 6. A deterministic clock and direct
service call test the same path before that permission is requested. The
adapter may later be replaced by another scheduler without changing a schedule
or receipt.

The scheduled caller runs as an administrator; the pipeline does not add a
service role, dedicated capability, signing secret, or second credential model.
The action determines which schedules are due from stored state rather than
accepting arbitrary collection or destination scope, and deterministic
operation ids make repeated calls safe. Ordinary application authentication
and allowlist checks apply, and no authentication material belongs in the
heartbeat prompt, URL, repository, activity, package, or receipt.

Scheduled artifacts go to private R2 keys under the knowledge space and
schedule id. The initial policy keeps 14 daily and 6 monthly successful
packages. Scheduled and manual exports use the same canonical package format;
the application generates and manages no encryption key. Package manifests,
asset hashes, and storage metadata detect corruption, while authenticated
administrator routes control backup listing, download, and restore. A run
retries after 1, 5, and 20 minutes, records every attempt, notifies only after
the final failure, and never replaces the last successful package with a
partial result.

### 2.5 Initial vocabularies

The controlled actor-category terms are `government`, `business`, `nonprofit`,
`academic`, `community`, `individual`, and `multi-actor`. The controlled
social-value terms begin with the four values named in the wish: `peace`,
`justice`, `well-being`, and `environment`. Every dimension also has an
explicit unknown state, and suggested additions enter as proposals rather than
being coerced to the nearest term.

### 2.6 Relationship registry

The first registry makes endpoint and cardinality rules data, validated both
on proposal import and accepted commit.

| Type | From → to | Direction and cardinality |
|---|---|---|
| `supports` | source or narrative → narrative, comparison, or standing document | directed; many per endpoint |
| `contradicts` | source or narrative → narrative, comparison, or standing document | directed assertion with symmetric display; many |
| `evidence-for` | source or narrative → assessment, narrative, comparison, or standing document | directed; many |
| `derived-from` | narrative, comparison, standing document, or archive disposition → source, narrative, comparison, or standing document | directed; many; exact versions required |
| `duplicate-of` | source → source | symmetric; one accepted assertion per unordered pair |
| `syndicated-from` | source → source | directed; cycles refused |
| `updates` | source, narrative, or standing document → the same type | directed; cycles refused |
| `supersedes` | source, narrative, or standing document → the same type | directed; cycles refused; scope required |
| `latest-update` | source, narrative, or standing document → the same type | derived only; at most one outgoing pointer per declared chain and scope |
| `assigned-to-topic` | source or narrative → topic | directed; one current accepted assertion per pair and scope |
| `part-of` | narrative → topic or narrative | directed; one primary topic, many secondary groupings |
| `incorporated-into` | narrative → standing-document version | directed; many |
| `archived-as` | narrative → archive disposition | directed; exactly one current accepted disposition for an archived narrative |

Inverse labels are display metadata. They do not create duplicate assertions.
Disputed forks intentionally suppress `latest-update` until their scope or
winner is settled by a person.

### 2.7 Assessment and urgency scales

Relevance, source quality, novelty, and importance each use a five-point
ordinal scale from 0 (“none or unusable for this scope”) through 4 (“direct and
exceptionally strong for this scope”), plus unknown. Every value carries
confidence, rationale, evidence ids, and process identity. The interface shows
the dimensions separately and never turns their sum into canonical truth.

Urgency remains a vector: time sensitivity, consequence of delay, evidence
strength and independence, contradiction with the current document, and age of
the affected document. Each uses 0–4 plus unknown. Sorting may use a documented
view-specific rule, but the review surface always shows the underlying values,
uncertainty, dependence-adjusted source count, and rationale.

### 2.8 Representative fixture and performance budget

The first end-to-end collection is **Community heat resilience**. Its material
is project-authored fixture text plus metadata-only remote references and the
existing Bookmark Sorter and Newsletter Story Harvester test shapes; no
copyrighted source body is copied merely to make the fixture realistic. It
contains 18 sources, one duplicate pair, one syndicated chain, one update, one
contradiction, one source assigned to two topics, a `community-heat-resilience`
topic with a project-authored standing document, and a `cooling-access` topic
with none. That is enough to exercise every first-version entity and
relationship without presenting fixture conclusions as real advice.

The scale fixture has three collections and, in the largest, 10,000 current
entities, 50,000 retained versions, 100,000 semantic relationships, 1,000
distinct accepted tags, 2,000 proposed operations, and 2 GiB of referenced
assets represented by small local stubs. On the hosted test or an equivalent
resource profile:

- collection shell appears within 1 second and first useful state within 2
  seconds at p95;
- a 100-row source or queue page, a 1,000-edge relationship neighborhood, and
  the tag inventory each appear within 2 seconds at p95;
- a 2,000-operation proposal validates and previews within 5 seconds;
- a full logical manifest streams with at most 64 MiB application memory and
  completes within 60 seconds, excluding asset transfer; and
- a full restore completes within 10 minutes and reports progress without
  exposing a partly accepted collection.

These are first-version budgets, not promises for all future sizes. Exceeding
one produces a measured decision before pagination, indexing, or deployment
topology is changed.

### 2.9 Package safety and migration

`knowledge-pipeline/v1` has JSON Schemas for envelopes, logical records,
proposal operations, and receipts. Initial configurable limits are a 25 MiB
JSON manifest, 250 MiB uploaded bundle, 100,000 operations, nesting depth 32,
and 1 MiB of text in one entity version. ZIP entries are streamed, normalized,
checked against traversal and expansion limits, and verified against SHA-256
manifest hashes before preview.

Version 1 uses authenticated transport, content hashes, package and operation
ids, and immutable receipts; it does not add a portable digital-signature
scheme before there is a cross-maintainer trust requirement. Every schema
migration first produces and verifies a canonical backup. Supported older
packages migrate through fixtures; unsupported newer versions are refused.

## 3. Phases

### Phase 0 — Portable custody core

Build under `work/` the schemas, logical ids, repository interfaces, local
SQLite schema and migrations, private filesystem blob adapter, canonical
package validator, streaming exporter, transactional importer, activities,
receipts, and restore command. Use the 18-source fixture, but do not yet build a
harvest UI or model call.

Build this large phase as four reversible checkpoints: (1) envelope schemas,
limits, canonical hashing, and a minimum one-source fixture; (2) immutable
versions, activities, the repository contract, transactional commit, and
receipts; (3) relationships, merge/copy preview, canonical export, restore, and
migration rehearsal on the 18-source fixture; then (4) hostile-package and
scale tests. Each checkpoint leaves an executable round trip. Do not build all
five workflow screens or a generic graph query layer to make the fixture pass.

The core must distinguish merge from copy, preserve unknown namespaced
extensions, reject stale proposals, and make same-package reimport a no-op.
Before the phase exits, a fresh database restores from the package, all hashes
and version chains match, and a migration can roll forward only after its
pre-migration package has itself been restored in a disposable store.

**Exit:** `test-plan.md` §4.0.

### Phase 1 — Login-gated Site and collection shell

Under the standing public-deployment permission in `decisions.md`, deploy the
empty application to a public-access test Site at its stable URL while keeping
all data routes login- and allowlist-gated. Add the Site identity adapter,
application allowlist, admin and user roles, D1 repository adapter, private R2
adapter, collection create/select, the two-phase erase workflow, package
administration, and current-collection backup/restore. Import/export controls
appear in the empty Harvest view and administration before representative data
is accepted.

This phase proves 401, 403, stable-id linking, user isolation, administrator
scope, D1/local parity, blob authorization, and collection switching. It does
not yet automate a pipeline stage.

**Exit:** `test-plan.md` §4.1.

### Phase 2 — Harvest, native adapters, and tag inventory

Add direct or browser-saved intake plus the built-in Bookmark Sorter and
Newsletter Story Harvester adapters. Create source versions, external aliases,
capture and rights states, dependency proposals, tags, and harvest activities.
Add the selected collection's source list and tag inventory with accepted,
proposed, active, archived, type, and stage measurements.

Every import uses validate, preview, commit, and receipt. External verdicts
remain external judgements. Missing, restricted, and metadata-only source
bodies remain honest records. Harvest import/export controls use the core
package service rather than stage-specific serialization.

**Exit:** `test-plan.md` §4.2.

### Phase 3 — Tagging, assessment, promotion, and the LLM file loop

Add tagging and promotion queues, vocabulary review, the five assessment
dimensions, dependence-adjusted source clusters, and human acceptance of
promoted, deferred, rejected, or needs-review dispositions. Implement bounded
work-packet export and proposal import so a manually obtained LLM file can
propose many changes while receiving no credential and no commit authority.

The user can accept selected operations, rewrite a rationale, reject the rest,
and export the receipt. Stale base hashes and changed destination collections
invalidate the preview.

**Exit:** `test-plan.md` §4.3.

### Phase 4 — Topics, pair relationships, and mini narratives

Implement topics, the exact relationship registry in §2.6, many-to-many topic
assignment, source-dependence clusters, mini narratives, topic-specific
ordering, and the relationship table plus bounded neighborhood view. Extend
work packets and proposal review to assignments, relationships, and narratives.

One source enters both fixture topics without copying its identity. A person
can accept a narrative while rejecting one proposed relationship, reorder a
topic without versioning the narrative text, and inspect all source-version
links afterward.

**Exit:** `test-plan.md` §4.4.

### Phase 5 — Standing documents, comparison, and archive closure

Add standing-document revisions, comparison entities, urgency vectors,
candidate document patches, explicit human approval, archive dispositions,
searchable archive, and reopening. Run the full fixture loop once against a
topic with a standing document and once against a topic with none.

Application code refuses an AI-only current document, an archive without a
disposition, and an incorporated disposition without the exact document
version. Human edits, rejected proposal parts, unresolved disputes, and
reopened narratives remain visible.

**Exit:** `test-plan.md` §4.5.

### Phase 6 — Recovery, scheduling, and scale

Complete collection and knowledge-space backup, cross-collection copy with id
remapping, migrations, private R2 retention, schedule administration, the
external trigger adapter, retry behavior, large erasure, and performance
instrumentation. With explicit user permission, create the Codex heartbeat
that exercises the hosted trigger; without that permission the tested adapter
remains ready and the hosted schedule is correctly reported as not active.

Before enabling a schedule, prove the administrator action can be invoked
without putting authentication material in the automation prompt or logs and
that a repeated invocation is idempotent. Restore one private R2 artifact into a
fresh deployment through the ordinary administrator path; no key or secret from
the original Site may be required to interpret the canonical package.

Run the scale fixture against local SQLite and the hosted adapter. Tune indexes,
streaming, and pagination without changing package semantics. Restore a
pre-migration package after the migration and compare logical exports rather
than database files.

**Exit:** `test-plan.md` §4.6.

### Phase 7 — Representative use and distribution evidence

Operate all five stages on a bounded, rights-safe source set. Have a person
correct AI proposals, author the accepted standing-document revision, archive
and reopen a narrative, initiate the same export from the web and authenticated
administrator action, and recover a disposable deployment from backup. Verify
the entire application remains usable with model, skill, app, and remote source
body unavailable.

Record operational time, storage, review effort, isolation findings, recovery
steps, scheduling reliability, and whether any real need for sharing or
self-hosting appeared. Compare that evidence against the four deferred
distribution topologies in `spec.md`; do not choose one merely because the
first deployment used Sites.

**Exit:** `test-plan.md` §4.7. A successful exit moves the initiative to
refining; it does not publish data or settle the later distribution decision by
itself.

## 4. Work intentionally left out

- unattended web crawling or mailbox synchronization;
- public collections, invitations, organization administration, or concurrent
  document editing;
- autonomous acceptance of model proposals or standing-document publication;
- cross-collection semantic search and relationships;
- portable package signatures before a cross-maintainer trust boundary exists;
- a generalized graph query language; and
- a production distribution choice unsupported by representative-use evidence.

These are later choices. The first version carries boundaries that make them
possible without pretending to have built or authorized them.
