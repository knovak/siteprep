# Flings implementation plan

September 10, 2026. Implements the reviewed [specification](spec.html) and
[objectives](objectives.html). The plan has been critiqued; no application or
live sending integration exists yet. Acceptance is defined in the
[test plan](test-plan.html).

## Implementation baseline

Build in `initiatives/flings/work/app/`, with fixtures and test evidence inside
this initiative. Use TypeScript, React and Vinext with a server-side API, a
Sites Worker and D1 relational storage. The repository already uses this
combination in Knowledge Pipeline's `work/phase-1-site/`; it is a reference for
the build shape, not a runtime dependency or a source of credentials. Pin the
scaffold's dependencies and migrations when implementation starts. Keep domain
rules separate from request handlers and use the same rules in local and
hosted tests. No private database is serialized into client assets.

Use native ChatGPT Sites sign-in for organizers, as selected in the
[September 15 decisions](decisions.html). The initial organizers are Ken Novak
and Lucas Novak, with their account addresses recorded there. Implement and
verify independent platform identity and organizer assignments on the Worker;
the user does not need to register a separate OpenID Connect issuer/client or
configure an application-owned callback.
Development identity works only in explicit local/test mode with fictional
records; missing hosted identity configuration denies organizer access. Member
capabilities remain an independent authentication path.

The planned host is Sites. Start with local work, then a separate private test
Site when the first usable slice is ready. A platform-private Site may require
platform sign-in before the application, so it cannot establish login-free
access for outside members. The external pilot requires an explicitly approved
host access setting that exposes member entry routes while application checks
protect every record. Do not make a Site public or reuse another initiative's
Site, database or secrets. Register the test deployment only when created.
Production remains a separate release request.

Select no email, SMS or in-app drafting API for the first version. The organizer
supplies core text, reviews exact messages and copies a sending prompt into
their own authorized computer-control LLM. The same manifest supports manual
sending. Flings never starts that tool or claims to observe delivery directly.

## Sequencing and completion evidence

Each phase produces one usable increment and its evidence. Commit code and
evidence together; update the initiative log and complete a todo only when its
exit conditions pass. Large phases may use several PRs without marking the
phase complete early. Nothing below authorizes a real recipient message.

| Phase / todo ID | Deliverable and exit condition | Depends on |
|---|---|---|
| 0 / `critique-plan` | Critique permissions, code/session timing, concurrent approval, editable restore and activation boundaries. Record defects and revise the plan before implementation. | This plan merges |
| 1 / `build-access-foundations` | Local server, relational migrations, organizer assignments, membership profiles, capability/session lifecycle and authorization projections; T1-T3 domain/HTTP checks and the T2 browser exchange harness pass. | Phase 0 |
| 2 / `build-member-journeys` | Organizer and member views, events, invitations, read-only preview, closure/reopening and timezone handling; T1/T3 interface journeys and T4-T5 pass on all three gathering fixtures. | Phase 1 |
| 3 / `build-coordination` | Discussions, polls and attributed payment ledger; T6-T7 pass, including concurrency and stale tabs. | Phase 2 |
| 4 / `build-message-handoff` | Reviewed audience resolution, exact prompt export, one optional discussion post and reported outcomes; simulated T8-T10 pass. | Phase 3 |
| 5 / `build-recovery` | Documented versioned JSON export, edited-file validation and isolated restore to a new fling; T11 passes without sends or old credentials. | Phase 4 |
| 6 / `verify-hosted-test` | Private fictional-data test deployment, real managed organizer identity, hosted authorization and recovery checks, responsive/keyboard evidence; T1-T12 pass where automatable. | Phase 5 and test-host prerequisites |
| 7 / `run-authorized-pilot` | Authorized organizers and test recipients complete email/text receipt and representative use; T13 evidence records actual setup, failures and limits. | Phase 6 and live-pilot prerequisites |

The [September 10 critique](notes/plan-critique-20260910.html) completes Phase 0.
The next item is `build-access-foundations`, taken from the table. Subsequent phases retain the
listed order. Missing activation inputs become separately named blocked items
when reached; they do not prevent earlier fictional-data implementation.
After the pilot, record outstanding defects or a request for the user's release
decision. Do not infer production approval or dormancy from passing tests.

## Phase 1: permissions and durable state

