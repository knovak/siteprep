# Hosted public access boundary — October 9, 2026 (UTC)

## Scope and environment

Targeted T1/T2/T12 checks against the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), from repository
baseline `dcc48f9e8a9619f344427a485dd31e9549a85a86`. The Sites metadata query
confirmed an active Site with public access and latest version 16. No
publication or access setting changed.

The September 17 access receipt passed the private-Site gateway using its
credential. This run used ordinary public HTTPS with no gateway credential,
ChatGPT account session, valid member code or organizer identity. It adds
public-edge evidence for missing identity and client-supplied identity headers.
It does not complete `verify-hosted-test` or Phase 6.

## Method

A Python standard-library `urllib.request` client made 26 sequential requests.
Its opener had no cookie processor and refused redirects; response cookies
were never reused. Requests supplied no credentials except the explicitly
fabricated member cookie and preview ticket in the last two denial cases.
The client versions and exact route/status/response observations are in the
[structured receipt](hosted-public-access-20261009.json).

The known fictional gathering was
`7149a04f-4100-4d26-8db4-de35042a7e85`, the existing end-time rehearsal. The
unknown-gathering probe used `00000000-0000-4000-8000-000000000000`.
POST bodies were JSON with `Content-Type: application/json`; valid-origin
cases used the Site origin. Native, local and exchange route markers were
respectively `x-flings-native: 1`, `x-flings-local: 1`, and
`x-flings-exchange: 1`, except the explicit missing-marker cases.

## Results

All 26 requests matched their expected status and response. None redirected
or issued a `flings_*` application cookie. All 23 API responses had
`Cache-Control: no-store, private`, `Referrer-Policy: no-referrer` and
`X-Content-Type-Options: nosniff`.

| Cases | Count | Status and observation |
| --- | ---: | --- |
| Landing, organizer and known-member HTML documents | 3 | 200; Flings documents loaded without a platform login redirect. The known fixture title was absent from each response body. This is document retrieval, not rendered browser acceptance. |
| Native status without identity | 1 | 200; `native=true`, `rehearsal=false`, `signedIn=false`, empty email. |
| Organizer index, gathering and coordination reads | 3 | 401; each returned only the sign-in-required error. |
| Known and unknown gathering member-session reads | 2 | 401; identical generic member-link errors. |
| Local organizer GET and correctly formed POST | 2 | 403; local rehearsal unavailable. |
| Correctly formed native open without identity | 1 | 401; sign-in required. |
| Native open with missing/foreign origin or missing marker | 3 | 403; origin or route-marker denial. |
| Member exchange with missing/foreign origin or missing marker | 3 | 403; origin or route-marker denial. |
| Malformed code, well-formed unknown code, and unknown gathering/code | 3 | 401; identical generic member-link errors. |
| Client-supplied native identity on status, organizer index and native open | 3 | Status remained signed out with empty email; both organizer requests returned 401. |
| Fabricated member-session cookie and preview ticket | 2 | 401; generic member-link or organizer-access error. |

The client-supplied header pair was
`oai-authenticated-user-id: fictional-client-supplied-subject` and
`oai-authenticated-user-email: fictional-header@example.invalid`.
It did not appear as native identity at the application. This verifies this
header pair at the current public entry point; it does not establish the
internal dispatcher mechanism or cover every possible header encoding.

The foreign origin was `https://foreign.example.invalid`. Invalid-code cases
used `bad` and 43 ASCII `A` characters, never a real member credential. The
forged cookie value was `fictional-invalid-session`; the preview value was
`Bearer fictional.invalid`. Successful error-body comparisons required the
entire JSON object to match the expected single `error` field.

## State changes and limits

Three correctly formed exchange attempts can update the Worker's rate-limit
counters, and requests can produce ordinary host logs. No application session
was issued. No message, organizer assignment, membership, invitation or event
mutation was requested. There was no database before/after comparison, so the
receipt does not claim a complete proof of unchanged database contents.

The owner browser was opened only to inspect the existing organizer index,
then closed before these HTTP probes. That browser carried native identity;
it is not the anonymous client used for this receipt.

These results do not establish a valid member's signed-out browser journey,
independent second-organizer access, signed-in but unassigned-account denial,
missing runtime configuration, cookie attributes after a successful exchange,
expiry/revocation, rate-limit thresholds, concurrent writes or rollback. Browser
keyboard/zoom/screen-reader acceptance and managed-provider recovery/retention
also remain open. No screenshot is claimed for these HTTP observations.

Only documentation and this sanitized receipt changed. Repository build and
initiative scope checks validate the PR; the application source is unchanged,
so no application test suite or test redeployment is needed. Full Phase 6,
the authorized pilot and production release remain separate work.
