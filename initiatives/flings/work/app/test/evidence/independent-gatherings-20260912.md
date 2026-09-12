# Phase 2 independent-gathering acceptance — September 12, 2026 (UTC)

Tested the working tree based on `5458264b30e3fc73e1d7714d8ce5cdad6f18d21f`. The implementation,
test scripts and receipts travel in the same PR. Data is fictional and local.
No Site, hosted identity, real recipient message or production release was created.

## Fixes established by acceptance

- Adding a co-organizer previously sent `confirm: true` immediately from the
  form. It now names the entered organizer ID and explains full organizer
  access in a separate confirmation. Cancelling does not grant access.
- Organizers previously had a create-member form and their own display-name
  editor, but no member-profile correction form. They can now correct the four
  membership fields through the existing authorized endpoint, including while
  the fling is closed. The opening revision survives focus refresh; an
  intervening member edit rejects a stale organizer save without overwriting it.

## New acceptance evidence

- `independent-gatherings-20260912.json`: 18 complete gathering journeys in
  Chromium, Firefox and WebKit, at 1280x900 and 390x900 with a Tokyo viewer.
  Each engine/size pair creates three different flings through forms: one
  movie-and-meal activity, three separately invited wedding activities, and
  concerts almost two months apart. Times, ends and private locations differ.
- Each gathering checks organizer additions and removals, member-profile
  editing and cancellation, invited/accepted/declined/withdrawn/draft/cancelled
  member and preview responses, preview write denial, closure, member and
  organizer contact corrections while closed, and reopening without changing
  invitation responses. Phone layouts include the new profile editor.
- Across those flings, one browser retains three separate member sessions;
  matching initial contacts remain independent. Casey organizes the outing
  and wedding and is only a member of Sam's concerts. Rowan removes Casey's
  wedding assignment: the stale editor fails while Casey's outing assignment
  and concert membership remain usable. Cross-fling child substitution and
  unauthorized reads fail without changing the authorized snapshot.
- `assignments-20260912.json`: six assignment journeys, including Firefox and
  WebKit which were missing from the September 11 receipt. The suite checks
  unchanged server assignments before confirmation and after cancellation,
  keyboard confirmation, unknown IDs and final-organizer protection.

The unchanged backend/time suite passes 33 tests against real local D1. The
application build, TypeScript and lint pass. Runtime: v23.11.0, darwin 25.6.0.
Browser versions and run timestamps are recorded in the JSON receipts.

## Regression results

A fresh local database was used for the existing suites: six access/session,
18 seeded invitation/closure, six authoring/DST and six event-details journeys
all pass on the final application. `phase-2-regressions-20260912.json` keeps
these 36 current results together without overwriting the earlier receipts.
Together with 18 independent-gathering and six assignment journeys, the run
passes 60 browser journeys. The previous Chromium-only limitation is closed.

Commands: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
then the six `test/*browser.mjs` scripts documented in the application README.
The root repository build and scope check are recorded in the PR.

## Evidence limits

These are automated local interface, HTTP and database observations. They are
not independent human acceptance or proof of hosted identity, outside-member
access, production security, real sending or receipt. T5 poll/payment/message
closure checks remain with Phases 3/4; Phase 6/7 retain hosted and human checks.
The existing dependency advisories remain a pre-hosting task.

## Tested source hashes (SHA-256)

- `work/app/components/organizer-page.tsx`: `0451a48dbc3262f27681d73ed9f0bf88a6719a799c8e8472b00c4e69bbad1a2b`
- `work/app/test/assignments-browser.mjs`: `760665ac87dae89db4ab5e8ca2476833bcbdce9503a247696ca272b5e225f67e`
- `work/app/test/independent-gatherings-browser.mjs`: `9c7e64cfed92049c881935705fa5e82a187750aa87f3be2bfc4de9843cc36344`