Create the specification's records with explicit fling relationships, unique
activity/membership invitations, current poll responses and revision checks.
Use database constraints plus server authorization on every read/write.
Exercise transactions against the actual local D1-compatible runtime, including
competing organizers, failure midway through an operation and retries. Do not
assume an in-memory mock demonstrates database atomicity.

Implement organizer assignments separately from ordinary memberships. Contact
matching never joins profiles or grants authority. Removing an organizer affects
that fling immediately; the last organizer requires a replacement. Profiles
validate email/text/both, preserve incomplete profiles with visible omissions,
and record revisions. Closed flings still permit member profile corrections.

Use an injectable UTC clock and cryptographic randomness for member codes.
Persist token digests, first issue/use, 14-day sending eligibility, 35-day code
expiry and revocation. Encrypt recoverable codes with a runtime secret outside
the database; purge ciphertext and stored prompt links at the sending boundary
or revocation, including on read, so a delayed maintenance job cannot expose
them. Keep revocation metadata while originating sessions can remain valid.
Routine rotation is atomic and preserves old unexpired codes; emergency
replacement revokes all codes/sessions and advances the membership generation.

Exchange URL fragments over HTTPS and immediately remove them from the address
bar. Sessions have independent fixed 35-day expiry and remain scoped to their
fling even with two member pages open. Test secure cookies, request-forgery
defenses, generic invalid-link responses, rate limiting, safe link handling and
redacted request/application logs. Preview uses a separate read-only server
context and never acquires a member code.

### Phase 1 checkpoints

Complete these in order within `build-access-foundations`; keep the item open
until all four checkpoints pass. Each may produce a separate PR.

1. **Database and permission proof.** Pin the local runtime and schema. Enforce
   parent/fling relationships and unique assignments in the database. Demonstrate
   all-or-none mutation with an actual failed constraint and with an ordinary
   rejected precondition; a conditional write affecting zero rows must not leave
   earlier writes committed. Race final-organizer removals and member generation
   changes against protected writes. Document the mechanism the chosen runtime
   actually supports before relying on it in later phases.
2. **Codes and revocation.** Implement issuance, reuse, first exchange, expiry
   and removal with the injectable clock. Read the current membership generation
   and originating code's revocation state in the same atomic operation that
   creates a session or performs a protected mutation. A stale authorization
   read must not permit a later write after revocation has committed. Test both
   operation orderings; never describe already completed work as recalled.
3. **Session transport.** Use a minimal browser harness for the fragment exchange,
   immediate address cleanup, cookies, request-forgery protection and two-fling
   sessions. Every page and mutation carries its expected fling and membership;
   the server verifies both against session authority. Opening another link
   cannot change a stale page's actor silently. Clear any per-member client cache
   on a context change; scope private responses against shared-cache reuse.
4. **Profiles and projections.** Exercise T1/T3 through domain and HTTP fixtures,
   including invitation-state read projections and read-only preview. Seed fixture
   invitations directly here; the organizer's full event/invitation screens and
   T1/T3 browser journeys belong to Phase 2. Carry those pending checks explicitly
   in the evidence record, so passing Phase 1 is not reported as all T1-T3 passing.

The browser harness uses fictional records and local identity only. Hosted
identity and outside-member access still require the existing Phase 6/7 inputs.

## Phases 2-3: gathering and coordination

The organizer starts on assigned flings; the member starts on their own fling's
invited and accepted activities. Keep invitation summaries distinct from
participant-only details in server responses as well as the display. The
movie/meal, wedding weekend and concert fixtures demonstrate grouping and order.
Resolve invalid/ambiguous local times before saving an event. Store its zone
and instant; changes appear on the member page without sending an update.

Discussions follow the exact fling/activity/event reader rules. Poll option
changes after voting create a replacement poll; decline/withdrawal excludes
old votes and reacceptance requires a new vote. Payment requests use integer
minor units and a single currency. Reported payments, confirmations, partial
payments, corrections, waivers and refunds remain distinct attributed entries.
Neither a payment link click nor cancellation establishes payment or a refund.

Closure rejects coordination and messaging writes from stale tabs, while
permitted history remains readable. Reopening preserves history and does not
reopen closed polls, resend notifications or reassign roles.

## Phase 4: reviewed messages and external sending

