# Specification

## Summary

Knowledge Pipeline is a private, administrator-operated web application that
turns retained sources into tagged and assessed records, topic-specific mini
narratives, human-maintained standing documents, and a reference archive.
Every durable source or derived artifact is a versioned entity. Typed
relationships connect pairs of entities, and an append-only activity record
shows how AI, people, imports, and application code produced each version and
relationship.

The first version proves the complete five-stage loop for one administrator and
one knowledge space. It includes import and export in every stage from the first
increment, not as a later backup feature. An administrator can export a work
packet, ask an LLM to propose tags, assessments, assignments, relationships, or
narratives, inspect the returned file, and import accepted changes. A later
skill plus ChatGPT app uses the same package, validation, proposal, and commit
contracts rather than gaining a less auditable path into the database.

The first deployment is intentionally not a decision about how other people
will eventually receive the system. A shared multi-user service, a
self-maintained kit per user, several maintainer-operated single-user sites,
and a package of skills and ChatGPT apps remain viable distribution choices.
The code carries workspace, actor, storage, authentication, and package
boundaries from the start while implementing only the single-administrator
experience needed to learn which choice is justified.

## Product principles

- **The original reference survives.** Later judgement and synthesis point
  backward to retained source identity and lawful capture status; they never
  replace the only record of what arrived.
- **Interpretation is a versioned entity, not a mutation of evidence.** Tags,
  assessments, narratives, relationships, and standing-document revisions show
  who or what proposed them and what a person accepted.
- **Relationships can disagree.** Support, contradiction, evidence, copying,
  updating, and supersession are explicit typed assertions. A system that can
  only store one current answer cannot represent the pipeline's subject matter
  honestly.
- **Import and export are ordinary work.** Backup, upgrades, LLM round trips,
  moving a subset between people, and future deployment changes use the same
  visible, tested interchange boundary.
- **AI proposes; a person remains accountable.** AI may begin every stage and
  prepare a standing-document change, but it cannot silently promote evidence,
  publish a standing-document revision, or archive the narratives it used.
- **The storage engine and deployment topology are replaceable.** The portable
  package is the data contract. A database dump, a hosting product, and an
  application-specific cache are not.
- **Absence and uncertainty stay visible.** Missing captures, unknown tags,
  disputed relationships, deferred items, and topics with no standing document
  are valid states, not gaps to fill by invention.

## First-version users and scope

### Primary user: the administrator-curator

One signed-in administrator owns a knowledge space, operates all five stage
views, reviews AI proposals, authors or approves standing-document revisions,
and controls import, export, backup, and restoration. The application records
the administrator as an actor even when there is only one person; ownership is
not inferred from a global singleton or hard-coded identity.

### Supported contributor: an LLM working through files

The administrator exports a bounded work packet, supplies it to an LLM, and
receives a proposal package. The package can contain many proposed tags,
assessments, topic assignments, typed relationships, or narratives. The
administrator uploads it through an authenticated administration surface,
reviews a validation and change summary, and commits all or selected
operations. The LLM has no database credential and cannot make an accepted
change merely by producing valid JSON.

### Later contributors

A skill may prepare or interpret a work packet, and a ChatGPT app may fetch it
and submit a proposal through authenticated application actions. Other people
may eventually operate in the same knowledge space or in separate copies. The
first version records enough actor, workspace, and provenance information for
those paths but does not build invitations, concurrent editing, billing,
organization administration, or cross-user permissions.

### Deliberately not the first version

- a public knowledge portal or public submission inbox;
- unattended crawling or continuous mailbox synchronization;
- autonomous acceptance of LLM proposals;
- real-time collaborative editing;
- a universal truth engine or a universal ontology;
- a generalized graph database exposed for arbitrary queries;
- a decision about shared hosting versus per-user deployments; or
- indefinite retention of source bodies that rights or access conditions do
  not permit the administrator to keep.

## Alternatives considered: first system shape

| Option | Strengths | Weaknesses |
|---|---|---|
| **Private web application with an administrator file round trip** *(chosen)* | One durable store and one review surface exercise the complete loop; a relationship table is natural; backup and upgrades can use built-in packages; later authenticated actions can call the same service boundary | Requires hosting, authentication, schema migrations, and an administration interface before every stage is automated |
| **Skills and files only** | Fastest way to try LLM prompts; no host or database; inherently portable | Every reader must fold files into current state; relationship integrity, selective acceptance, concurrent proposals, and standing-document approval become conventions rather than enforced behavior |
| **Desktop application** | Local-first privacy and direct filesystem access; a user-owned SQLite file is straightforward | Distribution and upgrades become operating-system work; browser and ChatGPT app integration need a second boundary; remote use and later collaboration are harder |
| **Multi-user hosted service immediately** | Exercises sharing and collaboration from day one | Forces tenancy, roles, invitations, conflict handling, support, and cost choices before the single-curator loop has proved useful |

