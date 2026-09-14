# Gathering recovery export

September 14, 2026 — first Phase 5 increment. Assigned organizers can prepare an
unencrypted per-gathering JSON snapshot, then save it through the browser.
The format, field guide and complete fictional example live in
`work/app/public/recovery/`. The second increment adds an in-memory edited-file
checker. A third increment adds explicit organizer mapping and a read-only
restore preview. Confirmed isolated restore and deletion remain pending; the
`build-recovery` todo stays actionable.

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
with `additionalProperties:false`. Version 1 does not include an importer. The separate checker below adds
semantic checks without changing the version-1 field contract. Ajv 8.20.0 is pinned as a development-only independent
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


## Edited-file checker — September 14, 2026

`POST /api/flings/:fling/organizer/recovery/check` accepts the recovery JSON file
itself, not a wrapper object. It uses the existing expected-organizer, same-origin
and CSRF transport. The caller must be an organizer currently assigned to the
page's gathering; a backup can name another source gathering without acquiring
access to it. Neither the source ID nor imported organizer names authorize any
query. Assignment is read before and after checking. The request only performs
those two SELECTs: it does not use the store's purge-on-read transaction or write
business, audit, staging, code or session records.

The HTTP reader stops at 8 MiB of incoming bytes (including whitespace) and
rejects malformed UTF-8/JSON. Other JSON forms retain their 16 KiB limit. The
checker also bounds serialized bytes and aggregates collection lengths before
examining records, rejecting more than 10,000 records. Its fixed-schema walker
supports every validation keyword currently present in the committed schema;
a regression test fails if a new keyword requires implementation. It interprets
no uploaded schema, SQL or code and requires no runtime code generation or new
dependency. Ajv remains the export's independent development-only validator.

A check returns `{valid, issues, truncated, summary}`. Invalid files have a null
summary and at most 100 `{path,message}` issues. Paths are made from known schema
fields and numeric array indexes; even an unexpected key's spelling is omitted
because it may contain a secret. No uploaded values, names or contacts are
returned. A valid summary contains collection counts, total records, redaction
count, historical-organizer count and unfinished-handoff count. It is an
inventory, not a signed restore ticket, checksum, permission grant or claim of
trustworthiness. No byte buffer or parsed file is retained for a later request.

The checker enforces the strict envelope/types and the following semantics:

- Exact collection counts, one matching fling, primary/composite identities,
  secondary history uniqueness, parent IDs and consistent fling/activity/event
  and message-batch boundaries. Historical actors must exist in the file with
  the required role; they do not map to authentication accounts.
- Real UTC instants (event seconds with optional milliseconds), supported zones,
  nonnegative millisecond timestamps/revisions, event end after start, recorded
  state/role flags and HTTP(S) links without embedded credentials.
- Distinct bounded poll options, matching vote choices, historical invitation
  generations/audiences and acyclic same-event poll replacements. Declined,
  removed or withdrawn members retain their historical records.
- Supported currency codes, integer minor units, confirmation-to-report and
  role constraints, confirmation totals, balances and refunds. BigInt sums avoid
  rounding maliciously large aggregate values. Entries sharing a millisecond
  are evaluated together: version 1 stores no ordering within that millisecond,
  so the checker cannot establish an intermediate sequence within such a group.
- Manifest/delivery agreement, audience references, discussion readers,
  report/retry relationships, redaction paths and encoded access-link exclusion
  in every declared string. Audit target IDs may refer to intentionally excluded
  access records; those targets are retained as historical identifiers only.

`recovery-check-panel.tsx` reads the selected file only on an explicit check,
rejects oversized or malformed files, and renders summaries/errors as text.
It keeps only the selected browser File and returned report in component state.
Clearing, replacement, unmount and organizer changes invalidate in-flight reads
and responses. It uses no localStorage and creates no download URL. React escapes
text; the application never executes instruction-like content from an upload.

### Completion boundary and extension

