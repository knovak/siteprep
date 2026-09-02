# Bookmark Sorter operator runbook

This runbook covers the small set of administrator actions needed to keep the
Bookmark Sorter Sites deployments recoverable and private. It complements the
[user guide](README.md) and the [end-user test procedure](work/END_USER_TESTING.md);
it does not replace the repository release workflow.

## Boundaries to preserve

- The public Site address is only an entry point. Bookmark data remains behind
  Sign in with ChatGPT, the `authorized_user` allowlist, and collection-owner
  checks on every API route.
- Test and production are separate Sites with separate D1 databases and R2
  buckets. A deployment does not copy bookmark data between them.
- URLs, folder paths, notes, tags, and verdicts are private user data. Do not
  paste an export into an issue, pull request, build log, or other public
  channel.
- `CAPTURES` stores fixed-size metadata-image derivatives shared by normalized
  URL. It does not authorize one user to read another user's bookmark items.
- Pass 2 and its paid screenshot vendor remain off until the user separately
  authorizes them.

## Add or change access

1. Sign in with an allowlisted administrator account and open **Admin**.
2. Choose **Display users** before changing anything. Confirm the normalized
   email and current `user` or `admin` role.
3. Add the new email with the least role needed. `user` permits private
   collection work; `admin` also permits user, template, capture, and sitting
   administration.
4. Ask the person to sign in once. The first successful email match links the
   Site-specific user id to that allowlist row.
5. If the person sees **You're not authorized yet**, compare the email shown by
   the Site with the allowlist. Do not add a second spelling until the mismatch
   is understood.
6. Remove an account through **Admin** when access should end. Removing the
   allowlist row blocks later entry; it does not silently erase the person's
   collections.

Treat an unexpected linked-id conflict as an identity incident. Do not work
around it by adding another administrator row or changing collection ownership.
Record the affected email and Site, preserve backups, and investigate the
trusted Sites identity before restoring access.

## Before a test or production replacement

For each collection whose data matters:

1. Open **Export** and download **Current collection** as
   `bookmark-sorter/v1` JSON.
2. Open any selection whose exact membership matters and download **Current
   selection** separately.
3. Record the collection name, item count, untriaged count, and export time in
   the operator's private notes. Do not commit those notes if they reveal the
   collection.
4. Keep the browser's original bookmark export until the new Site version has
   been checked.
5. Verify the target: the test Site is
   <https://bookmark-sorter-end-user-test.ken-novak.chatgpt.site/> and
   production is <https://bookmark-sorter.ken-novak.chatgpt.site/>.

Replacing a Site version should preserve that environment's D1 and R2 data,
but the portable JSON export is the recovery copy controlled by the user.

## Post-deployment smoke check

1. In a signed-out or private window, confirm the sign-in page appears and an
   API route returns `401 authentication_required`.
2. With a signed-in but unlisted account, confirm the refusal page appears and
   no personal collection is created.
3. With an allowlisted user, open each expected collection and compare its item
   and untriaged counts with the pre-deployment note.
4. Open a few saved URLs, switch collections, open a saved or automatic
   selection, and export that selection.
5. Apply one harmless verdict or tag action to test data, then use **Undo** and
   confirm the original state returns.
6. With an administrator, confirm **Admin** is present, ordinary users do not
   see it, and the authorized-user list can be read.
7. If capture storage changed, verify one stored image and one no-image card;
   do not enable the paid fallback as a troubleshooting step.

Use the fuller [end-user test procedure](work/END_USER_TESTING.md) for a release
candidate or any change to identity, imports, selection, triage, export, D1, or
R2 behavior.

## Restore or merge a portable backup

1. Keep the affected collection selected and export its current state first,
   even if that state appears incomplete.
2. Open **Import**, select the known `bookmark-sorter/v1` JSON file, and choose
   **Import file**. JSON import merges by normalized URL; it is not a destructive
   database restore.
3. Review the reported added and merged counts. Re-importing the same backup
   should not increase the total.
4. Confirm that existing non-empty notes and verdicts were not overwritten by
   conflicting incoming values, while incoming tags were added.
5. Export the reconciled collection and retain both the pre-merge and
   post-merge files until the result is accepted.

Do not use **Erase current collection** to make a restore look clean unless the
user explicitly wants destructive replacement. Erase cannot be undone.

## Incident checklist

- **Unexpected sign-in or authorization result:** stop data-changing work,
  capture the displayed email and which Site is affected, and inspect the
  allowlist from a known administrator session.
- **Missing collection or count mismatch:** do not re-import immediately.
  Confirm the signed-in account, selected collection, environment, and whether
  the collection was renamed or a fresh demo copy was created.
- **Failed import:** retain the source file, error text, and pre-import export.
  Imports are merge operations; retry only after confirming the file format and
  target collection.
- **Capture failures:** bookmark records remain usable. Keep pass 2 off, record
  the error tags and coverage, and treat images as optional metadata.
- **Suspected exposure:** remove the affected account from the allowlist, keep
  the Site and private storage intact for investigation, and do not put
  bookmark URLs or exports in the incident report.
- **Accidental erase:** stop writes to that collection and recover from the
  most recent portable JSON export. Capture derivatives may remain, but erased
  bookmark records, notes, tags, and verdicts are not recoverable from the app.

## Evidence to retain privately

For an access change, deployment, restore, or incident, retain the Site name,
deployed version, time, actor role, collection names and counts, backup file
names and hashes where practical, smoke-check result, and any unresolved
failure. Keep user emails and bookmark content out of the repository unless a
minimal, consented fixture has replaced the real data.
