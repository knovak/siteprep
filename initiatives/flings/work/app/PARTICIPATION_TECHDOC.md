# Activity participation

## Contract

Existing and new activities default to unlimited participation. **Manage
participation** on an activity configures a positive member limit, a selected
member list, optional cascading invitations, a timeout in elapsed minutes, and
whether a timed-out invitation may still be accepted while space remains.
Capacity counts active members with an accepted activity invitation. Organizers
count only when they have a member profile and accept its invitation.

A simultaneous invitation goes to every selected member; confirmation claims a
place. At capacity, other invitees retain the summary and see **Closed — all
places have been filled**, with acceptance disabled. The protected response
transaction also checks the current accepted count, so competing or stale
requests cannot exceed capacity. A confirmed member declining frees a place.

Cascading invitations use the selected member order. The service opens enough
invitations to cover capacity minus confirmed and currently invited active
members. Each decline, withdrawal, removal or timeout can open the next eligible
invitation. Members still waiting have no invitation record or activity access.
Reordering affects waiting members; already open invitations and existing
answers are preserved. Switching an activity with existing invitations to
cascading mode does not recall those invitations. Individual invitation controls
cannot bypass the configured cascade; withdrawing also removes that member from
the stored order. Selecting them again permits a fresh invitation.

Unselecting a member withdraws their invitation. Confirmed members cannot be
unselected or squeezed below capacity. Setting a limit with no selected members
is allowed. Drafts retain selection without opening invitations until published;
cancelled activities and closed gatherings stop cascade advancement. Reopening
settles deadlines against elapsed time, including time spent closed.

## Storage and transactions

Migration `0011_cloudy_freak.sql` adds nullable `activities.capacity`, nullable
`timeout_minutes`, integer `cascading`/`allow_late` flags, and a JSON
`invitation_order` array. Invitations gain `invited_at` and `timed_out`. Defaults
preserve existing unlimited activities and their responses.

`JourneyStore.author(..., 'participation', ...)` validates the complete list,
member ownership, capacity, timeout and booleans. Current assignment, open
fling, captured revision, confirmed selection and minimum capacity are checked
inside the same D1 transaction as policy/roster edits and the audit record.
Old unanswered invitations without a timestamp receive the current time when
participation is configured. Later policy edits preserve their invitation time.

`participationSteps()` expires unanswered invitations exactly at
`invited_at + timeout_minutes * 60,000`, marking them declined with
`timed_out=1` and advancing their invitation generation. It then inserts the
next invitations in order with fresh timestamps, using window ranks and the
current accepted/pending count. Already declined members are not reoffered
invitations automatically. Explicit decline cannot clear a strict timeout.
Late acceptance competes with replacement invitees for the same remaining place.

`AccessStore.batch()` first settles these clock-driven transitions in a separate
current-authority transaction, before checking a submitted form revision. A
stale form may fail while the elapsed-time transition remains committed. The
main batch rechecks authority and also reconciles after its own writes, making
queue advancement atomic with a decline or withdrawal. Reconciliation increments
the fling revision only when it changes invitations. Result slicing retains the
original caller-statement indexes.

The authoritative clock runs on requests. Open organizer/member pages refresh
every 15 seconds while visible; any subsequent authorized request settles due
timeouts before using the invitation state. No background scheduler is required:
when nobody has the app open, the transition is materialized on the next visit.
This advances invitations inside Flings. Outbound email/text delivery continues
through the existing separately approved messaging workflow.

## Backup compatibility

Version-1 recovery files include these new fields as optional extensions. Old
files restore to unlimited participation, no timeout and an empty invitation
order. Exports decode order JSON to an array; restore remaps every ordered
member ID to the new gathering. Validation checks the roster, unique order,
policy ranges and capacity against confirmed active members. The schema walker
also handles the new `maximum` and `uniqueItems` keywords.

## Verification

- `npm test`: real Miniflare D1 tests, including final-place concurrency,
  strict/late timeout boundaries, queue order, cancellation, withdrawal,
  closure/reopening, removed members, draft publication, invalid rosters,
  unauthorized access, export and fresh-ID restore.
- `npm run typecheck` and `npm run build`.
- `node test/participation-browser.mjs` against `npm run dev:local`: Chromium,
  Firefox and WebKit at 1280 and 390 pixels, using fictional organizer/member
  journeys through the actual HTTP routes and UI. Receipt:
  `test/evidence/participation-20261112.json`.

These local checks do not complete the initiative's independent-organizer or
managed-host recovery acceptance work.

November 12 local result: all 191 application tests pass, including 14 new
participation cases, and TypeScript/application build checks pass. Chromium and
WebKit pass all four desktop/phone journeys, including preservation of an
unsaved profile through an availability poll. Firefox cannot launch on this
machine (headless compositor/sandbox startup failure), so its participation UI
coverage remains unverified and is recorded as unavailable in the receipt.