Build recipient resolution for all active members, current activity invitees
and accepted members, plus the specified individual, unanswered invitation,
unanswered poll and outstanding-payment refinements. Resolve one delivery per
membership/channel from the chosen preferences; show omissions and duplicate
contacts. Never substitute channels, merge memberships or expose group contacts.

Approval stores an immutable revision, the audience/profile/invitation revisions,
delivery IDs and optional discussion post atomically. Generate the prompt only
after renewed eligibility and sending-window checks. Both channels use the same
current membership code. A changed contact, response, role, closure or expired
sending window invalidates the handoff and requires renewed review. Use revision
checks and a single active handoff claim to reject competing organizer exports.

Separate the immutable approved revision from its expiring secret material.
Keep approved non-secret text, stable delivery IDs, link placeholders and a
fingerprint of the exact approved payload; keep recoverable codes and complete
handoff bodies only in encrypted, expiring storage. Render the exact approved
payload while eligible and verify its fingerprint. Purging secret material must
leave redacted approval/result history usable, without recreating an old raw link
from an audit field or immutable snapshot. After expiry, recopy requires renewed
review. This preserves the specification's purge requirement without rewriting
approved history or claiming the full secret payload is retained forever.

Export properly escaped JSON with exact subject, core text, individual suffix
and destination. Mark copying as exported for sending, never sent. Explain
clipboard/LLM exposure and the earliest sending boundary beside the action.
An exported prompt cannot be recalled or revalidated by Flings; instruct the
organizer to stop an external run after changes and check account history
before retrying an unknown outcome. Start pilot batches at no more than five
deliveries to make this inspection practical; this is a pilot limit.

Validate imported result IDs/revision, reject duplicates or unknown deliveries,
preview changes and preserve the reporting organizer, time and claimed evidence.
Keep unreported/ambiguous results unknown. A linked discussion post says
Notification prepared initially, then shows reported counts without disclosing
private suffixes. Recopying, reporting or retrying never duplicates the post.

## Phase 5: editable recovery and deletion

Publish the JSON schema and a fictional example with field descriptions. Export
a consistent per-fling snapshot with stable IDs and redacted history. Exclude
all code values/digests, sessions, server/provider secrets and raw handoff bodies;
scrub member links even when pasted into ordinary text. Explain that the file
is unencrypted personal data and let the organizer choose its destination.

Validate size, version, types, relationships, boundaries, timestamps, roles,
polls and currency arithmetic in isolated staging. Preview additions, omissions
and identity mapping. Explicit confirmation creates a new private fling with
fresh IDs; imported names grant no authentication authority, and the importer
must retain a working organizer. Commit all restored records or none. Do not
replace an existing fling, revive sessions/codes or resume a handoff. Link
issuance is a later explicit action and never sends by itself.

For local/private test work, use fictional data and clear temporary restore
staging after completion/failure, or within 24 hours if interrupted. Purge raw
code/handoff secrets at their defined eligibility boundary. Retain closed fling
records until an organizer explicitly deletes them, as the specification says.
Keep non-secret organizer action history until the gathering is explicitly
deleted, following the September 15 decision. Deletion removes contacts, posts, payment records and staged exports from active
application storage after a clear confirmation. Explain that downloaded exports,
external messages and provider backups have their own retention. Before real
data, record the host backup retention and recovery/deletion procedure and the
approved audit-history retention. The user selected no additional backup
requirements and asked to keep this simple; investigate the existing host's
behavior without adding a backup service or custom retention policy. Provider
facts remain real-data activation prerequisites, not a request for the user to
invent a retention period or a promise of immediate erasure from host backups.

## Phases 6-7: activation prerequisites

| Before | Required record | If unavailable |
|---|---|---|
| Hosted private test | Separate Sites test target, approved resource use and server secret provisioning; verified native ChatGPT sign-in and independent organizer access for the two accounts recorded on September 15 | Implement and verify the selected native identity path; `data:` only for a concrete missing account fact, and `cost:` for new spending approval |
| Real member access | Explicit host audience approval and proof that member entry works without platform login while organizer and data routes remain protected | `permission:` for audience change; do not make the Site public by default |
| Real personal data | Recorded provider terms, host backups, export/deletion practice, audit retention and permitted pilot data | `data:` for facts; `legal:` if a required terms/data decision needs authority |
| Live sending | Named organizer/computer/LLM, correct Gmail and Messages sender accounts, working text setup, named consenting test recipients and exact approved message batch | `data:` for setup/recipients and `permission:` for the actual sends |
| Chargeable activity | Approved LLM/message/host usage scope and cost limit | `cost:`; no paid activation by implication |
| Production | Pilot findings, current source/build evidence and an explicit user release request | `permission:`; test acceptance alone cannot release |