The chosen option is a first implementation, not a distribution verdict. Its
replaceable boundaries are specified below so that learning from real use can
change the topology without changing the knowledge model.

## The deferred distribution decision

The following are intentionally still alternatives:

| Later topology | What it would optimize | Evidence needed before choosing it |
|---|---|---|
| One multi-user website | Easy upgrades, shared topics, direct collaboration, one operational surface | Real demand for shared workspaces; acceptable isolation and permission model; support, storage, and model costs at representative scale |
| A self-maintained kit per user | Maximum data custody and customization; no central operator sees private sources | A repeatable install, backup, upgrade, and recovery path that a target user can actually maintain |
| Several maintainer-operated single-user websites | Simple mental model and strong isolation while keeping upgrades in one maintainer's hands | Evidence that per-instance operations, migrations, secrets, monitoring, and costs remain manageable |
| Skills and ChatGPT apps over portable packages or sites | Meets users in their existing AI workflow; reasoning and data actions can be separated | Stable authenticated actions, understandable consent, complete audit receipts, and a usable non-chat administration fallback |

The later decision should compare operational burden, privacy, recovery,
upgrade reliability, sharing semantics, cost, offline or self-host needs, and
how much support users actually want. It must not be made merely because the
first host happens to make one topology convenient.

Five constraints keep all four options open:

1. Every durable row is scoped by a stable knowledge-space id.
2. Every accepted change names an actor, including human, LLM, skill, import,
   and system actors.
3. Authentication and storage sit behind application interfaces; core logic
   never reads vendor identity headers or vendor database bindings directly.
4. Import and export operate on logical records, not database primary keys or a
   platform dump.
5. No URL, administrator identity, secret, or single-deployment assumption is
   embedded in an entity or portable package.

## Canonical model: entities, versions, relationships, and activities

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Stable entities, immutable versions, typed pair relationships, and separate activities** *(chosen)* | Preserves every state and actor; relationships can grow without reshaping source records; relational constraints remain available; directly supports backward audit links | More records and joins than a mutable stage table; current state must be projected deliberately |
| **One mutable table per pipeline stage** | Each queue is easy to query and resembles the five-stage interface | Promotion and movement copy or overwrite data; cross-stage identity and backward links become fragile; one source in several topics creates divergent copies |
| **One large document per source** | A complete source history can travel as one object | Pair relationships are duplicated in two documents or stored only on one side; topic sequences and standing-document evidence become expensive to reconcile |
| **Everything in a property-graph database** | Uniform nodes and edges; flexible traversals | Makes activities, assets, imports, and transactional versions less constrained; adds a specialized host dependency before traversal scale justifies it |

The chosen split treats semantic content and semantic relationships uniformly
without pretending that every operational record is a knowledge entity.

### Entities and immutable versions

An **entity** is the stable identity of something the pipeline retains. An
**entity version** is one immutable state of that thing. The entity row contains
only its id, knowledge-space id, type, creation identity, and a current-version
pointer maintained as a transactional convenience. Meaningful content belongs
to versions.

Updating an entity creates a new version linked to its predecessor. It does not
edit the earlier version. Deleting user-visible material creates a withdrawal
or archive state; it does not erase the audit history. A current-version pointer
can be rebuilt from the version chain and is never the sole record of history.

First-version entity types:

| Type | Durable meaning |
|---|---|
| **source** | One retained reference, including original URL or external identity, bibliographic metadata, capture and rights status, contribution context, and preserved source-system fields |
| **topic** | A named area into which sources and narratives may be assigned; topics may relate to other topics without requiring a fixed hierarchy |
| **assessment** | A reviewable judgement about a particular source or narrative version, including relevance, quality, novelty, importance, urgency, uncertainty, reasoning, and disposition |
| **narrative** | A topic-specific mini narrative that synthesizes one or more sources while linking to every version it used |
| **standing-document** | A durable curated document whose revisions are human-authored or explicitly human-approved |
| **comparison** | The inspectable result of comparing a bounded set of narrative versions with zero or more standing-document versions |
| **vocabulary-term** | A controlled or suggested value in a tag dimension when that value needs a label, status, alias, or replacement history |
| **archive-disposition** | The durable explanation of why a narrative was incorporated, rejected, deferred, or superseded and allowed to leave the active integration queue |

Actors, activities, assets, imports, and exports have stable records but are not
content entities. Keeping them separate prevents a model run from being
mistaken for a source or a conclusion.

