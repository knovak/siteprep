# Recovery export receipt — September 14, 2026

First Phase 5 increment: an assigned organizer prepares an unencrypted version-1
JSON snapshot and saves it through the browser. Restore, edited-file semantic
validation, deletion and full T11 acceptance remain pending.

## Local checks

- `npm ci` completed with the locked dependencies; Ajv 8.20.0 is a development-only
  schema validator. Existing development-toolchain advisories remain recorded.
- `npm run typecheck` and `npm run lint` passed.
- `npm test`: **118 passed**, including **11 recovery-export tests** against real
  Miniflare D1 with all nine migrations. The rich fixture fills all 22 business
  collections, including original/edited posts, votes, payment claims and
  confirmations, linked message discussions, reported outcomes and retry attempts.
- Independent JSON-schema validation checks actual exports and the committed
  fictional example. Tests reject unknown fields, wrong versions and types;
  inspect actual record IDs, counts, exact Unicode text and preserved history;
  exclude credentials and other gatherings; redact raw/encoded/malformed links;
  reject malformed stored JSON, over 10,000 records and over 8 MiB without a file;
  exercise concurrent edits and late assignment loss; preserve removed organizer
  attribution; and verify closed access, role, Origin, CSRF and no-store behavior.
- `node test/recovery-export-browser.mjs`: **6 passed**, desktop/phone in Chromium,
  Firefox and WebKit. Actual downloaded bytes validate against the public schema;
  the test checks acknowledgement, keyboard preparation, exact fixture IDs/text,
  counts, credential exclusion, revoke-on-uncheck, repeated preparation, organizer
  change during an in-flight response, reference downloads, guide layout and
  absence of page errors. Receipt: `recovery-export-browser-20260914.json`.
- Adjacent regressions: `node test/message-retries-browser.mjs` and
  `node test/coordination-browser.mjs`: **6 each**, for **18 browser journeys** in
  this run. Their dated JSON receipts were refreshed.
- The application production build completed successfully. Repository build,
  scope verification and the post-build screenshots are recorded in the PR.

The first implementation of historical-organizer selection exceeded D1's
compound-SELECT term limit. Replacing the union with independently scoped
membership subqueries fixed it; the final database/API and browser runs above
include that code. No database migration was required.

## Limits

These tests use fictional data and local browser downloads. No real account
sending, member receipt, money movement, outside-member access or live pilot was
exercised. Existing private-test identity/access remains unchanged. Schema
validation proves declared fields and basic types, not all cross-record,
timestamp, role or financial rules required for a future edited-file restore.
No restore or deletion endpoint is introduced. Browser state is temporary and
downloaded files cannot be recalled. Full T11 and later hosted/pilot acceptance
stay open; private test deployment has its own receipt.
