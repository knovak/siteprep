# Confirmed recovery and deletion — September 14, 2026

Local fictional-data evidence for the final Phase 5 implementation.

- `npm ci` installed the lockfile unchanged. `npm run typecheck` and
  `npm run lint` passed. The existing install audit reports 10 development-stack
  advisories; this increment adds no dependency or live activation.
- `npm test`: **170/170 passed**, including 10 new real-Miniflare-D1 tests.
  These cover a populated delivery/report migration; an edited export/restore
  round trip; fresh IDs and foreign keys; unchanged source records and expired
  secrets; importer access and inert historical identities; immutable imported
  message outcomes; exact file/mapping/actor/context/roster/expiry binding;
  concurrent and repeated confirmations; mid-import rollback; late organizer
  removal; failed and successful deletion; explicit fresh-link issuance and
  invalidation after deletion; and HTTP origin/CSRF/expected-organizer controls.
- `test/recovery-restore-browser.mjs`: **6/6 passed**, desktop 1280×1000 and phone
  390×844 in Chromium, Firefox and WebKit. Exact versions and check names are in
  `recovery-restore-browser-20260914.json`. The journeys edit a fictional event,
  review accounts, verify disabled confirmation, reset consent after changing
  a mapping, restore by keyboard, inspect the new gathering and imported history,
  cancel deletion, reject a wrong title, confirm deletion and verify source
  isolation. No horizontal overflow or browser page errors were observed.
- The existing preview and export suites each passed **6/6 journeys** on the
  same three engines/sizes. Their receipts were refreshed after this change.

The application stores no uploaded restore file or raw preview for later use.
The input file remains separate; request data is transient, and parsed browser
review data clears on change, failure, completion or leaving the page. A ten-minute
signed review and anonymous replay tombstone cannot issue a member credential.
A migration failure or restore/delete failure rolls back active records.

This is local T11 implementation evidence, not full hosted or live acceptance.
The separate private test deployment receipt records publication. Managed real
organizer identity, provider-specific backup retention and recovery/deletion,
audit retention, the full hosted T11/T12 matrix and authorized pilot receipt
remain Phase 6/7 work. Active application deletion does not erase downloaded
exports, external messages or provider backups. No real person was messaged and
no production release or outside access was enabled.
