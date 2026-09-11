# Flings test plan

September 10, 2026. This is planned verification, not test results. Each group
maps to the [implementation plan](plan.html), [specification](spec.html) and
numbered [objectives](objectives.html). Passing simulated sending does not
complete the live receipt objective.

## Fixtures and evidence

Use three fictional flings: a movie followed by a meal in one activity, a
wedding weekend with separately invited activities, and concerts across months.
Organizers A and B share the wedding; A also organizes the outing and is an
ordinary member of C's concert fling. Give a member separate memberships in
two flings with matching contacts, and another member different contacts.
Include invited, accepted, declined, withdrawn, removed and incomplete profiles,
email/text/both preferences, duplicate destinations, private addresses and
multiple time zones. No fixture addresses or numbers may reach a real sender.

Inject time for exact code/session boundaries. Test pure domain rules, actual
database transactions, HTTP authorization and complete browser journeys.
Failure tests compare database state before/after, not only a displayed error.
Keep fixture seeds, commands, source commit, runtime/browser/OS versions,
pass/fail counts and redacted findings under `work/` or `notes/`. Never commit
member capabilities, contacts from the live pilot, credentials or copied prompts.
Record manual observations separately from automation and provider reports.

## Evidence by implementation stage

Phase 1 proves T1/T3 domain and HTTP rules with seeded invitations and a minimal
browser harness for T2 exchange/session behavior. Full organizer/member/preview
screens and the associated T1/T3 browser journeys remain Phase 2 work. Every
receipt names the layer exercised and lists deferred journeys. Test groups are
not marked wholly passed when only the domain or HTTP portion exists.

## T1 — Independent flings and roles

**Objectives 2, 4, 5, 10; Phase 1.** For every read and write, exercise assigned
organizer, member, preview, unrelated organizer/member and unauthenticated
requests. Substitute a child ID, membership ID and fling ID from another fling,
including guessed URLs, list pagination and nested requests. Responses contain
no other fling's private values and denied requests change nothing.

Organizer A's member role never permits concert administration. Removing A
from the wedding immediately revokes that assignment while the outing and
concert membership continue to work. Removing the final organizer is rejected
until another is appointed. Test stale signed-in tabs and direct API calls.
Production/test hosting cannot accidentally enable the development identity.

Race two removals of the last two organizers: exactly one organizer remains.
Race a protected write or session creation with revocation/removal. An operation
that commits after revocation must fail its current-authority check and leave no
partial records. Exercise both orderings against the actual database. Inject
both an SQL failure and a normal failed revision/generation precondition midway
through a compound change; both must roll back earlier effects.

## T2 — Member codes, sessions and revocation

**Objectives 4, 5; Phase 1.** Use a clock-controlled sequence at just before,
exactly at and just after each boundary:

| Journey | Required result |
|---|---|
| First issue and first exchange | At least 128 random bits; only a digest plus protected sending copy is stored. First-use time records the first successful exchange once; invalid requests do not set it. |
| Concurrent sends on days 0 and 14 | Same eligible code reused before day 14; one new current code issued atomically at day 14; both channels use it; rotation sends nothing. |
| Codes issued on days 0, 14, 28 | All three may exchange on day 28. Day-0 code stops exchanging exactly on day 35; later codes retain their own expiries. |
| First use on day 34 | New session works until day 69; day-0 code still expires on day 35. Ordinary visits do not extend either fixed expiry. |
| Reopen an unexpired link | Starts a new fixed 35-day session without login; opening another fling does not switch the first page's action context. |
| Revoke one code | All its sessions fail immediately; another unrevoked code's sessions remain usable. |
| Emergency replacement/removal | Every earlier code and session for that membership fails, including concurrent requests; other memberships are unaffected. |
| Sending-copy expiry | Raw code/handoff values cannot be read at the sending boundary or after revocation, even before a cleanup job runs. Necessary session revocation metadata remains. |

Inspect browser history, request/application logs, error reports, exports and
outbound referrers for raw codes. Check HTTPS exchange, HttpOnly/secure session
cookies, request-forgery protection and invalid-code rate limiting. Unknown,
expired, removed and revoked links give the same non-disclosing page. A
forwarded valid link behaves as that member, with the stated limitation visible.

Open member links for two flings in one browser, keep both tabs open, and submit
from each after exchanging the other link. Each acts only in its original fling.
Replace the session context with another member link in the same fling: a stale
page must reload or fail, never act as the new member silently. Test back/forward
navigation and cached responses without exposing the earlier profile.

## T3 — Profiles and preview

**Objectives 2-5, 10; Phases 1-2.** An organizer creates a profile; its member
edits name, email, number and notification preference without separate login.
Another membership with the same contact is unchanged. Validate incomplete
profiles and each channel preference without silently substituting an address.
Profile corrections still work in a closed fling, while coordination fails.
Concurrent edits require explicit conflict handling rather than lost updates.

