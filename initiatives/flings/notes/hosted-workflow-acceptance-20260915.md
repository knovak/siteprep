# Hosted organizer and edited-backup acceptance — September 15, 2026

## Environment and scope

Observed against <https://flings-test.ken-novak.chatgpt.site>, saved version 9,
using the actual signed-in Ken account in the Codex in-app browser on macOS.
Application source is the native-identity implementation merged as `ac02f5bd2`
(PR #535); the deployed app tree is unchanged. This is a browser-operated hosted
receipt, not a replay of the local dispatcher simulation.

The Sites connector independently confirmed access policy revision 1: custom
access, one allowed user, zero external visitors and zero groups. No audience,
runtime, credentials or deployment settings changed. All newly entered member,
activity and event data is fictional; the sole member address is in
`example.invalid`. No message was prepared, copied or sent.

## Actual hosted observations

| Area | Action and observed result | Limit |
| --- | --- | --- |
| T1 / T3 | Created an isolated gathering and Avery Fictional through the native organizer workspace. The final organizer's Remove button was disabled. | One actual organizer; no second-account race. |
| T3 / T4 | Created a draft activity with a distinctive private-detail marker. Avery's read-only preview showed zero activities and disabled profile fields. After publishing and inviting, preview showed one activity and its event, with no private-detail marker and no acceptance/profile mutation controls. | DOM observations; no raw response interception or actual member session. |
| T4 | The America/Los_Angeles spring gap `2027-03-14T02:30` was rejected. The repeated time `2026-11-01T01:30` required a choice between UTC−07:00 and UTC−08:00. Selected UTC−08:00; the saved editor and preview retained the local time and zone. The downloaded export contains `2026-11-01T09:30:00.000Z`. | One event and zone, not the full three-fixture matrix. |
| T5 | Left an event edit open in a second tab, closed the gathering in the first, then submitted the stale edit. The app rejected it and offered Reload workspace. A later export contains the original event title and no `STALE_EDIT_MUST_NOT_SAVE` text. | A stale write after closure, not a simultaneous transaction race or injected SQL failure. |
| T5 | Closed-state coordination/message creation disappeared; event editing was disabled. Correcting the member name still saved. Reopening preserved the invitation and event, and did not create message records. | No approved handoff, active poll or balance in this fixture. |
| T11 | Downloaded the actual hosted JSON: 16 records, 6,479 bytes, 22 collections. Kept the original; changed only gathering title, event title and member name in a copy. A separate copy with schema version 999 was rejected at `/schema_version`. | Small fixture, with empty poll/payment/message collections. |
| T11 | Validated the edited copy; explicitly chose History only for the exported organizer label. The proposed access list retained only the importing Ken account. Keyboard confirmation created a separate gathering with the edited names. | Does not prove deletion, injected rollback or provider database recovery. |
| T11 | Downloaded the source again and the restored copy. Canonical source business records were identical before/after restore. Fling/activity/event/member IDs were fresh; invitation and event relationships pointed to the new IDs. The restored copy has 18 records: imported history plus its new account/restore bookkeeping. | Original-export timestamps differ, as expected; comparison covers `records`. |
| T11 | Read-only inspection of every available row in the hosted `codes` and `sessions` tables found no row belonging to either new gathering; one `recovery_imports` row matched the restore. Exports contain no authentication collections and no message batches, deliveries or reports. | No member code was issued in this journey; populated-history recovery remains separate acceptance work. |

Actions used labeled fields and keyboard activation for save, preview, closure,
reopening and restore confirmation. This is limited keyboard evidence, not a
complete keyboard-navigation audit or a screen-reader walkthrough. The browser
control's datetime `fill` did not populate the native field; using its native
set-value operation did. This control issue is not recorded as an app failure.

## Integrity receipts and retained fixtures

Source gathering: `3218f900-da12-46e1-b74f-4768793e48dd`.
Restored gathering: `194fd4b8-54a4-44fe-b957-ab3c9fd03f38`.
Both remain as private fictional test fixtures; the earlier native-sign-in
acceptance gathering and all unrelated records were preserved.

Original file SHA-256:
`2abde15a9a3886ff37ffc4bc5862b221d47e223c26a40abf469bef9e0e05be10`.
The original and second source export share canonical `records` SHA-256
`ae381f70f2f7d0f5d7f354ffba8032e27b2017787e2762b1af2b07321672f71e`.
Restored canonical `records` SHA-256:
`4cca6743ed41eae00dbcb6eaf91c73b41651f126af60460892f5e85a2b7d052c`.
Canonicalization is Python `json.dumps(records, sort_keys=True, separators=(',', ':'))`,
encoded as UTF-8. Download timestamps are 16:06:06.155Z, 16:07:52.800Z and
16:07:56.159Z. Files remain in the local Downloads folder; account-bearing
exports are not committed as repository fixtures.

## What remains

`verify-hosted-test` stays actionable. These observations close the named
journeys only, not whole T1–T12 groups or Phase 6. Next agent work includes
interruption/retry behavior, broader accessibility and browser coverage, and
populated hosted coordination/message-history recovery. Actual Lucas sign-in,
independent screen-reader use, code-expiry/transaction failure at the managed
Worker, server/migration recovery and provider backup retention/deletion still
need their own evidence. The existing backup review remains authoritative about
what the available hosting tools do not establish. Real member access, real
sending, the pilot and production remain under their recorded prerequisites.

## Local interruption finding and correction

While the hosted receipt's PR was waiting for CI, a local real-UI/real-D1 probe
found that an initial status-network failure produced a blank workspace with no
retry, and a focus recheck failure left one stale gathering link visible while
Reload workspace was disabled. The organizer page now clears unverifiable
account/record state, always exits loading and permits an explicit retry. Six
Chromium/Firefox/WebKit desktop/phone regression journeys pass with injected
network, HTTP 503, invalid-JSON and invalid-shape failures, plus retry and identity
switching. This correction changes the app after the version-9 observations
above; its test deployment and subsequent smoke check are recorded separately.

## Corrected test deployment and smoke check

Application commit `4a71e7951` passed TypeScript, lint, all 176 app tests, the
Sites app build and all six interruption/recovery browser journeys against that
compiled build. All 235 tracked app files matched Sites source commit
`28353120b5d53f4d068e7f1c516da0ef4932673f` byte-for-byte. Saved version 10 contains
113 packaged files and 2,949,120 bytes. Deployment
`appgdep_6aa96fd869408191848e7f6154575d32` succeeded at
**2026-09-15T16:18:44.310649Z**, using existing runtime revision 2 and the same
private test URL. No sharing or runtime changes were requested.

After deployment the actual Ken session reloaded the restored gathering and
returned to the workspace successfully, retaining both fictional fixtures.
A requested 390×844 browser viewport reported 325 CSS pixels of inner width
and 312 pixels of document width, with no horizontal overflow or alert. This
is one narrow-browser smoke check, not a physical-phone or full accessibility
acceptance result. The temporary viewport override was reset.
