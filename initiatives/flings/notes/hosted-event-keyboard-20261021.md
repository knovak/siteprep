# Hosted event-editor keyboard checks — October 21, 2026

## Scope and environment

Targeted T4/T12 acceptance on the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site),
using baseline `e521722513042b3f3e1bbd8ce26d944ae3af6dfe`.
The date is Australia/Brisbane; the structured receipt records the UTC capture
time on October 20. Live Sites metadata confirmed version 17, public access
and access-policy revision 2. No application deployment or access change was made.

The user explicitly approved native organizer sign-in and completed the
authenticator step. The organizer workspace and existing fictional gathering
then loaded successfully in the Codex in-app browser on macOS. This establishes
this owner's sign-in, not independent second-organizer access.

The fixture was `7149a04f-4100-4d26-8db4-de35042a7e85`, with event
“Fictional repeated-hour screening.” Its original local start was
November 1, 2026 at 01:30, UTC−07:00; its end was 01:15, UTC−08:00,
in `America/Los_Angeles`.

## Method and results

The [structured receipt](hosted-event-keyboard-20261021.json) contains 171
observations. Browser viewport overrides were 1280 × 800 and 430 × 932;
these are desktop-browser widths, not physical-phone tests.

At each width, Enter on the event's Edit button opened the form and focused
Event title. Only that initial button was targeted directly. Native Tab and
Shift-Tab then traversed the form without locator-based refocusing.
Each direction required 25 key presses between Event title and Cancel editing.
The form exposed 26 stops: three title/description fields, six native segments
and one picker button for each date/time input, five zone/location fields,
two offset selectors, Save event and Cancel editing.

| Check | 1280 × 800 | 430 × 932 |
| --- | --- | --- |
| Forward traversal through both date/time controls to Cancel | Pass | Pass |
| Reverse traversal from Cancel through both date/time controls to title | Pass | Pass |
| Earlier/later start and end occurrences selectable by keyboard | Pass | Pass |
| Cancel returns focus to the same event's Edit button | Pass | Pass |
| Every recorded active control intersects the viewport | 88/88 | 83/83 |
| Document client width equals scroll width throughout | 1265/1265 | 415/415 |

Both date/time inputs were traversed through all six segments and their picker
button. The parent input reports `:focus-visible` for segment focus, but not
while its internal picker button has focus. Accessibility snapshots identify
that picker focus, and screenshots show the native blue outline on the start
picker at both widths. The parent-input probe alone is insufficient to judge
an internal native control's focus appearance.

On this macOS browser, the first arrow key opens a select menu. A further
arrow highlights an option; Return commits it to the unsaved form. An initial
Shift-Tab while the end menu was open closed the menu and retained focus there.
These transitions are retained in the receipt, including the difference
between the highlighted accessibility value and the uncommitted DOM value.
After accounting for this native behavior, both selectors changed to their
alternate occurrence and back at both widths:

- Start: `2026-11-01T08:30:00.000Z` → `2026-11-01T09:30:00.000Z` → original.
- End: `2026-11-01T09:15:00.000Z` → `2026-11-01T08:15:00.000Z` → original.

Save event was reached but never activated. After reversing to title, another
25 Tab presses reached Cancel; Return closed the draft and returned focus to
the same event's Edit button at each width. The event summary retained the
original local times, UTC offsets and zone after cancellation and page reload.
No database before/after comparison was performed.

## Evidence and limits

Read-only DOM probes recorded active-control identity, labels, values, focus
styles, bounding rectangles and document/viewport dimensions. Native
accessibility snapshots identified the individual date/time segment and picker
stops. The geometry check establishes viewport intersection, not full-control
visibility, occlusion, contrast or screen-reader correctness.

Screenshots inspected during the run are retained locally under `screenshots/`:
`flings-keyboard-desktop-20261021.png`,
`flings-keyboard-phone-20261021.png`,
`flings-keyboard-offsets-phone-20261021.png` and
`flings-keyboard-cancel-phone-20261021.png`.
They show native picker focus, offset controls and cancellation return focus.
They are not required to interpret the structured receipt.

This closes the specific sequential event-editor gap left by the October 9
zoom receipt. It does not establish all application keyboard paths, open
calendar-picker interaction, date/time editing, saved mutations, error states,
physical-device touch behavior, other browser engines, text-only zoom,
automated accessibility or screen-reader acceptance. Independent organizer
identity, signed-out discussion/poll/payment writes, multiple memberships,
expiry/revocation, concurrency/rollback, managed-host recovery and retention
remain outside this check.

The viewport override was reset and the temporary tab closed. No business form
was submitted, no message was sent, and no publication, organizer assignment,
restore, deletion or access change was made. Ordinary sign-in and reads may
create host/application audit records. `verify-hosted-test` and Phase 6 remain
open. Only documentation and sanitized evidence change.
