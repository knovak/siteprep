# Organizer member-profile focus — September 20, 2026 (UTC)

## Hosted finding

On the existing Flings test Site, version 13, the actual native owner session
opened the populated fictional recovery gathering. Enter on Edit profile for
Alex Morgan left focus on the edit button; Tab then reached the name field.
Enter on Cancel profile edit removed the form and left `document.activeElement`
on the page body at both 1280 and 390 pixels wide, with height 844. No profile
or other business record was saved.

A browser magnification shortcut did not change the observed viewport, device
pixel ratio or visual-viewport scale. This is not text-zoom acceptance evidence.

## Correction

The profile editor now focuses its name field on entry and returns focus to
the same membership's edit button after cancellation or successful save and
refresh, including a renamed profile. Typing does not rerun the entry effect.
The existing revision and authorization checks are unchanged. See
`../MEMBER_PROFILE_TECHDOC.md` for the fallback behavior and test command.

## Local validation

The first-field focus assertion failed against the original component in the
Chromium desktop journey. With the correction, all 176 application tests,
TypeScript and lint for the two changed executable files passed.

The first full browser run reached the final WebKit phone fixture, then timed
out while opening an existing preview. The server log showed no preview POST
for that activation. The preview helper now brings the page forward, waits for
the button to be enabled, and presses Enter after the focus refresh. This
changes test synchronization, not application preview behavior.

Full application lint still reports the two existing React compiler ref-access
diagnostics in `components/member-page.tsx:313`, unchanged from the base.
The pinned dependency installation reports six moderate and four high
development-toolchain advisories; this change does not remediate them.

## Acceptance limits

The hosted reproduction uses one owner and fictional records. Local saves use
the local fictional database. Independent organizer access, the full hosted
browser and authorization matrix, text zoom, axe and screen-reader acceptance,
simultaneous writes, expiry/rollback, managed-host recovery and provider backup
retention/deletion remain open. `verify-hosted-test` stays actionable; no pilot
or production release is claimed.
