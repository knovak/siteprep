# Knowledge Pipeline Phase 6 Site

This is the login-gated collection, Harvest workspace, and portable review core
through `plan.md` Phase 6. It is a
Vinext/Cloudflare Workers application intended for a public-access ChatGPT Site:
the sign-in surface is public, while collection, administration, backup, API,
and blob access require both ChatGPT authentication and a server-side
application allowlist.

## Run and verify

```bash
npm ci
npm test
npm run db:generate
npm run build
```

Local development uses `npm run dev`. The public route remains useful without a
database because anonymous entry returns the sign-in surface before reading D1
or R2. For an authorized local session, copy `.env.example` to an ignored local
environment file and set the administrator email supplied by the local Sites
sign-in fixture.

## Trust boundaries

- `app/chatgpt-auth.ts` is the generated dispatch-owned Sign in with ChatGPT
  adapter. Browser pages use top-level navigation to the dispatcher-owned
  sign-in route. API routes return 401 without complete platform identity.
- `lib/site-repository.ts` performs the second boundary. A normalized deployment
  seed creates exactly one administrator allowlist row. The first matching
  request links one Site-stable user id; another id cannot claim it. A linked id
  remains authoritative if the contact email later changes.
- Every user query includes the internal actor and owned collection. Admin-only
  cross-collection previews name every collection they would affect. Client
  collection ids, hidden controls, raw object keys, and lookalike test headers
  provide no authority.
- `.openai/hosting.json` declares logical `DB` and private `FILES` bindings only.
  Runtime administrator email and trusted Site origin live in Sites environment
  variables, not source or hosting metadata.

## Storage and operations

`db/schema.ts` defines the D1 tables and indexes for allowlisted identities,
actors, private collections, selected-collection revisions, activities,
receipts, backups, asset references, import previews, immutable source versions,
external aliases, source tags, and dependency proposals. Generated Drizzle SQL
lives under `drizzle/` and is packaged with the Site; query-driven indexes cover
collection source lists, aliases, tag inventory, and proposed dependencies.

Collection create and selection use D1 batches. Switching increments a
selection revision and invalidates pending import previews. Names are trimmed
NFC strings, 1–80 characters, and unique per owner after case folding; names
are never ids.

`lib/domain.mjs` supplies portable rules shared by the Worker and Node tests.
Current-collection backup creates a deterministic `knowledge-pipeline/v1`
manifest containing source versions, aliases, tags, dependency proposals,
accepted review records, activities, and receipts. Pending work packets and
proposal files remain disposable review state rather than accepted knowledge.
The service stores the bounded ZIP under a private R2 key,
then writes the D1 backup/activity/receipt batch. A failed D1 commit removes the
staged object. Download and restore first prove collection ownership, package
scope, object checksum, and every source-version checksum; restore is
collection-scoped and idempotent by operation id.

Erase is a named two-phase request. Its preview pins actor, collection,
selection revision, collection revision, counts, schedules, backups, and asset
references. Confirmation can create a final private backup, tombstones the
collection, invalidates pending work, removes collection references, and then
finishes bounded request-driven deletion. Shared blobs remain until their final
authorized reference disappears.

## Recovery, scheduling, and scale

`lib/recovery.mjs` is the portable recovery service shared by the web,
administrator, and deterministic schedule callers. It provides stable due-run
operation ids, derives scheduled scope from stored schedule state, applies the
ordinary administrator boundary, and refuses authentication material in
schedule inputs, URLs, packages, and receipts. Accepted operations are
idempotent. Failed destinations retry after 1, 5, and 20 minutes, notify only
after the final failure, and preserve the preceding successful recovery point.

Collection packages compose into a deterministic knowledge-space package.
Restore verifies the canonical package, source-version hashes, and embedded
asset hashes before staging any writes, then exposes the result in one commit.
The same module adapts the checked pre-v1 shape, copies a bounded collection
subset while remapping internal ids and endpoints, records origin aliases,
omits unauthorized dependencies with warnings, and replaces source ownership
with the destination actor.

Scheduled packages follow the 14-daily/6-monthly successful-retention policy;
failed and partial objects never qualify. Large erasure tombstones first,
disables schedules, resumes bounded batches, applies the requested backup
choice, retains only the minimal deletion receipt, and removes a blob only when
its final reference is gone. Cursor paging and the checked Phase 6 fixture cover
10,000 current entities, 50,000 versions, and 100,000 relationships within the
documented local hosted-equivalent budgets.

`fixtures/phase-6-recovery.json` is also the operational status record. The
external due-schedule adapter is tested and ready, but the hosted Codex
heartbeat is inactive because explicit permission to create it has not been
given. This local evidence does not claim a live hosted schedule, physical R2
restore, or witnessed representative use; those remain separate deployment and
Phase 7 gates.

## Harvest boundary

