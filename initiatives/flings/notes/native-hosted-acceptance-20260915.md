# Native organizer hosted acceptance — September 15, 2026

## Candidate and local checks

The native adapter is committed in repository source `03ea082c3`. The Sites
source snapshot is `77f403095034dc1c245b6cfaf4f13155a4b2b7bc`, copied byte-for-byte
from all 233 committed app files, with the successful app build. Saved test
version 9 contains 107 packaged files and 2,856,960 bytes.

Local validation: 176 app tests, six native-identity browser journeys and six
complete recovery regressions passed, plus TypeScript, lint and the app build.
Native browser tests simulate dispatcher identities; the actual owner session
is checked separately below. Detailed receipts live under `work/app/test/evidence/`.

## Runtime and audience

The runtime uses native ChatGPT mode, the existing secret and exact test origin,
and a secret server-side enrollment list containing the two accounts recorded in
`decisions.md`. Site access remains the existing owner-only custom policy, with
one allowed viewer and no external visitors. No public exposure or invitation
was added. Native enrollment grants no pre-existing gathering assignment.

## Outstanding acceptance

Lucas's actual independent sign-in remains pending; his app enrollment entry
does not grant access through the Site's outer sharing gate. The full hosted
T1-T12 matrix, accessibility/screen-reader checks and interruption/restart
rehearsals remain open. The actual managed backup retention and database restore
procedure are not exposed by the available tools or established by the official
Sites documentation; see `host-backup-review-20260915.md`.

No real recipient message, member personal data, pilot, source merge or
production release is part of this run. `verify-hosted-test` remains actionable.

## Actual private test result

Test version 9 succeeded at **2026-09-15T10:30:26.854735Z**, deployment
`appgdep_6aa91e28161c81919f3e5a276ab0b293`, runtime revision 2, at
<https://flings-test.ken-novak.chatgpt.site>. Production remains unreleased.

The existing signed-in browser's actual Ken account was identified by the
Sites dispatcher. Explicit enrollment opened the workspace as Ken Novak with
no assigned gatherings and no fictional organizer selector. Creation of
**Native sign-in acceptance — 2026-09-15** succeeded, with Ken as its sole
organizer. Preparing a JSON export returned four records and a 2,199-byte file,
with a Save JSON file link. No message or member link was generated.

Direct navigation to the existing unassigned `outing` gathering was rejected.
Returning to the organizer workspace reloaded the native account. The newly
created empty acceptance gathering is retained as fictional test evidence;
existing gatherings and their assignments were not modified. This proves one
real owner session, creation, assignment isolation and export preparation. It
does not prove Lucas's login, a signed-out sign-in round trip, provider backup
restore, or the rest of the hosted acceptance matrix.

## Follow-through recorded after PR #535 merged

The preceding source receipt predates the final owner sign-out/sign-in check.
Before #535 closed, the actual owner followed the Site's sign-out link, reached
its private sign-in gate, selected the existing Ken account and returned to the
same assigned gathering. That owner round trip passed; Lucas's independent
login remains pending. The later [hosted workflow receipt](hosted-workflow-acceptance-20260915.md)
adds actual event, preview, stale-closure and edited-backup observations without
claiming the full acceptance matrix passed.
