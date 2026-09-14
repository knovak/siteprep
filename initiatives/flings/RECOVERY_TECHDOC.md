# Gathering recovery export

September 14, 2026 — first Phase 5 increment. Assigned organizers can prepare an
unencrypted per-gathering JSON snapshot, then save it through the browser.
The format, field guide and complete fictional example live in
`work/app/public/recovery/`. Edited-file staging, semantic validation, isolated
restore and deletion remain pending; the `build-recovery` todo stays actionable.

## Contract and data

`POST /api/flings/:fling/organizer/recovery/export` accepts
`{"confirm_unencrypted":true}` through the existing same-origin, CSRF-protected
organizer request path, including the page's expected organizer identity.
The private, no-store response contains `file`, its formatted UTF-8 `bytes`,
and a sanitized suggested `filename`. A false or missing acknowledgement fails
400; member and preview actors fail 403. Current assignment loss, an unreadable
stored record or exceeding 10,000 records fails 409. An export over 8 MiB fails
413. No partial download is offered. Closed gatherings allow this read.

`file` contains the `flings-recovery` format identifier, `schema_version:1`,
package `application_version`, UTC `exported_at`, `fling_id`, initially empty
`migration_notes`, 22 `records` arrays, matching `counts`, and `redactions` with
a count and JSON-pointer-style paths. Application version is the package version,
not a source commit or deployment version. IDs, relationships and historical
revisions are preserved. Events use ISO instants; other record times use Unix
milliseconds. Amounts use whole minor currency units. Poll votes use zero-based
option indexes. The guide describes each field, including nullable values,
attribution, historical state, corrections and result attempts.

Every business table in migrations 0000–0008 is included except access codes,
sessions, rate-limit attempts and temporary guards. Parent queries scope
`post_history` through posts and `payment_ledger` through payment requests.
Organizer records contain only IDs/names referenced by the selected gathering's
assignments or history, including removed co-organizers. No other gathering's
members, assignments, activities or contacts are selected.

## Consistency and exclusion

`lib/recovery-export.ts` extends the existing store. One D1 batch checks current
organizer assignment, enforces the aggregate record limit and reads all 22
collections. It uses the existing authorized-read purge of expired code and
message ciphertext. An export adds no business/audit records, sends nothing and
performs no restore or deletion. D1's transaction gives an all-before or all-after
snapshot during a concurrent multi-record edit. The timestamp marks preparation,
not the start time of a competing write.

Explicit SELECT columns and nested-object projections come from the reviewed
versioned JSON schema, never from `SELECT *`, live schema discovery or caller
input. Excluded columns include organizer authentication subjects, member access
generation, delivery code references, message context/audience/payload hashes and
ciphertext. The redacted message manifest is exported; encrypted payloads and raw
sending prompts are never read. Result-report fingerprints are historical
non-secret deduplication hashes and do not authenticate an edited export.

All declared string values are inspected for member/preview links, including
repeated URL encoding, Unicode escapes, escaped slashes and malformed percent
segments. Detection decodes a copy only; ordinary text retains its exact value.
A detected link replaces the whole field with `[personal access link removed]`
and records its path. Previously redacted manifest placeholders stay intact.
Undeclared nested fields are dropped and missing required or incorrectly shaped
stored values fail. The file still contains private user-written text and must
be inspected before sharing; no claim is made to recognize arbitrary secrets
that someone types into ordinary prose without an access-link structure.

## Browser lifetime

`components/recovery-export-panel.tsx` requires acknowledgement before requesting
an export. The browser creates an in-memory Blob URL and offers a separate save
link; no export is stored on the server or in localStorage. Preparing again,
unchecking the notice, unmounting, or changing organizer invalidates the prepared
link. The expected-organizer refresh and panel identity prevent an old response
from recreating it after access changes. Downloaded files remain wherever the
browser/user saved them and cannot be recalled. The guide explains folder
selection, retaining the original and editing a separate migration copy.

## Compatibility and extension

`schema-v1.json` is a strict draft-07 envelope, record and basic-type contract,
with `additionalProperties:false`. Version 1 does not include an importer or
full semantic validation. Ajv 8.20.0 is pinned as a development-only independent
schema validator. It checks actual export results and the committed fictional
example; the server uses the small allowlisted projector and existing database
constraints, not Ajv. Public schema/guide/example contain no real data.

When adding a record collection or exported field, review its privacy and parent
scope, use a new schema version when the version-1 contract changes, and keep
old format definitions available for an explicit migration. Update the guide,
fictional example, exporter and boundary tests together. Never let a new live
database column enter an old format automatically. A future importer must reject
unsupported versions with a supported-version explanation; validate size, IDs,
references, boundaries, timestamps, roles, polls and payment arithmetic in
isolation; and preview fresh identity mapping before atomic confirmation. It
must grant no authority from imported names, revive no codes/sessions, send
nothing and leave existing gatherings unchanged. T11 is not complete until that
restore/deletion work and its rollback evidence exist.

## Verification

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build` in `work/app`. With `npm run dev:local` running, execute
`node test/recovery-export-browser.mjs`; existing message-retry and coordination
browser suites cover adjacent organizer functionality. The new test suite uses
real Miniflare D1 with all committed migrations, including concurrency and late
assignment-loss tests. Browser downloads are inspected in disposable Playwright
storage and discarded. Receipts contain browser versions/check names only;
owner-only screenshot state stays in ignored `.wrangler/qa/`.

The example can be deliberately regenerated with
`FLINGS_WRITE_EXAMPLE=1 node --experimental-strip-types --test test/recovery-export.test.ts`.
This opt-in writes only fictional seeded records. Ordinary tests do not rewrite
it. Inspect the generated file for credential exclusion before committing.
