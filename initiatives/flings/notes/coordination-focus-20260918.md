# Coordination keyboard focus — September 18, 2026 (UTC)

## Hosted finding

Used the actual native owner session in the Codex in-app browser and the existing
fictional populated recovery gathering on the Flings test Site, version 12.
Sequential Tab navigation from the landing page reached the organizer workspace
and the populated gathering. At 1280 by 844 pixels, forward Tab navigation
reached 50 enabled controls; each measured control stayed within the horizontal
viewport and was scrolled into vertical view. This is a bounded traversal of
the initial page, with history disclosures closed, not a full interaction audit.

After returning focus from browser chrome, organizer identity refreshed and
temporarily removed the gathering controls. The initial reverse traversal
therefore did not cover the full page; it is not counted as passing evidence.

Enter on Write a post removed its button and left focus on the page body. The
next Tab reached Discussion audience. Tab through the form and Enter on Cancel
again left focus on the body; another Tab recovered to Write a post. No post
or other business record was saved during this hosted reproduction.

## Correction and local verification

Coordination forms now focus their first enabled field when opened and return
focus to the opening action after Cancel or a completed save/refresh. Since the
buttons unmount while a form is open, the panel records a stable action key and
finds the replacement button. If the action disappears, as when hiding a post,
focus moves to the coordination heading. See `../COORDINATION_TECHDOC.md`.

The new first-field assertion failed against the original source, reproducing
the hosted defect. With the correction:

- All 176 application/domain/HTTP/local-D1 tests passed.
- TypeScript and lint on the changed component and test passed.
- Six expanded coordination journeys passed in Chromium 143.0.7499.4, Firefox
  144.0.2 and WebKit 26.0, at desktop (1280 by 900) and phone (390 by 844) sizes.
- Journeys cover post, poll, replacement-poll, payment and ledger entry; Cancel
  and save return; member post editing and payment reporting; and heading
  fallback after hiding a post. Existing privacy, attribution, preview,
  closure/reopening and history checks remain in the same journeys.

The keyboard helper waits until its trigger is enabled before pressing Enter,
so an in-flight previous write is not mistaken for an editor-opening failure.
The machine-readable receipt is
`../work/app/test/evidence/coordination-focus-20260918.json`.

Full application lint still reports the two pre-existing React compiler
ref-access diagnostics at `components/member-page.tsx:313`; that file is
unchanged from the baseline. Dependency installation still reports six moderate
and four high development-toolchain findings. Neither is presented as fixed.

## Deployment audience observation

The live Sites response reported version 12, public access and access-policy
revision 2 before this run deployed anything. The repository still recorded
private access. The refresh preserves the existing audience; no sharing or
access-control call is part of this change. This observation does not establish
who changed the audience or authorize real recipient data or sending.

## Acceptance limits

The local browser journeys use fictional identities and local D1. Hosted
verification is separately recorded below. Screen-reader use, the full hosted
browser and authorization matrix, independent organizer access, expiry/rollback,
managed-host recovery and provider backup/deletion evidence remain open.
`verify-hosted-test` stays actionable; no phase completion, pilot or production
release is claimed.
