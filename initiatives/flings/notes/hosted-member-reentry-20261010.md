# Hosted member-link reentry correction — October 10, 2026 (UTC)

## Problem and correction

On public Flings test version 16, adding a valid member-code fragment to the
same already open member URL left the code in the address bar. The page did
not exchange it again. A manual reload removed it and restored the member.
The local regression also demonstrated that opening a different member's link
in the same tab retained the previous profile instead of opening the new one.

`member-page.tsx` now reloads on a new code or preview fragment. It clears the
current profile/credentials before reloading; the existing entry effect removes
the fragment and performs the exchange or preview check. Reloading discards old
drafts, child-panel state and in-flight reads. Ordinary anchors are unchanged.
See `MEMBER_PROFILE_TECHDOC.md` for implementation and regression commands.

## Hosted observations

Baseline: `1430aa8de36cc46351c2764c7a00c0b19f2ca484`. Sites metadata confirmed
active public version 16 before the check. The existing fictional gathering is
`7149a04f-4100-4d26-8db4-de35042a7e85`. The
[structured receipt](hosted-member-reentry-20261010.json) omits codes and contacts.

Before the fix, initial entry, reload of the clean URL, a second tab without a
fragment, back navigation, and back-after-forward all displayed the accepted
member. Both event instants remained `2026-11-01T08:30:00.000Z` and
`2026-11-01T09:15:00.000Z`, with separate UTC−07:00 and UTC−08:00 offsets.
At a 1280-pixel viewport, document client/scroll widths were both 1265 pixels.
Reopening the code as a fragment-only navigation failed URL cleanup; another
manual reload recovered. That failed observation is preserved, with its code
redacted, rather than counted as a pass.

Test version 17 deployed successfully at `2026-10-10T10:24:17.026329Z`,
from Sites source `c3b6d65a990d686f844e4cc1728320e2bd1b134e`, preserving public
access. The 107-file archive was 2,867,200 bytes. After reloading the new build:

- Reopening the valid link in the same tab removed the fragment and displayed
  the accepted member and both exact event instants.
- Replacing it with an invalid code removed the fragment, displayed the generic
  unavailable-link error and removed the Save profile control.
- Opening the valid link from that denial recovered the same accepted member
  and exact event instants, again with a clean URL.

These are browser DOM/URL observations. They do not count newly created hosted
sessions or prove cookie attributes. A screenshot after the final repository
build is retained locally as `screenshots/flings-member-reentry-20261010.png`.

## Local regression and validation

The new test failed before the fix: it expected Robin Reed after a new link
but still saw Alex. With the fix, all six journeys passed at 1280×900 and
390×844 in Chromium 143.0.7499.4, Firefox 144.0.2 and WebKit 26.0. The dated
receipt is `work/app/test/evidence/member-link-reentry-20261010.json`.

The new assertions cover deliberate member switching in one tab, a distinct
session when reopening the same code, and clearing the old profile for an
invalid replacement. Existing history, stale-other-tab, two-fling, cookie,
profile, private-detail and request/console checks still pass. TypeScript and
all 177 application tests pass; the Sites application build passes. Repository
build and scope checks are recorded in the PR after the final documentation.

## Fixture effects and limits

Preparing the link added one fictional message review titled “Fictional
browser-entry rehearsal — do not send — October 10”. It remains awaiting review,
with no approval, prompt export, post or send. After reload the history contains
three reviews; the new one reports 0 sent/failed/suppressed and 1 unknown.
Those counters are not independent proof of delivery absence. The code stayed
in session memory; no capability was written to the repository.

Valid exchanges add sessions and the invalid exchange can change rate-limit
state. No hosted profile, invitation, event or access-setting form was submitted.
No hosted before/after database comparison was performed.

The native Mac was locked, so opening an isolated native browser failed. Hosted
checks therefore used the existing in-app browser with owner identity present;
this is not signed-out-browser acceptance. No sign-out or browser-setting change
was attempted. A transient organizer-open click raced automatic enrollment;
the already loaded organizer list was inspected before continuing. Full T1–T12,
independent organizers, signed-out browser coverage, expiry/revocation,
screen-reader/text-only zoom and managed-provider recovery remain open.
`verify-hosted-test` and Phase 6 remain actionable. Production is not released.
