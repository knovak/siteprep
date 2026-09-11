# Organizer profile and assignment evidence — September 11, 2026

This bounded Phase 2 increment starts from main `37bea62f261630c0e6150f361721011586ecdba3`.
It leaves `build-member-journeys` open. All data is fictional and local; no hosted
identity, Site, production release or real message sending was activated.

## Results

- 33 real-D1/domain/HTTP/time tests pass (4 new cases). New cases cover an
  unknown or already-assigned organizer id, that assignment success is atomic
  with an audit event, an organizer editing only their own display name, and
  the overview's organizer list order and last-organizer HTTP refusal.
- Two organizer-assignment browser journeys pass at 1280x900 and 390x900,
  **in Chromium only**. They create an independent fictional fling, rename the
  organizer, reject an unknown organizer id (which resets the workspace view
  like every other guarded precondition in this app), add two co-organizers,
  remove them again, and confirm the interface disables self-removal for a
  sole organizer while the server refuses the same removal called directly.
- TypeScript, lint and the pinned application build pass.

## Limits

**Firefox and WebKit were not run.** Every earlier Phase 1/2 browser receipt in
this directory covers all three engines; this build environment provisions
Chromium only (`npm run setup:browsers` installs Chromium, and Firefox/WebKit
binaries are absent here). Re-run `test/assignments-browser.mjs` with those two
engines installed before counting this toward the plan's final T1/T3/T4
independent-gathering interface matrix, which remains open along with organizer
profile/assignment work for the two other gathering fixtures (the movie/dinner
outing and the concert series). T5 poll/payment/message closure checks belong
to their later implementations.

Organizer identity here is the local fictional roster (Casey/Rowan/Sam) seeded
by `lib/fixtures.ts`; assignment still requires an existing `organizers` row; a
real deployment's organizer directory and how a new organizer's row is created
from managed OIDC identity remain Phase 6 prerequisites, unchanged by this
increment. Hosting prerequisites and the pre-existing dependency advisories
remain open for Phase 6.
