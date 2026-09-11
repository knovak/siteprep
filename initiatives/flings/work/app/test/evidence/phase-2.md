# Phase 2 first increment — September 11, 2026 (UTC)

Base: `16b2a1a17b53edc969d3d0b0d303ef19f551cc4a` (the exact parent is recorded in git). These results describe
local fictional-data implementation on macOS arm64, Node 23.11.0, pinned
Miniflare/D1 and Playwright 1.57.0. Browser versions and viewport receipts are
in `phase-2-journeys.json` and `browser.json`; no capabilities or cookies are
recorded. The source and these receipts travel in the same implementation PR.

- `npm test`: 21/21 real-D1 domain/HTTP tests, including all 16 access regressions.
- `npm run typecheck` and `npm run lint`: passed.
- `node test/journeys-browser.mjs`: 18/18 organizer/member journeys, three
  gathering fixtures × three engines × two viewport sizes. Tokyo viewer zone.
- `npm run test:browser`: 6/6 existing desktop/phone member access journeys.

The new journeys cover assigned-fling discovery, profile creation, invitations,
keyboard acceptance, decline-dependent redaction, stored event-zone display,
read-only preview, confirmed closure, rejection of stale responses, closed
profile correction, reopening without changing responses, and withdrawal.
They check actual response bodies, page errors and horizontal overflow. Startup
hydration and long-member-name phone overflow were found, fixed and rerun.

The database tests compare persisted invitations and audit records after stale,
closed, concurrent and wrong-child requests. Only one concurrent response at
the same fling revision succeeds. Reinviting preserves a current answer;
withdrawn members must accept again after reinvitation. No new schema migration,
hosted authentication, real recipient sending or production activation occurred.

This does **not** complete Phase 2. Creating/editing flings, activities and events,
ordering, draft/cancellation UI, organizer profile/assignment controls, explicit
DST ambiguity resolution and full interface construction of the three fixtures
remain. T5 checks involving polls, payments and message handoffs wait for those
capabilities. The earlier dependency audit remains unresolved before hosting.
