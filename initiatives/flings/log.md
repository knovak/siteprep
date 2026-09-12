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
clears a stale child view. Evidence: 70 D1/domain/HTTP/time tests and 18 browser
journeys in `work/app/test/evidence/messages-20260912.md`.

The selected `build-message-handoff` todo stays actionable for optional atomic
discussion posting, result preview/reporting and explicit selected retries.
No lifecycle change, real message, provider account or deployment was made.