This increment completes the read-only checking interface, not T11 or Phase 5.
The next restore increment must explicitly map organizer authority, assign fresh
identities, cancel unfinished handoffs, mark message outcomes imported, validate
again at atomic confirmation, and prove all-or-none failure. It must not trust a
client's prior `valid` response. Deletion and provider retention/recovery evidence
remain later acceptance work. No restore/deletion endpoint or misleading inactive
confirmation control is included here. Update this checker, the documented
format, example and boundary tests together when introducing another version.

Verification adds 31 adversarial/domain/HTTP tests using actual Miniflare D1,
including an every-application-table comparison before/after valid and invalid
checks with expired ciphertext present, and injected assignment loss at the final
read. The complete suite now passes 149 tests. Six new browser journeys cover
edited and malformed files, errors, keyboard operation, oversized uploads,
clear/replace lifetime, late organizer responses and desktop/phone layout.

## Organizer mapping preview — September 14, 2026

`POST /api/flings/:fling/organizer/recovery/restore-preview` accepts
`{"file":<version-1 export>}` to load historical identities and available
organizer accounts. Add `organizer_mapping:[{"source":"<file organizer id>",
"target":"<current account id>"}]` to review the proposed assignment plan;
`target:null` explicitly keeps an identity as history only. The whole request,
including choices, is bounded to 8 MiB. Unknown wrapper/mapping fields, missing
choices, duplicate/foreign source IDs and unavailable target accounts fail.

`lib/recovery-preview.ts` extends the checker. Every call revalidates the file,
even if the browser previously received a successful check. Invalid files return
the existing bounded issue report with no identities, accounts or plan. Valid
files return historical names and IDs as text, never authentication subjects.
Available real accounts come only from the caller's currently assigned gathering,
not the gathering named in the upload or the global organizer directory. Names
and identifiers that happen to match do not select an account automatically.
Only historical organizers assigned in the file may map to a current account;
unassigned historical actors can only be kept as history. The current importer
is always included in proposed access. Multiple historical labels may explicitly
map to one account without merging their historical attribution.

The response's `plan` inventories the imported records, source title/state,
organizer choices, personal-link redactions, unfinished handoffs and historical
result count. Collection counts describe the imported inventory, not a promise
of an identical number of future database inserts: fresh assignment/provenance
records are still required by the importer. It describes a new private gathering,
fresh record identities, unchanged existing gatherings, cancelled unfinished
handoffs and imported-only results. It never creates a gathering, reserves IDs,
issues a credential, collects a payment or sends a message. This is not a signed
confirmation ticket or a claim that the file is trustworthy.

All database operations are SELECTs. The authorized current account roster is
read before and after validation/mapping; loss of the importer, a co-organizer
removal, or a changed account name rejects the response. No purge-on-read batch,
upload staging row, audit event or persisted preview is created. The roster can
change after the response, so the later atomic importer must independently
validate file, mappings and current authority at confirmation, bind the exact
review to that action, and commit all restored records or none. This preview
alone cannot authorize a subsequent write.

`components/recovery-preview-panel.tsx` appears after a successful file check.
**Load organizer choices** reads the selected file again; every identity starts
with an unselected choice. **Review restore preview** submits explicit choices
and displays the additions/omissions and proposed account access. Uploaded names
render as escaped text. Choices and previews live only in component memory:
changing a choice, replacing/clearing the file, leaving the page or changing
organizer invalidates pending responses. No localStorage or browser download
is used. There is no inactive or misleading restore-confirmation button.

Run `node test/recovery-preview-browser.mjs` for the six desktop/phone journeys.
`test/recovery-preview.test.ts` exercises real D1 isolation across all application
tables, foreign/duplicate/incomplete mappings, historical role constraints,
prototype-like IDs, late authority changes and HTTP boundaries. The dated
receipt records actual results. T11 remains incomplete until atomic restore,
fresh relationship mapping, failure rollback, deletion and retention evidence
are implemented.
