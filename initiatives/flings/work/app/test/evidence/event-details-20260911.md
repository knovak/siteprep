# Event details evidence — September 11, 2026

This bounded Phase 2 increment starts from main `26ac277babaae0a721283cf15187a78114816b48`.
It leaves `build-member-journeys` open. All data is fictional and local; no hosted
identity, Site, production release or real message sending was activated.

## Results

- 29 real-D1/domain/HTTP/time tests pass. New cases cover default-zone settings,
  unchanged existing event instants, end-time gaps/repeated offsets and ordering,
  invalid/credential-bearing location links, atomic rejection and all invitation
  state projections. They verify member/preview parity and absence of private
  location fields after decline, withdrawal or cancellation.
- Six event-detail browser journeys pass at 1280×900 and 390×900 in Chromium,
  Firefox and WebKit. They use the forms to create independent fictional flings,
  set a description/default zone, save and edit an ambiguous end time, reject
  invalid ends, and inspect invitation/accepted/preview/declined views.
- A viewer in Asia/Tokyo sees both endpoints and the update time in the event's
  America/Los_Angeles zone. Changing the fling default to Europe/London leaves
  that existing event unchanged. Participant links use a no-referrer policy.
- The existing six access, 18 invitation/closure and six authoring journeys also
  pass. Together the receipts cover 36 browser journeys; runtime/browser versions
  and actual run times are in the four JSON receipts in this directory.
- TypeScript, lint and the pinned application build pass. Migration `0003` adds
  columns without rebuilding tables or rewriting existing event instants/zones.
  Existing end/update times are NULL; optional location fields start empty.

The first regression attempt encountered the old suite's exact fixture-count
assumption after the new suite created six flings. Only this run's temporary
local database was cleared. The invitation/closure and authoring suites then
passed with fresh fixtures. To reproduce all suites in one database, run access,
then invitation/closure, then authoring, then event-details; authoring suites
intentionally add independent flings. Do not clear an operator's existing data.

## Limits

This does not finish the independent-gathering T1/T3/T4 acceptance matrix or
organizer profile/assignment controls. T5 poll/payment/message closure checks
belong to their later implementations. Optional ends represent an unknown
end when absent; no duration is invented for older records. Existing event text
remains in its original summary/details fields until edited.

Hosting prerequisites and the pre-existing dependency advisories remain open
for Phase 6. These local checks establish neither hosted authentication nor
outside-member access, pilot receipt, screen-reader acceptance or production
readiness. Screenshots are fictional member views taken after the final root
build with the repository screenshot command.
