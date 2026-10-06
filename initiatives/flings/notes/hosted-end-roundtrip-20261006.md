# Hosted end-time persistence — October 6, 2026 (UTC)

## Environment and scope

Continued T4/T12 acceptance on the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), using the native
owner session in the Codex in-app browser on macOS 26.6.2 (25G83). The Sites
read API reported active status, latest saved version 15, public audience and
access-policy revision 2. No source deployment or audience change occurred.
The repository baseline was `e9ad182aa56667aeb72489e6b34427a6e28ac163`;
the latest app-source commit was `fcd06001e723dedb3de366183078e98efb7ec2bd`.
Evidence collection finished at 10:21 UTC. Browser build information was not
exposed by the observation surface, so no engine-version claim is made.

Created one separate fictional gathering, “Hosted end-time round trip —
fictional — 2026-10-06” (`7149a04f-4100-4d26-8db4-de35042a7e85`), with draft
activity “Fictional repeated-hour rehearsal” and event “Fictional repeated-hour
screening” (`724d082c-dc01-4df1-8a1d-acbfe4912fd8`). No member, invitation,
message, payment, export or deletion action was initiated. The fixture remains
available for review; the activity remains a draft.

This completes the successful-save gap identified by
`hosted-end-times-20261006.md` for these particular inputs. It is an increment
within `verify-hosted-test`, not completion of the full Phase 6 item.

## Results

The start remained `2026-11-01 01:30`, first occurrence UTC−07:00, in
`America/Los_Angeles`: `2026-11-01T08:30:00.000Z`.

| Action | Viewport | End input and choice | Stored end | Result |
| --- | --- | --- | --- | --- |
| Create event | 1280 × 720 | 01:15, second occurrence UTC−08:00 | `2026-11-01T09:15:00.000Z` | Saved a 45-minute interval although the end wall time is earlier; reload and Edit retained both offsets. |
| Reject an edit | 1280 × 720 | 01:15, first occurrence UTC−07:00 | Unchanged at `09:15Z` | “The end must be after the start.” All ten event rows, including the fixture, remained exactly unchanged. Cancel and reopen retained the valid choice. |
| Edit end | 390 × 844 | 01:45, first occurrence UTC−07:00 | `2026-11-01T08:45:00.000Z` | Saved a 15-minute interval. Reload and Edit retained 01:45 and its selected occurrence. |
| Remove optional end | 390 × 844 | Empty | `null` | Reload and Edit showed an empty end and no end-occurrence selector; the start and zone remained unchanged. |
| Restore original end | 390 × 844 | 01:15, second occurrence UTC−08:00 | `2026-11-01T09:15:00.000Z` | Saved again. After resetting to desktop and reloading, Edit retained both original selected instants. |

Every database read included all event columns, with zero omitted/truncated
rows or values and no next page. The baseline had nine events; every later read
had those same nine unchanged rows and exactly one new fixture event. The
redacted [structured receipt](hosted-end-roundtrip-20261006.json) retains only
the new fictional row, comparison results and pagination metadata. All four
successful saves kept the same event, activity and gathering identifiers.

## Method and observation limits

Used the organizer interface to create the gathering, draft activity and event.
Native set-value operations populated datetime controls, and the visible offset
options were selected explicitly. After each successful state, a fresh page load
and Edit checked the form values; the independent read-only Sites database
connector checked stored UTC instants, the IANA zone and baseline preservation.
These are hosted persistence observations, not just client validation results.
The rejected edit is still client-side rejection evidence, not a direct Worker
validation or database transaction rollback test.

At phone width after end removal, document scroll/client widths were both 375
pixels with `innerWidth` 390. This is a viewport check, not a physical-phone,
cross-engine or comprehensive accessibility result.

The read-only event summary displays local start/end wall times and the IANA
zone without offsets: `01:30 – 01:15 · America/Los_Angeles`. The editor exposes
the two distinct offsets and UTC instants correctly, but the summary alone
does not explain why this interval is valid. Read-only DST display clarity
remains a T4 usability follow-up; the persistence pass does not settle it.

A short locator wait after the first save expired before the refreshed page
appeared. The subsequent page state and database read confirmed the single
save; it was not resubmitted. During final restoration, a Playwright fill
changed the date control's visible value without rendering its occurrence
selector. No save was attempted in that state. Native date-control changes
rendered the selector, after which the explicit selection/save/reload passed.
That excluded control-method attempt is not counted as a product failure or a
successful save. No latency estimate is inferred from these automation waits.

The final screenshot records the saved offsets in the reopened editor at
`screenshots/flings-hosted-end-roundtrip-20261006.jpg` (local, not committed).
The editor was then cancelled, the temporary viewport reset and the tab closed.

## Remaining acceptance

`verify-hosted-test` stays actionable and the stage remains `building`.
Independent second-organizer access, the rest of hosted T1–T12,
screen-reader/text-zoom and other browser checks, simultaneous writes,
expiry/rollback, managed restart/migration recovery and provider backup
retention/deletion remain open. This run does not authorize or complete the
real-recipient pilot, new access, sending or production release.
