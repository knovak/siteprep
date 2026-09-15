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
