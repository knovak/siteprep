# Log

## 2026-09-10 — Draft objectives.md - what "done" would mean

Defined wish-derived outcomes and acceptance journeys for independent flings, organizer/member views, coded member access, invitations, discussions, polls, payment coordination and assisted direct messaging; queued the specification and its open design choices.

## 2026-09-10 — Draft spec.md with alternatives for roles, invitations, member access, payments and messaging

Specified roles, member capabilities, invitation disclosure, discussions, polls, payment records, reviewed AI-assisted sending and independent delivery/discussion outcomes; compared alternatives and queued the implementation and test plans.

## 2026-09-10 — First specification review response

Addressed four review threads on PR #498: organizer-created profiles editable
by members, with email/text/both notification preferences; independent organizer
and member roles across multiple flings; fixed 35-day member sessions; and
overlapping member codes with 14-day sending windows, 35-day expiry from first
issue and first-use records. Distinguished routine rotation from emergency
revocation, preserved per-fling profile isolation and added acceptance cases.
The wish and lifecycle stage are unchanged by this response.

The four-thread sweep budget is spent. Two specific review requests remain
unanswered and are not superseded by this commit: [computer-control messaging
as the first provider, with advantages, disadvantages and improvements](https://github.com/knovak/siteprep/pull/498#discussion_r3976712643),
and [unencrypted, potentially editable backup exports before considering an
encrypted format](https://github.com/knovak/siteprep/pull/498#discussion_r3976757289).
The provider and backup choices in the specification are still pending that
review; this revision does not claim to settle either request.

## 2026-09-10 — Complete the two carried-over specification reviews

Addressed the two requests explicitly deferred by the prior four-thread pass.
The specification now proposes a computer-control prompt as the first sending
path, with organizer-supplied core text, resolved preference-aware recipients,
personal links, an escaped manifest, per-delivery results and a discussion post
whose status does not overstate sending. It compares the benefits and limits
against manual/API delivery and records improvements and pilot acceptance.

Recovery now starts with editable, unencrypted versioned JSON, excludes live
credentials, validates an isolated restore and cannot resume old sends or
sessions. Encryption is deferred until useful production experience. The
recommendations and remaining decisions are recorded in decisions.md. The
wish, objectives and lifecycle stage are unchanged by this response.

## 2026-09-10 — Draft plan.md and test-plan.md from the Flings specification, including provider activation prerequisites

Prepared phased implementation and objective-mapped test plans for isolated flings, member codes and sessions, coordination, reviewed computer-control sending, editable recovery and separately authorized hosted/live acceptance; queued critique-plan.

## 2026-09-10 — Critique the Flings implementation and test plans before building the access foundations

Critiqued the plan and revised atomic revocation, session context, secret retention and staged acceptance; queued Phase 1 access foundations.

## 2026-09-10 — Build local Flings access foundations, member-code lifecycle and authorization projections

Completed all four local access checkpoints: real D1 rollback and authority races, code/session lifecycle, browser session transport, and profile/preview projections. Evidence in work/app/test/evidence/phase-1.md; full organizer/member journeys follow in Phase 2.

## 2026-09-11 — Build the first organizer/member interface journeys

Added assigned-gathering lists, profile creation, invitation/withdrawal controls,
read-only member previews, acceptance/decline/reacceptance, and confirmed
closure/reopening. Events show their stored instant in their own IANA zone.
Invitation and closure writes check current authority and the fling revision
inside the existing atomic D1 batches. Stale requests fail without partial
invitation or audit changes; closed profiles remain editable.

Validation passed 21 real-D1 domain/HTTP tests, 18 new organizer/member browser
journeys and all six existing access journeys across Chromium, Firefox and
WebKit at desktop/phone sizes. Corrected startup hydration and long-name phone
overflow found by those journeys. Type and lint checks pass. The original
`build-member-journeys` item remains actionable for event authoring, ordering,
draft/cancellation, organizer maintenance and DST-entry acceptance. This is a
Phase 2 increment, not completion; the plan records the next checkpoints.

## 2026-09-11 — Add gathering and event authoring

Added new fling creation/renaming, draft/published/cancelled activity editing,
activity order, and event creation/editing. Saves check current organizer
assignment, fling revision, open state and child relationships in the same
transaction. Event input rejects timezone gaps and requires an explicit offset
for repeated local times; edits preserve the chosen instant and zone.

Browser verification exposed a focus-refresh interaction that could consume an
edit click. Focus rechecks now preserve the editor and only the newest response
updates its snapshot. Each draft retains its opening revision, so a concurrent
save still rejects it. Six new desktop/phone authoring journeys passed across
Chromium, Firefox and WebKit, including this stale-draft regression. All 26
real-database/domain/HTTP and timezone tests pass.

The original member-journey todo remains open for organizer maintenance,
assignment controls, event end/location fields, fling description/default zone
and the final independent-gathering acceptance matrix. This remains local
fictional-data work; no hosting, live identity or sending was activated.

After the focus fix, the existing six access and 18 invitation/closure browser
journeys also passed against a fresh local fixture database. The final browser
evidence therefore covers 30 journeys, with the application build, TypeScript
and lint passing on the final implementation.

## 2026-09-11 — Extend event details and fling settings

Implemented member-visible fling descriptions/default zones and event end times,
invitation location text, accepted-participant name/address/link fields and
server-recorded update times. Existing event times are preserved when changing
the default zone. The server rejects invalid/ambiguous ends, backwards ranges
and unsafe links before the current-authority/revision transaction. Participant
locations use the same member/preview redaction as other private event details.

The original member-journey todo remains actionable for organizer maintenance,
assignment controls and final independent-gathering acceptance. This is the
next bounded Phase 2 increment, without a lifecycle change. Test results and
limits are recorded in `work/app/test/evidence/event-details-20260911.md`.

## 2026-09-12 — Build organizer and member journeys, events, invitations, preview and closure

Completed local Phase 2 acceptance across three independently authored flings: fixed organizer addition confirmation and member-profile correction forms; 33 real-D1/HTTP/time tests and 60 browser journeys passed across Chromium, Firefox and WebKit at desktop/phone sizes. Later poll/payment/message closure checks stay with their planned capabilities; hosted and human acceptance remain Phases 6/7.

## 2026-09-12 — Build discussions, polls and attributed payment coordination

Built and verified local scoped discussions, replacement polls and attributed payment records; 45 real-D1/domain/HTTP/time tests and six coordination browser journeys pass. Preserved independent regression receipts and queued Phase 4 reviewed message handoff.

## 2026-09-12 — Message audience review increment

Added organizer-only recipient review for the three planned groups and their
individual, unanswered-invitation/poll and outstanding-payment refinements.
Current profile preferences preserve separate membership/channel rows, expose
omissions and flag shared destinations. The read uses one guarded D1 snapshot
and returns no access codes or approved handoff records. The larger
`build-message-handoff` item stays open for approval, exact prompt export,
optional discussion posting and reported outcomes. Evidence is recorded in
`work/app/test/evidence/audience-20260912.md`.

## 2026-09-12 — Exact message review and prompt export increment

Added organizer-owned message batches, exact per-recipient review, explicit
shared-destination approval, encrypted expiring personal-link payloads and
copyable JSON sending prompts. Recopy preserves the approved text and delivery
IDs; outcomes remain unknown. Current recipient/authority/state and code/poll
window checks reject stale exports, including changes between verification and
the final transaction. Fixed the workspace error display when a rejected action
clears a stale child view, and disabled composition until recipient review is
ready to prevent a loading result from resetting newly entered text. Evidence: 70 D1/domain/HTTP/time tests and 18 browser
journeys in `work/app/test/evidence/messages-20260912.md`.

The selected `build-message-handoff` todo stays actionable for optional atomic
discussion posting, result preview/reporting and explicit selected retries.
No lifecycle change, real message, provider account or deployment was made.


## 2026-09-13 — Attributed result preview and reporting increment

Added strict result JSON validation, signed previews, explicit confirmation,
per-delivery reported/failed/suppressed/unknown states and append-only corrections
with reporting organizer, server time and claimed evidence. Missing rows preserve
prior outcomes. Current authority/context/results-revision guards reject stale or
competing reports; an injected later insert failure rolls back the full report.
Reporting uses redacted approval history after link expiry/revocation and stops
full-batch recopy after any report. The interface shows preview changes, counts,
provenance and prior reports, and clears a displayed prompt after recording.

The selected `build-message-handoff` todo remains actionable for the optional
atomic discussion post and selected retries with attempt tracking. Evidence is
in `work/app/test/evidence/message-results-20260913.md`; no lifecycle completion,
real send or deployment is claimed.


## 2026-09-13 — Prepare the requested private test rehearsal

Added an explicit private-test mode using the Sites-dispatched signed-in user
ID and exact HTTPS origin. Fictional organizer and preview tickets bind to that
visitor; the local mode remains loopback-only. Registered the separate Flings
test target and D1 binding, and kept runtime secrets outside source control.
Updated the server/build dependencies required for hosting; the production
dependency audit is clear. All 87 database/domain/HTTP/time tests pass, including
four new hosted-rehearsal boundary tests. This is an early review deployment,
not Phase 6 completion or authorization for real data, real sends or production.

## 2026-09-13 — Publish and verify the private test Site

Published Flings Test version 1 with its own D1 database and owner-only ChatGPT
sign-in. The real browser sign-in, fictional organizer workspace/detail and
member-link exchange all succeeded. The updated stack also passed six local
member browser journeys across three engines at desktop/phone sizes. Deployment
identity, source consistency, validation and remaining limitations are recorded
in `notes/private-test-deployment-20260913.md`. The Phase 4 todo remains open;
production has not been released.

- 2026-09-14: Advanced `build-message-handoff` with separately reviewed optional discussion content/readers, atomic single-post approval and privacy-filtered reported outcome counts. Added failure/concurrency and interface evidence; the item remains actionable for selected retries and attempt tracking. No real messages or production release.

## 2026-09-14 — Build reviewed message audiences, exact sending-prompt export and reported outcomes

Completed local Phase 4 with reviewed selected retries, per-delivery account-history observations, atomic attempt exports and attempt-specific outcome history. Simulated tests do not establish real sending or receipt; Phase 5 recovery follows.

## 2026-09-14 — Add a versioned gathering export

Advanced `build-recovery` with an organizer-only JSON download, strict version-1
field schema, complete fictional example and file guide. A single D1 transaction
captures 22 business collections with stable IDs and history, excluding access
credentials and redacting personal links. Local validation passed 118 tests and
18 desktop/phone browser journeys. The todo remains actionable for edited-file
validation, isolated restore and deletion; T11 and later hosted/pilot acceptance
remain open. No real messages or production release.


## 2026-09-14 — Check edited gathering backups

Advanced `build-recovery` with an organizer-only, in-memory file checker and
record-level errors for the versioned export. The read-only path validates
relationships, roles, times, polls, payment and message history, and rejects
unexpected fields and encoded personal links without persisting uploads or
changing application tables. Local validation passed 149 tests and six new
three-engine desktop/phone journeys. Identity mapping, atomic restore, deletion
and full T11 remain on the actionable recovery item.

## 2026-09-14 — Preview recovery organizer mappings

Advanced `build-recovery` with explicit historical-organizer choices and a
read-only new-gathering preview. Current account choices are scoped to the
authorized gathering; names never grant authority and the importer stays in
the proposed organizer set. All 160 local tests and 18 desktop/phone preview,
checking and export journeys pass, including unchanged application storage and
late account/file changes. Confirmed atomic restore, rollback and deletion stay
on the actionable recovery item; no phase completion or production release is
claimed. Evidence is in `work/app/test/evidence/recovery-preview-20260914.md`.

## 2026-09-14 — Build versioned editable export, isolated restore and deletion

Implemented confirmed atomic restore with fresh identities, imported-only message history, replay protection and permanent active-record deletion; local T11 evidence passes, with independent hosted identity and provider retention evidence carried in verify-hosted-test.

## 2026-09-15 — Record the user's hosted-test decisions

Recorded native ChatGPT Sites organizer sign-in; Ken Novak
(`krnovak@gmail.com`) and Lucas Novak (`lucas.d.novak@gmail.com`) as the initial
organizers; organizer action history retained until the gathering is deleted;
and no additional backup preference, keeping recovery simple. Made
`verify-hosted-test` actionable for implementation and hosted verification.
Provider backup behavior remains an investigation task; acceptance is not yet
complete. See the dated entry in `decisions.md`.

## 2026-09-15 — Native ChatGPT identity increment

Implemented explicit native organizer enrollment with approved-account checking,
immutable Site-subject binding, account-bound anti-forgery checks, current
assignment enforcement and viewer-bound previews. Native mode disables fictional
impersonation and starts each real organizer with no inherited gathering access.
Documented the simple JSON recovery path and the limits of managed-host backup
evidence. Local native tests and six browser journeys pass; see the dated
acceptance receipt. The full hosted item remains open.

- 2026-09-15: After merging native sign-in PR #535, the sweep verified an actual owner-only hosted fictional workflow: draft/invited preview, DST validation, stale edit after closure, closed profile correction, reopening, invalid-schema rejection and explicit edited restore. Downloaded source records were unchanged; restored IDs/relationships and absence of member credentials were checked. See `notes/hosted-workflow-acceptance-20260915.md`. `verify-hosted-test` remains open for the rest of Phase 6; no app source, audience, messages or production changed.
- 2026-09-15: The same hosted-acceptance sweep exposed a local interrupted-status bug: blank initial workspace, then stale gathering links with a disabled retry after focus refresh. Fixed refresh cleanup/error recovery and added six real-UI/local-D1 browser journeys across three engines and two sizes. These injected failures are separate from actual hosted acceptance and do not claim managed-host outage/restart coverage.

- 2026-09-16: Advanced `verify-hosted-test` with actual private hosted restoration of the populated 46-record fictional backup, imported-only message outcome checks and accepted/invited read-only coordination previews. The downloaded 47-record result passed identifier, relationship and preserved-history assertions; database inspection found no restored credentials. Narrow previews had no horizontal overflow. See `notes/hosted-populated-recovery-20260916.md`. Phase 6 remains open; no application source, deployment, sharing, real sending or production changed.

- 2026-09-17: Verified actual hosted two-tab stale-edit rejection and recovery on a new empty fictional gathering. The stale form could not overwrite the first save; Reload workspace preserved it, a fresh Enter-activated save succeeded, and the first tab's reload showed the new value. See `notes/hosted-conflict-recovery-20260917.md`. This is ordered stale-form evidence with one native owner, not simultaneous transactions or full Phase 6 acceptance. No source, deployment, sharing or sending changed.

- 2026-09-17: Hosted keyboard acceptance found Add event skipped its inserted form and Save lost focus. Corrected gathering-editor focus on explicit open and save/cancel return, with six desktop/phone browser journeys across three engines and all 176 existing application tests passing. See `notes/authoring-focus-20260917.md`; full Phase 6 remains open.

- 2026-09-17: Continued `verify-hosted-test` with an actual fictional hosted
  member-code exchange. Fixed the indefinite loading state after a denied
  coordination write; retry stays bound to the original membership. All 176
  tests and six browser journeys passed; private test version 12 verified
  closure/reload/vote preservation. See `notes/member-recovery-20260917.md`.
  Full hosted acceptance remains open; no messages sent or production release.

- 2026-09-17: Continued hosted acceptance with eight missing-identity requests
  against test version 12. Organizer/member reads and sign-in attempts failed
  closed as expected; owner-only policy unchanged. Recorded the platform versus
  application identity boundary in `notes/hosted-access-boundary-20260917.md`.
  Independent identities and full Phase 6 acceptance remain open.

- 2026-09-18 (UTC): Continued hosted T12 acceptance with twelve layout checks
  across 320, 390 and 1280 pixels, including expanded message history and both
  member-preview states. Documented label probes and targeted keyboard checks
  in `notes/hosted-reflow-20260918.md`. No overflow or missing label candidates
  were found; no business records, source, audience or deployment changed.
  `verify-hosted-test` remains actionable for the rest of Phase 6.

- 2026-09-18 (UTC): Hosted sequential keyboard acceptance found that opening
  and cancelling a coordination form left focus on the page body. Added entry
  and return focus for post, poll, payment and ledger forms, including heading
  fallback when an action disappears. All 176 application tests and six
  expanded desktop/phone coordination journeys pass. See
  `notes/coordination-focus-20260918.md`. The live test Site reported public
  access before any deployment; this run preserves that existing audience.
  Full hosted acceptance remains open.

- 2026-09-18 (UTC): Refreshed Flings test version 13 and verified twelve hosted
  coordination-form opening/cancellation checks at desktop and phone widths.
  Corrected the recorded test access to public to match the live policy already
  present before deployment; no access-setting call was made. Hosted business
  records and production remain unchanged. See the same coordination-focus
  receipt for source, build and deployment evidence.