### Common entity-version fields

Every version has:

- a stable entity id and immutable version id;
- entity type and schema version;
- created time and creating actor;
- the activity or import receipt that produced it;
- predecessor version when one exists;
- lifecycle state such as proposed, accepted, withdrawn, archived, or disputed;
- type-specific content;
- a flat string-tag projection for interchange and selection, rebuildable from
  accepted tag assignments;
- optional namespaced extensions; and
- a content hash used for idempotency and stale-proposal detection.

The system validates type-specific content but preserves unknown namespaced
extensions through an import and export round trip. It does not preserve
unknown top-level fields as though they were trusted canonical data.

### External identities

An entity may have several external aliases, each a tuple of system, namespace,
and external id, plus the importing activity. This is how a newsletter story
id, a Bookmark Sorter URL identity, a DOI, and a later provider id can point to
one local entity without becoming its database primary key.

Aliases are unique within a knowledge space and namespace. A collision between
plainly different records is reported and skipped; import never chooses a
winner silently.

## Typed relationships between entity pairs

Relationships are first-class, directed assertions stored separately from
entity content. Each assertion contains:

- relationship id and type;
- from-entity id and to-entity id;
- the exact endpoint versions when the claim depends on particular versions;
- optional topic scope;
- state: proposed, accepted, disputed, rejected, or retracted;
- asserting actor, activity, and time;
- optional confidence, rationale, and supporting entity ids;
- predecessor assertion when it revises or retracts an earlier assertion; and
- a content hash and import origin.

A relationship-type registry defines permitted endpoint types, whether the
relationship is symmetric, its display inverse, and whether more than one
accepted assertion of that type is allowed. Unknown imported types are retained
as proposed namespaced extensions until an administrator maps or approves them;
they never become accepted relationships merely because the JSON parsed.

The initial registry includes:

| Type | Meaning |
|---|---|
| **supports** | The from entity materially supports a claim or narrative in the to entity |
| **contradicts** | The from entity materially conflicts with the to entity; symmetric display does not erase which direction was asserted |
| **evidence-for** | The from entity is cited evidence for the to entity |
| **derived-from** | The from entity or version was produced using the to entity or version |
| **duplicate-of** | The entities represent the same underlying item; normally symmetric |
| **syndicated-from** | The from source republishes or closely depends on the to source |
| **updates** | The from entity provides a later update to the to entity without necessarily replacing it |
| **supersedes** | The from entity or version is intended to replace the to entity or version for a stated scope |
| **latest-update** | A rebuildable pointer from an entity to the latest accepted update in one declared update chain |
| **assigned-to-topic** | A source or narrative is assigned to a topic, with topic-specific notes on the assertion |
| **part-of** | A narrative is part of a topic sequence or another narrative grouping |
| **incorporated-into** | A narrative was used in a standing-document revision |
| **archived-as** | A narrative moved out of the active queue under an archive-disposition entity |

**Latest update is derived, not hand-maintained truth.** The durable facts are
accepted updates and supersedes assertions with times and scopes.
Latest-update may be materialized in the same relationship table for efficient
display, but it is marked derived, names the rule that selected it, and is
rebuilt whenever its chain changes. Competing or disputed update chains produce
no single latest pointer until a person resolves or scopes them.

Relationships are not a substitute for every structural table. Entity versions,
activities, imports, and assets keep dedicated integrity constraints. The
relationship table holds semantic and evidentiary connections whose types must
grow without a database migration for each new kind.

## Provenance and the audit record

The provenance model borrows the useful separation in W3C PROV without
requiring RDF: entities are the retained things, activities transform or review
them, and agents are responsible for activities.

An activity records:

- stage and operation kind;
- start and completion times;
- human, LLM, skill, application, or import actor;
- model and model version when applicable;
- process, prompt, skill, application, and schema versions when known;
- input entity versions and relationships used;
- output versions and assertions proposed or accepted;
- package id and hashes for file-based work;
- reviewer and approval time for accepted proposals; and
- warnings, refusals, and counts.

State changes are append-only stage events. A source does not merely have a
mutable stage field; the current queue is a view over its accepted transitions.
The record therefore shows whether AI proposed a transition, a human accepted
it, an import restored it, or a later action reopened it.

The system records enough prompt and model identity to reproduce the boundary
of a run, but need not retain private chain-of-thought or vendor-internal
reasoning. User-visible rationale, evidence, input hashes, and output are the
auditable material.

## Source identity, capture, and dependence

A source version contains at least:

- original URL and a conservative normalized URL key when a URL exists;
- title, author or publisher, publication time, and source-system identity when
  supplied;
