# Simple backup and deletion review

September 15, 2026. Implements the user's instruction to keep backups simple.
No additional backup service, schedule or retention policy is introduced.

## Available recovery path

Flings' versioned JSON export remains the app-level backup. Keep the original,
validate an edited copy, review explicit organizer mappings and confirm a new
gathering. The importer preserves the source gathering, generates new identities,
and imports no credentials or sendable message payload. Exact-title confirmed
deletion removes that gathering's active records, audit history and member
access. Downloaded copies and external messages remain separate. See
`RECOVERY_TECHDOC.md` and the local recovery acceptance receipts.

## Provider facts and limits

[Cloudflare D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
documents automatic recovery history, with a seven-day free-plan or thirty-day
paid-plan window. Restore overwrites the database in place. These are D1 product
facts, not evidence of the plan or recovery entitlement behind this managed Site.
A database-level restore can bring back older credentials and deleted records;
it is not equivalent to Flings' credential-free gathering import.

[OpenAI Sites documentation](https://learn.chatgpt.com/docs/sites) describes D1
storage, deployed code versions, runtime settings and permanent Site deletion.
It does not specify managed database backup retention or an owner-operated
point-in-time database restore. The available Sites connector exposes database
inspection, but no backup history, backup deletion or database restore operation.
A saved source/deployment version is not proof of a database backup.

The actual Flings Site's provider retention, backup erasure and support-assisted
recovery procedure remain unverified. Do not infer thirty-day retention from
D1's general documentation or promise immediate removal from host backups.
Before real personal data, obtain the managed host's policy and recovery path,
and rehearse it with isolated fictional data. No database rewind, backup deletion,
whole-Site deletion, or external support message was performed in this sweep.

## October 21, 2026 refresh (Australia/Brisbane)

Rechecked against source `963302db23c14ff5c5607f8b50140d02c0a894ea`
on October 20 UTC. This is a documentation and read-only metadata review for
T11/T12, not a database recovery rehearsal.

### Current evidence

| Source checked | What it establishes | What it does not establish |
| --- | --- | --- |
| [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/) | Time Travel history is 7 days on Workers Free and 30 days on Workers Paid. | Which entitlement applies to the database managed by Sites. |
| [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) | Recovery overwrites the database in place and cancels in-flight queries. The returned prior bookmark can undo the restore; restoring does not delete older bookmarks. | Sites-owner access to those operations, managed retention or backup erasure. |
| [Sites data and connections](https://learn.chatgpt.com/docs/sites/data-and-connections) and [Site management](https://learn.chatgpt.com/docs/sites/managing-a-site) | Sites separates durable storage from saved deployable source versions; Site deletion is described as permanent. | A managed-database retention period, point-in-time restore procedure, backup-erasure timing or service-specific recovery entitlement. These pages did not supply those facts in this review. |

The Time Travel overview's general 30-day description must be read with the
plan-specific limits table; neither number can be assigned to Flings from its
ChatGPT subscription or its Site version.

Live `get_site` confirmed the existing `flings-test` target is active, with
latest version 17, public audience and access revision 2. An initial metadata
request failed with `Transport closed`; one retry succeeded.
`read_database_overview` then returned binding `DB` and 28 user table names
with no omitted/truncated identifiers. No row contents were requested.
These observations confirm reachable managed storage, not a usable backup.

The Sites tools exposed to this run provide database overview and bounded
read-only table pages. Their available operations include no backup-history,
database-restore or backup-deletion tool. This is a capability observation for
this session, not proof that the host has no internal recovery service.
No runtime secrets, gateway tokens or raw connector responses are retained here.

### Evidence still needed for the existing recovery requirement

Before a managed-host rehearsal, obtain provider documentation or a provider
answer identifying:

- The recovery window actually applied to this Site, its granularity, and who
  can request a restore.
- The supported recovery procedure, its scope and outage implications, and a
  way to preserve or return to the state immediately before recovery.
- What happens to retained database history after an application-level deletion
  and after whole-Site deletion, including any documented erasure delay.
- A supported isolated fictional-data rehearsal and how to prevent restored
  credentials, sessions or pending handoffs from becoming usable unexpectedly.

These are unresolved provider facts for the existing T11/T12 acceptance, not a
new retention policy or backup service. No support message was sent. Until the
facts and rehearsal exist, keep the app's credential-free JSON import evidence
separate from managed database recovery. No database rewind, deletion, access
change, deployment or business-record write was performed. Phase 6 and
`verify-hosted-test` remain actionable for the other hosted checks.