The pilot records actual email and text receipt, exact recipient/link matching,
time spent, interruptions and unknown outcomes on the named setup. It also
includes a manual manifest fallback and an independent organizer/member sitting.
If the computer-control route fails acceptance, retain the observations and
return a `human:` choice between improving it and planning an API adapter.
Do not silently implement the deferred API, an in-app model or encrypted exports.

## Phase 1 implementation record — September 10, 2026

The local access increment is implemented in `work/app/`. All four Phase 1
checkpoints have evidence in
[the Phase 1 receipt](work/app/test/evidence/phase-1.md): 16 real-D1 domain/HTTP
tests and six desktop/phone browser journeys. The next increment is Phase 2's
organizer/member journeys; seeded invitations here do not complete those
interface tests. The pinned scaffold's dependency audit remains recorded for
refresh and re-verification before Phase 6 hosting.

## Phase 2 first increment — September 11, 2026 (UTC)

Organizer assigned-fling lists, member creation, invitation/withdrawal,
read-only preview entry, member acceptance/decline/reacceptance, and confirmed
closure/reopening are implemented. Events display their existing instant and
IANA zone. The first interface receipt covers all three gathering fixtures,
with 18 new desktop/phone journeys across three engines and 21 domain/HTTP
checks. Invitation and closure writes share a transaction-checked fling revision;
stale writes fail without partial state or audit records.

`build-member-journeys` remains actionable. Next complete fling/activity/event
creation and editing, activity order, draft/cancellation interface actions,
organizer profile maintenance/assignment controls, and timezone gap/ambiguity
entry and round-trip evidence. Then build all three gatherings through the
interface for full T1/T3/T4 acceptance. T5's poll/payment/message checks remain
with the later capabilities they exercise. Do not mark Phase 2 complete based
only on the seeded gathering journeys in this receipt.


## Phase 2 authoring increment — September 11, 2026

Fling creation/renaming, activity creation/editing and ordering, draft/published/
cancelled states, and event creation/editing now exist. Event input round-trips
an instant and IANA zone, rejects daylight-saving gaps and requires an explicit
choice for repeated times. The authoring browser receipt builds the three
planned gathering shapes in fresh fictional flings; it does not complete the
full independent-gathering acceptance checklist.

`build-member-journeys` remains actionable for organizer profile maintenance,
assignment controls, the specified event end/location fields and fling
description/default zone, and the final T1/T3/T4 interface matrix. The remaining T5
poll/payment/message closure checks stay with their later capabilities. Phase 2
is not marked complete.

## Phase 2 event details increment — September 11, 2026

Fling description/default zone, event end times, separate invitation and
participant location fields, safe location links, and visible event update times
now exist. The default zone applies only when starting a new event. End times
resolve independently across daylight-saving transitions and must follow the
start instant. Existing records retain unknown ends/update times until edited.

The selected `build-member-journeys` item remains open for organizer profile
maintenance and assignment controls, followed by the final independent-gathering
T1/T3/T4 interface matrix. The later T5 poll/payment/message checks remain with
Phases 3-4. This increment does not activate hosting or complete Phase 2.

## Phase 2 organizer profile and assignment increment — September 11, 2026

Organizers can rename themselves from the workspace page, and a fling's
overview now lists its assigned organizers by name. Assignment controls let an
organizer add a co-organizer by existing ID or remove one, both behind
confirmation; adding validates the target ID exists and is not already
assigned, and removal keeps the existing last-organizer protection, enforced
server-side regardless of the interface.

This increment's browser evidence covers Chromium only - Firefox and WebKit
are not provisioned in the build environment that produced it, unlike every
earlier Phase 1/2 browser receipt. Re-run `test/assignments-browser.mjs` on
those two engines before treating this as complete evidence toward the final
T1/T3/T4 matrix.