- contributed or collected time, path, and actor;
- source kind such as web result, email story, direct donation, or browser save;
- description, note, or retained text with a flag distinguishing quoted source
  material from a generated summary;
- capture status: metadata-only, retained-text, retained-file, remote-only,
  unavailable, restricted, or expired;
- rights or access basis and redistribution status;
- checksum and asset reference for any retained body; and
- flat tags and imported judgement fields.

Matching order on import is: an existing knowledge-pipeline entity id in the
same knowledge space, an exact external alias, then an exact normalized URL key
offered for review. Reimporting the same package is a no-op.

Different URLs never auto-collapse merely because their titles or text are
similar. Exact copies, syndicated stories, mirrors, and dependent sources stay
separate source entities joined by duplicate-of or syndicated-from assertions.
This preserves who published what and prevents repeated URLs from becoming
false independent corroboration. A person may explicitly consolidate exact
aliases while the pre-consolidation identities remain in provenance.

Restricted or inaccessible material is not discarded. Its reference,
availability, and retention limitation survive even when no source body can be
stored or exported.

## Tags and evolving vocabularies

The portable form of tags is the convention shared with Bookmark Sorter and
Newsletter Story Harvester: an unordered set of unique, non-empty strings.
Prefixes separated by a colon carry convention rather than changing the JSON
shape. A bare tag remains legal. Import preserves unrecognized tags and export
round-trips them.

The first dimensions are hybrid rather than universally controlled:

| Dimension | First-version treatment |
|---|---|
| company or organization | Suggested vocabulary terms with aliases; open values allowed |
| geography | Suggested vocabulary terms that may carry external place ids; open values allowed |
| actor category | Small controlled starting set, with proposed additions reviewable |
| technology | Open values with optional promoted vocabulary terms |
| social value | Small curated starting set, with multiple values allowed |
| topic and theme | Open values; topic entity assignment remains distinct from a tag |
| provenance conventions | Existing prefixes such as src:, in:, folder:, theme:, and topic: remain ordinary interoperable strings |

Internally a tag assignment records its source entity version, exact tag string,
proposing or accepting actor, activity, confidence when proposed, and state.
This provenance does not change the tag string itself, so existing selection
logic can still evaluate membership. A vocabulary term may be renamed,
aliased, deprecated, split, or replaced without rewriting historical
assignments. A migration creates reviewed replacement proposals and a visible
impact report.

## Assessment and promotion

AI may propose assessments of relevance, source quality, novelty, importance,
and urgency. Each dimension carries a value, confidence or uncertainty,
human-readable rationale, evidence links, process identity, and the exact source
version assessed. A single opaque score is not the canonical result.

Promotion is a human-accepted disposition over an assessment:

- **promoted** advances the source toward topic assignment;
- **deferred** keeps it available with a reason or revisit condition;
- **rejected** removes it from the active queue while retaining the record; and
- **needs-review** leaves conflicting or insufficient evidence visible.

An imported Bookmark Sorter or newsletter verdict is retained as an external
judgement. It does not become a Knowledge Pipeline promotion automatically.
An adapter or person may propose a mapping, and the accepted mapping is an
auditable activity. This prevents keeper, archive, kept, or emphasized from
quietly acquiring a meaning those source systems did not assign.

Novelty and corroboration operate over source-dependence clusters, not raw URL
counts. Duplicate and syndicated relationships therefore directly affect the
volume shown to reviewers without deleting any source.

## Topics, assignments, and mini narratives

A source may be assigned to any number of topics. Each assigned-to-topic
assertion can carry a topic-specific angle, relevance, position, and state while
the source entity remains shared. Correcting source metadata therefore does not
create divergent source copies.

A mini narrative is a separate entity with:

- one primary topic and optional related topics;
- title and concise narrative text;
- an ordered position within its primary topic;
- evidence-for or derived-from relationships to every source version used;
- support, contradiction, update, and dependency relationships relevant to the
  narrative;
- authoring actor and activity;
- state: proposed, accepted, disputed, deferred, or archived; and
- explicit uncertainty, open questions, and temporal scope.

AI may propose several narratives in one package and may propose grouping
related or redundant sources. The import preview shows new entities,
relationships, unmatched references, and affected topic sequences separately.
A person can accept a narrative without accepting every proposed relationship,
or accept a relationship while rewriting the narrative.

Ordering is topic-specific metadata on the part-of or assigned-to-topic
assertion, not part of the narrative identity. Reordering a topic does not
create a false new version of the narrative text.

## Standing documents, comparisons, and archival

A topic has zero or more standing-document entities. Zero is valid. A standing
document has immutable revisions, each containing the curated text, status,
author, approval record, citations to narrative and source versions, and a
relationship to the revision it updates or supersedes.

