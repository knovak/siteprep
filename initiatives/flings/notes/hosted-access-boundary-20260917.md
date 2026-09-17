# Hosted access boundary — September 17, 2026

Target: the existing owner-private Flings test Site, version 12. This is a
bounded T1/T2/T12 negative-access check against the actual hosted Worker.
The Sites access response reported one allowed owner, no groups and no external
visitors. No access setting changed.

## Method

An HTTP client used the platform-provided private-Site gateway credential to
reach the Worker, without a browser cookie jar, member code, organizer session
or native identity headers. Each request was independent. The gateway credential
was held only for requests and is not included in this receipt. The known
fictional populated gathering was the target of gathering-specific reads.

## Results

| Request | Status | Observed result |
|---|---|---|
| GET native/status | 200 | native=true, rehearsal=false, signedIn=false, empty email |
| GET workspace/organizer | 401 | ChatGPT organizer sign-in required |
| GET fictional gathering/organizer | 401 | ChatGPT organizer sign-in required |
| GET fictional gathering/organizer/coordination | 401 | ChatGPT organizer sign-in required |
| GET fictional gathering/session | 401 | Member link unavailable; a recent organizer-issued link required |
| GET local/organizer | 403 | Local rehearsal unavailable |
| POST local/organizer, fictional organizer a | 403 | Local rehearsal unavailable |
| POST native/open, empty body | 401 | ChatGPT organizer sign-in required |

Both POST requests supplied the correct same-origin header, JSON content type
and route-specific marker, so these were not merely missing-form-header tests.
Neither issued an application session cookie. The transport did set platform
cookies; that is not evidence of a Flings session. No returned denial contained
business records. The GET requests took 512–734 ms individually in this run;
these samples are not capacity or performance acceptance.

## Limits and remaining work

These checks establish denial for missing application identity after passing
the platform gateway. They do not establish denial of a signed-in but
unassigned visitor, independent access for the second organizer, untrusted
identity-header handling, missing runtime configuration, expiry/revocation,
concurrent writes or managed-provider recovery. Prior local tests remain
separate evidence for those cases. No data, messages, site audience or deployment
was changed. Full Phase 6 and `verify-hosted-test` remain open.
