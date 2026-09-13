# Flings message review, export and reported outcomes

The local application lives in `work/app/`. `lib/messages.ts` extends the
existing audience, coordination and access stores. Exact review, approval and prompt export now include a third Phase 4
increment for previewed, attributed delivery-result reporting. Flings has no
sending integration and cannot verify recipient receipt.

## API and state

Organizer endpoints under `/api/flings/<fling>/organizer/messages` use the same
current assignment, expected-organizer, origin and session-bound CSRF controls
as other writes. All responses are private/no-store. Hosted organizer sign-in
still denies access until Phase 6 identity is configured.

- `POST /prepare`: accepts the audience selection/revision, `subject`,
  `core_text` and a `suffixes` object keyed by selected membership IDs. Only
  fields relevant to the chosen filter are retained. Text is validated without
  changing its whitespace; pasted bearer links are rejected, including in
  recipient names/destinations. The HTTP boundary supplies `FLINGS_ORIGIN`,
  which must match the request origin. It returns the exact manifest,
  fingerprint, omissions and shared destinations for review.
- `POST /approve`: requires `batch_id`, revision `1`, its fingerprint,
  `confirm: true` and `confirm_duplicates: true` when destinations are shared.
  Approval records once; concurrent approvals cannot both commit.
- `POST /export`: requires the same batch/revision/fingerprint and its original
  organizer. It rechecks eligibility and returns fixed instructions plus
  `JSON.stringify` of the approved manifest. The first export time is retained;
  repeated exports preserve IDs and text while no results have been recorded.
  Once any report is recorded, full-batch recopy is rejected, including races
  with reporting; explicit selected retries remain pending. No export marks a
  delivery sent.
- `GET` returns up to 50 recent redacted batch summaries. Old draft reviews
  must be prepared again after reload; approved batches without reports offer
  recheck/recopy. Summaries include current reported counts, per-delivery
  provenance and the append-only report history.
  `needs_renewed_review` is an advisory check of retained payload, code state,
  deadline and current context; the export operation always checks again.

Each membership/channel has a UUID delivery ID. The subject appears only on
email rows. Exact core text, two line breaks, and the personal suffix form the
body. The suffix contains the optional note followed by the generated personal
link. Both channels for a membership share the code selected by `issue()`.
One-to-five deliveries is the documented pilot limit, not recipient merging.

## Persistence and concurrency

Generated migration `0005` adds `message_batches` and `message_deliveries`;
`db/schema.ts` is the source. Foreign keys bind delivery/code/member/fling and
batch/fling; a unique batch/member/channel key rejects duplicates. Fling and
code indexes support history and expiry cleanup. Prior migrations remain
unchanged. Migration `0006` adds `message_reports`, `message_results`, a batch
`results_revision` counter and a delivery/batch/fling unique key; there are now
23 tables. Existing batch content and initial unknown outcomes are preserved.

A batch retains the canonical selection, a non-secret state snapshot, audience
hash, redacted manifest and SHA-256 fingerprint of the exact original JSON.
The raw JSON is separately AES-GCM encrypted with the existing runtime secret.
Redacted history contains no generated bearer link; it retains explicit link
placeholders. Approved content has no update endpoint. Approval/export times and the separate results-revision counter may change;
reporting never modifies approved content, delivery IDs or its fingerprint.

Preparation captures a state snapshot before resolving the audience, issues or
reuses eligible membership codes, then guards the same state in the transaction
that inserts all batch/delivery records. Code issuance is separately audited;
a later preparation failure can leave eligible codes, but no partial batch or
review audit. Snapshot comparison includes fling revision/open state, every
member's revision/generation/state, assignments and assignment-audit sequence.
Gathering/coordination mutations already advance the fling revision; older
profile/assignment paths are covered explicitly. This conservatively invalidates
review after changes elsewhere in the same fling rather than silently keeping
an affected or possibly affected audience.

Approval/export resolve the audience again and verify the immutable payload
fingerprint. The final D1 batch repeats current authority, context, live code
and unanswered-poll deadline checks. Guard rows with `CHECK(ok=1)` convert a
failed precondition into transaction rollback. One original owner controls each
batch; recopy is the same handoff, and no external-send idempotency is claimed.

AccessStore's authorized batches now clear affected message ciphertext after
code sending expiry or revocation. Cleanup runs after the requested statements,
so revocation/removal and purge commit together. Expired read results are never
returned as raw payloads. Code/delivery metadata and redacted history remain.
Retained links elsewhere outside Flings, such as a clipboard, are beyond this
cleanup. Timed maintenance and host backup/retention evidence remain part of
hosted activation; local cleanup occurs on authorized access and revocation.

## Interface and verification

