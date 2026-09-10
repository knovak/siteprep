# Flings access foundations

A local, fictional-data increment for Phase 1 of the Flings plan. Three
rehearsals open a member page, show invitation-dependent information and save a
profile independently for that fling. Event/invitation editing and the full
organizer interface are Phase 2. This folder is not a production deployment.

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
also present. The full organizer interface will supply the preview entry action
in Phase 2; this increment exercises it through the local organizer API.

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
