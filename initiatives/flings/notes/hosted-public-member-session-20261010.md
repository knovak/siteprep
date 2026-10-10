# Hosted public member session — October 10, 2026 (UTC)

## Scope and method

Targeted T1/T2/T4 checks on the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), from baseline
`3d007afbd9029f9f84fffdc1d5630201d9c07356`. Sites metadata confirmed active,
public version 16. No source, deployment or audience setting changed.

The October 9 public-access receipt tested invalid credentials. This receipt
adds a **valid fictional member** using Python 3.9.6 standard-library HTTPS,
without ChatGPT identity, a gateway credential, a browser cookie jar or
automatic redirects. Only the explicitly selected Flings cookie was reused.
The host also returned `__cf_bm` cookies; these were not reused and are counted
separately from application cookies.

In the native owner browser, prepared one unapproved review for the existing
fictional DST member in gathering `7149a04f-4100-4d26-8db4-de35042a7e85`.
Its subject and body say not to send. The approval checkbox remained unchecked;
no prompt export, discussion post or sending action was used. The member URL
was read from the visible review and kept in a temporary local file with mode
0600, outside the repository. Credentials, CSRF values, contacts and message
bodies are omitted from the [structured receipt](hosted-public-member-session-20261010.json).

## Completed results

All 23 requests matched the expected status and, for denials, the entire
single-error JSON response. Ten succeeded and thirteen were denied. Every API
response retained `no-store, private`, `no-referrer` and `nosniff`; none redirected.

| Checks | Result |
| --- | --- |
| Native status before and after member entry; session before exchange | Both native-status reads reported signed out with no email; the initial session read was denied. |
| Two exchanges of the same valid link | Both returned the same member with distinct session cookies and CSRF values. Only these two requests issued application cookies in the completed run. |
| Cookie attributes | Fling-specific name, host-only, Path=/, HttpOnly, Secure, SameSite=Strict and Max-Age=3,024,000 seconds (35 days). |
| Session, accepted profile and coordination reads | Correct member/gathering, one accepted activity, one event and an ordinary member projection rather than preview. Both sessions remained usable after reopening the link. |
| Event instants | Preserved `2026-11-01T08:30:00.000Z` through `2026-11-01T09:15:00.000Z` in `America/Los_Angeles`. |
| Organizer workspace and gathering | Member cookie granted no native organizer identity; both requests returned 401. |
| Cross-scope attempts | Another member's projection, another gathering's session/projection, a cookie renamed for that gathering and a valid code exchanged against that gathering were all denied. |
| Five attempted profile writes | Missing or forged CSRF, missing or foreign Origin, and the second session's CSRF paired with the first session's cookie all returned 403. |
| Final projection | Exactly matched the initial profile, gathering, activities and events, including revision and accepted state. |

## Database and fixture effects

Read-only Sites D1 inspection covered every returned page of seven tables,
before and after the HTTP probes. Every page reported no omitted rows, columns
or truncated values, with no next page. Comparison was of complete row values,
not only counts.

| Table | Before / after | Result |
| --- | --- | --- |
| members | 12 / 12 | All rows unchanged. |
| events | 11 / 11 | All rows unchanged. |
| invitations | 16 / 16 | All rows unchanged. |
| flings | 12 / 12 | All rows unchanged. |
| assignments | 13 / 13 | All rows unchanged. |
| codes | 4 / 4 | All rows unchanged, including original first-use/expiry values. |
| sessions | 5 / 8 | Existing rows unchanged; three sessions added for the same fictional member/gathering. |

Each new database session has exactly 35 days between its creation and expiry.
Two belong to the completed run and one to the excluded preflight below. This
supports fixed lifetime for these observations; no clock boundary was advanced.
The initial database snapshot was **after** the unapproved review was prepared,
so it does not measure that preparation's changes. Message/audit tables and
rate-limit counters were not part of this comparison. Exchange attempts update
rate-limit state, and ordinary host logging can occur.

After reload, the browser showed two awaiting-review entries: the original
October 8 review and the new fictional rehearsal. The new entry showed zero
reported sent and one unknown, with personal links removed from history.
No send was attempted; those counters alone would not prove delivery absence.
A native screenshot records this final history at
`screenshots/flings-public-member-session-20261010.jpg` in the review worktree.

## Excluded attempt and remaining work

The first probe stopped after seven requests because its expected error text
said “the organizer workspace” where the application says “your organizer
workspace.” The status was correctly 401. Corrected that harness expectation
and distinguished host `__cf_bm` cookies from Flings cookies before rerunning
the complete sequence. That first attempt created one additional session; it
is included in the database count and is not concealed as an unchanged run.

This is public HTTP acceptance, not a signed-out browser walkthrough or proof
of browser enforcement of SameSite/HttpOnly. No successful profile write was
requested. Actual expiry boundaries, code revocation/removal, simultaneous
writes and rollback remain unverified on the host. The organizer UI currently
does not expose code-revocation controls; this run did not modify that UI or
attempt organizer API writes outside it. Independent second-organizer access,
the rest of T1–T12, screen-reader/text-only zoom, managed-provider recovery and
the authorized pilot remain open. Phase 6 and `verify-hosted-test` stay actionable.

Only documentation and sanitized evidence changed. Repository build and scope
checks cover this PR; application tests and redeployment are unnecessary for
these documentation changes.