`build-member-journeys` remains open for the final independent-gathering
T1/T3/T4 interface matrix across all three gathering fixtures. The later T5
poll/payment/message checks remain with Phases 3-4. This increment does not
activate hosting or complete Phase 2.

## Phase 2 independent-gathering acceptance — September 12, 2026 (UTC)

The final interface matrix now constructs three independent flings for each
browser/viewport pair, rather than three shapes inside one fling. Eighteen
gathering journeys pass across Chromium, Firefox and WebKit at desktop/phone
sizes; six assignment journeys close the previous two-engine evidence gap.
The matrix also exposed and fixed missing organizer member-profile correction
forms and the immediate grant from the add-organizer form. Corrections retain
the opening profile revision; organizer addition requires separate confirmation.

The receipt at `work/app/test/evidence/independent-gatherings-20260912.md` maps
the interface, HTTP and real-database evidence to T1/T3/T4 and the currently
implemented parts of T5. Later poll/payment/message closure checks remain with
Phases 3/4. The next planned item is `build-coordination`; hosting and human
acceptance retain the Phase 6/7 prerequisites above.

## Phase 3 coordination acceptance — September 12, 2026 (UTC)

The local app now provides scoped discussions with attributed edits and hiding,
event polls with reviewed member subsets and immutable replacement, and explicit
member payment allocations with append-only reports, confirmations, corrections,
waivers and refunds. All operations use current authority and fling revision
checks in the actual D1 transaction. Decline/withdrawal invalidates old votes;
closure rejects stale coordination writes and reopening preserves history.

The [coordination receipt](work/app/test/evidence/coordination-20260912.html)
maps 45 domain/HTTP/time checks and six new browser journeys to T6/T7 and the
coordination portion of T5. The next item is Phase 4's `build-message-handoff`.
The remaining message closure cases, editable recovery, hosting and independent
pilot evidence retain their later phases and activation prerequisites.

## Phase 4 audience-review increment — September 12, 2026 (UTC)

The organizer can review all three planned recipient groups and the individual,
unanswered-invitation, unanswered-poll and outstanding-payment refinements.
One database snapshot applies current assignment, open state, profiles,
invitation generations, poll subsets and attributed balances. Delivery
preferences produce separate membership/channel rows; incomplete profiles and
shared destinations remain visible for review. The preview returns no codes,
member links or approved delivery records.

`build-message-handoff` remains actionable. Next implement the immutable message
review/approval record and exact text, protected expiring link material and prompt
export, then the optional discussion post and reported-outcome reconciliation.
The current receipt covers only the audience portion of T8. The remaining T8
approval/expiry cases, T9/T10 and message-specific T5 checks stay open; no actual
sending, hosting or pilot acceptance is implied.

## Phase 4 exact-review/export increment — September 12, 2026 (UTC)

The organizer now writes the core text, email subject and optional per-member
notes, reviews exact destinations and personal links, explicitly acknowledges
shared destinations, approves the immutable revision and copies a sending
prompt. Each batch is limited to five individual deliveries. A fresh check of
current authority, gathering/profile/assignment revisions, audience and code
windows precedes approval/export; the final transaction repeats the relevant
checks. A batch belongs to its preparing organizer. Recopy uses the same IDs
and text, and remains exported with unknown outcomes.

Non-secret history uses link placeholders and an exact-payload fingerprint;
recoverable raw payloads are encrypted and purged on authorized access after
sending expiry, or in the same transaction as code revocation. Browser state is
transient. The [message receipt](work/app/test/evidence/messages-20260912.html)
records 70 domain/HTTP/time tests and 18 browser journeys across three engines
and two screen sizes, including audience/coordination regressions.

`build-message-handoff` remains actionable. Next implement the optional
same-fling discussion post as part of the atomic approval transaction, then
structured result preview/reporting and explicit selected retries after account
history inspection. Current approval has no discussion target, so it creates
no post. Imported results and discussion counts are not yet available. Phase 4
is not complete; recovery and hosted/pilot acceptance follow in their existing
order. No sending permission or real account setup is inferred from this work.


## Phase 4 result-reporting increment — September 13, 2026

Exported batches now accept strict result JSON through a signed preview and
explicit confirmation. Reports retain organizer/time/evidence provenance and
append corrections while omitted deliveries keep their previous outcome,
initially unknown. Expired/revoked personal links remain purged; reporting uses
only redacted history. Current authority, context and results-revision guards
prevent partial or competing reports. Full-batch recopy stops after reporting.

