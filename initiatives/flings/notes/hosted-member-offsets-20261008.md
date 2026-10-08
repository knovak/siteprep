# Hosted member event offsets — October 8, 2026 (UTC)

## Scope and environment

Continued T4/T12 acceptance on the existing
[Flings test Site](https://flings-test.ken-novak.chatgpt.site), from repository
baseline `6f30524308dd8a57b68c85c0c3d336ee917bc46b`. The recorded test deployment
is version 16; this run did not query deployment metadata or redeploy it.
Observations used the Codex in-app browser on macOS 26.6.2 (25G83), with the
existing native owner session and one fictional application member session.
The browser engine version was not exposed by the observation surface.

The October 7 receipt verified hosted organizer offsets but left member and
preview displays to local tests. This receipt adds hosted evidence for those
two views. It does not complete the parent `verify-hosted-test` item.

## Fixture changes

Used the existing October 6 gathering, “Hosted end-time round trip — fictional
— 2026-10-06” (`7149a04f-4100-4d26-8db4-de35042a7e85`). Published its existing
“Fictional repeated-hour rehearsal” activity, added “Fictional DST Member —
Oct 8” with an `example.invalid` email and no phone, and invited that member.
No event editor was opened or saved; the existing repeated-hour event remained
the subject of the check.

Prepared one unapproved message review to obtain this fictional member's link.
The subject and body explicitly identify the test and say not to send it.
No approval checkbox, approval action, prompt export or sending action was used;
no discussion post was selected. The member link was exchanged in a separate
tab and its fragment disappeared from the resulting URL. The code is excluded
from the committed receipt.

Accepted the invitation through the actual member page. A full reload retained
“You’re going”, and a fresh organizer preview showed the same accepted state.
The fixture remains published with one accepted fictional member and one
unapproved message review. No other gathering was opened or changed during
these checks. No audience, organizer assignment or production setting changed.

## Results

Every completed observation showed:

`Nov 1, 2026, 1:30 AM (UTC−07:00) – Nov 1, 2026, 1:15 AM (UTC−08:00) · America/Los_Angeles`

| View and state | Viewport | Document client / scroll width | Event container left / right | Result |
| --- | --- | --- | --- | --- |
| Invited preview | 1280 × 720 | 1265 / 1265 | 133.5 / 755.5 | Both offsets and zone present; profile controls disabled. |
| Invited preview | 390 × 844 | 375 / 375 | 45 / 330 | Same text; no horizontal document overflow. |
| Invited member | 1280 × 720 | 1265 / 1265 | 133.5 / 755.5 | Same text; Accept and Decline available. |
| Invited member | 390 × 844 | 375 / 375 | 45 / 330 | Same text; invitation controls available. |
| Accepted member | 390 × 844 | 375 / 375 | 45 / 330 | “You’re going”; Decline remains available. |
| Accepted member after reload | 1280 × 720 | 1265 / 1265 | 133.5 / 755.5 | Acceptance and both offsets survive reload. |
| Accepted preview | 1280 × 720 | 1265 / 1265 | 133.5 / 755.5 | Matches member state; profile controls disabled. |
| Accepted preview | 390 × 844 | 375 / 375 | 45 / 330 | Same text; no horizontal document overflow. |

The final accepted preview's two rendered `time` elements retained
`2026-11-01T08:30:00.000Z` and `2026-11-01T09:15:00.000Z`, a 45-minute interval.
This is DOM evidence, not a new database comparison. The existing October 6
receipt separately records the original persistence checks.

The [structured receipt](hosted-member-offsets-20261008.json) transcribes the
completed observations without contact values, member codes or message bodies.
The geometry check compares document widths and event-container edges; it does
not prove every rendered glyph or focus outline is visible.

## Excluded attempts and limits

Several requested resizes applied to another open tab: the inspected page
still reported `innerWidth: 1280` when 390 was requested. Those measurements
were excluded; the final accepted phone preview was measured with only one tab
open and an observed 390 × 844 viewport. One status-text locator did not match
the application's actual save notice; the subsequent page state confirmed the
single successful activity save, without resubmission.

Reloading the original preview requested a fresh preview from the organizer.
Reopening it through the organizer recovered the selected member view. This
receipt makes no claim that a preview ticket survives direct reload.

Full-page capture failed, and two viewport captures timed out, including after
requesting browser visibility. No screenshot was obtained. Results above are
DOM/accessibility observations and geometric measurements, not visual image
inspection. Temporary viewport overrides were reset and all test tabs closed.

No application source changed, so no new app test suite or deployment was
needed. Repository build and scope validation cover the documentation change.
Independent second-organizer access, a separate signed-out member browser,
other hosted engines, screen-reader/text-zoom coverage, the remaining hosted
T1–T12 matrix, managed recovery and provider backup retention/deletion remain
open. No real-recipient pilot, message sending or production release occurred.