`components/message-panel.tsx` composes existing form primitives inside the
recipient panel. Composition stays disabled until recipient review is ready.
It clears transient review/prompt state after edits and errors;
workspace context changes remount the panel. The parent retains the error when
an access/revision failure removes the old view. History remains available
without composing a new batch. No prompt or code goes into browser storage.

`test/messages.test.ts` exercises actual Miniflare/D1 transactions and injected
late changes. `test/messages-browser.mjs` covers three browser engines at two
sizes with a stubbed clipboard, exact text and links, confirmations, persisted
redacted history and rejected stale export. See the dated evidence receipt.

Optional same-fling discussion posting remains necessary for T10. Explicit
selected retries and interruption/attempt tracking remain necessary for full
T9 acceptance. Neither is implied by the reporting increment below.


## Result preview and recording — September 13, 2026

`lib/message-results.ts` extends `MessageStore`; HTTP uses that extension for
history and the two result endpoints. Current assigned organizers may report,
including a different organizer from the original sender. Only the original
owner can export a batch. Members, previews and unrelated organizers cannot
read or write result history.

`POST /results-preview` accepts `{ "report": ... }`. The report shape is:

```json
{
  "batch_id": "the-exported-batch-id",
  "revision": 1,
  "results": [
    {
      "delivery_id": "an-id-from-that-manifest",
      "status": "reported_sent",
      "evidence": "Claimed Gmail Sent reference; recipient receipt not verified"
    }
  ]
}
```

Only `reported_sent`, `reported_failed`, `suppressed` and `unknown` are valid
statuses. Evidence is required as a string but may be empty. Missing or ambiguous
observations belong under `unknown`; omit deliveries not being reported.
Omitted deliveries retain their previous outcome, initially unknown. An explicit
`unknown` can correct an earlier report without deleting it. Unknown fields,
wrong batch/revision, foreign or repeated delivery IDs, invalid statuses and
malformed evidence fail before any report is written. The report accepts one
to five rows, each evidence field up to 4,000 characters and canonical JSON up
to 12,000 UTF-8 bytes, within the existing 16 KiB HTTP request limit. Larger
observations must be split by delivery or summarized.

The server returns the normalized report, old/new statuses and evidence,
resulting counts, unchanged-delivery count, `results_revision`, `expires`, and
`token`. The HMAC binds that exact report to the actor, fling, current context,
results revision and ten-minute expiry. Preview writes no report or staging
record; normal authorized-access cleanup can still purge expired links.

`POST /results-record` requires the returned `report`, `results_revision`,
`expires`, `token`, and `confirm: true`. It revalidates the entire report and
preview, then guards the current assignment, open state, context and results
revision in one D1 batch. Updating the counter, inserting the attributed report
header and all result rows, and recording the audit event either all commit or
all roll back. Concurrent confirmations yield one winner; the other organizer
must preview the new state. Changes to profiles, assignments, gathering state
or prior reports invalidate the old preview. A closed fling permits reading
history but no result recording; reopening needs a fresh preview.

Report headers retain the server time, reporting organizer ID, sequence and
canonical report fingerprint. Result rows preserve the claimed evidence exactly,
including whitespace and Unicode. Foreign keys bind every row to both the
report and original delivery in that fling. The latest report for each delivery
supplies its displayed outcome; older reports remain readable. Displayed names
come from the current organizer record, alongside the stable reporter ID.
An identical canonical report cannot be imported twice, even with reordered
rows. A correction back to an earlier claim needs distinct explanatory evidence;
it cannot replay an earlier identical report.

Reporting reads only the redacted approved manifest and never decrypts or
reconstructs a personal link. Expiry/revocation may purge the encrypted payload
without preventing a current organizer from recording historical observations.
Recognizable personal-link text is rejected in evidence, including encoded
links. Like existing `safeText`, this does not recognize arbitrary standalone
secrets. Only validated fields enter report storage, and audit rows contain a
report ID, not imported text or raw links.

`components/message-results-panel.tsx` sits inside each batch's review history.
It provides a JSON template, mandatory preview and explicit confirmation, current
counts, attribution, and correction history. Editing the JSON clears its preview;
a failed save requires a new preview. Recording clears any displayed old prompt
and review. Full-batch recopy is blocked after reporting to avoid silently
resending known outcomes; checking external account history and preparing a new
exact review is required until selected retries are implemented. Flings cannot
recall an already copied prompt or establish external duplicate-send safety.

Run `npm test` and, against `npm run dev:local`,
`node test/message-results-browser.mjs`. The browser suite writes
`test/evidence/message-results-browser-20260913.json`; temporary screenshot state
stays in ignored owner-only `.wrangler/qa/` files. It uses fictional API-exported
batches and exercises result forms at desktop/phone widths in three engines.
See the dated receipt for final checks and remaining acceptance. This work
creates no linked discussion post, Site, account or real message.