For every invitation state, compare the actual member response and organizer
preview projection. Preview shows the selected name and notice, never a member
code or organizer-only controls. Direct preview attempts to edit a profile,
accept, vote, report payment, post, export a message or change roles all fail.

## T4 — Invitations, events and local times

**Objectives 1, 3, 5; Phase 2.** Build all three gatherings through the interface.
Verify independent event times/places, activity order and concert dates months
apart. A member invited to two activities accepts one and sees only its private
detail. Decline hides that detail; reaccept restores it while open. Withdrawal
removes access immediately. Drafts stay organizer-only; cancellation leaves
previous invitees a visible notice. Check response bodies as well as the page.

For daylight-saving gaps and repeated local times, require a corrected time or
explicit offset; round-trip the selected instant and IANA zone. The event's
zone stays visible when the viewer is elsewhere. Saving an event change updates
its changed time without creating an outbound message.

## T5 — Closure and reopening

**Objectives 1-5; Phases 2-4.** Close with pending invitations, votes, outstanding
amounts and an approved/exported message batch. Stale member and organizer tabs
cannot mutate coordination or generate a sending handoff. Allowed history and
profile correction remain usable. In-app handoffs become invalid and the UI
instructs the organizer to stop any external run; it never claims recall of a
copied prompt. Reopen and confirm existing responses/history survive, closed
polls remain closed and no messages or payment changes occur automatically.

## T6 — Discussions and polls

**Objectives 5-7; Phase 3.** Post and read at all three scopes with each role and
invitation state. Check attribution, editing markers, organizer hiding/audit
reason, safe rendering of HTML-like text and links without capability leakage.
Uninvited/declined members cannot retrieve participant discussion bodies.

Exercise single/multiple choice, subset eligibility, editable responses,
deadlines, closed polls and stale-tab votes. Members see their own selections
and aggregates only after closure; organizers see named responses and totals.
Changing voted-on options creates a replacement. Decline/withdrawal removes
active tallies without losing audit history; reacceptance requires a fresh vote.

## T7 — Payment coordination

**Objectives 5, 7; Phase 3.** Request explicit amounts from selected accepted
members in one currency. Only the member's own amounts are visible to them.
Check integer arithmetic, a partial report/confirmation, an erroneous claim,
correction, waiver and refund. Reports remain unconfirmed until the organizer
acts. Competing confirmations cannot double-count or create a negative balance.
History remains attributed and append-only. Click an outside payment link,
decline, withdraw and cancel an event: none silently confirms, deletes or refunds
an amount. No payment credentials enter application storage.

## T8 — Audience resolution and approved text

**Objectives 5, 8; Phase 4.** Cover all active fling members, current activity
invitees and accepted members, plus individuals and unanswered-invitation,
unanswered-poll and outstanding-payment refinements. Compare the exact manifest
against the fixture oracle, including removal, missing contacts, channel opt-outs
and email/text/both. Shared destinations require review, preserving distinct
membership URLs. Messages are individual, never a CC/group disclosure.

Use quotes, commas, Unicode, newlines and text saying to ignore instructions.
Round-trip JSON and compare subject/core/suffix/destination byte-for-byte with
approved content. Data cannot inject instructions or add recipients. Both
channels carry the same eligible member code. Contacts, invitation responses,
closure and code windows changed after approval require renewed review; no
silent replacement or new recipient is allowed. Two organizers racing approval
and export produce only one active handoff claim.

## T9 — Copying and reported outcomes

**Objective 8; Phase 4.** Copy and recopy: state becomes exported for sending,
never sent. Verify timestamp, earliest sending boundary, selected sender-account
instructions and the clipboard/LLM exposure notice. Delay past the boundary
or change eligibility: generating a new prompt requires a new review.
Explicitly demonstrate that already copied text remains outside Flings' control.

Use a simulated external run with success, failure, interruption and unknown
outcomes. Import valid results only after preview; reject wrong batch/revision,
unknown/duplicate delivery IDs and malformed statuses atomically. Preserve
reported evidence and actor; missing results stay unknown. Retrying needs
explicit delivery selection after the organizer checks account history.
No simulated result counts as recipient receipt or as proven duplicate safety.

Expire or revoke a code after approval and inspect every stored representation:
encrypted handoff bodies, raw-link fields, revision snapshots, audit events and
staging. Secret material is unavailable even if cleanup has not run, while the
redacted approval and imported outcome history remain readable. An eligible
reconstruction matches the approved payload fingerprint byte-for-byte; a purged
payload cannot be recopied or reconstructed from history without renewed review.

## T10 — Direct message plus discussion

**Objective 9; Phase 4.** Review differing direct and discussion audiences and
content. Private amounts, contacts and personal suffixes never enter the shared
post. Interrupt the approval transaction: either message revision, deliveries
and one post all exist, or none do. Its initial state is Notification prepared.
Report failed and unknown sends while the post remains readable; display each
outcome accurately. Recopying, importing twice and retrying never create a
second discussion post. Editing a post does not alter approved send history.

