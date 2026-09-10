# Phase 1 evidence — September 10, 2026

Tested application source: `68f769523b9134dba1b7ae5d0eb43087f5722d9d`.
This receipt describes local fictional-data work. It does not certify hosted
identity, delivery, real users or all of T1–T3's later interface journeys.

## Checkpoint results

| Plan checkpoint | Executed evidence | Result |
|---|---|---|
| Database and permission proof | Both Drizzle migrations applied to fresh Miniflare D1. Compound parent constraints, duplicate assignments/invitations, SQL failure and ordinary failed precondition after a prior write; racing last-organizer removals and generation changes. Persisted members/audits/guards compared after failure. | Pass |
| Codes and revocation | Day 0/14/28 overlap, before/exactly/after day 35, day-34 session to day 69, immutable first use, concurrent renewal, encrypted-copy purge on reads, one-code revocation, emergency generation change, member removal and both write/revocation orderings. | Pass |
| Session transport | Actual browser fragment exchange, immediate URL cleanup, two flings in one context, independent profile saves, same-fling replacement refusing the earlier page, history restoration, no raw code in request URLs or console. HTTP tests verify HTTPS Secure/HttpOnly/SameSite flags, Origin/HMAC checks, generic link failures and rate limiting. | Pass |
| Profiles and projections | Domain/HTTP checks for per-fling roles, creation, contact validation, incomplete delivery preferences, revision conflicts and corrections after closure. Actual-member and preview projection equivalence for seeded invitation states; preview writes refused even with organizer cookies. | Pass |

`npm test`: **16 tests passed, 0 failed** on Node v23.11.0 with the pinned
Miniflare 4.20260515.0 runtime. The tests use real D1; they do not replace it
with an in-memory application mock. No simulated delivery is counted as receipt.

`npm run test:browser`: **6 journeys passed**, desktop 1280×900 and phone
390×844 in each of Chromium 143.0.7499.4, Firefox 144.0.2 and WebKit 26.0,
on Darwin 25.6.0. See `browser.json` for the recorded time and per-journey
checks. The form saves by keyboard. No horizontal overflow or browser page
errors occurred. These are emulated phone viewports, not physical-device tests.

`npm run typecheck`, authored-source `npm run lint` and the Vinext application
`npm run build` passed. The stock scaffold component catalog remains under the
TypeScript/build checks and has the documented lint exclusion in `README.md`.
Repository build/scope checks and review screenshots are reported with the PR.

## WebMCP observation

The Codex in-app browser exposed `update_member_profile` with exactly four
string fields, no extra properties and a mutating annotation. A real tool call
saved the fictional Alex profile, returned `{saved: true, revision: 1,
complete: true}` and updated the visible saved status. A second call with phone
`555` failed validation. This is a focused tool-contract observation through the
browser's actual registry. Stock Playwright browsers lacked that registry and
used the form; they are not recorded as WebMCP validation.

## What remains

Phase 2 must build the organizer interface and event/invitation creation,
acceptance, decline, withdrawal, cancellation, closure/reopening and time-zone
handling. The read-only preview page exists, but its full organizer entry
journey and the remaining T1/T3 interface acceptance are still pending. Seeded
event/invitation records establish the access projections only.

Discussions, polls, payments, message handoff, recovery, real managed organizer
identity, hosted operation and authorized pilot receipt belong to Phases 3–7.
The dependency audit records **14 findings: 6 moderate and 8 high** in the pinned
scaffold/toolchain. Dependency refresh and renewed verification are required
before hosting. This local increment makes no production-security claim.

No cloud Site was created, no deployment target registered, no real contact
used and no message sent. The launcher binds local storage and explicit local
identity to the configured loopback origin; hosted organizer requests fail
closed. The existing plan's host access, costs, data/retention and pilot
prerequisites remain in force.
