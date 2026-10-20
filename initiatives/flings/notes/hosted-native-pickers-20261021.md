# Hosted native date-picker checks — October 21, 2026

## Scope and environment

Continued the calendar-popup/date-editing gap explicitly excluded from the earlier [event-editor keyboard receipt](hosted-event-keyboard-20261021.md). This is targeted T4/T12 evidence on the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site), with source baseline `90ff6c45d6134701cbacb3d42af87a1591daf5a8`.

Live Sites metadata confirmed version 17, public access and policy revision 2. The existing authorized organizer session opened directly; no new sign-in or identity grant was performed. The environment was the Codex in-app browser on macOS, at 1280 × 720 and a temporary 430 × 932 viewport override. This is desktop-browser width testing, not a physical phone. The browser version was not obtained: the read-only DOM bridge does not expose `navigator`, so no engine/version coverage is claimed.

The fictional fixture was gathering `7149a04f-4100-4d26-8db4-de35042a7e85`, event “Fictional repeated-hour screening.” Its saved local times were November 1, 2026, 01:30 UTC−07:00 through 01:15 UTC−08:00, in `America/Los_Angeles`. The [structured receipt](hosted-native-pickers-20261021.json) contains 19 DOM observations plus native accessibility observations; these are observations, not 19 independent passed tests. Capture time is October 20 UTC; this document uses Australia/Brisbane's October 21 date.

## Method and findings

| Check | Desktop width | Phone width |
| --- | --- | --- |
| Open both native calendars | Pointer activation; native table focused | Nine Tabs from Event title reached the start picker; seven more reached the end picker; Return opened each |
| Change start date with Right, then Left | November 1 → November 2 → November 1; time stayed 01:30 | Same |
| Change end date with Right, then Left | November 1 → November 2 → November 1; time stayed 01:15 | Same |
| Keyboard reopen and dismiss unchanged end calendar | Return opened; Escape returned focus to its picker button | Same, with structured native-focus observations |
| Cancel the unsaved event draft | Clicked Cancel; focus returned to the event's Edit button | Nine Tabs from the end picker reached Cancel; Return cancelled and restored Edit-button focus |
| Document horizontal width | 1265 client/scroll pixels in five recorded observations | 415 client/scroll pixels in fourteen recorded observations and after reload |

Native arrow keys changed the form immediately; Return was not required to commit a date to the unsaved draft. Changing either date to November 2 removed that field's repeated-hour selector. Returning to November 1 restored it with **Choose an occurrence**, requiring a fresh explicit selection. On phone width, returning to that repeated date also closed the popup and put native focus on its picker button before the subsequent Escape. The receipt preserves this transition rather than attributing every popup closure to Escape.

After both drafts were cancelled, a phone-width page reload displayed the original summary: `2026-11-01 01:30 (UTC−07:00) – 2026-11-01 01:15 (UTC−08:00) · America/Los_Angeles`. The editor was absent. Save event was never activated, including while the occurrence choices were blank.

## Evidence limits and cleanup

Read-only DOM probes recorded the two input values, occurrence-selector values, active parent element and document widths. Native accessibility observations distinguish the internal picker button and popup table, which the DOM reports only as the parent date input. The native calendar table/cells lacked readable day labels in these snapshots; the changed DOM values corroborate date movement. A desktop screenshot captured the form but omitted the native popup, so this receipt makes no popup visual, clipping, contrast or full-control-visibility claim.

This adds native calendar entry, one-day date movement and cancellation evidence. It does not establish time-segment editing, month/year navigation, saved edits, errors, physical-device touch, other browser engines, screen-reader support or full accessibility. No database comparison was performed; saved-state preservation is limited to the summary observed after cancellation/reload. Independent organizer access, signed-out discussion/poll/payment writes, multiple memberships, expiry/revocation, concurrency/rollback, managed-host recovery and retention remain open.

The viewport override was reset and the temporary tab closed. No business form was submitted, message sent, access changed, fixture restored/deleted or application deployed. Ordinary authenticated reads may generate audit records. This is documentation and sanitized evidence only; Phase 6 and `verify-hosted-test` remain actionable.
