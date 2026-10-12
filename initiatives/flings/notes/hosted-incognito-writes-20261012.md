# Hosted signed-out profile and invitation writes — October 12, 2026 (UTC)

## Scope and method

Ten targeted T1/T3/T4/T12 checks passed on the existing public
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), version 17.
Sites metadata confirmed the version and audience before testing. Repository
baseline: `6d883645e4abeb971ae5461d5d7f7f0ff759d7d6`.

Used a new native Chrome Incognito window on macOS 26.6.2 (25G83), Chrome
154.0.8037.98. The organizer route required ChatGPT sign-in before member entry;
no sign-in was performed in that window. A separate signed-in in-app browser
prepared one fictional member-link review and checked organizer visibility.
The raw link stayed in session memory and was entered only on the same test
Site. The [structured receipt](hosted-incognito-writes-20261012.json) contains
no capability, cookie, contact value or copied message payload.

The fixture gathering is `7149a04f-4100-4d26-8db4-de35042a7e85`, membership
`b9eaf437-9a6d-475b-b29e-9697012e5e72`, activity
`fc960301-73fb-4a20-9265-164a2430b97a`. Observations combine native accessibility
snapshots/screenshots with read-only Sites D1 table reads. Every compared table
page was complete: no truncation, omitted rows or next offset. Loading/saving
snapshots were excluded from passing observations.

## Completed checks

| Check | Observed result |
| --- | --- |
| Organizer before member entry | Required ChatGPT sign-in; no organizer workspace. |
| Fictional member link | Opened without login and removed the fragment. |
| Profile change | Saved “Fictional signed-out writer — Oct 12”; success notice, member reload, refreshed organizer view and D1 revision 1 agreed. |
| Invitation decline | Saved Declined; success notice, member reload, refreshed organizer view and D1 generation 2 agreed. |
| Invitation restoration | Saved the original accepted response; member reload, organizer view and D1 generation 3 agreed. |
| Profile restoration | Saved the original “Fictional DST Member — Oct 8”; member reload, organizer view and D1 revision 2 agreed. |
| Other member rows | All 11 non-target rows unchanged at the changed and restored snapshots. |
| Other invitation rows | All 15 non-target rows unchanged at the declined and restored snapshots. |
| Organizer after writes | Direct organizer gathering route still required ChatGPT sign-in. |
| Review history | Five reviews remained awaiting review; newest review showed 0 reported sent/failed/suppressed and 1 unknown. |

Complete table reads contained 12 members and 16 invitations. The target name
changed and returned to its original value; email, phone, preference, membership
state and access generation stayed unchanged. The target invitation went from
accepted to declined to accepted. Revisions remain advanced (profile 0→1→2,
invitation 1→2→3); restoring the visible values does not erase mutation history.
This supports preservation of the other rows in those two tables only.

Local screenshots under `screenshots/` record the changed profile/declined
invitation (`flings-incognito-write-20261012.png`), restored fixture
(`flings-incognito-restored-20261012.png`), and final organizer denial
(`flings-incognito-organizer-denied-20261012.png`).

## Fixture effects and cleanup

Four successful business writes were submitted by the signed-out member:
change name, decline invitation, accept invitation, restore name. The baseline
table reads occurred after preparing the link and before these four writes.
Preparing the link added one review titled “Fictional signed-out writes — do
not send — October 12”; history increased from four to five. After the writes,
all five remained awaiting review and history required a new review before
sending. No approval, sending handoff, discussion post, delivery report or
external send occurred. Reported outcome counters alone do not prove delivery
absence.

Session creation and audit effects were not counted. No all-table database
comparison was made. The temporary Incognito window and owner tab were closed;
the link variable was cleared. The original profile fields and invitation
response were restored, with their new revisions retained. Application source,
deployment and audience were unchanged.

## Remaining acceptance

This closes a focused signed-out profile/invitation-write gap for one desktop
Chrome member and gathering. It does not establish signed-out discussion, poll
or payment writes, multiple-membership session isolation, expiry/revocation,
concurrency, failed-write rollback, HTTP response details, exact UTC values or
browser cookie-attribute enforcement. Other browsers/mobile, independent
organizers, full accessibility, managed-host recovery and the authorized pilot
remain open.

Phase 6 and `verify-hosted-test` remain actionable. This documentation-only
increment needs no application redeployment. Production remains unreleased.