`lib/harvest.mjs` is the common validate-and-preview boundary for direct and
browser-saved sources, `bookmark-sorter/v1`, and Newsletter Story Harvester
store v1. Native payload fields remain in attributed origin records; external
verdicts remain external judgements; and missing, restricted, summary,
metadata-only, and retained bodies stay explicit. A selected-collection commit
creates or reuses a conservative source identity, appends an immutable version,
records aliases, tags, dependency proposals and native runs, then writes one
activity and idempotent receipt. Switching collections invalidates the preview.

The Harvest page exposes accepted sources and a tag inventory separated by
accepted/proposed status, vocabulary status, active/archive state, type, and
stage, with a collection-scoped tag filter. Harvest receipts remain visible in
the stage and administrator summary. Harvest backup and restore invoke the same
canonical collection package service used by administration.

## Adapter evidence

`lib/local-adapters.mjs` is the local SQLite/filesystem recovery adapter.
`test/adapter-contract.test.mjs` runs identity linking, collection isolation,
case-folded uniqueness, injected transaction rollback, private blob reads, and
reference-aware erasure against it. The same domain rules drive D1/R2 routes;
deployment smoke tests prove anonymous 401, signed-in allowlist behavior, and
the hosted migration/binding boundary before Phase 1 is recorded complete.

Phase 2 stops at intake and inventory. Promotion, assessment, LLM proposal
files, and vocabulary decisions belong to Phase 3.

## Review and LLM file-loop boundary

`lib/review.mjs` implements the offline, credential-free bridge between accepted
sources and a human review. A bounded work packet names its original collection,
selection and collection revisions, accepted source-version hashes, explicit
omissions, target ids, and zero credentials. A manually obtained LLM response
may propose tags, five separate assessment dimensions, vocabulary changes, and
promotion dispositions, but it cannot accept or commit any of them.

Proposal preview refuses a changed destination, stale source hash, hidden
canonical score, malformed assessment, or authority-bearing proposal. The
commit boundary accepts an explicit subset only from a human actor, retains
every rejected operation in the receipt, records human rationale rewrites, and
keeps the proposer and process version. Duplicate and syndicated relationships
are reported as both raw source count and independent clusters. Vocabulary
impact reports preserve historical assignments across unknown, rename, alias,
deprecate, split, and replacement decisions.

`test/review.test.mjs` is the recorded deterministic model fixture for the
ordinary gate. It also exercises a 2,000-operation proposal within the
five-second preview budget. A live model run and a person's corrections remain
a separately named human review gate; passing the recorded suite never stands
in for that evidence.

## Topics, relationships, and mini narratives

`lib/topics.mjs` makes the first relationship registry executable. Its thirteen
accepted types enforce endpoint domains and ranges, collection boundaries,
exact-version requirements, direction, scope, cardinality, symmetric-pair
identity, and cycle prevention. Unknown imported types remain proposed
extensions. `latest-update` is derived from accepted update facts and disappears
when a disputed fork makes the answer ambiguous.

The same portable core assigns one retained source to several topics without
copying it, accepts a human-edited mini narrative while retaining rejected
relationship proposals in the review receipt, and exposes exact source-version
evidence closure. Topic ordering changes assignment metadata and activity only;
it never creates a narrative-text version. The relationship table and bounded
neighborhood attach inverse display labels without manufacturing inverse
assertions or requiring graph rendering.

`test/topics.test.mjs` exercises every Phase 4 acceptance condition, including
the thirteen registry types, cycles and symmetric duplicates, a disputed update
fork, selective human review, topic ordering, evidence closure, and a 1,000-edge
neighborhood under the two-second query budget.

## Standing documents, comparison, and archive closure

`lib/documents.mjs` implements the Phase 5 integration boundary without
weakening the human-authority rule established in earlier phases. A comparison
names exact accepted narrative and standing-document versions, classifies every
input as new, supporting, contradictory, redundant, or updating, and preserves
both raw-source and dependence-adjusted cluster counts. A topic with no standing
document records an absent baseline and does not fabricate a patch.

Urgency remains five separate 0–4-or-unknown dimensions: time sensitivity,
consequence of delay, evidence strength and independence, contradiction with
the current document, and document age. Each dimension retains rationale and
evidence, while the vector retains its process version; no canonical total is
created.

AI and other automated actors may create a candidate patch. Only a named human
actor can make an immutable standing-document revision current. The approval
receipt includes the accepted text hash, exact evidence versions, rejected
proposal parts, unresolved disputes, actor, and time, while the predecessor
version remains unchanged.

Archive closure accepts only four dispositions. Incorporated narratives must
link to an exact standing-document version; rejected narratives require a
reason; deferred narratives require a revisit condition; and superseded
narratives require an exact replacement version. Archival changes queue state,
not custody: archived narratives remain searchable and exportable, and reopening
adds a stage activity while preserving the earlier disposition.

`fixtures/phase-5-loop.json` is the project-authored two-topic acceptance
fixture: Community heat resilience has a standing document and all five
comparison classes, while Cooling access has no baseline. The backward-audit
test follows a sampled accepted document claim through its exact narrative,
source versions, topic assignment, assessment, tag, actors, and activities.
`test/documents.test.mjs` exercises all Phase 5 exits and the complete fixture
loop. No live model, public deployment, or unrecorded source body is used.