An integration activity compares a bounded set of accepted narrative versions
with selected standing-document versions and creates a comparison entity. The
comparison presents:

- new, supporting, contradictory, redundant, and updating narratives;
- raw source count and dependence-adjusted source-cluster count;
- affected document sections or propositions when identifiable;
- volume since the last comparison;
- urgency dimensions and rationale;
- unresolved disputes and missing evidence; and
- a complete list of inputs and process versions.

Urgency is not one unexplained model score. The first contract keeps at least
time sensitivity, likely consequence of delay, strength and independence of
evidence, degree of contradiction with the standing document, and age of the
current document visible. The plan may set the first scales and display, but
the underlying dimensions remain inspectable.

AI may propose a patch or candidate new standing-document version. Only a human
can create an accepted current revision, either by authoring it or explicitly
approving a reviewed candidate. Approval records the accepted text hash, actor,
time, cited evidence, rejected proposal parts, and unresolved disputes.
Application code refuses to mark an AI-only proposal current.

A narrative may leave the active integration queue only when an accepted
archive-disposition entity records one of:

- incorporated, with an incorporated-into link to a standing-document version;
- rejected, with a human-readable reason;
- deferred, with a revisit condition or date when known; or
- superseded, with a link to the replacing narrative.

Archival changes queue state, not accessibility. Archived narratives remain
searchable, exportable, linked from documents, and recoverable. Reopening
creates a stage event and retains the earlier disposition.

## Stage workflow and built-in interchange

Every stage view includes visible **Import** and **Export** controls from its
first usable version. A persistent administration surface also provides a full
backup export, package validation, import history, receipts, and restoration.

| Stage | AI-first proposal | Human action | Stage export and import |
|---|---|---|---|
| **Harvest** | Candidate source records, metadata, summaries, and possible duplicate or syndication links | Confirm identity, retention status, source text versus summary, and lawful capture | Export a source inventory or intake subset; import native packages, Bookmark Sorter selections, newsletter stores, and direct-contribution packages |
| **Tagging** | Tags across several dimensions plus vocabulary additions or migrations | Accept, correct, reject, or add tags and terms | Export a tagged or untagged selection as an LLM work packet; import tag proposals without granting source-content edits |
| **Selection and promotion** | Multi-dimensional assessments, dependence clusters, and dispositions | Review reasoning and accept a promoted, deferred, rejected, or needs-review state | Export an assessment batch; import proposed assessments and dispositions, with external verdicts kept distinct |
| **Topic assignment** | Topic links, typed source relationships, mini narratives, and sequence suggestions | Review topic-specific interpretation, evidence links, conflict, and ordering | Export a topic work packet; import many assignments, relationships, and narratives in one reviewable proposal |
| **Topic integration** | Comparison entities, urgency dimensions, archive candidates, and proposed document changes | Author or approve document revisions and accept archive dispositions | Export comparison and document packets; import narrative, relationship, comparison, and patch proposals, but never AI-only approval |

Export is selection-based. The current queue, a topic, a tag expression, an
activity, an import batch, an archive slice, or the complete knowledge space are
different scopes of the same function, and the scope is recorded in the file.

## Canonical portable package

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **One versioned logical envelope plus built-in source-system adapters** *(chosen)* | Backup, subset sharing, LLM proposals, upgrades, and future app actions share validation and receipts; richer records can coexist with direct Bookmark Sorter and newsletter interchange | Requires explicit adapters and loss reports for narrower target formats |
| **Database-native dump** | Complete and usually fast | Tied to one engine and schema; contains operational ids; unsuitable for LLM work packets or selective cross-user sharing |
| **A different CSV or JSON shape for each stage** | Each file is superficially simple | Identity, relationships, provenance, and merge behavior drift across five importers; a complete backup must invent a sixth format |
| **RDF or JSON-LD as the only interchange** | Rich typed relationships and standards alignment | Adds vocabulary and tooling burden to every ordinary backup and proposal; direct compatibility with the existing initiatives still needs adapters |

The canonical interchange is versioned JSON:

    {
      "format": "knowledge-pipeline/v1",
      "package_id": "018f...",
      "exported_at": "2026-08-28T19:00:00Z",
      "knowledge_space": {
        "id": "personal",
        "schema_version": 1
      },
      "actors": [],
      "scope": {
        "kind": "topic",
        "expression": "topic:energy and stage:assignment"
      },
      "entities": [],
      "tag_assignments": [],
      "relationships": [],
      "activities": [],
      "stage_events": [],
      "assets": [],
      "receipts": [],
      "warnings": []
    }

