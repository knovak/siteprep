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

## Atomic discussion posting — September 14, 2026

`POST /prepare` also accepts optional `discussion: { activity, event, body }`.
Use null activity/event for the whole fling, an activity with null event for
that activity, or a matching activity/event pair. The server rejects foreign
or mismatched scopes and recognizable personal links. It preserves exact shared
text and returns the scope title, current member readers and current organizers
for separate review. Whole-fling readers are active members; activity/event
readers are active accepted members of a published activity. Organizers retain
the existing ability to post in draft or cancelled scopes, where no members
currently read. Later readers follow existing discussion access rules.

The optional discussion JSON is bound into the payload fingerprint alongside
the exact encrypted direct-message manifest. Existing batches with a null
discussion retain their original fingerprint format. Only direct deliveries
enter an exported prompt; discussion text, readers and instructions are not
added to the external sending task. The shared-text form never copies personal
suffixes, contacts or generated links. The organizer must review its suitability
for the independently displayed discussion audience.

`POST /approve` requires an additional `confirm_discussion: true` when the
batch includes a discussion. In the same current-authority/context/code-checked
D1 transaction, approval creates exactly one attributed post and its unique
batch link. A late failure rolls back approval, post, link, revision and audit.
The post advances the fling revision; only this batch's eligibility context
and selection revision move forward with that known internal change. Its
approved content, audience and fingerprint stay fixed. Other prepared batches
become stale. Later discussion edits also require renewed message review.

Generated migration `0007` adds nullable `message_batches.discussion`, the
`message_discussions` linking table and a post/fling unique key. Both sides of
the link use compound foreign keys; one batch and one post may each occur only
once. The application now has 24 tables and eight additive migrations.

Coordination reads derive notification counts in the same authorized snapshot
as the posts, using the latest reported status of each delivery. An unreported
delivery counts as unknown. The initial label is Notification prepared, even
after copying; reported counts remain claims and never verify receipt. Corrections
and partial reports update the counts without rewriting the post or approved
text. Members and previews receive counts only, with no batch link, delivery
IDs, recipient contacts, personal suffixes or report evidence. The ordinary
post scope and hidden-post rules apply. Organizers can open the linked review
history. Editing/hiding a post does not rewrite its approved discussion text.

Run `npm test` and `node test/message-discussions-browser.mjs` against the local
server. The dated receipt records rollback, concurrency, independent audiences,
privacy, reporting and three-engine desktop/phone interface checks. Selected
retries with account-history inspection and attempt tracking remain Phase 4
work; this increment does not mark the larger item complete.

## Selected retries and attempt history — September 14, 2026

`lib/message-retries.ts` extends the result store with three organizer endpoints.
The original batch owner retains the handoff claim. No endpoint inspects an
external account or starts sending. Failed and unknown deliveries become
retryable only after explicit selection, a nonempty account-history observation
for each delivery, confirmation that each was not sent, and confirmation that
the previous external run stopped. Reported-sent and suppressed deliveries are
excluded. An unresolved external outcome must be left alone.

- `POST /retry-preview` takes the original `batch_id`, `revision`, `fingerprint`,
  `history_checked: true`, `prior_run_stopped: true`, and `checks`, a list of
  `{ delivery_id, evidence }`. Select one to five distinct deliveries. Each
  observation is at most 4,000 characters and the complete list is at most
  8,000 UTF-8 bytes. Recognizable raw/encoded bearer links are rejected. The
  response shows the exact selected manifest, account checks, next `attempt`,
  `retry_fingerprint`, current `results_revision`, expiry and an HMAC token.
  Preview writes no attempt and preserves the original delivery IDs, contact,
  subject, core text, suffix and sending boundary.
- `POST /retry-export` takes those returned review fields, the two history/run
  confirmations and `confirm: true`. The ten-minute token binds the actor,
  original context, exact selected payload, inspection notes and results
  revision. Rechecking and atomically inserting the retry header, selected
  deliveries, attribution, revision increment and audit either all succeed or
  all roll back. A concurrent result report or retry invalidates the preview.
  The new attempt becomes unknown only for the selected deliveries. No new
  discussion post, code, contact or batch is created.
- `POST /retry-recopy` takes the original identity plus `attempt`. It reconstructs
  only that selected subset from the still-eligible original encrypted payload
  and checks its stored fingerprint. Any later report or retry stops recopy,
  including a change racing the final transaction. Recopy does not add an
  attempt. Expiry, revocation, closure, profile/recipient/role changes or an
  unavailable payload require a newly prepared message review.

The prompt's manifest adds `attempt` for a retry. Each result row must copy that
number into its own `attempt` field. Original rows may omit it, meaning attempt
1; existing report fingerprints stay compatible. Mixed reports may cover an
unretried delivery's attempt 1 and another delivery's current retry. Older
attempt reports are rejected once that delivery has a newer attempt; inspect
external history and reconcile the current attempt rather than rewriting an
old attempt. Prior attributed reports remain visible. Retry numbers belong to
the batch, so an individual delivery can move from attempt 1 to attempt 3 when
attempt 2 selected different deliveries.

Migration `0008` adds `message_retries`, `message_retry_deliveries`, and an
`attempt` column defaulting to 1 on existing result rows. Compound foreign keys
bind each selected delivery and attempt to its batch/fling. The original export
is implicit attempt 1; retry headers retain the actor, time, payload fingerprint
and results revision. Inspection evidence is stored per selected delivery. The
application now has 26 tables and nine migrations. Retry history stores no
second encrypted/raw manifest. Existing expiry/revocation cleanup therefore
also removes the only reconstructible personal links for every attempt.

Both organizer history and privacy-filtered discussion counts use each
delivery's latest attempt. Original result evidence stays in the report history
when a retry starts. The results revision also advances on retry exports to
serialize reporting and retries; it is no longer a count of reports. A retry
without any report still has unknown outcomes, not a reported receipt.

The interface clears a retry review after edits and hides a displayed prompt
when the batch's results revision changes. It shows a separate exact review,
clipboard exposure, the sending deadline, and retained retry attribution. Full
batch recopy remains unavailable after any report or retry. A copied external
prompt cannot be recalled; these controls establish local review/concurrency,
not end-to-end duplicate-send prevention or independently verified account checks.

Run `npm test` and `node test/message-retries-browser.mjs` against `dev:local`.
The dated receipt records fictional local evidence; the later authorized pilot
still supplies real account, sender and recipient observations.
