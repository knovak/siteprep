# Hosted populated recovery and member previews — September 16, 2026

## Environment and boundary

The scheduled sweep exercised the actual private [Flings test Site](https://flings-test.ken-novak.chatgpt.site),
version 10, through the Codex in-app browser on macOS. Repository baseline:
`ac9e385b7d4e861b9994507d48d6dce57f1bc652` (PR #536). The Sites connector
confirmed access policy revision 1, custom access, one allowed viewer and no
external visitors. The existing Ken account completed the ChatGPT account-picker
sign-in and opened its assigned organizer workspace.

Only fictional test records were added. There was no audience, runtime, source
or deployment change, no member credential issuance, no real message and no
payment-service action. The two new test gatherings remain available for review.

## Actual hosted observations

| Area | Observation | Limit |
| --- | --- | --- |
| T11 validation | Uploaded the repository's version-1 fictional example with only its gathering title changed. The hosted checker accepted 46 records across all 22 business collections. | Trusted fictional example, not arbitrary user data. |
| T1 / T11 organizer mapping | Selected History only for both exported organizers, Casey and Rowan. The preview retained only the importing Ken account as an active organizer. Confirmation stayed disabled until the acknowledgement was checked; Enter submitted the confirmed restore. | One native account; no second-account assignment race. |
| T11 populated restore | Created a separate gathering containing activities, events, invitations, discussions and edit history, a poll and vote, a payment request and two ledger entries, plus a message batch, three deliveries, report/result and selected retry history. | No injected hosted transaction failure or repeated confirmation race. |
| T6 / T7 read projections | Organizer view showed the edited discussion, Salad's one vote, the original 1000-minor-unit payment request and attributed report/confirmation with zero outstanding. | Imported records, not new hosted coordination writes or evidence of money movement. |
| T9 / T10 imported history | The discussion and batch explicitly labeled outcomes as imported history with receipt unverified. Live totals remained zero sent/failed/suppressed and three unknown. The batch had no copy/export/report/retry action and preserved attempt numbers and report history. | Historical claims remain in the backup; they do not become verified delivery outcomes. |
| T1 / T3 / T6 / T7 accepted preview | Alex's read-only preview displayed participant event details, event discussion, the selected Salad response and Alex's payment history. Profile fields and poll controls were disabled; organizer mutation controls were absent. | Organizer preview, not a member-code session or raw-response authorization audit. |
| T1 / T3 / T6 / T7 invited preview | Robin's preview displayed the whole-fling discussion and invitation summaries. Participant event details, event discussion, poll and Alex's payment request were absent; profile fields were disabled. | One invited member and one accepted member. |
| T12 narrow layout | Both populated previews were checked at a requested 390×844 viewport. Each reported 390 inner CSS pixels and 375 document/client pixels after loading, without horizontal overflow. The override was reset. | One desktop in-app browser; not physical-phone, zoom, screen-reader or complete keyboard acceptance. |
| T11 export inspection | Downloaded the restored gathering: 47 records, 22 collections, 18,892 bytes. Local assertions verified fresh identifiers, one gathering scope, 36 foreign-key references, preserved vote/payment/history values and no authentication collections. | Assertions inspect this downloaded snapshot only. |
| T11 credential exclusion | Read-only Sites database inspection exhausted the available pages of `codes` (2 rows), `sessions` (3 rows) and `recovery_imports` (2 rows): zero codes/sessions matched the restored gathering and exactly one import did. | No member link was issued in this run; this is not expiry or revocation testing. |

The export's three count differences from the input are intentional: two
historical assignments become one live importer assignment, the importer adds
one organizer, and the restore adds one audit entry (46 → 47 total records).
The original result's historical failure claim/evidence remains in the export,
while the interface excludes imported claims from current delivery totals.

## Reproducible receipt and retained fixtures

The input is `work/app/public/recovery/example-v1.json` from the baseline above,
with only `records.flings[0].title` changed to
`Hosted populated recovery — fictional — 2026-09-16`.

- Empty importing gathering: `cd1c9851-59e9-4834-aa87-4daa5d3f7593`.
- Restored gathering: `a83949b1-befc-4581-bb95-1a5b0d125ad7`.
- Export timestamp: `2026-09-16T02:05:39.993Z`.
- Export SHA-256: `b86319655dd42ae037739af221d9641d83fb06e864aa5905e4297a8249e655ee`.
- Sanitized count/assertion receipt: [hosted-populated-recovery-20260916.json](hosted-populated-recovery-20260916.json).

The account-bearing downloaded JSON remains in the local Downloads folder and
is not committed. Existing fixtures were not edited during these observations;
this run did not repeat the earlier before/after source-snapshot comparison.

## Remaining acceptance

`verify-hosted-test` remains actionable and Phase 6 remains incomplete. Remaining
work includes hosted member-session and coordination writes, concurrent mutation,
code expiry and transaction rollback, broader accessibility/browser evidence,
network/server/migration recovery and managed-host backup recovery/deletion.
Lucas's independent sign-in and an actual screen-reader walkthrough also lack
evidence. The owner-only Site does not prove login-free outside-member access.
The [backup review](host-backup-review-20260915.md) continues to distinguish
app JSON recovery from unverified managed-host database recovery. No pilot or
production acceptance is inferred from these checks.