The package contains logical ids and versions, not database row numbers. A
subset includes the actors, endpoint versions, vocabulary terms, tag
assignments, activities, stage events, receipts, and asset manifests needed to
understand its included state and relationships. If permissions or scope omit a
dependency, the package carries a typed external reference and a warning rather
than a dangling id or invented substitute.

Assets are listed by checksum, media type, size, rights status, and location.
Small permitted text may be embedded. Larger permitted bodies may travel in a
ZIP bundle beside the JSON manifest. Remote, restricted, or expired bodies
remain references. Import and export never treat possession as permission to
redistribute.

Four package uses share this envelope:

1. **Backup or transfer** contains accepted current state plus all retained
   versions, relationships, activities, archive dispositions, and receipts in
   scope.
2. **Selection or work packet** contains a bounded accepted view for review or
   LLM work.
3. **Proposal** adds a proposal block with proposing actor, process and model,
   time, base package id and hash, target knowledge-space id, and idempotent
   operations such as create entity, create version, assert relationship, or
   propose disposition.
4. **Receipt** records validation results, accepted and rejected operation ids,
   conflicts, created versions, reviewer, and committed time.

The canonical package never expresses an unreviewed proposal by changing an
accepted entity in place. Proposed operations are separate from the accepted
snapshot they were based on.

## Import, merge, copy, and recovery rules

Every import follows validate, preview, commit, and receipt:

1. Parse untrusted input with size, depth, URL, text, and asset limits.
2. Validate the schema, ids, endpoint closure, hashes, actor and process
   declarations, relationship constraints, and target knowledge space.
3. Show counts and representative details for adds, exact matches, proposed
   versions, relationships, conflicts, ignored fields, and unavailable assets.
4. Let the administrator accept the permitted whole package or selected
   proposal operations.
5. Commit transactionally and emit an exportable receipt. A failed commit
   changes nothing.

Merge rules:

- Reimporting the same package or operation is a no-op, detected by package id,
  operation id, and content hash.
- Import never deletes because an absent entity may merely be outside a subset.
- Tags union only through recorded tag-assignment operations; a null or absent
  field never clears an accepted value.
- A changed entity creates a version. It does not overwrite the current version.
- If the proposed base version is no longer current, the operation is stale and
  requires review or regeneration.
- Conflicting accepted versions, external aliases, relationship constraints,
  or asset hashes are reported and skipped rather than resolved by arrival
  order.
- Unsupported newer package versions are refused with the declared version
  shown. Supported older versions migrate through tested adapters and retain
  the source package and migration receipt.

A package addressed to the same knowledge-space id is a restore or merge and
preserves local ids. A package intentionally copied into another knowledge
space remaps internal ids, records origin aliases, rewrites relationships
consistently, and emits an id map. A proposal package cannot be copied this way;
it is refused if its target or base hash differs. This distinction supports
backup and multi-person file sharing without confusing a copy with
synchronization.

## Compatibility with Bookmark Sorter and Newsletter Story Harvester

The shared contract is deliberate:

- JSON files are self-describing and versioned;
- exports name when and what they exported;
- sources retain stable ids or URLs, title, note or text, dates, flat string
  tags, and a single-valued external verdict when present;
- import is idempotent, additive, and never deletes because an item is absent;
- tags are unique free strings with prefixes by convention;
- conflicts are reported instead of silently overwritten; and
- files are usable for backup, subset transfer, and LLM-assisted proposals.

Knowledge Pipeline has a broader canonical package because Bookmark Sorter
items and newsletter stories cannot represent entity versions, pair
relationships, standing documents, or archive history. Compatibility is
therefore supplied by built-in adapters, not by pretending those fields fit
inside the narrower formats.

### Bookmark Sorter

The importer accepts **bookmark-sorter/v1** directly. Each item becomes or
matches a source entity using URL identity; title, note, added_at, tags,
verdict, verdict_at, collection, selection, exported_at, and the original item
payload are preserved. Existing accepted source content is not overwritten.

A source-only selection can export bookmark-sorter/v1 with the same field names
and tag semantics. Only Bookmark Sorter-supported verdict values are emitted as
verdicts; other judgements remain tagged or are listed in a loss report rather
than being relabeled. Relationships and knowledge-specific history are not
silently dropped: the export preview names what the target format cannot carry.

Bookmark Sorter proposal files remain proposals. A file containing its proposal
block or proposed_tags is imported into the tagging review path, not treated as
an accepted ordinary export.

### Newsletter Story Harvester

