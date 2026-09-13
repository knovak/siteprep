# Result preview and reporting — September 13, 2026 (UTC)

This third Phase 4 increment records organizer-reported delivery observations
through preview and explicit confirmation. The `build-message-handoff` item
remains actionable for selected retry/attempt tracking and the optional atomic
linked discussion post. No phase, hosted acceptance or real receipt is complete.

## Validation

- `npm test`: **83** real-D1/domain/HTTP/time tests pass, including **13** new
  reporting tests. Each test database applies all seven migrations.
- `node test/message-results-browser.mjs`: **6** new journeys pass in Chromium,
  Firefox and WebKit at 1280×1000 and 390×844. The receipt is
  `message-results-browser-20260913.json`.
- `node test/messages-browser.mjs` and `node test/audience-browser.mjs`: **12**
  regression journeys pass. Their new receipts are
  `message-results-messages-regression-20260913.json` and
  `message-results-audience-regression-20260913.json`; the earlier receipts are
  unchanged. This run has **18** browser journeys in total, not a rerun of every
  earlier gathering or coordination interface matrix.
- TypeScript, lint and the Vinext application build pass. The repository build,
  scope check and current-head GitHub checks are reported in the PR.
- `message-results-source-20260913.json` records the refreshed-main baseline,
  local runtime and nine changed implementation/test/migration source hashes.
  Browser receipts record actual engine versions and sizes. No receipt stores
  a contact, cookie, bearer link or raw sending prompt.

The database cases validate exported-only batches, strict schema and bounded
input, unknown/duplicate/foreign IDs, malformed statuses, preview-only reads,
confirmation and HMAC binding, expiry at the ten-minute boundary, copied-preview
actor mismatch, competing confirmations and duplicate-report rejection with
reordered rows. Missing deliveries keep previous outcomes, initially unknown.
Corrections retain earlier attribution/evidence and can change a prior report
back to unknown. Quoted Unicode and multiline evidence remains exact data.

Failure injection proves rollback of an incremented results revision, report
header, an earlier result row and audit when a later insert fails. Late closure
and organizer-removal injections fail the final transaction. Closed flings keep
readable history; reopening requires a new preview. Current organizers can
record historical observations after code expiry/revocation without decrypting
or reconstructing any removed link. Reporting blocks full-batch recopy even
when a report commits between export verification and its final transaction.
HTTP cases check origin, CSRF, expected organizer and private/no-store responses.

The browser suite starts with a fictional API-exported batch and exercises the
actual reporting form: invalid duplicate refusal without a report, keyboard
preview, confirmation gating, clearing a preview after an edit, mixed outcomes,
omitted unknowns, attribution/reload, correction preview and preserved history.
Every engine/size pair checks horizontal overflow and page errors. An initial
assertion expected a generic organizer fixture name; it was corrected to the
existing fixture name Casey, and all six journeys then passed. No app defect
was hidden by changing that assertion. Temporary screenshot-only authenticated
state stays in ignored owner-only `.wrangler/qa/` files.

## Limits and remaining work

All observations are simulated. A reported send, exported prompt or recorded
app reference does not verify recipient receipt, authorize a send, or establish
external-tool reliability or duplicate-send safety. There is no Gmail/Messages
operation, real clipboard write or external LLM invocation in these tests.

The result endpoints satisfy the reporting portion of T9 and add T1/T5 access
and closure coverage. Explicit selected retries need reviewed delivery selection,
account-history inspection and attempt tracking. T10 still needs one atomic
optional discussion post with its independently reviewed audience/content and
reported counts. The larger Phase 4 item remains open for both capabilities.

Flings has no deployment configuration. Hosted identity, dependency remediation
(the pinned install still reports six moderate and eight high advisories),
editable recovery, outside-member access and human pilot acceptance retain the
existing later-phase gates. No new account, access setting, Site or production
release was introduced.
