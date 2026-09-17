# Member denial recovery — September 17, 2026

## Finding and correction

A real member-code exchange on the owner-private test Site exposed a T6/T12
failure: after the organizer closed the fictional gathering, a stale member
vote was rejected but the page stayed on “Opening your member page…”. Clearing
the projection unmounted the coordination panel that owned the error.
The surviving member page now retains the denial and offers **Reload member
page**. Retry requests the original membership; it cannot silently adopt a
different member session. A successful reload clears the error.

## Evidence

- `npm run typecheck` and all 176 local tests passed.
- `node test/member-recovery-browser.mjs` passed in Chromium 143, Firefox 144
  and WebKit 26 at 1280 and 390 pixels. The dated JSON receipt records six
  journeys: rejected stale vote, same-member reload, unchanged poll records,
  closed profile correction, reopening, revoked-session denial and denial
  after switching the cookie to a different fictional member.
- Source commit `cf351eea9b20f46785f497127a9742cffb49f880` built successfully;
  the 107-file artifact deployed as test version 12 at 2026-09-17 21:03:56 UTC.
  Existing owner-only access was preserved.
- On hosted version 11, the actual member session saved Tea in the fictional
  “Hosted acceptance drink” poll. A stale Water save after closure reproduced
  the stuck page; organizer totals remained Water 0 / Tea 1.
- On hosted version 12, the same stale Water save showed “Access or the record
  changed. Reload and try again.” and the reload button. Reload showed the
  closed gathering, disabled poll controls and saved Tea. Reopening and a full
  member-page reload still showed Tea. The gathering was left open.
- An authenticated gateway-bypass HTTP read reported native identity enabled
  but `signedIn: false`; gateway access alone did not create organizer identity.

## Scope and limits

All records were fictional. The member link came from a prepared, unapproved
message review; nothing was approved for sending, exported or sent. The new
poll and its one saved response remain as test evidence. Existing imported
history and the original dinner vote were preserved. No payment service was
opened and no production release or audience change occurred.

Hosted evidence uses one owner's native session and one application member
session in the in-app browser. Revocation and session-switch recovery were
verified locally, not against a second hosted identity. Independent organizer
access, the complete T1–T12 matrix, screen-reader coverage and managed-provider
backup/recovery remain open. `verify-hosted-test` is not complete.
