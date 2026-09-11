# Gathering authoring evidence — September 11, 2026

This extends Phase 2 from base `1fe5593cd`; it does not complete that phase.
Runtime and browser versions are in `authoring-20260911.json`. The pinned
application build, TypeScript and lint checks pass.

- 26 domain/HTTP/time tests pass. The new cases cover atomic initial assignment,
  cross-fling and role denial, stale/closed writes, racing revisions, complete
  activity ordering, draft/cancellation projections, timezone gaps, repeated
  times, half-hour transitions, non-hour offsets and a skipped date.
- Six fresh browser rehearsals (three engines, two sizes) each build five
  activities and seven events covering the movie/meal, wedding-weekend and
  multi-month concert shapes. They use the forms and actual local database.
- Repeated-time edits round-trip the selected offset, and a Tokyo-zone viewer
  still sees the event's own zone. Invalid times leave stored events unchanged.
- Acceptance reveals private detail; cancellation hides it in both the member
  page and returned data. Uninvited drafts remain absent.
- A focus refresh keeps the open draft. A competing save advances the revision;
  attempting to save the old draft fails and leaves the activity unchanged.
- No browser errors or horizontal overflow occurred in the successful run.

The initial new browser checks exposed a focus/click race and an inadequate
success assertion. The final test requires the saved notice and persisted
outcome, and the interface preserves drafts with their original revision.
All six engines/size combinations were rerun after that fix.

The existing six access journeys and 18 invitation/closure journeys are
separately recorded in `browser.json` and `phase-2-journeys.json`. The final
regression run uses a fresh local fixture database. No real contacts,
capabilities, cookies or server secrets are in these receipts.

Remaining: organizer profile and assignment UI; event end/location fields;
fling description/default zone; the full independent-gathering T1/T3/T4 matrix.
Later-phase poll/payment/message closure cases, hosted identity, dependency
refresh and pilot findings remain outside this increment.

Final regression result: the six existing access and 18 invitation/closure
journeys passed after the focus fix against fresh fixtures. Together with the
six new authoring journeys, all 30 browser journeys pass on the final source.
