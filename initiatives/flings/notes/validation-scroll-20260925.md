# Native validation labels and focus — September 25, 2026 (UTC)

## Hosted finding

Checked the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site)
using the native owner's organizer session and the populated fictional recovery
gathering `a83949b1-befc-4581-bb95-1a5b0d125ad7`. The Sites API reported version
14 and existing public access-policy revision 2 before this change.

Seven blank-form cases at each of 1280 and 390 pixels focused their first
missing required field and supplied the native message, “Please fill out this
field.” Cases were organizer ID, member name, post text, poll question, payment
description, activity title and event title. All had no horizontal page overflow.
At phone width the payment-description and event-title controls were not fully
inside the viewport. Repeating the payment case measured its top at -0.1796875
pixels, bottom at 39.8203125, in a 390 × 844 viewport. Visual inspection showed
the label above the viewport and the focus outline clipped at the top.

This is a stricter label/whole-control check than an intersection-only focus
test. A field can intersect the viewport and still lose its visible label.
The organizer-index blank gathering-title case also focused its required input.
It is separate from the fourteen gathered cases above.

Browser-control timeouts and an organizer-name attempt interrupted by a focus
refresh are excluded. During that attempt the name returned to its saved value
and the form became disabled after Save was activated. No network trace was
captured, so this receipt cannot establish whether the existing organizer name
was resubmitted; it does not claim that every attempted action was read-only.
No valid gathering, member, coordination, restore or deletion submission was
made, and no message was approved or sent.

## Correction and local evidence

The organizer and member workspaces capture native invalid-field events with
`work/app/lib/validation-focus.ts`. Only the first invalid input, textarea or
select in its form schedules a scroll. On the next animation frame, if it is
still connected and focused, its field container is centered without animation.
This keeps its label and focus outline on screen while retaining native
validation focus/messages and server checks. Later invalid controls cannot
override the first field's scroll. A CSS scroll-margin attempt passed the event
case but failed the payment case and was removed.

The new reusable browser assertion submits a blank form using its actual Save
button and checks missing-value validity, native message, focus, label top,
control edges and eight pixels of vertical focus-outline clearance. It failed
before correction. After correction:

- Six authoring-focus journeys passed across Chromium, Firefox and WebKit at
  desktop/phone widths, including Event title validation.
- Six coordination journeys passed across the same engines and widths,
  including organizer Payment description and member Post text validation.
- All 176 application/domain/HTTP/local-D1 tests passed. TypeScript and lint of
  the helper, organizer component and changed browser tests passed.
- The member component retains two existing React ref-access lint diagnostics
  at its unchanged `credentials.current` rendering condition. The dependency
  install still reports six moderate and four high toolchain advisories.

Receipts: `work/app/test/evidence/validation-authoring-20260925.json` and
`work/app/test/evidence/validation-coordination-20260925.json`. These are local
fixtures and do not establish managed-provider behavior or independent account
acceptance.

## Test deployment and hosted recheck

Test version 15 succeeded at 2026-09-25T16:49:34.280162Z, preserving public
audience revision 2 and runtime revision 2. Production remains unreleased.
Siteprep source `b481f46e4b16e02b586fb642bc915c937ca1cb95` matched all 244
tracked app files in isolated Sites source
`0ec4afd4ab946aa28537cb9ff07d22d298746581`. The Sites build passed; its saved
archive contained 107 files / 2,867,200 bytes. Deployment:
`appgdep_6ab6a612a6e88191af9d1c90790dfa2b`.

Reloaded the existing owner session and submitted the same blank payment and
event forms. Each first invalid field retained native focus and its validation
message; its label and whole focus outline now fit. Every case was cancelled
after observation and returned focus to its opening action.

| Surface | Viewport | Label top | Input top | Input bottom |
|---|---|---:|---:|---:|
| Payment description | 390 × 844 | 391.3203125 | 412.3203125 | 452.3203125 |
| Event title | 390 × 844 | 391.3515625 | 412.3515625 | 452.3515625 |
| Payment description | 1280 × 844 | 391.65625 | 412.65625 | 452.65625 |
| Event title | 1280 × 844 | 391.671875 | 412.671875 | 452.671875 |

None had horizontal overflow. Two selector-scoped geometry probes timed out;
the completed readings use a read-only `document.activeElement` DOM probe and
its associated native label. The phone payment state was also inspected
visually. The browser viewport override was reset. Hosted member validation is
not claimed; the actual member regression above uses local fictional data.

## Remaining scope

This corrects validation scrolling, not all T12 accessibility. Actual
screen-reader use, zoom, the full hosted browser/authorization/concurrency
matrix, independent second-organizer access and managed-host backup/recovery
retention remain open. `verify-hosted-test` stays actionable; Phase 6 is not
complete and no production release is authorized by this receipt.
