# Flings message review and export

The local application lives in `work/app/`. `lib/messages.ts` extends the
existing audience, coordination and access stores. This is the second Phase 4
increment; it implements exact review, approval and prompt export, with no
sending integration or delivery-result import.

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
  repeated exports preserve IDs and text. No outcome becomes sent.
- `GET` returns up to 50 recent redacted batch summaries. Old draft reviews
  must be prepared again after reload; approved batches offer recheck/recopy.
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
unchanged. There are now 21 tables.

A batch retains the canonical selection, a non-secret state snapshot, audience
hash, redacted manifest and SHA-256 fingerprint of the exact original JSON.
The raw JSON is separately AES-GCM encrypted with the existing runtime secret.
Redacted history contains no generated bearer link; it retains explicit link
placeholders. Approved content has no update endpoint. Approval/export times
are the only subsequent non-secret mutations in this increment.

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
recipient panel. It clears transient review/prompt state after edits and errors;
workspace context changes remount the panel. The parent retains the error when
an access/revision failure removes the old view. History remains available
without composing a new batch. No prompt or code goes into browser storage.

`test/messages.test.ts` exercises actual Miniflare/D1 transactions and injected
late changes. `test/messages-browser.mjs` covers three browser engines at two
sizes with a stubbed clipboard, exact text and links, confirmations, persisted
redacted history and rejected stale export. See the dated evidence receipt.

Optional same-fling discussion posting must be added to the approval transaction
before T9 can pass. Result validation/preview, attributed reporting and explicit
selected retries are also unimplemented. Their later schema/API must preserve
approved IDs/text and unknown outcomes; exported/copy status never proves receipt.