`build-message-handoff` remains actionable for the optional atomic discussion
post and explicit selected retries with account-history inspection and attempt
tracking. The reporting increment does not complete Phase 4 or T9-T10. Recovery,
hosted configuration and authorized pilot work retain their existing sequence.


## Private rehearsal deployment — September 13, 2026

The user requested a test deployment before the remaining Phase 4 and recovery
work. A separate owner-only Sites test environment now hosts the fictional
rehearsal through platform ChatGPT sign-in, with Site-user-bound organizer and
preview tickets. This early review surface does not change phase ordering or
complete Phase 6: independent real-organizer identity, recovery and the full
hosted acceptance matrix remain pending. No real member data or sends are
inferred from this test deployment.

## Phase 4 atomic discussion increment — September 14, 2026

The optional same-fling discussion post is implemented. The organizer reviews
its shared text and current readers separately from direct recipients, then
approval atomically records one post, its batch link and the approved state.
Copying and result reporting do not duplicate it. Discussion counts follow the
latest organizer reports, including unknowns and corrections, without exposing
recipient contacts, suffixes, access links or claimed app evidence to members.
Post edits preserve the original approved discussion text in message history.

`build-message-handoff` remains actionable for explicit selected retries with
account-history inspection and attempt tracking. The optional-post portion of
T10 has local simulated evidence; this does not complete Phase 4, full T9 or
independent hosted/pilot acceptance. Recovery follows after Phase 4.

## Phase 4 selected-retry increment — September 14, 2026

Selected retries now require per-delivery account-history observations, an
explicit stopped-run confirmation, exact selected-message review and atomic
export. Attempts preserve original delivery IDs and approved content; selected
outcomes become unknown until a report names the current attempt. Competing
exports, later reports, stale context and expired/revoked links are rejected.
Retry and report history remain attributed and redacted, and the original linked
discussion is preserved once.

The receipt at `work/app/test/evidence/message-retries-20260914.md` combines this
increment's simulated T9 retry checks with the existing T8 exact-review and T10
discussion evidence. This completes local Phase 4 implementation; it does not
establish real sending, account inspection, receipt or external duplicate safety.
Phase 5's versioned editable export, validation, isolated restore and deletion
follow in the existing sequence.

## Phase 5 export increment — September 14, 2026

Assigned organizers can prepare and save a version-1 JSON snapshot with 22
business-record collections, stable IDs, counts and redaction paths. A current
assignment guard, record limit and all collection reads run in one D1 transaction.
The strict field allowlist excludes authentication/code/session material and raw
handoff bodies; personal links in stored text are replaced. The organizer sees
an unencrypted-data acknowledgement, a separate save action, a field guide,
JSON schema and complete fictional example.

`build-recovery` remains actionable for edited-file semantic validation in isolated
staging, a dry-run identity mapping, atomic restore into a new private gathering,
and confirmed deletion. The export's basic JSON-schema checks do not establish
valid references, role semantics or currency arithmetic in an edited file. T11's
remaining restore, rollback, no-send and deletion acceptance stays open. See
`RECOVERY_TECHDOC.md` and the dated export test receipt for implementation detail.


## Phase 5 edited-file checking increment — September 14, 2026

Organizers can now check a separate edited version-1 export without storing the
upload or changing active records. Checks cover structure, identities,
relationships, times, historical roles, polls, payment arithmetic, message
history and access-link exclusion, with bounded record-level errors and a
counts-only summary. The original export remains separate and unchanged.

`build-recovery` remains actionable. Next implement explicit organizer identity
mapping and confirmed atomic restore to a new private gathering, followed by
confirmed deletion and the remaining T11 rollback/retention evidence. Passing
file checks is not evidence that a file can already be restored, and does not
advance the initiative to hosted or pilot acceptance.

## Phase 5 organizer-mapping preview — September 14, 2026

Organizers can now load current account choices for a checked export, explicitly
map each historical organizer to history-only or an eligible current account,
and inspect the proposed new-gathering inventory and exclusions. No matching
name or ID grants authority; the importer remains in the proposed organizer
set, while historical attribution stays separate. File and roster checks run
again for every preview, with no persisted upload or active-record mutation.

