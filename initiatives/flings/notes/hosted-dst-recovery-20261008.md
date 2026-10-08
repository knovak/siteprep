# Hosted DST backup recovery — October 8, 2026 (UTC)

## Scope and environment

Continued T4/T11/T12 on the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), using the native
owner session in the Codex in-app browser. Baseline:
`6336365cfbeb1e9938fc2c23c8abb8f1cc06f2d8`. The Sites connector confirmed version
16 and public access; neither was changed. This is application JSON recovery,
not managed-provider database recovery or completion of Phase 6.

The source was the existing fictional October 6 repeated-hour gathering
`7149a04f-4100-4d26-8db4-de35042a7e85`, including the fictional member and accepted
invitation added in the preceding receipt. Downloaded the original, retained it,
and edited a separate copy: gathering title, event title and member name only.
The UTC timestamps and zone were preserved.

## Hosted observations

| Check | Result |
| --- | --- |
| Invalid edited copy | Setting the end to `2026-11-01T08:15:00.000Z` produced exactly one issue at `/records/events/0/ends`: “End must be a real UTC timestamp after the start.” No restore preview was offered. |
| Valid edited copy | Hosted validation accepted 21 records in 22 collections, including the real repeated-hour interval from `08:30Z` to `09:15Z`. |
| Organizer mapping | Explicitly chose History only for the exported organizer. The preview retained the current importer as the sole active organizer and kept historical attribution separate. Confirmation was disabled until the acknowledgement was checked. |
| Separate restore | One confirmation created `71a5d09b-6854-4e9e-9053-98a4c15dd2e5`, titled “Hosted DST backup restore — fictional — 2026-10-08”. The fixture remains available for review. |
| Event and profile edits | The restored organizer view and member preview displayed the edited event title and member name. The invitation remained accepted; the preview said “You’re going” and its profile controls were disabled. |
| DST display | Organizer and preview retained `01:30 (UTC−07:00) – 01:15 (UTC−08:00)` in `America/Los_Angeles`. The exported instants establish a 45-minute interval. |
| Message isolation | The original unapproved review became imported history with its unfinished handoff canceled. The view showed zero sent, failed or suppressed, one unknown, and no personal links or continuation controls in that imported batch. No messages were approved, exported for sending or sent. |

## Snapshot and database comparisons

Fresh downloads before and after restoration have identical source `records`
and `counts` across every collection. The export timestamp differs, as expected;
the source business records, including audit history, did not change.

The restored export contains 23 records. Its two extra records are the new
restore audit entry and the separate importing organizer alongside the
historical organizer. Assertions against the downloaded files confirmed:

- Fresh IDs in every restored collection carrying IDs, except the existing
  live importer identity; one active assignment still names that importer.
- One restored gathering scope and correct event/activity and accepted
  invitation/member/activity references.
- Exact preservation of `2026-11-01T08:30:00.000Z`,
  `2026-11-01T09:15:00.000Z` and `America/Los_Angeles`.
- Only the reviewed 22 export collections and their allowed columns; no live
  member-link patterns in any of the three downloaded exports.

Read-only Sites inspection of the actual `DB` binding exhausted each table's
returned pagination: four code rows, five session rows and three recovery-import
rows. None of the codes or sessions belonged to the restored gathering; exactly
one recovery-import row did. Raw authentication rows were not written to the
receipt. This establishes credential exclusion for this fixture, without issuing
a new link or testing subsequent member login.

The [structured receipt](hosted-dst-recovery-20261008.json) records export
timestamps, SHA-256 hashes, counts and assertions without contacts, account IDs,
codes or message bodies. Account-bearing backups remain local in Downloads;
edited copies remain in the automation directory and are not committed.

## Evidence limits and remaining work

Native browser screenshots were captured and inspected at
`screenshots/flings-dst-recovery-20261008.jpg` and
`screenshots/flings-dst-recovery-event-20261008.jpg` in the primary checkout.
The first download-event wait timed out after the download succeeded; the actual
file was inspected before continuing. Later downloads used the visible Save
JSON file link and were verified locally. A stale accessibility-node scroll
failed; Page Down produced the second screenshot. No form was resubmitted as a
result of those observation failures, and the temporary tab was closed.

This receipt covers one owner account, one browser and one fictional recovery
fixture. It does not establish concurrent-export consistency, duplicate-confirm
races, injected restore rollback, screen-reader/text-zoom behavior, another
organizer's access, a signed-out member journey, or provider backup/deletion
behavior. No application source changed and no redeployment was needed.
`verify-hosted-test` stays actionable; the remaining Phase 6 matrix, provider
recovery facts and later authorized pilot remain open.
