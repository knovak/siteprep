# Flings local gathering journeys

A local, fictional-data application with the Phase 1 access foundation and the
first Phase 2 organizer/member journeys. Organizers can list assigned gatherings,
add member profiles, invite or withdraw members from existing activities, open
read-only previews, and close or reopen a gathering. Members accept or decline
invitations, see permitted details and correct their own profiles. Event
creation/editing and the remaining Phase 2 checks are still pending.

## Run locally

Use Node 22.13 or later. From this directory:

```sh
npm ci
npm run dev:local
```

Open `http://localhost:5187/`. The launcher creates an owner-only, ignored
`.dev.vars` with a fresh random secret, applies the committed migrations to a
local D1 database, then starts the server. It does not create a cloud database or
Site. Keep the exact origin: the fictional organizer endpoints require explicit
local mode, a loopback hostname and the configured origin. `.env.example` lists
the environment keys without a usable secret. Existing local fixtures are never
reset when a rehearsal opens again.

The installed `@openai/create-sites` 0.3.0 scaffold supplies Vinext, React, D1 and
shadcn. `package-lock.json` pins the installation. `.openai/hosting.json` declares
only the logical `DB` binding; it has no deployed project ID. The placeholder
UUID in the local configuration selects local storage only. Runtime state,
secrets and generated builds are ignored. Hosted organizer sign-in deliberately
returns unavailable until the managed identity adapter in Phase 6 exists.

## Database and permission model

`db/schema.ts` and `drizzle/` define twelve tables. Compound foreign keys prevent
cross-fling member/code/session and activity/event/invitation relationships.
Assignments and invitations have unique composite keys. Profiles use revisions;
organizer assignments never arise from matching email addresses or membership.
Audit events contain actor, object, action, time and the affected profile
revision where applicable, without contact copies, code values or credentials.

`lib/access.ts` owns domain rules. Every protected batch checks current
assignment or session/member/code authority in the same D1 transaction as its
writes. A temporary row in `guards` has `CHECK(ok=1)`; a false precondition
attempts to insert zero, fails that constraint and rolls back the whole batch.
This also handles an ordinary rejected revision after an earlier write. Do not
replace this with a conditional update whose zero affected rows are ignored.
Successful batches remove their guard rows. Last-organizer removal counts and
deletes within that same batch.