The importer accepts the Newsletter Story Harvester version 1 store shape:
version, store_id, stories, sources, harvesters, and runs. Story ids become
external aliases; URL, url_key, title, text, text_is_summary, source,
harvester, issue and story dates, shape, source document and anchor, tags,
verdict, verdict_at, harvested_at, and merged_from are preserved. Store runs
become import or harvest activities, and merged_from identities become aliases
or proposed dependency relationships as appropriate.

Records that originated in a newsletter store can export a compatible version
1 store or subset while retaining their original fields. A compatible verdict
file can be produced for one known store_id, containing only ids, verdicts,
verdict times, and tag additions or removals. Importing such a verdict file into
Knowledge Pipeline requires matching source aliases and keeps the result as an
external newsletter judgement unless a person separately accepts a pipeline
promotion.

Unknown origin fields are preserved under a namespaced origin payload so an
import-export round trip does not throw away data that the source initiative
understands. The compatibility test fixtures come from the real Bookmark Sorter
and Newsletter Story Harvester implementations, not hand-written
approximations.

## Manual LLM contribution now; skill plus ChatGPT app later

The first workflow is intentionally simple:

1. The administrator chooses a stage selection and exports an LLM work packet.
2. The LLM returns a knowledge-pipeline/v1 proposal file whose base id and hash
   identify that packet.
3. The administrator uploads it through the website, inspects proposed changes
   and warnings, and accepts all or selected operations.
4. The application writes accepted versions, assertions, activities, and a
   receipt. The original proposal remains available for audit.

An administrator may load the file through a privileged web action, but the
file still passes the same validator and receipt path. Raw database writes are
not a second import mechanism.

The later skill plus ChatGPT app combination preserves that boundary:

- the skill owns repeatable reasoning instructions and creates bounded
  proposals;
- the ChatGPT app owns authenticated read, validate, preview, and commit
  actions against one knowledge space;
- actions return structured receipts rather than conversational assurances;
- commit requires explicit administrator confirmation or a later, separately
  specified narrow delegation;
- model, skill, app, schema, input, and output versions remain in the activity
  record; and
- the website remains a complete administration and recovery path if the skill,
  app, model, or ChatGPT service is unavailable.

No app-only field or operation enters the canonical model. This is what makes
the app an easier interface rather than a new source of truth.

## Storage and application boundaries

### Storage alternatives

| Option | Strengths | Weaknesses |
|---|---|---|
| **Relational database with a portable repository contract** *(chosen)* | Transactions, indexes, constraints, migrations, and efficient pair relationships; SQLite-compatible implementations can run locally or on several hosts | Requires schema and migration discipline; recursive graph queries need explicit indexes and query code |
| **One JSON file** | Human-readable and trivially portable | Whole-file writes, weak concurrent safety, and expensive relationship and history queries; the application would have to reimplement database integrity in every writer |
| **JSONL event log** | Append-only audit is natural and crash-safe | Every surface must fold the log identically; current queues and relationship traversals need snapshots and compaction |
| **Graph database** | Pair relationships and traversals are native | Adds a specialized operational dependency before traversal scale demands it; backup and per-user kits become harder |

The first store uses portable SQL concepts and a repository interface. Its
conceptual tables are knowledge spaces, actors, entities, entity versions,
external aliases, relationships, activities, stage events, tag assignments,
assets, imports, exports, operations, and receipts. Source bodies and large
assets use a replaceable asset store addressed by checksum.

Core services receive storage, asset, clock, identity, and authorization
adapters. They do not import a hosting vendor binding. The first deployment may
use a SQLite-compatible hosted database and blob storage, but acceptance tests
also exercise the core repository against local SQLite. Schema migrations run
through the application and are preceded by a canonical backup export.

### Application surfaces

The web application provides:

- stage queues with proposal and accepted-state distinctions;
- entity history and backward provenance navigation;
- a relationship table and graph neighborhood for one entity;
- topic narrative sequences and comparison views;
- a standing-document editor or upload path with explicit approval;
- archive and reopening controls;
- import and export in every stage;
- administration for backups, migration status, imports, receipts, actor
  identities, and failed operations; and
- an internal service boundary that later authenticated app actions can call.

The relationship graph is an inspection aid, not the only navigation model.
Tables, queues, documents, and source detail pages remain primary for work that
is clearer linearly.

## Security, privacy, and rights

- The first site is private and requires administrator authentication. It is
  never made public as a deployment shortcut.
- Authorization checks the knowledge-space scope on every read and write, even
  with one administrator.
- Proposal files and source documents are untrusted input. HTML is sanitized,
  executable content is never run, archive paths cannot escape their package,
  and imports enforce declared limits before allocation or extraction.
- Secrets, cookies, access tokens, identity headers, and raw host bindings are
  never entities and never enter exports.
