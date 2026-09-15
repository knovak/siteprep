# Native ChatGPT organizer identity

September 15, 2026. Implements the native sign-in selected in `decisions.md`.
The private test Site remains a fictional-data rehearsal. This adapter does not
complete Phase 6, grant Site sharing access, activate real sending or release
production.

## Runtime and identity boundary

Set `FLINGS_MODE=chatgpt`, the exact HTTPS `FLINGS_ORIGIN`, the existing
`FLINGS_SECRET`, and `FLINGS_ORGANIZERS` in Sites runtime settings. The latter is
a JSON array of `{ "email": "...", "name": "..." }` entries, populated from the
two approved accounts in `decisions.md`. Keep the list server-side. The example
configuration uses only fictional addresses. No schema migration is needed.

`lib/native-identity.ts` requires both dispatcher-provided
`oai-authenticated-user-id` and `oai-authenticated-user-email`. Trust them only
when the Worker is served through the Sites dispatcher at the configured HTTPS
origin. A caller controlling direct Worker ingress could forge HTTP headers;
never expose a direct Worker URL or a header-preserving public proxy.

The explicit **Open my organizer workspace** action requires a same-origin JSON
POST and custom header. It creates only the approved organizer's account. The
approved email is an enrollment allowlist, not a match against membership or
imported contacts. The first enrollment pins the Site-scoped platform subject
in `organizers.subject`. Unique account/subject constraints and insert-or-ignore
make concurrent enrollment idempotent. Another platform subject with the same
email cannot replace that binding, and one subject cannot become two accounts.
Email/account changes require a deliberate administrator-reviewed migration;
they are never auto-linked. After enrollment every request checks both the
current allowlist and the pinned subject. Removing an allowlist entry denies
that account's subsequent requests without erasing history.

Native accounts inherit no fictional organizer identity or gathering assignment.
Creating a gathering assigns its creator; existing gatherings use the existing
explicit co-organizer assignment flow. The fictional selector and fixture
issuance endpoints are disabled in native mode. `local` and `private-test`
retain their existing rehearsal behavior.

## Requests and browser context

`GET /api/flings/native/status` returns only the current viewer's email and
sign-in/rehearsal flags. `POST /api/flings/native/open` enrolls the current
approved viewer; body fields cannot choose an organizer. Native organizer
requests derive their actor from the dispatcher identity, never the old
fictional-organizer cookie. Expected-organizer headers reject stale tabs.
Mutations also require matching Origin and an HMAC anti-forgery value bound to
the platform subject and current allowlist. Assignment checks still run inside
each domain transaction.

Preview tickets bind to native mode, viewer, organizer, gathering and member.
Each use rechecks the native identity and current gathering assignment. Tickets
from the fictional rehearsal cannot become native previews. Member routes still
need the member capability/session and remain independent of organizer sign-in.
A private Site's outer access gate nevertheless requires ChatGPT sign-in for
all visitors; this does not establish outside-member login-free acceptance.
Responses are private/no-store and vary on identity and credentials.

The existing client page uses top-level ordinary links for the platform-owned
`/signin-with-chatgpt` and `/signout-with-chatgpt` routes. There is no app callback,
OAuth client, separate password, or sign-in fetch. Focus refreshes identity and
rejects a stale account context; account changes clear rendered gathering data.

## Verification

- `npm test`: the real Miniflare D1 suite includes six native tests covering
  enrollment races, malformed/missing configuration, origin and identity denial,
  pinned-subject replacement, allowlist removal, independent assignments,
  account-bound CSRF, previews, and member capability exchange.
- `node --experimental-strip-types test/native-identity-browser.mts`: six
  Chromium/Firefox/WebKit desktop/phone journeys use the real application UI,
  HTTP handler and local D1 with a fictional dispatcher simulation. They cover
  keyboard enrollment, creation, account switching, isolation, sign-out links
  and overflow. This harness does not prove a real hosted login.
- `node test/recovery-restore-browser.mjs`: existing full recovery regression.
- Actual hosted evidence and outstanding checks are recorded in
  `work/app/test/evidence/native-identity-20260915.md`.

Current platform guidance:
[OpenAI Sites sign-in and sharing](https://learn.chatgpt.com/docs/sites).
The installed Sites authentication reference further specifies that the user
ID is stable within one Site; account-user sharing IDs are not assumed to be
that Site-scoped identity.