D1 documents transactional rollback for failed statements in
[`batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
Tests run the actual [Miniflare D1 implementation](https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/),
apply both migrations and compare persisted records after failures and races.
No database mock establishes this proof. An operation committed before removal
can remain in history; removal prevents later authorized writes and does not
recall completed work.

## Member links and sessions

Codes contain 256 random bits. Store a SHA-256 digest and an AES-GCM sending
copy, protected by a runtime key outside the database. Reuse the newest eligible
code for 14 elapsed UTC days; concurrent renewal produces one current code.
Older unrevoked codes still exchange until their own 35-day boundary. Authorized
reads and issuance purge sending copies at the 14-day boundary; revocation
purges immediately. Only issuance can decrypt an eligible copy. Keep the digest
and revocation metadata for originating sessions.

Exchange starts a separate fixed 35-day session. A day-34 exchange can therefore
remain usable to day 69 even though its originating code stops exchanging on
day 35. Single-code revocation invalidates that code's sessions; emergency
replacement/removal changes the membership generation and invalidates every old
code/session. Emergency replacement and removals require explicit confirmation
in the organizer API.

The page removes the fragment with `history.replaceState` before its first
request. The API uses per-fling HttpOnly, SameSite=Strict cookies, adding Secure
over HTTPS. Plain HTTP works only at the explicitly configured local origin.
All mutation requests need a matching Origin; authenticated writes also need a
session-bound HMAC anti-forgery value. Exchange requires a custom header and is
limited to 20 attempts per client/fling/minute. Hosted exchange requires the
Worker-provided client address. Do not expose this behind an untrusted proxy
that accepts caller-supplied `cf-connecting-ip`.

Every page retains its expected member and passes it in API paths. Opening a
different member in the same fling cannot change a stale page's actor. Focus and
back/forward restoration clear the rendered profile before rechecking. Private
API responses use `Cache-Control: no-store, private` and vary on credentials;
the document uses a no-referrer policy. There are no third-party member-page
assets. Never log request bodies, cookies, fragments or returned issuance codes.

## Profiles, projection and preview

Profiles accept email, text or both, with optional missing delivery details
visibly marked incomplete. A closed fling still permits profile corrections.
The same contact in another fling remains independent. Stale revisions fail
instead of overwriting another save.

`projection()` is shared by actual member and organizer preview contexts.
Uninvited/withdrawn and draft activities are absent; invited/declined members
receive summaries; accepted members receive participant detail; cancelled
activities retain a cancellation notice. Other members' contacts and code
records are absent. Preview uses a separate short-lived, read-only ticket and
cannot acquire member credentials or mutate even if an organizer cookie is
also present. The organizer interface now supplies the preview entry action. Preview
navigation acquires a separate ticket and never exchanges it for a member
session.

The member page registers the optional `update_member_profile` WebMCP tool. It
validates the four form fields, uses the same save function and revision checks,
and updates visible state before returning. It cannot change the member or
fling. Unsupported browsers keep the form; registration grants no authority.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
# with dev:local running and the pinned Playwright browsers installed:
npm run test:browser
```

The evidence record is `test/evidence/phase-1.md`. Browser receipts contain no
links, cookies or profile contacts. Lint covers the authored application, domain,
HTTP, scripts and tests. The stock shadcn component catalog and its stock mobile
hook are excluded from lint: the pinned scaffold reports existing component
accessibility/compiler-rule diagnostics there. They remain in TypeScript and
application-build checks; the actual form's labels, keyboard operation and
read-only preview are exercised in the browser.

The scaffold's dependency audit has unresolved advisories, including high
severity findings (`test/evidence/dependency-audit.json`). This is a local
fictional rehearsal, not a clean production-security attestation. Before Phase
6 hosting, refresh the framework/toolchain pins, reassess reachability and repeat
all checks. Do not use force-fix suggestions that downgrade Drizzle or switch
Miniflare to an alpha without verifying compatibility. Provider identity,
backups/retention, recovery, outside-member access and real recipients remain
the plan's later prerequisites.

## First Phase 2 increment

Open `/organizer` and select fictional Casey, Rowan or Sam. The server returns
only assigned flings; ordinary membership does not confer organizer access.
Every organizer page keeps its expected organizer identity in memory and sends
it with requests. A changed organizer cookie is rejected instead of silently
changing the actor of a stale page. Initial actions wait until hydration and
the first workspace check finish. No hosted identity has been enabled.

`lib/journeys.ts` extends the existing authorization batches. Invitations,
member responses and closure/reopening check the fling's current revision in
the same transaction as their writes, then increment it. This deliberately
serializes coordination across a fling: an intervening change requires reload,
even on another activity. Profile corrections retain their own independent
member revision. Child/fling relationships, current member activity and
published activity state are checked inside the invitation transaction.

Reinviting an accepted/declined member preserves their answer. Withdrawal
removes the activity from actual member responses immediately; reinviting a
withdrawn member returns to invited without revealing participant details.
Accept, decline and reaccept use the same protected projection as preview.
Closed flings reject invitation/response writes even from stale tabs; permitted
history and profile correction remain usable. Reopening preserves responses.
No coordination operation issues a member code, sends a message or changes a
payment. Events display the stored instant in the event's IANA zone even when
the browser is in another zone; authoring ambiguous local times is not yet built.

Run `node test/journeys-browser.mjs` against the local server in addition to
`npm run test:browser`. It records 18 organizer/member journeys across the
three fixtures, three browser engines and desktop/phone sizes. Its profiles use
fictional contacts only. Tests for polls, messages and payments on closure
remain with those later implementations; this increment does not claim full
T4/T5 or Phase 2 acceptance. See `test/evidence/phase-2.md`.