`build-recovery` remains actionable for confirmed atomic restore to a new
private gathering, fresh record/relationship mapping, rollback evidence and
confirmed deletion. The preview describes those required semantics; it does
not implement the final import or complete T11. The later importer must bind
the exact reviewed file/mappings to explicit confirmation and recheck authority
inside its transaction. Hosted and pilot work retain the existing sequence.

## Phase 5 confirmed restore and deletion — September 14, 2026

The remaining local recovery implementation is complete. A signed ten-minute
review binds the exact file, organizer mapping, importer and current account
roster. Confirmation creates a separate gathering with fresh identities in one
D1 transaction; a consumed review cannot create duplicate copies. Historical
organizers retain attribution without account access. Imported message history
has no credentials or sendable payload and is labelled as imported for organizers
and members. Confirmed deletion removes the gathering's active records and
member access together, retaining other gatherings and real organizer accounts.

Local T11 evidence includes the edited round trip, relationship checks, preserved
source records, concurrent confirmation, mid-import and mid-deletion rollback,
late organizer removal, no restored credentials, separate new-link issuance and
deletion invalidation. The populated migration preserves existing delivery
reports. The browser receipt covers explicit consent, consent reset, keyboard
confirmation, desktop/phone restore and exact-title deletion on three engines.

`build-recovery` is complete for this local fictional-data implementation.
`verify-hosted-test` now carries the next Phase 6 work and its unavailable inputs:
managed identity issuer/client, callback settings and allowed accounts, plus
provider backup retention, recovery/deletion procedure and approved audit
retention. The existing private rehearsal is usable for this review but does not
satisfy independent organizer identity or all T11/T12 hosted evidence. Provider
backup recovery/deletion remains unverified; no real-data, sending, access-change,
pilot or production approval is inferred.

## Phase 6 decisions — September 15, 2026

The user selected native ChatGPT Sites organizer sign-in, named Ken Novak and
Lucas Novak as the initial organizers, chose to retain action history until
the gathering is deleted, and asked to keep backups simple with no additional
requirements. The dated entry in `decisions.md` records the account addresses
and the scope of each answer.

`verify-hosted-test` is now actionable. Implement the selected native identity
path and verify the two organizers independently, then complete the hosted
acceptance matrix and document the existing host's backup and recovery/deletion
behavior. No separate identity-provider registration or new user-defined backup
policy is required to begin. The earlier Phase 5 record describes the inputs
that were unavailable then; these decisions supersede that blocker without
claiming Phase 6 implementation or acceptance is complete.

## Phase 6 native identity increment — September 15, 2026

Native mode now enrolls only the approved ChatGPT account list, pins the first
Site-scoped identity, and applies current account and gathering checks to every
organizer request and preview. It grants no fictional identity or pre-existing
gathering assignment. Local evidence includes 176 real-D1/domain/HTTP tests and
six desktop/phone native-identity browser journeys on three engines.

`verify-hosted-test` remains actionable for the full hosted T1-T12 matrix,
independent second-organizer acceptance, accessibility and interruption/restart
checks. The current private Site allows only its owner; Lucas's real sign-in
cannot be established by simulating his identity or changing sharing silently.
Managed-host backup retention and provider recovery/deletion remain unverified,
as documented in `notes/host-backup-review-20260915.md`. These limits do not
require a new user-defined backup policy and do not complete Phase 6 or the pilot.

## Phase 6 hosted workflow increment — September 15, 2026

The actual owner session now has hosted evidence for draft/invited read-only
preview, DST gap/repeated-time handling, a stale edit denied after closure,
closed-state profile correction, reopening and an edited JSON restore into a
separate gathering. Downloaded before/after snapshots prove source-record
preservation and fresh restored relationships; read-only hosted database
inspection found no member codes or sessions for either new fixture. The
[receipt](notes/hosted-workflow-acceptance-20260915.md) records exact limits.

`verify-hosted-test` remains actionable. Continue interruption/retry checks,
broader browser/accessibility coverage and populated hosted workflow acceptance;
independent second-organizer and managed-host recovery evidence remain open.

The next interruption probe found and fixed initial blank-state and disabled-retry
behavior when the sign-in status request fails. Six local real-UI/D1 browser
journeys now cover recovery and stale-state clearing. This is an incremental
T12 correction; managed Worker restart/migration/backup recovery remains open.
