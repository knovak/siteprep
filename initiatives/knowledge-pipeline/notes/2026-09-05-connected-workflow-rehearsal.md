# Connected-workflow rehearsal — 2026-09-05

This is automated/operator evidence, not an independent curator sitting.
Ken selected the implementation-and-preparation option and will be the curator.
No Phase 7 completion or production release is claimed.

## Repeat the curator exercise

Open [the acceptance instructions](https://knowledge-pipeline-test.ken-novak.chatgpt.site/acceptance),
then the [test workspace](https://knowledge-pipeline-test.ken-novak.chatgpt.site/workspace).
Create **Ken curator acceptance** and load the 18-source practice collection.
Follow the seven sections, keeping elapsed/rewrite time, corrections, confusing
steps, evidence fidelity, and sharing/self-hosting observations. Do not reuse
the operator rehearsal collection or treat its approvals as Ken's findings.

## Validation

- Portable custody core: 17/17 tests passed.
- Site application: 63/63 tests passed, including six real-SQL repository tests.
- Targeted lint passed for the new UI, endpoint, service, browser rehearsal,
  and repository tests. The existing repository has separate pre-existing lint
  and dependency-audit findings; dependencies were not upgraded in this work.
- The Site production build passed. All four generated D1 migrations were
  applied to both deployed Sites; each reports the expected 21 user tables.
- Local desktop and 390-pixel phone rehearsal passed after the final application
  change. It completed import, review, dual topic assignment, narrative editing,
  no-baseline document approval, archive/reopen, equivalent exports, and upload
  restore with 19 sources and one retained object.
- Local export: 166.056 ms; local restore: 303.210 ms. These are automated
  measurements, not human review or hosted performance.
- Signed-out hosted workflow API returned 401. Protected collections remain
  server-owned; application signing-in and allowlist boundaries are unchanged.

## Deployed source and actual hosted evidence

| Environment | Result |
|---|---|
| Existing public test Site | Version 2; published 2026-09-05 09:12:43 UTC |
| Test Site source | `351dee2affa519a8816d260cb6c65a8972525f12` |
| Separate owner-only recovery Site | Version 1; published 2026-09-05 09:12:34 UTC |
| Recovery Site source | `f567fc63e67909ad044512c88cc0e297e1f0b006` |
| Siteprep application source | `62b655af3`; isolated Site roots contain those files, with only the recovery hosting id changed |
| Production initiative output | Not released |

The [private recovery Site](https://knowledge-pipeline-recovery-check.ken-novak.chatgpt.site)
began with an empty D1 database and a separately bound private R2 bucket.
It used normal ChatGPT sign-in and its own administrator seed. No source-Site
credentials, cookies, backup row, object key, or database connection were supplied
to its restore operation.

The source collection **Operator rehearsal — 2026-09-05** had 18 originals,
two topics, six narratives, one document with two immutable revisions, one
explicitly labeled operator review decision, and one cleared text attachment.
The operator rewrote and approved the second synthetic document revision
through separate visible proposal and approval controls.

- Web and administrator R2-backed downloads were byte-identical.
- Package: `package:abf4c95edde47933a4e483e4353dbef4`.
- Package bytes: **288,989**.
- SHA-256: `2ab0e11d1d36b81e8467622a7b5bdb8f5bd78c808488674aab885af5dee72850`.
- Fresh upload preview named the empty destination **Fresh-site recovery rehearsal**.
- Commit reported **one retained asset object written and read-back verified**.
- Destination D1 contained one accepted snapshot at revision 1. Its staged
  preview row was removed after success.
- Reload retained the 18 originals and two document revisions.
- Re-export compared exact originals, narratives, decisions, document versions,
  relationships, and assets successfully. Collection ownership/scope changed
  explicitly; historical authors and accepted records did not.
- Observed hosted completion upper bounds: export 6,713 ms and restore 6,109 ms.
  These include browser-tool/model observation delay and are **not precise
  service latency measurements**. Logical comparison finished at 09:18:35 UTC.

## Boundaries and remaining work

The workspace is intentionally bounded at 800,000 accepted-state bytes and
1,500,000 upload bytes, with a commit guard ensuring its full export stays
restorable. It stores complete immutable snapshots; it is not the planned
large-collection storage/retention implementation. Scheduling, new-workspace
erasure/garbage collection, full relationship-management UI, and the legacy
file-proposal review UI are not enabled in this bounded workspace.
Source-independence is labeled unassessed rather than fabricated from raw counts.

The practice data covers the connected exercise, not every planned fixture
variant, dependency chain, vocabulary state, or production-scale target.
Existing library tests cover additional contracts but do not establish those
controls in the hosted UI. Only cleared retained text attachments are supported
by this upload-restore path. Legacy Harvest ZIPs remain a different format.

The operator sitting needed no model call, external application, or remote
source body. It does not prove a standalone offline viewer: the downloaded
package preserves readable text, but the hosted UI still needs its application.
Cross-owner/stale-state refusal and interrupted/concurrent rollback were tested
locally; this sitting did not enroll a second real hosted identity.

The independent witness, review effort, correction count, comprehension findings,
full outage/isolation acceptance, and distribution comparison remain open.
Keep the original Phase 7 witness record pending; create a fresh evidence record
for Ken's sitting and attach actual observations. Scheduling may remain
`inactive-not-authorized`.
