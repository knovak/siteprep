# Hosted event end-time validation — October 6, 2026 (UTC)

## Environment and scope

Ran ten T4/T12 interface checks on the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), using the native
owner account in the Codex in-app browser on macOS. The Sites read API reported
an active Site, latest saved version 15 and public access-policy revision 2.
No deployment or access settings changed. The repository baseline was
`f1d1fe116324bba9b65c259d9114c4cec7c94d6f`; its latest app-source change was
`fcd06001e723dedb3de366183078e98efb7ec2bd` (PR #561).

Used the existing fictional gathering
`3218f900-da12-46e1-b74f-4768793e48dd`, activity “Fictional movie and meal”.
Each width began with a new unsaved event titled
`HOSTED_END_TIME_CHECK_DO_NOT_SAVE_20261006`, with zone `America/Los_Angeles`.
All Save attempts used invalid time combinations. No valid event was submitted.
Collection finished at approximately 02:08 UTC.

## Results

All five cases passed at each width: 1280 × 720 and 390 × 844 CSS pixels.
These are browser viewport tests, not physical-phone results.

| Case | Local start | Local end | Observed result at both widths |
| --- | --- | --- | --- |
| End before start | 2027-01-15 18:00 | 2027-01-15 17:00 | “The end must be after the start.” Draft stayed open. |
| End equals start | 2027-01-15 18:00 | 2027-01-15 18:00 | Same ordering error; draft stayed open. |
| End in spring gap | 2027-03-14 01:30 | 2027-03-14 02:30 | “That local time does not exist in this zone. Choose another time.” |
| Repeated end without an occurrence | 2026-11-01 00:30 | 2026-11-01 01:30 | Required end-occurrence selector received focus and displayed “Please select an item in the list.” |
| Later wall time, earlier instant | 2026-11-01 01:30, UTC−08:00 | 2026-11-01 01:45, UTC−07:00 | Ordering error: selected end 08:45Z precedes selected start 09:30Z. |

For the repeated 01:30 end, the choices were UTC−07:00 with
`2026-11-01T08:30:00.000Z`, and UTC−08:00 with
`2026-11-01T09:30:00.000Z`. This establishes that start and end occurrences
are selected separately and ordering follows their instants, not just their
displayed wall times. It does not establish a successful end-time save or
round trip; those were deliberately outside this rejection-only run.

After each width, Cancel editing returned focus to Add event to Fictional movie
and meal. In the final phone error state, document scroll width and client width
were both 375 pixels, with `innerWidth` 390. After resetting the viewport and
reloading, the gathering still showed only “Fictional screening” at its original
2026-11-01 01:30 time and zone; the draft marker and editor were absent.
No message, export, member change or deletion was initiated.

## Method and limits

Open Add event, populate the title and native datetime controls, then activate
Save event for each row. For the final row, explicitly select the two offsets
shown above. Read the resulting alert or native validity message, and cancel
the draft after the width's cases. Native set-value operations populated the
datetime controls; DOM reads confirmed their values, selected instants and
the resulting messages. Accessibility snapshots confirmed focus and controls.

These are hosted browser-interface observations. The checked source in
`work/app/components/gathering-editor.tsx` resolves times and rejects invalid
ordering before calling its save function; native required-field validation
blocks the missing occurrence. Therefore these results do **not** prove a
Worker rejection, database rollback, direct-API validation or absence of every
possible storage side effect. The persistence observation is the reloaded UI,
not a database or export comparison. No application code changed.

The owner initially reached the ordinary ChatGPT sign-in account chooser.
The first selection returned a platform “400 Invalid content type” route error.
Try again led through an automatic security-verification page, which cleared
without interaction; selecting the same existing account then succeeded.
No challenge was solved or bypassed. The organizer list and final reload both
retained the owner session. This single recovered attempt does not establish a
Flings defect or general sign-in reliability.

A preliminary magnification shortcut produced no measured viewport or pixel-ratio
change, so no zoom result is claimed. Browser timing APIs were unavailable in the
read-only inspection surface, so no latency result is claimed. The temporary
viewport was reset and the browser tab closed.

## Remaining acceptance

`verify-hosted-test` stays actionable and Phase 6 remains incomplete. Remaining
work includes successful end-time round trips, the full hosted T1–T12 matrix,
independent second-organizer access, browser/accessibility and text-zoom checks,
simultaneous hosted writes, expiry/rollback, managed restart/migration recovery,
and provider backup retention/deletion. The authorized pilot remains a later
phase. No production release is implied.
