# Hosted signed-out member browser acceptance — October 11, 2026 (UTC)

## Scope and method

Ten targeted T1/T2/T4 browser checks passed on the existing public
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), version 17.
Sites metadata confirmed that version and audience before testing. Repository
baseline: `b3e24d6fbe57ee07c249a5dcd8c73e8354e43b98`.

Used a new native Chrome Incognito window on macOS 26.6.2 (25G83), Chrome
154.0.8037.98. The browser showed its Incognito indicator throughout. Before
member entry, the organizer workspace required ChatGPT sign-in and a clean
member URL showed the generic unavailable-link page. No ChatGPT sign-in was
performed in that window. The owner stayed signed in separately in the in-app
browser, which was used only to prepare the fictional link and inspect history.

The existing gathering is `7149a04f-4100-4d26-8db4-de35042a7e85`.
The link was read from the visible unapproved review, kept in session memory,
and entered only on the same test Site. No raw capability, cookie, contact or
message payload is included in the [structured receipt](hosted-incognito-member-20261011.json).
Observations use native accessibility text and screenshots, not intercepted
network traffic or inferred application state.

## Completed checks

| Check | Observed result |
| --- | --- |
| Organizer before member entry | Sign-in required; no gathering list. |
| Clean member URL before exchange | Generic unavailable-link page; no member content. |
| Valid fictional member link | Member page opened without login; fragment removed. |
| Reload of the clean URL | Same accepted member and event remained visible. |
| Second Incognito tab, no fragment | Existing member session opened the same page. |
| Same-tab valid-link reentry | Settled on the same member with the fragment removed. |
| Invalid replacement link | Generic denial; previous member, activities and Save profile control absent; fragment removed. |
| Valid link after confirmed denial | Member content and Save profile control returned with a clean URL. |
| Organizer workspace after member exchange | Still required ChatGPT sign-in; no member privilege escalation. |
| Direct organizer gathering URL after exchange | Still required ChatGPT sign-in; no organizer controls. |

Every successful member observation retained “You’re going” and the repeated-hour
event's separate UTC−07:00 / UTC−08:00 offsets. This is display evidence; this
run did not inspect exact UTC values in a response or database. Native screenshots
are retained locally under `screenshots/flings-incognito-member-20261011.jpg`
and `screenshots/flings-incognito-organizer-denied-20261011.jpg`.

Four early snapshots were transitional and are excluded from the ten checks.
The first invalid-link attempt was navigated away from before a definitive
denial observation, so it is not counted. A separate repeat produced the
confirmed generic denial, followed by successful recovery. The earlier recovery
observation is retained as supplementary evidence only. No application failure
is inferred from the inconclusive snapshots.

## Fixture effects and cleanup

Preparing the link created one review titled “Fictional Incognito acceptance —
do not send — October 11”. After reload, history showed four reviews and this
new one remained **awaiting review**, with 0 reported sent/failed/suppressed and
1 unknown. No approval, prompt export for sending, discussion post or send was
performed. Those reported counters alone do not establish delivery absence.

Successful link entries can create sessions; invalid exchanges can update
rate-limit state. No session count or before/after database comparison was made.
No profile, invitation, event or coordination form was submitted. The test
audience, deployment and application source did not change. The temporary
Incognito window and owner/regular-browser tabs were closed, and the link was
cleared from the working variable. A local screenshot also records the final
unapproved history at `screenshots/flings-unapproved-review-20261011.jpg`.

## Remaining acceptance

This establishes signed-out Chrome member entry, session reuse across reload
and a second tab, corrected reentry and UI-level organizer isolation for this
fixture. It does not prove browser enforcement of HttpOnly/SameSite, fixed
expiry, revocation, two-fling or different-member isolation, successful
signed-out writes, history/cache behavior, mobile or other-browser acceptance.
Independent second-organizer access, concurrency/rollback, full accessibility,
managed-provider recovery and the authorized pilot remain open.

Phase 6 and `verify-hosted-test` stay actionable. This documentation-only
increment needs no application redeployment; repository build and scope checks
are recorded in the PR. Production remains unreleased.