## T11 — Export, edited restore and deletion

**Objectives 2, 4, 5, 7-9; Phase 5.** Export while an organizer edits the fling;
validate consistent counts and relationships. Open the plain JSON, edit a
fictional event and profile, preserve the original and restore into staging.
Preview changes, map organizer authority explicitly and confirm a new fling.
Old flings remain byte-equivalent; all new IDs/relationships are mapped correctly.
Imported organizer names do not grant sign-in access; the importer retains one
working organizer. Imported results are history, not live sending evidence.

Reject unknown schema versions, excessive size, duplicate IDs, broken parents,
cross-fling references, invalid types/times/roles/polls/currencies and impossible
ledger arithmetic with record-level errors. Inject failure during final import:
there is no partially usable fling. Treat imported text as data, never SQL/code.

Search exports, staging and restored data for code values/digests, sessions,
secrets and live member links, including links embedded in free text. Restore
starts no sessions, revives no old codes, resumes no handoffs and sends nothing.
Explicit new link issuance remains separate. Exercise deletion, interrupted
staging cleanup and the documented provider backup recovery/deletion procedure;
distinguish active storage from downloaded files and external messages.

## T12 — Hosted operation, accessibility and recovery

**All objectives; Phase 6.** Repeat authorization, concurrent mutation, code
expiry, approval rollback and restore against the actual test Worker/database.
Reject invalid organizer issuer/audience/state and expired identity sessions;
confirm missing configuration fails closed. Verify the host's access setting
separately from app roles. An owner-only test Site cannot prove an outside
member's login-free journey.

Walk the complete organizer/member flow by keyboard at desktop and narrow-phone
widths in Chromium, Firefox and WebKit. Check focus on dialogs/errors, visible
labels, loading/empty/denied/failed/retry states, zoomed text and no horizontal
loss of essential controls. Run automated accessibility checks and record an
actual screen-reader walkthrough separately. Rehearse network interruption,
server restart, migration failure and backup restore. Record measured pilot
fixture sizes and latency; do not extrapolate unsupported production capacity.

## T13 — Authorized real-world acceptance

**All objectives, especially 8-9; Phase 7.** First record the plan's host,
identity, data/retention, sender account, actual LLM/computer, text setup,
recipient, exact-batch and cost approvals. Stop at any missing prerequisite,
with the appropriate blocker. Approval of this test plan authorizes no sends.

An independent organizer and member exercise the three gathering fixtures,
profile/invitation changes, preview, discussions, poll, partial payment and edited
restore. On the approved setup, send small reviewed email and text batches to
authorized test recipients, including a both-channel member and one optional
discussion post. Verify recipient-confirmed receipt, exact content, correct
personal link and sender account separately from clicking Send or an LLM report.

Record time per batch, exact destinations/content matched, attempts, failures,
duplicate messages and unknown outcomes. Exercise a controlled interruption,
history inspection and manual fallback without resending an uncertain delivery.
No unintended recipient, mixed-up personal link or hidden duplicate is acceptable.
Unexplained outcomes or missing receipt leave the journey incomplete. Report
observed usability/reliability and any reasons to reconsider API delivery; do
not change the delivery design or call production ready without that review.

## September 11 Phase 2 first-increment receipt

The 21 domain/HTTP tests pass on real local D1, including assignment-only
workspace reads, invitation projections, stale/concurrent response rollback,
closure and reopening, preview/member denial and cross-fling child substitution.
Eighteen new browser journeys pass across Chromium/Firefox/WebKit at 1280×900
and 390×844, exercising the three seeded gathering fixtures from organizer
member creation through invite, accept, decline, preview, closure, closed
profile correction, reopening and withdrawal. A Tokyo viewer still sees each
event's America/Los_Angeles zone. Startup and long-name phone-layout defects
were corrected and retested. The receipt is `work/app/test/evidence/phase-2-journeys.json`.

These are seeded-activity journeys, not proof of constructing all three
fixtures through event-authoring screens. Those screens, ordering, draft and
cancellation controls, DST-gap/repeated-time entry and later poll/payment/message
closure checks remain unimplemented acceptance work. Hosted/pilot verification
and the recorded dependency advisories remain separate from these local results.

## September 11 event details receipt

The event-details increment adds database-backed checks for settings validation,
unchanged existing event instants, end-time gaps/repeats and ordering, unsafe
location links, atomic rejection, and location projection across invitation
states and read-only previews. Browser evidence exercises actual forms at
desktop/phone sizes in Chromium, Firefox and WebKit with a Tokyo viewer; it
checks default-zone prefill, unchanged existing events, end-time round-trip,
participant-only location access, preview parity, decline redaction and layout.
See `work/app/test/evidence/event-details-20260911.md` for the final run counts
and remaining acceptance work. This is local fictional-data evidence.
