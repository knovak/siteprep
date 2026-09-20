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

The complete rerun passed 18 journeys: three gatherings in Chromium
143.0.7499.4, Firefox 144.0.2 and WebKit 26.0 at widths 1280 and 390 (height
900). The per-engine receipts are `member-profile-focus-20260920-chromium.json`,
`member-profile-focus-20260920-firefox.json` and
`member-profile-focus-20260920-webkit.json` in this directory. All include
entry, cancellation and renamed-save return focus; earlier failed runs are
not included in those passing counts.

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

## Test deployment and hosted recheck

Test version 14 succeeded at 2026-09-20T03:08:13.209728Z on
https://flings-test.ken-novak.chatgpt.site. The existing public audience and
runtime revision 2 were preserved. Production remains unreleased.

Siteprep app source is `2edf9725dc2beb397da98866cb4e0fe48fca884d`. The isolated
Sites source is `f6d97328796cac1d449868e477ec6f2f1215df8e`; all 240 tracked app
files matched byte-for-byte. Its build passed. The saved archive has 107 files,
2,867,200 bytes and content hash
`sha256:7539ca07eb2c9e2385c96cfbad4f69d392218ce831d7af1e4410463f34b54c46`.

After reloading the actual native owner session, four hosted checks passed:
Alex Morgan and Robin Reed, each at 390 and 1280 pixels wide (height 844).
Enter on each Edit profile button focused Edit member name; Tab reached Edit
member email; Enter on Cancel profile edit returned focus to that same member's
edit button. Browser tooling focused the trigger before Enter, so this is
targeted form evidence, not complete sequential navigation of the page.
No hosted profile was saved, and no business records or sharing settings changed.