- Source bodies inherit recorded retention and redistribution conditions.
  Full backup may reference a locally retained restricted asset without placing
  it into a shareable package.
- Export previews distinguish complete backup, metadata-only transfer, and
  incomplete package. A green download button cannot imply that every linked
  source body traveled.
- Audit data that contains private prompt inputs follows the same knowledge
  space and export scope. A receipt may record hashes and bounded rationale
  without copying an entire private conversation.

## Failure and refusal behavior

The system distinguishes and reports at least:

- malformed or unsupported package version;
- package addressed to another knowledge space;
- stale proposal based on an older entity version or work-packet hash;
- duplicate package or operation, treated as a no-op;
- conflicting external identity or content hash;
- unknown or invalid relationship type or endpoint pair;
- dangling entity, version, activity, or asset reference;
- source body unavailable, expired, restricted, or checksum-mismatched;
- proposed standing-document approval without a human actor;
- archive request without an accepted disposition;
- partial subset whose omitted dependencies make an operation unsafe;
- import or migration that exceeds configured size or time limits; and
- transaction failure, leaving accepted state unchanged.

Warnings remain attached to the activity and receipt after the immediate
message disappears. A retry uses the same idempotency identity.

## Acceptance criteria for the first version

The first version is acceptable when:

1. A representative browser-save or direct source, a bookmark-sorter/v1 file,
   and a Newsletter Story Harvester version 1 store import into one source
   inventory with their origin fields, tags, verdicts, and provenance intact.
2. Reimporting each input changes nothing, and exporting then restoring the
   complete knowledge space reproduces every entity version, relationship,
   activity, archive disposition, and permitted asset hash.
3. Every stage can export its current selection and import a reviewed proposal
   through the visible interface; no stage depends on a hidden database script
   for its normal round trip.
4. One source is assigned to multiple topics without duplication, contributes
   to different topic-specific narratives, and remains one traceable source
   identity.
5. Sources and narratives exercise accepted supports, contradicts,
   evidence-for, syndicated-from, updates, and supersedes assertions. A derived
   latest-update pointer rebuilds correctly and refuses to choose across a
   disputed fork.
6. A manually obtained LLM file proposes many tags and narratives. The
   administrator accepts some operations, rejects others, and can later show
   the input hash, model or process identity, proposal, accepted versions, and
   receipt.
7. A mixed source set demonstrates controlled, open, unknown, renamed, and
   deprecated tag values without losing an imported tag or breaking compatible
   selection.
8. Promotion distinguishes raw URL count from independent source clusters and
   retains promoted, deferred, rejected, and needs-review records.
9. A topic with no standing document produces an honest comparison. Another
   topic with a standing document shows new, supporting, contradictory,
   redundant, and updating narratives with inspectable volume and urgency
   dimensions.
10. AI prepares a standing-document change, a person rewrites or rejects part
    of it and approves the final revision, and only that human-approved version
    becomes current.
11. Narratives archive only with incorporated, rejected, deferred, or
    superseded dispositions and can later be found and reopened.
12. A subset copied into a second knowledge space remaps ids, preserves origin
    aliases and pair relationships, and emits an understandable receipt without
    granting access back to the source space.
13. A source-only compatibility export can be read by Bookmark Sorter, and
    newsletter-origin records and a verdict sitting can round-trip through the
    Newsletter Story Harvester fixtures with any unrepresentable
    knowledge-specific material listed before export.
14. The same core repository tests pass against the first hosted store adapter
    and local SQLite, and a backup taken before a schema migration restores
    successfully after the migration.
15. The complete site remains operable without an LLM, skill, ChatGPT app, or
    live source body: those improve contribution but are not custody of the
    knowledge.

## Open for the plan

The plan must choose:

- the first private host, authentication adapter, SQLite-compatible store, and
  asset store;
- a representative data size and performance budget for source lists,
  relationship neighborhoods, full backup, restore, and large proposal review;
- the first controlled actor-category and social-value terms;
- the initial relationship registry's exact domain, range, inverse, and
  cardinality rules;
- concrete scoring scales and reviewer presentation for quality, importance,
  novelty, and the urgency dimensions;
- the first topic, standing document, source mix, and legally retainable fixture
  set that exercise the full loop;
- package validation, JSON schema, ZIP safety, signature or checksum, and
  migration tooling;
- the stage order that delivers import, export, receipts, and restore before
  substantial AI automation; and
- the evidence log for revisiting the deferred distribution decision after
  representative use.

The plan may sequence these choices. It may not postpone the canonical backup,
stage work-packet round trip, or import receipts until after the data model is
populated; portability is part of the first durable write.
