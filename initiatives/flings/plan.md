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

Use a managed OpenID Connect identity adapter for organizer sign-in, verified
on the Worker before live activation. Its actual issuer, client registration
and permitted organizer subjects must be supplied before the hosted pilot.
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
Deletion removes contacts, posts, payment records and staged exports from active
application storage after a clear confirmation. Explain that downloaded exports,
external messages and provider backups have their own retention. Before real
data, record the host backup retention and recovery/deletion procedure and the
approved audit-history retention; these are activation prerequisites, not an
invented promise of immediate erasure from provider backups.

## Phases 6-7: activation prerequisites

| Before | Required record | If unavailable |
|---|---|---|
| Hosted private test | Separate Sites test target, approved resource use and server secret provisioning; an identity issuer/client, callback configuration and allowed organizer accounts | `data:` for account/configuration inputs; `cost:` for new spending approval |
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
