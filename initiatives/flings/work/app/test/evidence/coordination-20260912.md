# Phase 3 coordination acceptance — September 12, 2026 (UTC)

This is a local fictional-data receipt. It establishes the implemented T6/T7
paths and the coordination part of T5; it is not hosted or human pilot evidence.

## Checks

- `npm test`: 45 passing real-D1/domain/HTTP/time tests, including 12 new
  coordination cases. Actual Miniflare D1 applies all five committed migrations.
- `test/coordination-browser.mjs`: six organizer/member journeys across
  Chromium, Firefox and WebKit at 1280×900 and 390×844. The machine-readable
  receipt records browser versions and the individual checks.
- `test/evidence/coordination-regressions-20260912.json` preserves the existing
  access, invitation, authoring, event-detail, assignment and independent-
  gathering results separately from their historical receipts.
- TypeScript and lint pass. Build and scope results are recorded with the PR.

## T6 — Discussions and polls

Database checks cover fling/activity/event scope; accepted, invited, declined,
withdrawn, removed and preview actors; cross-fling parents; own-post edits and
competing edits; organizer hiding with reason; edited/hidden history; and safe
text/links. Recognizable member/preview links, including percent-encoded forms,
are refused. Arbitrary secrets without recognizable link syntax are not claimed
to be detectable.

Poll checks cover single/multiple selections, explicit subset eligibility,
current and historical responses, replacement preserving the old poll,
organizer-only named responses, member aggregates after closure/deadline,
exact deadline boundaries and competing votes. Invitation generations retire
votes on decline/withdrawal, so reacceptance requires another vote.

The browser matrix creates a post with HTML-like text, follows the actual form
for event-scoped member posting/editing, creates a reviewed poll subset, votes
by keyboard, verifies result privacy, and hides a post with an audit reason.
A separate uninvited member preview can retrieve the fling post but cannot see
participant discussions, polls, payment requests or mutation controls.

## T7 — Payment records

Database checks cover explicit accepted-member allocations, cross-fling event
rejection, supported currency codes, integer/bounded arithmetic, member-only
read/write scope and reported versus confirmed money. Partial confirmation
cannot exceed the report, competing confirmations commit once, and a balance
cannot become negative. Corrections, waivers and refunds append separate
attributed entries; refunds cannot exceed confirmed money less earlier refunds.
An erroneous claim remains in history and changes no balance by itself.

The browser matrix creates an allocation, records a member's outside payment
report and partially confirms it through the organizer form. The member's
balance changes only after confirmation. The outside payment URL is a normal
no-referrer link with no recording handler; clicking it cannot confirm payment.
No payment credentials or money movement are implemented.

## T5 — Closure and remaining boundaries

Database tests reject every implemented coordination mutation while closed,
including reports and organizer adjustments. Browser tests reject a pre-closure
member request after closure, retain the balance and permitted history, then
reopen without reopening a closed poll or changing the ledger. Decline,
withdrawal and cancellation never silently delete balances or create refunds.

Message batches and their remaining T5/T8–T10 cases belong to Phase 4. Editable
recovery and deletion belong to Phase 5; dependency remediation, managed hosted
identity and independent human evidence retain their Phase 6/7 prerequisites.
Flings has no deployment block or waiting deploy-record branch, so this run's
test-deployment plan skips it. No real message, account activation, Site or
production release was created.
